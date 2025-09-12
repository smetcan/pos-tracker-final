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
        tip: 'all'
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
        mainContent.innerHTML = '<h1 class="text-3xl font-bold">Yükleniyor...</h1>'; // Show loading
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
                const [stats, bulgular] = await Promise.all([
                    apiRequest(`/api/vendors/${vendorId}/stats`),
                    apiRequest(`/api/bulgular?vendorId=${vendorId}`)
                ]);
                mainContent.innerHTML = getVendorDetailPageHTML(vendor, stats, bulgular);
                attachBulgularEventListeners(bulgular);
            } else if (hash === '#/bulgular') {
                navLinks.bulgular.classList.add('active');
                if (bulgularData.length === 0) { // Only fetch if not cached
                    bulgularData = await apiRequest('/api/bulgular');
                }
                mainContent.innerHTML = getBulgularPageHTML(bulgularData);
                attachBulgularEventListeners(bulgularData);
            } else if (hash === '#/yonetim') {
                navLinks.yonetim.classList.add('active');
                // Fetch all management data concurrently
                const [vendors, models, versions] = await Promise.all([
                    apiRequest('/api/vendors'),
                    apiRequest('/api/models'),
                    apiRequest('/api/versions')
                ]);
                vendorsData = vendors; // Update global cache
                modelsData = models;
                versionsData = versions;
                mainContent.innerHTML = getYonetimHTML(vendors, models, versions, currentActiveTab);
                attachYonetimEventListeners();
                // Re-apply filters if any
                document.getElementById('model-search-input').value = modelFilters.searchTerm;
                document.getElementById('model-vendor-filter').value = modelFilters.vendorId;
                document.getElementById('model-techpos-filter').value = modelFilters.isTechpos;
                document.getElementById('model-android-filter').value = modelFilters.isAndroidPos;
                document.getElementById('model-okc-filter').value = modelFilters.isOkcPos;
            } else { // Default to dashboard
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

    function getBulgularPageHTML(bulgular) {
        const vendorFilterOptions = [{ id: 'all', name: 'Tümü' }].concat(vendorsData.map(v => ({ id: v.id, name: v.name }))).map(v => `<option value="${v.id}">${v.name}</option>`).join('');
        const statusOptions = ['all','Açık','Test Edilecek','Kapalı'].map(s => `<option value="${s}">${s === 'all' ? 'Tümü' : s}</option>`).join('');
        const tipOptionsFilter = ['all','Program Hatası','Yeni Talep'].map(t => `<option value="${t}">${t === 'all' ? 'Tümü' : t}</option>`).join('');

        return `
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-3xl font-bold">Bulgu Takibi</h1>
                    <p class="text-gray-500">Tüm program hatalarını ve yeni talepleri buradan yönetebilirsiniz.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="import-bulgu-btn" class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md">İçeri Aktar</button>
                    <button id="add-bulgu-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Bulgu/Talep Ekle</button>
                </div>
            </div>
            <div class="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
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
            </div>
            ${getBulgularTableHTML(bulgular)}
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
    const contactsListHTML = contacts.length > 0 ? contacts.map(contact => `
        <div class="flex justify-between items-center p-2 border-t">
            <div>
                <p class="font-medium text-sm">${contact.name} ${contact.preferred ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Birincil</span>' : ''}</p>
                <p class="text-xs text-gray-500">${contact.email || ''} ${contact.phone || ''}</p>
            </div>
            <div>
                <button class="edit-contact-btn text-blue-600 text-sm mr-2" data-contact-id="${contact.id}">Düzenle</button>
                <button class="delete-contact-btn text-red-600 text-sm" data-contact-id="${contact.id}">Sil</button>
            </div>
        </div>
    `).join('') : '<p class="text-sm text-gray-500 p-2 border-t">İletişim kişisi bulunmuyor.</p>';

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
            <div class="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">${isEdit ? 'Vendor Düzenle' : 'Yeni Vendor Ekle'}</h3>
                <form id="vendor-form">
                    <input type="hidden" id="vendor-id" value="${vendor.id || ''}">
                    <div class="grid grid-cols-2 gap-4 mb-4">
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

                <hr class="my-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-medium text-gray-800">İletişim Kişileri</h4>
                    <button id="add-new-contact-btn" class="px-3 py-1 bg-blue-500 text-white text-sm rounded-md">Yeni Kişi Ekle</button>
                </div>
                <div id="vendor-contacts-container" class="border rounded-md bg-gray-50">
                    ${contactsListHTML}
                </div>

                <div class="items-center px-4 py-3 mt-4 text-right bg-gray-50 -m-5">
                    <button type="button" id="cancel-vendor-modal" class="px-4 py-2 bg-gray-200 rounded-md mr-2">İptal</button>
                    <button type="submit" form="vendor-form" class="px-4 py-2 bg-blue-500 text-white rounded-md">${isEdit ? 'Vendor Bilgilerini Güncelle' : 'Vendor Ekle'}</button>
                </div>
            </div>
        </div>`;
}

    function getContactSubModalHTML(vendor, contact = {}) {
    const isEdit = contact.id !== undefined;
    return `
        <div id="contact-sub-modal" class="fixed inset-0 bg-gray-800 bg-opacity-75 h-full w-full flex items-center justify-center z-50">
            <div class="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">${isEdit ? 'Kişi Düzenle' : 'Yeni Kişi Ekle'}</h3>
                <form id="contact-form">
                    <input type="hidden" id="contact-id" value="${contact.id || ''}">
                    <input type="hidden" id="contact-vendor-id" value="${vendor.id}">
                    <div class="mb-4">
                        <label for="contact-name" class="block text-sm font-medium">İsim</label>
                        <input type="text" id="contact-name" value="${contact.name || ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
                    </div>
                    <div class="mb-4">
                        <label for="contact-email" class="block text-sm font-medium">E-posta</label>
                        <input type="email" id="contact-email" value="${contact.email || ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                    </div>
                    <div class="mb-4">
                        <label for="contact-phone" class="block text-sm font-medium">Telefon</label>
                        <input type="tel" id="contact-phone" value="${contact.phone || ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                    </div>
                    <div class="mb-4">
                        <div class="flex items-center">
                            <input type="checkbox" id="contact-preferred" class="h-4 w-4" ${contact.preferred ? 'checked' : ''}>
                            <label for="contact-preferred" class="ml-2 block text-sm">Birincil iletişim kişisi yap</label>
                        </div>
                    </div>
                    <div class="items-center px-4 py-3 text-right">
                        <button type="button" id="cancel-contact-sub-modal" class="px-4 py-2 bg-gray-200 rounded-md mr-2">İptal</button>
                        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md">${isEdit ? 'Güncelle' : 'Ekle'}</button>
                    </div>
                </form>
            </div>
        </div>`;
}

    function getModelModalHTML(vendors, model = {}) {
    const isEdit = model.id !== undefined;
    const vendorOptions = vendors.map(v => `<option value="${v.id}" ${model.vendorId == v.id ? 'selected' : ''}>${v.name}</option>`).join('');

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
            <div class="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">${isEdit ? 'Model Düzenle' : 'Yeni Model Ekle'}</h3>
                <form id="model-form">
                    <input type="hidden" id="model-id" value="${model.id || ''}">
                    <div class="mb-4">
                        <label for="model-name" class="block text-sm font-medium text-gray-700">Model Adı</label>
                        <input type="text" id="model-name" name="name" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${model.name || ''}" required>
                    </div>
                    <div class="mb-4">
                        <label for="model-code" class="block text-sm font-medium text-gray-700">Model Kodu</label>
                        <input type="text" id="model-code" name="code" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${model.code || ''}" required>
                    </div>
                    <div class="mb-4">
                        <label for="model-vendor-id" class="block text-sm font-medium text-gray-700">Vendor</label>
                        <select id="model-vendor-id" name="vendorId" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>
                            <option value="">Seçiniz...</option>
                            ${vendorOptions}
                        </select>
                    </div>
                    <div class="mb-4 space-y-2">
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
                    <div class="items-center px-4 py-3 text-right">
                        <button type="button" id="cancel-model-modal" class="px-4 py-2 bg-gray-200 rounded-md mr-2">İptal</button>
                        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md">${isEdit ? 'Güncelle' : 'Ekle'}</button>
                    </div>
                </form>
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

    function getBulguModalHTML(vendors, models, versions, bulgu = {}) {
        const isEdit = bulgu.id !== undefined;
        const selectedVendorId = bulgu.vendorId || '';
        const selectedModelIds = (bulgu.modelIds && typeof bulgu.modelIds === 'string') ? bulgu.modelIds.split(',').map(s => s.trim()) : (bulgu.modelIds || []);
        const selectedCozumVersiyonId = bulgu.cozumVersiyonId || '';

        const vendorOptions = vendors.map(v => `<option value="${v.id}" ${selectedVendorId == v.id ? 'selected' : ''}>${v.name}</option>`).join('');
        const modelOptions = models.map(m => `<option value="${m.id}" ${selectedModelIds.includes(String(m.id)) ? 'selected' : ''}>${m.name} (${m.vendorName})</option>`).join('');
        const versionOptions = versions.map(v => `<option value="${v.id}" ${selectedCozumVersiyonId == v.id ? 'selected' : ''}>${v.versionNumber} (${v.vendorName})</option>`).join('');

        const statusOptions = ['Açık', 'Test Edilecek', 'Kapalı'].map(s => `<option value="${s}" ${bulgu.status === s ? 'selected' : ''}>${s}</option>`).join('');
        const bulguTipiOptions = ['Program Hatası', 'Yeni Talep'].map(t => `<option value="${t}" ${bulgu.bulguTipi === t ? 'selected' : ''}>${t}</option>`).join('');
        const etkiSeviyesiOptions = ['Düşük', 'Orta', 'Yüksek'].map(e => `<option value="${e}" ${bulgu.etkiSeviyesi === e ? 'selected' : ''}>${e}</option>`).join('');

        return `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
                <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white overflow-y-auto max-h-[90vh]">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">${isEdit ? 'Bulgu/Talep Düzenle' : 'Yeni Bulgu/Talep Ekle'}</h3>
                    <form id="bulgu-form">
                        <input type="hidden" id="bulgu-id" value="${bulgu.id || ''}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label for="bulgu-baslik" class="block text-sm font-medium text-gray-700">Başlık</label>
                                <input type="text" id="bulgu-baslik" name="baslik" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.baslik || ''}" required>
                            </div>
                            <div>
                                <label for="bulgu-vendor-id" class="block text-sm font-medium text-gray-700">Vendor</label>
                                <select id="bulgu-vendor-id" name="vendorId" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Seçiniz...</option>
                                    ${vendorOptions}
                                </select>
                            </div>
                            <div>
                                <label for="bulgu-tipi" class="block text-sm font-medium text-gray-700">Bulgu Tipi</label>
                                <select id="bulgu-tipi" name="bulguTipi" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Seçiniz...</option>
                                    ${bulguTipiOptions}
                                </select>
                            </div>
                            <div>
                                <label for="bulgu-etki-seviyesi" class="block text-sm font-medium text-gray-700">Etki Seviyesi</label>
                                <select id="bulgu-etki-seviyesi" name="etkiSeviyesi" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Seçiniz...</option>
                                    ${etkiSeviyesiOptions}
                                </select>
                            </div>
                            <div>
                                <label for="bulgu-tespit-tarihi" class="block text-sm font-medium text-gray-700">Tespit Tarihi</label>
                                <input type="date" id="bulgu-tespit-tarihi" name="tespitTarihi" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.tespitTarihi || ''}" required>
                            </div>
                            <div>
                                <label for="bulgu-status" class="block text-sm font-medium text-gray-700">Durum</label>
                                <select id="bulgu-status" name="status" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" ${isEdit ? '' : 'disabled'}>
                                    ${statusOptions}
                                </select>
                            </div>
                            <div>
                                <label for="bulgu-cozum-versiyon-id" class="block text-sm font-medium text-gray-700">Çözüm Beklenen Versiyon</label>
                                <select id="bulgu-cozum-versiyon-id" name="cozumVersiyonId" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                                    <option value="">Seçiniz...</option>
                                    ${versionOptions}
                                </select>
                            </div>
                            <div>
                                <label for="bulgu-vendor-tracker-no" class="block text-sm font-medium text-gray-700">Vendor Takip No</label>
                                <input type="text" id="bulgu-vendor-tracker-no" name="vendorTrackerNo" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.vendorTrackerNo || ''}">
                            </div>
                            <div>
                                <label for="bulgu-giren-kullanici" class="block text-sm font-medium text-gray-700">Giren Kullanıcı</label>
                                <input type="text" id="bulgu-giren-kullanici" name="girenKullanici" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.girenKullanici || ''}">
                            </div>
                            <div>
                                <label for="bulgu-cozum-onaylayan-kullanici" class="block text-sm font-medium text-gray-700">Çözüm Onaylayan Kullanıcı</label>
                                <input type="text" id="bulgu-cozum-onaylayan-kullanici" name="cozumOnaylayanKullanici" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.cozumOnaylayanKullanici || ''}">
                            </div>
                            <div>
                                <label for="bulgu-cozum-onay-tarihi" class="block text-sm font-medium text-gray-700">Çözüm Onay Tarihi</label>
                                <input type="date" id="bulgu-cozum-onay-tarihi" name="cozumOnayTarihi" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value="${bulgu.cozumOnayTarihi || ''}">
                            </div>
                        </div>
                        <div class="mb-4">
                            <label for="bulgu-model-ids" class="block text-sm font-medium text-gray-700">Etkilenen Modeller</label>
                            <select id="bulgu-model-ids" name="modelIds" multiple class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-32">
                                ${modelOptions}
                            </select>
                        </div>
                        <div class="mb-4">
                            <label for="bulgu-detayli-aciklama" class="block text-sm font-medium text-gray-700">Detaylı Açıklama</label>
                            <textarea id="bulgu-detayli-aciklama" name="detayliAciklama" rows="4" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">${bulgu.detayliAciklama || ''}</textarea>
                        </div>
                        <div class="items-center px-4 py-3 text-right">
                            <button type="button" id="cancel-bulgu-modal" class="px-4 py-2 bg-gray-200 rounded-md mr-2">İptal</button>
                            <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md">${isEdit ? 'Güncelle' : 'Ekle'}</button>
                        </div>
                    </form>
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

    function renderBulgularPage() {
        let filteredBulgular = bulgularData;

        // Apply search filter
        if (bulguFilters.searchTerm) {
            const searchTermLower = bulguFilters.searchTerm.toLowerCase();
            filteredBulgular = filteredBulgular.filter(bulgu =>
                bulgu.baslik.toLowerCase().includes(searchTermLower) ||
                (bulgu.detayliAciklama && bulgu.detayliAciklama.toLowerCase().includes(searchTermLower))
            );
        }

        // Apply vendor filter
        if (bulguFilters.vendorId !== 'all') {
            filteredBulgular = filteredBulgular.filter(bulgu => String(bulgu.vendorId) === String(bulguFilters.vendorId));
        }

        // Apply status filter
        if (bulguFilters.status !== 'all') {
            filteredBulgular = filteredBulgular.filter(bulgu => bulgu.status === bulguFilters.status);
        }

        // Apply tip filter
        if (bulguFilters.tip !== 'all') {
            filteredBulgular = filteredBulgular.filter(bulgu => bulgu.bulguTipi === bulguFilters.tip);
        }

        mainContent.innerHTML = getBulgularPageHTML(filteredBulgular);
        attachBulgularEventListeners(filteredBulgular);
    }

function attachVendorModalListeners(vendor, contacts) {
    // Bu fonksiyon, Vendor Düzenle penceresi içindeki TÜM olayları yönetir.

    // Ana pencereyi kapatma
    document.getElementById('cancel-vendor-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');

    // Ana vendor bilgilerini güncelleme
    document.getElementById('vendor-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('vendor-id').value;
        const name = document.getElementById('vendor-name').value;
        const makeCode = document.getElementById('vendor-make-code').value;

        try {
            await apiRequest(`/api/vendors/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, makeCode })
            });
            modalContainer.innerHTML = '';
            vendorsData = [];
            loadSidebarVendors();
            router();
        } catch (error) {
            showErrorModal(error.message);
        }
    });

    // --- İletişim Kişisi İşlemleri ---

    // Kişi ekleme/düzenleme alt penceresini açar ve yönetir
    const openContactSubModal = (contactToEdit = {}) => {
        const subModalContainer = document.createElement('div');
        subModalContainer.innerHTML = getContactSubModalHTML(vendor, contactToEdit);
        document.body.appendChild(subModalContainer);

        const closeSubModal = () => subModalContainer.remove();

        subModalContainer.querySelector('#cancel-contact-sub-modal').addEventListener('click', closeSubModal);

        subModalContainer.querySelector('#contact-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                phone: document.getElementById('contact-phone').value,
                preferred: document.getElementById('contact-preferred').checked
            };
            const contactId = document.getElementById('contact-id').value;

            try {
                if (contactId) { // Düzenleme
                    await apiRequest(`/api/contacts/${contactId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                } else { // Ekleme
                    await apiRequest(`/api/vendors/${vendor.id}/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                }
                closeSubModal();
                // Ana pencereyi yenile
                const updatedContacts = await apiRequest(`/api/vendors/${vendor.id}/contacts`);
                modalContainer.innerHTML = getVendorModalHTML(vendor, updatedContacts);
                attachVendorModalListeners(vendor, updatedContacts);
            } catch (error) {
                showErrorModal(error.message);
            }
        });
    };

    // "Yeni Kişi Ekle" butonuna basınca alt pencereyi aç
    document.getElementById('add-new-contact-btn')?.addEventListener('click', () => openContactSubModal());

    // Mevcut kişilerin "Düzenle" butonları
    document.querySelectorAll('.edit-contact-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const contactId = e.currentTarget.dataset.contactId;
            const contactToEdit = contacts.find(c => c.id == contactId);
            if (contactToEdit) {
                openContactSubModal(contactToEdit);
            }
        });
    });

    // Mevcut kişilerin "Sil" butonları
    document.querySelectorAll('.delete-contact-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const contactId = e.currentTarget.dataset.contactId;
            modalContainer.innerHTML = getDeleteConfirmModalHTML('İletişim kişisi silinsin mi?');
            document.getElementById('cancel-delete').addEventListener('click', async () => {
                // Silme iptal edilince ana pencereyi yeniden çiz
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

    function attachModelModalListeners(model = null) {
    document.getElementById('cancel-model-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');
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
            modelsData = []; // Cache'i temizle
            router(); // Sayfayı yeniden yükle
        } catch (error) {
            showErrorModal(error.message);
        }
    });
}

    function getVersionModalHTML(vendors, models, version = {}) {
    const isEdit = version.id !== undefined;
    const vendorOptions = vendors.map(v => `<option value="${v.id}" ${version.vendorId == v.id ? 'selected' : ''}>${v.name}</option>`).join('');
    
    // Düzenleme modunda, virgülle ayrılmış string'i bir diziye çevir
    const selectedModelIds = (version.modelIds && typeof version.modelIds === 'string') 
        ? version.modelIds.split(',').map(s => s.trim()) 
        : (version.modelIds || []);

    const modelOptions = models.map(m => `<option value="${m.id}" ${selectedModelIds.includes(String(m.id)) ? 'selected' : ''}>${m.name} (${m.vendorName})</option>`).join('');
    const statusOptions = ['Test', 'Prod'].map(s => `<option value="${s}" ${version.status === s ? 'selected' : ''}>${s}</option>`).join('');

    return `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50">
            <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white overflow-y-auto max-h-[90vh]">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">${isEdit ? 'Versiyon Düzenle' : 'Yeni Versiyon Ekle'}</h3>
                <form id="version-form">
                    <input type="hidden" id="version-id" value="${version.id || ''}">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                            <select id="version-status" name="status" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" ${!isEdit ? 'disabled' : ''}>
                                ${statusOptions}
                            </select>
                        </div>
                        <div>
                            <label for="version-prod-onay-date" class="block text-sm font-medium text-gray-700">Prod Onay Tarihi</label>
                            <input type="date" id="version-prod-onay-date" name="prodOnayDate" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" value="${version.prodOnayDate || ''}" ${version.status !== 'Prod' ? 'disabled' : ''}>
                        </div>
                    </div>
                    <div class="mb-4">
                        <label for="version-model-ids" class="block text-sm font-medium text-gray-700">Geçerli Modeller</label>
                        <select id="version-model-ids" name="modelIds" multiple class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md h-32">
                            ${modelOptions}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label for="version-bug-istek-tarihcesi" class="block text-sm font-medium text-gray-700">Bug/İstek Tarihçesi</label>
                        <textarea id="version-bug-istek-tarihcesi" name="bugIstekTarihcesi" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${version.bugIstekTarihcesi || ''}</textarea>
                    </div>
                    <div class="mb-4">
                        <label for="version-ekler" class="block text-sm font-medium text-gray-700">Ekler</label>
                        <textarea id="version-ekler" name="ekler" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">${version.ekler || ''}</textarea>
                    </div>
                    <div class="items-center px-4 py-3 text-right">
                        <button type="button" id="cancel-version-modal" class="px-4 py-2 bg-gray-200 rounded-md mr-2">İptal</button>
                        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md">${isEdit ? 'Güncelle' : 'Ekle'}</button>
                    </div>
                </form>
            </div>
        </div>`;
}

