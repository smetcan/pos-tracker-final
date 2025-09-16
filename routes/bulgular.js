const express = require('express');
const db = require('../config/db');
const router = express.Router();

// --- YARDIMCI FONKSİYON: Geçmiş kaydı oluşturur ---
function normalizeTR(text) {
    if (!text || typeof text !== 'string') return text;
    const map = new Map([
        ['Ç','�'], ['Ö','�'], ['Ü','�'],
        ['ç','�'], ['ö','�'], ['ü','�'],
        ['ş','�'], ['�z','�'],
        ['ı','�'], ['İ','�'],
        ['ğ','�'], ['�z','�']
    ]);
    let out = text;
    for (const [bad, good] of map.entries()) out = out.split(bad).join(good);
    return out;
}

function logHistory(bulguId, req, action, details = '') {
    return new Promise((resolve, reject) => {
        const userId = req.session.user.id;
        const userName = req.session.user.userName;
        const sql = `INSERT INTO history (bulguId, userId, userName, action, details, timestamp) VALUES (?, ?, ?, ?, ?, datetime('now','localtime'))`;
        db.run(sql, [bulguId, userId, userName, normalizeTR(action), normalizeTR(details)], function(err) {
            if (err) {
                console.error('History log error:', err);
                return reject(err);
            }
            resolve(this);
        });
    });
}

// --- YENİ API: Bir bulgunun geçmişini getirir ---
// --- YENİ API: Bir bulgunun geçmişini getirir ---
router.get('/bulgu/:id/history', (req, res) => {
    const { id } = req.params;
    const sql = `SELECT * FROM history WHERE bulguId = ? ORDER BY timestamp DESC`;
    db.all(sql, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Geçmiş verileri alınırken bir hata oluştu." });
        }
        res.json(rows);
    });
});

