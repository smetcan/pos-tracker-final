// =================================================================
// 1. KÜTÜPHANELERİ VE DEĞİŞKENLERİ İÇE AKTARMA
// =================================================================
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/db'); // Veritabanı modülü

// Route (Yönlendirme) Modülleri
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const vendorRoutes = require('./routes/vendors');
const modelRoutes = require('./routes/models');
const versionRoutes = require('./routes/versions');
const bulguRoutes = require('./routes/bulgular');
const notlarRoutes = require('./routes/notlar');
const attachmentRoutes = require('./routes/attachments');
const dashboardRoutes = require('./routes/dashboard');
const functionsRoutes = require('./routes/functions');

// Middleware
const { isAuthenticated } = require('./middleware/auth');

// =================================================================
// 2. UYGULAMA KURULUMU VE MIDDLEWARE'LER
// =================================================================
const app = express();
const PORT = 3000;

// JSON ve Form verilerini işlemek için middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware
app.use(session({
    secret: 'kfnncquZlZ4C7wd9Vm6WJ76H3vGwWpJY', // Bu anahtarı daha güvenli bir yerden okumak iyi bir pratiktir
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // HTTPS kullanılıyorsa 'true' yapın
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 gün
    }
}));

// Statik Dosya Klasörleri
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =================================================================
// 3. API YÖNLENDİRMELERİ (ROUTING)
// =================================================================

// Herkese açık auth (giriş/çıkış) endpoint'leri
app.use('/api', authRoutes);

// Güvenli (giriş yapmayı gerektiren) endpoint'ler
app.use('/api', isAuthenticated); // Bu satırdan sonraki tüm /api istekleri kontrol edilecek
app.use('/api', userRoutes);
app.use('/api', vendorRoutes);
app.use('/api', modelRoutes);
app.use('/api', versionRoutes);
app.use('/api', bulguRoutes);
app.use('/api', notlarRoutes);
app.use('/api', attachmentRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', functionsRoutes);

// Ana Sayfa Yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =================================================================
// 4. SUNUCUYU BAŞLATMA
// =================================================================
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
