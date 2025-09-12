# POS Takip Uygulaması - Kozmetik İyileştirme Görevleri

Bu dosya, uygulamadaki tüm modal pencereleri standart ve modern bir tasarıma kavuşturmak için kalan görevleri listeler.

## Tamamlananlar

- [x] **Bulgu Ekle/Düzenle** (`getBulguModalHTML`)
- [x] **Vendor Ekle/Düzenle** (`getVendorModalHTML`)
- [x] **Kişi Ekle/Düzenle** (`getContactSubModalHTML`)
- [x] **Model Ekle/Düzenle** (`getModelModalHTML`)
- [x] **Versiyon Ekle/Düzenle** (`getVersionModalHTML`)

## Yapılacaklar Listesi (To-Do)

### Görüntüleme Pencereleri

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

### Yardımcı Pencereler

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