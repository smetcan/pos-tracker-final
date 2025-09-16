// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const router = express.Router();

router.post('/login', (req, res) => {
    const rawUserName = req.body?.userName ?? '';
    const rawPassword = req.body?.password ?? '';
    const userName = String(rawUserName).trim();
    const password = String(rawPassword).trim();
    if (!userName || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' });

    const sql = 'SELECT * FROM users WHERE lower(userName) = ?';
    db.get(sql, [userName.toLowerCase()], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası.' });
        if (!user) return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            // Session fixation azaltma: oturumu yeniden oluştur
            req.session.regenerate((regenErr) => {
                if (regenErr) return res.status(500).json({ error: 'Oturum baslatilamadi.' });
                req.session.user = { id: user.id, userName: user.userName, name: user.name, surname: user.surname };
                req.session.save((err) => {
                    if (err) return res.status(500).json({ error: 'Oturum kaydedilirken bir hata olustu.' });
                    return res.status(200).json({ message: 'Giris basarili.', user: req.session.user });
                });
            });
            return;
            req.session.user = { id: user.id, userName: user.userName, name: user.name, surname: user.surname };
            
            // --- GÜNCELLEME: Session'ın kaydedildiğinden emin ol ---
            req.session.save((err) => {
                if (err) {
                    return res.status(500).json({ error: 'Oturum kaydedilirken bir hata oluştu.' });
                }
                res.status(200).json({ message: 'Giriş başarılı.', user: req.session.user });
            });

        } else {
            res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });
        }
    });
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Çıkış yapılamadı.' });
        res.clearCookie('connect.sid', { path: '/' });
        res.status(200).json({ message: 'Başarıyla çıkış yapıldı.' });
    });
});

router.get('/session-check', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ loggedIn: true, user: req.session.user });
    } else {
        res.status(200).json({ loggedIn: false });
    }
});

module.exports = router;