router.get('/bulgular', (req, res) => {
    const { vendorId, status, tip, searchTerm, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let params = [];
    let countParams = [];

    let sql = `
        SELECT b.*, v.name as vendorName, GROUP_CONCAT(DISTINCT m.name) as models,
               GROUP_CONCAT(DISTINCT m.id) as modelIds, av.versionNumber as cozumVersiyon
        FROM Bulgu b
        LEFT JOIN Vendor v ON b.vendorId = v.id
        LEFT JOIN BulguModel bm ON b.id = bm.bulguId
        LEFT JOIN Model m ON bm.modelId = m.id
        LEFT JOIN AppVersion av ON b.cozumVersiyonId = av.id`;
    
    let countSql = `SELECT COUNT(DISTINCT b.id) as count FROM Bulgu b `;

    let whereClauses = [];
    if (vendorId && vendorId !== 'all') {
        whereClauses.push(`b.vendorId = ?`);
        params.push(vendorId);
        countParams.push(vendorId);
    }
    if (status && status !== 'all') {
        whereClauses.push(`b.status = ?`);
        params.push(status);
        countParams.push(status);
    }
    if (tip && tip !== 'all') {
        whereClauses.push(`b.bulguTipi = ?`);
        params.push(tip);
        countParams.push(tip);
    }
    if (searchTerm) {
        whereClauses.push(`(b.baslik LIKE ? OR b.detayliAciklama LIKE ?)`);
        const searchTermLike = `%${searchTerm}%`;
        params.push(searchTermLike, searchTermLike);
        countParams.push(searchTermLike, searchTermLike);
    }

    if (whereClauses.length > 0) {
        const whereString = ` WHERE ` + whereClauses.join(' AND ');
        sql += whereString;
        countSql += whereString;
    }
    
    sql += ` GROUP BY b.id ORDER BY b.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ "error": `Bulgu verileri alınırken hata: ${err.message}` });

        db.get(countSql, countParams, (countErr, countRow) => {
            if (countErr) return res.status(500).json({ "error": `Bulgu sayısı alınırken hata: ${countErr.message}` });

            const totalRecords = countRow.count;
            const totalPages = Math.ceil(totalRecords / limit);

            res.json({
                data: rows,
                pagination: {
                    currentPage: Number(page),
                    totalPages: totalPages,
                    totalRecords: totalRecords,
                    limit: Number(limit)
                }
            });
        });
    });
});

router.post('/bulgular', (req, res) => {
    const { baslik, modelIds, cozumVersiyonId, bulguTipi, etkiSeviyesi, tespitTarihi, detayliAciklama, notlar, girenKullanici, vendorTrackerNo, vendorId } = req.body;
    if (!baslik || !bulguTipi || !etkiSeviyesi || !tespitTarihi || !vendorId) return res.status(400).json({ error: 'Başlık, Vendor, Bulgu Tipi, Etki Seviyesi ve Tespit Tarihi zorunlu alanlardır.' });
    
    const bulguSql = `INSERT INTO Bulgu (baslik, bulguTipi, etkiSeviyesi, tespitTarihi, detayliAciklama, girenKullanici, vendorTrackerNo, cozumVersiyonId, status, vendorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Açık', ?)`;
    const bulguParams = [baslik, bulguTipi, etkiSeviyesi, tespitTarihi, detayliAciklama, girenKullanici, vendorTrackerNo, cozumVersiyonId ? Number(cozumVersiyonId) : null, vendorId];
    
    db.run(bulguSql, bulguParams, function(err) {
        if (err) return res.status(500).json({ error: "Ana bulgu kaydı sırasında hata." });
        const newBulguId = this.lastID;
        const promises = modelIds.map(modelId => {
            return new Promise((resolve, reject) => {
                db.run('INSERT INTO BulguModel (bulguId, modelId) VALUES (?, ?)', [newBulguId, modelId], (err) => {
                    if (err) reject(err); else resolve();
                });
            });
        });
        Promise.all(promises)
            .then(() => res.status(201).json({ id: newBulguId }))
            .catch(err => res.status(500).json({ error: "Bulgu-Model bağlantıları kaydedilirken hata oluştu." }));
    });
});

router.put('/bulgular/:id', async (req, res) => {
    const { id } = req.params;
    const newData = req.body;

    try {
        // 1. Mevcut veriyi al
        const oldBulgu = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM Bulgu WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!oldBulgu) return res.status(404).json({ error: "Güncellenecek bulgu bulunamadı." });

        // 2. Veritabanı işlemini başlat
        await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', err => err ? reject(err) : resolve()));

        // 3. Ana Bulgu tablosunu güncelle
        const bulguSql = `
            UPDATE Bulgu SET baslik = ?, bulguTipi = ?, etkiSeviyesi = ?, tespitTarihi = ?, status = ?,
                detayliAciklama = ?, girenKullanici = ?, vendorTrackerNo = ?,
                cozumOnaylayanKullanici = ?, cozumOnayTarihi = ?, cozumVersiyonId = ?, vendorId = ?,
                cozumOnayAciklamasi = ?
            WHERE id = ?`;
        const bulguParams = [newData.baslik, newData.bulguTipi, newData.etkiSeviyesi, newData.tespitTarihi, newData.status, newData.detayliAciklama, newData.girenKullanici, newData.vendorTrackerNo, newData.cozumOnaylayanKullanici, newData.cozumOnayTarihi, newData.cozumVersiyonId ? Number(newData.cozumVersiyonId) : null, newData.vendorId, newData.cozumOnayAciklamasi || null, id];
        await new Promise((resolve, reject) => db.run(bulguSql, bulguParams, err => err ? reject(err) : resolve()));

        // 4. Değişiklikleri kontrol et ve geçmişe logla
        if (oldBulgu.status !== newData.status) {
            await logHistory(id, req, 'Durum Değiştirildi', `Durum '${oldBulgu.status}' iken '${newData.status}' olarak değiştirildi.`);
        }
        if (oldBulgu.baslik !== newData.baslik) {
            await logHistory(id, req, 'Alan Güncellendi', `Başlık değiştirildi.`);
        }
        // Diğer alanlar için kontroller buraya eklenebilir

        // 5. Model bağlantılarını güncelle
        await new Promise((resolve, reject) => db.run('DELETE FROM BulguModel WHERE bulguId = ?', [id], err => err ? reject(err) : resolve()));
        if (newData.modelIds && newData.modelIds.length > 0) {
            const insertPromises = newData.modelIds.map(modelId => {
                return new Promise((resolve, reject) => {
                    db.run('INSERT INTO BulguModel (bulguId, modelId) VALUES (?, ?)', [id, modelId], (err) => err ? reject(err) : resolve());
                });
            });
            await Promise.all(insertPromises);
        }

        // 6. İşlemi onayla
        await new Promise((resolve, reject) => db.run('COMMIT', err => err ? reject(err) : resolve()));
        res.json({ message: "Bulgu başarıyla güncellendi." });

    } catch (error) {
        // Hata durumunda işlemi geri al
        await new Promise((resolve, reject) => db.run('ROLLBACK', err => err ? reject(err) : resolve()));
        res.status(500).json({ error: "Bulgu güncellenirken bir hata oluştu: " + error.message });
    }
});

router.delete('/bulgular/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM Bulgu WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ error: "Veritabanından bulgu silme sırasında hata." });
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek bulgu bulunamadı." });
        res.status(204).send();
    });
});

