import redis from '../config/redis.config.js';

export class RedisService {
  async set(key, value, ttlSeconds) {
    if (ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await redis.set(key, value);
    }
  }

  async get(key) {
    return redis.get(key);
  }

  async del(key) {
    return redis.del(key);
  }

  async exists(key) {
    return (await redis.exists(key)) === 1;
  }
}
