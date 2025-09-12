// Gerekli kütüphaneleri import ediyoruz
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Express uygulamasını başlatıyoruz
const app = express();
const PORT = 3000;
const DB_PATH = './dev.db';

// Veritabanı bağlantısını oluşturuyoruz
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Veritabanına bağlanırken hata oluştu:", err.message);
    } else {
        console.log("Veritabanı bağlantısı başarılı.");
    }
});

// Lightweight migration: ensure AppVersion has columns for bugIstekTarihcesi and ekler
db.serialize(() => {
    db.all("PRAGMA table_info('AppVersion')", [], (err, rows) => {
        if (err) return console.error('PRAGMA table_info error', err);
        const cols = rows.map(r => r.name);
        if (!cols.includes('bugIstekTarihcesi')) {
            db.run("ALTER TABLE AppVersion ADD COLUMN bugIstekTarihcesi TEXT", (err) => { if (err) console.error('ALTER TABLE add bugIstekTarihcesi failed', err); else console.log('Added column bugIstekTarihcesi to AppVersion'); });
        }
        if (!cols.includes('ekler')) {
            db.run("ALTER TABLE AppVersion ADD COLUMN ekler TEXT", (err) => { if (err) console.error('ALTER TABLE add ekler failed', err); else console.log('Added column ekler to AppVersion'); });
        }
    });

    // Add vendorId to Bulgu table for direct association
    db.all("PRAGMA table_info('Bulgu')", [], (err, rows) => {
        if (err) return console.error('PRAGMA table_info for Bulgu error', err);
        const cols = rows.map(r => r.name);
        if (!cols.includes('vendorId')) {
            db.run("ALTER TABLE Bulgu ADD COLUMN vendorId INTEGER REFERENCES Vendor(id)", (err) => { 
                if (err) console.error('ALTER TABLE Bulgu ADD vendorId failed', err); 
                else console.log('Added column vendorId to Bulgu'); 
            });
        }
    });
});

// JSON ve Form verilerini işlemek için middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// --- API ENDPOINTS ---

// --- Vendor Detail Page API ---
app.get('/api/vendors/slug/:slug', async (req, res) => {
    const { slug } = req.params;
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
    const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    });

    try {
        // 1. Find vendor by slug
        const vendor = await dbGet('SELECT * FROM Vendor WHERE slug = ?', [slug]);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor bulunamadı.' });
        }

        // 2. Get stats for this vendor
        const statsQueries = [
            dbAll(`SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ?`, [vendor.id]),
            dbAll(`SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`, [vendor.id, 'Açık']),
            dbAll(`SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`, [vendor.id, 'Test Edilecek']),
            dbAll(`SELECT COUNT(*) as count FROM Bulgu WHERE vendorId = ? AND status = ?`, [vendor.id, 'Kapalı'])
        ];
        const [totalResult, openResult, testResult, closedResult] = await Promise.all(statsQueries);

        // 3. Get all findings for this vendor
        const bulgularSql = `
            SELECT
                b.*,
                v.name as vendorName,
                GROUP_CONCAT(m.name, ', ') as models,
                GROUP_CONCAT(m.id, ', ') as modelIds,
                av.versionNumber as cozumVersiyon
            FROM Bulgu b
            LEFT JOIN Vendor v ON b.vendorId = v.id
            LEFT JOIN BulguModel bm ON b.id = bm.bulguId
            LEFT JOIN Model m ON bm.modelId = m.id
            LEFT JOIN AppVersion av ON b.cozumVersiyonId = av.id
            WHERE b.vendorId = ?
            GROUP BY b.id
            ORDER BY b.id DESC
        `;
        const bulgular = await dbAll(bulgularSql, [vendor.id]);

        // 4. Combine and send response
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

