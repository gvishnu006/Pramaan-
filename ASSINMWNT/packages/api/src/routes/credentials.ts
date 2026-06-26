import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@omnimise/db';
import {
  CreateCredentialSchema,
  UpdateCredentialSchema,
  CredentialQuerySchema,
} from '@omnimise/shared';
import { uploadFile, deleteFile } from '../config/supabase';
import { writeAuditLog } from '../services/audit';

export async function credentialRoutes(app: FastifyInstance) {
  // ─── GET /credentials ─────────────────────────────────────────────────────
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const query = CredentialQuerySchema.parse(request.query);

    const where = {
      userId: payload.sub,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.search ? {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' as const } },
          { issuer: { contains: query.search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [credentials, total] = await Promise.all([
      prisma.credential.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.credential.count({ where }),
    ]);

    return reply.send({
      data: credentials,
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasMore: query.page * query.pageSize < total,
    });
  });

  // ─── POST /credentials ────────────────────────────────────────────────────
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };

    // Handle multipart (file + JSON body)
    let body: Record<string, unknown> = {};
    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let fileType = '';

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk);
          fileBuffer = Buffer.concat(chunks);
          fileName = part.filename;
          fileType = part.mimetype;
        } else {
          try { body[part.fieldname] = JSON.parse(part.value as string); }
          catch { body[part.fieldname] = part.value; }
        }
      }
    } else {
      body = request.body as Record<string, unknown>;
    }

    const input = CreateCredentialSchema.parse(body);

    // Upload file to Supabase if provided
    let fileUrl: string | null = null;
    if (fileBuffer && fileName) {
      const credId = crypto.randomUUID();
      fileUrl = await uploadFile(payload.sub, credId, fileBuffer, fileType, fileName);

      const credential = await prisma.credential.create({
        data: {
          id: credId,
          userId: payload.sub,
          ...input,
          fileUrl,
        },
      });

      await writeAuditLog({
        userId: payload.sub,
        action: 'credential.create',
        targetId: credential.id,
        ipAddress: request.ip,
      });

      return reply.status(201).send({ credential });
    }

    const credential = await prisma.credential.create({
      data: {
        userId: payload.sub,
        ...input,
        fileUrl: input.fileUrl ?? null,
      },
    });

    await writeAuditLog({
      userId: payload.sub,
      action: 'credential.create',
      targetId: credential.id,
      ipAddress: request.ip,
    });

    return reply.status(201).send({ credential });
  });

  // ─── GET /credentials/:id ─────────────────────────────────────────────────
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const { id } = request.params as { id: string };

    const credential = await prisma.credential.findFirst({
      where: { id, userId: payload.sub, deletedAt: null },
    });

    if (!credential) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Credential not found' },
      });
    }

    return reply.send({ credential });
  });

  // ─── PUT /credentials/:id ─────────────────────────────────────────────────
  app.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const input = UpdateCredentialSchema.parse(request.body);

    const existing = await prisma.credential.findFirst({
      where: { id, userId: payload.sub, deletedAt: null },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Credential not found' },
      });
    }

    const credential = await prisma.credential.update({
      where: { id },
      data: input,
    });

    await writeAuditLog({
      userId: payload.sub,
      action: 'credential.update',
      targetId: id,
      ipAddress: request.ip,
    });

    return reply.send({ credential });
  });

  // ─── DELETE /credentials/:id ──────────────────────────────────────────────
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { sub: string };
    const { id } = request.params as { id: string };

    const existing = await prisma.credential.findFirst({
      where: { id, userId: payload.sub, deletedAt: null },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Credential not found' },
      });
    }

    // Soft delete
    await prisma.credential.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Remove file from Supabase storage
    if (existing.fileUrl) {
      try {
        await deleteFile(payload.sub, id);
      } catch (err) {
        request.log.warn({ err }, 'Failed to delete file from storage');
      }
    }

    await writeAuditLog({
      userId: payload.sub,
      action: 'credential.delete',
      targetId: id,
      ipAddress: request.ip,
    });

    return reply.status(204).send();
  });
}
