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

    // Yonetim sayfasındaki yeni ekleme butonları için global click handler
    document.addEventListener('click', async (evt) => {
        const t = evt.target;
        if (!t) return;
        // Yeni Model Ekle
        if (t.id === 'add-model-btn') {
            evt.preventDefault();
            modalContainer.innerHTML = getModelModalHTML(vendorsData);
            document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
            document.getElementById('model-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    name: document.getElementById('model-name').value,
                    code: document.getElementById('model-code').value,
                    vendorId: document.getElementById('model-vendor-id').value,
                    isTechpos: document.getElementById('model-is-techpos').checked,
                    isAndroidPos: document.getElementById('model-is-android-pos').checked,
                    isOkcPos: document.getElementById('model-is-okc-pos').checked,
                };
                try {
                    await apiRequest('/api/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    modalContainer.innerHTML = '';
                    router();
                } catch (error) {
                    showErrorModal(error.message);
                }
            });
            return;
        }

        // Yeni Versiyon Ekle
        if (t.id === 'add-version-btn') {
            evt.preventDefault();
            modalContainer.innerHTML = getVersionModalHTML(vendorsData, modelsData);
            attachVersionModalListeners();
            return;
        }

        // Yeni Kullanıcı Ekle
        if (t.id === 'add-user-btn') {
            evt.preventDefault();
            modalContainer.innerHTML = getUserModalHTML();
            document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
            document.getElementById('user-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    userName: document.getElementById('user-userName').value,
                    name: document.getElementById('user-name').value,
                    surname: document.getElementById('user-surname').value,
                    email: document.getElementById('user-email').value,
                    password: document.getElementById('user-password').value,
                };
                try {
                    await apiRequest('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    modalContainer.innerHTML = '';
                    router();
                } catch (error) {
                    showErrorModal(error.message);
                }
            });
        }
    });
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

