import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@omnimise/db';
import {
  CreateEmployerRequestSchema,
  ConsentSchema,
  EmployerOnboardingSchema,
  CreateApiKeySchema,
} from '@omnimise/shared';
import { generateSecureToken, sha256, withRetry } from '@omnimise/shared';
import { writeAuditLog } from '../services/audit';
import { signBundle } from '../services/signing';
import { requireEmployer } from '../middleware/auth';
import { env } from '../config/env';

export async function employerRoutes(app: FastifyInstance) {
  // ─── Employer Onboarding ──────────────────────────────────────────────────

  /**
   * POST /employer/onboard
   */
  app.post('/onboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const input = EmployerOnboardingSchema.parse(request.body);

    // Check no existing profile
    const existing = await prisma.employerProfile.findUnique({
      where: { userId: payload.sub },
    });

    if (existing) {
      return reply.status(400).send({
        error: { code: 'ALREADY_EXISTS', message: 'Employer profile already exists' },
      });
    }

    const profile = await prisma.employerProfile.create({
      data: {
        userId: payload.sub,
        ...input,
        approvalStatus: 'pending',
      },
    });

    // Update user role
    await prisma.user.update({
      where: { id: payload.sub },
      data: { role: 'employer' },
    });

    return reply.status(201).send({ profile });
  });

  // ─── BGV Requests ─────────────────────────────────────────────────────────

  /**
   * POST /employer/request
   */
  app.post('/request', {
    preHandler: [requireEmployer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const input = CreateEmployerRequestSchema.parse(request.body);

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: payload.sub },
    });

    if (!employer || employer.approvalStatus !== 'approved') {
      return reply.status(403).send({
        error: { code: 'NOT_APPROVED', message: 'Employer account is pending admin approval' },
      });
    }

    // Find candidate by email
    const candidate = await prisma.user.findUnique({
      where: { email: input.candidateEmail },
    });

    const bgvRequest = await prisma.employerRequest.create({
      data: {
        employerId: employer.id,
        candidateEmail: input.candidateEmail,
        candidateId: candidate?.id ?? null,
        credentialTypes: input.credentialTypes,
        webhookUrl: input.webhookUrl ?? null,
        status: 'pending',
      },
    });

    // TODO: Send email to candidate (integration point for email service)

    await writeAuditLog({
      userId: payload.sub,
      action: 'employer.request.create',
      targetId: bgvRequest.id,
      ipAddress: request.ip,
    });

    return reply.status(201).send({ request: bgvRequest });
  });

  /**
   * GET /employer/requests
   */
  app.get('/requests', {
    preHandler: [requireEmployer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: payload.sub },
    });

    if (!employer) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Employer profile not found' },
      });
    }

    const requests = await prisma.employerRequest.findMany({
      where: { employerId: employer.id },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ requests });
  });

  // ─── Candidate Consent ────────────────────────────────────────────────────

  /**
   * POST /candidate/consent/:id
   */
  app.post('/candidate/consent/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const input = ConsentSchema.parse(request.body);

    const bgvRequest = await prisma.employerRequest.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!bgvRequest) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'BGV request not found' },
      });
    }

    if (bgvRequest.candidateEmail !== (await prisma.user.findUnique({ where: { id: payload.sub } }))?.email) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'This request is not for you' },
      });
    }

    const newStatus = input.action === 'approve' ? 'consented' : 'rejected';

    await prisma.employerRequest.update({
      where: { id },
      data: { status: newStatus, candidateId: payload.sub },
    });

    if (input.action === 'approve' && bgvRequest.webhookUrl) {
      // Fetch matching credentials
      const credentials = await prisma.credential.findMany({
        where: {
          userId: payload.sub,
          type: { in: bgvRequest.credentialTypes },
          deletedAt: null,
        },
      });

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      const verifiedAt = new Date().toISOString();
      const bundle = { request_id: id, candidate_name: user?.name, credentials, verified_at: verifiedAt };
      const signature = signBundle(bundle);

      const webhookPayload = { ...bundle, signature };

      // Deliver webhook with retry
      deliverWebhook(id, bgvRequest.webhookUrl, webhookPayload).catch(console.error);

      await prisma.employerRequest.update({ where: { id }, data: { status: 'completed' } });
    }

    await writeAuditLog({
      userId: payload.sub,
      action: `candidate.consent.${input.action}`,
      targetId: id,
      ipAddress: request.ip,
    });

    return reply.send({ success: true, status: newStatus });
  });

  // ─── Webhook Logs ─────────────────────────────────────────────────────────

  /**
   * GET /employer/webhook-logs
   */
  app.get('/webhook-logs', {
    preHandler: [requireEmployer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: payload.sub },
    });

    if (!employer) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    }

    const logs = await prisma.webhookLog.findMany({
      where: {
        request: { employerId: employer.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { request: { select: { candidateEmail: true, status: true } } },
    });

    return reply.send({ logs });
  });

  // ─── API Key Management ───────────────────────────────────────────────────

  /**
   * POST /employer/api-keys
   */
  app.post('/api-keys', {
    preHandler: [requireEmployer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const input = CreateApiKeySchema.parse(request.body);

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: payload.sub },
    });
    if (!employer) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    }

    const rawKey = `omni_${generateSecureToken(32)}`;
    const keyHash = sha256(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        employerId: employer.id,
        name: input.name,
        keyHash,
        scopes: input.scopes,
      },
    });

    // Return key ONLY ONCE
    return reply.status(201).send({
      key: rawKey, // shown once
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    });
  });

  /**
   * GET /employer/api-keys
   */
  app.get('/api-keys', {
    preHandler: [requireEmployer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: payload.sub },
    });
    if (!employer) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    }

    const keys = await prisma.apiKey.findMany({
      where: { employerId: employer.id, revokedAt: null },
      select: {
        id: true, name: true, scopes: true, lastUsedAt: true,
        requestCount: true, createdAt: true,
        // Never return keyHash
      },
    });

    return reply.send({ keys });
  });

  /**
   * DELETE /employer/api-keys/:id
   */
  app.delete('/api-keys/:id', {
    preHandler: [requireEmployer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const { id } = request.params as { id: string };

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: payload.sub },
    });

    const key = await prisma.apiKey.findFirst({
      where: { id, employerId: employer?.id },
    });

    if (!key) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }

    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    return reply.status(204).send();
  });
}

// ─── Webhook Delivery ─────────────────────────────────────────────────────────

async function deliverWebhook(
  requestId: string,
  webhookUrl: string,
  payload: object
): Promise<void> {
  const deliver = async (attempt: number) => {
    const logEntry = await prisma.webhookLog.create({
      data: {
        requestId,
        attempt,
        deliveryStatus: 'pending',
      },
    });

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Omnimise-Signature': 'v1' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      const responseBody = await res.text().catch(() => '');

      await prisma.webhookLog.update({
        where: { id: logEntry.id },
        data: {
          statusCode: res.status,
          responseBody: responseBody.substring(0, 500),
          deliveryStatus: res.ok ? 'success' : 'failed',
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      await prisma.webhookLog.update({
        where: { id: logEntry.id },
        data: {
          deliveryStatus: 'failed',
          responseBody: String(err),
        },
      });
      throw err;
    }
  };

  // 3 attempts: 0s, 60s, 300s
  const delays = [0, 60_000, 300_000];
  for (let i = 0; i < delays.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      await deliver(i + 1);
      return;
    } catch {
      if (i === delays.length - 1) {
        console.error(`Webhook delivery failed for request ${requestId} after 3 attempts`);
      }
    }
  }
}
