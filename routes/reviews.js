const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, isAdmin } = require('../middleware/auth');

// Get all reviews Admin only
router.get('/all', auth, isAdmin, async (req, res) => {
    try {
        const [reviews] = await db.query(
            `SELECT r.*, u.name as user_name, p.name as product_name 
             FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             JOIN products p ON r.product_id = p.id 
             ORDER BY r.created_at DESC`
        );
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get latest reviews for landing page Public
router.get('/latest', async (req, res) => {
    try {
        const [reviews] = await db.query(
            `SELECT r.*, u.name as user_name, p.name as product_name 
             FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             JOIN products p ON r.product_id = p.id 
             ORDER BY r.created_at DESC 
             LIMIT 6`
        );
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pengguna memberi ulasan
router.post('/', auth, async (req, res) => {
    try {
        const { product_id, rating, comment } = req.body;

        if (!product_id || !rating) {
            return res.status(400).json({ message: 'product_id dan rating wajib diisi' });
        }

        // Cek apakah user sudah membeli produk ini
        const [purchases] = await db.query(
            `SELECT o.id FROM orders o 
             JOIN order_items oi ON o.id = oi.order_id 
             WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'selesai'`,
            [req.user.id, product_id]
        );

        if (purchases.length === 0) {
            return res.status(403).json({ message: 'Anda hanya bisa mengulas produk yang sudah dibeli dan selesai' });
        }

        // Cek apakah sudah pernah mengulas produk ini
        const [existing] = await db.query(
            'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
            [req.user.id, product_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Anda sudah memberikan ulasan untuk produk ini' });
        }

        await db.query(
            'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
            [req.user.id, product_id, rating, comment || '']
        );
        res.status(201).json({ message: 'Ulasan berhasil dikirim! Terima kasih.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete review Admin only
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ulasan berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lihat ulasan suatu produk (PUBLIC)
router.get('/:product_id', async (req, res) => {
    try {
        const [reviews] = await db.query(
            `SELECT r.*, u.name as user_name 
             FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.product_id = ? 
             ORDER BY r.created_at DESC`,
            [req.params.product_id]
        );
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
