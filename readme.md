# POS Takip UygulamasÄ± (pos-tracker-simple)

Basit, tek-dosyadan oluÅŸan bir POS takip uygulamasÄ±. AmaÃ§: Ã¼retici firmalarÄ±n (vendor) modelleri, bu modellere ait yazÄ±lÄ±m versiyonlarÄ± ve bu versiyonlara iliÅŸkin bulunan hatalar/taleplerin (bulgular) merkezi olarak yÃ¶netilmesi.

Bu repository kÃ¼Ã§Ã¼k, baÄŸÄ±msÄ±z ve kolay anlaÅŸÄ±lÄ±r olacak ÅŸekilde tasarlanmÄ±ÅŸtÄ±r: bir Express sunucusu (`server.js`) + statik SPA (`public/index.html`, `public/script.js`) ve bir SQLite veritabanÄ± dosyasÄ± (`dev.db`).

## HÄ±zlÄ± baÅŸlangÄ±Ã§

1. Node.js kurulu olmalÄ±.
2. BaÄŸÄ±mlÄ±lÄ±klarÄ± yÃ¼kleyin:

```powershell
npm install
```

3. Sunucuyu baÅŸlatÄ±n:

```powershell
npm start
```

4. TarayÄ±cÄ±da aÃ§Ä±n: http://localhost:3000

NOT: `dev.db` repo iÃ§inde yer alabilir. EÄŸer yoksa veya sÄ±fÄ±rdan oluÅŸturacaksanÄ±z README altÄ±ndaki "VeritabanÄ± ÅŸemasÄ±" bÃ¶lÃ¼mÃ¼ndeki CREATE TABLE komutlarÄ±nÄ± kullanÄ±n.

## Mimari - KÄ±sa

- Backend: `server.js` (Express + sqlite3). TÃ¼m API'ler `/api/*` altÄ±nda.
- Frontend: `public/index.html` + `public/script.js` (Vanilla JS, Tailwind via CDN). Tek dosyalÄ±k SPA, hiÃ§bir bundling/build adÄ±mÄ± yok.
- Veri: tek SQLite dosyasÄ± `dev.db`.

## Ã–nemli dosyalar

- `server.js` â€” API mantÄ±ÄŸÄ±, SQL sorgularÄ±, validasyon, transaction kullanÄ±mÄ±.
- `public/script.js` â€” UI render, form handling, `apiRequest()` wrapper, modal logic.
- `public/index.html` â€” SPA shell.
- `dev.db` â€” (checked-in) SQLite veritabanÄ±; schema + test verileri.
- `package.json` â€” baÄŸÄ±mlÄ±lÄ±klar ve `npm start` script'i.

## API - HÄ±zlÄ± referans ve Ã¶rnekler

Frontend `public/script.js` iÃ§indeki `apiRequest` wrapper tÃ¼m istekleri JSON olarak gÃ¶nderir. AÅŸaÄŸÄ±da birkaÃ§ Ã¶rnek gÃ¶sterilmiÅŸtir.

- GET tÃ¼m vendor'lar

```bash
curl http://localhost:3000/api/vendors
```

- POST yeni vendor

```bash
curl -X POST http://localhost:3000/api/vendors -H "Content-Type: application/json" -d '{"name":"Firma A","makeCode":"FA"}'
```

- POST yeni bulgu (Ã¶rnek JSON)

```bash
curl -X POST http://localhost:3000/api/bulgular \
    -H "Content-Type: application/json" \
    -d '{
        "baslik":"Ekran Ã§Ã¶kÃ¼yor",
        "modelIds":[1,2],
        "bulguTipi":"Program HatasÄ±",
        "etkiSeviyesi":"YÃ¼ksek",
        "tespitTarihi":"2025-09-10",
        "detayliAciklama":"Uygulama baÅŸlatÄ±ldÄ±ÄŸÄ±nda X hatasÄ± alÄ±nÄ±yor",
        "girenKullanici":"ali"
    }'
```

Ã–nemli: formlar frontend'de FormData -> JSON dÃ¶nÃ¼ÅŸÃ¼mÃ¼ ile `modelIds` gibi Ã§oklu seÃ§imleri dizi halinde gÃ¶nderir; server bunu bekler.

### Hata durumlarÄ± ve HTTP kodlarÄ±

