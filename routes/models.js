// routes/models.js
const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/models', (req, res) => {
    const sql = `SELECT m.*, v.name as vendorName FROM Model m JOIN Vendor v ON m.vendorId = v.id ORDER BY v.name, m.name`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

router.post('/models', (req, res) => {
    const { name, code, vendorId, isTechpos, isAndroidPos, isOkcPos } = req.body;
    if (!name || !code || !vendorId) return res.status(400).json({ error: "Model adı, kodu ve vendor ID zorunludur." });
    
    const sql = `INSERT INTO Model (name, code, vendorId, isTechpos, isAndroidPos, isOkcPos) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [name, code, vendorId, !!isTechpos, !!isAndroidPos, !!isOkcPos], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "Bu model adı veya kodu zaten mevcut." });
            return res.status(500).json({ error: "Veritabanına kayıt sırasında bir hata oluştu." });
        }
        res.status(201).json({ id: this.lastID });
    });
});

router.put('/models/:id', (req, res) => {
    const { id } = req.params;
    const { name, code, vendorId, isTechpos, isAndroidPos, isOkcPos } = req.body;
    if (!name || !code || !vendorId) return res.status(400).json({ error: "Model adı, kodu ve vendor ID zorunludur." });
    
    const sql = `UPDATE Model SET name = ?, code = ?, vendorId = ?, isTechpos = ?, isAndroidPos = ?, isOkcPos = ? WHERE id = ?`;
    db.run(sql, [name, code, vendorId, !!isTechpos, !!isAndroidPos, !!isOkcPos, id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "Bu model adı veya kodu zaten mevcut." });
            return res.status(500).json({ error: "Veritabanı güncelleme sırasında hata." });
        }
        if (this.changes === 0) return res.status(404).json({ error: "Güncellenecek model bulunamadı." });
        res.json({ message: "Model başarıyla güncellendi." });
    });
});

router.delete('/models/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM Model WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) {
            if (err.message.includes('FOREIGN KEY constraint failed')) return res.status(409).json({ error: "Bu model bir veya daha fazla versiyonla ilişkili olduğu için silinemez." });
            return res.status(500).json({ error: "Veritabanından model silme sırasında hata." });
        }
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek model bulunamadı." });
        res.status(204).send();
    });
});

module.exports = router;