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

        const editIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.651 1.651a1.875 1.875 0 010 2.652l-8.955 8.955-4.478 1.126 1.126-4.478 8.955-8.955a1.875 1.875 0 012.651 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 7.125L16.862 4.487" />
            </svg>
        `;
        const deleteIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L5.772 5.79m13.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
        `;
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
                <td class="p-3 text-sm text-gray-600">${bulgu.girenKullanici || ''}</td>
                <td class="p-3 text-sm text-gray-600">${onaylayan}</td>
                <td class="p-3 text-sm text-gray-600">${onayTarihi}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(bulgu.status)}">${bulgu.status}</span></td>
                <td class="p-3 text-right">
                    <button type="button" class="edit-bulgu-btn inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800" data-bulgu-id="${bulgu.id}" aria-label="Bulgu düzenle">
                        ${editIcon}
                        <span class="sr-only">Düzenle</span>
                    </button>
                    <button type="button" class="delete-bulgu-btn inline-flex items-center justify-center p-1 text-red-600 hover:text-red-700" data-bulgu-id="${bulgu.id}" data-bulgu-baslik="${bulgu.baslik}" aria-label="Bulgu sil">
                        ${deleteIcon}
                        <span class="sr-only">Sil</span>
                    </button>
                </td>
            </tr>
        `}).join('');

        return `
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <div class="rounded-md border overflow-x-auto">
                        <table class="zebra-table w-full text-sm min-w-[1100px]">
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
                                    <th class="p-3 text-left">Giren Kullanıcı</th>
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
