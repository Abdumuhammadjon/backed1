const { createClient } = require('redis');

require("dotenv").config();

const redisClient = createClient({
    username: 'default',
    password: '4K3l1H41SbTDPxviB3EILSY6NPQLEQ6I', 
    socket: {
        host: 'redis-12319.c273.us-east-1-2.ec2.redns.redis-cloud.com',
        port:  12319,
    
    }
});

redisClient.on('error', (err) => console.log('❌ Redis xatolik:', err));

redisClient.connect()
    .then(() => console.log('✅ Redis TLS orqali muvaffaqiyatli ulandi'))
    .catch((err) => console.log('❌ Redis TLS ulanishida xatolikllllllllllaaaaaar:', err));

    module.exports=  redisClient;
