// public/ui/renderers.js

function renderDashboardCharts(stats) {
    const { statusDistribution, bulguByVendor } = stats;
    const pieCtx = document.getElementById('statusPieChart')?.getContext('2d');
    if (pieCtx) { new Chart(pieCtx, { type: 'pie', data: { labels: statusDistribution.map(item => item.status), datasets: [{ data: statusDistribution.map(item => item.count), backgroundColor: ['#EF4444', '#3B82F6', '#6B7280', '#F59E0B'] }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { bottom: 16 } } } }); }
    const barCtx = document.getElementById('vendorBarChart')?.getContext('2d');
    if (barCtx) { new Chart(barCtx, { type: 'bar', data: { labels: bulguByVendor.map(item => item.name), datasets: [{ label: 'Bulgu Sayısı', data: bulguByVendor.map(item => item.count), backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } } }); }
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
