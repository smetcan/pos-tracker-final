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
                <td class="p-3 text-sm text-gray-600">${onaylayan}</td>
                <td class="p-3 text-sm text-gray-600">${onayTarihi}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(bulgu.status)}">${bulgu.status}</span></td>
                <td class="p-3 text-right">
                    <button class="edit-bulgu-btn p-1 text-sm text-blue-600" data-bulgu-id="${bulgu.id}">Düzenle</button>
                    <button class="delete-bulgu-btn p-1 text-sm text-red-600" data-bulgu-id="${bulgu.id}" data-bulgu-baslik="${bulgu.baslik}">Sil</button>
                </td>
            </tr>
        `}).join('');

        return `
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <div class="rounded-md border overflow-x-auto">
                        <table class="w-full text-sm min-w-[1100px]">
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