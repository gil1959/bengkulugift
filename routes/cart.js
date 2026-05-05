const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Pengguna kelola keranjang (Lihat)
router.get('/', auth, async (req, res) => {
    try {
        const [cartItems] = await db.query(
            'SELECT c.id, c.quantity, p.name, p.price, p.image as product_image, p.id as product_id FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
            [req.user.id]
        );
        res.json(cartItems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pengguna kelola keranjang (Tambah)
router.post('/', auth, async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        
        // Cek apakah produk sudah ada di keranjang
        const [existing] = await db.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
        
        if (existing.length > 0) {
            await db.query('UPDATE cart SET quantity = quantity + ? WHERE id = ?', [quantity || 1, existing[0].id]);
        } else {
            await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, product_id, quantity || 1]);
        }
        res.status(200).json({ message: 'Product added to cart' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pengguna kelola keranjang (Hapus)
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.query('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Item removed from cart' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
