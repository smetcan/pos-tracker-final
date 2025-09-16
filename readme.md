# POS Takip Uygulaması (pos-tracker-simple)

Basit, tek-dosyadan oluşan bir POS takip uygulaması. Amaç: üretici firmaların (vendor) modelleri, bu modellere ait yazılım versiyonları ve bu versiyonlara ilişkin bulunan hatalar/taleplerin (bulgular) merkezi olarak yönetilmesi.

Bu repository küçük, bağımsız ve kolay anlaşılır olacak şekilde tasarlanmıştır: bir Express sunucusu (`server.js`) + statik SPA (`public/index.html`, `public/script.js`) ve bir SQLite veritabanı dosyası (`dev.db`).

## Hızlı başlangıç

1. Node.js kurulu olmalı.
2. Bağımlılıkları yükleyin:

```powershell
npm install
```

3. Sunucuyu başlatın:

```powershell
npm start
```

4. Tarayıcıda açın: http://localhost:3000

NOT: `dev.db` repo içinde yer alabilir. Eğer yoksa veya sıfırdan oluşturacaksanız README altındaki "Veritabanı şeması" bölümündeki CREATE TABLE komutlarını kullanın.

## Mimari - Kısa

- Backend: `server.js` (Express + sqlite3). Tüm API'ler `/api/*` altında.
- Frontend: `public/index.html` + `public/script.js` (Vanilla JS, Tailwind via CDN). Tek dosyalık SPA, hiçbir bundling/build adımı yok.
- Veri: tek SQLite dosyası `dev.db`.

## Önemli dosyalar

- `server.js` — API mantığı, SQL sorguları, validasyon, transaction kullanımı.
- `public/script.js` — UI render, form handling, `apiRequest()` wrapper, modal logic.
- `public/index.html` — SPA shell.
- `dev.db` — (checked-in) SQLite veritabanı; schema + test verileri.
- `package.json` — bağımlılıklar ve `npm start` script'i.

## API - Hızlı referans ve örnekler

Frontend `public/script.js` içindeki `apiRequest` wrapper tüm istekleri JSON olarak gönderir. Aşağıda birkaç örnek gösterilmiştir.

- GET tüm vendor'lar

```bash
curl http://localhost:3000/api/vendors
```

- POST yeni vendor

```bash
curl -X POST http://localhost:3000/api/vendors -H "Content-Type: application/json" -d '{"name":"Firma A","makeCode":"FA"}'
```

- POST yeni bulgu (örnek JSON)

```bash
curl -X POST http://localhost:3000/api/bulgular \
    -H "Content-Type: application/json" \
    -d '{
        "baslik":"Ekran çöküyor",
        "modelIds":[1,2],
        "bulguTipi":"Program Hatası",
        "etkiSeviyesi":"Yüksek",
        "tespitTarihi":"2025-09-10",
        "detayliAciklama":"Uygulama başlatıldığında X hatası alınıyor",
        "girenKullanici":"ali"
    }'
```

Önemli: formlar frontend'de FormData -> JSON dönüşümü ile `modelIds` gibi çoklu seçimleri dizi halinde gönderir; server bunu bekler.

### Hata durumları ve HTTP kodları

- 400: Eksik zorunlu alanlar (ö. örn. modelIds boş)
- 409: UNIQUE veya foreign key ihlali (ör. vendor adı/slug tekrarları veya silme sırasında bağlı kayıtlar)
- 500: Sunucu/DB hataları

## Veritaban� �emas�

POS takip verileri alt� ana tablonun etraf�nda toplan�r. Vendor ve AppVersion tablolar� tedarik�i taraf�n�, Model tablosu donan�m cihazlar�n�, Bulgu tablosu ise bu cihazlardaki yaz�l�msal sorun ve talepleri temsil eder. VersionModel ve BulguModel yard�mc� tablolar� ili�kileri �oktan �o�a derinle�tirir.

