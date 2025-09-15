// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const router = express.Router();

router.post('/login', (req, res) => {
    const { userName, password } = req.body;
    if (!userName || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' });

    const sql = 'SELECT * FROM users WHERE userName = ?';
    db.get(sql, [userName], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası.' });
        if (!user) return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = { id: user.id, userName: user.userName, name: user.name, surname: user.surname };
            res.status(200).json({ message: 'Giriş başarılı.', user: req.session.user });
        } else {
            res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });
        }
    });
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Çıkış yapılamadı.' });
        res.clearCookie('connect.sid');
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