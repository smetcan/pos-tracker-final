// Sayfa tamamen yüklendiğinde bu fonksiyon çalışır
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SEÇİMLERİ ---
    const mainContent = document.getElementById('main-content');
    const modalContainer = document.getElementById('modal-container');
    const sidebarVendorList = document.getElementById('vendor-list');
    const navLinks = {
        dashboard: document.getElementById('nav-dashboard'),
        bulgular: document.getElementById('nav-bulgular'),
        yonetim: document.getElementById('nav-yonetim'),
    };

    // --- STATE MANAGEMENT (Durum Yönetimi) ---
    let currentActiveTab = 'vendors';
    let vendorsData = [];
    let modelsData = [];
    let versionsData = [];
    let bulgularData = [];
    let vendorSort = { key: 'id', direction: 'asc' };
    let modelSort = { key: 'vendorName', direction: 'asc' };
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
    currentPage: 1 // Bu satırı ekle
};

    // --- YARDIMCI FONKSİYONLAR ---
    async function apiRequest(url, options = {}) {
        try {
            const response = await fetch(url, options);
            const contentType = response.headers.get('content-type');
            if (!response.ok) {
                if (contentType?.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Bilinmeyen bir sunucu hatası.');
                } else {
                    const errorText = await response.text();
                    console.error("Sunucudan gelen beklenmedik yanıt:", errorText);
                    throw new Error('Sunucuyla iletişimde bir sorun oluştu.');
                }
            }
            if (response.status === 204 || !contentType?.includes('application/json')) return {};
            return response.json();
        } catch (error) {
            console.error('API isteği sırasında hata:', error);
            throw error;
        }
    }

    function showErrorModal(message) {
        modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
                <div class="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3 text-center">
                    <h3 class="text-lg leading-6 font-medium text-red-600">Bir Hata Oluştu</h3>
                    <p class="text-sm text-gray-600 mt-2 px-7 py-3">${message}</p>
                    <div class="items-center px-4 py-3">
                        <button id="close-error-modal" class="px-4 py-2 bg-gray-200 rounded-md">Kapat</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.getElementById('close-error-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');
    }

    function sortData(data, sortConfig) {
        const { key, direction } = sortConfig;
        return [...data].sort((a, b) => {
            const valA = a[key];
            const valB = b[key];
            let comparison = 0;
            if (valA > valB) { comparison = 1; } 
            else if (valA < valB) { comparison = -1; }
            return direction === 'asc' ? comparison : comparison * -1;
        });
    }

    async function loadSidebarVendors() {
        try {
            vendorsData = await apiRequest('/api/vendors');
            sidebarVendorList.innerHTML = vendorsData.map(vendor => `
                <a href="#/vendor/${vendor.id}" class="sidebar-link" data-vendor-id="${vendor.id}">${vendor.name}</a>
            `).join('');
            // Attach event listeners to newly created vendor links
            document.querySelectorAll('#vendor-list .sidebar-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.hash = `#/vendor/${link.dataset.vendorId}`;
                });
            });
        } catch (error) {
            showErrorModal('Vendor listesi yüklenirken hata oluştu: ' + error.message);
        }
    }