```
Tablo          Ama�                                              Kritik Alanlar
-------------- ------------------------------------------------- ----------------------------------
Vendor         �retici firma kay�tlar�                           name, slug (benzersiz)
Model          Vendor tabanl� cihaz/modeller                     vendorId, isTechpos/isAndroidPos/isOkcPos bayraklar�
AppVersion     Vendor versiyon ya�am d�ng�s�                     versionNumber, status, prodOnayDate
VersionModel   Versiyon-model �oktan �o�a e�lemesi               versionId + modelId (PK)
Bulgu          Bulgular, hata ve talepler                        baslik, status, cozumVersiyonId (opsiyonel)
BulguModel     Bulgu-model �oktan �o�a e�lemesi                  bulguId + modelId (PK)
```

### Tablo detaylar�

**Vendor**
- `id`: Otomatik artan benzersiz kimlik.
- `name`: Vendor ad�; benzersizdir ve UI katman�nda g�sterilir.
- `makeCode`: Vendor i�in raporlama kodu.
- `slug`: JSON dostu benzersiz k�sa ad.

**Model**
- `vendorId`: Modele ait vendor kayd�n� i�aret eder.
- `code`: Vendor i�indeki model kodu (opsiyonel).
- `isTechpos`, `isAndroidPos`, `isOkcPos`: Frontend filtreleri i�in kullan�lan boolean bayraklar, SQLite i�inde 0/1 olarak saklan�r.

**AppVersion**
- `vendorId`: Versiyonun hangi vendor ile ili�kili oldu�unu g�sterir.
- `versionNumber`: Versiyon etiketi (�rnek de�er: v2.3.1).
- `deliveryDate`, `prodOnayDate`: Teslim ve �retim onay� tarihleri gibi s�re� metrikleri.
- `status`: Versiyonun i� ak���ndaki durumu.

**VersionModel**
- `versionId` ve `modelId`: Ayn� versiyon birden fazla modele ba�lanabildi�i i�in �oktan �o�a k�pr� olu�turur.

**Bulgu**
- `baslik`, `detayliAciklama`: Bulgunun k�sa ba�l��� ve opsiyonel a��klama metni.
- `bulguTipi`, `etkiSeviyesi`: S�n�fland�rma alanlar�; frontend se�im kutular�n� besler.
- `girenKullanici`: Kayd� olu�turan kullan�c� ad�.
- `vendorTrackerNo`: Vendor taraf�ndan verilen referans numaras�.
- `cozumVersiyonId`: Bulgunun hangi versiyon ile kapat�ld���n� g�steren opsiyonel foreign key.
- `status`: Varsay�lan de�er `A��k`; s�re�te Kapal� gibi farkl� durumlara g�ncellenir.
- `cozumOnaylayanKullanici`, `cozumOnayTarihi`: ��z�m onay s�reci bilgileri.

**BulguModel**
- Bir bulgunun etkilendi�i modelleri tutan �oktan �o�a k�pr� tablosu.

### �li�ki diyagram� (metin)

```
Vendor (1) -> Model (n)
Vendor (1) -> AppVersion (n)
AppVersion (n) <-> Model (n)    via VersionModel
Bulgu (n) <-> Model (n)         via BulguModel
Bulgu (n) -> AppVersion (1)     cozumVersiyonId (opsiyonel)
```

### Veri b�t�nl��� ve indeksler

- `Vendor.name` ve `Vendor.slug` UNIQUE k�s�tlar� �ak��malar� engeller.
- `Model.vendorId`, `AppVersion.vendorId`, `VersionModel.versionId`/`modelId` ve `BulguModel.bulguId`/`modelId` foreign key ile korunur; `server.js` taraf�nda transaction kullan�m� ili�kili kay�tlar�n tutarl� kalmas�n� sa�lar.
- �oktan �o�a tablolarda birle�ik PRIMARY KEY, ayn� kombinasyonlar�n ikinci kez eklenmesini engeller.
- Boolean nitelikler (`isTechpos` vb.) integer olarak tutulur; 0 de�eri false, 1 de�eri true anlam�na gelir.
- Performans i�in `Model.vendorId`, `VersionModel.versionId` ve `BulguModel.bulguId` �zerinde indeksler �nerilir; `dev.db` �rnek veritaban�nda bu indeksler haz�r durumdad�r.

### CREATE TABLE referans�

A�a��daki SQL komutlar� bo� bir veritaban� dosyas�n� olu�turmak i�in kullan�labilir.

