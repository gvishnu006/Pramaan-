import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
});

export const GoogleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

// ─── Credential Schemas ───────────────────────────────────────────────────────

export const CredentialTypeEnum = z.enum(['education', 'work', 'skill', 'kyc', 'custom']);

export const CreateCredentialSchema = z.object({
  type: CredentialTypeEnum,
  title: z.string().min(1, 'Title is required').max(200),
  issuer: z.string().min(1, 'Issuer is required').max(200),
  issueDate: z.string().datetime({ offset: true }).optional().nullable(),
  expiryDate: z.string().datetime({ offset: true }).optional().nullable(),
  verified: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
  fileUrl: z.string().url().optional().nullable(),
}).refine(
  (data) => {
    if (data.issueDate && data.expiryDate) {
      return new Date(data.expiryDate) > new Date(data.issueDate);
    }
    return true;
  },
  { message: 'Expiry date must be after issue date', path: ['expiryDate'] }
);

export const UpdateCredentialSchema = CreateCredentialSchema.partial();

export const CredentialQuerySchema = z.object({
  type: CredentialTypeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

// ─── Share Schemas ────────────────────────────────────────────────────────────

export const CreateShareSchema = z.object({
  credentialIds: z.array(z.string().uuid()).min(1, 'At least one credential is required').max(50),
  ttlHours: z.number().int().min(1).max(24 * 365), // max 1 year
  maxUses: z.number().int().min(1).max(1000),
});

// ─── Employer Schemas ─────────────────────────────────────────────────────────

export const CreateEmployerRequestSchema = z.object({
  candidateEmail: z.string().email('Invalid email address'),
  credentialTypes: z.array(CredentialTypeEnum).min(1, 'At least one credential type required'),
  webhookUrl: z.string().url('Invalid webhook URL').optional().nullable(),
});

export const ConsentSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export const EmployerOnboardingSchema = z.object({
  companyName: z.string().min(2).max(200),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number').optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  contactEmail: z.string().email('Invalid contact email'),
});

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(['read', 'write', 'webhook'])).min(1),
});

// ─── File Upload Validation ───────────────────────────────────────────────────

export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const FileMetaSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().min(1).max(MAX_FILE_SIZE_BYTES, 'File must be under 10MB'),
  type: z.enum(ALLOWED_FILE_TYPES, { errorMap: () => ({ message: 'Only PDF, JPG, PNG allowed' }) }),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CreateCredentialInput = z.infer<typeof CreateCredentialSchema>;
export type UpdateCredentialInput = z.infer<typeof UpdateCredentialSchema>;
export type CredentialQuery = z.infer<typeof CredentialQuerySchema>;
export type CreateShareInput = z.infer<typeof CreateShareSchema>;
export type CreateEmployerRequestInput = z.infer<typeof CreateEmployerRequestSchema>;
export type EmployerOnboardingInput = z.infer<typeof EmployerOnboardingSchema>;
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
