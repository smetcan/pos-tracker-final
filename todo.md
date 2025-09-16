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
- [x] **Bulgu Görüntüleme Penceresi**
- [x] **Versiyon Görüntüleme Penceresi**
- [x] **İletişim Kişileri Penceresi**
- [x] **İçeri Aktarma Penceresi**
- [x] **Silme Onayı Penceresi**
- [x] **Hata Mesajı Penceresi**


## Bölüm 2: Kullanıcı Yönetimi (Authentication) Görevleri

Bu bölüm, uygulamaya e-posta gerektirmeyen, kontrollü bir kullanıcı doğrulama ve yönetimi sistemi eklemek için gereken adımları listeler.

### Aşama 1: Backend (`server.js`) Hazırlıkları

- [x] **Görev 1.1: Gerekli Kütüphaneleri Yükleme**
  - Projenin ana dizininde bir terminal aç ve aşağıdaki komutları çalıştır:
    ```powershell
    npm install express-session bcrypt
    ```

- [x] **Görev 1.2: `users` Tablosunu Oluşturma**
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

- [x] **Görev 1.3: `server.js` Dosyasına Kütüphaneleri Ekleme**
  - Dosyanın en başına aşağıdaki `require` ifadelerini ekle:
    ```javascript
    const session = require('express-session');
    const bcrypt = require('bcrypt');
    ```

- [x] **Görev 1.4: Oturum (Session) Yönetimini Başlatma**
  - `app.use(express.json());` satırının hemen altına aşağıdaki "Session Middleware" bloğunu ekle:
    ```javascript
    app.use(session({
        secret: 'bu-cok-gizli-bir-anahtar-olmalı', // Bu anahtarı daha karmaşık bir şeyle değiştir
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 } // 1 günlük oturum
    }));
    ```

- [x] **Görev 1.5: İlk Yönetici Kullanıcısını Oluşturma**
  - Sisteme giriş yapabilmek için veritabanına manuel olarak (veya geçici bir script ile) şifresi `bcrypt` ile hash'lenmiş bir yönetici kullanıcısı ekle.

- [x] **Görev 1.6: API Endpoint'lerini Oluşturma**
  - `server.js` dosyasına aşağıdaki API endpoint'lerini sırasıyla ekle:
    - `POST /api/login` (Giriş Yapma)
    - `POST /api/logout` (Çıkış Yapma)
    - `GET /api/session-check` (Oturum Kontrolü)
    - `GET /api/users` (Tüm Kullanıcıları Listeleme)
    - `POST /api/users` (Yeni Kullanıcı Ekleme)
    - `PUT /api/users/:id/password` (Bir Kullanıcının Şifresini Sıfırlama)
    - `POST /api/user/change-password` (Giriş Yapan Kullanıcının Kendi Şifresini Değiştirmesi)
    - `DELETE /api/users/:id` (Kullanıcı Silme)

- [x] **Görev 1.7: Mevcut API'ları Güvenli Hale Getirme**
  - `login` dışındaki tüm API endpoint'lerinin başına, kullanıcının giriş yapıp yapmadığını kontrol eden bir "middleware" fonksiyonu ekle.

### Aşama 2: Frontend (Arayüz) Değişiklikleri

- [x] **Görev 2.1: Yeni HTML Dosyaları Oluşturma**
  - `public` klasöründe `login.html` ve `login.js` dosyalarını oluştur. `login.html` sadece kullanıcı adı ve şifre soran bir form içerecek.

- [x] **Görev 2.2: Giriş Kontrolü Ekleme**
  - `script.js` dosyasının en başına, sayfa yüklendiğinde `/api/session-check`'e istek gönderen bir kod ekle. Başarılı bir oturum yoksa kullanıcıyı `login.html`'e yönlendir.

- [x] **Görev 2.3: "Yönetim Paneli"ne Kullanıcılar Sekmesi Ekleme**
  - `getYonetimHTML` fonksiyonunu "Kullanıcılar" adında yeni bir sekme içerecek şekilde güncelle.
  - Bu sekmede, kullanıcıları listeleyen bir tablo, "Yeni Kullanıcı Ekle" butonu ve her satır için "Düzenle", "Şifre Sıfırla", "Sil" butonları olsun.

- [x] **Görev 2.4: Yeni Modal Pencereleri Oluşturma**
  - `script.js` dosyasına "Yeni Kullanıcı Ekleme" ve "Kullanıcı Şifresi Sıfırlama" işlemleri için yeni modal HTML'i üreten ve olaylarını yöneten fonksiyonlar ekle.

- [x] **Görev 2.5: Çıkış ve Kişisel Şifre Değiştirme Fonksiyonları**
  - `index.html`'e "Çıkış Yap" butonu ekle. Bu buton `/api/logout`'a istek göndermeli.
  - Uygulama arayüzüne, giriş yapmış kullanıcının kendi şifresini değiştirebileceği bir "Şifre Değiştir" butonu ve modalı ekle.