```sql
CREATE TABLE Vendor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    makeCode TEXT,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE Model (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT,
    vendorId INTEGER NOT NULL,
    isTechpos INTEGER DEFAULT 0,
    isAndroidPos INTEGER DEFAULT 0,
    isOkcPos INTEGER DEFAULT 0,
    FOREIGN KEY(vendorId) REFERENCES Vendor(id)
);

CREATE TABLE AppVersion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    versionNumber TEXT NOT NULL,
    vendorId INTEGER NOT NULL,
    deliveryDate TEXT,
    status TEXT,
    prodOnayDate TEXT,
    FOREIGN KEY(vendorId) REFERENCES Vendor(id)
);

CREATE TABLE VersionModel (
    versionId INTEGER NOT NULL,
    modelId INTEGER NOT NULL,
    PRIMARY KEY(versionId, modelId),
    FOREIGN KEY(versionId) REFERENCES AppVersion(id),
    FOREIGN KEY(modelId) REFERENCES Model(id)
);

CREATE TABLE Bulgu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baslik TEXT NOT NULL,
    bulguTipi TEXT,
    etkiSeviyesi TEXT,
    tespitTarihi TEXT,
    detayliAciklama TEXT,
    girenKullanici TEXT,
    vendorTrackerNo TEXT,
    cozumVersiyonId INTEGER,
    status TEXT DEFAULT 'A��k',
    cozumOnaylayanKullanici TEXT,
    cozumOnayTarihi TEXT,
    FOREIGN KEY(cozumVersiyonId) REFERENCES AppVersion(id)
);

CREATE TABLE BulguModel (
    bulguId INTEGER NOT NULL,
    modelId INTEGER NOT NULL,
    PRIMARY KEY(bulguId, modelId),
    FOREIGN KEY(bulguId) REFERENCES Bulgu(id),
    FOREIGN KEY(modelId) REFERENCES Model(id)
);
```

### Ek notlar

- Sunucu taraf�nda baz� GET sorgular� `GROUP_CONCAT` ile ili�kili modelleri virg�lle ay�rarak d�ner; frontend bu format� hem liste g�stermede hem de form doldurmada kullan�r.

## Geliştirme notları & proje özgü gotchalar

- `dev.db` dosyası repository içinde yer alıyorsa, Windows'ta açık dosya kilitleri nedeniyle `git merge` veya `git checkout` sırasında "unable to unlink old 'dev.db'" gibi hatalar alabilirsiniz. Çözüm adımları:

    1. Çalışan sunucuyu durdurun (`npm stop` / Ctrl+C) veya `node server.js` çalışıyorsa kapatın.
    2. Gerekirse `dev.db`'yi yedekleyin:

```powershell
Copy-Item .\dev.db .\dev.db.bak -Force
```

    3. Merge / checkout işlemini tekrar deneyin.

- Çok adımlı güncellemeler server tarafında SQLite transaction (BEGIN/COMMIT/ROLLBACK) ile korunmuştur. Bu akışları bozmamaya dikkat edin (ör. versiyon güncelleme ve bulgu güncelleme).

- Static dosyalar cache'lenmesin diye `server.js` statik middleware'de cache-control ve etag/lastModified devre dışı bırakılmış. Tarayıcı caching ile ilgili hata ayıklarken bunu unutmayın.

## DB debugging & inceleme

- Terminalde sqlite3 yüklü ise:

```powershell
sqlite3 dev.db
.tables
.schema Vendor
SELECT * FROM Vendor LIMIT 10;
```

## Katkıda bulunma

- Küçük bir proje; yeni bir özellik eklemeden veya schema değişikliği yapmadan önce lütfen `server.js` ve `public/script.js`'deki ilgili akışı kontrol edin.
- `dev.db` binary olduğu için PR'lerde dikkatli olun. Eğer schema veya başlangıç verisi değiştirilecekse, `dev.db` yerine migration SQL veya `dev.db.bak` önerisi ekleyin.

## Sık karşılaşılan sorunlar

- Sunucu başlatılamıyor / `dev.db` kilitleniyor: yukarıdaki yedekleme/adımları takip edin.
- API 400 hatası: eksik zorunlu alan veya yanlış payload formatı (JSON içinde array bekleniyor vs.). Frontend `Content-Type: application/json` ile gönderiyor.