function attachBulguModalListeners(bulgu = {}, attachments = []) {
    const vendorSelect = document.getElementById('bulgu-vendor-id');
    const modelsContainer = document.getElementById('bulgu-models-container');
    const versionSelect = document.getElementById('bulgu-cozum-versiyon-id');
    const selectAllCheckbox = document.getElementById('select-all-models');
    const statusSelect = document.getElementById('bulgu-status');
    const onayFieldsContainer = document.getElementById('onay-fields-container');
    const onaylayanInput = document.getElementById('bulgu-cozum-onaylayan-kullanici');
    const onayTarihiInput = document.getElementById('bulgu-cozum-onay-tarihi');

    // --- GÜNCELLEME: Durum değişikliğini dinle ---
    if (statusSelect) {
        // --- GÜNCELLEME: Durum değişikliği mantığı iyileştirildi ---
        const handleStatusChange = () => {
            const isKapali = statusSelect.value === 'Kapalı';
            
            onayFieldsContainer.classList.toggle('hidden', !isKapali);
            onaylayanInput.required = isKapali;
            onayTarihiInput.required = isKapali;

            if (isKapali) {
                // Eğer "Kapalı" seçildiyse ve onaylayan boşsa, otomatik doldur
                if (!onaylayanInput.value) {
                    onaylayanInput.value = `${currentUser.name} ${currentUser.surname}`;
                    onayTarihiInput.value = new Date().toISOString().split('T')[0];
                }
            } else {
                // "Kapalı" değilse, onay alanlarını temizle
                onaylayanInput.value = '';
                onayTarihiInput.value = '';
            }
        };
        
        statusSelect.addEventListener('change', handleStatusChange);
        handleStatusChange(); // Sayfa ilk açıldığında da durumu kontrol et
    }

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
        const selectedIds = (bulgu && bulgu.modelIds)
            ? (typeof bulgu.modelIds === 'string' ? bulgu.modelIds.split(',').map(s => s.trim()) : bulgu.modelIds)
            : [];
        const selectedNames = (!selectedIds || selectedIds.length === 0) && bulgu && bulgu.models
            ? (typeof bulgu.models === 'string' ? bulgu.models.split(',').map(s => s.trim()) : bulgu.models)
            : [];
        modelsContainer.innerHTML = filteredModels.map(m => {
            const isChecked = (selectedIds && selectedIds.map(String).includes(String(m.id))) ||
                              (selectedNames && selectedNames.includes(m.name));
            return `
            <div class="flex items-center">
                <input type="checkbox" id="model-${m.id}" value="${m.id}" class="model-checkbox h-4 w-4 rounded border-gray-300" ${isChecked ? 'checked' : ''}>
                <label for="model-${m.id}" class="ml-2 block text-sm text-gray-900">${m.name}</label>
            </div>`;
        }).join('');
    };

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
        if (bulgu && bulgu.cozumVersiyonId) { try { versionSelect.value = String(bulgu.cozumVersiyonId); } catch (_) {} }
    };

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

    document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
    
    // Açılışta seçili vendor ve duruma göre alanları doldur
    try {
        if (vendorSelect) {
            if (bulgu && bulgu.id) {
                vendorSelect.disabled = true;
            }
            updateModelsList();
            updateVersionsList();
        }
        if (statusSelect) {
            toggleOnayFields();
        }
    } catch (_) { /* no-op */ }

    document.querySelectorAll('.delete-attachment-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const attachmentId = e.currentTarget.dataset.attachmentId;
            if (confirm('Bu eki silmek istediğinizden emin misiniz?')) {
                try {
                    await apiRequest(`/api/attachments/${attachmentId}`, { method: 'DELETE' });
                    document.getElementById(`attachment-${attachmentId}`).remove();
                    const attachmentsList = document.getElementById('attachments-list');
                    if (attachmentsList && attachmentsList.children.length === 0) {
                        attachmentsList.innerHTML = '<p class="text-xs text-gray-500 text-center py-2">Ekli dosya yok.</p>';
                    }
                } catch (error) {
                    showErrorModal(error.message);
                }
            }
        });
    });

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
            cozumOnayAciklamasi: document.getElementById('bulgu-cozum-onay-aciklama')?.value || null,
            detayliAciklama: document.getElementById('bulgu-detayli-aciklama').value,
            notlar: document.getElementById('bulgu-notlar')?.value || null,
            modelIds: selectedModelIds
        };

        try {
            let targetBulguId = id;

            if (id) {
                await apiRequest(`/api/bulgular/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bulguData) });
            } else {
                const newBulguResponse = await apiRequest('/api/bulgular', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bulguData) });
                targetBulguId = newBulguResponse.id;
            }

            // Persist Notlar separately to ensure it is saved
            if (targetBulguId) {
                await apiRequest(`/api/bulgu/${targetBulguId}/notlar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notlar: bulguData.notlar })
                });
            }
            
            const fileInput = document.getElementById('bulgu-attachments');
            if (targetBulguId && fileInput && fileInput.files.length > 0) {
                const formData = new FormData();
                for (const file of fileInput.files) {
                    formData.append('attachments', file);
                }
                
                const fileResponse = await fetch(`/api/bulgu/${targetBulguId}/attachments`, {
                    method: 'POST',
                    body: formData
                });
                if (!fileResponse.ok) {
                    const errorData = await fileResponse.json();
                    throw new Error(errorData.error || 'Dosya yüklenirken bir hata oluştu.');
                }
            }

            modalContainer.innerHTML = '';
            fetchAndRenderBulgular({ page: bulguFilters.currentPage });
        } catch (error) {
            showErrorModal(error.message);
        }
    });
}

    function attachBulguImportModalListeners() {
    // DÜZELTME: class ile tüm iptal butonlarını dinle
    document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
    
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
            encoding: "ISO-8859-9",
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const records = results.data;
                totalRecords.textContent = records.length;
                let processedCount = 0;
                const batchSize = 50;
                let hasErrors = false;

                for (let i = 0; i < records.length; i += batchSize) {
                    const batch = records.slice(i, i + batchSize);
                    try {
                        const response = await apiRequest('/api/bulgular/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ records: batch })
                        });
                        if (response.errors && response.errors.length > 0) {
                            hasErrors = true;
                            response.errors.forEach(err => {
                                importResultsDiv.innerHTML += `<p class="text-red-600">Satır ${err.rowIndex}: ${err.error}</p>`;
                            });
                        }
                        processedCount += batch.length;
                        progressCount.textContent = processedCount;
                        progressBar.style.width = `${(processedCount / records.length) * 100}%`;
                    } catch (error) {
                        hasErrors = true;
                        importResultsDiv.innerHTML += `<p class="text-red-600">Toplu işlem sırasında hata: ${error.message}</p>`;
                        processedCount += batch.length;
                        progressCount.textContent = processedCount;
                        progressBar.style.width = `${(processedCount / records.length) * 100}%`;
                    }
                }

                progressDiv.classList.add('hidden');
                importResultsDiv.classList.remove('hidden');
                if (!hasErrors) {
                    importResultsDiv.innerHTML = '<p class="text-green-600">Tüm kayıtlar başarıyla içeri aktarıldı.</p>';
                    startImportBtn.disabled = true;
                } else {
                    startImportBtn.disabled = false;
                    if (!importResultsDiv.innerHTML) {
                        importResultsDiv.innerHTML = '<p class="text-red-600">İçe aktarma tamamlanamadı. Lütfen hataları kontrol edin.</p>';
                    }
                }
                bulgularData = []
                fetchAndRenderBulgular({ page: 1 }); // Sayfayı yenile
            },
            error: (err) => {
                showErrorModal('CSV dosyasını ayrıştırma hatası: ' + err.message);
                progressDiv.classList.add('hidden');
                startImportBtn.disabled = false;
            }
        });
    });
}