router.post('/bulgular/import', async (req, res) => {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) return res.status(400).json({ error: 'İçeri aktarılacak kayıt bulunamadı.' });

    const dbAll = (sql, params) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
    const dbRun = (sql, params) => new Promise((resolve, reject) => {
        db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
    });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
        const vendors = await dbAll('SELECT id, name FROM Vendor', []);
        const models = await dbAll('SELECT id, name, vendorId FROM Model', []);
        const versions = await dbAll('SELECT id, versionNumber, vendorId FROM AppVersion', []);
        const vendorsMap = new Map(vendors.map(v => [v.name.toLowerCase(), v.id]));
        const modelsMap = new Map(models.map(m => [m.name.toLowerCase(), m]));
        const versionsMap = new Map(versions.map(v => [`${v.vendorId}-${v.versionNumber.toLowerCase()}`, v.id]));

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowIndex = i + 1;

            try {
                const requiredFields = ['Baslik', 'Vendor', 'Bulgu Tipi', 'Etki Seviyesi', 'Tespit Tarihi', 'Giren Kisi'];
                for (const field of requiredFields) {
                    if (!record[field] || String(record[field]).trim() === '') throw new Error(`Zorunlu alan eksik: ${field}`);
                }

                let vendorId = vendorsMap.get(String(record.Vendor).toLowerCase());
                if (!vendorId) {
                    const vendorName = String(record.Vendor).trim();
                    const slug = vendorName.toLowerCase().replace(/\s+/g, '-');
                    const newVendorResult = await dbRun('INSERT INTO Vendor (name, makeCode, slug) VALUES (?, ?, ?)', [vendorName, '-', slug]);
                    vendorId = newVendorResult.lastID;
                    vendorsMap.set(vendorName.toLowerCase(), vendorId);
                }

                const modelNames = String(record['Etkilenen Modeller'] || '').split(',').map(name => name.trim()).filter(Boolean);
                const modelIds = [];
                if (modelNames.length > 0) {
                    for (const modelName of modelNames) {
                        let model = modelsMap.get(modelName.toLowerCase());
                        if (!model) {
                            const newModelResult = await dbRun('INSERT INTO Model (name, code, vendorId) VALUES (?, ?, ?)', [modelName, '-', vendorId]);
                            model = { id: newModelResult.lastID, vendorId: vendorId };
                            modelsMap.set(modelName.toLowerCase(), model);
                        }
                        modelIds.push(model.id);
                    }
                }

                let cozumVersiyonId = null;
                const cozumVersiyonNumber = record['Cozum Beklenen Versiyon'];
                if (cozumVersiyonNumber) {
                    const versionKey = `${vendorId}-${String(cozumVersiyonNumber).toLowerCase()}`;
                    cozumVersiyonId = versionsMap.get(versionKey) || null;
                }
                
                await dbRun('BEGIN TRANSACTION');
                
                const bulguSql = `
                    INSERT INTO Bulgu (baslik, bulguTipi, etkiSeviyesi, tespitTarihi, detayliAciklama, girenKullanici, vendorTrackerNo, status, cozumOnaylayanKullanici, cozumOnayTarihi, vendorId, cozumVersiyonId)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const status = record.Durum || 'Açık';
                const bulguParams = [
                    record.Baslik, record['Bulgu Tipi'], record['Etki Seviyesi'], record['Tespit Tarihi'],
                    record['Detayli Aciklama'] || null, record['Giren Kisi'], record['Vendor Takip No'] || null,
                    status, record['Cozum Onaylayan Kisi'] || null, record['Cozum Onay Tarihi'] || null,
                    vendorId, cozumVersiyonId
                ];

                const result = await dbRun(bulguSql, bulguParams);
                const newBulguId = result.lastID;

                for (const modelId of modelIds) {
                    await dbRun('INSERT INTO BulguModel (bulguId, modelId) VALUES (?, ?)', [newBulguId, modelId]);
                }

                await dbRun('COMMIT');
                successCount++;
            } catch (err) {
                await dbRun('ROLLBACK').catch(() => {});
                errorCount++;
                errors.push({ rowIndex, error: err.message });
            }
        }
        res.status(200).json({ successCount, errorCount, errors });
    } catch (dbError) {
        console.error("Import sırasında genel veritabanı hatası:", dbError);
        res.status(500).json({ error: "Veri içeri aktarılırken beklenmedik bir sunucu hatası oluştu." });
    }
});

module.exports = router;



