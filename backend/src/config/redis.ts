import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const acquireLock = async (lockKey: string, ttlMs: number = 5000): Promise<string | null> => {
  const token = Math.random().toString(36).substring(2);
  const result = await redis.set(`lock:${lockKey}`, token, 'PX', ttlMs, 'NX');
  return result === 'OK' ? token : null;
};

export const releaseLock = async (lockKey: string, token: string): Promise<void> => {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, `lock:${lockKey}`, token);
};