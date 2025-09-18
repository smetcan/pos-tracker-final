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
let functionsData = [];
let usersData = [];
let bulgularData = [];
let bulguBreakdown = { byType: [], statusByType: [] };
let functionSupportTreeData = [];
let functionSupportMatrixData = { columns: [], rows: [] };
let activeFunctionSupportView = 'tree';

// --- Arayüz Durumları ---
// Yönetim panelindeki aktif sekmeyi takip eder.
let currentActiveTab = 'vendors';

// --- Sıralama Yapılandırmaları ---
// Yönetim panelindeki tablolar için sıralama durumunu tutar.
let vendorSort = { key: 'id', direction: 'asc' };
let modelSort = { key: 'vendorName', direction: 'asc' };
let versionSort = { key: 'versionNumber', direction: 'asc' };
let functionSort = { key: 'name', direction: 'asc' };

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
