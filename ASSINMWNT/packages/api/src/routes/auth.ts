import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@omnimise/db';
import {
  generateSecureToken,
  addDays,
  toTTLSeconds,
} from '@omnimise/shared';
import {
  RefreshTokenSchema,
} from '@omnimise/shared';
import { env } from '../config/env';
import {
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  incrementLoginAttempts,
  getLoginAttempts,
  resetLoginAttempts,
} from '../config/redis';
import { writeAuditLog } from '../services/audit';

interface GoogleUser {
  id: string;
  email: string;
  displayName: string;
  photos?: Array<{ value: string }>;
}

export async function authRoutes(app: FastifyInstance) {
  // ─── Rate limit auth routes (5 req / 10 min) ─────────────────────────────
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const attempts = await getLoginAttempts(request.ip);
    if (attempts >= 20) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many auth attempts. Try again in 10 minutes.' },
      });
    }
  });

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  /**
   * GET /auth/google — redirect to Google OAuth
   */
  app.get('/google', async (_request, reply) => {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  /**
   * GET /auth/google/callback — handle Google OAuth callback
   */
  app.get('/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.query as { code?: string };

    if (!code) {
      return reply.status(400).send({
        error: { code: 'INVALID_CODE', message: 'Authorization code missing' },
      });
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json() as {
        access_token?: string;
        error?: string;
      };

      if (!tokenData.access_token) {
        await incrementLoginAttempts(request.ip);
        return reply.status(401).send({
          error: { code: 'OAUTH_FAILED', message: 'Google OAuth failed' },
        });
      }

      // Fetch user info from Google
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUser = await userRes.json() as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      // Upsert user in DB
      const user = await prisma.user.upsert({
        where: { googleId: googleUser.id },
        update: {
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          email: googleUser.email,
        },
        create: {
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          googleId: googleUser.id,
        },
      });

      await resetLoginAttempts(request.ip);

      // Issue tokens
      const deviceId = generateSecureToken(16);
      const { accessToken, refreshToken } = await issueTokenPair(app, user, deviceId);

      await writeAuditLog({
        userId: user.id,
        action: 'auth.login',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      // Redirect to frontend with tokens
      const redirectUrl = new URL('/auth/callback', env.APP_URL);
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      redirectUrl.searchParams.set('deviceId', deviceId);

      return reply.redirect(redirectUrl.toString());
    } catch (err) {
      request.log.error(err, 'Google OAuth callback error');
      return reply.status(500).send({
        error: { code: 'OAUTH_ERROR', message: 'Authentication failed' },
      });
    }
  });

  // ─── Refresh Token ────────────────────────────────────────────────────────

  /**
   * POST /auth/refresh
   */
  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = RefreshTokenSchema.parse(request.body);

    // Decode the refresh token to get userId
    let payload: { sub: string; deviceId: string };
    try {
      payload = app.jwt.decode(input.refreshToken) as { sub: string; deviceId: string };
      if (!payload?.sub) throw new Error('Invalid token');
    } catch {
      return reply.status(401).send({
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
      });
    }

    // Validate against Redis
    const stored = await getRefreshToken(payload.sub, input.deviceId);
    if (!stored || stored !== input.refreshToken) {
      return reply.status(401).send({
        error: { code: 'TOKEN_REVOKED', message: 'Refresh token has been revoked' },
      });
    }

    // Load user
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return reply.status(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    // Delete old token (rotation)
    await deleteRefreshToken(payload.sub, input.deviceId);

    // Issue new pair
    const newDeviceId = input.deviceId;
    const { accessToken, refreshToken } = await issueTokenPair(app, user, newDeviceId);

    return reply.send({ accessToken, refreshToken, deviceId: newDeviceId, expiresIn: 900 });
  });

  // ─── Logout ───────────────────────────────────────────────────────────────

  /**
   * POST /auth/logout
   */
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    await request.jwtVerify();
    const payload = request.user as { sub: string; deviceId: string };

    const { deviceId } = (request.body ?? {}) as { deviceId?: string };
    const did = deviceId ?? payload.deviceId;

    await deleteRefreshToken(payload.sub, did);

    await writeAuditLog({
      userId: payload.sub,
      action: 'auth.logout',
      ipAddress: request.ip,
    });

    return reply.send({ success: true });
  });

  // ─── Me ───────────────────────────────────────────────────────────────────

  /**
   * GET /auth/me
   */
  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    await request.jwtVerify();
    const payload = request.user as { sub: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true },
    });

    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.send({ user });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function issueTokenPair(
  app: FastifyInstance,
  user: { id: string; email: string; role: string },
  deviceId: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = app.jwt.sign({
    sub: user.id,
    email: user.email,
    role: user.role,
    deviceId,
  });

  const refreshToken = app.jwt.sign(
    { sub: user.id, deviceId, type: 'refresh' },
    { expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d` }
  );

  const ttlSeconds = toTTLSeconds(env.JWT_REFRESH_TTL_DAYS * 24);
  await storeRefreshToken(user.id, deviceId, refreshToken, ttlSeconds);

  return { accessToken, refreshToken };
}
