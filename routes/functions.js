const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Helper utilities to work with sqlite callbacks using promises
const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
    });
});
const allAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
    });
});
const getAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
    });
});

// -----------------------------------------------------------------
// Function CRUD endpoints
// -----------------------------------------------------------------
router.get('/functions', async (req, res) => {
    try {
        const rows = await allAsync('SELECT id, name, description FROM Functions ORDER BY name COLLATE NOCASE ASC');
        res.json(rows);
    } catch (error) {
        console.error('Functions list error:', error);
        res.status(500).json({ error: 'Fonksiyonlar listelenirken bir hata oluştu.' });
    }
});

router.post('/functions', async (req, res) => {
    const { name, description } = req.body || {};
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Fonksiyon adı zorunludur.' });
    }

    const trimmedName = name.trim();
    const trimmedDescription = description && description.trim() !== '' ? description.trim() : null;

    try {
        const result = await runAsync('INSERT INTO Functions (name, description) VALUES (?, ?)', [trimmedName, trimmedDescription]);
        res.status(201).json({ id: result.lastID, name: trimmedName, description: trimmedDescription });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Bu fonksiyon adı zaten kayıtlı.' });
        }
        console.error('Function create error:', error);
        res.status(500).json({ error: 'Fonksiyon oluşturulurken bir hata oluştu.' });
    }
});

router.put('/functions/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Fonksiyon adı zorunludur.' });
    }

    const trimmedName = name.trim();
    const trimmedDescription = description && description.trim() !== '' ? description.trim() : null;

    try {
        const result = await runAsync('UPDATE Functions SET name = ?, description = ? WHERE id = ?', [trimmedName, trimmedDescription, id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Güncellenecek fonksiyon bulunamadı.' });
        }
        res.json({ message: 'Fonksiyon güncellendi.' });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Bu fonksiyon adı zaten kayıtlı.' });
        }
        console.error('Function update error:', error);
        res.status(500).json({ error: 'Fonksiyon güncellenirken bir hata oluştu.' });
    }
});

router.delete('/functions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await runAsync('DELETE FROM Functions WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Silinecek fonksiyon bulunamadı.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Function delete error:', error);
        res.status(500).json({ error: 'Fonksiyon silinirken bir hata oluştu.' });
    }
});

// -----------------------------------------------------------------
// Support management endpoints
// -----------------------------------------------------------------
router.get('/functions/:id/support', async (req, res) => {
    const { id } = req.params;
    try {
        const func = await getAsync('SELECT id FROM Functions WHERE id = ?', [id]);
        if (!func) {
            return res.status(404).json({ error: 'Fonksiyon bulunamadı.' });
        }
        const rows = await allAsync('SELECT versionId FROM FunctionSupport WHERE functionId = ? ORDER BY versionId ASC', [id]);
        res.json(rows.map(r => r.versionId));
    } catch (error) {
        console.error('Function support fetch error:', error);
        res.status(500).json({ error: 'Fonksiyon desteği alınırken bir hata oluştu.' });
    }
});

