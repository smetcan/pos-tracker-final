// Güvenlik Middleware'i: Bir kullanıcının giriş yapıp yapmadığını kontrol eder
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Bu işlem için yetkiniz yok. Lütfen giriş yapın.' });
    }
};

module.exports = { isAuthenticated };