const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis-17763.c61.us-east-1-3.ec2.cloud.redislabs.com',
  port: 17763,
  password: 'FiqxUvBB1ZyJBPRgdALRh48NzqOrrm8Z',
  tls: {}   // 🔥 MUHIM
});

redis.ping()
  .then(() => console.log('✅ Redis-ga muvaffaqiyatli ulandi!'))
  .catch(err => console.error('❌ Redis xatosi:', err));

