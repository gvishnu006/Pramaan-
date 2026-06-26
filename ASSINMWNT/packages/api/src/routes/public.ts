import { FastifyInstance } from 'fastify';
import { getPublicKey } from '../services/signing';

export async function publicRoutes(app: FastifyInstance) {
  /**
   * GET /public-key — RSA public key for verifiers
   */
  app.get('/public-key', async (_request, reply) => {
    return reply
      .header('Content-Type', 'application/x-pem-file')
      .send(getPublicKey());
  });
}
