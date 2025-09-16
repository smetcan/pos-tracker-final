# POS Fonksiyon Desteği Özelliği - Geliştirme Planı
Bu belge, uygulamaya POS cihazlarının fonksiyonel yeteneklerini takip etme ve yönetme özelliğini eklemek için gereken tüm teknik adımları içerir. Plan, dört ana aşamadan oluşur: Veritabanı, Backend API, Yönetim Arayüzü ve Görüntüleme Arayüzü.

## Aşama 1: Veritabanı ve Altyapı Hazırlığı (Backend)

Bu aşamada, yeni verileri saklamak için veritabanı şemamızı genişleteceğiz.

- [ ] Görev 1.1: Functions Tablosunu Oluşturma

Fonksiyonların ana listesini tutacak bu tabloyu oluştur.

### SQL Kodu:


`CREATE TABLE Functions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);` 

- [ ] Görev 1.2: FunctionSupport Ara Tablosunu Oluşturma

Hangi fonksiyonun hangi versiyonda desteklendiğini belirten ilişki tablosunu oluştur. Bir versiyonu seçmek, dolaylı olarak modeli ve vendor'u da seçmek anlamına geldiği için en mantıklı ilişki versionId üzerinden kurulur.

### SQL Kodu:

`CREATE TABLE FunctionSupport (
    functionId INTEGER NOT NULL,
    versionId INTEGER NOT NULL,
    PRIMARY KEY (functionId, versionId),
    FOREIGN KEY (functionId) REFERENCES Functions(id) ON DELETE CASCADE,
    FOREIGN KEY (versionId) REFERENCES AppVersion(id) ON DELETE CASCADE
);`

## Aşama 2: API Geliştirmeleri (Backend)
Bu aşamada, veritabanındaki yeni tabloları yönetecek ve arayüze veri sağlayacak sunucu endpoint'lerini oluşturacağız.

- [ ] Görev 2.1: Fonksiyonlar için Temel CRUD API'ları

    - Yeni bir routes/functions.js dosyası oluştur.

    - Bu dosyada aşağıdaki endpoint'leri tamamla:

    - GET /api/functions: Tüm fonksiyonları listeler.

    - POST /api/functions: Yeni bir fonksiyon ekler (örn: DCC, MultiCurr).

    - PUT /api/functions/:id: Bir fonksiyonun adını/açıklamasını günceller.

    - DELETE /api/functions/:id: Bir fonksiyonu siler.

- [ ] Görev 2.2: Fonksiyon Desteği Yönetim API'ları

    - routes/functions.js dosyasına devam et.

    - Belirli bir fonksiyon için desteklenen versiyonları yönetmek üzere endpoint'ler oluştur:

    - GET /api/functions/:id/support: Bir fonksiyonun desteklendiği tüm versionId'lerini bir dizi olarak döner.

    - PUT /api/functions/:id/support: Bir fonksiyon için desteklenen versiyonların tam listesini günceller (Önce eskileri siler, sonra yenileri ekler. Body'de [versionId1, versionId2, ...] gibi bir dizi beklenir).

- [ ] Görev 2.3: Görüntüleme Sayfası için Veri API'ları

    - routes/functions.js veya yeni bir routes/reports.js dosyası oluştur.

    - TreeView ve Matris görünümleri için gerekli olan, işlenmiş veriyi dönecek endpoint'leri oluştur:

    - GET /api/function-support/tree: Veriyi Fonksiyon > Vendor > Model > Versiyon hiyerarşisine uygun, iç içe geçmiş bir JSON objesi olarak hazırlar ve döner.

    - GET /api/function-support/matrix: Veriyi Satırlar: Vendor/Model/Versiyon, Sütunlar: Fonksiyonlar olacak şekilde bir matris (dizi içinde dizi veya obje dizisi) olarak hazırlar ve döner.

## Aşama 3: Fonksiyon Desteği Yönetim Ekranı (Frontend)
Bu aşamada, "Yönetim Paneli" üzerinden fonksiyonları ve destek durumlarını tanımlayacağımız arayüzü oluşturacağız.

- [ ] Görev 3.1: Yönetim Paneli'ne "Fonksiyonlar" Sekmesi Ekleme

    - public/ui/pages.js -> getYonetimHTML fonksiyonunu güncelle.

    - Navigasyon barına "Fonksiyonlar" adında yeni bir sekme ekle.

- [ ] Görev 3.2: Fonksiyon Listesi Arayüzü

    - Yeni "Fonksiyonlar" sekmesinin içeriğini oluştur.

    - GET /api/functions'dan gelen veriyi listeleyen bir tablo yap.

    - "Yeni Fonksiyon Ekle", "Düzenle", "Sil" butonlarını ekle ve bu butonların POST, PUT, DELETE API'larını çağırmasını sağla.

- [ ] Görev 3.3: Destek Tanımlama Arayüzü

    - Fonksiyon listesindeki bir fonksiyona tıklandığında açılacak olan detay/tanımlama arayüzünü tasarla.
     
    - Adım-adım seçim mantığını uygula:
     
    - Vendor'ları listeleyen bir dropdown oluştur.
     
    - Bir vendor seçildiğinde, o vendor'a ait modelleri çoklu seçilebilir checkbox listesi olarak göster.
     
    - Modeller seçildiğinde, o modellere ait versiyonları başka bir çoklu seçilebilir checkbox listesi olarak göster.
     
    - GET /api/functions/:id/support ile o fonksiyon için daha önce kaydedilmiş versiyonları bu listelerde işaretli olarak getir.
     
    - "Kaydet" butonu, seçili olan tüm versionId'leri toplayıp PUT /api/functions/:id/support'a göndersin.

## Aşama 4: Fonksiyon Desteği Görüntüleme Sayfası (Frontend)
Bu aşamada, son kullanıcının fonksiyon destek hiyerarşisini ve matrisini görebileceği yeni ana sayfayı oluşturacağız.

- [ ] Görev 4.1: Kenar Çubuğuna Yeni Link Ekleme

    - public/index.html dosyasında, "Yönetim" linkinin altına "Fonksiyon Desteği" adında yeni bir navigasyon linki ekle (<a href="#/functions" ...>).

- [ ] Görev 4.2: Ana Router'ı Güncelleme

    - public/script.js -> router fonksiyonuna else if (hash === '#/functions') bloğunu ekle.

    - Bu blok içinde GET /api/function-support/tree ve GET /api/function-support/matrix API'larından verileri çek.

- [ ] Görev 4.3: Görüntüleme Sayfasını Tasarlama

    - public/ui/pages.js içine getFunctionSupportPageHTML adında yeni bir fonksiyon oluştur.

    - Bu fonksiyon, "Hiyerarşi (TreeView)" ve "Matris" adında iki sekme içeren bir sayfa yapısı döndürsün.

- [ ] Görev 4.4: TreeView Arayüzünü Oluşturma

    - Hiyerarşi sekmesinin içeriğini oluştur.

    - GET /api/function-support/tree'den gelen iç içe JSON verisini, yine iç içe geçmiş < ul> ve < li> listeleriyle ekrana çizen bir JavaScript fonksiyonu yaz. Tıklanınca açılıp kapanan (accordion/toggle) bir yapı kur.

- [ ] Görev 4.5: Matris Arayüzünü Oluşturma

    - Matris sekmesinin içeriğini oluştur.

    - GET /api/function-support/matrix'den gelen veriyi kullanarak, daha önce konuştuğumuz gibi satırları ve sütunları olan bir HTML tablosu oluştur. Desteklenen hücreleri yeşil bir tik (✔️) ile göster.