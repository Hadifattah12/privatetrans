require('dotenv').config();
const path = require('path'); // ✅ ADD THIS
const fastifyStatic = require('@fastify/static');
const friendRoutes = require('./routes/friends');

const fastify = require('fastify')({
  logger: true,
  https: {
    key: require('fs').readFileSync('./certificate/key.pem'),
    cert: require('fs').readFileSync('./certificate/cert.pem')
  }
});

const authRoutes = require('./routes/auth');
const fastifyCors = require('@fastify/cors');
const fastifyJwt = require('@fastify/jwt');

// CORS
fastify.register(fastifyCors, { 
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
});

// JWT
fastify.register(fastifyJwt, {
  secret: 'forsecret'
});

// File Uploads
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 2 * 1024 * 1024,
  }
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/', // URL path prefix
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

fastify.register(friendRoutes, { prefix: '/api' });

const onlineUsers = new Set();
fastify.decorate('onlineUsers', onlineUsers);

// Start
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on https://0.0.0.0:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
