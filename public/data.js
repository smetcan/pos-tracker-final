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

        async function loadVendorContacts(vendorId) {
        try {
            return await apiRequest(`/api/vendors/${vendorId}/contacts`);
        } catch (error) {
            showErrorModal('İletişim kişileri yüklenirken hata oluştu: ' + error.message);
            return [];
        }
    }