// --- Vendor Stats API ---
app.get('/api/vendors/:id/stats', async (req, res) => {
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

// --- Vendor API'ları ---
app.get('/api/vendors', (req, res) => {
    const sql = `SELECT v.*, (SELECT COUNT(*) FROM VendorContact vc WHERE vc.vendorId = v.id) as contactCount FROM Vendor v ORDER BY v.id ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});
app.post('/api/vendors', (req, res) => {
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
app.put('/api/vendors/:id', (req, res) => {
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

app.delete('/api/vendors/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM Vendor WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) {
            if (err.message.includes('FOREIGN KEY constraint failed')) {
                return res.status(409).json({ error: "Bu vendor'a bağlı modeller veya versiyonlar olduğu için silinemez." });
            }
            return res.status(500).json({ error: "Veritabanından vendor silinirken bir hata oluştu." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Silinecek vendor bulunamadı." });
        }
        res.status(204).send(); // No content
    });
});
app.post('/api/versions', (req, res) => {
    const { versionNumber, deliveryDate, vendorId, modelIds, bugIstekTarihcesi, ekler } = req.body;
    if (!versionNumber || !deliveryDate || !vendorId || !modelIds || modelIds.length === 0) {
        return res.status(400).json({ error: 'Versiyon numarası, teslim tarihi, vendor ve en az bir model seçimi zorunludur.' });
    }
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
app.put('/api/versions/:id', (req, res) => {
    const { id } = req.params;
    const { versionNumber, deliveryDate, status, prodOnayDate, modelIds, bugIstekTarihcesi, ekler } = req.body;
    if (!versionNumber || !deliveryDate || !status || !modelIds || modelIds.length === 0) {
        return res.status(400).json({ error: 'Tüm alanların doldurulması ve en az bir model seçimi zorunludur.' });
    }
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
app.delete('/api/versions/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM AppVersion WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).json({ error: "Veritabanından versiyon silme sırasında hata." });
        }
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek versiyon bulunamadı." });
        res.status(204).send();
    });
});


// --- Model API'ları ---
app.get('/api/models', (req, res) => {
    const sql = `
        SELECT m.*, v.name as vendorName 
        FROM Model m 
        JOIN Vendor v ON m.vendorId = v.id 
        ORDER BY v.name, m.name
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/models', (req, res) => {
    const { name, code, vendorId, isTechpos, isAndroidPos, isOkcPos } = req.body;
    if (!name || !code || !vendorId) {
        return res.status(400).json({ error: "Model adı, kodu ve vendor ID zorunludur." });
    }
    const sql = `INSERT INTO Model (name, code, vendorId, isTechpos, isAndroidPos, isOkcPos) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [name, code, vendorId, !!isTechpos, !!isAndroidPos, !!isOkcPos], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "Bu model adı veya kodu zaten mevcut." });
            return res.status(500).json({ error: "Veritabanına kayıt sırasında bir hata oluştu." });
        }
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/models/:id', (req, res) => {
    const { id } = req.params;
    const { name, code, vendorId, isTechpos, isAndroidPos, isOkcPos } = req.body;
    if (!name || !code || !vendorId) {
        return res.status(400).json({ error: "Model adı, kodu ve vendor ID zorunludur." });
    }
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

app.delete('/api/models/:id', (req, res) => {
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


// --- Versiyon API'ları ---
app.get('/api/versions', (req, res) => {
    const sql = `
        SELECT 
            av.id, 
            av.versionNumber, 
            av.deliveryDate, 
            av.status, 
            av.prodOnayDate,
            av.bugIstekTarihcesi,
            av.ekler,
            v.name as vendorName,
            v.id as vendorId,
            GROUP_CONCAT(m.name, ', ') as models,
            GROUP_CONCAT(m.id, ', ') as modelIds 
        FROM AppVersion av
        JOIN Vendor v ON av.vendorId = v.id
        LEFT JOIN VersionModel vm ON av.id = vm.versionId
        LEFT JOIN Model m ON vm.modelId = m.id
        GROUP BY av.id
        ORDER BY av.deliveryDate DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

// --- Vendor Contact API'ları ---
app.get('/api/vendors/:id/contacts', (req, res) => {
    const { id } = req.params;
    db.all('SELECT * FROM VendorContact WHERE vendorId = ? ORDER BY preferred DESC, name ASC', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/vendors/:id/contacts', (req, res) => {
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

app.put('/api/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone, preferred, vendorId } = req.body;
     if (!name) return res.status(400).json({ error: 'İsim zorunludur.' });

    db.serialize(() => {
        if (preferred) {
            // Get vendorId for this contact first
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

app.delete('/api/contacts/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM VendorContact WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'İletişim bilgisi bulunamadı.' });
        res.status(204).send();
    });
});

// --- Dashboard API ---
app.get('/api/dashboard', async (req, res) => {
    // Helper to run DB queries with promises
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });

    try {
        const queries = {
            totalBulgular: 'SELECT COUNT(*) as count FROM Bulgu',
            openBulgular: `SELECT COUNT(*) as count FROM Bulgu WHERE status = ?`,
            testBulgular: `SELECT COUNT(*) as count FROM Bulgu WHERE status = ?`,
            closedBulgular: `SELECT COUNT(*) as count FROM Bulgu WHERE status = ?`,
            sonBulgular: `
                SELECT b.id, b.baslik, b.status, v.name as vendorName
                FROM Bulgu b
                LEFT JOIN Vendor v ON b.vendorId = v.id
                ORDER BY b.id DESC
                LIMIT 5`,
            openBulguByVendor: `
                SELECT v.name, COUNT(b.id) as count
                FROM Vendor v
                JOIN Bulgu b ON v.id = b.vendorId
                WHERE b.status = ?
                GROUP BY v.name
                ORDER BY count DESC`,
            statusDistribution: `
                SELECT status, COUNT(*) as count
                FROM Bulgu
                GROUP BY status`,
            bulguByVendor: `
                SELECT v.name, COUNT(b.id) as count
                FROM Vendor v
                JOIN Bulgu b ON v.id = b.vendorId
                GROUP BY v.name
                ORDER BY count DESC`
        };

        const [totalBulgular, openBulgular, testBulgular, closedBulgular, sonBulgular, openBulguByVendor, statusDistribution, bulguByVendor] = await Promise.all([
            dbAll(queries.totalBulgular),
            dbAll(queries.openBulgular, ['Açık']),
            dbAll(queries.testBulgular, ['Test Edilecek']),
            dbAll(queries.closedBulgular, ['Kapalı']),
            dbAll(queries.sonBulgular),
            dbAll(queries.openBulguByVendor, ['Açık']),
            dbAll(queries.statusDistribution),
            dbAll(queries.bulguByVendor)
        ]);

        res.json({
            totalBulgular: totalBulgular[0].count,
            openBulgular: openBulgular[0].count,
            testBulgular: testBulgular[0].count,
            closedBulgular: closedBulgular[0].count,
            sonBulgular: sonBulgular,
            openBulguByVendor: openBulguByVendor,
            statusDistribution: statusDistribution,
            bulguByVendor: bulguByVendor
        });

    } catch (error) {
        console.error("Dashboard verileri alınırken hata:", error);
        res.status(500).json({ error: "Dashboard verileri alınırken bir sunucu hatası oluştu." });
    }
});


// --- Bulgu API'ları ---

app.get('/api/bulgular', (req, res) => {
    const { vendorId } = req.query;
    let sql = `
        SELECT
            b.*,
            v.name as vendorName,
            GROUP_CONCAT(m.name, ', ') as models,
            GROUP_CONCAT(m.id, ', ') as modelIds,
            av.versionNumber as cozumVersiyon
        FROM Bulgu b
        LEFT JOIN Vendor v ON b.vendorId = v.id
        LEFT JOIN BulguModel bm ON b.id = bm.bulguId
        LEFT JOIN Model m ON bm.modelId = m.id
        LEFT JOIN AppVersion av ON b.cozumVersiyonId = av.id
    `;
    const params = [];
    
    if (vendorId) {
        sql += ` WHERE b.vendorId = ?`;
        params.push(vendorId);
    }
    
    sql += `
        GROUP BY b.id
        ORDER BY b.id DESC
    `;
    
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});
app.post('/api/bulgular', (req, res) => {
    const { baslik, modelIds, cozumVersiyonId, bulguTipi, etkiSeviyesi, tespitTarihi, detayliAciklama, girenKullanici, vendorTrackerNo, vendorId } = req.body;
    if (!baslik || !bulguTipi || !etkiSeviyesi || !tespitTarihi || !vendorId) {
        return res.status(400).json({ error: 'Başlık, Vendor, Bulgu Tipi, Etki Seviyesi ve Tespit Tarihi zorunlu alanlardır.' });
    }
    const bulguSql = `
        INSERT INTO Bulgu (baslik, bulguTipi, etkiSeviyesi, tespitTarihi, detayliAciklama, girenKullanici, vendorTrackerNo, cozumVersiyonId, status, vendorId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Açık', ?)`;
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
app.put('/api/bulgular/:id', (req, res) => {
    const { id } = req.params;
    const { baslik, modelIds, cozumVersiyonId, bulguTipi, etkiSeviyesi, tespitTarihi, status, detayliAciklama, girenKullanici, vendorTrackerNo, cozumOnaylayanKullanici, cozumOnayTarihi, vendorId } = req.body;
    if (!baslik || !bulguTipi || !etkiSeviyesi || !tespitTarihi || !status || !vendorId) {
        return res.status(400).json({ error: 'Gerekli alanlar boş bırakılamaz.' });
    }
    db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
                return res.status(500).json({ error: "Transaction başlatılamadı." });
            }
            
            const bulguSql = `
                UPDATE Bulgu SET 
                    baslik = ?, bulguTipi = ?, etkiSeviyesi = ?, tespitTarihi = ?, status = ?,
                    detayliAciklama = ?, girenKullanici = ?, vendorTrackerNo = ?,
                    cozumOnaylayanKullanici = ?, cozumOnayTarihi = ?, cozumVersiyonId = ?, vendorId = ?
                WHERE id = ?`;
            const bulguParams = [baslik, bulguTipi, etkiSeviyesi, tespitTarihi, status, detayliAciklama, girenKullanici, vendorTrackerNo, cozumOnaylayanKullanici, cozumOnayTarihi, cozumVersiyonId ? Number(cozumVersiyonId) : null, vendorId, id];
            
            db.run(bulguSql, bulguParams, function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: "Bulgu güncellenirken hata oluştu." });
                }
                
                db.run('DELETE FROM BulguModel WHERE bulguId = ?', [id], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: "Model bağlantıları silinirken hata oluştu." });
                    }
                    
                    if (!modelIds || modelIds.length === 0) {
                        db.run('COMMIT', (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: "Transaction commit edilemedi." });
                            }
                            res.json({ message: "Bulgu başarıyla güncellendi." });
                        });
                        return;
                    }
                    
                    const promises = modelIds.map(modelId => {
                        return new Promise((resolve, reject) => {
                            db.run('INSERT INTO BulguModel (bulguId, modelId) VALUES (?, ?)', [id, modelId], (err) => {
                                if (err) reject(err); else resolve();
                            });
                        });
                    });
                    
                    Promise.all(promises)
                        .then(() => {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: "Transaction commit edilemedi." });
                                }
                                res.json({ message: "Bulgu başarıyla güncellendi." });
                            });
                        })
                        .catch(err => {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: "Model bağlantıları eklenirken hata oluştu." });
                        });
                });
            });
        });
    });
});
app.delete('/api/bulgular/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM Bulgu WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ error: "Veritabanından bulgu silme sırasında hata." });
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek bulgu bulunamadı." });
        res.status(204).send();
    });
});

