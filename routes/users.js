const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const { auth, isAdmin } = require('../middleware/auth');

// GET profil user sendiri
router.get('/profile', auth, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, name, email, no_hp, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update profil user sendiri (nama, no_hp)
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, no_hp } = req.body;
        if (!name) return res.status(400).json({ message: 'Nama tidak boleh kosong' });

        await db.execute(
            'UPDATE users SET name = ?, no_hp = ? WHERE id = ?',
            [name, no_hp || null, req.user.id]
        );
        res.json({ message: 'Profil berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT ganti password (autentikasi diperlukan, cek password lama)
router.put('/profile/password', auth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ message: 'Password lama dan baru harus diisi' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ message: 'Password baru minimal 6 karakter' });
        }

        const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

        const valid = await bcrypt.compare(current_password, users[0].password);
        if (!valid) return res.status(400).json({ message: 'Password lama tidak sesuai' });

        const hashed = await bcrypt.hash(new_password, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        res.json({ message: 'Password berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET statistik user sendiri (jumlah pesanan, favorit, ulasan)
router.get('/stats', auth, async (req, res) => {
    try {
        const [[orderStats]] = await db.query(
            `SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as completed_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                IFNULL(SUM(CASE WHEN status = 'selesai' THEN total_amount ELSE 0 END), 0) as total_spent
             FROM orders WHERE user_id = ?`,
            [req.user.id]
        );
        const [[favStats]] = await db.query(
            'SELECT COUNT(*) as total_favorites FROM favorites WHERE user_id = ?',
            [req.user.id]
        );
        const [[reviewStats]] = await db.query(
            'SELECT COUNT(*) as total_reviews FROM reviews WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            total_orders: orderStats.total_orders || 0,
            completed_orders: orderStats.completed_orders || 0,
            pending_orders: orderStats.pending_orders || 0,
            total_spent: orderStats.total_spent || 0,
            total_favorites: favStats.total_favorites || 0,
            total_reviews: reviewStats.total_reviews || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ulasan yang ditulis user sendiri
router.get('/my-reviews', auth, async (req, res) => {
    try {
        const [reviews] = await db.query(
            `SELECT r.id, r.rating, r.comment, r.created_at,
                    p.id as product_id, p.name as product_name, p.image as product_image
             FROM reviews r 
             JOIN products p ON r.product_id = p.id
             WHERE r.user_id = ?
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET produk yang belum diulas
router.get('/unreviewed', auth, async (req, res) => {
    try {
        const [products] = await db.query(
            `SELECT p.id as product_id, p.name as product_name, p.image as product_image, o.id as order_id, o.created_at
             FROM orders o
             JOIN order_items oi ON o.id = oi.order_id
             JOIN products p ON oi.product_id = p.id
             WHERE o.user_id = ? AND o.status = 'selesai'
             AND NOT EXISTS (
                 SELECT 1 FROM reviews r WHERE r.user_id = o.user_id AND r.product_id = p.id
             )
             GROUP BY p.id`,
            [req.user.id]
        );
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET all users (Admin only)
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, name, email, no_hp, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE user (Admin only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ message: 'Tidak dapat menghapus akun sendiri' });
        }
        await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'Pengguna berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
