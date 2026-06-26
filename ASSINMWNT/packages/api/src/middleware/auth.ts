import { FastifyRequest, FastifyReply } from 'fastify';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  { method: 'GET', path: /^\/health/ },
  { method: 'GET', path: /^\/public-key/ },
  { method: 'GET', path: /^\/share\/.+\/verify/ },
  { method: 'GET', path: /^\/auth\// },
  { method: 'POST', path: /^\/auth\// },
];

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const isPublic = PUBLIC_ROUTES.some(
    (route) =>
      (route.method === 'ANY' || route.method === request.method) &&
      route.path.test(request.url)
  );

  if (isPublic) return;

  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }
}

/**
 * Require employer role — used as a preHandler hook on employer routes
 */
export async function requireEmployer(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { role: string } | undefined;
  if (!user || (user.role !== 'employer' && user.role !== 'admin')) {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Employer access required' },
    });
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { role: string } | undefined;
  if (!user || user.role !== 'admin') {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }
}
