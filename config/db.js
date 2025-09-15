const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './dev.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Veritabanına bağlanırken hata oluştu:", err.message);
    } else {
        console.log("Veritabanı bağlantısı başarılı.");
    }
});

function runMigrations() {
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
}

module.exports = db;