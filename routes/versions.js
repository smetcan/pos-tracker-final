// routes/versions.js
const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/versions', (req, res) => {
    const sql = `
        SELECT av.id, av.versionNumber, av.deliveryDate, av.status, av.prodOnayDate,
               av.bugIstekTarihcesi, av.ekler, v.name as vendorName, v.id as vendorId,
               GROUP_CONCAT(m.name, ', ') as models, GROUP_CONCAT(m.id, ', ') as modelIds 
        FROM AppVersion av
        JOIN Vendor v ON av.vendorId = v.id
        LEFT JOIN VersionModel vm ON av.id = vm.versionId
        LEFT JOIN Model m ON vm.modelId = m.id
        GROUP BY av.id ORDER BY av.deliveryDate DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

router.post('/versions', (req, res) => {
    const { versionNumber, deliveryDate, vendorId, modelIds, bugIstekTarihcesi, ekler } = req.body;
    if (!versionNumber || !deliveryDate || !vendorId || !modelIds || modelIds.length === 0) return res.status(400).json({ error: 'Versiyon numarası, teslim tarihi, vendor ve en az bir model seçimi zorunludur.' });
    
    const versionSql = 'INSERT INTO AppVersion (versionNumber, vendorId, deliveryDate, status, bugIstekTarihcesi, ekler) VALUES (?, ?, ?, "Test", ?, ?)';
    db.run(versionSql, [versionNumber, vendorId, deliveryDate, bugIstekTarihcesi || null, ekler || null], function(err) {
        if (err) return res.status(500).json({ error: "Ana versiyon kaydı sırasında hata." });
        const newVersionId = this.lastID;
        const promises = modelIds.map(modelId => {
            return new Promise((resolve, reject) => {
                db.run('INSERT INTO VersionModel (versionId, modelId) VALUES (?, ?)', [newVersionId, modelId], (err) => {
                    if (err) reject(err); else resolve();
                });
            });
        });
        Promise.all(promises)
            .then(() => res.status(201).json({ id: newVersionId }))
            .catch(err => res.status(500).json({ error: "Model bağlantıları kaydedilirken hata oluştu." }));
    });
});

router.put('/versions/:id', (req, res) => {
    const { id } = req.params;
    const { versionNumber, deliveryDate, status, prodOnayDate, modelIds, bugIstekTarihcesi, ekler } = req.body;
    if (!versionNumber || !deliveryDate || !status || !modelIds || modelIds.length === 0) return res.status(400).json({ error: 'Tüm alanların doldurulması ve en az bir model seçimi zorunludur.' });
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const updateSql = `UPDATE AppVersion SET versionNumber = ?, deliveryDate = ?, status = ?, prodOnayDate = ?, bugIstekTarihcesi = ?, ekler = ? WHERE id = ?`;
        db.run(updateSql, [versionNumber, deliveryDate, status, status === 'Prod' ? prodOnayDate : null, bugIstekTarihcesi || null, ekler || null, id]);
        db.run('DELETE FROM VersionModel WHERE versionId = ?', [id]);
        const insertPromises = modelIds.map(modelId => {
            return new Promise((resolve, reject) => {
                db.run('INSERT INTO VersionModel (versionId, modelId) VALUES (?, ?)', [id, modelId], (err) => {
                    if (err) reject(err); else resolve();
                });
            });
        });
        Promise.all(insertPromises)
            .then(() => {
                db.run('COMMIT');
                res.json({ message: "Versiyon başarıyla güncellendi." });
            })
            .catch(err => {
                db.run('ROLLBACK');
                res.status(500).json({ error: "Versiyon güncellenirken bir hata oluştu." });
            });
    });
});

router.delete('/versions/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM AppVersion WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ error: "Veritabanından versiyon silme sırasında hata." });
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek versiyon bulunamadı." });
        res.status(204).send();
    });
});

module.exports = router;