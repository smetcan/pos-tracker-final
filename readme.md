**POS Bulgu ve Versiyon Takip Sistemi**

Bu proje, POS (Point of Sale) terminali üreten firmaların (Vendor), bu firmalara ait cihaz modellerinin, bu modellere ait yazılım versiyonlarının ve bu versiyonlarla ilgili tespit edilen hataların veya geliştirme taleplerinin (Bulgular) merkezi olarak takip edilmesini sağlayan bir web uygulamasıdır.

Uygulama, modern ve reaktif bir arayüz ile kullanıcı dostu bir deneyim sunarken, arka planda güçlü ve modüler bir yapıya sahiptir.

**🚀 Temel Özellikler**

- **Ana Sayfa (Dashboard):** Sistemin genel durumunu özetleyen interaktif grafikler ve istatistikler. Toplam, açık, test edilecek ve kapalı bulgu sayıları ile son eklenen kayıtlar gibi kritik bilgilere hızlı erişim sağlar.
- **Bulgu Takibi:** Tüm hata ve talep kayıtlarının listelendiği, detaylı arama ve filtreleme seçenekleri sunan ana modül.
- **Yönetim Paneli:**
  - **Vendor Yönetimi:** Sisteme yeni üretici firma ekleme, düzenleme ve silme işlemleri.
  - **Model Yönetimi:** Her bir vendor'a ait POS cihazı modellerini tanımlama ve yönetme.
  - **Versiyon Yönetimi:** Modellere ait yazılım versiyonlarını ve bu versiyonların detaylarını (teslim tarihi, prod onayı vb.) yönetme.
  - **Kullanıcı Yönetimi:** Sisteme yeni kullanıcı ekleme, şifre sıfırlama ve silme.
  - **Fonksiyon Yönetimi:** POS cihazlarının desteklediği "DCC", "Taksit" gibi fonksiyonel yetenekleri tanımlama ve yönetme.
- **Fonksiyon Desteği Görselleştirme:**
  - **Hiyerarşi Görünümü:** Fonksiyonların hangi vendor, model ve versiyon tarafından desteklendiğini ağaç yapısında gösterir.
  - **Matris Görünümü:** Tüm fonksiyonların, tüm versiyonlarla olan destek durumunu bir tablo üzerinde özetler.
- **Gelişmiş Yetenekler:**
  - **Kimlik Doğrulama:** Güvenli kullanıcı girişi ve oturum yönetimi.
  - **Detaylı Kayıt Geçmişi:** Bir bulgu üzerinde yapılan her değişikliğin (durum değişikliği, atama vb.) kaydının tutulması.
  - **Dosya Ekleme:** Bulgu kayıtlarına ekran görüntüsü, log dosyası gibi dokümanlar ekleyebilme.
  - **Veri Aktarımı:** Bulguları CSV formatında dışa aktarma ve CSV'den içeri aktarma.

**🛠️ Teknik Yapı ve Mimarisi**

Proje, modern web teknolojileri kullanılarak Node.js tabanlı bir **REST API** backend'i ve bağımlılıkları en aza indirilmiş bir **Single Page Application (SPA)** frontend'i olarak tasarlanmıştır.

**Backend Mimarisi**

- **Çatı (Framework):** Express.js
- **Veritabanı:** SQLite 3
- **Asenkron Yönetimi:** async/await ve Promise'ler
- **Modüler Yönlendirme (Routing):** API endpoint'leri, sorumluluklarına göre (auth, vendors, bulgular vb.) routes klasörü altında modüler dosyalara ayrılmıştır.
- **Kimlik Doğrulama:** express-session ile oturum tabanlı kullanıcı yönetimi ve bcrypt ile güvenli şifre saklama.
- **Dosya Yükleme:** multer kütüphanesi ile dosya ekleme işlemleri yönetilir.

**Frontend Mimarisi**

