// BudgetSmart API & i18n Core Module (Vanilla TypeScript)
// -------------------------------------------------------------
// Bilingual Dictionary & Translations
// -------------------------------------------------------------
const translations = {
    appName: { he: 'BudgetSmart', en: 'BudgetSmart' },
    tagline: { he: 'ניהול תקציב חכם ופשוט', en: 'Smart & Simple Personal Finance' },
    login: { he: 'התחברות', en: 'Log In' },
    register: { he: 'הרשמה', en: 'Sign Up' },
    logout: { he: 'התנתקות', en: 'Log Out' },
    email: { he: 'אימייל', en: 'Email' },
    password: { he: 'סיסמה', en: 'Password' },
    confirmPassword: { he: 'אימות סיסמה', en: 'Confirm Password' },
    loginButton: { he: 'כניסה לחשבון', en: 'Sign In' },
    registerButton: { he: 'יצירת חשבון', en: 'Create Account' },
    noAccount: { he: 'עדיין אין לך חשבון? הירשם כאן', en: "Don't have an account? Sign up" },
    hasAccount: { he: 'כבר רשום? התחבר עכשיו', en: 'Already have an account? Log in' },
    dashboard: { he: 'לוח בקרה', en: 'Dashboard' },
    addExpense: { he: 'הוספת הוצאה', en: 'Add Expense' },
    categories: { he: 'קטגוריות', en: 'Categories' },
    history: { he: 'היסטוריה', en: 'History' },
    monthlyBudget: { he: 'תקציב חודשי', en: 'Monthly Budget' },
    plannedBudget: { he: 'תקציב מתוכנן', en: 'Planned Budget' },
    totalSpent: { he: 'סך הוצאות', en: 'Total Spent' },
    remaining: { he: 'יתרה לתקציב', en: 'Remaining' },
    budgetUsed: { he: 'נוצל', en: 'used' },
    setBudget: { he: 'הגדר תקציב', en: 'Set Budget' },
    saveBudget: { he: 'שמור תקציב', en: 'Save Budget' },
    editBudget: { he: 'ערוך תקציב', en: 'Edit Budget' },
    enterPlannedAmount: { he: 'סכום תקציב מתוכנן לחודש', en: 'Planned budget amount for the month' },
    recentExpenses: { he: 'הוצאות אחרונות', en: 'Recent Expenses' },
    allExpenses: { he: 'כל ההוצאות', en: 'All Expenses' },
    noExpensesYet: { he: 'עדיין לא נרשמו הוצאות לחודש זה', en: 'No expenses recorded for this month yet' },
    noExpensesHistory: { he: 'לא נמצאו הוצאות', en: 'No expenses found' },
    startAdding: { he: 'לחץ על + להוספת הוצאה חדשה', en: 'Tap + to add your first expense' },
    category: { he: 'קטגוריה', en: 'Category' },
    amount: { he: 'סכום', en: 'Amount' },
    date: { he: 'תאריך', en: 'Date' },
    note: { he: 'הערה (אופציונלי)', en: 'Note (Optional)' },
    notePlaceholder: { he: 'לדוגמה: קניות לשבת, דלק, מסעדה', en: 'e.g. Grocery run, fuel, dinner' },
    saveExpense: { he: 'שמור הוצאה', en: 'Save Expense' },
    saving: { he: 'שומר...', en: 'Saving...' },
    expenseAdded: { he: 'ההוצאה נשמרה בהצלחה!', en: 'Expense saved successfully!' },
    expenseDeleted: { he: 'ההוצאה נמחקה', en: 'Expense deleted' },
    confirmDeleteExpense: { he: 'האם למחוק הוצאה זו?', en: 'Are you sure you want to delete this expense?' },
    manageCategories: { he: 'ניהול קטגוריות', en: 'Manage Categories' },
    addCategory: { he: 'הוסף קטגוריה', en: 'Add Category' },
    editCategory: { he: 'ערוך קטגוריה', en: 'Edit Category' },
    categoryNameHe: { he: 'שם בעברית', en: 'Name (Hebrew)' },
    categoryNameEn: { he: 'שם באנגלית', en: 'Name (English)' },
    chooseIcon: { he: 'בחר סמל', en: 'Choose Icon' },
    chooseColor: { he: 'בחר צבע', en: 'Choose Color' },
    categoryCreated: { he: 'הקטגוריה נוצרה בהצלחה', en: 'Category created successfully' },
    categoryUpdated: { he: 'הקטגוריה עודכנה', en: 'Category updated' },
    categoryDeleted: { he: 'הקטגוריה נמחקה', en: 'Category deleted' },
    confirmDeleteCategory: { he: 'האם למחוק קטגוריה זו?', en: 'Are you sure you want to delete this category?' },
    filterByMonth: { he: 'סינון לפי חודש', en: 'Filter by month' },
    allCategoriesFilter: { he: 'כל הקטגוריות', en: 'All Categories' },
    totalFiltered: { he: 'סך הכל מסונן', en: 'Filtered Total' },
    cancel: { he: 'ביטול', en: 'Cancel' },
    delete: { he: 'מחק', en: 'Delete' },
    save: { he: 'שמור', en: 'Save' },
    switchLang: { he: 'English', en: 'עברית' },
    quickAdd: { he: 'הוספה מהירה', en: 'Quick Add' },
    welcomeBack: { he: 'שלום', en: 'Hello' },
    budgetStatusOver: { he: 'חריגה מהתקציב!', en: 'Over Budget!' },
    budgetStatusGood: { he: 'במסגרת התקציב', en: 'On Track' },
    spendingBreakdown: { he: 'פילוח הוצאות לפי קטגוריה', en: 'Spending by Category' },
    categoryBudgets: { he: 'מעקב תקציב לפי קטגוריות', en: 'Category Budget Tracking' },
    categoryBudget: { he: 'תקציב קטגוריה', en: 'Category Budget' },
    budgetLimitInput: { he: 'תקציב חודשי מתוכנן (₪)', en: 'Planned Monthly Budget (₪)' },
    budgetRemaining: { he: 'נותרו', en: 'Remaining' },
    budgetOverBy: { he: 'חריגה של', en: 'Over by' },
    noBudgetSet: { he: 'ללא הגבלת תקציב', en: 'No limit set' },
    setCategoryBudget: { he: 'הגדר תקציב לקטגוריה', en: 'Set Category Budget' },
    outOf: { he: 'מתוך', en: 'out of' },
    budgetReached: { he: 'התקציב מוצה (100%)', en: 'Budget reached (100%)' },
    budgetUpdated: { he: 'התקציב עודכן בהצלחה', en: 'Budget updated successfully' },
};
// Language State
const LANG_KEY = 'budgetsmart_lang';
export function getCurrentLang() {
    const saved = localStorage.getItem(LANG_KEY);
    return (saved === 'en' ? 'en' : 'he');
}
export function setLanguage(lang) {
    localStorage.setItem(LANG_KEY, lang);
    applyLanguage(lang);
}
export function toggleLanguage() {
    const current = getCurrentLang();
    const next = current === 'he' ? 'en' : 'he';
    setLanguage(next);
}
export function t(key) {
    const entry = translations[key];
    if (!entry)
        return key;
    return entry[getCurrentLang()] || key;
}
export function applyLanguage(lang) {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    // Update elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (key && translations[key]) {
            el.textContent = translations[key][lang];
        }
    });
    // Update elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key && translations[key]) {
            el.placeholder = translations[key][lang];
        }
    });
    // Update elements with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.getAttribute('data-i18n-title');
        if (key && translations[key]) {
            el.setAttribute('title', translations[key][lang]);
        }
    });
    // Update language toggle button text
    const toggleBtn = document.getElementById('lang-toggle-btn');
    if (toggleBtn) {
        toggleBtn.textContent = lang === 'he' ? 'English' : 'עברית';
    }
}
// -------------------------------------------------------------
// Authentication Helpers
// -------------------------------------------------------------
const TOKEN_KEY = 'budgetsmart_jwt';
const USER_KEY = 'budgetsmart_user';
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}
export function getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function requireAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return null;
    }
    return getCurrentUser();
}
export function logout() {
    removeToken();
    window.location.href = '/login.html';
}
// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.2s ease';
        setTimeout(() => toast.remove(), 200);
    }, 3200);
}
// -------------------------------------------------------------
// API Request Client
// -------------------------------------------------------------
async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(endpoint, {
        ...options,
        headers,
    });
    if (response.status === 401) {
        removeToken();
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
            window.location.href = '/login.html';
        }
        throw new Error('Unauthorized');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Network request failed');
    }
    return data;
}
export const api = {
    get: (url) => request(url, { method: 'GET' }),
    post: (url, body) => request(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    put: (url, body) => request(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
    delete: (url) => request(url, { method: 'DELETE' }),
};
// -------------------------------------------------------------
// Currency & Date Formatting
// -------------------------------------------------------------
export function formatCurrency(amount) {
    const lang = getCurrentLang();
    const num = Math.round(amount * 100) / 100;
    if (lang === 'he') {
        return `${num.toLocaleString('he-IL')} ₪`;
    }
    return `₪${num.toLocaleString('en-US')}`;
}
export function formatDate(dateStr) {
    const lang = getCurrentLang();
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
                month: 'short',
                day: 'numeric',
            });
        }
    }
    catch { }
    return dateStr;
}
export function getCategoryName(category) {
    if (!category)
        return t('category');
    const lang = getCurrentLang();
    return lang === 'he' ? category.name_he : category.name_en;
}