async function router() {
    const hash = window.location.hash;
    mainContent.innerHTML = '<h1 class="text-3xl font-bold">Yükleniyor...</h1>';
    navLinks.dashboard.classList.remove('active');
    navLinks.bulgular.classList.remove('active');
    navLinks.yonetim.classList.remove('active');
    document.querySelectorAll('#vendor-list .sidebar-link').forEach(link => link.classList.remove('active'));

    try {
        if (hash.startsWith('#/vendor/')) {
            const vendorId = hash.split('/')[2];
            const vendor = vendorsData.find(v => v.id == vendorId);
            if (!vendor) {
                mainContent.innerHTML = '<h1 class="text-3xl font-bold text-red-600">Vendor bulunamadı!</h1>';
                return;
            }
            document.querySelector(`.sidebar-link[data-vendor-id="${vendorId}"]`)?.classList.add('active');
            // Vendor sayfasında sayfalama şimdilik yok, tümünü getiriyoruz
            const [stats, bulgularResponse] = await Promise.all([
                apiRequest(`/api/vendors/${vendorId}/stats`),
                apiRequest(`/api/bulgular?vendorId=${vendorId}&limit=1000`) 
            ]);
            mainContent.innerHTML = getVendorDetailPageHTML(vendor, stats, bulgularResponse.data);
            attachBulguTableActionListeners(bulgularResponse.data); // Sadece tablo aksiyonları
        } else if (hash === '#/bulgular') {
            navLinks.bulgular.classList.add('active');
            const [vendors, models, versions] = await Promise.all([
                apiRequest('/api/vendors'),
                apiRequest('/api/models'),
                apiRequest('/api/versions')
            ]);
            vendorsData = vendors;
            modelsData = models;
            versionsData = versions;
            await fetchAndRenderBulgular({ page: 1 });
        } else if (hash === '#/yonetim') {
            navLinks.yonetim.classList.add('active');
            const [vendors, models, versions] = await Promise.all([
                apiRequest('/api/vendors'),
                apiRequest('/api/models'),
                apiRequest('/api/versions')
            ]);
            vendorsData = vendors;
            modelsData = models;
            versionsData = versions;
            mainContent.innerHTML = getYonetimHTML(vendors, models, versions, currentActiveTab);
            attachYonetimEventListeners();
        } else { // Varsayılan olarak ana sayfayı göster
            navLinks.dashboard.classList.add('active');
            const stats = await apiRequest('/api/dashboard');
            mainContent.innerHTML = getDashboardHTML(stats);
            renderDashboardCharts(stats);
        }
    } catch (error) {
        showErrorModal('Sayfa yüklenirken hata oluştu: ' + error.message);
        mainContent.innerHTML = '<h1 class="text-3xl font-bold text-red-600">Bir hata oluştu!</h1><p>' + error.message + '</p>';
    }
}

    // --- HTML TEMPLATE FUNCTIONS ---

    function getDashboardHTML(stats) { 
        const { totalBulgular, openBulgular, testBulgular, closedBulgular, sonBulgular, openBulguByVendor } = stats;
        const statCards = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-sm font-medium text-gray-500">Toplam Bulgu</h3><p class="mt-2 text-3xl font-bold">${totalBulgular}</p></div>
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-sm font-medium text-gray-500">Açık Bulgular</h3><p class="mt-2 text-3xl font-bold text-red-600">${openBulgular}</p></div>
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-sm font-medium text-gray-500">Test Edilecekler</h3><p class="mt-2 text-3xl font-bold text-blue-600">${testBulgular}</p></div>
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-sm font-medium text-gray-500">Kapalı Bulgular</h3><p class="mt-2 text-3xl font-bold text-gray-600">${closedBulgular}</p></div>
            </div>
        `;
        const recentFindingsList = sonBulgular.map(b => `
            <li class="flex items-center justify-between py-3 border-b last:border-none">
                <div>
                    <a href="#" class="view-bulgu-btn font-semibold text-blue-600 hover:underline" data-bulgu-id="${b.id}">${b.baslik}</a>
                    <p class="text-sm text-gray-500">${b.vendorName || ''}</p>
                </div>
                <span class="text-sm px-2 py-1 rounded-full ${b.status === 'Açık' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">${b.status}</span>
            </li>`).join('');
        const openByVendorList = openBulguByVendor.map(v => `
             <li class="flex items-center justify-between py-2 border-b last:border-none">
                <span class="text-sm font-medium">${v.name}</span>
                <span class="font-bold">${v.count}</span>
            </li>
        `).join('');
        return `
            <h1 class="text-3xl font-bold mb-6">Ana Sayfa</h1>
            ${statCards}
            <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h3 class="font-semibold text-lg mb-4">Son Eklenen Bulgular</h3>
                    <ul class="divide-y divide-gray-200">${recentFindingsList}</ul>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="font-semibold text-lg mb-4">Vendor'a Göre Açık Bulgular</h3>
                    <ul class="divide-y divide-gray-200">${openByVendorList.length > 0 ? openByVendorList : '<p class="text-sm text-gray-500">Açık bulgu yok.</p>'}</ul>
                </div>
            </div>
            <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="bg-white p-6 rounded-lg shadow-md flex flex-col h-96">
                    <h3 class="font-semibold text-lg mb-4 flex-shrink-0">Bulgu Durum Dağılımı</h3>
                    <div class="relative flex-grow">
                        <canvas id="statusPieChart"></canvas>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md flex flex-col h-96">
                    <h3 class="font-semibold text-lg mb-4 flex-shrink-0">Vendor Bazında Bulgu Sayısı</h3>
                    <div class="relative flex-grow">
                        <canvas id="vendorBarChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    function getBulgularTableHTML(bulgular) {
        const getBadgeClass = (text) => {
             switch (text) {
                case "Açık": case "Yüksek": case "Program Hatası": return 'bg-red-100 text-red-800';
                case "Test Edilecek": case "Yeni Talep": return 'bg-blue-100 text-blue-800';
                case "Orta": return 'bg-yellow-100 text-yellow-800';
                case "Kapalı": case "Düşük": return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        };
        const bulgularTableRows = bulgular.map(bulgu => {
            const vendorName = bulgu.vendorName || (vendorsData.find(v => v.id == bulgu.vendorId)?.name) || '';
            const versionName = bulgu.cozumVersiyonId ? (versionsData.find(v => v.id == bulgu.cozumVersiyonId)?.versionNumber || '') : '';
            let affectedModelsArray = [];
            if (bulgu.modelIds) {
                const ids = (typeof bulgu.modelIds === 'string') ? bulgu.modelIds.split(',').map(s => s.trim()) : bulgu.modelIds;
                affectedModelsArray = ids.map(id => modelsData.find(m => String(m.id) === String(id))?.name).filter(Boolean);
            }
            if (!affectedModelsArray.length && bulgu.models) {
                affectedModelsArray = (typeof bulgu.models === 'string') ? bulgu.models.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(bulgu.models) ? bulgu.models : []);
            }
            const chunkArray = (arr, size) => {
                const res = [];
                for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
                return res;
            };
            const formattedModelsHtml = (affectedModelsArray.length > 0) ? chunkArray(affectedModelsArray, 4).map(group => `<div class="mb-1">${group.map(m => `<span class="inline-block mr-2 text-xs text-gray-700">${m}</span>`).join('')}</div>`).join('') : '-';
            const tespit = bulgu.tespitTarihi || '';
            const onaylayan = bulgu.cozumOnaylayanKullanici || '';
            const onayTarihi = bulgu.cozumOnayTarihi || '';
            return `
            <tr class="border-b">
                <td class="p-3 text-sm text-gray-500"><a href="#" class="view-bulgu-btn text-blue-600" data-bulgu-id="${bulgu.id}">#${bulgu.id}</a></td>
                <td class="p-3 font-medium">${bulgu.baslik}</td>
                <td class="p-3 text-sm text-gray-600">${vendorName}</td>
                <td class="p-3 text-sm text-gray-600">${versionName || '-'}</td>
                <td class="p-3 text-xs text-gray-500">${formattedModelsHtml}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(bulgu.bulguTipi)}">${bulgu.bulguTipi}</span></td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(bulgu.etkiSeviyesi)}">${bulgu.etkiSeviyesi}</span></td>
                <td class="p-3 text-sm text-gray-600">${tespit}</td>
                <td class="p-3 text-sm text-gray-600">${onaylayan}</td>
                <td class="p-3 text-sm text-gray-600">${onayTarihi}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(bulgu.status)}">${bulgu.status}</span></td>
                <td class="p-3 text-right">
                    <button class="edit-bulgu-btn p-1 text-sm text-blue-600" data-bulgu-id="${bulgu.id}">Düzenle</button>
                    <button class="delete-bulgu-btn p-1 text-sm text-red-600" data-bulgu-id="${bulgu.id}" data-bulgu-baslik="${bulgu.baslik}">Sil</button>
                </td>
            </tr>
        `}).join('');

        return `
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <div class="rounded-md border overflow-x-auto">
                        <table class="w-full text-sm min-w-[1100px]">
                            <thead>
                                <tr class="border-b bg-gray-50">
                                    <th class="p-3 text-left">ID</th>
                                    <th class="p-3 text-left">Başlık</th>
                                    <th class="p-3 text-left">Vendor</th>
                                    <th class="p-3 text-left">Çözüm Beklenen Versiyon</th>
                                    <th class="p-3 text-left">Modeller</th>
                                    <th class="p-3 text-left">Tip</th>
                                    <th class="p-3 text-left">Etki</th>
                                    <th class="p-3 text-left">Tespit Tarihi</th>
                                    <th class="p-3 text-left">Onaylayan Kişi</th>
                                    <th class="p-3 text-left">Onay Tarihi</th>
                                    <th class="p-3 text-left">Durum</th>
                                    <th class="p-3 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>${bulgularTableRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

function getBulgularPageHTML(bulgular, pagination = {}) {
    const { currentPage, totalPages, totalRecords } = pagination;

    const paginationHTML = totalPages > 1 ? `
        <div class="flex justify-between items-center mt-4">
            <button id="prev-page-btn" class="px-4 py-2 bg-gray-300 text-sm font-medium rounded-md" ${currentPage === 1 ? 'disabled' : ''}>Önceki</button>
            <span class="text-sm text-gray-700">${totalPages} sayfadan ${currentPage}. sayfa gösteriliyor</span>
            <button id="next-page-btn" class="px-4 py-2 bg-gray-300 text-sm font-medium rounded-md" ${currentPage === totalPages ? 'disabled' : ''}>Sonraki</button>
        </div>
    ` : '';

    const vendorFilterOptions = [{ id: 'all', name: 'Tümü' }].concat(vendorsData.map(v => ({ id: v.id, name: v.name }))).map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    const statusOptions = ['all', 'Açık', 'Test Edilecek', 'Kapalı'].map(s => `<option value="${s}">${s === 'all' ? 'Tümü' : s}</option>`).join('');
    const tipOptionsFilter = ['all', 'Program Hatası', 'Yeni Talep'].map(t => `<option value="${t}">${t === 'all' ? 'Tümü' : t}</option>`).join('');

    return `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-3xl font-bold">Bulgu Takibi</h1>
                <p class="text-gray-500">Tüm program hatalarını ve yeni talepleri buradan yönetebilirsiniz. (${totalRecords || 0} kayıt)</p>
            </div>
            <div class="flex items-center gap-2">
                <button id="import-bulgu-btn" class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md">İçeri Aktar</button>
                <button id="add-bulgu-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Bulgu/Talep Ekle</button>
            </div>
        </div>
        <div class="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
             <div class="md:col-span-1">
                <label class="text-xs text-gray-500">Ara (Başlık / Açıklama)</label>
                <input id="bulgu-search-input" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="Ara..." value="${bulguFilters.searchTerm}">
            </div>
            <div>
                <label class="text-xs text-gray-500">Vendor</label>
                <select id="bulgu-vendor-filter" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">${vendorFilterOptions}</select>
            </div>
            <div>
                <label class="text-xs text-gray-500">Durum</label>
                <select id="bulgu-status-filter" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">${statusOptions}</select>
            </div>
            <div>
                <label class="text-xs text-gray-500">Kayıt Tipi</label>
                <select id="bulgu-tip-filter" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">${tipOptionsFilter}</select>
            </div>
            <div>
                <button id="clear-bulgu-filters-btn" class="w-full px-4 py-2 bg-gray-200 text-sm font-medium rounded-md">Temizle</button>
            </div>
        </div>
        ${getBulgularTableHTML(bulgular)}
        ${paginationHTML}
    `;
}

    function getVendorDetailPageHTML(vendor, stats, bulgular) {
        const statCards = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-sm font-medium text-gray-500">Toplam Bulgu</h3><p class="mt-2 text-3xl font-bold">${stats.total}</p></div>
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-sm font-medium text-gray-500">Açık Bulgular</h3><p class="mt-2 text-3xl font-bold text-red-600">${stats.open}</p></div>
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-sm font-medium text-gray-500">Test Edilecekler</h3><p class="mt-2 text-3xl font-bold text-blue-600">${stats.test}</p></div>
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-sm font-medium text-gray-500">Kapalı Bulgular</h3><p class="mt-2 text-3xl font-bold text-gray-600">${stats.closed}</p></div>
            </div>
        `;

        return `
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-3xl font-bold">${vendor.name}</h1>
                    <p class="text-gray-500">Vendor'a özel bulgu ve istatistikler.</p>
                </div>
            </div>
            ${statCards}
            <div class="mt-8">
                ${getBulgularTableHTML(bulgular)}
            </div>
        `;
    }

    function getYonetimHTML(vendors, models, versions, activeTab) {
        const getSortIcon = (sortState, key) => (sortState.key !== key) ? '<span>&nbsp;</span>' : (sortState.direction === 'asc' ? '▲' : '▼');
        const boolToText = (value) => value ? 'Evet' : 'Hayır';
        const vendorsTableRows = vendors.map(vendor => `
            <tr class="border-b"><td class="p-3 font-medium">${vendor.name}</td><td class="p-3">${vendor.makeCode}</td><td class="p-3 text-right">
                <button class="open-contacts-btn px-2 py-1 mr-2 bg-gray-100 rounded text-sm text-gray-700" data-vendor-id="${vendor.id}">İletişim</button>
                <button class="edit-vendor-btn p-1 text-sm text-blue-600" data-vendor-id="${vendor.id}">Düzenle</button>
                <button class="delete-vendor-btn p-1 text-sm text-red-600" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}">Sil</button>
            </td></tr>`).join('');
        const modelsTableRows = models.map(model => `
            <tr class="border-b">
                <td class="p-3 font-medium">${model.name}</td><td class="p-3">${model.code || ''}</td>
                <td class="p-3">${model.vendorName}</td>
                <td class="p-3 text-center">${boolToText(model.isTechpos)}</td>
                <td class="p-3 text-center">${boolToText(model.isAndroidPos)}</td>
                <td class="p-3 text-center">${boolToText(model.isOkcPos)}</td>
                <td class="p-3 text-right">
                    <button class="edit-model-btn p-1 text-sm text-blue-600" data-model-id="${model.id}">Düzenle</button>
                    <button class="delete-model-btn p-1 text-sm text-red-600" data-model-id="${model.id}" data-model-name="${model.name}">Sil</button>
                </td>
            </tr>`).join('');
        const versionsTableRows = versions.map(version => {
            const statusClass = version.status === 'Prod' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
            return `
             <tr class="border-b"><td class="p-3 font-medium"><a href="#" class="view-version-link text-blue-600" data-version-id="${version.id}">${version.versionNumber}</a></td><td class="p-3">${version.vendorName}</td><td class="p-3">${version.deliveryDate}</td><td class="p-3 text-xs text-gray-600">${version.models || ''}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${version.status}</span></td><td class="p-3">${version.prodOnayDate || '-'}</td>
                <td class="p-3 text-right">
                    <button class="edit-version-btn p-1 text-sm text-blue-600" data-version-id="${version.id}">Düzenle</button>
                    <button class="delete-version-btn p-1 text-sm text-red-600" data-version-id="${version.id}" data-version-number="${version.versionNumber}">Sil</button>
                </td></tr>`;
        }).join('');
        const modelFilterBarHTML = `
            <div class="flex flex-wrap items-center gap-2 mb-4 p-4 border rounded-md bg-gray-50">
                <input id="model-search-input" type="text" placeholder="Model adı/kodu ara..." class="flex-grow px-3 py-2 text-sm border border-gray-300 rounded-md" style="min-width: 200px;">
                <select id="model-vendor-filter" class="px-3 py-2 text-sm border border-gray-300 rounded-md">
                    <option value="all">Tüm Vendorlar</option>
                    ${vendors.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
                </select>
                <select id="model-techpos-filter" class="px-3 py-2 text-sm border border-gray-300 rounded-md">
                    <option value="all">TechPOS (Tümü)</option><option value="1">Evet</option><option value="0">Hayır</option>
                </select>
                <select id="model-android-filter" class="px-3 py-2 text-sm border border-gray-300 rounded-md">
                    <option value="all">Android (Tümü)</option><option value="1">Evet</option><option value="0">Hayır</option>
                </select>
                <select id="model-okc-filter" class="px-3 py-2 text-sm border border-gray-300 rounded-md">
                    <option value="all">ÖKC (Tümü)</option><option value="1">Evet</option><option value="0">Hayır</option>
                </select>
                <button id="clear-model-filters-btn" class="px-3 py-2 text-sm border bg-gray-200 hover:bg-gray-300 rounded-md">Temizle</button>
            </div>
        `;
        return `
            <h1 class="text-3xl font-bold mb-6">Yönetim Paneli</h1>
            <div class="bg-white rounded-lg shadow">
                <div class="border-b"><nav class="-mb-px flex space-x-6 px-6">
                    <button class="tab-btn py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'vendors' ? 'active' : ''}" data-tab="vendors">Vendorlar</button>
                    <button class="tab-btn py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'models' ? 'active' : ''}" data-tab="models">Modeller</button>
                    <button class="tab-btn py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'versions' ? 'active' : ''}" data-tab="versions">Versiyonlar</button>
                </nav></div>
                <div class="p-6">
                    <div id="vendors-tab" class="tab-content ${activeTab === 'vendors' ? 'active' : ''}">
                        <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Vendor Tanımları</h2><button id="add-vendor-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Vendor Ekle</button></div>
                        <div class="rounded-md border"><table class="w-full text-sm"><thead><tr class="border-b">
                            <th class="p-3 text-left sortable-header" data-table="vendors" data-sort-key="name">Vendor Adı ${getSortIcon(vendorSort, 'name')}</th>
                            <th class="p-3 text-left sortable-header" data-table="vendors" data-sort-key="makeCode">Vendor Kodu ${getSortIcon(vendorSort, 'makeCode')}</th>
                            <th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${vendorsTableRows}</tbody></table></div>
                    </div>
                    <div id="models-tab" class="tab-content ${activeTab === 'models' ? 'active' : ''}">
                         <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Model Tanımları</h2><button id="add-model-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Model Ekle</button></div>
                         ${modelFilterBarHTML}
                        <div class="rounded-md border"><table class="w-full text-sm"><thead><tr class="border-b">
                            <th class="p-3 text-left sortable-header" data-table="models" data-sort-key="name">Model Adı ${getSortIcon(modelSort, 'name')}</th>
                            <th class="p-3 text-left sortable-header" data-table="models" data-sort-key="code">Model Kodu ${getSortIcon(modelSort, 'code')}</th>
                            <th class="p-3 text-left sortable-header" data-table="models" data-sort-key="vendorName">Vendor ${getSortIcon(modelSort, 'vendorName')}</th>
                            <th class="p-3 text-center">TechPOS</th>
                            <th class="p-3 text-center">Android</th>
                            <th class="p-3 text-center">ÖKC</th>
                            <th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${modelsTableRows}</tbody></table></div>
                    </div>
                    <div id="versions-tab" class="tab-content ${activeTab === 'versions' ? 'active' : ''}">
                        <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Versiyon Tanımları</h2><button id="add-version-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Versiyon Ekle</button></div>
                        <div class="rounded-md border"><table class="w-full text-sm"><thead><tr class="border-b">
                            <th class="p-3 text-left">Versiyon No</th><th class="p-3 text-left">Vendor</th><th class="p-3 text-left">Teslim Tarihi</th><th class="p-3 text-left">Geçerli Modeller</th>
                            <th class="p-3 text-left">Durum</th><th class="p-3 text-left">Prod Onay Tarihi</th>
                            <th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${versionsTableRows}</tbody></table></div>
                    </div>
                </div>
            </div>`;
    }
    
    function getVendorModalHTML(vendor = {}, contacts = []) {
    const isEdit = vendor.id !== undefined;
    const title = isEdit ? 'Vendor Düzenle' : 'Yeni Vendor Ekle';
    
    // Sadece düzenleme modundaysa iletişim kişileri HTML'ini oluştur
    const contactsSectionHTML = isEdit ? `
        <div class="mt-6">
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-semibold text-gray-800">İletişim Kişileri</h4>
                <button id="add-new-contact-btn" class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-md hover:bg-blue-200">Yeni Ekle</button>
            </div>
            <div id="vendor-contacts-container" class="border rounded-md bg-gray-50 max-h-48 overflow-y-auto">
                ${contacts.length > 0 ? contacts.map(contact => `
                    <div class="flex justify-between items-center p-2 border-t">
                        <div>
                            <p class="font-medium text-sm">${contact.name} ${contact.preferred ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Birincil</span>' : ''}</p>
                            <p class="text-xs text-gray-500">${contact.email || ''} ${contact.phone || ''}</p>
                        </div>
                        <div>
                            <button class="edit-contact-btn text-blue-600 hover:underline text-sm mr-2" data-contact-id="${contact.id}">Düzenle</button>
                            <button class="delete-contact-btn text-red-600 hover:underline text-sm" data-contact-id="${contact.id}">Sil</button>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500 p-3 border-t text-center">İletişim kişisi bulunmuyor.</p>'}
            </div>
        </div>
    ` : '';

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-75 h-full w-full flex items-center justify-center z-50 p-4">
            <div class="relative bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all flex flex-col max-h-full">
                <div class="relative flex items-center justify-center p-4 border-b rounded-t-md bg-gray-50">
                    <h3 class="text-xl font-semibold text-gray-800">${title}</h3>
                    <button type="button" class="cancel-modal-btn absolute top-3 right-4 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto">
                    <form id="vendor-form" class="space-y-4">
                        <input type="hidden" id="vendor-id" value="${vendor.id || ''}">
                        <div class="grid grid-cols-2 gap-x-6">
                            <div>
                                <label for="vendor-name" class="block text-sm font-medium">Vendor Adı</label>
                                <input type="text" id="vendor-name" value="${vendor.name || ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                            </div>
                            <div>
                                <label for="vendor-make-code" class="block text-sm font-medium">Vendor Kodu</label>
                                <input type="text" id="vendor-make-code" value="${vendor.makeCode || ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                            </div>
                        </div>
                    </form>
                    ${contactsSectionHTML}
                </div>
                <div class="flex items-center justify-end p-4 border-t rounded-b-md bg-gray-50 gap-2">
                    <button type="button" class="cancel-modal-btn px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium">İptal</button>
                    <button type="submit" form="vendor-form" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">${isEdit ? 'Değişiklikleri Kaydet' : 'Kaydet'}</button>
                </div>
            </div>
        </div>`;
}

    function getContactSubModalHTML(vendor, contact = {}) {
    const isEdit = contact.id !== undefined;
    const title = isEdit ? 'Kişi Düzenle' : 'Yeni Kişi Ekle';
    
    return `
        <div id="contact-sub-modal" class="fixed inset-0 bg-gray-800 bg-opacity-75 h-full w-full flex items-center justify-center z-50 p-4">
            <div class="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all flex flex-col">

                <div class="relative flex items-center justify-center p-4 border-b rounded-t-md bg-gray-50">
                    <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
                    <button type="button" class="cancel-contact-sub-modal absolute top-3 right-4 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>

                <div class="p-6">
                    <form id="contact-form" class="space-y-4">
                        <input type="hidden" id="contact-id" value="${contact.id || ''}">
                        <input type="hidden" id="contact-vendor-id" value="${vendor.id}">
                        <div>
                            <label for="contact-name" class="block text-sm font-medium">İsim</label>
                            <input type="text" id="contact-name" value="${contact.name || ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                        </div>
                        <div>
                            <label for="contact-email" class="block text-sm font-medium">E-posta</label>
                            <input type="email" id="contact-email" value="${contact.email || ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                        </div>
                        <div>
                            <label for="contact-phone" class="block text-sm font-medium">Telefon</label>
                            <input type="tel" id="contact-phone" value="${contact.phone || ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                        </div>
                        <div class="pt-2">
                            <div class="flex items-center">
                                <input type="checkbox" id="contact-preferred" class="h-4 w-4 rounded border-gray-300" ${contact.preferred ? 'checked' : ''}>
                                <label for="contact-preferred" class="ml-2 block text-sm">Birincil iletişim kişisi yap</label>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="flex items-center justify-end p-4 border-t rounded-b-md bg-gray-50 gap-2">
                    <button type="button" class="cancel-contact-sub-modal px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium">İptal</button>
                    <button type="submit" form="contact-form" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">${isEdit ? 'Güncelle' : 'Ekle'}</button>
                </div>

            </div>
        </div>`;
}

    function getModelModalHTML(vendors, model = {}) {
    const isEdit = model.id !== undefined;
    const title = isEdit ? 'Model Düzenle' : 'Yeni Model Ekle';
    const vendorOptions = vendors.map(v => `<option value="${v.id}" ${model.vendorId == v.id ? 'selected' : ''}>${v.name}</option>`).join('');

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-75 h-full w-full flex items-center justify-center z-50 p-4">
            <div class="relative bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all flex flex-col max-h-full">
                
                <div class="relative flex items-center justify-center p-4 border-b rounded-t-md bg-gray-50">
                    <h3 class="text-xl font-semibold text-gray-800">${title}</h3>
                    <button type="button" class="cancel-modal-btn absolute top-3 right-4 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>

                <div class="p-6 overflow-y-auto">
                    <form id="model-form" class="space-y-4">
                        <input type="hidden" id="model-id" value="${model.id || ''}">
                        <div>
                            <label for="model-name" class="block text-sm font-medium text-gray-700">Model Adı</label>
                            <input type="text" id="model-name" name="name" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${model.name || ''}" required>
                        </div>
                        <div>
                            <label for="model-code" class="block text-sm font-medium text-gray-700">Model Kodu</label>
                            <input type="text" id="model-code" name="code" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${model.code || ''}" required>
                        </div>
                        <div>
                            <label for="model-vendor-id" class="block text-sm font-medium text-gray-700">Vendor</label>
                            <select id="model-vendor-id" name="vendorId" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>
                                <option value="">Seçiniz...</option>
                                ${vendorOptions}
                            </select>
                        </div>
                        <div class="space-y-2 pt-2">
                            <div class="flex items-center">
                                <input type="checkbox" id="model-is-techpos" name="isTechpos" class="h-4 w-4 rounded border-gray-300" ${model.isTechpos ? 'checked' : ''}>
                                <label for="model-is-techpos" class="ml-2 block text-sm text-gray-900">TechPOS mu?</label>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="model-is-android-pos" name="isAndroidPos" class="h-4 w-4 rounded border-gray-300" ${model.isAndroidPos ? 'checked' : ''}>
                                <label for="model-is-android-pos" class="ml-2 block text-sm text-gray-900">Android POS mu?</label>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="model-is-okc-pos" name="isOkcPos" class="h-4 w-4 rounded border-gray-300" ${model.isOkcPos ? 'checked' : ''}>
                                <label for="model-is-okc-pos" class="ml-2 block text-sm text-gray-900">ÖKC POS mu?</label>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="flex items-center justify-end p-4 border-t rounded-b-md bg-gray-50 gap-2">
                    <button type="button" class="cancel-modal-btn px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium">İptal</button>
                    <button type="submit" form="model-form" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">${isEdit ? 'Değişiklikleri Kaydet' : 'Kaydet'}</button>
                </div>
            </div>
        </div>`;
}

    function getBulguViewModalHTML(bulgu) {
        const vendorName = vendorsData.find(v => v.id == bulgu.vendorId)?.name || '';
        const versionName = versionsData.find(v => v.id == bulgu.cozumVersiyonId)?.versionNumber || '';
        let affectedModelsArray = [];
        if (bulgu.modelIds) {
            const ids = (typeof bulgu.modelIds === 'string') ? bulgu.modelIds.split(',').map(s => s.trim()) : bulgu.modelIds;
            affectedModelsArray = ids.map(id => modelsData.find(m => String(m.id) === String(id))?.name).filter(Boolean);
        }
        const modelsHtml = affectedModelsArray.length > 0 ? affectedModelsArray.map(m => `<span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">${m}</span>`).join('') : '-';

        return `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
                <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                    <h3 class="text-xl leading-6 font-medium text-gray-900 mb-4">Bulgu Detayları: #${bulgu.id} - ${bulgu.baslik}</h3>
                    <div class="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-4">
                        <div><strong>Vendor:</strong> ${vendorName}</div>
                        <div><strong>Bulgu Tipi:</strong> ${bulgu.bulguTipi}</div>
                        <div><strong>Etki Seviyesi:</strong> ${bulgu.etkiSeviyesi}</div>
                        <div><strong>Tespit Tarihi:</strong> ${bulgu.tespitTarihi}</div>
                        <div><strong>Durum:</strong> ${bulgu.status}</div>
                        <div><strong>Çözüm Versiyon:</strong> ${versionName || '-'}</div>
                        <div><strong>Giren Kullanıcı:</strong> ${bulgu.girenKullanici || '-'}</div>
                        <div><strong>Vendor Takip No:</strong> ${bulgu.vendorTrackerNo || '-'}</div>
                        <div><strong>Çözüm Onaylayan:</strong> ${bulgu.cozumOnaylayanKullanici || '-'}</div>
                        <div><strong>Çözüm Onay Tarihi:</strong> ${bulgu.cozumOnayTarihi || '-'}</div>
                    </div>
                    <div class="mb-4">
                        <strong>Etkilenen Modeller:</strong>
                        <div class="mt-2">${modelsHtml}</div>
                    </div>
                    <div class="mb-4">
                        <strong>Detaylı Açıklama:</strong>
                        <p class="mt-2 p-3 bg-gray-100 rounded-md whitespace-pre-wrap">${bulgu.detayliAciklama || '-'}</p>
                    </div>
                    <div class="items-center px-4 py-3 text-right">
                        <button type="button" data-close-bulgu-view class="px-4 py-2 bg-gray-200 rounded-md">Kapat</button>
                    </div>
                </div>
            </div>`;
    }

    function getVersionViewModalHTML(version) {
    const modelsHtml = version.models
        ? version.models.split(',').map(m => `<span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">${m.trim()}</span>`).join('')
        : '-';

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
            <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white overflow-y-auto max-h-[90vh]">
                <h3 class="text-xl leading-6 font-medium text-gray-900 mb-4">Versiyon Detayları: ${version.versionNumber}</h3>
                <div class="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-4">
                    <div><strong>Vendor:</strong> ${version.vendorName}</div>
                    <div><strong>Teslim Tarihi:</strong> ${version.deliveryDate || '-'}</div>
                    <div><strong>Durum:</strong> <span class="px-2 py-1 text-xs font-medium rounded-full ${version.status === 'Prod' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${version.status}</span></div>
                    <div><strong>Prod Onay Tarihi:</strong> ${version.prodOnayDate || '-'}</div>
                </div>
                <div class="mb-4">
                    <strong>Geçerli Modeller:</strong>
                    <div class="mt-2">${modelsHtml}</div>
                </div>
                <div class="mb-4">
                    <strong>Bug/İstek Tarihçesi:</strong>
                    <p class="mt-2 p-3 bg-gray-100 rounded-md whitespace-pre-wrap">${version.bugIstekTarihcesi || '-'}</p>
                </div>
                <div class="mb-4">
                    <strong>Ekler:</strong>
                    <p class="mt-2 p-3 bg-gray-100 rounded-md whitespace-pre-wrap">${version.ekler || '-'}</p>
                </div>
                <div class="items-center px-4 py-3 text-right">
                    <button type="button" class="close-modal-btn px-4 py-2 bg-gray-200 rounded-md">Kapat</button>
                </div>
            </div>
        </div>`;
}

function getBulguModalHTML(vendors, models, versions, bulgu = {}) {
    const isEdit = bulgu.id !== undefined;
    const title = isEdit ? 'Bulgu/Talep Düzenle' : 'Yeni Bulgu/Talep Ekle';
    
    const selectedVendorId = bulgu.vendorId || '';
    const selectedModelIds = (bulgu.modelIds && typeof bulgu.modelIds === 'string') ? bulgu.modelIds.split(',').map(s => s.trim()) : (bulgu.modelIds || []);
    const selectedCozumVersiyonId = bulgu.cozumVersiyonId || '';

    const vendorOptions = vendors.map(v => `<option value="${v.id}" ${selectedVendorId == v.id ? 'selected' : ''}>${v.name}</option>`).join('');
    
    const filteredVersions = isEdit ? versions.filter(v => v.vendorId == selectedVendorId) : [];
    const versionOptions = filteredVersions.map(v => `<option value="${v.id}" ${selectedCozumVersiyonId == v.id ? 'selected' : ''}>${v.versionNumber}</option>`).join('');

    const statusOptions = ['Açık', 'Test Edilecek', 'Kapalı'].map(s => `<option value="${s}" ${bulgu.status === s ? 'selected' : ''}>${s}</option>`).join('');
    const bulguTipiOptions = ['Program Hatası', 'Yeni Talep'].map(t => `<option value="${t}" ${bulgu.bulguTipi === t ? 'selected' : ''}>${t}</option>`).join('');
    const etkiSeviyesiOptions = ['Düşük', 'Orta', 'Yüksek'].map(e => `<option value="${e}" ${bulgu.etkiSeviyesi === e ? 'selected' : ''}>${e}</option>`).join('');

    const filteredModels = isEdit ? models.filter(m => m.vendorId == selectedVendorId) : [];
    const modelCheckboxesHTML = filteredModels.map(m => `
        <div class="flex items-center">
            <input type="checkbox" id="model-${m.id}" value="${m.id}" class="h-4 w-4 rounded border-gray-300 model-checkbox" ${selectedModelIds.includes(String(m.id)) ? 'checked' : ''}>
            <label for="model-${m.id}" class="ml-2 block text-sm text-gray-900">${m.name}</label>
        </div>
    `).join('');

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-75 h-full w-full flex items-center justify-center z-50 p-4">
            <div class="relative bg-white rounded-lg shadow-xl w-full max-w-3xl transform transition-all flex flex-col max-h-full">
                
                <div class="relative flex items-center justify-center p-4 border-b rounded-t-md bg-gray-50">
                    <h3 class="text-xl font-semibold text-gray-800">${title}</h3>
                    <button type="button" class="cancel-modal-btn absolute top-3 right-4 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>

                <div class="p-6 overflow-y-auto">
                    <form id="bulgu-form" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <label for="bulgu-baslik" class="block text-sm font-medium text-gray-700">Başlık</label>
                                <input type="text" id="bulgu-baslik" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.baslik || ''}" required>
                            </div>
                            <div>
                                <label for="bulgu-vendor-id" class="block text-sm font-medium text-gray-700">Vendor</label>
                                <select id="bulgu-vendor-id" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Seçiniz...</option>
                                    ${vendorOptions}
                                </select>
                            </div>
                            <div>
                                <label for="bulgu-tipi" class="block text-sm font-medium text-gray-700">Bulgu Tipi</label>
                                <select id="bulgu-tipi" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>${bulguTipiOptions}</select>
                            </div>
                            <div>
                                <label for="bulgu-etki-seviyesi" class="block text-sm font-medium text-gray-700">Etki Seviyesi</label>
                                <select id="bulgu-etki-seviyesi" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>${etkiSeviyesiOptions}</select>
                            </div>
                             <div>
                                <label for="bulgu-tespit-tarihi" class="block text-sm font-medium text-gray-700">Tespit Tarihi</label>
                                <input type="date" id="bulgu-tespit-tarihi" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.tespitTarihi || ''}" required>
                            </div>
                            <div>
                                <label for="bulgu-status" class="block text-sm font-medium text-gray-700">Durum</label>
                                <select id="bulgu-status" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" ${!isEdit ? 'disabled' : ''}>${statusOptions}</select>
                            </div>
                             <div>
                                <label for="bulgu-cozum-versiyon-id" class="block text-sm font-medium text-gray-700">Çözüm Beklenen Versiyon</label>
                                <select id="bulgu-cozum-versiyon-id" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                                    <option value="">Önce vendor seçin...</option>
                                    ${versionOptions}
                                </select>
                            </div>
                            <div>
                                <label for="bulgu-vendor-tracker-no" class="block text-sm font-medium text-gray-700">Vendor Takip No</label>
                                <input type="text" id="bulgu-vendor-tracker-no" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.vendorTrackerNo || ''}">
                            </div>
                             <div>
                                <label for="bulgu-giren-kullanici" class="block text-sm font-medium text-gray-700">Giren Kullanıcı</label>
                                <input type="text" id="bulgu-giren-kullanici" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.girenKullanici || ''}">
                            </div>
                        </div>
                        <div id="onay-fields-container" class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 ${bulgu.status === 'Kapalı' ? '' : 'hidden'}">
                            <div>
                                <label for="bulgu-cozum-onaylayan-kullanici" class="block text-sm font-medium text-gray-700">Çözüm Onaylayan Kullanıcı</label>
                                <input type="text" id="bulgu-cozum-onaylayan-kullanici" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.cozumOnaylayanKullanici || ''}">
                            </div>
                            <div>
                                <label for="bulgu-cozum-onay-tarihi" class="block text-sm font-medium text-gray-700">Çözüm Onay Tarihi</label>
                                <input type="date" id="bulgu-cozum-onay-tarihi" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.cozumOnayTarihi || ''}">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Etkilenen Modeller</label>
                            <div class="mt-1 border rounded-md p-2">
                                 <div class="flex items-center border-b pb-2 mb-2">
                                    <input type="checkbox" id="select-all-models" class="h-4 w-4 rounded border-gray-300">
                                    <label for="select-all-models" class="ml-2 block text-sm font-medium text-gray-900">Hepsini Seç / Bırak</label>
                                </div>
                                <div id="bulgu-models-container" class="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                    ${isEdit ? modelCheckboxesHTML : '<p class="text-xs text-gray-500 col-span-full">Modelleri görmek için bir vendor seçin.</p>'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label for="bulgu-detayli-aciklama" class="block text-sm font-medium text-gray-700">Detaylı Açıklama</label>
                            <textarea id="bulgu-detayli-aciklama" rows="4" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">${bulgu.detayliAciklama || ''}</textarea>
                        </div>
                    </form>
                </div>

                <div class="flex items-center justify-end p-4 border-t rounded-b-md bg-gray-50 gap-2">
                    <button type="button" class="cancel-modal-btn px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium">İptal</button>
                    <button type="submit" form="bulgu-form" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">${isEdit ? 'Değişiklikleri Kaydet' : 'Kaydet'}</button>
                </div>
            </div>
        </div>`;
}

    function getVendorContactsModalHTML(vendor, contacts = []) {
    // Kopyalama ikonu için SVG tanımı
    const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
            <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2 text-center">${vendor.name} İletişim Kişileri</h3>
                <hr class="mb-4">
                <div id="vendor-contacts-list" class="mb-4">
                    ${contacts.length > 0 ? contacts.map(contact => `
                        <div class="flex justify-between items-center p-2 border-b last:border-none">
                            <div>
                                <p class="font-medium">${contact.name} ${contact.preferred ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Birincil</span>' : ''}</p>
                                <p class="text-sm text-gray-600">${contact.email || ''} ${contact.phone ? `(${contact.phone})` : ''}</p>
                            </div>
                            ${contact.email ? `
                            <div>
                                <button title="E-postayı kopyala" class="copy-email-btn text-gray-500 hover:text-blue-600 p-1" data-email="${contact.email}">
                                    ${copyIconSvg}
                                </button>
                            </div>
                            ` : ''}
                        </div>
                    `).join('') : '<p class="text-sm text-gray-500">Henüz iletişim kişisi eklenmedi.</p>'}
                </div>
                <div class="items-center px-4 py-3 text-right">
                    <button type="button" id="close-contacts-modal" class="px-4 py-2 bg-gray-200 rounded-md">Kapat</button>
                </div>
            </div>
        </div>`;
}

    function getDeleteConfirmModalHTML(message, subMessage = '') {
        return `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
                <div class="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div class="mt-3 text-center">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Silme Onayı</h3>
                        <p class="text-sm text-gray-600 mt-2 px-7 py-3">${message}</p>
                        ${subMessage ? `<p class="text-xs text-gray-500">${subMessage}</p>` : ''}
                        <div class="items-center px-4 py-3">
                            <button id="cancel-delete" class="px-4 py-2 bg-gray-200 rounded-md mr-2">İptal</button>
                            <button id="confirm-delete" class="px-4 py-2 bg-red-600 text-white rounded-md">Sil</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function getBulguImportModalHTML() {
        return `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
                <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Bulgu İçeri Aktar</h3>
                    <form id="bulgu-import-form">
                        <div class="mb-4">
                            <label for="csv-file-input" class="block text-sm font-medium text-gray-700">CSV Dosyası Seçin</label>
                            <input type="file" id="csv-file-input" accept=".csv" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required>
                        </div>
                        <div id="import-progress" class="hidden mb-4 text-sm text-gray-600">
                            <p>Yükleniyor... <span id="progress-count">0</span>/<span id="total-records">0</span></p>
                            <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div id="progress-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                            </div>
                        </div>
                        <div id="import-results" class="hidden mb-4 p-3 border rounded-md bg-gray-50 max-h-40 overflow-y-auto text-sm"></div>
                        <div class="items-center px-4 py-3 text-right">
                            <button type="button" id="cancel-import-modal" class="px-4 py-2 bg-gray-200 rounded-md mr-2">İptal</button>
                            <button type="submit" id="start-import-btn" class="px-4 py-2 bg-blue-500 text-white rounded-md">İçeri Aktar</button>
                        </div>
                    </form>
                </div>
            </div>`;
    }

    async function loadVendorContacts(vendorId) {
        try {
            return await apiRequest(`/api/vendors/${vendorId}/contacts`);
        } catch (error) {
            showErrorModal('İletişim kişileri yüklenirken hata oluştu: ' + error.message);
            return [];
        }
    }

    function renderVendorContactsReadOnly(contacts) {
        const contactsListDiv = document.getElementById('vendor-contacts-list');
        if (contactsListDiv) {
            contactsListDiv.innerHTML = contacts.length > 0 ? contacts.map(contact => `
                <div class="flex justify-between items-center p-2 border-b last:border-none">
                    <div>
                        <p class="font-medium">${contact.name} ${contact.preferred ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Birincil</span>' : ''}</p>
                        <p class="text-sm text-gray-600">${contact.email || ''} ${contact.phone ? `(${contact.phone})` : ''}</p>
                    </div>
                    <div>
                        <button class="edit-contact-btn text-blue-600 text-sm mr-2" data-contact-id="${contact.id}">Düzenle</button>
                        <button class="delete-contact-btn text-red-600 text-sm" data-contact-id="${contact.id}">Sil</button>
                    </div>
                </div>
            `).join('') : '<p class="text-sm text-gray-500">Henüz iletişim kişisi eklenmedi.</p>';
            // Re-attach event listeners for edit/delete buttons if needed
            // attachContactEventListeners(); // Assuming such a function exists or will be created
        }
    }

    let debounceTimer;
function debounce(func, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(func, delay);
}

async function fetchAndRenderBulgular(options = {}) {
    bulguFilters.currentPage = options.page || bulguFilters.currentPage;
    const params = new URLSearchParams({
        page: bulguFilters.currentPage,
        limit: 100,
        searchTerm: bulguFilters.searchTerm,
        vendorId: bulguFilters.vendorId,
        status: bulguFilters.status,
        tip: bulguFilters.tip,
    });

    try {
        // Yükleniyor... metnini göstermek yerine, sayfanın iskeletini çiz
        mainContent.innerHTML = getBulgularPageHTML([], {});
        document.getElementById('bulgu-search-input').value = bulguFilters.searchTerm;
        
        const response = await apiRequest(`/api/bulgular?${params.toString()}`);
        bulgularData = response.data; // Veriyi global state'e kaydet
        renderBulgularPage(response.data, response.pagination, options);
    } catch (error) {
        showErrorModal('Bulgular yüklenirken bir hata oluştu: ' + error.message);
    }
}


function renderBulgularPage(bulgular, pagination, options = {}) {
    mainContent.innerHTML = getBulgularPageHTML(bulgular, pagination);
    attachBulgularEventListeners(bulgular);

    if (options.focusOn) {
        const elementToFocus = document.getElementById(options.focusOn);
        if (elementToFocus) {
            elementToFocus.focus();
            if (options.cursorPosition !== undefined) {
                elementToFocus.setSelectionRange(options.cursorPosition, options.cursorPosition);
            }
        }
    }
}

function renderYonetimPage(options = {}) {
    let filteredModels = [...modelsData];

    // Filtreleri uygula
    if (modelFilters.searchTerm) {
        const term = modelFilters.searchTerm.toLowerCase();
        filteredModels = filteredModels.filter(m => m.name.toLowerCase().includes(term) || m.code?.toLowerCase().includes(term));
    }
    if (modelFilters.vendorId !== 'all') {
        filteredModels = filteredModels.filter(m => String(m.vendorId) === String(modelFilters.vendorId));
    }
    if (modelFilters.isTechpos !== 'all') {
        filteredModels = filteredModels.filter(m => String(m.isTechpos) === String(modelFilters.isTechpos));
    }
    if (modelFilters.isAndroidPos !== 'all') {
        filteredModels = filteredModels.filter(m => String(m.isAndroidPos) === String(modelFilters.isAndroidPos));
    }
    if (modelFilters.isOkcPos !== 'all') {
        filteredModels = filteredModels.filter(m => String(m.isOkcPos) === String(modelFilters.isOkcPos));
    }

    // Sıralamayı uygula
    const sortedModels = sortData(filteredModels, modelSort);

    // Tüm yönetim sayfasını filtrelenmiş verilerle yeniden çiz
    mainContent.innerHTML = getYonetimHTML(vendorsData, sortedModels, versionsData, currentActiveTab);
    
    // Olay dinleyicilerini yeniden bağla
    attachYonetimEventListeners();

    // Filtre elemanlarının değerlerini koru
    document.getElementById('model-search-input').value = modelFilters.searchTerm;
    document.getElementById('model-vendor-filter').value = modelFilters.vendorId;
    document.getElementById('model-techpos-filter').value = modelFilters.isTechpos;
    document.getElementById('model-android-filter').value = modelFilters.isAndroidPos;
    document.getElementById('model-okc-filter').value = modelFilters.isOkcPos;

    // --- YENİ EKLENEN KOD ---
    // Odağı ve imleç pozisyonunu geri yükle
    if (options.focusOn) {
        const elementToFocus = document.getElementById(options.focusOn);
        if (elementToFocus) {
            elementToFocus.focus();
            if (options.cursorPosition !== undefined) {
                elementToFocus.setSelectionRange(options.cursorPosition, options.cursorPosition);
            }
        }
    }
}

function attachVendorModalListeners(vendor = {}, contacts = []) {
    const isEdit = vendor.id !== undefined;

    // Ana pencereyi kapatma
    document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));

    // Ana vendor bilgilerini EKLEME veya GÜNCELLEME
    document.getElementById('vendor-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('vendor-id').value;
        const name = document.getElementById('vendor-name').value;
        const makeCode = document.getElementById('vendor-make-code').value;
        try {
            if (id) {
                await apiRequest(`/api/vendors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, makeCode }) });
            } else {
                await apiRequest('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, makeCode }) });
            }
            modalContainer.innerHTML = '';
            vendorsData = [];
            loadSidebarVendors();
            router();
        } catch (error) {
            showErrorModal(error.message);
        }
    });

    // Sadece DÜZENLEME modundaysa iletişim kişisi olaylarını bağla
    if (isEdit) {
        const openContactSubModal = (contactToEdit = {}) => {
            const subModalContainer = document.createElement('div');
            subModalContainer.innerHTML = getContactSubModalHTML(vendor, contactToEdit);
            document.body.appendChild(subModalContainer);
            const closeSubModal = () => subModalContainer.remove();
            subModalContainer.querySelectorAll('.cancel-contact-sub-modal').forEach(btn => btn.addEventListener('click', closeSubModal));
            subModalContainer.querySelector('#contact-form').addEventListener('submit', async (formEvent) => {
                formEvent.preventDefault();
                const payload = {
                    name: document.getElementById('contact-name').value,
                    email: document.getElementById('contact-email').value,
                    phone: document.getElementById('contact-phone').value,
                    preferred: document.getElementById('contact-preferred').checked
                };
                const contactId = document.getElementById('contact-id').value;
                try {
                    if (contactId) {
                        await apiRequest(`/api/contacts/${contactId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    } else {
                        await apiRequest(`/api/vendors/${vendor.id}/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    }
                    closeSubModal();
                    const updatedContacts = await apiRequest(`/api/vendors/${vendor.id}/contacts`);
                    modalContainer.innerHTML = getVendorModalHTML(vendor, updatedContacts);
                    attachVendorModalListeners(vendor, updatedContacts);
                } catch (error) {
                    showErrorModal(error.message);
                }
            });
        };

        document.getElementById('add-new-contact-btn')?.addEventListener('click', () => openContactSubModal());
        document.querySelectorAll('.edit-contact-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const contactId = e.currentTarget.dataset.contactId;
                const contactToEdit = contacts.find(c => c.id == contactId);
                if (contactToEdit) openContactSubModal(contactToEdit);
            });
        });
        document.querySelectorAll('.delete-contact-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const contactId = e.currentTarget.dataset.contactId;
                modalContainer.innerHTML = getDeleteConfirmModalHTML('İletişim kişisi silinsin mi?');
                document.getElementById('cancel-delete').addEventListener('click', async () => {
                    const currentContacts = await apiRequest(`/api/vendors/${vendor.id}/contacts`);
                    modalContainer.innerHTML = getVendorModalHTML(vendor, currentContacts);
                    attachVendorModalListeners(vendor, currentContacts);
                });
                document.getElementById('confirm-delete').addEventListener('click', async () => {
                    try {
                        await apiRequest(`/api/contacts/${contactId}`, { method: 'DELETE' });
                        const updatedContacts = await apiRequest(`/api/vendors/${vendor.id}/contacts`);
                        modalContainer.innerHTML = getVendorModalHTML(vendor, updatedContacts);
                        attachVendorModalListeners(vendor, updatedContacts);
                    } catch (error) {
                        showErrorModal(error.message);
                    }
                });
            });
        });
    }
}

    function attachModelModalListeners(model = null) {
    document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
    
    document.getElementById('model-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('model-id').value;
        const name = document.getElementById('model-name').value;
        const code = document.getElementById('model-code').value;
        const vendorId = document.getElementById('model-vendor-id').value;
        const isTechpos = document.getElementById('model-is-techpos').checked;
        const isAndroidPos = document.getElementById('model-is-android-pos').checked;
        const isOkcPos = document.getElementById('model-is-okc-pos').checked;

        try {
            const modelData = { name, code, vendorId: Number(vendorId), isTechpos, isAndroidPos, isOkcPos };
            if (id) {
                await apiRequest(`/api/models/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(modelData)
                });
            } else {
                await apiRequest('/api/models', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(modelData)
                });
            }
            modalContainer.innerHTML = '';
            modelsData = [];
            router();
        } catch (error) {
            showErrorModal(error.message);
        }
    });
}