function attachVersionModalListeners(version = null) {
    // Prod durumu seçilince onay tarihi alanını aktif/pasif yap
    const statusSelect = document.getElementById('version-status');
    const prodOnayDateInput = document.getElementById('version-prod-onay-date');
    if(statusSelect && prodOnayDateInput) {
        statusSelect.addEventListener('change', (e) => {
            prodOnayDateInput.disabled = e.target.value !== 'Prod';
            if(e.target.value !== 'Prod') {
                prodOnayDateInput.value = '';
            }
        });
    }

    document.getElementById('cancel-version-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');
    document.getElementById('version-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('version-id').value;
        const payload = {
            versionNumber: document.getElementById('version-number').value,
            deliveryDate: document.getElementById('version-delivery-date').value,
            vendorId: document.getElementById('version-vendor-id').value,
            status: document.getElementById('version-status').value,
            prodOnayDate: document.getElementById('version-prod-onay-date').value,
            bugIstekTarihcesi: document.getElementById('version-bug-istek-tarihcesi').value,
            ekler: document.getElementById('version-ekler').value,
            modelIds: Array.from(document.getElementById('version-model-ids').selectedOptions).map(option => Number(option.value))
        };

        try {
            if (id) {
                await apiRequest(`/api/versions/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await apiRequest('/api/versions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            modalContainer.innerHTML = '';
            versionsData = []; // Cache'i temizle
            router(); // Sayfayı yeniden yükle
        } catch (error) {
            showErrorModal(error.message);
        }
    });
}

    function attachBulguModalListeners(bulgu = null) {
    // Simple and direct approach - wait for DOM to be ready then attach listeners
    setTimeout(() => {
        // Handle cancel button
        const cancelBtn = document.getElementById('cancel-bulgu-modal');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                modalContainer.innerHTML = '';
            });
        } else {
            console.error('Cancel button not found!');
        }
        
        // Handle form submission
        const bulguForm = document.getElementById('bulgu-form');
        if (bulguForm) {
            bulguForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('bulgu-id').value;
                const baslik = document.getElementById('bulgu-baslik').value;
                const vendorId = document.getElementById('bulgu-vendor-id').value;
                const bulguTipi = document.getElementById('bulgu-tipi').value;
                const etkiSeviyesi = document.getElementById('bulgu-etki-seviyesi').value;
                const tespitTarihi = document.getElementById('bulgu-tespit-tarihi').value;
                const status = document.getElementById('bulgu-status').value;
                const cozumVersiyonId = document.getElementById('bulgu-cozum-versiyon-id').value;
                const vendorTrackerNo = document.getElementById('bulgu-vendor-tracker-no').value;
                const girenKullanici = document.getElementById('bulgu-giren-kullanici').value;
                const cozumOnaylayanKullanici = document.getElementById('bulgu-cozum-onaylayan-kullanici').value;
                const cozumOnayTarihi = document.getElementById('bulgu-cozum-onay-tarihi').value;
                const detayliAciklama = document.getElementById('bulgu-detayli-aciklama').value;
                const modelIds = Array.from(document.getElementById('bulgu-model-ids').selectedOptions).map(option => Number(option.value));

                try {
                    const bulguData = {
                        baslik, vendorId: Number(vendorId), bulguTipi, etkiSeviyesi, tespitTarihi, status,
                        cozumVersiyonId: cozumVersiyonId ? Number(cozumVersiyonId) : null,
                        vendorTrackerNo, girenKullanici, cozumOnaylayanKullanici, cozumOnayTarihi,
                        detayliAciklama, modelIds
                    };

                    console.log('Sending bulguData:', bulguData);

                    if (id) {
                        await apiRequest(`/api/bulgular/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(bulguData)
                        });
                    } else {
                        await apiRequest('/api/bulgular', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(bulguData)
                        });
                    }
                    modalContainer.innerHTML = '';
                    bulgularData = []; // Invalidate cache
                    router(); // Re-render current view
                } catch (error) {
                    showErrorModal(error.message);
                }
            });
        } else {
            console.error('Bulgu form not found!');
        }
    }, 100); // Increase timeout to ensure DOM is ready
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
        attachBulgularEventListeners(sonBulgular);
    }

