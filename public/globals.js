// public/globals.js
// Bu dosya, uygulama genelinde sıkça kullanılan DOM elementlerini seçer ve
// diğer scriptlerin erişebilmesi için global değişkenler olarak tanımlar.
// Bu script'in diğerlerinden önce yüklenmesi gerekir.

const mainContent = document.getElementById('main-content');
const modalContainer = document.getElementById('modal-container');
const sidebarVendorList = document.getElementById('vendor-list');
const navLinks = {
    dashboard: document.getElementById('nav-dashboard'),
    bulgular: document.getElementById('nav-bulgular'),
    yonetim: document.getElementById('nav-yonetim'),
    functions: document.getElementById('nav-functions'),
};