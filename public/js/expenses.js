import { api, formatCurrency, formatDate, getCurrentLang, getCategoryName, requireAuth, showToast, t, applyLanguage, toggleLanguage, logout, } from './api.js';
import { fetchBudget, openBudgetModal, saveBudget } from './budget.js';
export async function fetchExpenses(month, categoryId) {
    let url = '/expenses';
    const params = new URLSearchParams();
    if (month)
        params.append('month', month);
    if (categoryId)
        params.append('categoryId', categoryId);
    const query = params.toString();
    if (query)
        url += `?${query}`;
    return await api.get(url);
}
export async function deleteExpense(id) {
    await api.delete(`/expenses/${id}`);
}
// -------------------------------------------------------------
// Add Expense Page Controller
// -------------------------------------------------------------
export function initAddExpensePage() {
    if (!requireAuth())
        return;
    applyLanguage(getCurrentLang());
    document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
        toggleLanguage();
        loadCategoriesForAdd();
    });
    const dateInput = document.getElementById('expense-date');
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    // Quick Amount chips
    document.querySelectorAll('.quick-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const addVal = parseFloat(chip.getAttribute('data-add') || '0');
            const amountInput = document.getElementById('expense-amount');
            if (amountInput) {
                const cur = parseFloat(amountInput.value) || 0;
                amountInput.value = (cur + addVal).toString();
            }
        });
    });
    loadCategoriesForAdd();
    const form = document.getElementById('add-expense-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amountInput = document.getElementById('expense-amount');
            const selectedCatInput = document.getElementById('selected-category-id');
            const dateVal = dateInput.value;
            const noteInput = document.getElementById('expense-note');
            const submitBtn = form.querySelector('button[type="submit"]');
            const amount = parseFloat(amountInput.value);
            const categoryId = selectedCatInput.value;
            const note = noteInput ? noteInput.value.trim() : '';
            if (!categoryId) {
                showToast(getCurrentLang() === 'he' ? 'נא לבחור קטגוריה' : 'Please select a category', 'error');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                showToast(getCurrentLang() === 'he' ? 'נא להזין סכום תקין' : 'Please enter a valid amount', 'error');
                return;
            }
            if (!dateVal) {
                showToast(getCurrentLang() === 'he' ? 'נא לבחור תאריך' : 'Please select a date', 'error');
                return;
            }
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = t('saving');
                await api.post('/expenses', {
                    categoryId,
                    amount,
                    date: dateVal,
                    note,
                });
                showToast(t('expenseAdded'), 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 300);
            }
            catch (err) {
                showToast(err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = t('saveExpense');
            }
        });
    }
}
async function loadCategoriesForAdd() {
    const container = document.getElementById('category-grid-container');
    if (!container)
        return;
    try {
        const categories = await api.get('/categories');
        const selectedInput = document.getElementById('selected-category-id');
        if (categories.length === 0) {
            container.innerHTML = `<div class="text-muted text-center" style="grid-column: 1/-1;">${t('noAccount')}</div>`;
            return;
        }
        container.innerHTML = categories
            .map((cat, idx) => `
        <div class="category-tile ${idx === 0 ? 'selected' : ''}" data-id="${cat._id}">
          <div class="category-tile-icon" style="background-color: ${cat.color};">
            ${cat.icon}
          </div>
          <div class="category-tile-name">${getCategoryName(cat)}</div>
        </div>
      `)
            .join('');
        if (selectedInput && categories.length > 0) {
            selectedInput.value = categories[0]._id;
        }
        container.querySelectorAll('.category-tile').forEach((tile) => {
            tile.addEventListener('click', () => {
                container.querySelectorAll('.category-tile').forEach((t) => t.classList.remove('selected'));
                tile.classList.add('selected');
                const id = tile.getAttribute('data-id');
                if (selectedInput && id) {
                    selectedInput.value = id;
                }
            });
        });
    }
    catch (err) {
        container.innerHTML = `<div class="toast error">${err.message}</div>`;
    }
}
// -------------------------------------------------------------
// Dashboard Page Controller
// -------------------------------------------------------------
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
export async function initDashboardPage() {
    if (!requireAuth())
        return;
    applyLanguage(getCurrentLang());
    document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
        toggleLanguage();
        refreshDashboard();
    });
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        logout();
    });
    // Month navigation
    document.getElementById('prev-month-btn')?.addEventListener('click', () => {
        if (currentMonth === 1) {
            currentMonth = 12;
            currentYear -= 1;
        }
        else {
            currentMonth -= 1;
        }
        refreshDashboard();
    });
    document.getElementById('next-month-btn')?.addEventListener('click', () => {
        if (currentMonth === 12) {
            currentMonth = 1;
            currentYear += 1;
        }
        else {
            currentMonth += 1;
        }
        refreshDashboard();
    });
    document.getElementById('edit-budget-btn')?.addEventListener('click', () => {
        const plannedEl = document.getElementById('stat-planned');
        const curVal = plannedEl ? parseFloat(plannedEl.getAttribute('data-raw') || '0') : 0;
        openBudgetModal(curVal, async (newVal) => {
            await saveBudget(currentYear, currentMonth, newVal);
            refreshDashboard();
        });
    });
    await refreshDashboard();
}
async function refreshDashboard() {
    updateMonthLabel();
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    try {
        const [budgetData, expenses, categories] = await Promise.all([
            fetchBudget(currentYear, currentMonth),
            fetchExpenses(monthStr),
            api.get('/categories'),
        ]);
        // Update Budget card
        const plannedEl = document.getElementById('stat-planned');
        const spentEl = document.getElementById('stat-spent');
        const remainingEl = document.getElementById('stat-remaining');
        const progressFill = document.getElementById('budget-progress-fill');
        const progressPercentText = document.getElementById('budget-percent-text');
        const progressStatusBadge = document.getElementById('budget-status-badge');
        if (plannedEl) {
            plannedEl.textContent = formatCurrency(budgetData.planned);
            plannedEl.setAttribute('data-raw', budgetData.planned.toString());
        }
        if (spentEl) {
            spentEl.textContent = formatCurrency(budgetData.spent);
        }
        if (remainingEl) {
            remainingEl.textContent = formatCurrency(budgetData.remaining);
        }
        const pct = budgetData.percentUsed;
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, pct)}%`;
            progressFill.className = 'progress-fill';
            if (pct > 100) {
                progressFill.classList.add('danger');
            }
            else if (pct >= 80) {
                progressFill.classList.add('warning');
            }
        }
        if (progressPercentText) {
            progressPercentText.textContent = `${pct}% ${t('budgetUsed')}`;
        }
        if (progressStatusBadge) {
            if (budgetData.planned > 0 && budgetData.spent > budgetData.planned) {
                progressStatusBadge.textContent = t('budgetStatusOver');
                progressStatusBadge.style.color = '#ef4444';
            }
            else {
                progressStatusBadge.textContent = t('budgetStatusGood');
                progressStatusBadge.style.color = '#10b981';
            }
        }
        // Render Category Budgets Tracking (Remaining per category!)
        renderCategoryBudgets(categories, expenses);
        // Render Spending Breakdown by Category
        renderCategoryBreakdown(expenses);
        // Render Recent Expenses (last 5)
        renderRecentExpenses(expenses.slice(0, 5));
    }
    catch (err) {
        showToast(err.message, 'error');
    }
}
function renderCategoryBudgets(categories, expenses) {
    const container = document.getElementById('category-budgets-container');
    if (!container)
        return;
    if (categories.length === 0) {
        container.innerHTML = `<div class="text-muted text-center" style="padding: 12px;">${t('noAccount')}</div>`;
        return;
    }
    // Calculate spent per category
    const spentMap = new Map();
    for (const exp of expenses) {
        spentMap.set(exp.categoryId, (spentMap.get(exp.categoryId) || 0) + exp.amount);
    }
    container.innerHTML = categories
        .map((cat) => {
        const spent = spentMap.get(cat._id) || 0;
        const limit = cat.budgetLimit || 0;
        const catName = getCategoryName(cat);
        const icon = cat.icon || '🏷️';
        const color = cat.color || '#3b82f6';
        let statusBadge = '';
        let progressPercent = 0;
        let progressClass = '';
        if (limit > 0) {
            const remaining = limit - spent;
            progressPercent = Math.min(100, Math.round((spent / limit) * 100));
            if (remaining > 0) {
                const isWarning = progressPercent >= 80;
                progressClass = isWarning ? 'warning' : '';
                statusBadge = `
            <span class="cat-budget-tag ${isWarning ? 'tag-warning' : 'tag-success'}">
              ${t('budgetRemaining')}: ${formatCurrency(remaining)}
            </span>
          `;
            }
            else if (remaining === 0) {
                progressClass = 'warning';
                statusBadge = `
            <span class="cat-budget-tag tag-warning">
              ${t('budgetReached')}
            </span>
          `;
            }
            else {
                progressClass = 'danger';
                statusBadge = `
            <span class="cat-budget-tag tag-danger">
              ⚠️ ${t('budgetOverBy')} ${formatCurrency(Math.abs(remaining))}!
            </span>
          `;
            }
        }
        else {
            statusBadge = `
          <span class="cat-budget-tag tag-muted">
            ${t('noBudgetSet')}
          </span>
        `;
        }
        return `
        <div class="category-budget-card">
          <div class="category-budget-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="category-tile-icon" style="width: 34px; height: 34px; font-size: 1.15rem; background-color: ${color};">
                ${icon}
              </span>
              <div>
                <span style="font-weight: 700; font-size: 0.95rem;">${catName}</span>
                <div style="font-size: 0.78rem; color: var(--text-muted);">
                  ${limit > 0 ? `${formatCurrency(spent)} ${t('outOf')} ${formatCurrency(limit)}` : `${formatCurrency(spent)}`}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${statusBadge}
              <button class="btn btn-outline btn-icon quick-edit-cat-budget" data-cat='${JSON.stringify(cat)}' style="width: 32px; height: 32px; min-height: 32px;" title="${t('setCategoryBudget')}">
                ✏️
              </button>
            </div>
          </div>
          ${limit > 0 ? `
            <div class="progress-track" style="margin: 8px 0 2px 0; height: 8px; background: var(--surface-subtle);">
              <div class="progress-fill ${progressClass}" style="width: ${progressPercent}%; background-color: ${progressClass === 'danger' ? 'var(--danger)' : progressClass === 'warning' ? 'var(--warning)' : color};"></div>
            </div>
          ` : ''}
        </div>
      `;
    })
        .join('');
    container.querySelectorAll('.quick-edit-cat-budget').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const cat = JSON.parse(e.currentTarget.getAttribute('data-cat') || '{}');
            openQuickCategoryBudgetModal(cat);
        });
    });
}
function openQuickCategoryBudgetModal(cat) {
    const existing = document.getElementById('cat-budget-modal');
    if (existing)
        existing.remove();
    const isHe = getCurrentLang() === 'he';
    const catName = getCategoryName(cat);
    const currentLimit = cat.budgetLimit || 0;
    const overlay = document.createElement('div');
    overlay.id = 'cat-budget-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${cat.icon} ${catName} – ${t('setCategoryBudget')}</h3>
        <button type="button" class="modal-close" id="close-cat-b-modal">&times;</button>
      </div>
      <form id="quick-cat-budget-form">
        <div class="form-group">
          <label class="form-label">${t('budgetLimitInput')}</label>
          <div class="amount-input-wrapper">
            <span class="amount-currency">₪</span>
            <input type="number" step="any" min="0" id="quick-cat-budget-input" class="form-input amount-input-lg" value="${currentLimit || ''}" placeholder="0" required autofocus />
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
            ${isHe ? 'קבע יעד הוצאה חודשי עבור קטגוריה זו (0 ללא הגבלה)' : 'Set monthly spending limit for this category (0 for unlimited)'}
          </span>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-outline" style="flex: 1;" id="cancel-cat-b-modal">${t('cancel')}</button>
          <button type="submit" class="btn btn-primary" style="flex: 1;">${t('save')}</button>
        </div>
      </form>
    </div>
  `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    document.getElementById('close-cat-b-modal')?.addEventListener('click', close);
    document.getElementById('cancel-cat-b-modal')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay)
            close();
    });
    const form = document.getElementById('quick-cat-budget-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('quick-cat-budget-input');
        const newLimit = parseFloat(input.value) || 0;
        try {
            await api.put(`/categories/${cat._id}`, { budgetLimit: newLimit });
            showToast(t('budgetUpdated'), 'success');
            close();
            refreshDashboard();
        }
        catch (err) {
            showToast(err.message, 'error');
        }
    });
}
function updateMonthLabel() {
    const labelEl = document.getElementById('current-month-label');
    if (!labelEl)
        return;
    const lang = getCurrentLang();
    const date = new Date(currentYear, currentMonth - 1, 1);
    labelEl.textContent = date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
        month: 'long',
        year: 'numeric',
    });
}
function renderCategoryBreakdown(expenses) {
    const container = document.getElementById('category-breakdown-container');
    if (!container)
        return;
    if (expenses.length === 0) {
        container.innerHTML = `<div class="text-muted text-center" style="padding: 12px;">${t('noExpensesYet')}</div>`;
        return;
    }
    const totals = new Map();
    let overallTotal = 0;
    for (const exp of expenses) {
        overallTotal += exp.amount;
        const catId = exp.categoryId;
        const existing = totals.get(catId);
        if (existing) {
            existing.total += exp.amount;
        }
        else {
            totals.set(catId, { cat: exp.category, total: exp.amount });
        }
    }
    const sorted = Array.from(totals.values()).sort((a, b) => b.total - a.total);
    container.innerHTML = sorted
        .map((item) => {
        const percent = overallTotal > 0 ? Math.round((item.total / overallTotal) * 100) : 0;
        const catName = getCategoryName(item.cat);
        const icon = item.cat?.icon || '🏷️';
        const color = item.cat?.color || '#3b82f6';
        return `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.1rem;">${icon}</span>
              <span style="font-weight: 600; font-size: 0.9rem;">${catName}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">(${percent}%)</span>
            </div>
            <span style="font-weight: 700; font-size: 0.95rem;">${formatCurrency(item.total)}</span>
          </div>
          <div style="width: 100%; height: 6px; background: var(--surface-subtle); border-radius: 999px; overflow: hidden;">
            <div style="height: 100%; width: ${percent}%; background-color: ${color}; border-radius: 999px;"></div>
          </div>
        </div>
      `;
    })
        .join('');
}
function renderRecentExpenses(expenses) {
    const container = document.getElementById('recent-expenses-list');
    if (!container)
        return;
    if (expenses.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💸</div>
        <div class="empty-state-text">${t('noExpensesYet')}</div>
        <a href="/add-expense.html" class="btn btn-primary btn-sm">${t('addExpense')}</a>
      </div>
    `;
        return;
    }
    container.innerHTML = expenses
        .map((exp) => `
      <div class="expense-item">
        <div class="expense-lead">
          <div class="expense-cat-badge" style="background-color: ${exp.category?.color || '#3b82f6'};">
            ${exp.category?.icon || '🏷️'}
          </div>
          <div class="expense-info">
            <span class="expense-title">${getCategoryName(exp.category)}</span>
            <span class="expense-meta">${formatDate(exp.date)} ${exp.note ? ' • ' + exp.note : ''}</span>
          </div>
        </div>
        <div class="expense-trailing">
          <span class="expense-amount">${formatCurrency(exp.amount)}</span>
          <button class="delete-btn quick-del-btn" data-id="${exp._id}" title="${t('delete')}">
            🗑️
          </button>
        </div>
      </div>
    `)
        .join('');
    container.querySelectorAll('.quick-del-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (!id)
                return;
            if (confirm(t('confirmDeleteExpense'))) {
                try {
                    await deleteExpense(id);
                    showToast(t('expenseDeleted'), 'success');
                    refreshDashboard();
                }
                catch (err) {
                    showToast(err.message, 'error');
                }
            }
        });
    });
}
// -------------------------------------------------------------
// History Page Controller
// -------------------------------------------------------------
export async function initHistoryPage() {
    if (!requireAuth())
        return;
    applyLanguage(getCurrentLang());
    document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
        toggleLanguage();
        renderHistory();
    });
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        logout();
    });
    // Populate Categories filter
    try {
        const cats = await api.get('/categories');
        const catSelect = document.getElementById('history-category-filter');
        if (catSelect) {
            catSelect.innerHTML = `<option value="">${t('allCategoriesFilter')}</option>` +
                cats.map((c) => `<option value="${c._id}">${getCategoryName(c)}</option>`).join('');
        }
    }
    catch { }
    const monthFilter = document.getElementById('history-month-filter');
    const catFilter = document.getElementById('history-category-filter');
    if (monthFilter && !monthFilter.value) {
        const now = new Date();
        monthFilter.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    monthFilter?.addEventListener('change', () => renderHistory());
    catFilter?.addEventListener('change', () => renderHistory());
    await renderHistory();
}
async function renderHistory() {
    const container = document.getElementById('history-list');
    const totalEl = document.getElementById('history-total-sum');
    const monthFilter = document.getElementById('history-month-filter');
    const catFilter = document.getElementById('history-category-filter');
    if (!container)
        return;
    const month = monthFilter?.value || '';
    const categoryId = catFilter?.value || '';
    try {
        container.innerHTML = `<div class="text-center text-muted" style="padding: 20px;">${getCurrentLang() === 'he' ? 'טוען הוצאות...' : 'Loading expenses...'}</div>`;
        const expenses = await fetchExpenses(month, categoryId);
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        if (totalEl)
            totalEl.textContent = formatCurrency(total);
        if (expenses.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📜</div>
          <div class="empty-state-text">${t('noExpensesHistory')}</div>
        </div>
      `;
            return;
        }
        container.innerHTML = expenses
            .map((exp) => `
        <div class="expense-item">
          <div class="expense-lead">
            <div class="expense-cat-badge" style="background-color: ${exp.category?.color || '#3b82f6'};">
              ${exp.category?.icon || '🏷️'}
            </div>
            <div class="expense-info">
              <span class="expense-title">${getCategoryName(exp.category)}</span>
              <span class="expense-meta">${formatDate(exp.date)} ${exp.note ? ' • ' + exp.note : ''}</span>
            </div>
          </div>
          <div class="expense-trailing">
            <span class="expense-amount">${formatCurrency(exp.amount)}</span>
            <button class="delete-btn history-del-btn" data-id="${exp._id}" title="${t('delete')}">
              🗑️
            </button>
          </div>
        </div>
      `)
            .join('');
        container.querySelectorAll('.history-del-btn').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (!id)
                    return;
                if (confirm(t('confirmDeleteExpense'))) {
                    try {
                        await deleteExpense(id);
                        showToast(t('expenseDeleted'), 'success');
                        renderHistory();
                    }
                    catch (err) {
                        showToast(err.message, 'error');
                    }
                }
            });
        });
    }
    catch (err) {
        container.innerHTML = `<div class="toast error">${err.message}</div>`;
    }
}
