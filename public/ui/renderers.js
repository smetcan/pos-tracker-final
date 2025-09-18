// public/ui/renderers.js

function renderDashboardCharts(stats) {
    const { statusDistribution = [], bulguByVendor = [], breakdown = {} } = stats;
    const statusByType = breakdown.statusByType || [];
    const vendorByType = breakdown.vendorByType || [];

    const typeColors = {
        'Program Hatası': { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgba(239, 68, 68, 1)', pie: '#EF4444' },
        'Yeni Talep': { bg: 'rgba(4, 120, 87, 0.6)', border: 'rgba(4, 120, 87, 1)', pie: '#0EA5E9' }
    };

    const getTypeColor = (type, key) => (typeColors[type] ? typeColors[type][key] : (key === 'pie' ? '#6B7280' : 'rgba(107,114,128,0.6)'));

    const types = Array.from(new Set([...statusByType.map(item => item.type), ...vendorByType.map(item => item.type)])).filter(Boolean);

    // Pie chart: stacked dataset by type per status (showing distribution per type).
    const pieCtx = document.getElementById('statusPieChart')?.getContext('2d');
    if (pieCtx && types.length) {
        const pieLabels = Array.from(new Set(statusDistribution.map(item => item.status)));
        const datasets = types.map(type => ({
            label: type,
            data: pieLabels.map(status => {
                const match = statusByType.find(item => item.type === type && item.status === status);
                return match ? match.count : 0;
            }),
            backgroundColor: getTypeColor(type, 'bg'),
            borderColor: getTypeColor(type, 'border'),
            borderWidth: 1
        }));

        new Chart(pieCtx, {
            type: 'doughnut',
            data: { labels: pieLabels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { bottom: 16 } },
                plugins: {
                    tooltip: { mode: 'index', intersect: false },
                    legend: { position: 'top' }
                }
            }
        });
    }

    // Vendor bar chart with datasets per type
    const barCtx = document.getElementById('vendorBarChart')?.getContext('2d');
    if (barCtx) {
        const labels = bulguByVendor.map(item => item.name);
        const datasets = types.length ? types.map(type => ({
            label: type,
            data: labels.map(vendorName => {
                const match = vendorByType.find(item => item.vendorName === vendorName && item.type === type);
                return match ? match.count : 0;
            }),
            backgroundColor: getTypeColor(type, 'bg'),
            borderColor: getTypeColor(type, 'border'),
            borderWidth: 1
        })) : [{
            label: 'Bulgu Sayısı',
            data: bulguByVendor.map(item => item.count),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
        }];

        new Chart(barCtx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    x: { beginAtZero: true, stacked: true },
                    y: { stacked: true }
                }
            }
        });
    }
}

function renderBulgularPage(bulgular, pagination, options = {}) {
    mainContent.innerHTML = getBulgularPageHTML(bulgular, pagination);
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
    if (modelFilters.searchTerm) { filteredModels = filteredModels.filter(m => m.name.toLowerCase().includes(modelFilters.searchTerm.toLowerCase()) || m.code?.toLowerCase().includes(modelFilters.searchTerm.toLowerCase())); }
    if (modelFilters.vendorId !== 'all') { filteredModels = filteredModels.filter(m => String(m.vendorId) === String(modelFilters.vendorId)); }
    if (modelFilters.isTechpos !== 'all') { filteredModels = filteredModels.filter(m => String(m.isTechpos) === String(modelFilters.isTechpos)); }
    if (modelFilters.isAndroidPos !== 'all') { filteredModels = filteredModels.filter(m => String(m.isAndroidPos) === String(modelFilters.isAndroidPos)); }
    if (modelFilters.isOkcPos !== 'all') { filteredModels = filteredModels.filter(m => String(m.isOkcPos) === String(modelFilters.isOkcPos)); }
    
    const sortedVendors = sortData(vendorsData, vendorSort);
    const sortedModels = sortData(filteredModels, modelSort);
    const sortedVersions = sortData(versionsData, versionSort);
    const sortedFunctions = sortData(functionsData, functionSort);
    mainContent.innerHTML = getYonetimHTML(sortedVendors, sortedModels, sortedVersions, usersData, sortedFunctions, currentActiveTab);

    document.getElementById('model-search-input').value = modelFilters.searchTerm;
    document.getElementById('model-vendor-filter').value = modelFilters.vendorId;
    document.getElementById('model-techpos-filter').value = modelFilters.isTechpos;
    document.getElementById('model-android-filter').value = modelFilters.isAndroidPos;
    document.getElementById('model-okc-filter').value = modelFilters.isOkcPos;
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

function renderFunctionSupportPage(treeData, matrixData, view = 'tree') {
    mainContent.innerHTML = getFunctionSupportPageHTML(treeData, matrixData, view);
}

async function fetchAndRenderBulgular(options = {}) {
    bulguFilters.currentPage = options.page || bulguFilters.currentPage;
    const params = new URLSearchParams({ page: bulguFilters.currentPage, limit: 100, searchTerm: bulguFilters.searchTerm, vendorId: bulguFilters.vendorId, status: bulguFilters.status, tip: bulguFilters.tip });
    try {
        mainContent.innerHTML = getBulgularPageHTML([], {});
        const searchInput = document.getElementById('bulgu-search-input');
        if(searchInput) searchInput.value = bulguFilters.searchTerm;
        
        const response = await apiRequest(`/api/bulgular?${params.toString()}`);
        bulgularData = response.data;
        bulguBreakdown = response.breakdown || { byType: [], statusByType: [] };
        renderBulgularPage(response.data, response.pagination, options);
        // Render sonrası aksiyon ve filtre olaylarını yeniden bağla
        if (typeof attachBulgularEventListeners === 'function') {
            attachBulgularEventListeners(bulgularData);
        }
    } catch (error) {
        modalContainer.innerHTML = showErrorModal('Bulgular yüklenirken bir hata oluştu: ' + error.message);
        document.getElementById('close-error-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');
    }
}
