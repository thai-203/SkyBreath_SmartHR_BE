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
  if (err.code === 'ECONNREFUSED') {
    console.error(
      '❌ Redis connection refused at 127.0.0.1:6379. Is Redis running? Please check README.md for instructions.',
    );
  } else {
    console.error('❌ Redis error:', err);
  }
});

export default redis;
