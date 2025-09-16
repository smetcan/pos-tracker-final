const express = require('express');
const db = require('../config/db');
const router = express.Router();

// Update only the 'notlar' field of a Bulgu
router.put('/bulgu/:id/notlar', (req, res) => {
    const { id } = req.params;
    const { notlar } = req.body || {};
    const sql = `UPDATE Bulgu SET notlar = ? WHERE id = ?`;
    db.run(sql, [notlar || null, id], function(err) {
        if (err) return res.status(500).json({ error: 'Notlar guncellenirken bir hata olustu.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Guncellenecek bulgu bulunamadi.' });
        res.json({ message: 'Notlar guncellendi.' });
    });
});

module.exports = router;

