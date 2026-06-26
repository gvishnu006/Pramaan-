import { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { env } from './env';

export async function registerJwt(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_ACCESS_TTL,
    },
    decode: { complete: true },
  });
}