function attachBulguTableActionListeners(bulgular) {
    document.getElementById('add-bulgu-btn')?.addEventListener('click', () => {
        // Yeni bulgu eklerken dosya ekleme özelliği olmayacağı için boş array gönderiyoruz.
        modalContainer.innerHTML = getBulguModalHTML(vendorsData, modelsData, versionsData, {});
        attachBulguModalListeners({});
    });

    document.getElementById('import-bulgu-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getBulguImportModalHTML();
        attachBulguImportModalListeners();
    });

    document.querySelectorAll('.view-bulgu-btn').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = link.dataset.bulguId;
            const bulgu = bulgular.find(b => String(b.id) === String(id)) || bulgularData.find(b => String(b.id) === String(id));
            if (bulgu) {
                try {
                    // --- GÜNCELLEME: Artık 3 API'yı birden çağırıyoruz ---
                    const [attachments, history] = await Promise.all([
                        apiRequest(`/api/bulgu/${id}/attachments`),
                        apiRequest(`/api/bulgu/${id}/history`)
                    ]);
                    
                    modalContainer.innerHTML = getBulguViewModalHTML(bulgu, attachments, history); // History verisini modal'a gönder
                    
                    document.querySelectorAll('[data-close-bulgu-view]').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
                } catch (error) {
                    modalContainer.innerHTML = showErrorModal('Bulgu detayları yüklenirken hata oluştu: ' + error.message);
                    document.getElementById('close-error-modal')?.addEventListener('click', () => modalContainer.innerHTML = '');
                }
            }
        });
    });

    document.querySelectorAll('.edit-bulgu-btn').forEach(button => {
        button.addEventListener('click', async () => { // async eklendi
            const bulguId = button.dataset.bulguId;
            const bulguToEdit = bulgular.find(b => b.id == bulguId) || bulgularData.find(b => b.id == bulguId);
            if (bulguToEdit) {
                // YENİ: Pencereyi açmadan önce ekleri çek
                const attachments = await apiRequest(`/api/bulgu/${bulguId}/attachments`);
                modalContainer.innerHTML = getBulguModalHTML(vendorsData, modelsData, versionsData, bulguToEdit, attachments);
                attachBulguModalListeners(bulguToEdit, attachments); // Ekleri olay dinleyiciye de gönder
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
            router(); // Sayfayı yeniden çizmek için ana router'ı çağır.
        });
    });

    // --- Model Filtreleri ---
    document.getElementById('model-search-input')?.addEventListener('input', (e) => {
        modelFilters.searchTerm = e.target.value;
        router(); // Sayfayı yeniden çizmek için ana router'ı çağır.
    });
    document.getElementById('model-vendor-filter')?.addEventListener('change', (e) => {
        modelFilters.vendorId = e.target.value;
        router();
    });
    document.getElementById('model-techpos-filter')?.addEventListener('change', (e) => {
        modelFilters.isTechpos = e.target.value;
        router();
    });
    document.getElementById('model-android-filter')?.addEventListener('change', (e) => {
        modelFilters.isAndroidPos = e.target.value;
        router();
    });
    document.getElementById('model-okc-filter')?.addEventListener('change', (e) => {
        modelFilters.isOkcPos = e.target.value;
        router();
    });
    document.getElementById('clear-model-filters-btn')?.addEventListener('click', () => {
        modelFilters = { searchTerm: '', vendorId: 'all', isTechpos: 'all', isAndroidPos: 'all', isOkcPos: 'all' };
        router();
    });

    // --- CRUD Butonları ---
    document.getElementById('add-vendor-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getVendorModalHTML();
        attachVendorModalListeners();
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

    // Vendor: İletişim kişileri
    document.querySelectorAll('.open-contacts-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const vendorId = button.dataset.vendorId;
            const vendor = vendorsData.find(v => v.id == vendorId);
            if (!vendor) return;
            const contacts = await apiRequest(`/api/vendors/${vendorId}/contacts`).catch(() => []);
            modalContainer.innerHTML = getVendorContactsModalHTML(vendor, contacts);
            document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
        });
    });

    // Vendor: Sil
    document.querySelectorAll('.delete-vendor-btn').forEach(button => {
        button.addEventListener('click', () => {
            const vendorId = button.dataset.vendorId;
            const vendorName = button.dataset.vendorName || '';
            modalContainer.innerHTML = getDeleteConfirmModalHTML(`"${vendorName}" vendorı silinsin mi?`, 'Bu işlem geri alınamaz.');
            document.getElementById('cancel-delete')?.addEventListener('click', () => modalContainer.innerHTML = '');
            document.getElementById('confirm-delete')?.addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/vendors/${vendorId}`, { method: 'DELETE' });
                    modalContainer.innerHTML = '';
                    router();
                } catch (error) {
                    modalContainer.innerHTML = '';
                    showErrorModal(error.message);
                }
            });
        });
    });

    // Model: Yeni butonu zaten yukarıda eklendi (add-model-btn)

    // Model: Düzenle
    document.querySelectorAll('.edit-model-btn').forEach(button => {
        button.addEventListener('click', () => {
            const modelId = button.dataset.modelId;
            const model = modelsData.find(m => m.id == modelId);
            if (!model) return;
            modalContainer.innerHTML = getModelModalHTML(vendorsData, model);
            document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
            document.getElementById('model-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    name: document.getElementById('model-name').value,
                    code: document.getElementById('model-code').value,
                    vendorId: document.getElementById('model-vendor-id').value,
                    isTechpos: document.getElementById('model-is-techpos').checked,
                    isAndroidPos: document.getElementById('model-is-android-pos').checked,
                    isOkcPos: document.getElementById('model-is-okc-pos').checked,
                };
                try {
                    await apiRequest(`/api/models/${modelId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    modalContainer.innerHTML = '';
                    router();
                } catch (error) {
                    showErrorModal(error.message);
                }
            });
        });
    });

    // Model: Sil
    document.querySelectorAll('.delete-model-btn').forEach(button => {
        button.addEventListener('click', () => {
            const modelId = button.dataset.modelId;
            const modelName = button.dataset.modelName || '';
            modalContainer.innerHTML = getDeleteConfirmModalHTML(`"${modelName}" modeli silinsin mi?`, 'Bu işlem geri alınamaz.');
            document.getElementById('cancel-delete')?.addEventListener('click', () => modalContainer.innerHTML = '');
            document.getElementById('confirm-delete')?.addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/models/${modelId}`, { method: 'DELETE' });
                    modalContainer.innerHTML = '';
                    router();
                } catch (error) {
                    modalContainer.innerHTML = '';
                    showErrorModal(error.message);
                }
            });
        });
    });

    // Versiyon: Görüntüle
    document.querySelectorAll('.view-version-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const versionId = link.dataset.versionId;
            const version = versionsData.find(v => v.id == versionId);
            if (!version) return;
            modalContainer.innerHTML = getVersionViewModalHTML(version);
            document.querySelectorAll('.close-modal-btn, .cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
        });
    });

    // Versiyon: Düzenle
    document.querySelectorAll('.edit-version-btn').forEach(button => {
        button.addEventListener('click', () => {
            const versionId = button.dataset.versionId;
            const version = versionsData.find(v => v.id == versionId);
            if (!version) return;
            modalContainer.innerHTML = getVersionModalHTML(vendorsData, modelsData, version);
            attachVersionModalListeners(version);
        });
    });

    // Versiyon: Sil
    document.querySelectorAll('.delete-version-btn').forEach(button => {
        button.addEventListener('click', () => {
            const versionId = button.dataset.versionId;
            const versionNumber = button.dataset.versionNumber || '';
            modalContainer.innerHTML = getDeleteConfirmModalHTML(`"${versionNumber}" versiyonu silinsin mi?`, 'Bu işlem geri alınamaz.');
            document.getElementById('cancel-delete')?.addEventListener('click', () => modalContainer.innerHTML = '');
            document.getElementById('confirm-delete')?.addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/versions/${versionId}`, { method: 'DELETE' });
                    modalContainer.innerHTML = '';
                    router();
                } catch (error) {
                    modalContainer.innerHTML = '';
                    showErrorModal(error.message);
                }
            });
        });
    });

    // Kullanıcı: Şifre Sıfırla
    document.querySelectorAll('.reset-password-btn').forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.dataset.userId;
            const userName = button.dataset.userName || '';
            modalContainer.innerHTML = getResetPasswordModalHTML(userName);
            document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
            document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPassword = document.getElementById('new-password').value;
                try {
                    await apiRequest(`/api/users/${userId}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword }) });
                    modalContainer.innerHTML = '';
                } catch (error) {
                    showErrorModal(error.message);
                }
            });
        });
    });

    // Kullanıcı: Sil
    document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.dataset.userId;
            const userName = button.dataset.userName || '';
            modalContainer.innerHTML = getDeleteConfirmModalHTML(`Kullanıcı "${userName}" silinsin mi?`, 'Bu işlem geri alınamaz.');
            document.getElementById('cancel-delete')?.addEventListener('click', () => modalContainer.innerHTML = '');
            document.getElementById('confirm-delete')?.addEventListener('click', async () => {
                try {
                    await apiRequest(`/api/users/${userId}`, { method: 'DELETE' });
                    modalContainer.innerHTML = '';
                    router();
                } catch (error) {
                    modalContainer.innerHTML = '';
                    showErrorModal(error.message);
                }
            });
        });
    });

    // Kullanıcı: Düzenle (dinamik ekleme veya var olan butonlar)
    const usersTbody = document.querySelector('#users-tab tbody');
    if (usersTbody && usersData && Array.isArray(usersData)) {
        const rows = usersTbody.querySelectorAll('tr');
        rows.forEach((tr, idx) => {
            const actionsCell = tr.querySelector('td.p-3.text-right') || tr.lastElementChild;
            if (!actionsCell) return;
            let editBtn = actionsCell.querySelector('.edit-user-btn');
            if (!editBtn) {
                editBtn = document.createElement('button');
                editBtn.className = 'edit-user-btn p-1 text-sm text-blue-600';
                editBtn.textContent = 'Düzenle';
                editBtn.style.marginRight = '6px';
                actionsCell.prepend(editBtn);
            }
            const user = usersData[idx];
            if (!user) return;
            editBtn.onclick = () => {
                modalContainer.innerHTML = getUserModalHTML(user);
                document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
                // Alanları mevcut değerlerle doldur (şablon dolduramadıysa)
                const nameInput = document.getElementById('user-name');
                const surnameInput = document.getElementById('user-surname');
                const userNameInput = document.getElementById('user-userName');
                const emailInput = document.getElementById('user-email');
                if (nameInput && !nameInput.value) nameInput.value = user.name || '';
                if (surnameInput && !surnameInput.value) surnameInput.value = user.surname || '';
                if (userNameInput && !userNameInput.value) userNameInput.value = user.userName || '';
                if (emailInput && !emailInput.value) emailInput.value = user.email || '';
                // Şifre alanını gizle/opsiyonel yap
                const pwdInput = document.getElementById('user-password');
                if (pwdInput) {
                    pwdInput.removeAttribute('required');
                    const pwdWrapper = pwdInput.closest('.col-span-2');
                    if (pwdWrapper) pwdWrapper.classList.add('hidden');
                }
                // Submit -> PUT /api/users/:id
                document.getElementById('user-form')?.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const payload = {
                        userName: document.getElementById('user-userName').value,
                        name: document.getElementById('user-name').value,
                        surname: document.getElementById('user-surname').value,
                        email: document.getElementById('user-email').value
                    };
                    try {
                        await apiRequest(`/api/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                        modalContainer.innerHTML = '';
                        router();
                    } catch (error) {
                        showErrorModal(error.message);
                    }
                });
            };
        });
    }
    // ... Diğer tüm .edit, .delete, .add butonlarının olayları aynı kalacak ...
    // Kısacası, bu dosyanın geri kalanını mevcut kodlarından kopyalayabilirsin,
    // sadece yukarıdaki renderYonetimPage() çağrılarının router() ile değiştirildiğinden emin ol.
    // Yeni Model Ekle
    document.getElementById('add-model-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getModelModalHTML(vendorsData);
        document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
        document.getElementById('model-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('model-name').value,
                code: document.getElementById('model-code').value,
                vendorId: document.getElementById('model-vendor-id').value,
                isTechpos: document.getElementById('model-is-techpos').checked,
                isAndroidPos: document.getElementById('model-is-android-pos').checked,
                isOkcPos: document.getElementById('model-is-okc-pos').checked,
            };
            try {
                await apiRequest('/api/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                modalContainer.innerHTML = '';
                router();
            } catch (error) {
                showErrorModal(error.message);
            }
        });
    });

    // Yeni Versiyon Ekle
    document.getElementById('add-version-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getVersionModalHTML(vendorsData, modelsData);
        attachVersionModalListeners();
    });

    // Yeni Kullanıcı Ekle
    document.getElementById('add-user-btn')?.addEventListener('click', () => {
        modalContainer.innerHTML = getUserModalHTML();
        document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));
        document.getElementById('user-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                userName: document.getElementById('user-userName').value,
                name: document.getElementById('user-name').value,
                surname: document.getElementById('user-surname').value,
                email: document.getElementById('user-email').value,
                password: document.getElementById('user-password').value,
            };
            try {
                await apiRequest('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                modalContainer.innerHTML = '';
                router();
            } catch (error) {
                showErrorModal(error.message);
            }
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
    
    const exportButton = document.getElementById('bulgu-export-btn');
    if (exportButton) {
        exportButton.addEventListener('click', async () => {
            if (exportButton.dataset.loading === 'true') return;
            const originalText = exportButton.textContent;
            exportButton.dataset.loading = 'true';
            exportButton.disabled = true;
            exportButton.textContent = 'Hazırlanıyor...';
            try {
                const params = new URLSearchParams();
                if (bulguFilters.vendorId && bulguFilters.vendorId !== 'all') params.append('vendorId', bulguFilters.vendorId);
                if (bulguFilters.status && bulguFilters.status !== 'all') params.append('status', bulguFilters.status);
                if (bulguFilters.tip && bulguFilters.tip !== 'all') params.append('tip', bulguFilters.tip);
                if (bulguFilters.searchTerm) params.append('searchTerm', bulguFilters.searchTerm);
                const queryString = params.toString();
                const exportUrl = queryString ? `/api/bulgular/export?${queryString}` : '/api/bulgular/export';
                const response = await fetch(exportUrl, { credentials: 'same-origin' });
                if (!response.ok) {
                    let message = 'Dışa aktarma işlemi başarısız oldu.';
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        try {
                            const body = await response.json();
                            if (body && body.error) message = body.error;
                        } catch (_) {}
                    } else {
                        const errorText = await response.text();
                        if (errorText) message = errorText;
                    }
                    throw new Error(message);
                }
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = downloadUrl;
                const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
                anchor.download = `bulgu-export-${timestamp}.csv`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 5000);
            } catch (error) {
                const errorMessage = error && error.message ? error.message : 'Dışa aktarma işlemi sırasında beklenmeyen bir hata oluştu.';
                showErrorModal(errorMessage);
            } finally {
                exportButton.disabled = false;
                exportButton.textContent = originalText;
                delete exportButton.dataset.loading;
            }
        });
    }

    // 3. ADIM: Filtre elemanlarının değerlerini koru
    if (searchInput) searchInput.value = bulguFilters.searchTerm;
    const vendorFilter = document.getElementById('bulgu-vendor-filter');
    if (vendorFilter) vendorFilter.value = bulguFilters.vendorId;
    const statusFilter = document.getElementById('bulgu-status-filter');
    if (statusFilter) statusFilter.value = bulguFilters.status;
    const tipFilter = document.getElementById('bulgu-tip-filter');
    if (tipFilter) tipFilter.value = bulguFilters.tip;
}

