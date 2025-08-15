const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis-12319.c273.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 12319,
  password: '4K3l1H41SbTDPxviB3EILSY6NPQLEQ6I',
});

redis.ping()
  .then(() => console.log('✅ Redis-ga muvaffaqiyatli ulandi!'))
  .catch(err => console.error('❌ Redis xatosi:', err));




// redis-cli -u redis:// standart : 4K3l1H41SbTDPxviB3EILSY6NPQLEQ6I @ standart 4K3l1H41SbTDPxviB3EILSY6NPQLEQ6I redis-12319.c273.us-east-1-2.ec2.redns.redis-cloud.com 12319
