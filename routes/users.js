// routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const router = express.Router();

// '/api/users' -> '/users' oldu ve 'app' -> 'router' oldu
router.get('/users', (req, res) => {
    const sql = 'SELECT id, userName, name, surname, email FROM users ORDER BY name';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Kullanıcılar listelenirken bir hata oluştu.' });
        res.status(200).json(rows);
    });
});

// '/api/users' -> '/users' oldu ve 'app' -> 'router' oldu
router.post('/users', async (req, res) => {
    const { userName, name, surname, email, password } = req.body;
    if (!userName || !name || !surname || !password) return res.status(400).json({ error: 'Kullanıcı adı, isim, soyisim ve şifre zorunludur.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (userName, name, surname, email, password) VALUES (?, ?, ?, ?, ?)';
        db.run(sql, [String(userName).trim().toLowerCase(), name, surname, (email || '').trim() || null, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                   return res.status(409).json({ error: 'Bu kullanıcı adı veya e-posta zaten kullanımda.' });
                }
                return res.status(500).json({ error: 'Kullanıcı oluşturulurken bir veritabanı hatası oluştu.' });
            }
            res.status(201).json({ id: this.lastID, message: 'Kullanıcı başarıyla oluşturuldu.' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Şifre hashlenirken bir hata oluştu.' });
    }
});

// '/api/users/:id/password' -> '/users/:id/password' oldu ve 'app' -> 'router' oldu
router.put('/users/:id/password', async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const sql = 'UPDATE users SET password = ? WHERE id = ?';
        db.run(sql, [hashedPassword, id], function (err) {
            if (err) return res.status(500).json({ error: 'Şifre güncellenirken bir veritabanı hatası oluştu.' });
            if (this.changes === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
            res.status(200).json({ message: 'Kullanıcının şifresi başarıyla güncellendi.' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Şifre hashlenirken bir hata oluştu.' });
    }
});

// '/api/users/:id' -> '/users/:id' oldu ve 'app' -> 'router' oldu
router.delete('/users/:id', (req, res) => {
    const { id } = req.params;
    if (req.session.user.id == id) return res.status(403).json({ error: 'Kendi hesabınızı silemezsiniz.' });
    
    const sql = 'DELETE FROM users WHERE id = ?';
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ error: 'Kullanıcı silinirken bir hata oluştu.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Silinecek kullanıcı bulunamadı.' });
        res.status(200).json({ message: 'Kullanıcı başarıyla silindi.' });
    });
});

// Kullanıcı bilgilerini güncelle
router.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { userName, name, surname, email } = req.body;
    if (!userName || !name || !surname) return res.status(400).json({ error: 'Kullanıcı adı, isim ve soyisim zorunludur.' });

    const sql = 'UPDATE users SET userName = ?, name = ?, surname = ?, email = ? WHERE id = ?';
    db.run(sql, [String(userName).trim().toLowerCase(), name, surname, (email || '').trim() || null, id], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'Bu kullanıcı adı veya e-posta zaten kullanımda.' });
            }
            return res.status(500).json({ error: 'Kullanıcı güncellenirken bir veritabanı hatası oluştu.' });
        }
        if (this.changes === 0) return res.status(404).json({ error: 'Güncellenecek kullanıcı bulunamadı.' });
        res.status(200).json({ message: 'Kullanıcı bilgileri başarıyla güncellendi.' });
    });
});

// '/api/user/change-password' -> '/user/change-password' oldu ve 'app' -> 'router' oldu
router.post('/user/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.session.user.id;
    if (!oldPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mevcut ve yeni şifre (en az 6 karakter) zorunludur.' });

    const sqlSelect = 'SELECT password FROM users WHERE id = ?';
    db.get(sqlSelect, [userId], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası.' });
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(401).json({ error: 'Mevcut şifreniz yanlış.' });

        try {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            const sqlUpdate = 'UPDATE users SET password = ? WHERE id = ?';
            db.run(sqlUpdate, [hashedNewPassword, userId], function(updateErr) {
                if (updateErr) return res.status(500).json({ error: 'Şifre güncellenirken bir hata oluştu.' });
                res.status(200).json({ message: 'Şifreniz başarıyla güncellendi.' });
            });
        } catch (hashError) {
            res.status(500).json({ error: 'Yeni şifre oluşturulurken bir hata oluştu.' });
        }
    });
});

module.exports = router;