- 400: Eksik zorunlu alanlar (Ã¶. Ã¶rn. modelIds boÅŸ)
- 409: UNIQUE veya foreign key ihlali (Ã¶r. vendor adÄ±/slug tekrarlarÄ± veya silme sÄ±rasÄ±nda baÄŸlÄ± kayÄ±tlar)
- 500: Sunucu/DB hatalarÄ±

## Veritabaný þemasý

POS takip verileri altý ana tablonun etrafýnda toplanýr. Vendor ve AppVersion tablolarý tedarikçi tarafýný, Model tablosu donaným cihazlarýný, Bulgu tablosu ise bu cihazlardaki yazýlýmsal sorun ve talepleri temsil eder. VersionModel ve BulguModel yardýmcý tablolarý iliþkileri çoktan çoða derinleþtirir.

```
Tablo          Amaç                                              Kritik Alanlar
-------------- ------------------------------------------------- ----------------------------------
Vendor         Üretici firma kayýtlarý                           name, slug (benzersiz)
Model          Vendor tabanlý cihaz/modeller                     vendorId, isTechpos/isAndroidPos/isOkcPos bayraklarý
AppVersion     Vendor versiyon yaþam döngüsü                     versionNumber, status, prodOnayDate
VersionModel   Versiyon-model çoktan çoða eþlemesi               versionId + modelId (PK)
Bulgu          Bulgular, hata ve talepler                        baslik, status, cozumVersiyonId (opsiyonel)
BulguModel     Bulgu-model çoktan çoða eþlemesi                  bulguId + modelId (PK)
```

### Tablo detaylarý

**Vendor**
- `id`: Otomatik artan benzersiz kimlik.
- `name`: Vendor adý; benzersizdir ve UI katmanýnda gösterilir.
- `makeCode`: Vendor için raporlama kodu.
- `slug`: JSON dostu benzersiz kýsa ad.

**Model**
- `vendorId`: Modele ait vendor kaydýný iþaret eder.
- `code`: Vendor içindeki model kodu (opsiyonel).
- `isTechpos`, `isAndroidPos`, `isOkcPos`: Frontend filtreleri için kullanýlan boolean bayraklar, SQLite içinde 0/1 olarak saklanýr.

**AppVersion**
- `vendorId`: Versiyonun hangi vendor ile iliþkili olduðunu gösterir.
- `versionNumber`: Versiyon etiketi (örnek deðer: v2.3.1).
- `deliveryDate`, `prodOnayDate`: Teslim ve üretim onayý tarihleri gibi süreç metrikleri.
- `status`: Versiyonun iþ akýþýndaki durumu.

**VersionModel**
- `versionId` ve `modelId`: Ayný versiyon birden fazla modele baðlanabildiði için çoktan çoða köprü oluþturur.

**Bulgu**
- `baslik`, `detayliAciklama`: Bulgunun kýsa baþlýðý ve opsiyonel açýklama metni.
- `bulguTipi`, `etkiSeviyesi`: Sýnýflandýrma alanlarý; frontend seçim kutularýný besler.
- `girenKullanici`: Kaydý oluþturan kullanýcý adý.
- `vendorTrackerNo`: Vendor tarafýndan verilen referans numarasý.
- `cozumVersiyonId`: Bulgunun hangi versiyon ile kapatýldýðýný gösteren opsiyonel foreign key.
- `status`: Varsayýlan deðer `Açýk`; süreçte Kapalý gibi farklý durumlara güncellenir.
- `cozumOnaylayanKullanici`, `cozumOnayTarihi`: Çözüm onay süreci bilgileri.

**BulguModel**
- Bir bulgunun etkilendiði modelleri tutan çoktan çoða köprü tablosu.

### Ýliþki diyagramý (metin)

```
Vendor (1) -> Model (n)
Vendor (1) -> AppVersion (n)
AppVersion (n) <-> Model (n)    via VersionModel
Bulgu (n) <-> Model (n)         via BulguModel
Bulgu (n) -> AppVersion (1)     cozumVersiyonId (opsiyonel)
```

### Veri bütünlüðü ve indeksler

