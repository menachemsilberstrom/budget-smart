import { api, setToken, showToast, t, getCurrentLang, toggleLanguage, applyLanguage } from './api.js';
document.addEventListener('DOMContentLoaded', () => {
    // Initialize language on page load
    applyLanguage(getCurrentLang());
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            toggleLanguage();
        });
    }
    // Handle Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            if (!email || !password) {
                showToast(getCurrentLang() === 'he' ? 'נא למלא את כל השדות' : 'Please fill in all fields', 'error');
                return;
            }
            try {
                submitBtn.disabled = true;
                const originalText = submitBtn.textContent;
                submitBtn.textContent = getCurrentLang() === 'he' ? 'מתחבר...' : 'Signing in...';
                const res = await api.post('/auth/login', { email, password });
                setToken(res.token, res.user);
                showToast(getCurrentLang() === 'he' ? 'התחברת בהצלחה!' : 'Signed in successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 300);
            }
            catch (err) {
                showToast(err.message || 'Login failed', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = t('loginButton');
            }
        });
    }
    // Handle Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmInput = document.getElementById('confirm-password');
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmInput.value;
            if (!email || !password || !confirmPassword) {
                showToast(getCurrentLang() === 'he' ? 'נא למלא את כל השדות' : 'Please fill in all fields', 'error');
                return;
            }
            if (password !== confirmPassword) {
                showToast(getCurrentLang() === 'he' ? 'הסיסמאות אינן תואמות' : 'Passwords do not match', 'error');
                return;
            }
            if (password.length < 6) {
                showToast(getCurrentLang() === 'he' ? 'הסיסמה חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters', 'error');
                return;
            }
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = getCurrentLang() === 'he' ? 'יוצר חשבון...' : 'Creating account...';
                const res = await api.post('/auth/register', { email, password });
                setToken(res.token, res.user);
                showToast(getCurrentLang() === 'he' ? 'נרשמת בהצלחה!' : 'Account created successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 300);
            }
            catch (err) {
                showToast(err.message || 'Registration failed', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = t('registerButton');
            }
        });
    }
});