function attachAppEventListeners() {
    // Çıkış Yap Butonu
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await apiRequest('/api/logout', { method: 'POST' });
            try { document.cookie = 'connect.sid=; Max-Age=0; path=/'; } catch (_) {}
            window.location.href = '/login.html';
        } catch (error) {
            showErrorModal('Çıkış yapılırken bir hata oluştu.');
        }
    });

    // Şifre Değiştir Butonu
    document.getElementById('change-password-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        modalContainer.innerHTML = getChangePasswordModalHTML();

        document.querySelectorAll('.cancel-modal-btn').forEach(btn => btn.addEventListener('click', () => modalContainer.innerHTML = ''));

        document.getElementById('change-password-form')?.addEventListener('submit', async (formEvent) => {
            formEvent.preventDefault();
            const oldPassword = document.getElementById('old-password').value;
            const newPassword = document.getElementById('new-password').value;
            try {
                await apiRequest('/api/user/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldPassword, newPassword })
                });
                modalContainer.innerHTML = '';
                // Başarı mesajı eklenebilir.
            } catch (error) {
                showErrorModal(error.message);
            }
        });
    });
}

function attachSidebarToggleListeners() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const iconOpen = document.getElementById('toggle-icon-open');
    const iconClose = document.getElementById('toggle-icon-close');

    // Eğer gerekli elementler bulunamazsa, hatayı önlemek için fonksiyonu durdur.
    if (!sidebar || !toggleBtn || !iconOpen || !iconClose) {
        console.error('Sidebar toggle elementleri bulunamadı.');
        return; 
    }

    const setSidebarState = (collapsed) => {
        localStorage.setItem('sidebarCollapsed', collapsed);
        if (collapsed) {
            sidebar.classList.add('-translate-x-full'); // Kenar çubuğunu sola kaydır
            toggleBtn.classList.add('translate-x-4'); // Butonu sağa kaydır
            toggleBtn.classList.remove('translate-x-64');
            iconOpen.classList.remove('hidden');
            iconClose.classList.add('hidden');
        } else {
            sidebar.classList.remove('-translate-x-full'); // Kenar çubuğunu görünür yap
            toggleBtn.classList.add('translate-x-64'); // Butonu kenar çubuğunun sağına kaydır
            toggleBtn.classList.remove('translate-x-4');
            iconOpen.classList.add('hidden');
            iconClose.classList.remove('hidden');
        }
    };

    toggleBtn.addEventListener('click', () => {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        setSidebarState(!isCollapsed);
    });

    // Sayfa ilk yüklendiğinde, kaydedilmiş durumu animasyonsuz uygula
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('duration-0'); // Animasyonu geçici olarak kapat
        setSidebarState(true);
        setTimeout(() => sidebar.classList.remove('duration-0'), 50); // Animasyonu geri aç
    } else {
        setSidebarState(false);
    }
}
