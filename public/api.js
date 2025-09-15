// public/api.js

/**
 * Sunucuya standart bir API isteği gönderir ve yanıtı JSON olarak işler.
 * @param {string} url - İstek yapılacak API endpoint'i.
 * @param {object} [options={}] - fetch() fonksiyonu için standart seçenekler (method, headers, body vb.).
 * @returns {Promise<object>} - Sunucudan dönen JSON verisi.
 * @throws {Error} - Ağ hatası veya sunucudan gelen hata mesajı.
 */
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');

        // Yanıt başarılı değilse (örn: 404, 500)
        if (!response.ok) {
            // Sunucu JSON formatında bir hata mesajı gönderdiyse, onu kullanalım.
            if (contentType?.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Bilinmeyen bir sunucu hatası.');
            } else {
                // JSON yoksa, metin olarak hatayı alalım.
                const errorText = await response.text();
                console.error("Sunucudan gelen beklenmedik yanıt:", errorText);
                throw new Error('Sunucuyla iletişimde bir sorun oluştu.');
            }
        }
        
        // Yanıt başarılı ama içerik yoksa (örn: 204 No Content), boş bir obje dönelim.
        if (response.status === 204 || !contentType?.includes('application/json')) {
            return {};
        }

        // Yanıt başarılı ve JSON içeriyorsa, JSON'ı döndürelim.
        return response.json();

    } catch (error) {
        console.error('API isteği sırasında hata:', error);
        // Hatanın tekrar fırlatılması, onu çağıran fonksiyonun da hatayı yakalamasını sağlar.
        throw error;
    }
}