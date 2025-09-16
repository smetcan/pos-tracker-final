// routes/vendors.js
const express = require('express');
const db = require('../config/db');
const router = express.Router();

// --- VENDOR API'LARI ---

// DELETE öncesi kontrol: vendor'a bağlı model/versiyon var mı? Varsa engelle
router.use('/vendors/:id', (req, res, next) => {
    if (req.method !== 'DELETE') return next();
    const { id } = req.params;
    db.serialize(() => {
        db.get('SELECT COUNT(*) AS cnt FROM Model WHERE vendorId = ?', [id], (err1, row1) => {
            if (err1) return res.status(500).json({ error: 'Model bağlantıları kontrol edilirken hata.' });
            db.get('SELECT COUNT(*) AS cnt FROM AppVersion WHERE vendorId = ?', [id], (err2, row2) => {
                if (err2) return res.status(500).json({ error: 'Versiyon bağlantıları kontrol edilirken hata.' });
                const mc = row1?.cnt || 0; const vc = row2?.cnt || 0;
                if (mc > 0 || vc > 0) {
                    const parts = [];
                    if (mc > 0) parts.push(`${mc} model`);
                    if (vc > 0) parts.push(`${vc} versiyon`);
                    return res.status(409).json({ error: `Bu vendor'a bağlı ${parts.join(' ve ')} bulunduğu için silinemez.` });
                }
                next();
            });
        });
    });
});

