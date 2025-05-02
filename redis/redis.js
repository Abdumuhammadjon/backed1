const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis-17635.c244.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 17635,
  password: 'fWY10h6Kefzdh8XK9wM5L5SwLbQdwEXZ',
});

redis.ping()
  .then(() => console.log('✅ Redis-ga muvaffaqiyatli ulandi!'))
  .catch(err => console.error('❌ Redis xatosi:', err));
