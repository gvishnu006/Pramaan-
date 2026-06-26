import crypto from 'crypto';

// ─── Token Utilities ──────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random base64url token
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Hash a value with SHA-256 (for API keys, etc.)
 */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isExpired(date: Date | string): boolean {
  return new Date(date) < new Date();
}

export function toTTLSeconds(hours: number): number {
  return hours * 60 * 60;
}

// ─── Formatting Utilities ─────────────────────────────────────────────────────

export function formatCredentialType(type: string): string {
  const map: Record<string, string> = {
    education: 'Education',
    work: 'Work Experience',
    skill: 'Skill / Certification',
    kyc: 'KYC Document',
    custom: 'Custom',
  };
  return map[type] ?? type;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  if (absDiff < 60_000) return 'just now';
  if (absDiff < 3_600_000) return `${Math.round(absDiff / 60_000)}m`;
  if (absDiff < 86_400_000) return `${Math.round(absDiff / 3_600_000)}h`;
  return `${Math.round(absDiff / 86_400_000)}d`;
}

// ─── Error Utilities ──────────────────────────────────────────────────────────

export function makeApiError(code: string, message: string, field?: string) {
  return { error: { code, message, ...(field ? { field } : {}) } };
}

// ─── Async Utilities ──────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
