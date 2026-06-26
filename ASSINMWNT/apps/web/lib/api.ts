const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ─── Token storage (client-side) ─────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('omni_access_token');
}

export function setTokens(access: string, refresh: string, deviceId: string) {
  localStorage.setItem('omni_access_token', access);
  localStorage.setItem('omni_refresh_token', refresh);
  localStorage.setItem('omni_device_id', deviceId);
}

export function clearTokens() {
  localStorage.removeItem('omni_access_token');
  localStorage.removeItem('omni_refresh_token');
  localStorage.removeItem('omni_device_id');
}

// ─── Base fetch with auth ─────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Try auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!retry.ok) {
        const err = await retry.json();
        throw new ApiError(err.error?.message ?? 'Request failed', retry.status, err.error?.code);
      }
      return retry.json() as Promise<T>;
    }
    clearTokens();
    window.location.href = '/';
    throw new ApiError('Session expired', 401, 'UNAUTHORIZED');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new ApiError(err.error?.message ?? 'Request failed', res.status, err.error?.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('omni_refresh_token');
  const deviceId = localStorage.getItem('omni_device_id');
  if (!refreshToken || !deviceId) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, deviceId }),
    });
    if (!res.ok) return false;
    const data = await res.json() as { accessToken: string; refreshToken: string; deviceId: string };
    setTokens(data.accessToken, data.refreshToken, data.deviceId);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    me: () => apiFetch<{ user: User }>('/auth/me'),
    logout: (deviceId: string) =>
      apiFetch<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ deviceId }) }),
  },

  // Credentials
  credentials: {
    list: (params?: { type?: string; page?: number; pageSize?: number; search?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return apiFetch<CredentialListResponse>(`/credentials${qs}`);
    },
    get: (id: string) => apiFetch<{ credential: Credential }>(`/credentials/${id}`),
    create: (body: object) =>
      apiFetch<{ credential: Credential }>('/credentials', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: object) =>
      apiFetch<{ credential: Credential }>(`/credentials/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/credentials/${id}`, { method: 'DELETE' }),

    uploadWithFile: async (formData: FormData) => {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/credentials`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new ApiError(err.error?.message ?? 'Upload failed', res.status);
      }
      return res.json() as Promise<{ credential: Credential }>;
    },
  },

  // Share
  share: {
    create: (body: { credentialIds: string[]; ttlHours: number; maxUses: number }) =>
      apiFetch<CreateShareResponse>('/share', { method: 'POST', body: JSON.stringify(body) }),
    history: () => apiFetch<{ tokens: ShareToken[] }>('/share/history'),
    revoke: (token: string) => apiFetch<void>(`/share/${token}`, { method: 'DELETE' }),
    verify: (token: string) => apiFetch<ShareVerifyResponse>(`/share/${token}/verify`),
  },

  // Employer
  employer: {
    onboard: (body: object) =>
      apiFetch<{ profile: EmployerProfile }>('/employer/onboard', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    createRequest: (body: object) =>
      apiFetch<{ request: EmployerRequest }>('/employer/request', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getRequests: () => apiFetch<{ requests: EmployerRequest[] }>('/employer/requests'),
    consent: (id: string, action: 'approve' | 'reject') =>
      apiFetch<{ success: boolean }>(`/employer/candidate/consent/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }),
    webhookLogs: () => apiFetch<{ logs: WebhookLog[] }>('/employer/webhook-logs'),
    createApiKey: (body: object) =>
      apiFetch<ApiKeyCreated>('/employer/api-keys', { method: 'POST', body: JSON.stringify(body) }),
    getApiKeys: () => apiFetch<{ keys: ApiKeyMeta[] }>('/employer/api-keys'),
    revokeApiKey: (id: string) => apiFetch<void>(`/employer/api-keys/${id}`, { method: 'DELETE' }),
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type CredentialType = 'education' | 'work' | 'skill' | 'kyc' | 'custom';

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
  createdAt: string;
}

export interface ShareToken {
  id: string;
  credentialIds: string[];
  token: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  revokedAt: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'revoked' | 'exhausted';
}

export interface CreateShareResponse {
  token: string;
  shareUrl: string;
  qrDataUrl: string;
  expiresAt: string;
}

export interface ShareVerifyResponse {
  credentials: Credential[];
  verifiedAt: string;
  signature: string;
  publicKeyUrl: string;
}

export interface CredentialListResponse {
  data: Credential[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export interface EmployerProfile {
  id: string;
  companyName: string;
  approvalStatus: string;
}

export interface EmployerRequest {
  id: string;
  employerId: string;
  candidateEmail: string;
  credentialTypes: CredentialType[];
  status: 'pending' | 'consented' | 'completed' | 'rejected';
  webhookUrl: string | null;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  attempt: number;
  statusCode: number | null;
  deliveryStatus: string;
  createdAt: string;
  request: { candidateEmail: string; status: string };
}

export interface ApiKeyCreated {
  key: string;
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
}

export interface ApiKeyMeta {
  id: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  requestCount: number;
  createdAt: string;
}
