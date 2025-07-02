// server.js - Fixed version
// Prefer IPv4 over IPv6 for every DNS lookup
require('dns').setDefaultResultOrder('ipv4first');

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fastifyStatic = require('@fastify/static');
const friendRoutes = require('./routes/friends');

// Force HTTPS with certificates
const keyPath = './certificate/key.pem';
const certPath = './certificate/cert.pem';

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ HTTPS certificates not found!');
  console.error('Please ensure you have:');
  console.error('  - ./certificate/key.pem');
  console.error('  - ./certificate/cert.pem');
  process.exit(1);
}

console.log('🔒 Using HTTPS certificates');
const serverOptions = {
  logger: true,
  https: {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  }
};

const fastify = require('fastify')(serverOptions);

const authRoutes = require('./routes/auth');
const fastifyCors = require('@fastify/cors');
const fastifyJwt = require('@fastify/jwt');

// CORS - Configure for HTTPS
fastify.register(fastifyCors, { 
  origin: [
    'https://localhost:5173',
    'https://localhost:3000',
    'https://127.0.0.1:5173',
    'https://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// JWT
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'forsecret'
});

// File Uploads
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 2 * 1024 * 1024,
  }
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/',
});

// Register avatar upload route
fastify.register(require('./routes/avatar'));

// Auth routes
fastify.register(authRoutes, { prefix: '/api' });

// Redirect root
fastify.get('/', async (request, reply) => {
  return reply.type('text/html').send(`
    <script>
      window.location.href = '/#/home';
    </script>
  `);
});

fastify.register(require('./routes/match'));
fastify.register(friendRoutes, { prefix: '/api' });

const onlineUsers = new Set();
fastify.decorate('onlineUsers', onlineUsers);

// Start server with HTTPS
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    
    await fastify.listen({ 
      port: port, 
      host: '0.0.0.0' 
    });
    
    console.log(`🚀 Server listening on https://localhost:${port}`);
    console.log(`🔗 Google OAuth redirect: https://localhost:${port}/api/auth/google/callback`);
    console.log(`🔒 Make sure your frontend is also using HTTPS!`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();