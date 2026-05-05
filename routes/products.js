const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Semua bisa melihat produk
router.get('/', async (req, res) => {
    try {
        const { category_id } = req.query;
        let query = `SELECT p.*, c.name as category_name, 
                     COALESCE(AVG(r.rating), 0) as avg_rating, 
                     COUNT(r.id) as review_count 
                     FROM products p 
                     LEFT JOIN categories c ON p.category_id = c.id 
                     LEFT JOIN reviews r ON p.id = r.product_id`;
        let params = [];
        
        if (category_id) {
            query += ' WHERE p.category_id = ?';
            params.push(category_id);
        }
        
        query += ' GROUP BY p.id ORDER BY p.id DESC';
        
        const [products] = await db.query(query, params);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dapatkan detail satu produk
router.get('/:id', async (req, res) => {
    try {
        const [product] = await db.query(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
            [req.params.id]
        );
        if (product.length === 0) return res.status(404).json({ message: 'Product not found' });
        res.json(product[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin kelola produk (Tambah)
router.post('/', auth, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock, category_id } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        
        const [result] = await db.query(
            'INSERT INTO products (name, description, price, stock, category_id, image) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, stock, category_id, image]
        );
        res.status(201).json({ id: result.insertId, message: 'Product added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin kelola produk (Update)
router.put('/:id', auth, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock, category_id } = req.body;
        let query = 'UPDATE products SET name=?, description=?, price=?, stock=?, category_id=?';
        let params = [name, description, price, stock, category_id];
        
        if (req.file) {
            query += ', image=?';
            params.push(`/uploads/${req.file.filename}`);
        }
        
        query += ' WHERE id=?';
        params.push(req.params.id);
        
        await db.query(query, params);
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin kelola produk (Hapus)
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
