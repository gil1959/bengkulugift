const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'cat_' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// GET all categories
router.get('/', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST - Add category (with optional image)
router.post('/', auth, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        const [result] = await db.query('INSERT INTO categories (name, icon) VALUES (?, ?)', [name, image]);
        res.status(201).json({ id: result.insertId, name, icon: image });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT - Update category
router.put('/:id', auth, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        let query = 'UPDATE categories SET name = ?';
        let params = [name];
        if (req.file) {
            query += ', icon = ?';
            params.push(`/uploads/${req.file.filename}`);
        }
        query += ' WHERE id = ?';
        params.push(req.params.id);
        await db.query(query, params);
        res.json({ message: 'Category updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE category
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
