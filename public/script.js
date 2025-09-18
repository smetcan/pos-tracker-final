// public/script.js - NIHAI KOD

// Router fonksiyonunu global kapsamda erişilebilir hale getirmek için önce değişken olarak tanımlıyoruz.
let router;

document.addEventListener('DOMContentLoaded', main);

async function main() {
    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }

    // 1. OTURUM KONTROLÜ
    try {
        const session = await apiRequest('/api/session-check');
        if (!session.loggedIn) {
            if (!window.location.pathname.includes('login.html')) window.location.href = '/login.html';
            return;
        }
        currentUser = session.user;
    } catch (error) {
        console.error('Oturum kontrolü başarısız:', error);
        if (!window.location.pathname.includes('login.html')) window.location.href = '/login.html';
        return;
    }

    // 2. ANA UYGULAMA MANTIĞI
    const userNameSpan = document.getElementById('current-user-name');
    if (userNameSpan) {
        const displayName = [currentUser.name, currentUser.surname].filter(Boolean).join(' ').trim();
        userNameSpan.textContent = displayName || currentUser.userName || '';
    }

    // Yönlendirici (Router) fonksiyonunu, global değişkene atıyoruz.
    router = async function() {
        const hash = window.location.hash || '#/dashboard';
        mainContent.innerHTML = '<h1 class="text-3xl font-bold">Yükleniyor...</h1>';
        
        Object.values(navLinks).forEach(link => link.classList.remove('active'));
        if(sidebarVendorList) sidebarVendorList.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));

        try {
            if (hash.startsWith('#/vendor/')) {
                if(sidebarVendorList) document.querySelector(`.sidebar-link[href="${hash}"]`)?.classList.add('active');
                const vendorId = hash.split('/')[2];
                const vendor = vendorsData.find(v => v.id == vendorId);
                if (!vendor) throw new Error('Vendor bulunamadı!');
                const [stats, bulgularResponse] = await Promise.all([
                    apiRequest(`/api/vendors/${vendorId}/stats`),
                    apiRequest(`/api/bulgular?vendorId=${vendorId}&limit=1000`)
                ]);
                mainContent.innerHTML = getVendorDetailPageHTML(vendor, stats, bulgularResponse.data);
                attachBulguTableActionListeners(bulgularResponse.data);
            } else if (hash === '#/bulgular') {
                navLinks.bulgular.classList.add('active');
                // Vendorlar yüklüyse bile modeller/versiyonlar boş olabilir; hepsini garantiye al
                if (vendorsData.length === 0 || modelsData.length === 0 || versionsData.length === 0) {
                    const [vendors, models, versions] = await Promise.all([
                        apiRequest('/api/vendors'), apiRequest('/api/models'), apiRequest('/api/versions')
                    ]);
                    vendorsData = vendors; modelsData = models; versionsData = versions;
                }
                await fetchAndRenderBulgular({ page: 1 });
                attachBulgularEventListeners(bulgularData);
            } else if (hash === '#/yonetim') {
                navLinks.yonetim.classList.add('active');
                const [vendors, models, versions, users, functionsList] = await Promise.all([
                    apiRequest('/api/vendors'), apiRequest('/api/models'), apiRequest('/api/versions'), apiRequest('/api/users'), apiRequest('/api/functions')
                ]);
                vendorsData = vendors; modelsData = models; versionsData = versions; usersData = users; functionsData = functionsList;
                renderYonetimPage();
                attachYonetimEventListeners();
            } else if (hash === '#/functions') {
                navLinks.functions.classList.add('active');
                const [treeData, matrixData] = await Promise.all([
                    apiRequest('/api/function-support/tree'),
                    apiRequest('/api/function-support/matrix')
                ]);
                functionSupportTreeData = treeData;
                functionSupportMatrixData = matrixData;
                activeFunctionSupportView = 'tree';
                renderFunctionSupportPage(functionSupportTreeData, functionSupportMatrixData, activeFunctionSupportView);
                attachFunctionSupportPageListeners();
            } else { // Dashboard veya tanımsız hash
                navLinks.dashboard.classList.add('active');
                const stats = await apiRequest('/api/dashboard');
                mainContent.innerHTML = getDashboardHTML(stats);
                renderDashboardCharts(stats);
                attachBulguTableActionListeners(stats.sonBulgular);
            }
        } catch (error) {
            modalContainer.innerHTML = showErrorModal('Sayfa yüklenirken hata oluştu: ' + error.message);
            document.getElementById('close-error-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');
        }
    }

    // 3. BAŞLANGIÇ
    navLinks.dashboard.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/dashboard'; });
    navLinks.yonetim.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/yonetim'; });
    navLinks.bulgular.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/bulgular'; });
    navLinks.functions?.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = '#/functions'; });
    window.addEventListener('hashchange', router);
    attachAppEventListeners();
    attachSidebarToggleListeners();
    await loadSidebarVendors();
    await router();
}