function getVersionModalHTML(vendors, models, version = {}) {
    const isEdit = version.id !== undefined;
    const title = isEdit ? 'Versiyon Düzenle' : 'Yeni Versiyon Ekle';
    const vendorOptions = vendors.map(v => `<option value="${v.id}" ${version.vendorId == v.id ? 'selected' : ''}>${v.name}</option>`).join('');
    
    const selectedModelIds = (version.modelIds && typeof version.modelIds === 'string') 
        ? version.modelIds.split(',').map(s => s.trim()) 
        : (version.modelIds || []);

    const filteredModels = isEdit ? models.filter(m => m.vendorId == version.vendorId) : [];

    const modelCheckboxesHTML = filteredModels.map(m => `
        <div class="flex items-center">
            <input type="checkbox" id="model-${m.id}" value="${m.id}" name="modelIds" class="h-4 w-4 rounded border-gray-300 model-checkbox" ${selectedModelIds.includes(String(m.id)) ? 'checked' : ''}>
            <label for="model-${m.id}" class="ml-2 block text-sm text-gray-900">${m.name}</label>
        </div>
    `).join('');

    const statusOptions = ['Test', 'Prod'].map(s => `<option value="${s}" ${version.status === s ? 'selected' : ''}>${s}</option>`).join('');

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-75 h-full w-full flex items-center justify-center z-50 p-4">
            <div class="relative bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all flex flex-col max-h-full">
                
                <div class="relative flex items-center justify-center p-4 border-b rounded-t-md bg-gray-50">
                    <h3 class="text-xl font-semibold text-gray-800">${title}</h3>
                    <button type="button" class="cancel-modal-btn absolute top-3 right-4 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>

                <div class="p-6 overflow-y-auto">
                    <form id="version-form" class="space-y-6">
                        <input type="hidden" id="version-id" value="${version.id || ''}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <label for="version-number" class="block text-sm font-medium text-gray-700">Versiyon Numarası</label>
                                <input type="text" id="version-number" name="versionNumber" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${version.versionNumber || ''}" required>
                            </div>
                            <div>
                                <label for="version-vendor-id" class="block text-sm font-medium text-gray-700">Vendor</label>
                                <select id="version-vendor-id" name="vendorId" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                                    <option value="">Seçiniz...</option>
                                    ${vendorOptions}
                                </select>
                            </div>
                            <div>
                                <label for="version-delivery-date" class="block text-sm font-medium text-gray-700">Teslim Tarihi</label>
                                <input type="date" id="version-delivery-date" name="deliveryDate" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${version.deliveryDate || ''}" required>
                            </div>
                             <div>
                                <label for="version-status" class="block text-sm font-medium text-gray-700">Durum</label>
                                <select id="version-status" name="status" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" ${!isEdit ? 'disabled' : ''}>${statusOptions}</select>
                            </div>
                            <div>
                                <label for="version-prod-onay-date" class="block text-sm font-medium text-gray-700">Prod Onay Tarihi</label>
                                <input type="date" id="version-prod-onay-date" name="prodOnayDate" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${version.prodOnayDate || ''}" ${version.status !== 'Prod' ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Geçerli Modeller</label>
                            <div class="mt-1 border rounded-md p-2">
                                 <div class="flex items-center border-b pb-2 mb-2">
                                    <input type="checkbox" id="select-all-models" class="h-4 w-4 rounded border-gray-300">
                                    <label for="select-all-models" class="ml-2 block text-sm font-medium text-gray-900">Hepsini Seç / Bırak</label>
                                </div>
                                <div id="version-models-container" class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                    ${modelCheckboxesHTML || '<p class="text-xs text-gray-500 col-span-2">Modelleri görmek için bir vendor seçin.</p>'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label for="version-bug-istek-tarihcesi" class="block text-sm font-medium text-gray-700">Bug/İstek Tarihçesi</label>
                            <textarea id="version-bug-istek-tarihcesi" name="bugIstekTarihcesi" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${version.bugIstekTarihcesi || ''}</textarea>
                        </div>
                        <div>
                            <label for="version-ekler" class="block text-sm font-medium text-gray-700">Ekler</label>
                            <textarea id="version-ekler" name="ekler" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${version.ekler || ''}</textarea>
                        </div>
                    </form>
                </div>

                <div class="flex items-center justify-end p-4 border-t rounded-b-md bg-gray-50 gap-2">
                    <button type="button" class="cancel-modal-btn px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium">İptal</button>
                    <button type="submit" form="version-form" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">${isEdit ? 'Değişiklikleri Kaydet' : 'Kaydet'}</button>
                </div>
            </div>
        </div>`;
}

function attachVersionModalListeners(version = null) {
    const vendorSelect = document.getElementById('version-vendor-id');
    const modelsContainer = document.getElementById('version-models-container');
    const selectAllCheckbox = document.getElementById('select-all-models');
    
    const updateModelsListForVendor = () => {
        const selectedVendorId = vendorSelect.value;
        selectAllCheckbox.checked = false; 

        if (!selectedVendorId) {
            modelsContainer.innerHTML = '<p class="text-xs text-gray-500 col-span-2">Modelleri görmek için bir vendor seçin.</p>';
            return;
        }

        const filteredModels = modelsData.filter(m => String(m.vendorId) === String(selectedVendorId));
        if (filteredModels.length === 0) {
            modelsContainer.innerHTML = '<p class="text-xs text-gray-500 col-span-2">Bu vendor\'a ait model bulunamadı.</p>';
            return;
        }
        
        modelsContainer.innerHTML = filteredModels.map(m => `
            <div class="flex items-center">
                <input type="checkbox" id="model-${m.id}" value="${m.id}" name="modelIds" class="h-4 w-4 rounded border-gray-300 model-checkbox">
                <label for="model-${m.id}" class="ml-2 block text-sm text-gray-900">${m.name}</label>
            </div>
        `).join('');
    };

    vendorSelect.addEventListener('change', updateModelsListForVendor);

    selectAllCheckbox.addEventListener('change', (e) => {
        modelsContainer.querySelectorAll('.model-checkbox').forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    });

    const statusSelect = document.getElementById('version-status');
    const prodOnayDateInput = document.getElementById('version-prod-onay-date');
    if(statusSelect && prodOnayDateInput) {
        statusSelect.addEventListener('change', (e) => {
            prodOnayDateInput.disabled = e.target.value !== 'Prod';
            if(e.target.value !== 'Prod') prodOnayDateInput.value = '';
        });
    }

    // DÜZELTME: Yeni tasarımdaki tüm kapatma butonlarını dinle
    document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));

    document.getElementById('version-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('version-id').value;
        
        const selectedModelIds = Array.from(modelsContainer.querySelectorAll('.model-checkbox:checked'))
                                      .map(checkbox => Number(checkbox.value));

        const payload = {
            versionNumber: document.getElementById('version-number').value,
            deliveryDate: document.getElementById('version-delivery-date').value,
            vendorId: document.getElementById('version-vendor-id').value,
            status: document.getElementById('version-status').value,
            prodOnayDate: document.getElementById('version-prod-onay-date').value,
            bugIstekTarihcesi: document.getElementById('version-bug-istek-tarihcesi').value,
            ekler: document.getElementById('version-ekler').value,
            modelIds: selectedModelIds
        };

        try {
            if (id) {
                await apiRequest(`/api/versions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            } else {
                await apiRequest('/api/versions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            }
            modalContainer.innerHTML = '';
            versionsData = [];
            router();
        } catch (error) {
            showErrorModal(error.message);
        }
    });
}

