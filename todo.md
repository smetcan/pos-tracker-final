# POS Takip Uygulaması - Geliştirme Görev Listesi

Bu dosya, uygulama için planlanan kozmetik iyileştirme ve kullanıcı yönetimi özelliklerine ait tüm görevleri içerir.

---

## Bölüm 1: Kozmetik İyileştirme Görevleri

Bu bölüm, uygulamadaki tüm modal pencereleri standart ve modern bir tasarıma kavuşturmak için kalan görevleri listeler.

### Tamamlananlar

- [x] **Bulgu Ekle/Düzenle** (`getBulguModalHTML`)
- [x] **Vendor Ekle/Düzenle** (`getVendorModalHTML`)
- [x] **Kişi Ekle/Düzenle** (`getContactSubModalHTML`)
- [x] **Model Ekle/Düzenle** (`getModelModalHTML`)
- [x] **Versiyon Ekle/Düzenle** (`getVersionModalHTML`)

### Yapılacaklar Listesi (To-Do)

#### Görüntüleme Pencereleri
Bu pencereler, kullanıcıya sadece bilgi göstermek amacıyla kullanılır. Yeni standart tasarıma (Başlık, İçerik, Alt Bilgi yapısı) güncellenmeleri gerekiyor.

- [ ] **Bulgu Görüntüleme Penceresi**
  - **Görev:** `getBulguViewModalHTML` fonksiyonunu yeni standart tasarıma uygun olarak güncelle.
  - **Dosya:** `script.js`

- [ ] **Versiyon Görüntüleme Penceresi**
  - **Görev:** `getVersionViewModalHTML` fonksiyonunu yeni standart tasarıma uygun olarak güncelle.
  - **Dosya:** `script.js`

- [ ] **İletişim Kişileri Penceresi**
  - **Görev:** `getVendorContactsModalHTML` fonksiyonunu yeni standart tasarıma uygun olarak güncelle. Bu pencere, vendor listesindeki "İletişim" butonuna basınca açılan salt okunur penceredir.
  - **Dosya:** `script.js`

#### Yardımcı Pencereler
Bu pencereler, belirli bir amaca hizmet eden daha küçük ve basit pencerelerdir.

- [ ] **İçeri Aktarma Penceresi**
  - **Görev:** `getBulguImportModalHTML` fonksiyonunu yeni standart tasarıma uygun olarak güncelle.
  - **Dosya:** `script.js`

- [ ] **Silme Onayı Penceresi**
  - **Görev:** `getDeleteConfirmModalHTML` fonksiyonunu daha modern ve standart tasarıma uygun bir görünüme kavuştur.
  - **Dosya:** `script.js`

- [ ] **Hata Mesajı Penceresi**
  - **Görev:** `showErrorModal` fonksiyonunu daha modern ve standart tasarıma uygun bir görünüme kavuştur.
  - **Dosya:** `script.js`

---

## Bölüm 2: Kullanıcı Yönetimi (Authentication) Görevleri

Bu bölüm, uygulamaya e-posta gerektirmeyen, kontrollü bir kullanıcı doğrulama ve yönetimi sistemi eklemek için gereken adımları listeler.

### Aşama 1: Backend (`server.js`) Hazırlıkları

- [ ] **Görev 1.1: Gerekli Kütüphaneleri Yükleme**
  - Projenin ana dizininde bir terminal aç ve aşağıdaki komutları çalıştır:
    ```powershell
    npm install express-session bcrypt
    ```

- [ ] **Görev 1.2: `users` Tablosunu Oluşturma**
  - `dev.db` veritabanında aşağıdaki SQL komutunu çalıştırarak `users` tablosunu oluştur:
    ```sql
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userName TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL
    );
    ```

- [ ] **Görev 1.3: `server.js` Dosyasına Kütüphaneleri Ekleme**
  - Dosyanın en başına aşağıdaki `require` ifadelerini ekle:
    ```javascript
    const session = require('express-session');
    const bcrypt = require('bcrypt');
    ```

- [ ] **Görev 1.4: Oturum (Session) Yönetimini Başlatma**
  - `app.use(express.json());` satırının hemen altına aşağıdaki "Session Middleware" bloğunu ekle:
    ```javascript
    app.use(session({
        secret: 'bu-cok-gizli-bir-anahtar-olmalı', // Bu anahtarı daha karmaşık bir şeyle değiştir
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 } // 1 günlük oturum
    }));
    ```

- [ ] **Görev 1.5: İlk Yönetici Kullanıcısını Oluşturma**
  - Sisteme giriş yapabilmek için veritabanına manuel olarak (veya geçici bir script ile) şifresi `bcrypt` ile hash'lenmiş bir yönetici kullanıcısı ekle.

- [ ] **Görev 1.6: API Endpoint'lerini Oluşturma**
  - `server.js` dosyasına aşağıdaki API endpoint'lerini sırasıyla ekle:
    - `POST /api/login` (Giriş Yapma)
    - `POST /api/logout` (Çıkış Yapma)
    - `GET /api/session-check` (Oturum Kontrolü)
    - `GET /api/users` (Tüm Kullanıcıları Listeleme)
    - `POST /api/users` (Yeni Kullanıcı Ekleme)
    - `PUT /api/users/:id/password` (Bir Kullanıcının Şifresini Sıfırlama)
    - `POST /api/user/change-password` (Giriş Yapan Kullanıcının Kendi Şifresini Değiştirmesi)
    - `DELETE /api/users/:id` (Kullanıcı Silme)

- [ ] **Görev 1.7: Mevcut API'ları Güvenli Hale Getirme**
  - `login` dışındaki tüm API endpoint'lerinin başına, kullanıcının giriş yapıp yapmadığını kontrol eden bir "middleware" fonksiyonu ekle.

### Aşama 2: Frontend (Arayüz) Değişiklikleri

- [ ] **Görev 2.1: Yeni HTML Dosyaları Oluşturma**
  - `public` klasöründe `login.html` ve `login.js` dosyalarını oluştur. `login.html` sadece kullanıcı adı ve şifre soran bir form içerecek.

- [ ] **Görev 2.2: Giriş Kontrolü Ekleme**
  - `script.js` dosyasının en başına, sayfa yüklendiğinde `/api/session-check`'e istek gönderen bir kod ekle. Başarılı bir oturum yoksa kullanıcıyı `login.html`'e yönlendir.

- [ ] **Görev 2.3: "Yönetim Paneli"ne Kullanıcılar Sekmesi Ekleme**
  - `getYonetimHTML` fonksiyonunu "Kullanıcılar" adında yeni bir sekme içerecek şekilde güncelle.
  - Bu sekmede, kullanıcıları listeleyen bir tablo, "Yeni Kullanıcı Ekle" butonu ve her satır için "Düzenle", "Şifre Sıfırla", "Sil" butonları olsun.

- [ ] **Görev 2.4: Yeni Modal Pencereleri Oluşturma**
  - `script.js` dosyasına "Yeni Kullanıcı Ekleme" ve "Kullanıcı Şifresi Sıfırlama" işlemleri için yeni modal HTML'i üreten ve olaylarını yöneten fonksiyonlar ekle.

- [ ] **Görev 2.5: Çıkış ve Kişisel Şifre Değiştirme Fonksiyonları**
  - `index.html`'e "Çıkış Yap" butonu ekle. Bu buton `/api/logout`'a istek göndermeli.
  - Uygulama arayüzüne, giriş yapmış kullanıcının kendi şifresini değiştirebileceği bir "Şifre Değiştir" butonu ve modalı ekle.