- `Vendor.name` ve `Vendor.slug` UNIQUE kýsýtlarý çakýþmalarý engeller.
- `Model.vendorId`, `AppVersion.vendorId`, `VersionModel.versionId`/`modelId` ve `BulguModel.bulguId`/`modelId` foreign key ile korunur; `server.js` tarafýnda transaction kullanýmý iliþkili kayýtlarýn tutarlý kalmasýný saðlar.
- Çoktan çoða tablolarda birleþik PRIMARY KEY, ayný kombinasyonlarýn ikinci kez eklenmesini engeller.
- Boolean nitelikler (`isTechpos` vb.) integer olarak tutulur; 0 deðeri false, 1 deðeri true anlamýna gelir.
- Performans için `Model.vendorId`, `VersionModel.versionId` ve `BulguModel.bulguId` üzerinde indeksler önerilir; `dev.db` örnek veritabanýnda bu indeksler hazýr durumdadýr.

### CREATE TABLE referansý

Aþaðýdaki SQL komutlarý boþ bir veritabaný dosyasýný oluþturmak için kullanýlabilir.

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
    status TEXT DEFAULT 'Açýk',
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

- Sunucu tarafýnda bazý GET sorgularý `GROUP_CONCAT` ile iliþkili modelleri virgülle ayýrarak döner; frontend bu formatý hem liste göstermede hem de form doldurmada kullanýr.

## GeliÅŸtirme notlarÄ± & proje Ã¶zgÃ¼ gotchalar

- `dev.db` dosyasÄ± repository iÃ§inde yer alÄ±yorsa, Windows'ta aÃ§Ä±k dosya kilitleri nedeniyle `git merge` veya `git checkout` sÄ±rasÄ±nda "unable to unlink old 'dev.db'" gibi hatalar alabilirsiniz. Ã‡Ã¶zÃ¼m adÄ±mlarÄ±:

    1. Ã‡alÄ±ÅŸan sunucuyu durdurun (`npm stop` / Ctrl+C) veya `node server.js` Ã§alÄ±ÅŸÄ±yorsa kapatÄ±n.
    2. Gerekirse `dev.db`'yi yedekleyin:

```powershell
Copy-Item .\dev.db .\dev.db.bak -Force
```

    3. Merge / checkout iÅŸlemini tekrar deneyin.

- Ã‡ok adÄ±mlÄ± gÃ¼ncellemeler server tarafÄ±nda SQLite transaction (BEGIN/COMMIT/ROLLBACK) ile korunmuÅŸtur. Bu akÄ±ÅŸlarÄ± bozmamaya dikkat edin (Ã¶r. versiyon gÃ¼ncelleme ve bulgu gÃ¼ncelleme).

- Static dosyalar cache'lenmesin diye `server.js` statik middleware'de cache-control ve etag/lastModified devre dÄ±ÅŸÄ± bÄ±rakÄ±lmÄ±ÅŸ. TarayÄ±cÄ± caching ile ilgili hata ayÄ±klarken bunu unutmayÄ±n.

## DB debugging & inceleme

- Terminalde sqlite3 yÃ¼klÃ¼ ise:

```powershell
sqlite3 dev.db
.tables
.schema Vendor
SELECT * FROM Vendor LIMIT 10;
```

## KatkÄ±da bulunma

- KÃ¼Ã§Ã¼k bir proje; yeni bir Ã¶zellik eklemeden veya schema deÄŸiÅŸikliÄŸi yapmadan Ã¶nce lÃ¼tfen `server.js` ve `public/script.js`'deki ilgili akÄ±ÅŸÄ± kontrol edin.
- `dev.db` binary olduÄŸu iÃ§in PR'lerde dikkatli olun. EÄŸer schema veya baÅŸlangÄ±Ã§ verisi deÄŸiÅŸtirilecekse, `dev.db` yerine migration SQL veya `dev.db.bak` Ã¶nerisi ekleyin.

## SÄ±k karÅŸÄ±laÅŸÄ±lan sorunlar

- Sunucu baÅŸlatÄ±lamÄ±yor / `dev.db` kilitleniyor: yukarÄ±daki yedekleme/adÄ±mlarÄ± takip edin.
- API 400 hatasÄ±: eksik zorunlu alan veya yanlÄ±ÅŸ payload formatÄ± (JSON iÃ§inde array bekleniyor vs.). Frontend `Content-Type: application/json` ile gÃ¶nderiyor.