function attachBulguModalListeners(bulgu = {}) {
    // Dinamik elemanları seç
    const vendorSelect = document.getElementById('bulgu-vendor-id');
    const modelsContainer = document.getElementById('bulgu-models-container');
    const versionSelect = document.getElementById('bulgu-cozum-versiyon-id');
    const selectAllCheckbox = document.getElementById('select-all-models');
    const statusSelect = document.getElementById('bulgu-status');
    const onayFieldsContainer = document.getElementById('onay-fields-container');
    const onaylayanInput = document.getElementById('bulgu-cozum-onaylayan-kullanici');
    const onayTarihiInput = document.getElementById('bulgu-cozum-onay-tarihi');

    // Model listesini vendor'a göre güncelleyen fonksiyon
    const updateModelsList = () => {
        const selectedVendorId = vendorSelect.value;
        selectAllCheckbox.checked = false;
        if (!selectedVendorId) {
            modelsContainer.innerHTML = '<p class="text-xs text-gray-500 col-span-full">Modelleri görmek için bir vendor seçin.</p>';
            return;
        }
        const filteredModels = modelsData.filter(m => String(m.vendorId) === String(selectedVendorId));
        if (filteredModels.length === 0) {
            modelsContainer.innerHTML = '<p class="text-xs text-gray-500 col-span-full">Bu vendor\'a ait model bulunamadı.</p>';
            return;
        }
        modelsContainer.innerHTML = filteredModels.map(m => `
            <div class="flex items-center">
                <input type="checkbox" id="model-${m.id}" value="${m.id}" class="model-checkbox h-4 w-4 rounded border-gray-300">
                <label for="model-${m.id}" class="ml-2 block text-sm text-gray-900">${m.name}</label>
            </div>
        `).join('');
    };
    
    // Versiyon listesini vendor'a göre güncelleyen fonksiyon
    const updateVersionsList = () => {
        const selectedVendorId = vendorSelect.value;
        if (!selectedVendorId) {
            versionSelect.innerHTML = '<option value="">Önce vendor seçin...</option>';
            return;
        }
        const filteredVersions = versionsData.filter(v => String(v.vendorId) === String(selectedVendorId));
        let optionsHTML = '<option value="">Seçiniz...</option>';
        optionsHTML += filteredVersions.map(v => `<option value="${v.id}">${v.versionNumber}</option>`).join('');
        versionSelect.innerHTML = optionsHTML;
    };

    // Onay alanlarını durum'a göre göster/gizle
    const toggleOnayFields = () => {
        if (statusSelect.value === 'Kapalı') {
            onayFieldsContainer.classList.remove('hidden');
            onaylayanInput.required = true;
            onayTarihiInput.required = true;
        } else {
            onayFieldsContainer.classList.add('hidden');
            onaylayanInput.required = false;
            onayTarihiInput.required = false;
        }
    };

    // Olay dinleyicilerini ekle
    vendorSelect.addEventListener('change', () => {
        updateModelsList();
        updateVersionsList();
    });
    statusSelect.addEventListener('change', toggleOnayFields);
    selectAllCheckbox.addEventListener('change', (e) => {
        modelsContainer.querySelectorAll('.model-checkbox').forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    });

    // Modal iptal ve gönderme olayları
    document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
    
    document.getElementById('bulgu-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = bulgu.id;
        const selectedModelIds = Array.from(modelsContainer.querySelectorAll('.model-checkbox:checked'))
                                      .map(checkbox => Number(checkbox.value));
        const bulguData = {
            baslik: document.getElementById('bulgu-baslik').value,
            vendorId: Number(vendorSelect.value),
            bulguTipi: document.getElementById('bulgu-tipi').value,
            etkiSeviyesi: document.getElementById('bulgu-etki-seviyesi').value,
            tespitTarihi: document.getElementById('bulgu-tespit-tarihi').value,
            status: statusSelect.value,
            cozumVersiyonId: versionSelect.value ? Number(versionSelect.value) : null,
            vendorTrackerNo: document.getElementById('bulgu-vendor-tracker-no').value,
            girenKullanici: document.getElementById('bulgu-giren-kullanici').value,
            cozumOnaylayanKullanici: onaylayanInput.value,
            cozumOnayTarihi: onayTarihiInput.value,
            detayliAciklama: document.getElementById('bulgu-detayli-aciklama').value,
            modelIds: selectedModelIds
        };

        try {
            if (id) {
                await apiRequest(`/api/bulgular/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bulguData) });
            } else {
                await apiRequest('/api/bulgular', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bulguData) });
            }
            modalContainer.innerHTML = '';
            fetchAndRenderBulgular({ page: bulguFilters.currentPage });
        } catch (error) {
            showErrorModal(error.message);
        }
    });
}

    function attachBulguImportModalListeners() {
        document.getElementById('cancel-import-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');
        document.getElementById('bulgu-import-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('csv-file-input');
            const progressDiv = document.getElementById('import-progress');
            const progressBar = document.getElementById('progress-bar');
            const progressCount = document.getElementById('progress-count');
            const totalRecords = document.getElementById('total-records');
            const importResultsDiv = document.getElementById('import-results');
            const startImportBtn = document.getElementById('start-import-btn');

            if (!fileInput.files.length) {
                showErrorModal('Lütfen bir CSV dosyası seçin.');
                return;
            }

            const file = fileInput.files[0];
            progressDiv.classList.remove('hidden');
            importResultsDiv.classList.add('hidden');
            importResultsDiv.innerHTML = '';
            startImportBtn.disabled = true;

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const records = results.data;
                    totalRecords.textContent = records.length;
                    let processedCount = 0;
                    const batchSize = 50; // Process in batches

                    for (let i = 0; i < records.length; i += batchSize) {
                        const batch = records.slice(i, i + batchSize);
                        try {
                            const response = await apiRequest('/api/bulgular/import', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ records: batch })
                            });
                            if (response.errors && response.errors.length > 0) {
                                response.errors.forEach(err => {
                                    importResultsDiv.innerHTML += `<p class="text-red-600">Satır ${err.rowIndex}: ${err.error}</p>`;
                                });
                            }
                            processedCount += batch.length;
                            progressCount.textContent = processedCount;
                            progressBar.style.width = `${(processedCount / records.length) * 100}%`;
                        } catch (error) {
                            importResultsDiv.innerHTML += `<p class="text-red-600">Toplu işlem sırasında hata: ${error.message}</p>`;
                            processedCount += batch.length; // Still count as processed to advance progress
                            progressCount.textContent = processedCount;
                            progressBar.style.width = `${(processedCount / records.length) * 100}%`;
                        }
                    }

                    progressDiv.classList.add('hidden');
                    importResultsDiv.classList.remove('hidden');
                    startImportBtn.disabled = false;
                    bulgularData = []; // Invalidate cache
                    router(); // Re-render current view
                    if (importResultsDiv.innerHTML === '') {
                        importResultsDiv.innerHTML = '<p class="text-green-600">Tüm kayıtlar başarıyla içeri aktarıldı.</p>';
                    }
                },
                error: (err) => {
                    showErrorModal('CSV dosyasını ayrıştırma hatası: ' + err.message);
                    progressDiv.classList.add('hidden');
                    startImportBtn.disabled = false;
                }
            });
        });
    }

    function renderDashboardCharts(stats) {
    const { statusDistribution, bulguByVendor, sonBulgular } = stats;
    const pieCtx = document.getElementById('statusPieChart')?.getContext('2d');
    if (pieCtx) {
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: statusDistribution.map(item => item.status),
                datasets: [{ data: statusDistribution.map(item => item.count), backgroundColor: ['#EF4444', '#3B82F6', '#6B7280', '#F59E0B'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    const barCtx = document.getElementById('vendorBarChart')?.getContext('2d');
    if (barCtx) {
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: bulguByVendor.map(item => item.name),
                datasets: [{ label: 'Bulgu Sayısı', data: bulguByVendor.map(item => item.count), backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }]
            },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
        });
    }
    // DÜZELTME: Sadece tablo aksiyonlarını bağla, filtreleri değil.
    attachBulguTableActionListeners(sonBulgular);
}

function attachBulguTableActionListeners(bulgular) {
    document.getElementById('add-bulgu-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getBulguModalHTML(vendorsData, modelsData, versionsData);
        attachBulguModalListeners();
    });

    document.getElementById('import-bulgu-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getBulguImportModalHTML();
        attachBulguImportModalListeners();
    });

    document.querySelectorAll('.view-bulgu-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const id = link.dataset.bulguId;
            const bulgu = bulgular.find(b => String(b.id) === String(id)) || bulgularData.find(b => String(b.id) === String(id));
            if (bulgu) {
                modalContainer.innerHTML = getBulguViewModalHTML(bulgu);
                document.querySelectorAll('[data-close-bulgu-view]').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
            }
        });
    });

    document.querySelectorAll('.edit-bulgu-btn').forEach(button => {
        button.addEventListener('click', () => {
            const bulguId = button.dataset.bulguId;
            const bulguToEdit = bulgular.find(b => b.id == bulguId) || bulgularData.find(b => b.id == bulguId);
            if (bulguToEdit) {
                modalContainer.innerHTML = getBulguModalHTML(vendorsData, modelsData, versionsData, bulguToEdit);
                attachBulguModalListeners(bulguToEdit);
            }
        });
    });

    document.querySelectorAll('.delete-bulgu-btn').forEach(button => {
        button.addEventListener('click', () => {
            const bulguId = button.dataset.bulguId;
            const bulguBaslik = button.dataset.bulguBaslik;
            modalContainer.innerHTML = getDeleteConfirmModalHTML(`"${bulguBaslik}" kaydı silinsin mi?`, 'Bu işlem geri alınamaz.');
            document.getElementById('cancel-delete').addEventListener('click', () => modalContainer.innerHTML = '');
            document.getElementById('confirm-delete').addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/bulgular/${bulguId}`, { method: 'DELETE' });
                    modalContainer.innerHTML = '';
                    fetchAndRenderBulgular();
                } catch (error) {
                    modalContainer.innerHTML = '';
                    showErrorModal(error.message);
                }
            });
        });
    });
}

