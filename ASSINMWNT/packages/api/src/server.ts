import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { env } from './config/env';
import { redis } from './config/redis';
import { registerJwt } from './config/jwt';
import { authRoutes } from './routes/auth';
import { credentialRoutes } from './routes/credentials';
import { shareRoutes } from './routes/share';
import { employerRoutes } from './routes/employer';
import { publicRoutes } from './routes/public';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // ─── Security ─────────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // Managed by Next.js for web
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' }
    }),
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  // ─── JWT ──────────────────────────────────────────────────────────────────
  await registerJwt(app);

  // ─── Global Auth Middleware ───────────────────────────────────────────────
  app.addHook('onRequest', authMiddleware);

  // ─── Routes ───────────────────────────────────────────────────────────────
  await app.register(publicRoutes, { prefix: '' });
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(credentialRoutes, { prefix: '/credentials' });
  await app.register(shareRoutes, { prefix: '/share' });
  await app.register(employerRoutes, { prefix: '/employer' });

  // ─── Error Handler ────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ─── Health Check ─────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Omnimise API running on port ${env.PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