app.post('/api/bulgular/import', async (req, res) => {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'İçeri aktarılacak kayıt bulunamadı.' });
    }

    // Helper to run DB queries with promises
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
        // Cache vendors and models for efficient lookup
        const vendors = await dbAll('SELECT id, name FROM Vendor', []);
        const models = await dbAll('SELECT id, name, vendorId FROM Model', []);
        const versions = await dbAll('SELECT id, versionNumber, vendorId FROM AppVersion', []);
        const vendorsMap = new Map(vendors.map(v => [v.name.toLowerCase(), v.id]));
        const modelsMap = new Map(models.map(m => [m.name.toLowerCase(), m]));
        const versionsMap = new Map(versions.map(v => [`${v.vendorId}-${v.versionNumber.toLowerCase()}`, v.id]));

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowIndex = i + 1; // 1-based index for user feedback

            try {
                // --- VALIDATION ---
                const requiredFields = ['Baslik', 'Vendor', 'Bulgu Tipi', 'Etki Seviyesi', 'Tespit Tarihi', 'Giren Kisi'];
                for (const field of requiredFields) {
                    if (!record[field] || String(record[field]).trim() === '') {
                        throw new Error(`Zorunlu alan eksik: ${field}`);
                    }
                }

                // --- DATA TRANSFORMATION & LOOKUP (with find-or-create) ---
                let vendorId = vendorsMap.get(String(record.Vendor).toLowerCase());
                if (!vendorId) {
                    const vendorName = String(record.Vendor).trim();
                    const slug = vendorName.toLowerCase().replace(/\s+/g, '-');
                    // Vendor kodu CSV'de olmadığı için boş bırakıyoruz veya bir standart belirliyoruz.
                    const newVendorResult = await dbRun('INSERT INTO Vendor (name, makeCode, slug) VALUES (?, ?, ?)', [vendorName, '-', slug]);
                    vendorId = newVendorResult.lastID;
                    vendorsMap.set(vendorName.toLowerCase(), vendorId); // Update map for next iterations
                }

                const modelNames = String(record['Etkilenen Modeller'] || '').split(',').map(name => name.trim()).filter(Boolean);
                const modelIds = [];
                if (modelNames.length > 0) {
                    for (const modelName of modelNames) {
                        let model = modelsMap.get(modelName.toLowerCase());
                        if (!model) {
                            const newModelResult = await dbRun('INSERT INTO Model (name, code, vendorId) VALUES (?, ?, ?)', [modelName, '-', vendorId]);
                            const newModelId = newModelResult.lastID;
                            model = { id: newModelId, vendorId: vendorId }; // Create a representation for the map
                            modelsMap.set(modelName.toLowerCase(), model); // Update map
                        }
                        modelIds.push(model.id);
                    }
                }

                let cozumVersiyonId = null;
                const cozumVersiyonNumber = record['Cozum Beklenen Versiyon'];
                if (cozumVersiyonNumber) {
                    const versionKey = `${vendorId}-${String(cozumVersiyonNumber).toLowerCase()}`;
                    cozumVersiyonId = versionsMap.get(versionKey) || null; // Do not throw error if not found
                }
                
                // --- DATABASE INSERTION (within a transaction per record) ---
                await dbRun('BEGIN TRANSACTION');
                
                const bulguSql = `
                    INSERT INTO Bulgu (baslik, bulguTipi, etkiSeviyesi, tespitTarihi, detayliAciklama, girenKullanici, vendorTrackerNo, status, cozumOnaylayanKullanici, cozumOnayTarihi, vendorId, cozumVersiyonId)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const status = record.Durum || 'Açık';
                const bulguParams = [
                    record.Baslik,
                    record['Bulgu Tipi'],
                    record['Etki Seviyesi'],
                    record['Tespit Tarihi'],
                    record['Detayli Aciklama'] || null,
                    record['Giren Kisi'],
                    record['Vendor Takip No'] || null,
                    status,
                    record['Cozum Onaylayan Kisi'] || null,
                    record['Cozum Onay Tarihi'] || null,
                    vendorId,
                    cozumVersiyonId
                ];

                const result = await dbRun(bulguSql, bulguParams);
                const newBulguId = result.lastID;

                for (const modelId of modelIds) {
                    await dbRun('INSERT INTO BulguModel (bulguId, modelId) VALUES (?, ?)', [newBulguId, modelId]);
                }

                await dbRun('COMMIT');
                successCount++;

            } catch (err) {
                await dbRun('ROLLBACK').catch(() => {}); // Rollback on error, ignore rollback error
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


// 'public' klasöründeki statik dosyaları sun
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res, path, stat) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    },
}));

// --- Sunucuyu Başlatma ---
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});

