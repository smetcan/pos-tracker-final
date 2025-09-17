const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './dev.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("VeritabanÄ±na baÄŸlanÄ±rken hata oluÅŸtu:", err.message);
    } else {
        console.log("VeritabanÄ± baÄŸlantÄ±sÄ± baÅŸarÄ±lÄ±.");
    }
});

function runMigrations() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS Functions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        )`, (err) => {
            if (err) console.error('CREATE TABLE Functions failed', err);
            else console.log('Ensured Functions table');
        });

        db.run(`CREATE TABLE IF NOT EXISTS FunctionSupport (\n            functionId INTEGER NOT NULL,\n            versionId INTEGER NOT NULL,\n            modelIds TEXT,
            PRIMARY KEY (functionId, versionId),
            FOREIGN KEY (functionId) REFERENCES Functions(id) ON DELETE CASCADE,
            FOREIGN KEY (versionId) REFERENCES AppVersion(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error('CREATE TABLE FunctionSupport failed', err);
            else console.log('Ensured FunctionSupport table');
        });

        db.all("PRAGMA table_info('FunctionSupport')", [], (err, rows) => {
            if (err) return console.error('PRAGMA table_info for FunctionSupport error', err);
            const cols = rows.map(r => r.name);
            if (!cols.includes('modelIds')) {
                db.run("ALTER TABLE FunctionSupport ADD COLUMN modelIds TEXT", (alterErr) => {
                    if (alterErr) console.error('ALTER TABLE FunctionSupport ADD modelIds failed', alterErr);
                    else console.log('Added column modelIds to FunctionSupport');
                });
            }
        });

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
            if (!cols.includes('cozumOnayAciklamasi')) {
                db.run("ALTER TABLE Bulgu ADD COLUMN cozumOnayAciklamasi TEXT", (err) => {
                    if (err) console.error('ALTER TABLE Bulgu ADD cozumOnayAciklamasi failed', err);
                    else console.log('Added column cozumOnayAciklamasi to Bulgu');
                });
            }
            if (!cols.includes('notlar')) {
                db.run("ALTER TABLE Bulgu ADD COLUMN notlar TEXT", (err) => {
                    if (err) console.error('ALTER TABLE Bulgu ADD notlar failed', err);
                    else console.log('Added column notlar to Bulgu');
                });
            }
        });

        // Ensure unique indexes (attempt creation; if fails, log true duplicates)
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_makecode_unique ON Vendor(makeCode)", (e2) => {
            if (e2) {
                console.error('Create unique index on Vendor(makeCode) failed, checking duplicates...', e2.message || e2);
                db.all("SELECT makeCode, COUNT(*) AS cnt FROM Vendor WHERE makeCode IS NOT NULL AND TRIM(makeCode) != '' GROUP BY makeCode HAVING COUNT(*) > 1", [], (e3, dups) => {
                    if (e3) return console.error('Vendor duplicate check failed', e3);
                    if (Array.isArray(dups) && dups.length > 0) console.warn('Vendor.makeCode duplicates:', dups.map(d => `${d.makeCode} (x${d.cnt})`));
                });
            } else {
                console.log('Ensured unique index on Vendor(makeCode)');
            }
        });

        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_model_code_unique ON Model(code)", (e2) => {
            if (e2) {
                console.error('Create unique index on Model(code) failed, checking duplicates...', e2.message || e2);
                db.all("SELECT code, COUNT(*) AS cnt FROM Model WHERE code IS NOT NULL AND TRIM(code) != '' GROUP BY code HAVING COUNT(*) > 1", [], (e3, dups) => {
                    if (e3) return console.error('Model duplicate check failed', e3);
                    if (Array.isArray(dups) && dups.length > 0) console.warn('Model.code duplicates:', dups.map(d => `${d.code} (x${d.cnt})`));
                });
            } else {
                console.log('Ensured unique index on Model(code)');
            }
        });
    });
}

module.exports = db;
// run migrations at startup
try { runMigrations(); } catch (e) { console.error('Migrations failed', e); }

