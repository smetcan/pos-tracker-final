document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageDiv.textContent = '';
        errorMessageDiv.classList.add('hidden');

        const userName = loginForm.userName.value;
        const password = loginForm.password.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userName, password }),
            });

            const result = await response.json();

            if (response.ok) {
                // Giriş başarılı, ana sayfaya yönlendir
                window.location.href = '/index.html';
            } else {
                // Hata mesajını göster
                errorMessageDiv.textContent = result.error || 'Bir hata oluştu.';
                errorMessageDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorMessageDiv.textContent = 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.';
            errorMessageDiv.classList.remove('hidden');
        }
    });
});