router.put('/functions/:id/support', async (req, res) => {
    const { id } = req.params;
    let incoming = [];
    if (Array.isArray(req.body)) incoming = req.body;
    else if (Array.isArray(req.body?.versions)) incoming = req.body.versions;
    else if (Array.isArray(req.body?.versionIds)) incoming = req.body.versionIds;
    if (!Array.isArray(incoming)) {
        return res.status(400).json({ error: 'G?nderilen g?vde ge?erli bir liste olmal?d?r.' });
    }

    const versionEntries = new Map();
    try {
        incoming.forEach(item => {
            if (item === null || item === undefined) return;
            let versionId;
            let modelIds = [];
            if (typeof item === 'object') {
                versionId = Number(item.versionId ?? item.id);
                if (Array.isArray(item.modelIds)) {
                    modelIds = [...new Set(item.modelIds.map(Number).filter(Number.isInteger))];
                }
            } else {
                versionId = Number(item);
            }
            if (!Number.isInteger(versionId)) {
                throw new Error('invalid');
            }
            versionEntries.set(versionId, modelIds);
        });
    } catch (err) {
        return res.status(400).json({ error: 'Version listesi format? ge?ersiz.' });
    }

    const versionIds = Array.from(versionEntries.keys());

    try {
        const func = await getAsync('SELECT id FROM Functions WHERE id = ?', [id]);
        if (!func) {
            return res.status(404).json({ error: 'Fonksiyon bulunamad?.' });
        }

        if (versionIds.length > 0) {
            const placeholders = versionIds.map(() => '?').join(',');
            const rows = await allAsync(`SELECT id FROM AppVersion WHERE id IN (${placeholders})`, versionIds);
            if (rows.length !== versionIds.length) {
                return res.status(400).json({ error: 'Ge?ersiz versionId de?erleri g?nderildi.' });
            }
        }

        await runAsync('BEGIN TRANSACTION');
        try {
            await runAsync('DELETE FROM FunctionSupport WHERE functionId = ?', [id]);
            for (const [versionId, modelIds] of versionEntries.entries()) {
                const jsonModels = modelIds && modelIds.length > 0 ? JSON.stringify(modelIds) : null;
                await runAsync('INSERT INTO FunctionSupport (functionId, versionId, modelIds) VALUES (?, ?, ?)', [id, versionId, jsonModels]);
            }
            await runAsync('COMMIT');
            res.json({ message: 'Fonksiyon deste?i g?ncellendi.', versions: Array.from(versionEntries.entries()).map(([versionId, modelIds]) => ({ versionId, modelIds })) });
        } catch (innerError) {
            await runAsync('ROLLBACK').catch(() => {});
            if (innerError.message && innerError.message.includes('FOREIGN KEY constraint failed')) {
                return res.status(400).json({ error: 'Version listesi g?ncellenirken foreign key hatas? olu?tu.' });
            }
            console.error('Function support update error:', innerError);
            res.status(500).json({ error: 'Fonksiyon deste?i g?ncellenirken bir hata olu?tu.' });
        }
    } catch (error) {
        console.error('Function support transaction error:', error);
        res.status(500).json({ error: 'Fonksiyon deste?i g?ncellenirken bir hata olu?tu.' });
    }
});


