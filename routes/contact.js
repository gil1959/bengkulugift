const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, email, phone, topic, message } = req.body;
        
        if (!name || !email || !topic || !message) {
            return res.status(400).json({ message: 'Harap isi semua field yang wajib.' });
        }

        const adminEmail = process.env.SMTP_USER; // Kirim ke email sendiri / admin

        if (!adminEmail) {
            return res.status(500).json({ message: 'Konfigurasi email admin belum disetting.' });
        }

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px;">
                <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; border-top: 4px solid #b45309;">
                    <h2 style="color: #333;">Pesan Baru dari Form Kontak BengkuluGift</h2>
                    <p><strong>Nama:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>No. WhatsApp:</strong> ${phone || '-'}</p>
                    <p><strong>Topik:</strong> ${topic}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <h3 style="color: #555;">Pesan:</h3>
                    <p style="white-space: pre-wrap; color: #444; line-height: 1.5;">${message}</p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: `"BengkuluGift Web Form" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            replyTo: email,
            subject: `Pesan Kontak Baru: [${topic}] dari ${name}`,
            html: htmlContent
        });

        res.status(200).json({ message: 'Pesan berhasil dikirim!' });
    } catch (err) {
        console.error('Contact Form Error:', err);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengirim pesan.' });
    }
});

module.exports = router;
