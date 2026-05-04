// Route untuk orders & payments 
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'pay_' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

//ADMIN: GET all orders 
router.get('/all', auth, isAdmin, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*, u.name as user_name, u.email as user_email,
             p.bukti_pembayaran as payment_proof,
             p.status_pembayaran
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN payments p ON p.order_id = o.id
             ORDER BY o.created_at DESC`
        );
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//USER: GET own orders 
router.get('/my', auth, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*,
             GROUP_CONCAT(pr.name SEPARATOR ', ') as product_names,
             MAX(oi.product_id) as first_product_id,
             pay.bukti_pembayaran as payment_proof,
             pay.status_pembayaran
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products pr ON oi.product_id = pr.id
             LEFT JOIN payments pay ON pay.order_id = o.id
             WHERE o.user_id = ?
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN: GET orders with status 'paid' for validation 
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*, u.name as user_name, u.email as user_email,
             GROUP_CONCAT(CONCAT(oi.quantity,'x ',pr.name) SEPARATOR ', ') as items_summary,
             pay.bukti_pembayaran as payment_proof,
             pay.status_pembayaran,
             pay.id as payment_id
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products pr ON oi.product_id = pr.id
             LEFT JOIN payments pay ON pay.order_id = o.id
             WHERE o.status IN ('paid', 'diproses')
             GROUP BY o.id
             ORDER BY o.created_at DESC`
        );
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//USER: Checkout (create order from cart)
router.post('/checkout', auth, async (req, res) => {
    try {
        const [cartItems] = await db.query(
            'SELECT c.*, p.price, p.name, p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
            [req.user.id]
        );
        if (cartItems.length === 0) return res.status(400).json({ message: 'Keranjang kosong' });

        // Cek stok
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                return res.status(400).json({ message: `Stok ${item.name} tidak cukup` });
            }
        }

        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Insert ke tabel orders (Pemesanan)
        const [orderResult] = await db.query(
            'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
            [req.user.id, totalAmount]
        );
        const orderId = orderResult.insertId;

        // Insert order_items
        for (const item of cartItems) {
            await db.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
            await db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        }

        // Buat record payments awal (status menunggu, belum ada bukti)
        await db.query(
            'INSERT INTO payments (order_id, status_pembayaran) VALUES (?, ?)',
            [orderId, 'menunggu']
        );

        // Kosongkan keranjang
        await db.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

        res.json({ message: 'Order berhasil', orderId, totalAmount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//USER: Upload bukti pembayaran 
router.post('/:id/payment', auth, upload.single('payment_proof'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });

        const buktiBayar = `/uploads/${req.file.filename}`;
        const orderId = req.params.id;

        // Update status orders -> 'paid'
        await db.query(
            'UPDATE orders SET status = "paid" WHERE id = ? AND user_id = ?',
            [orderId, req.user.id]
        );

        // Update atau insert ke tabel payments (Pembayaran)
        const [existing] = await db.query('SELECT id FROM payments WHERE order_id = ?', [orderId]);
        if (existing.length > 0) {
            await db.query(
                'UPDATE payments SET bukti_pembayaran = ?, status_pembayaran = "menunggu" WHERE order_id = ?',
                [buktiBayar, orderId]
            );
        } else {
            await db.query(
                'INSERT INTO payments (order_id, status_pembayaran, bukti_pembayaran) VALUES (?, "menunggu", ?)',
                [orderId, buktiBayar]
            );
        }

        res.json({ message: 'Bukti pembayaran berhasil diupload' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN: Validasi pembayaran (diproses)
router.put('/:id/validate', auth, isAdmin, async (req, res) => {
    try {
        await db.query('UPDATE orders SET status = "diproses" WHERE id = ?', [req.params.id]);
        // Update status pembayaran -> lunas
        await db.query(
            'UPDATE payments SET status_pembayaran = "lunas" WHERE order_id = ?',
            [req.params.id]
        );
        res.json({ message: 'Pesanan sedang diproses' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//ADMIN: Kirim pesanan
router.put('/:id/send', auth, isAdmin, async (req, res) => {
    try {
        await db.query('UPDATE orders SET status = "dikirim" WHERE id = ?', [req.params.id]);
        res.json({ message: 'Pesanan dikirim' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//USER: Selesaikan pesanan
router.put('/:id/complete', auth, async (req, res) => {
    try {
        await db.query('UPDATE orders SET status = "selesai" WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Pesanan diselesaikan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//USER/ADMIN: Batalkan pesanan
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const [orders] = await db.query('SELECT user_id, status FROM orders WHERE id = ?', [req.params.id]);
        if (!orders.length) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });

        const order = orders[0];
        if (req.user.role !== 'admin') {
            if (order.user_id !== req.user.id) return res.status(403).json({ message: 'Akses ditolak' });
            if (order.status !== 'pending') return res.status(400).json({ message: 'Hanya pesanan pending yang bisa dibatalkan' });
        }

        await db.query('UPDATE orders SET status = "cancelled" WHERE id = ?', [req.params.id]);
        // Update status pembayaran jika ada
        await db.query(
            'UPDATE payments SET status_pembayaran = "ditolak" WHERE order_id = ?',
            [req.params.id]
        );
        res.json({ message: 'Pesanan dibatalkan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//GET order detail with items & payment
router.get('/:id', auth, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*, u.name as user_name,
             pay.bukti_pembayaran as payment_proof,
             pay.status_pembayaran,
             pay.id as payment_id
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN payments pay ON pay.order_id = o.id
             WHERE o.id = ?`,
            [req.params.id]
        );
        if (!orders.length) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });

        const [items] = await db.query(
            `SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
            [req.params.id]
        );
        res.json({ ...orders[0], items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
