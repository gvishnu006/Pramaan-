import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@omnimise/db';
import { generateSecureToken, addHours, toTTLSeconds } from '@omnimise/shared';
import { CreateShareSchema } from '@omnimise/shared';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { env } from '../config/env';
import {
  storeShareToken,
  getShareToken,
  deleteShareToken,
  incrementShareTokenUseCount,
} from '../config/redis';
import { writeAuditLog } from '../services/audit';
import { signBundle } from '../services/signing';

export async function shareRoutes(app: FastifyInstance) {
  // ─── POST /share ──────────────────────────────────────────────────────────
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const input = CreateShareSchema.parse(request.body);

    // Verify all credentials belong to user
    const credentials = await prisma.credential.findMany({
      where: {
        id: { in: input.credentialIds },
        userId: payload.sub,
        deletedAt: null,
      },
    });

    if (credentials.length !== input.credentialIds.length) {
      return reply.status(400).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'One or more credentials not found or not accessible' },
      });
    }

    const token = generateSecureToken(32);
    const expiresAt = addHours(new Date(), input.ttlHours);
    const ttlSeconds = toTTLSeconds(input.ttlHours);

    const redisData = {
      userId: payload.sub,
      credentialIds: input.credentialIds,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxUses: input.maxUses,
      useCount: 0,
    };

    // Store in Redis
    await storeShareToken(token, redisData, ttlSeconds);

    // Persist to DB
    const shareToken = await prisma.shareToken.create({
      data: {
        userId: payload.sub,
        credentialIds: input.credentialIds,
        token,
        expiresAt,
        maxUses: input.maxUses,
        useCount: 0,
      },
    });

    const shareUrl = `${env.APP_URL}/verify/${token}`;

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    });

    await writeAuditLog({
      userId: payload.sub,
      action: 'share.create',
      targetId: shareToken.id,
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      token,
      shareUrl,
      qrDataUrl,
      expiresAt: expiresAt.toISOString(),
    });
  });

  // ─── GET /share/:token/verify (PUBLIC) ────────────────────────────────────
  app.get('/:token/verify', {
    config: { skipAuth: true },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as { token: string };

    // Try Redis first (fast path)
    const raw = await getShareToken(token);

    if (!raw) {
      // Check DB for expired record
      const dbToken = await prisma.shareToken.findUnique({ where: { token } });
      if (!dbToken) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Share link not found' },
        });
      }
      return reply.status(410).send({
        error: { code: 'EXPIRED', message: 'This share link has expired' },
      });
    }

    const tokenData = JSON.parse(raw) as {
      userId: string;
      credentialIds: string[];
      expiresAt: string;
      maxUses: number;
      useCount: number;
    };

    // Check use count
    if (tokenData.useCount >= tokenData.maxUses) {
      return reply.status(403).send({
        error: { code: 'MAX_USES_REACHED', message: 'This link has reached its maximum number of uses' },
      });
    }

    // Check if revoked in DB
    const dbToken = await prisma.shareToken.findUnique({ where: { token } });
    if (dbToken?.revokedAt) {
      return reply.status(410).send({
        error: { code: 'REVOKED', message: 'This share link has been revoked' },
      });
    }

    // Increment use count atomically
    await incrementShareTokenUseCount(token);
    await prisma.shareToken.update({
      where: { token },
      data: { useCount: { increment: 1 } },
    });

    // Fetch credentials
    const credentials = await prisma.credential.findMany({
      where: {
        id: { in: tokenData.credentialIds },
        deletedAt: null,
      },
    });

    const verifiedAt = new Date().toISOString();
    const bundle = { credentials, verifiedAt, token };

    // Sign with RSA private key
    const signature = signBundle(bundle);

    await writeAuditLog({
      userId: null,
      action: 'share.verify',
      targetId: token,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { credentialCount: credentials.length },
    });

    return reply.send({
      credentials,
      verifiedAt,
      signature,
      publicKeyUrl: `${env.API_URL}/public-key`,
    });
  });

  // ─── DELETE /share/:token ─────────────────────────────────────────────────
  app.delete('/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const { token } = request.params as { token: string };

    const shareToken = await prisma.shareToken.findUnique({ where: { token } });

    if (!shareToken || shareToken.userId !== payload.sub) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Share token not found' },
      });
    }

    await deleteShareToken(token);
    await prisma.shareToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });

    await writeAuditLog({
      userId: payload.sub,
      action: 'share.revoke',
      targetId: shareToken.id,
      ipAddress: request.ip,
    });

    return reply.status(204).send();
  });

  // ─── GET /share/history ───────────────────────────────────────────────────
  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };

    const tokens = await prisma.shareToken.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const now = new Date();
    const enriched = tokens.map((t) => ({
      ...t,
      status: t.revokedAt
        ? 'revoked'
        : t.expiresAt < now
        ? 'expired'
        : t.useCount >= t.maxUses
        ? 'exhausted'
        : 'active',
    }));

    return reply.send({ tokens: enriched });
  });
}
