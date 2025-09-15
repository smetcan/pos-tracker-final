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

    // Model Filtrelerini uygula
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

    const sortedModels = sortData(filteredModels, modelSort);

    // DÜZELTME: HTML'i çizerken global usersData değişkenini kullan
    mainContent.innerHTML = getYonetimHTML(vendorsData, sortedModels, versionsData, usersData, currentActiveTab);
    
    attachYonetimEventListeners();

    // Filtre elemanlarının değerlerini koru
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