// -----------------------------------------------------------------
// Reporting endpoints
// -----------------------------------------------------------------
router.get('/function-support/tree', async (req, res) => {
    try {
        const functions = await allAsync('SELECT id, name, description FROM Functions ORDER BY name COLLATE NOCASE ASC');
        const supportRows = await allAsync(`
            SELECT f.id AS functionId, f.name AS functionName, f.description AS functionDescription,
                   v.id AS vendorId, v.name AS vendorName,
                   m.id AS modelId, m.name AS modelName,
                   av.id AS versionId, av.versionNumber, av.status, av.deliveryDate, av.prodOnayDate
            FROM FunctionSupport fs
            JOIN Functions f ON fs.functionId = f.id
            JOIN AppVersion av ON fs.versionId = av.id
            JOIN Vendor v ON av.vendorId = v.id
            LEFT JOIN VersionModel vm ON av.id = vm.versionId
            LEFT JOIN Model m ON vm.modelId = m.id
            ORDER BY f.name COLLATE NOCASE ASC,
                     v.name COLLATE NOCASE ASC,
                     m.name COLLATE NOCASE ASC,
                     av.versionNumber COLLATE NOCASE ASC
        `);

        const functionMap = new Map(functions.map(fn => [fn.id, { ...fn, vendors: [], _vendorMap: new Map() }]));

        for (const row of supportRows) {
            const fnEntry = functionMap.get(row.functionId);
            if (!fnEntry) continue;

            let vendorEntry = fnEntry._vendorMap.get(row.vendorId);
            if (!vendorEntry) {
                vendorEntry = { id: row.vendorId, name: row.vendorName, models: [], _modelMap: new Map() };
                fnEntry._vendorMap.set(row.vendorId, vendorEntry);
            }

            const modelKey = row.modelId ?? `__no_model__${row.versionId}`;
            let modelEntry = vendorEntry._modelMap.get(modelKey);
            if (!modelEntry) {
                modelEntry = {
                    id: row.modelId,
                    name: row.modelName || 'Model belirtilmemiş',
                    versions: []
                };
                vendorEntry._modelMap.set(modelKey, modelEntry);
            }

            if (!modelEntry.versions.some(v => v.id === row.versionId)) {
                modelEntry.versions.push({
                    id: row.versionId,
                    versionNumber: row.versionNumber,
                    status: row.status,
                    deliveryDate: row.deliveryDate,
                    prodOnayDate: row.prodOnayDate
                });
            }
        }

        const result = functions.map(fn => {
            const entry = functionMap.get(fn.id);
            if (!entry) return { ...fn, vendors: [] };
            const vendors = Array.from(entry._vendorMap.values()).map(vendor => {
                const models = Array.from(vendor._modelMap.values()).map(model => ({
                    ...model,
                    versions: model.versions.sort((a, b) => {
                        if (a.versionNumber && b.versionNumber) {
                            return a.versionNumber.localeCompare(b.versionNumber, 'tr', { numeric: true });
                        }
                        return (a.versionNumber || '').localeCompare(b.versionNumber || '');
                    })
                }));
                return {
                    id: vendor.id,
                    name: vendor.name,
                    models: models.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
                };
            });
            return {
                id: entry.id,
                name: entry.name,
                description: entry.description,
                vendors: vendors.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Function support tree error:', error);
        res.status(500).json({ error: 'Fonksiyon destek ağacı hazırlanırken bir hata oluştu.' });
    }
});

router.get('/function-support/matrix', async (req, res) => {
    try {
        const functions = await allAsync('SELECT id, name, description FROM Functions ORDER BY name COLLATE NOCASE ASC');
        const combinations = await allAsync(`
            SELECT DISTINCT av.id AS versionId, av.versionNumber, av.status, av.deliveryDate, av.prodOnayDate,
                            v.id AS vendorId, v.name AS vendorName,
                            m.id AS modelId, m.name AS modelName
            FROM FunctionSupport fs
            JOIN AppVersion av ON fs.versionId = av.id
            JOIN Vendor v ON av.vendorId = v.id
            LEFT JOIN VersionModel vm ON av.id = vm.versionId
            LEFT JOIN Model m ON vm.modelId = m.id
            ORDER BY v.name COLLATE NOCASE ASC,
                     m.name COLLATE NOCASE ASC,
                     av.versionNumber COLLATE NOCASE ASC
        `);

        const supportRows = await allAsync('SELECT functionId, versionId FROM FunctionSupport');
        const supportMap = new Map();
        for (const row of supportRows) {
            if (!supportMap.has(row.versionId)) supportMap.set(row.versionId, new Set());
            supportMap.get(row.versionId).add(row.functionId);
        }

        const matrixRows = combinations.map(combo => {
            const supportedFunctions = supportMap.get(combo.versionId) || new Set();
            const cells = functions.map(fn => supportedFunctions.has(fn.id));
            return {
                vendorId: combo.vendorId,
                vendorName: combo.vendorName,
                modelId: combo.modelId,
                modelName: combo.modelName || 'Model belirtilmemiş',
                versionId: combo.versionId,
                versionNumber: combo.versionNumber,
                status: combo.status,
                deliveryDate: combo.deliveryDate,
                prodOnayDate: combo.prodOnayDate,
                cells
            };
        });

        res.json({ columns: functions, rows: matrixRows });
    } catch (error) {
        console.error('Function support matrix error:', error);
        res.status(500).json({ error: 'Fonksiyon destek matrisi hazırlanırken bir hata oluştu.' });
    }
});

module.exports = router;

