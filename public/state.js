// public/state.js

// =================================================================
// STATE MANAGEMENT (Uygulamanın Genel Durum Yönetimi)
// =================================================================
// Bu dosya, uygulama genelinde kullanılan tüm değişkenleri ve
// veri setlerini merkezi bir yerde toplar.

// --- Veri Depolama ---
// API'dan çekilen ana verileri tutan diziler.
let vendorsData = [];
let modelsData = [];
let versionsData = [];
let usersData = [];
let bulgularData = [];

// --- Arayüz Durumları ---
// Yönetim panelindeki aktif sekmeyi takip eder.
let currentActiveTab = 'vendors';

// --- Sıralama Yapılandırmaları ---
// Yönetim panelindeki tablolar için sıralama durumunu tutar.
let vendorSort = { key: 'id', direction: 'asc' };
let modelSort = { key: 'vendorName', direction: 'asc' };

// --- Filtreleme Yapılandırmaları ---
// Sayfalardaki filtrelerin anlık değerlerini tutar.
let modelFilters = {
    searchTerm: '',
    vendorId: 'all',
    isTechpos: 'all',
    isAndroidPos: 'all',
    isOkcPos: 'all'
};

let bulguFilters = {
    searchTerm: '',
    vendorId: 'all',
    status: 'all',
    tip: 'all',
    currentPage: 1
};

let currentUser = null;