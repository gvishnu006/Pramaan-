import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  },
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

// ─── Redis Key Helpers ────────────────────────────────────────────────────────

export const RedisKeys = {
  shareToken: (token: string) => `share:${token}`,
  refreshToken: (deviceId: string, userId: string) => `refresh:${userId}:${deviceId}`,
  loginAttempts: (ip: string) => `login_attempts:${ip}`,
  rateLimitAuth: (ip: string) => `rl_auth:${ip}`,
  webhookQueue: (requestId: string) => `webhook:${requestId}`,
} as const;

// ─── Token Operations ─────────────────────────────────────────────────────────

export async function storeRefreshToken(
  userId: string,
  deviceId: string,
  token: string,
  ttlSeconds: number
): Promise<void> {
  const key = RedisKeys.refreshToken(deviceId, userId);
  await redis.set(key, token, 'EX', ttlSeconds);
}

export async function getRefreshToken(userId: string, deviceId: string): Promise<string | null> {
  return redis.get(RedisKeys.refreshToken(deviceId, userId));
}

export async function deleteRefreshToken(userId: string, deviceId: string): Promise<void> {
  await redis.del(RedisKeys.refreshToken(deviceId, userId));
}

export async function incrementLoginAttempts(ip: string): Promise<number> {
  const key = RedisKeys.loginAttempts(ip);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 600); // 10 min window
  }
  return count;
}

export async function getLoginAttempts(ip: string): Promise<number> {
  const count = await redis.get(RedisKeys.loginAttempts(ip));
  return parseInt(count ?? '0', 10);
}

export async function resetLoginAttempts(ip: string): Promise<void> {
  await redis.del(RedisKeys.loginAttempts(ip));
}

export async function storeShareToken(
  token: string,
  data: object,
  ttlSeconds: number
): Promise<void> {
  await redis.set(RedisKeys.shareToken(token), JSON.stringify(data), 'EX', ttlSeconds);
}

export async function getShareToken(token: string): Promise<string | null> {
  return redis.get(RedisKeys.shareToken(token));
}

export async function deleteShareToken(token: string): Promise<void> {
  await redis.del(RedisKeys.shareToken(token));
}

export async function incrementShareTokenUseCount(token: string): Promise<number> {
  const key = RedisKeys.shareToken(token);
  const raw = await redis.get(key);
  if (!raw) throw new Error('Token not found');
  
  const data = JSON.parse(raw);
  data.useCount = (data.useCount || 0) + 1;
  
  const ttl = await redis.ttl(key);
  if (ttl > 0) {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  }
  
  return data.useCount;
}
