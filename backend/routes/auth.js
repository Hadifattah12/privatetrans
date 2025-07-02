// routes/auth.js -------------------------------------------------------------
const { pipeline }   = require('stream/promises');
const path           = require('path');
const fs             = require('fs');

const auth                       = require('../middlewares/auth');
const confirmEmailUpdate         = require('../controllers/confirmEmailUpdate');
const { toggle2FA }              = require('../controllers/authController');
const { googleAuth, googleCallback } = require('../controllers/googleAuthController');

const User = require('../models/user');

async function routes(fastify, options) {
  const {
    signUp,
    login,
    getProfile,
    verify2FA
  } = require('../controllers/authController');

  const verifyEmail  = require('../controllers/verifyEmail');
  const tournament   = require('../controllers/tournamentController');

  /* --------------------- Public auth routes --------------------- */
  fastify.post('/signup',        signUp);
  fastify.post('/login',         login);
  fastify.post('/verify-2fa',    verify2FA);

  /* --------------------- Google OAuth --------------------------- */
  fastify.get('/auth/google',          googleAuth);
  fastify.get('/auth/google/callback', googleCallback);

  /* --------------------- Protected routes ----------------------- */
  fastify.get('/profile', { preHandler: auth }, getProfile);
  fastify.patch('/profile/2fa', { preHandler: auth }, toggle2FA);

  /* --------------------- Update profile ------------------------- */
  fastify.patch('/profile', { preHandler: auth }, async (req, reply) => {
    const userId  = req.user.id;
    const parts   = req.parts();
    const fields  = {};
    let avatarPart;

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'avatar') {
        avatarPart = part;
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value.trim();
      }
    }

    const { name, email, password } = fields;

    /* ---------- basic validation ---------- */
    if (!name && !email && !password && !avatarPart) {
      return reply.status(400).send({ error: 'Nothing to update.' });
    }
    if ((name && !email) || (email && !name)) {
      return reply.status(400).send({ error: 'Name and email are both required.' });
    }

    /* ---------- uniqueness checks (case-insensitive) ---------- */
    if (email) {
      const emailOwner = await User.findByEmail(email);
      if (emailOwner && emailOwner.id !== userId) {
        return reply.status(400).send({ error: 'Email is already in use by another account.' });
      }
    }

    if (name) {
      const nameOwner = await User.findByName(name);
      if (nameOwner && nameOwner.id !== userId) {
        return reply.status(400).send({ error: 'Display name is already taken.' });
      }
    }

    /* ---------- build payload ---------- */
    const updatePayload = {};
    if (name)  updatePayload.name  = name;
    if (email) updatePayload.email = email;

    if (password && password.length >= 7) {
      updatePayload.password = await require('bcryptjs').hash(
        password,
        require('../models/user').SALT_ROUNDS || 8
      );
    }

    if (avatarPart) {
      const uploadPath = path.join(
        __dirname,
        '..',
        'uploads',
        `${userId}_${avatarPart.filename}`
      );
      await pipeline(avatarPart.file, fs.createWriteStream(uploadPath));
      updatePayload.avatar = `/uploads/${userId}_${avatarPart.filename}`;
    }

    /* ---------- email change flow ---------- */
    const db = require('../db/database');
    let isChangingEmail = false;

    if (updatePayload.email) {
      const { email: currentEmail } = await User.findById(userId);
      isChangingEmail = currentEmail.toLowerCase() !== updatePayload.email.toLowerCase();

      if (isChangingEmail) {
        const crypto      = require('crypto');
        const token       = crypto.randomBytes(32).toString('hex');
        const transporter = require('../services/emailService');
        const getNgrokUrl = require('../utils/getNgrokUrl');
        await User.setPendingEmail(userId, updatePayload.email, token);

        const confirmUrl  = `${await getNgrokUrl()}/api/confirm-new-email?token=${token}`;
        await transporter.sendMail({
          to: updatePayload.email,
          subject: 'Confirm Your New Email Address',
          html: `
            <p>Hi,</p>
            <p>You requested to change your email. Please confirm it by clicking the link below:</p>
            <a href="${confirmUrl}">Confirm new email</a>
            <p>If you didn't request this, please ignore this email.</p>`
        });

        delete updatePayload.email; // wait for confirmation
      }
    }

    /* ---------- persist changes ---------- */
    if (Object.keys(updatePayload).length) {
      const placeholders = Object.keys(updatePayload).map(k => `${k} = ?`).join(', ');
      await new Promise((res, rej) =>
        db.run(
          `UPDATE users SET ${placeholders} WHERE id = ?`,
          [...Object.values(updatePayload), userId],
          err => (err ? rej(err) : res())
        )
      );
    }

    const updatedUser = await User.findById(userId);
    let message = 'Profile updated.';
    if (isChangingEmail) message += ' Please check your new inbox to confirm the change.';
    return reply.send({ message, user: updatedUser });
  });

  /* --------------------- Logout -------------------------- */
  fastify.post('/logout', { preHandler: auth }, async (req, reply) => {
    req.server.onlineUsers.delete(req.user.id);
    return reply.send({ message: 'Logged out successfully.' });
  });

  /* --------------------- Email verification -------------- */
  fastify.get('/verify-email',        verifyEmail);
  fastify.get('/confirm-new-email',   confirmEmailUpdate);

  /* --------------------- Tournament ---------------------- */
  fastify.post('/tournament/start',          tournament.startTournament);
  fastify.post('/tournament/record-winner',  tournament.recordWinner);
  fastify.post('/tournament/next-round',     tournament.nextRound);
  fastify.get('/tournament/matches',         tournament.getMatches);

  /* --------------------- Health check -------------------- */
  fastify.get('/health', async () => ({ status: 'OK', message: 'API is running' }));
}

module.exports = routes;