router.get('/vendors', (req, res) => {
    const sql = `SELECT v.*, (SELECT COUNT(*) FROM VendorContact vc WHERE vc.vendorId = v.id) as contactCount FROM Vendor v ORDER BY v.name COLLATE NOCASE ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

router.post('/vendors', (req, res) => {
    const { name, makeCode } = req.body;
    if (!name || !makeCode || name.trim() === '' || makeCode.trim() === '') return res.status(400).json({ error: "Vendor adı ve kodu boş olamaz." });
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
    const sql = `INSERT INTO Vendor (name, makeCode, slug) VALUES (?, ?, ?)`;
    db.run(sql, [name.trim(), makeCode.trim(), slug], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "Bu vendor adı, kodu veya slug zaten mevcut." });
            return res.status(500).json({ error: "Veritabanına kayıt sırasında bir hata oluştu." });
        }
        res.status(201).json({ id: this.lastID, name: name.trim(), makeCode: makeCode.trim(), slug: slug });
    });
});

router.put('/vendors/:id', (req, res) => {
    const { id } = req.params;
    const { name, makeCode } = req.body;
    if (!name || !makeCode || name.trim() === '' || makeCode.trim() === '') return res.status(400).json({ error: "Vendor adı ve kodu boş olamaz." });
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
    const sql = `UPDATE Vendor SET name = ?, makeCode = ?, slug = ? WHERE id = ?`;
    db.run(sql, [name.trim(), makeCode.trim(), slug, id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "Bu vendor adı, kodu veya slug zaten mevcut." });
            return res.status(500).json({ error: "Veritabanı güncelleme sırasında hata." });
        }
        if (this.changes === 0) return res.status(404).json({ error: "Güncellenecek vendor bulunamadı." });
        res.json({ message: "Vendor başarıyla güncellendi." });
    });
});

router.delete('/vendors/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM Vendor WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) {
            if (err.message.includes('FOREIGN KEY constraint failed')) {
                return res.status(409).json({ error: "Bu vendor'a bağlı modeller veya versiyonlar olduğu için silinemez." });
            }
            return res.status(500).json({ error: "Veritabanından vendor silinirken bir hata oluştu." });
        }
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek vendor bulunamadı." });
        res.status(204).send();
    });
});

router.get('/vendors/slug/:slug', async (req, res) => {
    const { slug } = req.params;
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
    const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    });

    try {
        const vendor = await dbGet('SELECT * FROM Vendor WHERE slug = ?', [slug]);
        if (!vendor) return res.status(404).json({ error: 'Vendor bulunamadı.' });

        const statsQueries = [
            dbAll(`SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ?`, [vendor.id]),
            dbAll(`SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`, [vendor.id, 'Açık']),
            dbAll(`SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`, [vendor.id, 'Test Edilecek']),
            dbAll(`SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`, [vendor.id, 'Kapalı'])
        ];
        const [totalResult, openResult, testResult, closedResult] = await Promise.all(statsQueries);

        const bulgularSql = `
            SELECT b.*, v.name as vendorName, GROUP_CONCAT(m.name, ', ') as models,
                   GROUP_CONCAT(m.id, ', ') as modelIds, av.versionNumber as cozumVersiyon
            FROM Bulgu b
            LEFT JOIN Vendor v ON b.vendorId = v.id
            LEFT JOIN BulguModel bm ON b.id = bm.bulguId
            LEFT JOIN Model m ON bm.modelId = m.id
            LEFT JOIN AppVersion av ON b.cozumVersiyonId = av.id
            WHERE b.vendorId = ? GROUP BY b.id ORDER BY b.id DESC`;
        const bulgular = await dbAll(bulgularSql, [vendor.id]);

        res.json({
            vendor: vendor,
            stats: {
                total: totalResult[0].count,
                open: openResult[0].count,
                test: testResult[0].count,
                closed: closedResult[0].count
            },
            bulgular: bulgular
        });
    } catch (error) {
        console.error(`Vendor detayları alınırken hata (slug: ${slug}):`, error);
        res.status(500).json({ error: "Vendor detayları alınırken bir sunucu hatası oluştu." });
    }
});

router.get('/vendors/:id/stats', async (req, res) => {
    const { id } = req.params;
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });

    try {
        const queries = {
            total: 'SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ?',
            open: `SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`,
            test: `SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`,
            closed: `SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`,
        };
        const [totalResult, openResult, testResult, closedResult] = await Promise.all([
            dbAll(queries.total, [id]),
            dbAll(queries.open, [id, 'Açık']),
            dbAll(queries.test, [id, 'Test Edilecek']),
            dbAll(queries.closed, [id, 'Kapalı']),
        ]);
        res.json({
            total: totalResult[0].count,
            open: openResult[0].count,
            test: testResult[0].count,
            closed: closedResult[0].count,
        });
    } catch (error) {
        console.error(`Vendor ${id} istatistikleri alınırken hata:`, error);
        res.status(500).json({ error: "Vendor istatistikleri alınırken bir sunucu hatası oluştu." });
    }
});


// --- VENDOR CONTACT (İLETİŞİM KİŞİSİ) API'LARI ---

router.get('/vendors/:id/contacts', (req, res) => {
    const { id } = req.params;
    db.all('SELECT * FROM VendorContact WHERE vendorId = ? ORDER BY preferred DESC, name ASC', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/vendors/:id/contacts', (req, res) => {
    const { id: vendorId } = req.params;
    const { name, email, phone, preferred } = req.body;
    if (!name) return res.status(400).json({ error: 'İsim zorunludur.' });

    db.serialize(() => {
        if (preferred) {
            db.run('UPDATE VendorContact SET preferred = 0 WHERE vendorId = ?', [vendorId]);
        }
        const sql = 'INSERT INTO VendorContact (vendorId, name, email, phone, preferred) VALUES (?, ?, ?, ?, ?)';
        db.run(sql, [vendorId, name, email, phone, !!preferred], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        });
    });
});

router.put('/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone, preferred } = req.body;
    if (!name) return res.status(400).json({ error: 'İsim zorunludur.' });

    db.serialize(() => {
        if (preferred) {
            db.get('SELECT vendorId FROM VendorContact WHERE id = ?', [id], (err, row) => {
                if (err || !row) return res.status(500).json({ error: 'İletişim bilgisi bulunamadı veya veritabanı hatası.' });
                const vendorId = row.vendorId;
                db.run('UPDATE VendorContact SET preferred = 0 WHERE vendorId = ? AND id != ?', [vendorId, id], (err) => {
                    if (err) return res.status(500).json({ error: 'Birincil kişi güncellenirken hata.' });
                    const sql = 'UPDATE VendorContact SET name = ?, email = ?, phone = ?, preferred = ? WHERE id = ?';
                    db.run(sql, [name, email, phone, !!preferred, id], function(err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'İletişim bilgisi güncellendi.' });
                    });
                });
            });
        } else {
            const sql = 'UPDATE VendorContact SET name = ?, email = ?, phone = ?, preferred = ? WHERE id = ?';
            db.run(sql, [name, email, phone, !!preferred, id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'İletişim bilgisi güncellendi.' });
            });
        }
    });
});

router.delete('/contacts/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM VendorContact WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'İletişim bilgisi bulunamadı.' });
        res.status(204).send();
    });
});

module.exports = router;
