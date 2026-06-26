import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error({ err: error }, 'Request error');

  // Zod validation errors
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue?.message ?? 'Validation failed',
        field: firstIssue?.path?.join('.'),
      },
    });
  }

  // JWT errors
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
      error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID' ||
      error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
    });
  }

  // Known HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: { code: error.code ?? 'CLIENT_ERROR', message: error.message },
    });
  }

  // 500 — never leak stack traces to client
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred. Please try again later.',
    },
  });
}
