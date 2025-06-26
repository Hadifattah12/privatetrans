// Updated models/user.js
const db = require('../db/database');
const bcrypt = require('bcryptjs');

class User {
static create({ name, email, password, is_verified = 0, verification_token = null, avatar = '/uploads/default-avatar.png' }) {
  return new Promise(async (resolve, reject) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 8);
      const sql = `INSERT INTO users (name, email, password, is_verified, verification_token, avatar) VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(sql, [name, email, hashedPassword, is_verified, verification_token, avatar], function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, name, email, avatar });
      });
    } catch (err) {
      reject(err);
    }
  });
}


  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

    static findByName(name) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE name = ?`, [name], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static async getAllUsers() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT id, name, email, created_at FROM users`, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Find user by verification token
  static findByVerificationToken(token) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE verification_token = ?`, [token], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  // Mark user as verified and remove the token
  static verifyEmail(id) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?`;
      db.run(sql, [id], function (err) {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  // Store 2FA code for user
  static store2FACode(id, code, expiry) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET twofa_code = ?, twofa_expiry = ? WHERE id = ?`;
      db.run(sql, [code, expiry.toISOString(), id], function (err) {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  // Verify 2FA code
  static verify2FACode(id, code) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT twofa_code, twofa_expiry FROM users WHERE id = ?`;
      db.get(sql, [id], (err, row) => {
        if (err) return reject(err);
        
        if (!row || !row.twofa_code || !row.twofa_expiry) {
          return resolve(false);
        }

        const currentTime = new Date();
        const expiryTime = new Date(row.twofa_expiry);

        // Check if code matches and hasn't expired
        if (row.twofa_code === code && currentTime <= expiryTime) {
          return resolve(true);
        }
        resolve(false);
      });
    });
  }

  // Clear 2FA code after successful verification
  static clear2FACode(id) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE users SET twofa_code = NULL, twofa_expiry = NULL WHERE id = ?`;
      db.run(sql, [id], function (err) {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }
static update2FAStatus(id, status) {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE users SET is2FAEnabled = ? WHERE id = ?`;
    db.run(sql, [status, id], function (err) {
      if (err) return reject(err);
      resolve(true);
    });
  });
}
  static setPendingEmail(id, newEmail, token) {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE users SET pending_email = ?, email_update_token = ? WHERE id = ?`;
    db.run(sql, [newEmail, token, id], function (err) {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

static confirmNewEmail(token) {
  return new Promise((resolve, reject) => {
    const getSql = `SELECT id, pending_email FROM users WHERE email_update_token = ?`;
    db.get(getSql, [token], (err, row) => {
      console.log("Token found for email update:", row);

      if (err || !row) return reject("Invalid or expired token");

      const updateSql = `UPDATE users SET email = ?, pending_email = NULL, email_update_token = NULL WHERE id = ?`;
      db.run(updateSql, [row.pending_email, row.id], function (err2) {
        if (err2) return reject(err2);
        resolve(true);
      });
    });
  });
}

}



module.exports = User;