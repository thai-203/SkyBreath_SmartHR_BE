import Redis from 'ioredis';
import { config } from './env.config';

const REDIS_HOST = config.redis.host;
const REDIS_PORT = config.redis.port;
const options = {
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
};

if (process.env.REDIS_PASSWORD) {
  options.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(options);

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

export default redis;
