const express = require('express');
const multer = require('multer');
const fs = require('fs');
const db = require('../config/db');
const router = express.Router();

// --- YARDIMCI FONKSİYON: Geçmiş kaydı oluşturur (bulgular.js'den kopyalanabilir veya ortak bir dosyaya alınabilir) ---
function normalizeTR(text) {
    if (!text || typeof text !== 'string') return text;
    const map = new Map([
        ['Ã‡','Ç'], ['Ã–','Ö'], ['Ãœ','Ü'],
        ['Ã§','ç'], ['Ã¶','ö'], ['Ã¼','ü'],
        ['ÅŸ','ş'], ['Åž','Ş'],
        ['Ä±','ı'], ['Ä°','İ'],
        ['ÄŸ','ğ'], ['Äž','Ğ']
    ]);
    let out = text;
    for (const [bad, good] of map.entries()) out = out.split(bad).join(good);
    return out;
}

async function logHistory(bulguId, req, action, details = '') {
    const userId = req.session.user.id;
    const userName = req.session.user.userName;
    const sql = `INSERT INTO history (bulguId, userId, userName, action, details, timestamp) VALUES (?, ?, ?, ?, ?, datetime('now','localtime'))`;
    db.run(sql, [bulguId, userId, userName, normalizeTR(action), normalizeTR(details)]);
}

// Dosya Yükleme (Multer) Ayarları
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = 'uploads/';
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniquePrefix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- EKLENTİ (ATTACHMENT) API'LARI ---
router.get('/bulgu/:id/attachments', (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM attachments WHERE bulguId = ?";
    db.all(sql, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: "Ekler listelenirken bir veritabanı hatası oluştu." });
        res.json(rows);
    });
});

router.post('/bulgu/:id/attachments', upload.array('attachments', 5), (req, res) => {
    const { id: bulguId } = req.params;
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Yüklenecek dosya seçilmedi.' });

    const sql = `INSERT INTO attachments (bulguId, originalName, fileName, filePath, fileSize, mimeType) VALUES (?, ?, ?, ?, ?, ?)`;
    const insertPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
            const params = [bulguId, file.originalname, file.filename, file.path, file.size, file.mimetype];
            db.run(sql, params, function(err) {
                if (err) {
                    fs.unlink(file.path, (unlinkErr) => {
                        if (unlinkErr) console.error("Dosya silinirken hata:", unlinkErr);
                    });
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...file });
                }
            });
        });
    });

    Promise.all(insertPromises)
        .then(insertedFiles => res.status(201).json({ message: 'Dosyalar başarıyla yüklendi.', files: insertedFiles }))
        .catch(err => res.status(500).json({ error: 'Dosyalar veritabanına kaydedilirken bir hata oluştu.' }));
});

router.delete('/attachments/:id', (req, res) => {
    const { id } = req.params;
    const selectSql = "SELECT * FROM attachments WHERE id = ?";
    db.get(selectSql, [id], (err, row) => {
        if (err) return res.status(500).json({ error: "Veritabanı hatası." });
        if (!row) return res.status(404).json({ error: 'Silinecek ek bulunamadı.' });

        fs.unlink(row.filePath, (unlinkErr) => {
            if (unlinkErr) console.warn(`Dosya sisteminden silinemedi (belki zaten yok): ${row.filePath}`);
            const deleteSql = "DELETE FROM attachments WHERE id = ?";
            db.run(deleteSql, [id], function(deleteErr) {
                if (deleteErr) return res.status(500).json({ error: 'Ek veritabanından silinirken bir hata oluştu.' });
                res.status(200).json({ message: 'Ek başarıyla silindi.' });
            });
        });
    });
});

module.exports = router;
