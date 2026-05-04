const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const nodemailer = require('nodemailer');

// Setup Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  try {
    await transporter.sendMail({
      from: `"BengkuluGift" <${process.env.SMTP_USER}>`,
      to, subject, html
    });
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// REGISTRASI dengan Email Verifikasi OTP
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, no_hp } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Semua field wajib diisi' });

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    // Simpan ke tabel pending_verifications
    await db.query('DELETE FROM pending_verifications WHERE email = ?', [email]);
    await db.query(
      'INSERT INTO pending_verifications (name, email, password, no_hp, otp, otp_expiry) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, no_hp || null, otp, otpExpiry]
    );

    await sendEmail(email, 'Kode Verifikasi BengkuluGift', `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f9f9f9; padding:40px 0;">
              <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #b45309, #92400e); padding:32px; text-align:center;">
                  <h1 style="color:#fff; font-size:24px; margin:0; font-weight:700;">🎁 BengkuluGift</h1>
                  <p style="color:rgba(255,255,255,0.8); margin:8px 0 0; font-size:14px;">Verifikasi Akun Anda</p>
                </div>
                <div style="padding:40px 32px;">
                  <h2 style="color:#1f2937; font-size:20px; margin:0 0 16px;">Halo, ${name}! 👋</h2>
                  <p style="color:#6b7280; font-size:15px; line-height:1.6;">Terima kasih telah mendaftar. Masukkan kode OTP berikut untuk memverifikasi email Anda:</p>
                  <div style="text-align:center; margin:32px 0;">
                    <div style="display:inline-block; background:#fef3c7; border:2px dashed #b45309; border-radius:12px; padding:20px 40px;">
                      <span style="font-size:42px; font-weight:800; color:#b45309; letter-spacing:12px;">${otp}</span>
                    </div>
                  </div>
                  <p style="color:#9ca3af; font-size:13px; text-align:center;">Kode berlaku selama <strong>15 menit</strong>. Jangan bagikan kode ini kepada siapapun.</p>
                </div>
                <div style="background:#f9fafb; padding:20px 32px; text-align:center;">
                  <p style="color:#9ca3af; font-size:12px; margin:0;">Jika Anda tidak mendaftar, abaikan email ini.</p>
                </div>
              </div>
            </div>
        `);

    res.status(200).json({ message: 'OTP terkirim ke email Anda', email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFIKASI OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM pending_verifications WHERE email = ? AND otp = ? AND otp_expiry > NOW()',
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Kode OTP tidak valid atau sudah kedaluwarsa' });
    }

    const pending = rows[0];

    // Buat akun user
    await db.query(
      'INSERT INTO users (name, email, password, no_hp) VALUES (?, ?, ?, ?)',
      [pending.name, pending.email, pending.password, pending.no_hp || null]
    );

    // Hapus data pending
    await db.query('DELETE FROM pending_verifications WHERE email = ?', [email]);

    // Kirim email selamat datang
    await sendEmail(email, 'Selamat Datang di BengkuluGift! 🎉', `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f9f9f9; padding:40px 0;">
              <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #b45309, #92400e); padding:32px; text-align:center;">
                  <div style="font-size:48px; margin-bottom:8px;">🎉</div>
                  <h1 style="color:#fff; font-size:24px; margin:0; font-weight:700;">Akun Berhasil Dibuat!</h1>
                </div>
                <div style="padding:40px 32px;">
                  <h2 style="color:#1f2937; font-size:20px; margin:0 0 16px;">Halo, ${pending.name}!</h2>
                  <p style="color:#6b7280; line-height:1.6;">Selamat bergabung di BengkuluGift! Sekarang Anda bisa menikmati berbagai oleh-oleh khas Bengkulu terbaik.</p>
                  <a href="http://localhost:3000/pages/auth/login.html" style="display:block; text-align:center; background:#b45309; color:#fff; padding:14px 24px; border-radius:10px; text-decoration:none; font-weight:700; margin-top:24px;">Mulai Belanja →</a>
                </div>
              </div>
            </div>
        `);

    res.json({ message: 'Email berhasil diverifikasi! Silakan login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESEND OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await db.query('SELECT * FROM pending_verifications WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'Data pendaftaran tidak ditemukan' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await db.query('UPDATE pending_verifications SET otp = ?, otp_expiry = ? WHERE email = ?', [otp, otpExpiry, email]);

    await sendEmail(email, 'Kode OTP Baru - BengkuluGift', `
            <div style="font-family:Arial,sans-serif;padding:20px;background:#f9f9f9;">
              <div style="max-width:400px;margin:0 auto;background:#fff;padding:32px;border-radius:16px;">
                <h2 style="color:#b45309;">Kode OTP Baru Anda</h2>
                <div style="text-align:center;margin:24px 0;">
                  <span style="font-size:42px;font-weight:800;color:#b45309;letter-spacing:12px;">${otp}</span>
                </div>
                <p style="color:#9ca3af;font-size:13px;">Berlaku 15 menit. Jangan bagikan ke siapapun.</p>
              </div>
            </div>
        `);

    res.json({ message: 'Kode OTP baru telah dikirim' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN 
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi' });

    const [admins] = await db.query('SELECT * FROM admins WHERE email_admin = ?', [email]);
    if (admins.length > 0) {
      const admin = admins[0];
      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) return res.status(400).json({ message: 'Email atau password salah' });

      const token = jwt.sign(
        { id: admin.id, role: 'admin', name: admin.nama_admin, source: 'admins' },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '7d' }
      );
      return res.json({ token, role: 'admin', name: admin.nama_admin, id: admin.id });
    }

    const [users] = await db.query("SELECT * FROM users WHERE email = ? AND role = 'user'", [email]);
    if (users.length === 0) return res.status(400).json({ message: 'Email atau password salah' });

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Email atau password salah' });

    const token = jwt.sign(
      { id: user.id, role: 'user', name: user.name, source: 'users' },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' }
    );
    res.json({ token, role: 'user', name: user.name, id: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LUPA PASSWORD 
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const [admins] = await db.query('SELECT * FROM admins WHERE email_admin = ?', [email]);
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (admins.length === 0 && users.length === 0) return res.status(404).json({ message: 'Email tidak ditemukan' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.query('DELETE FROM password_resets WHERE email = ?', [email]);
    await db.query('INSERT INTO password_resets (email, otp, otp_expiry) VALUES (?, ?, ?)', [email, otp, otpExpiry]);

    await sendEmail(email, 'Reset Password BengkuluGift', `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f9f9f9; padding:40px 0;">
              <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #b45309, #92400e); padding:32px; text-align:center;">
                  <h1 style="color:#fff; font-size:24px; margin:0;">🔒 Reset Password</h1>
                </div>
                <div style="padding:40px 32px;">
                  <p style="color:#6b7280;">Kami menerima permintaan reset password untuk akun Anda. Gunakan kode OTP berikut:</p>
                  <div style="text-align:center; margin:32px 0;">
                    <div style="display:inline-block; background:#fef3c7; border:2px dashed #b45309; border-radius:12px; padding:20px 40px;">
                      <span style="font-size:42px; font-weight:800; color:#b45309; letter-spacing:12px;">${otp}</span>
                    </div>
                  </div>
                  <p style="color:#9ca3af; font-size:13px; text-align:center;">Berlaku <strong>15 menit</strong>. Jika bukan Anda, abaikan email ini.</p>
                </div>
              </div>
            </div>
        `);

    res.json({ message: 'Kode OTP reset password telah dikirim ke email Anda' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LUPA PASSWORD 
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM password_resets WHERE email = ? AND otp = ? AND otp_expiry > NOW()',
      [email, otp]
    );
    if (rows.length === 0) return res.status(400).json({ message: 'Kode OTP tidak valid atau sudah kedaluwarsa' });

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const [isAdmin] = await db.query('SELECT id FROM admins WHERE email_admin = ?', [email]);
    if (isAdmin.length > 0) {
      await db.query('UPDATE admins SET password = ? WHERE email_admin = ?', [hashedPassword, email]);
    } else {
      await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
    }
    await db.query('DELETE FROM password_resets WHERE email = ?', [email]);

    res.json({ message: 'Password berhasil direset. Silakan login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
