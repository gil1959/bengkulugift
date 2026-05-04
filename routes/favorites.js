const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// GET semua favorit milik user
router.get('/', auth, async (req, res) => {
    try {
        const [favorites] = await db.query(
            `SELECT f.id, p.id as product_id, p.name, p.price, p.image, p.stock,
                    c.name as category_name,
                    IFNULL(AVG(r.rating), 0) as avg_rating
             FROM favorites f
             JOIN products p ON f.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN reviews r ON p.id = r.product_id
             WHERE f.user_id = ?
             GROUP BY f.id, p.id, p.name, p.price, p.image, p.stock, c.name
             ORDER BY f.created_at DESC`,
            [req.user.id]
        );
        res.json(favorites);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST tambah ke favorit
router.post('/', auth, async (req, res) => {
    try {
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ message: 'product_id wajib diisi' });

        const [existing] = await db.query(
            'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
            [req.user.id, product_id]
        );
        if (existing.length > 0) return res.status(400).json({ message: 'Produk sudah ada di favorit' });

        await db.query(
            'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)',
            [req.user.id, product_id]
        );
        res.status(201).json({ message: 'Produk berhasil ditambahkan ke favorit' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE hapus dari favorit (by favorite id)
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM favorites WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Produk dihapus dari favorit' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE hapus dari favorit (by product_id)
router.delete('/product/:product_id', auth, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM favorites WHERE product_id = ? AND user_id = ?',
            [req.params.product_id, req.user.id]
        );
        res.json({ message: 'Produk dihapus dari favorit' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET cek apakah produk ada di favorit user
router.get('/check/:product_id', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
            [req.user.id, req.params.product_id]
        );
        res.json({ isFavorite: rows.length > 0, favoriteId: rows[0]?.id || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
