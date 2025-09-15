// public/utils.js

// Bu dosya, uygulama genelinde birden çok yerde kullanılan
// genel yardımcı fonksiyonları içerir.

/**
 * Verilen bir diziyi, belirtilen anahtar ve yöne göre sıralar.
 * @param {Array} data - Sıralanacak dizi.
 * @param {object} sortConfig - { key: string, direction: 'asc'|'desc' } şeklinde bir obje.
 * @returns {Array} - Sıralanmış yeni bir dizi.
 */
function sortData(data, sortConfig) {
    const { key, direction } = sortConfig;
    return [...data].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        let comparison = 0;
        if (valA > valB) { comparison = 1; } 
        else if (valA < valB) { comparison = -1; }
        return direction === 'asc' ? comparison : comparison * -1;
    });
}

/**
 * Bir fonksiyonun belirtilen gecikme süresi boyunca yalnızca bir kez çalışmasını sağlar.
 * @param {Function} func - Çalıştırılacak fonksiyon.
 * @param {number} delay - Milisaniye cinsinden gecikme süresi.
 */
let debounceTimer;
function debounce(func, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(func, delay);
}