function attachYonetimEventListeners() {
    // Sekme (Tab) Değiştirme Mantığı
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            currentActiveTab = tabName;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // --- Vendor Butonları ---
    document.getElementById('add-vendor-btn')?.addEventListener('click', () => { 
        alert("Bu özellik Vendor Düzenle ekranına taşındı. Lütfen önce vendor'u oluşturup sonra düzenleyerek kişi ekleyin.");
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
    // Diğer tüm butonların olay dinleyicileri (delete-vendor, model, version vs.) buraya olduğu gibi gelecek...
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
                const bulgu = bulgular.find(b => String(b.id) === String(id));
                if (bulgu) {
                    modalContainer.innerHTML = getBulguViewModalHTML(bulgu);
                    document.querySelectorAll('[data-close-bulgu-view]').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
                }
            });
        });

        document.querySelectorAll('.edit-bulgu-btn').forEach(button => {
            button.addEventListener('click', () => {
                const bulguToEdit = bulgular.find(b => b.id == button.dataset.bulguId);
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
                        bulgularData = [];
                        router();
                    } catch (error) { showErrorModal(error.message); } finally { modalContainer.innerHTML = ''; }
                });
            });
        });

        const searchInput = document.getElementById('bulgu-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                bulguFilters.searchTerm = e.target.value;
                renderBulgularPage();
            });
        }
        const vendorFilter = document.getElementById('bulgu-vendor-filter');
        if(vendorFilter) vendorFilter.addEventListener('change', (e) => { bulguFilters.vendorId = e.target.value; renderBulgularPage(); });
        const statusFilter = document.getElementById('bulgu-status-filter');
        if(statusFilter) statusFilter.addEventListener('change', (e) => { bulguFilters.status = e.target.value; renderBulgularPage(); });
        const tipFilter = document.getElementById('bulgu-tip-filter');
        if(tipFilter) tipFilter.addEventListener('change', (e) => { bulguFilters.tip = e.target.value; renderBulgularPage(); });
        
        if (searchInput) searchInput.value = bulguFilters.searchTerm;
        if (vendorFilter) vendorFilter.value = bulguFilters.vendorId;
        if (statusFilter) statusFilter.value = bulguFilters.status;
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