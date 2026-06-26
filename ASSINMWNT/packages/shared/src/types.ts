// ─── Enums ───────────────────────────────────────────────────────────────────

export type CredentialType = 'education' | 'work' | 'skill' | 'kyc' | 'custom';

export type ShareTokenStatus = 'active' | 'expired' | 'revoked';

export type BGVRequestStatus = 'pending' | 'consented' | 'completed' | 'rejected';

export type UserRole = 'user' | 'employer' | 'admin';

export type EmployerApprovalStatus = 'pending' | 'approved' | 'rejected';

export type WebhookDeliveryStatus = 'success' | 'failed' | 'pending';

export type ApiKeyScope = 'read' | 'write' | 'webhook';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId: string | null;
  role: UserRole;
  createdAt: string;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  companyName: string;
  gstNumber: string | null;
  website: string | null;
  contactEmail: string;
  approvalStatus: EmployerApprovalStatus;
  createdAt: string;
}

export interface Credential {
  id: string;
  userId: string;
  type: CredentialType;
  title: string;
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
  verified: boolean;
  metadata: Record<string, unknown>;
  fileUrl: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface ShareToken {
  id: string;
  userId: string;
  credentialIds: string[];
  token: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  revokedAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface EmployerRequest {
  id: string;
  employerId: string;
  candidateEmail: string;
  credentialTypes: CredentialType[];
  status: BGVRequestStatus;
  webhookUrl: string | null;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  requestId: string;
  attempt: number;
  statusCode: number | null;
  responseBody: string | null;
  deliveryStatus: WebhookDeliveryStatus;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  employerId: string;
  name: string;
  keyHash: string;
  scopes: ApiKeyScope[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ShareVerifyResponse {
  credentials: Credential[];
  verifiedAt: string;
  signature: string;
  publicKeyUrl: string;
  requestId: string;
}

export interface CreateShareResponse {
  token: string;
  shareUrl: string;
  qrDataUrl: string;
  expiresAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;      // user id
  email: string;
  role: UserRole;
  deviceId: string;
  iat: number;
  exp: number;
}

// ─── Redis Data Shapes ────────────────────────────────────────────────────────

export interface RedisShareToken {
  userId: string;
  credentialIds: string[];
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
}

export interface RedisRefreshToken {
  userId: string;
  deviceId: string;
  createdAt: string;
}
