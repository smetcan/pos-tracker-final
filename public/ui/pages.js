
    const actionEditIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.651 1.651a1.875 1.875 0 010 2.652l-8.955 8.955-4.478 1.126 1.126-4.478 8.955-8.955a1.875 1.875 0 012.651 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 7.125L16.862 4.487" />
        </svg>
    `;
    const actionDeleteIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L5.772 5.79m13.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
    `;

    const actionContactIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15H19.5A1.5 1.5 0 0021 20.25v-2.25a1.5 1.5 0 00-1.28-1.482l-4.5-.75a1.5 1.5 0 00-1.69 1.086l-.45 1.8a11.25 11.25 0 01-6.365-6.365l1.8-.45a1.5 1.5 0 001.086-1.69l-.75-4.5A1.5 1.5 0 007.5 4.5H5.25A1.5 1.5 0 003.75 6v.75z" />
        </svg>
    `;
    const actionResetIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V7.5a3.75 3.75 0 00-7.5 0V9m-3 0h13.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 015.25 9z" />
        </svg>
    `;

    const actionSupportIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    `;

    function getFunctionSupportTreeHTML(treeData = []) {
        if (!Array.isArray(treeData) || treeData.length === 0) {
            return '<p class="text-sm text-gray-500">Henüz fonksiyon desteği kaydı yok.</p>';
        }
        return treeData.map(fn => {
            const vendorDetailsHtml = (fn.vendors || []).map(vendor => {
                const modelDetailsHtml = (vendor.models || []).map(model => {
                    const versionItems = (model.versions || []).map(version => {
                        const versionMeta = [version.prodOnayDate].filter(Boolean).join(' - ');
                        return `<li class="flex items-start gap-2"><span class="font-medium text-gray-700">Versiyon: ${version.versionNumber}</span>${versionMeta ? `<span class="text-xs text-gray-500 mt-0.5">${versionMeta}</span>` : ''}</li>`;
                    }).join('') || '<li class="text-xs text-gray-500">Versiyon bulunmuyor.</li>';
                    return `<details class="ml-4 pl-4 border-l border-gray-200 py-1" open>
                                <summary class="cursor-pointer text-sm font-medium text-gray-700">Model: ${model.name}</summary>
                                <ul class="mt-1 space-y-1 text-sm text-gray-600">${versionItems}</ul>
                            </details>`;
                }).join('') || '<p class="ml-4 text-sm text-gray-500">Model bilgisi bulunmuyor.</p>';

                const modelCount = (vendor.models || []).length;
                const versionCount = (vendor.models || []).reduce((total, m) => total + ((m.versions || []).length), 0);
                const metaParts = [];
                if (modelCount) metaParts.push(`${modelCount} model`);
                if (versionCount) metaParts.push(`${versionCount} versiyon`);

                return `<details class="mt-2 border border-gray-200 rounded-md bg-gray-50 py-2" open>
                            <summary class="cursor-pointer px-3 text-sm font-semibold text-gray-800 flex items-center justify-between">
                                <span>${vendor.name}</span>
                                ${metaParts.length ? `<span class="text-xs text-gray-500">${metaParts.join(' - ')}</span>` : ''}
                            </summary>
                            <div class="px-3 pb-2">${modelDetailsHtml}</div>
                        </details>`;
            }).join('') || '<p class="text-sm text-gray-500">Bu fonksiyon için vendor bilgisi bulunmuyor.</p>';

            return `<details class="function-tree-item border border-gray-200 rounded-md mb-3" open>
                        <summary class="cursor-pointer px-4 py-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <span class="text-base font-semibold text-gray-900">${fn.name}</span>
                            ${fn.description ? `<span class="text-sm text-gray-500 md:max-w-xl">${fn.description}</span>` : ''}
                        </summary>
                        <div class="px-4 pb-4">${vendorDetailsHtml}</div>
                    </details>`;
        }).join('');
    }

    function getFunctionSupportMatrixHTML(matrixData = { columns: [], rows: [] }) {
        const { columns = [], rows = [] } = matrixData || {};
        if (!columns.length || !rows.length) {
            return '<p class="text-sm text-gray-500">Matriste gösterilecek kayıt bulunmuyor.</p>';
        }
        const headerCells = columns.map(fn => `<th class="p-3 text-left text-xs font-semibold text-gray-600" title="${fn.description || ''}">${fn.name}</th>`).join('');
        const rowsHtml = rows.map(row => {
            const infoCells = `<td class="p-3 text-sm text-gray-700">${row.vendorName || '-'}</td>` +
                `<td class="p-3 text-sm text-gray-700">${row.modelName || '-'}</td>` +
                `<td class="p-3 text-sm text-gray-700">${row.versionNumber || '-'}</td>`;
            const supportCells = (row.cells || []).map(supported => supported
                ? `<td class="p-2 text-center">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </span>
                        <span class="sr-only">Destekleniyor</span>
                    </td>`
                : `<td class="p-2 text-center">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </span>
                        <span class="sr-only">Desteklenmiyor</span>
                    </td>`
            ).join('');
            return `<tr class="border-b last:border-0">${infoCells}${supportCells}</tr>`;
        }).join('');
        return `<div class="overflow-x-auto">
            <table class="zebra-table min-w-full text-sm border rounded-lg overflow-hidden">
                <thead class="bg-gray-50">
                    <tr class="border-b">
                        <th class="p-3 text-left text-xs font-semibold text-gray-600">Vendor</th>
                        <th class="p-3 text-left text-xs font-semibold text-gray-600">Model</th>
                        <th class="p-3 text-left text-xs font-semibold text-gray-600">Versiyon</th>
                        ${headerCells}
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>`;
    }

    function getFunctionSupportPageHTML(treeData = [], matrixData = { columns: [], rows: [] }, activeView = 'tree') {
        const treeHtml = getFunctionSupportTreeHTML(treeData);
        const matrixHtml = getFunctionSupportMatrixHTML(matrixData);
        return `
        <div class="flex flex-col gap-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 class="text-3xl font-bold">Fonksiyon Desteği</h1>
                    <p class="text-sm text-gray-500">Fonksiyonların vendor, model ve versiyon bazındaki destek durumunu inceleyin.</p>
                </div>
                <div class="inline-flex rounded-md border bg-white shadow-sm" role="group">
                    <button type="button" class="function-support-view-btn px-4 py-2 text-sm font-medium border-r last:border-r-0 ${activeView === 'tree' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-800'}" data-view="tree">Hiyerarşi</button>
                    <button type="button" class="function-support-view-btn px-4 py-2 text-sm font-medium ${activeView === 'matrix' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-800'}" data-view="matrix">Matris</button>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                ${activeView === 'tree' ? `<div class="space-y-3 function-support-tree">${treeHtml}</div>` : matrixHtml}
            </div>
        </div>`;
    }



    function getDashboardHTML(stats) { 
        const { sonBulgular, openBulguByVendor, breakdown = {} } = stats;
        const typeTotals = breakdown.byType || [];
        const statusByType = breakdown.statusByType || [];
        const knownTypes = ['Program Hatası', 'Yeni Talep'];
        const allTypes = Array.from(new Set([...knownTypes, ...typeTotals.map(t => t.type)])).filter(Boolean);

        const typeMeta = {
            'Program Hatası': { label: 'Program Hatası', accent: 'text-red-600', badge: 'bg-red-100 text-red-700', bg: 'bg-red-50' },
            'Yeni Talep': { label: 'Yeni Talep', accent: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', bg: 'bg-emerald-50' }
        };

        const resolveTypeCount = (type) => typeTotals.find(item => item.type === type)?.count || 0;
        const resolveStatusCount = (type, status) => {
            const match = statusByType.find(item => item.type === type && item.status === status);
            return match ? match.count : 0;
        };

        const statCards = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${allTypes.map(type => {
                    const meta = typeMeta[type] || { label: type, accent: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', bg: 'bg-blue-50' };
                    const total = resolveTypeCount(type);
                    const open = resolveStatusCount(type, 'Açık');
                    const test = resolveStatusCount(type, 'Test Edilecek');
                    const closed = resolveStatusCount(type, 'Kapalı');
                    return `
                        <div class="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                            <div class="flex items-center justify-between">
                                <h3 class="text-sm font-medium text-gray-500">${meta.label}</h3>
                                <span class="px-2 py-1 text-xs font-semibold rounded-full ${meta.badge}">${meta.label}</span>
                            </div>
                            <p class="mt-3 text-3xl font-bold ${meta.accent}">${total}</p>
                            <div class="mt-4 grid grid-cols-3 gap-3 text-center">
                                <div class="p-2 rounded-md ${meta.bg} bg-opacity-40">
                                    <p class="text-xs text-gray-500">Açık</p>
                                    <p class="text-base font-semibold text-gray-800">${open}</p>
                                </div>
                                <div class="p-2 rounded-md bg-blue-50">
                                    <p class="text-xs text-gray-500">Test</p>
                                    <p class="text-base font-semibold text-gray-800">${test}</p>
                                </div>
                                <div class="p-2 rounded-md bg-slate-50">
                                    <p class="text-xs text-gray-500">Kapalı</p>
                                    <p class="text-base font-semibold text-gray-800">${closed}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
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
                    <div class="relative flex-grow chart-container chart-container--pie">
                        <canvas id="statusPieChart"></canvas>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md flex flex-col h-96">
                    <h3 class="font-semibold text-lg mb-4 flex-shrink-0">Vendor Bazında Bulgu Sayısı</h3>
                    <div class="relative flex-grow chart-container">
                        <canvas id="vendorBarChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    function getBulgularPageHTML(bulgular, pagination = {}) {
    const { currentPage, totalPages, totalRecords } = pagination;
    const breakdown = bulguBreakdown || { byType: [], statusByType: [] };
    const countsByType = breakdown.byType.reduce((acc, item) => {
        if (!item.type) return acc;
        acc[item.type] = item.count;
        return acc;
    }, {});
    const typeMeta = {
        'Program Hatası': { label: 'Program Hatası', chip: 'bg-red-50 text-red-700 border border-red-200', chipActive: 'bg-red-600 text-white border-red-600' },
        'Yeni Talep': { label: 'Yeni Talep', chip: 'bg-emerald-50 text-emerald-700 border border-emerald-200', chipActive: 'bg-emerald-600 text-white border-emerald-600' }
    };
    const orderedTypes = ['Program Hatası', 'Yeni Talep'];
    const allTypes = Array.from(new Set([...orderedTypes, ...Object.keys(countsByType)])).filter(Boolean);
    const totalAcrossTypes = allTypes.reduce((sum, type) => sum + (countsByType[type] || 0), 0);
    const activeTip = bulguFilters.tip;
    const subtitle = activeTip === 'all'
        ? `Program hatası ve yeni talep kayıtlarını birlikte yönetiyorsunuz. (${totalRecords || 0} kayıt)`
        : `${(typeMeta[activeTip] || { label: activeTip }).label} filtreli sonuçlar (${totalRecords || 0} / ${(countsByType[activeTip] || 0)})`;
    const toggleOptions = [{ value: 'all', label: 'Tümü', count: totalAcrossTypes }].concat(
        allTypes.map(type => ({ value: type, label: (typeMeta[type] || { label: type }).label, count: countsByType[type] || 0 }))
    );
    const tipToggleButtons = `
        <div class="mt-4 flex flex-wrap items-center gap-2 bulgu-type-toggle-group">
            ${toggleOptions.map(opt => {
                const isActive = activeTip === opt.value;
                return `<button type="button" class="bulgu-type-toggle ${isActive ? 'type-toggle-active' : ''}" data-tip="${opt.value}">
                    <span class="label">${opt.label}</span>
                    <span class="count">${opt.count}</span>
                </button>`;
            }).join('')}
        </div>
    `;
    const summaryBadges = allTypes.length > 0
        ? allTypes.map(type => {
            const meta = typeMeta[type] || { label: type, chip: 'bg-slate-100 text-slate-700 border border-slate-200', chipActive: 'bg-slate-600 text-white border-slate-600' };
            const isActive = activeTip === type;
            const count = countsByType[type] || 0;
            const classes = isActive ? meta.chipActive : meta.chip;
            return `<span class="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${classes}">${meta.label}: <span class="text-sm font-bold">${count}</span></span>`;
        }).join('')
        : '<span class="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full">Kayıt bulunmuyor</span>';

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
                <h1 class="text-3xl font-bold">Bulgular & Talepler</h1>
                <p class="text-gray-500">${subtitle}</p>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                    ${summaryBadges}
                    <span class="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 bg-gray-50 text-gray-600">Toplam: <span class="text-sm font-bold">${totalAcrossTypes}</span></span>
                </div>
                ${tipToggleButtons}
            </div>
            <div class="flex items-center gap-2">
                <button id="bulgu-export-btn" class="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md">Dışa Aktar (CSV)</button>
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

        function getYonetimHTML(vendors, models, versions, users, functions, activeTab) { // "users" parametresi eklendi
    const getSortIcon = (sortState, key) => (sortState.key !== key) ? '<span>&nbsp;</span>' : (sortState.direction === 'asc' ? '▲' : '▼');
    const boolToText = (value) => value ? 'Evet' : 'Hayır';
    
    const vendorsTableRows = vendors.map(vendor => `
        <tr class="border-b"><td class="p-3 font-medium">${vendor.name}</td><td class="p-3">${vendor.makeCode}</td><td class="p-3 text-right">
            <button type="button" class="open-contacts-btn inline-flex items-center justify-center mr-2 p-1 bg-gray-100 rounded text-gray-600 hover:text-gray-800 hover:bg-gray-200" data-vendor-id="${vendor.id}" aria-label="İletişim bilgilerini görüntüle">
                ${actionContactIcon}
                <span class="sr-only">İletişim</span>
            </button>
            <button type="button" class="edit-vendor-btn inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800" data-vendor-id="${vendor.id}" aria-label="Vendor düzenle">
                ${actionEditIcon}
                <span class="sr-only">Düzenle</span>
            </button>
            <button type="button" class="delete-vendor-btn inline-flex items-center justify-center p-1 text-red-600 hover:text-red-700" data-vendor-id="${vendor.id}" data-vendor-name="${vendor.name}" aria-label="Vendor sil">
                ${actionDeleteIcon}
                <span class="sr-only">Sil</span>
            </button>
        </td></tr>`).join('');
        
    const modelsTableRows = models.map(model => `
        <tr class="border-b">
            <td class="p-3 font-medium">${model.name}</td><td class="p-3">${model.code || ''}</td>
            <td class="p-3">${model.vendorName}</td>
            <td class="p-3 text-center">${boolToText(model.isTechpos)}</td>
            <td class="p-3 text-center">${boolToText(model.isAndroidPos)}</td>
            <td class="p-3 text-center">${boolToText(model.isOkcPos)}</td>
            <td class="p-3 text-right">
                <button type="button" class="edit-model-btn inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800" data-model-id="${model.id}" aria-label="Model düzenle">
                    ${actionEditIcon}
                    <span class="sr-only">Düzenle</span>
                </button>
                <button type="button" class="delete-model-btn inline-flex items-center justify-center p-1 text-red-600 hover:text-red-700" data-model-id="${model.id}" data-model-name="${model.name}" aria-label="Model sil">
                    ${actionDeleteIcon}
                    <span class="sr-only">Sil</span>
                </button>
            </td>
        </tr>`).join('');
        
    const versionsTableRows = versions.map(version => {
        const statusClass = version.status === 'Prod' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        return `
         <tr class="border-b"><td class="p-3 font-medium"><a href="#" class="view-version-link text-blue-600" data-version-id="${version.id}">${version.versionNumber}</a></td><td class="p-3">${version.vendorName}</td><td class="p-3">${version.deliveryDate}</td><td class="p-3 text-xs text-gray-600">${version.models || ''}</td>
            <td class="p-3"><span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${version.status}</span></td><td class="p-3">${version.prodOnayDate || '-'}</td>
            <td class="p-3 text-right">
                <button type="button" class="edit-version-btn inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800" data-version-id="${version.id}" aria-label="Versiyon düzenle">
                    ${actionEditIcon}
                    <span class="sr-only">Düzenle</span>
                </button>
                <button type="button" class="delete-version-btn inline-flex items-center justify-center p-1 text-red-600 hover:text-red-700" data-version-id="${version.id}" data-version-number="${version.versionNumber}" aria-label="Versiyon sil">
                    ${actionDeleteIcon}
                    <span class="sr-only">Sil</span>
                </button>
            </td></tr>`;
    }).join('');

    const usersTableRows = users.map(user => `
        <tr class="border-b">
            <td class="p-3 font-medium">${user.userName}</td>
            <td class="p-3">${user.name} ${user.surname}</td>
            <td class="p-3">${user.email || ''}</td>
            <td class="p-3 text-right">
                <button type="button" class="edit-user-btn inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800 mr-1" data-user-id="${user.id}" data-user-name="${user.userName}" aria-label="Kullanıcı düzenle">
                    ${actionEditIcon}
                    <span class="sr-only">Düzenle</span>
                </button>
                <button type="button" class="reset-password-btn inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800 mr-1" data-user-id="${user.id}" data-user-name="${user.userName}" aria-label="Şifre sıfırla">
                    ${actionResetIcon}
                    <span class="sr-only">Şifre Sıfırla</span>
                </button>
                <button type="button" class="delete-user-btn inline-flex items-center justify-center p-1 text-red-600 hover:text-red-700" data-user-id="${user.id}" data-user-name="${user.userName}" aria-label="Kullanıcı sil">
                    ${actionDeleteIcon}
                    <span class="sr-only">Sil</span>
                </button>
            </td>
        </tr>
    `).join('');

    const functionsTableRows = functions.length > 0 ? functions.map(fn => `
        <tr class="border-b">
            <td class="p-3 font-medium">${fn.name}</td>
            <td class="p-3 text-sm text-gray-600">${fn.description ? fn.description : ''}</td>
            <td class="p-3 text-right">
                <button type="button" class="manage-support-btn inline-flex items-center justify-center p-1 text-emerald-600 hover:text-emerald-700 mr-1" data-function-id="${fn.id}" data-function-name="${fn.name}" aria-label="Fonksiyon desteğini yönet">
                    ${actionSupportIcon}
                    <span class="sr-only">Desteği Yönet</span>
                </button>
                <button type="button" class="edit-function-btn inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800 mr-1" data-function-id="${fn.id}" aria-label="Fonksiyon düzenle">
                    ${actionEditIcon}
                    <span class="sr-only">Düzenle</span>
                </button>
                <button type="button" class="delete-function-btn inline-flex items-center justify-center p-1 text-red-600 hover:text-red-700" data-function-id="${fn.id}" data-function-name="${fn.name}" aria-label="Fonksiyon sil">
                    ${actionDeleteIcon}
                    <span class="sr-only">Sil</span>
                </button>
            </td>
        </tr>
    `).join('') : '<tr><td class="p-4 text-sm text-gray-500 text-center" colspan="3">Henüz fonksiyon tanımı yok.</td></tr>';

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
                <button class="tab-btn py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'functions' ? 'active' : ''}" data-tab="functions">Fonksiyonlar</button>
                <button class="tab-btn py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users' ? 'active' : ''}" data-tab="users">Kullanıcılar</button>
            </nav></div>
            <div class="p-6">
                <div id="vendors-tab" class="tab-content ${activeTab === 'vendors' ? 'active' : ''}">
                    <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Vendor Tanımları</h2><button id="add-vendor-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Vendor Ekle</button></div>
                    <div class="rounded-md border"><table class="zebra-table w-full text-sm"><thead><tr class="border-b">
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="vendors" data-sort-key="name">Vendor Adı ${getSortIcon(vendorSort, 'name')}</th>
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="vendors" data-sort-key="makeCode">Vendor Kodu ${getSortIcon(vendorSort, 'makeCode')}</th>
                        <th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${vendorsTableRows}</tbody></table></div>
                </div>
                <div id="models-tab" class="tab-content ${activeTab === 'models' ? 'active' : ''}">
                     <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Model Tanımları</h2><button id="add-model-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Model Ekle</button></div>
                     ${modelFilterBarHTML}
                    <div class="rounded-md border"><table class="zebra-table w-full text-sm"><thead><tr class="border-b">
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="models" data-sort-key="name">Model Adı ${getSortIcon(modelSort, 'name')}</th>
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="models" data-sort-key="code">Model Kodu ${getSortIcon(modelSort, 'code')}</th>
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="models" data-sort-key="vendorName">Vendor ${getSortIcon(modelSort, 'vendorName')}</th>
                        <th class="p-3 text-center">TechPOS</th>
                        <th class="p-3 text-center">Android</th>
                        <th class="p-3 text-center">ÖKC</th>
                        <th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${modelsTableRows}</tbody></table></div>
                </div>
                <div id="versions-tab" class="tab-content ${activeTab === 'versions' ? 'active' : ''}">
                    <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Versiyon Tanımları</h2><button id="add-version-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Versiyon Ekle</button></div>
                    <div class="rounded-md border"><table class="zebra-table w-full text-sm"><thead><tr class="border-b">
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="versions" data-sort-key="versionNumber">Versiyon No ${getSortIcon(versionSort, 'versionNumber')}</th>
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="versions" data-sort-key="vendorName">Vendor ${getSortIcon(versionSort, 'vendorName')}</th>
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="versions" data-sort-key="deliveryDate">Teslim Tarihi ${getSortIcon(versionSort, 'deliveryDate')}</th>
                        <th class="p-3 text-left">Geçerli Modeller</th>
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="versions" data-sort-key="status">Durum ${getSortIcon(versionSort, 'status')}</th>
                        <th class="p-3 text-left sortable-header cursor-pointer select-none" data-table="versions" data-sort-key="prodOnayDate">Prod Onay Tarihi ${getSortIcon(versionSort, 'prodOnayDate')}</th>
                        <th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${versionsTableRows}</tbody></table></div>
                </div>
                <div id="functions-tab" class="tab-content ${activeTab === 'functions' ? 'active' : ''}">
                    <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Fonksiyon Tanımları</h2><button id="add-function-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Fonksiyon Ekle</button></div>
                    <div class="rounded-md border"><table class="zebra-table w-full text-sm"><thead><tr class="border-b"><th class="p-3 text-left">Fonksiyon Adı</th><th class="p-3 text-left">Açıklama</th><th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${functionsTableRows}</tbody></table></div>
                </div>

                <div id="users-tab" class="tab-content ${activeTab === 'users' ? 'active' : ''}">
                    <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold">Kullanıcı Yönetimi</h2><button id="add-user-btn" class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md">Yeni Kullanıcı Ekle</button></div>
                    <div class="rounded-md border"><table class="zebra-table w-full text-sm"><thead><tr class="border-b">
                        <th class="p-3 text-left">Kullanıcı Adı</th>
                        <th class="p-3 text-left">İsim Soyisim</th>
                        <th class="p-3 text-left">E-posta</th>
                        <th class="p-3 text-right">İşlemler</th></tr></thead><tbody>${usersTableRows}</tbody></table></div>
                </div>
            </div>
        </div>`;
}