- [X] **Bulgu'lara Dosya Ekleme**
  - **Açıklama:** "Yeni Bulgu Ekle/Düzenle" ekranına, ekran görüntüsü veya log dosyası gibi dosyaların eklenebileceği bir alan eklemek.
  - **Teknik Adımlar:** Backend'e dosya yükleme işlemleri için `multer` kütüphanesini eklemek. Yüklenen dosyaları sunucuda bir klasörde saklamak ve veritabanında hangi bulguya ait olduğunu ilişkilendirmek.

  ## Bölüm 4: Kod Yapısını İyileştirme (Refactoring) (Yeni Eklendi)

Bu bölüm, uygulama büyüdükçe yönetimi zorlaşan `server.js` ve `script.js` dosyalarını daha küçük ve yönetilebilir modüllere ayırma görevlerini içerir.

- [x] **Backend Kodunu Bölme (`server.js`)**
  - **Amaç:** `server.js` dosyasını bir "trafik polisi" haline getirip, ana iş mantığını ayrı dosyalara taşımak.
  - **Adımlar:**
    - Proje ana dizininde `routes` adında bir klasör oluştur.
    - `vendors.js`, `bulgular.js`, `users.js` gibi her bir API grubu için ayrı dosyalar oluştur.
    - `server.js` içindeki ilgili API endpoint kodlarını bu yeni dosyalara taşı.
    - Ana `server.js` dosyasında, gelen istekleri `app.use('/api/vendors', vendorRoutes)` gibi komutlarla ilgili dosyalara yönlendir.

- [X] **Frontend Kodunu Bölme (`script.js`)**
  - **Amaç:** `script.js` dosyasını, sorumluluklarına göre (API istekleri, arayüz çizimi, olay yönetimi vb.) daha küçük modüllere ayırmak.
  - **Adımlar:**
    - `public` klasörü içinde `js` adında yeni bir klasör oluştur.
    - `ui.js` (tüm `get...HTML` fonksiyonları için), `api.js` (`apiRequest` fonksiyonu için) gibi modül dosyaları oluştur.
    - Bu dosyalarda `export` anahtar kelimesi ile fonksiyonları dışa aktar.
    - Ana `script.js` dosyasında `import` anahtar kelimesi ile bu fonksiyonları içeri aktar.
    - `index.html` dosyasındaki `<script src="script.js">` etiketine `type="module"` özelliğini ekle.

    - [x] **Değişiklik Geçmişi (Audit Log)**
  - **Açıklama:** Bulgu üzerinde yapılan her değişikliğin (durum değişkliği, alanların güncellenmesi, dosya eklenmesi vs.) tarihçesini tutmak.
  - **Teknik Adımlar:** Veritabanına `history` adında yeni tablolar eklemek. Backend'de bu tabloları yönetecek API'lar oluşturmak. Frontend'de bu verileri gösterecek arayüzleri tasarlamak.
- [x] **Kullanıcının Otomatik Yazılması**
  - **Açıklama:** Yeni Bulgu/Talep Ekle ve  Bulgu/Talep Düzenle ekranlarındaki Giren Kullanıcı ve ÇÖzüm Onaylayan Kullanıcı değerlerinin sisteme giriş yapmış kullanıcı adı ve soyadı ile otomatik dolması. Zaten eklenmiş olan kayıtlar ve import ederken eklenen ve sistemde olmayan kullanıcılar kalacak.

- [x] **Veriyi Dışa Aktarma (Export to CSV/Excel)**
  - **Açıklama:** "Bulgu Takibi" sayfasındaki filtrelenmiş listeyi bir "Dışa Aktar" butonuyla CSV dosyası olarak indirebilme özelliği.
  - **Teknik Adımlar:** Backend'de `/api/bulgular/export` gibi yeni bir API endpoint'i oluşturmak. Bu endpoint'in veriyi CSV formatına çevirip tarayıcıya göndermesini sağlamak.

  ### Yapılacaklar Listesi (To-Do)
  
  ## Öncelik 3: Yapısal ve Güvenlik Geliştirmeleri

- [ ] **Kullanıcı Rolleri ve Yetkilendirme (Admin, User)**
  - **Açıklama:** Uygulamada "Admin" ve "Normal Kullanıcı" gibi roller tanımlamak. Sadece Admin yetkisine sahip kullanıcıların yeni kullanıcı ekleyebilmesi, vendor/model silebilmesi gibi yetki kontrolleri eklemek.
  - **Teknik Adımlar:** `users` tablosuna bir `role` kolonu eklemek. Backend'deki API'ların, işlemi yapmaya çalışan kullanıcının rolünü kontrol etmesini sağlamak. Frontend'de, kullanıcının rolüne göre belirli butonları (örn: "Yeni Kullanıcı Ekle") gizlemek veya göstermek.