- **Yapı:** Vanilla JavaScript (ES6 Modules) ile oluşturulmuş, build işlemi gerektirmeyen bir Single Page Application (SPA).
- **Tasarım ve Arayüz:** Tailwind CSS (CDN üzerinden) ile modern ve duyarlı bir tasarım.
- **Grafikler:** Chart.js kütüphanesi ile dinamik ve interaktif grafikler.
- **İstemci Taraflı Yönlendirme (Routing):** Hash (#) tabanlı yönlendirme ile sayfa yenilenmeden içerik değiştirilir.
- **Kod Organizasyonu:** Frontend kodu public klasörü altında api.js, ui/, events.js gibi sorumluluklarına göre modüler dosyalara ayrılmıştır.


**📦 Kurulum ve Başlatma**

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

**Gereksinimler**

- [Node.js](https://nodejs.org/) (v18 veya üstü tavsiye edilir)
- npm (Node.js ile birlikte gelir)

**Adımlar**

1. **Projeyi Klonlayın veya İndirin:**
2. git clone https://github.com/smetcan/pos-tracker-final.git
3. cd pos-tracker-final
4. **Gerekli Paketleri Yükleyin:** Proje bağımlılıklarını package.json dosyasından yüklemek için aşağıdaki komutu çalıştırın:
5. npm install
6. **Veritabanını Hazırlayın:** Proje, içerisinde örnek veriler barındıran bir dev.db SQLite veritabanı dosyası ile birlikte gelir. Eğer bu dosya yoksa veya sıfırdan oluşturmak isterseniz, veritabanı şemasını config/db.js dosyasındaki CREATE TABLE sorgularını kullanarak oluşturabilirsiniz.
7. **Uygulamayı Başlatın:** Aşağıdaki komut ile sunucuyu başlatın:
8. npm start
9. **Uygulamaya Erişin:** Sunucu başarıyla başladığında, terminalde Sunucu <http://localhost:3000> adresinde çalışıyor mesajını göreceksiniz. Tarayıcınızdan bu adrese giderek uygulamayı kullanmaya başlayabilirsiniz.
    - **Varsayılan Giriş Bilgileri:**
        - **Kullanıcı Adı:** smetcan
        - Şifreyi veritabanından veya geliştiriciden temin ediniz.


**Veritabanı Şeması**

Uygulamanın veri modeli, ilişkisel bir yapıya sahip olup SQLite veritabanında saklanır. Ana tablolar ve ilişkileri aşağıda özetlenmiştir.

| **Tablo Adı** | **Açıklama** |
| --- | --- |
| **Vendor** | Üretici firmaların ana tablosu. |
| **Model** | Her bir vendor'a ait POS cihazı modellerinin tutulduğu tablo. |
| **AppVersion** | Yazılım versiyonlarının ve bu versiyonlarla ilişkili modellerin kaydı. |
| **VersionModel** | AppVersion ve Model arasında çoktan-çoğa ilişki kurar. |
| **Bulgu** | Hata ve taleplerin detaylarının tutulduğu ana tablo. |
| **BulguModel** | Bir Bulgu kaydının hangi Model'leri etkilediğini belirten çoktan-çoğa ilişki tablosu. |
| **Functions** | "DCC", "Taksit" gibi POS fonksiyonlarının tanımlandığı tablo. |
| **FunctionSupport** | Bir fonksiyonun hangi versiyon tarafından desteklendiğini belirtir. |
| **users** | Uygulama kullanıcılarının ve şifrelerinin tutulduğu tablo. |
| **history** | Bir Bulgu üzerinde yapılan tüm değişikliklerin geçmiş kaydı. |
| **attachments** | Bulgu kayıtlarına eklenen dosyaların bilgilerini tutar. |
| **VendorContact** | Vendor'lara ait iletişim kişilerini tutar. |


**🚀 API Endpoint'leri**

Uygulamanın frontend'i, backend ile /api ön eki üzerinden RESTful prensiplerine uygun olarak haberleşir. Tüm endpoint'ler isAuthenticated middleware'i ile korunmaktadır.

| **Method** | **Endpoint** | **Açıklama** |
| --- | --- | --- |
| POST | /api/login | Kullanıcı girişi yapar ve oturum başlatır. |
| POST | /api/logout | Mevcut kullanıcı oturumunu sonlandırır. |
| GET | /api/session-check | Aktif bir oturum olup olmadığını kontrol eder. |
| GET | /api/dashboard | Ana sayfa istatistiklerini getirir. |
| GET | /api/bulgular | Bulguları filtreleme ve sayfalama seçenekleriyle listeler. |
| POST | /api/bulgular | Yeni bir bulgu kaydı oluşturur. |
| PUT | /api/bulgular/:id | Belirtilen ID'ye sahip bulguyu günceller. |
| DELETE | /api/bulgular/:id | Belirtilen ID'ye sahip bulguyu siler. |
| GET | /api/bulgular/export | Filtrelenmiş bulguları CSV olarak dışa aktarır. |
| GET | /api/vendors | Tüm vendor'ları listeler. |
| POST | /api/vendors | Yeni bir vendor ekler. |
| ... | ... | (Diğer tüm models, versions, users, functions endpoint'leri) |


**📁 Proje Dosya Yapısı**

pos-tracker/

├── config/

│ └── db.js # Veritabanı bağlantısı ve migrasyonlar

├── middleware/

│ └── auth.js # Oturum kontrolü middleware'i

├── public/

│ ├── ui/ # Arayüz bileşenlerini (modals, pages, tables) oluşturan JS dosyaları

│ ├── api.js # Backend'e istek atmak için kullanılan yardımcı fonksiyon

│ ├── events.js # DOM olaylarını (click, submit vb.) yöneten kodlar

│ ├── script.js # Ana uygulama mantığı ve SPA router'ı

│ └── ... # Diğer statik dosyalar (index.html, state.js, utils.js)

├── routes/

│ ├── auth.js # Kimlik doğrulama ile ilgili yollar

│ ├── bulgular.js # Bulgular ile ilgili tüm API yolları

│ └── ... # Diğer modüller için API yolları (vendors.js, models.js vb.)

├── uploads/

│ └── ... # Kullanıcıların yüklediği dosyaların saklandığı klasör

├── .gitignore

├── package.json

├── readme.md

└── server.js # Ana Express sunucu dosyası