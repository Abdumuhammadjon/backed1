const { createClient } = require('redis');

require("dotenv").config();

const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD, 
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    
    }
});

redisClient.on('error', (err) => console.log('❌ Redis xatolik:', err));

redisClient.connect()
    .then(() => console.log('✅ Redis TLS orqali muvaffaqiyatli ulandi'))
    .catch((err) => console.log('❌ Redis TLS ulanishida xatolik:', err));

    module.exports=  redisClient;