function attachYonetimEventListeners() {
    // Sekme (Tab) Değiştirme Mantığı
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            currentActiveTab = e.target.dataset.tab;
            renderYonetimPage();
        });
    });

    // --- Model Filtreleri ---
    document.getElementById('model-search-input')?.addEventListener('input', (e) => {
        const input = e.target;
        const cursorPosition = input.selectionStart;
        modelFilters.searchTerm = input.value;
        renderYonetimPage({ focusOn: 'model-search-input', cursorPosition: cursorPosition });
    });
    document.getElementById('model-vendor-filter')?.addEventListener('change', (e) => {
        modelFilters.vendorId = e.target.value;
        renderYonetimPage();
    });
    document.getElementById('model-techpos-filter')?.addEventListener('change', (e) => {
        modelFilters.isTechpos = e.target.value;
        renderYonetimPage();
    });
    document.getElementById('model-android-filter')?.addEventListener('change', (e) => {
        modelFilters.isAndroidPos = e.target.value;
        renderYonetimPage();
    });
    document.getElementById('model-okc-filter')?.addEventListener('change', (e) => {
        modelFilters.isOkcPos = e.target.value;
        renderYonetimPage();
    });
    document.getElementById('clear-model-filters-btn')?.addEventListener('click', () => {
        modelFilters = { searchTerm: '', vendorId: 'all', isTechpos: 'all', isAndroidPos: 'all', isOkcPos: 'all' };
        renderYonetimPage({ focusOn: 'model-search-input' });
    });

    // --- Vendor Butonları ---
    document.getElementById('add-vendor-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getVendorModalHTML(); // Boş vendor objesi ile HTML oluştur
        attachVendorModalListeners(); // Olayları bağla
    });
    document.querySelectorAll('.edit-vendor-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const vendorId = button.dataset.vendorId;
            const vendorToEdit = vendorsData.find(v => v.id == vendorId);
            if (vendorToEdit) {
                const contacts = await apiRequest(`/api/vendors/${vendorId}/contacts`);
                modalContainer.innerHTML = getVendorModalHTML(vendorToEdit, contacts);
                attachVendorModalListeners(vendorToEdit, contacts);
            }
        });
    });
    document.querySelectorAll('.delete-vendor-btn').forEach(button => {
        button.addEventListener('click', () => {
            const vendorId = button.dataset.vendorId;
            const vendorName = button.dataset.vendorName;
            modalContainer.innerHTML = getDeleteConfirmModalHTML(`"${vendorName}" isimli vendor'u silmek istediğinizden emin misiniz?`, 'Bu işlem geri alınamaz.');
            document.getElementById('cancel-delete').addEventListener('click', () => modalContainer.innerHTML = '');
            document.getElementById('confirm-delete').addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/vendors/${vendorId}`, { method: 'DELETE' });
                    modalContainer.innerHTML = '';
                    vendorsData = [];
                    await loadSidebarVendors();
                    router();
                } catch (error) {
                    modalContainer.innerHTML = '';
                    showErrorModal(error.message);
                }
            });
        });
    });
    document.querySelectorAll('.open-contacts-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const vendorToView = vendorsData.find(v => v.id == button.dataset.vendorId);
            if (!vendorToView) return;
            const contacts = await loadVendorContacts(vendorToView.id);
            modalContainer.innerHTML = getVendorContactsModalHTML(vendorToView, contacts);
            document.getElementById('close-contacts-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');
            document.querySelectorAll('.copy-email-btn').forEach(copyBtn => {
                copyBtn.addEventListener('click', (e) => {
                    const buttonElement = e.currentTarget;
                    const email = buttonElement.dataset.email;
                    navigator.clipboard.writeText(email).then(() => {
                        const originalContent = buttonElement.innerHTML;
                        buttonElement.innerHTML = 'Kopyalandı!';
                        buttonElement.disabled = true;
                        setTimeout(() => {
                            buttonElement.innerHTML = originalContent;
                            buttonElement.disabled = false;
                        }, 1500);
                    }).catch(err => {
                        console.error('E-posta kopyalanamadı: ', err);
                        showErrorModal('E-posta panoya kopyalanamadı.');
                    });
                });
            });
        });
    });

    // --- Model Butonları ---
    document.getElementById('add-model-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getModelModalHTML(vendorsData);
        attachModelModalListeners();
    });
    document.querySelectorAll('.edit-model-btn').forEach(button => {
        button.addEventListener('click', () => {
            const modelToEdit = modelsData.find(m => m.id == button.dataset.modelId);
            if (modelToEdit) {
                modalContainer.innerHTML = getModelModalHTML(vendorsData, modelToEdit);
                attachModelModalListeners(modelToEdit);
            }
        });
    });
    document.querySelectorAll('.delete-model-btn').forEach(button => {
        button.addEventListener('click', () => {
            const modelId = button.dataset.modelId;
            const modelName = button.dataset.modelName;
            modalContainer.innerHTML = getDeleteConfirmModalHTML(`"${modelName}" modelini silmek istediğinizden emin misiniz?`, 'Bu işlem geri alınamaz.');
            document.getElementById('cancel-delete').addEventListener('click', () => modalContainer.innerHTML = '');
            document.getElementById('confirm-delete').addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/models/${modelId}`, { method: 'DELETE' });
                    modalContainer.innerHTML = '';
                    modelsData = [];
                    router();
                } catch (error) {
                    modalContainer.innerHTML = '';
                    showErrorModal(error.message);
                }
            });
        });
    });

    // --- Versiyon Butonları ---
    document.querySelectorAll('.view-version-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const versionId = e.currentTarget.dataset.versionId;
            const versionToShow = versionsData.find(v => v.id == versionId);
            if (versionToShow) {
                modalContainer.innerHTML = getVersionViewModalHTML(versionToShow);
                modalContainer.querySelector('.close-modal-btn')?.addEventListener('click', () => {
                    modalContainer.innerHTML = '';
                });
            }
        });
    });
    document.getElementById('add-version-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getVersionModalHTML(vendorsData, modelsData);
        attachVersionModalListeners();
    });
    document.querySelectorAll('.edit-version-btn').forEach(button => {
        button.addEventListener('click', () => {
            const versionToEdit = versionsData.find(v => v.id == button.dataset.versionId);
            if (versionToEdit) {
                modalContainer.innerHTML = getVersionModalHTML(vendorsData, modelsData, versionToEdit);
                attachVersionModalListeners(versionToEdit);
            }
        });
    });
    document.querySelectorAll('.delete-version-btn').forEach(button => {
        button.addEventListener('click', () => {
            const versionId = button.dataset.versionId;
            const versionNumber = button.dataset.versionNumber;
            modalContainer.innerHTML = getDeleteConfirmModalHTML(`"${versionNumber}" versiyonunu silmek istediğinizden emin misiniz?`, 'Bu işlem geri alınamaz.');
            document.getElementById('cancel-delete').addEventListener('click', () => modalContainer.innerHTML = '');
            document.getElementById('confirm-delete').addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/versions/${versionId}`, { method: 'DELETE' });
                    modalContainer.innerHTML = '';
                    versionsData = [];
                    router();
                } catch (error) {
                    modalContainer.innerHTML = '';
                    showErrorModal(error.message);
                }
            });
        });
    });
}

function attachBulgularEventListeners(bulgular) {
    // 1. ADIM: Tablo ve modal aksiyonlarını bağla
    attachBulguTableActionListeners(bulgular);

    // 2. ADIM: Sadece bu sayfada olan filtre ve sayfalama elemanlarını bağla
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        fetchAndRenderBulgular({ page: bulguFilters.currentPage - 1 });
    });
    document.getElementById('next-page-btn')?.addEventListener('click', () => {
        fetchAndRenderBulgular({ page: bulguFilters.currentPage + 1 });
    });

    const searchInput = document.getElementById('bulgu-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const input = e.target;
            const cursorPosition = input.selectionStart;
            bulguFilters.searchTerm = input.value;
            debounce(() => {
                fetchAndRenderBulgular({ page: 1, focusOn: 'bulgu-search-input', cursorPosition });
            }, 300);
        });
    }

    const applyFilterAndResetPage = () => fetchAndRenderBulgular({ page: 1 });
    document.getElementById('bulgu-vendor-filter')?.addEventListener('change', (e) => {
        bulguFilters.vendorId = e.target.value;
        applyFilterAndResetPage();
    });
    document.getElementById('bulgu-status-filter')?.addEventListener('change', (e) => {
        bulguFilters.status = e.target.value;
        applyFilterAndResetPage();
    });
    document.getElementById('bulgu-tip-filter')?.addEventListener('change', (e) => {
        bulguFilters.tip = e.target.value;
        applyFilterAndResetPage();
    });
    document.getElementById('clear-bulgu-filters-btn')?.addEventListener('click', () => {
        bulguFilters = { ...bulguFilters, searchTerm: '', vendorId: 'all', status: 'all', tip: 'all' };
        fetchAndRenderBulgular({ page: 1, focusOn: 'bulgu-search-input' });
    });
    
    // 3. ADIM: Filtre elemanlarının değerlerini koru
    if (searchInput) searchInput.value = bulguFilters.searchTerm;
    const vendorFilter = document.getElementById('bulgu-vendor-filter');
    if (vendorFilter) vendorFilter.value = bulguFilters.vendorId;
    const statusFilter = document.getElementById('bulgu-status-filter');
    if (statusFilter) statusFilter.value = bulguFilters.status;
    const tipFilter = document.getElementById('bulgu-tip-filter');
    if (tipFilter) tipFilter.value = bulguFilters.tip;
}

    // --- BAŞLANGIÇ ---
    // Ana navigasyon linkleri URL hash'ini günceller
    navLinks.dashboard.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/dashboard'; });
    navLinks.yonetim.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/yonetim'; });
    navLinks.bulgular.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/bulgular'; });

    // URL hash'i değiştiğinde router'ı çalıştır
    window.addEventListener('hashchange', router);
    
    // Başlangıçta gerekli verileri ve sayfayı yükle
    loadSidebarVendors();
    router();
});