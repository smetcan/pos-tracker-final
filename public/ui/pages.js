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

        function getYonetimHTML(vendors, models, versions, users, activeTab) { // "users" parametresi eklendi
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

    const usersTableRows = users.map(user => `
        <tr class="border-b">
            <td class="p-3 font-medium">${user.userName}</td>
            <td class="p-3">${user.name} ${user.surname}</td>
            <td class="p-3">${user.email || ''}</td>
            <td class="p-3 text-right">
                <button class="reset-password-btn p-1 text-sm text-blue-600" data-user-id="${user.id}" data-user-name="${user.userName}">Şifre Sıfırla</button>
                <button class="delete-user-btn p-1 text-sm text-red-600" data-user-id="${user.id}" data-user-name="${user.userName}">Sil</button>
            </td>
        </tr>
    `).join('');

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
                <button class="tab-btn py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users' ? 'active' : ''}" data-tab="users">Kullanıcılar</button>
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
                <div id="users-tab" class="tab-content ${activeTab === 'users' ? 'active' : ''}">
                    <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Kullanıcı Yönetimi</h2><button id="add-user-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Kullanıcı Ekle</button></div>
                    <div class="rounded-md border"><table class="w-full text-sm"><thead><tr class="border-b">
                        <th class="p-3 text-left">Kullanıcı Adı</th>
                        <th class="p-3 text-left">İsim Soyisim</th>
                        <th class="p-3 text-left">E-posta</th>
                        <th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${usersTableRows}</tbody></table></div>
                </div>
            </div>
        </div>`;
}