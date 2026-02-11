const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis-17763.c61.us-east-1-3.ec2.cloud.redislabs.com',
  port: 17763,
  password: 'FiqxUvBB1ZyJBPRgdALRh48NzqOrrm8Z',
});

redis.ping()
  .then(() => console.log('✅ Redis-ga muvaffaqiyatli ulandi!'))
  .catch(err => console.error('❌ Redis xatosi:', "ishlamayapti",  err));




// redis-cli -u redis:// standart : 4K3l1H41SbTDPxviB3EILSY6NPQLEQ6I @ standart 4K3l1H41SbTDPxviB3EILSY6NPQLEQ6I redis-12319.c273.us-east-1-2.ec2.redns.redis-cloud.com 12319
