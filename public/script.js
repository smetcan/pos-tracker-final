// public/script.js (Yeni Adıyla main.js de olabilir)

// =================================================================
// ANA UYGULAMA MANTIĞI
// =================================================================
// Bu dosya, diğer modüllerdeki (api.js, state.js, ui/, events.js)
// fonksiyonları kullanarak uygulamanın genel akışını ve mantığını yönetir.

(async () => {
    try {
        const response = await fetch('/api/session-check');
        const data = await response.json();
        if (!data.loggedIn) {
            if (window.location.pathname.indexOf('login.html') === -1) {
                window.location.href = '/login.html';
            }
        } else {
            // YENİ: Giriş yapan kullanıcının adını ekrana yaz
            const userNameSpan = document.getElementById('current-user-name');
            if(userNameSpan) {
                userNameSpan.textContent = data.user.userName;
            }
        }
    } catch (error) {
        console.error('Oturum kontrolü sırasında hata:', error);
        if (window.location.pathname.indexOf('login.html') === -1) {
            window.location.href = '/login.html';
        }
    }
})();


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
            const [stats, bulgularResponse] = await Promise.all([
                apiRequest(`/api/vendors/${vendorId}/stats`),
                apiRequest(`/api/bulgular?vendorId=${vendorId}&limit=1000`)
            ]);
            mainContent.innerHTML = getVendorDetailPageHTML(vendor, stats, bulgularResponse.data);
            attachBulguTableActionListeners(bulgularResponse.data);
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
            const [vendors, models, versions, users] = await Promise.all([
                apiRequest('/api/vendors'),
                apiRequest('/api/models'),
                apiRequest('/api/versions'),
                apiRequest('/api/users')
            ]);
            vendorsData = vendors;
            modelsData = models;
            versionsData = versions;
            usersData = users; // DÜZELTME: Kullanıcı verisini global değişkene kaydet
            mainContent.innerHTML = getYonetimHTML(vendors, models, versions, users, currentActiveTab);
            attachYonetimEventListeners();
        } else {
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
    attachAppEventListeners();
    attachSidebarToggleListeners();
