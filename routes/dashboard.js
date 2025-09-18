const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/dashboard', async (req, res) => {
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });

    try {
        const queries = {
            totalBulgular: 'SELECT COUNT(*) as count FROM Bulgu',
            openBulgular: `SELECT COUNT(*) as count FROM Bulgu WHERE status = ?`,
            testBulgular: `SELECT COUNT(*) as count FROM Bulgu WHERE status = ?`,
            closedBulgular: `SELECT COUNT(*) as count FROM Bulgu WHERE status = ?`,
            sonBulgular: `SELECT b.id, b.baslik, b.status, v.name as vendorName, b.bulguTipi FROM Bulgu b LEFT JOIN Vendor v ON b.vendorId = v.id ORDER BY b.id DESC LIMIT 5`,
            openBulguByVendor: `SELECT v.name, COUNT(b.id) as count FROM Vendor v JOIN Bulgu b ON v.id = b.vendorId WHERE b.status = ? GROUP BY v.name ORDER BY count DESC`,
            statusDistribution: `SELECT status, COUNT(*) as count FROM Bulgu GROUP BY status`,
            bulguByVendor: `SELECT v.name, COUNT(b.id) as count FROM Vendor v JOIN Bulgu b ON v.id = b.vendorId GROUP BY v.name ORDER BY count DESC`,
            typeTotals: `SELECT bulguTipi as type, COUNT(*) as count FROM Bulgu GROUP BY bulguTipi`,
            vendorByType: `SELECT v.name as vendorName, b.bulguTipi as type, COUNT(b.id) as count FROM Vendor v JOIN Bulgu b ON v.id = b.vendorId GROUP BY v.name, b.bulguTipi`,
            statusByType: `SELECT b.bulguTipi as type, b.status as status, COUNT(b.id) as count FROM Bulgu b GROUP BY b.bulguTipi, b.status`
        };

        const [
            totalBulgular,
            openBulgular,
            testBulgular,
            closedBulgular,
            sonBulgular,
            openBulguByVendor,
            statusDistribution,
            bulguByVendor,
            typeTotals,
            vendorByType,
            statusByType
        ] = await Promise.all([
            dbAll(queries.totalBulgular),
            dbAll(queries.openBulgular, ['Açık']),
            dbAll(queries.testBulgular, ['Test Edilecek']),
            dbAll(queries.closedBulgular, ['Kapalı']),
            dbAll(queries.sonBulgular),
            dbAll(queries.openBulguByVendor, ['Açık']),
            dbAll(queries.statusDistribution),
            dbAll(queries.bulguByVendor),
            dbAll(queries.typeTotals),
            dbAll(queries.vendorByType),
            dbAll(queries.statusByType)
        ]);

        res.json({
            totalBulgular: totalBulgular[0].count,
            openBulgular: openBulgular[0].count,
            testBulgular: testBulgular[0].count,
            closedBulgular: closedBulgular[0].count,
            sonBulgular: sonBulgular,
            openBulguByVendor: openBulguByVendor,
            statusDistribution: statusDistribution,
            bulguByVendor: bulguByVendor,
            breakdown: {
                byType: typeTotals,
                vendorByType: vendorByType,
                statusByType: statusByType
            }
        });

    } catch (error) {
        console.error("Dashboard verileri alınırken hata:", error);
        res.status(500).json({ error: "Dashboard verileri alınırken bir sunucu hatası oluştu." });
    }
});

module.exports = router;
