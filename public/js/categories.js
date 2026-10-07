import { api, showToast, t, getCurrentLang, requireAuth, applyLanguage, toggleLanguage, logout, formatCurrency, } from './api.js';
const AVAILABLE_ICONS = [
    '🛒', '🏠', '🚗', '🍔', '🛍️', '💊', '📚', '🎬',
    '✈️', '🎁', '💡', '☕', '👶', '🐾', '💻', '🏷️',
];
const AVAILABLE_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ec4899',
    '#8b5cf6', '#ef4444', '#06b6d4', '#64748b',
    '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];
let selectedIcon = AVAILABLE_ICONS[0];
let selectedColor = AVAILABLE_COLORS[0];
let editingCategoryId = null;
export async function fetchCategories() {
    return await api.get('/categories');
}
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth())
        return;
    applyLanguage(getCurrentLang());
    document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
        toggleLanguage();
        renderCategories();
    });
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        logout();
    });
    const addCategoryBtn = document.getElementById('open-add-category-btn');
    addCategoryBtn?.addEventListener('click', () => {
        openCategoryModal();
    });
    await renderCategories();
});
async function renderCategories() {
    const container = document.getElementById('categories-list');
    if (!container)
        return;
    try {
        container.innerHTML = `<div class="text-center text-muted" style="padding: 20px;">${getCurrentLang() === 'he' ? 'טוען קטגוריות...' : 'Loading categories...'}</div>`;
        const categories = await fetchCategories();
        if (categories.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏷️</div>
          <div class="empty-state-text">${getCurrentLang() === 'he' ? 'אין עדיין קטגוריות' : 'No categories found'}</div>
        </div>
      `;
            return;
        }
        const isHe = getCurrentLang() === 'he';
        container.innerHTML = categories
            .map((cat) => `
        <div class="category-row" data-id="${cat._id}">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
            <div class="category-tile-icon" style="background-color: ${cat.color};">
              ${cat.icon}
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-weight: 700; font-size: 1rem;">
                  ${isHe ? cat.name_he : cat.name_en}
                </span>
                <span class="cat-budget-pill ${cat.budgetLimit && cat.budgetLimit > 0 ? '' : 'muted'}">
                  ${cat.budgetLimit && cat.budgetLimit > 0 ? '🎯 ' + formatCurrency(cat.budgetLimit) : t('noBudgetSet')}
                </span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                ${isHe ? cat.name_en : cat.name_he}
              </div>
            </div>
          </div>
          <div class="cat-actions">
            <button class="btn btn-outline btn-sm edit-cat-btn" data-cat='${JSON.stringify(cat)}' title="${t('editCategory')}">
              ✏️
            </button>
            <button class="btn btn-danger btn-sm delete-cat-btn" data-id="${cat._id}" title="${t('delete')}">
              🗑️
            </button>
          </div>
        </div>
      `)
            .join('');
        // Attach listeners
        container.querySelectorAll('.edit-cat-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const catData = JSON.parse(e.currentTarget.getAttribute('data-cat') || '{}');
                openCategoryModal(catData);
            });
        });
        container.querySelectorAll('.delete-cat-btn').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (!id)
                    return;
                if (confirm(t('confirmDeleteCategory'))) {
                    try {
                        await api.delete(`/categories/${id}`);
                        showToast(t('categoryDeleted'), 'success');
                        await renderCategories();
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
function openCategoryModal(catToEdit) {
    const existing = document.getElementById('category-modal');
    if (existing)
        existing.remove();
    editingCategoryId = catToEdit ? catToEdit._id : null;
    selectedIcon = catToEdit ? catToEdit.icon : AVAILABLE_ICONS[0];
    selectedColor = catToEdit ? catToEdit.color : AVAILABLE_COLORS[0];
    const modal = document.createElement('div');
    modal.id = 'category-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${catToEdit ? t('editCategory') : t('addCategory')}</h3>
        <button type="button" class="modal-close" id="close-cat-modal">&times;</button>
      </div>
      <form id="category-form">
        <div class="form-group">
          <label class="form-label">${t('categoryNameHe')}</label>
          <input type="text" id="cat-name-he" class="form-input" required placeholder="למשל: סופרמרקט" value="${catToEdit ? catToEdit.name_he : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">${t('categoryNameEn')}</label>
          <input type="text" id="cat-name-en" class="form-input" required placeholder="e.g. Supermarket" value="${catToEdit ? catToEdit.name_en : ''}" />
        </div>

        <div class="form-group">
          <label class="form-label">${t('budgetLimitInput')}</label>
          <div class="amount-input-wrapper">
            <span class="amount-currency">₪</span>
            <input type="number" step="any" min="0" id="cat-budget-limit" class="form-input" placeholder="0" value="${catToEdit && catToEdit.budgetLimit !== undefined ? catToEdit.budgetLimit : ''}" />
          </div>
          <span style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            ${getCurrentLang() === 'he' ? 'הגדר 0 כדי להשאיר ללא הגבלת תקציב' : 'Set to 0 for unlimited'}
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">${t('chooseIcon')}</label>
          <div class="icon-picker-grid" id="icon-picker">
            ${AVAILABLE_ICONS.map((ic) => `<div class="icon-swatch ${ic === selectedIcon ? 'selected' : ''}" data-icon="${ic}">${ic}</div>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t('chooseColor')}</label>
          <div class="color-picker-grid" id="color-picker">
            ${AVAILABLE_COLORS.map((c) => `<div class="color-swatch ${c === selectedColor ? 'selected' : ''}" data-color="${c}" style="background-color: ${c};"></div>`).join('')}
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-outline" style="flex: 1;" id="cancel-cat-modal">${t('cancel')}</button>
          <button type="submit" class="btn btn-primary" style="flex: 1;">${t('save')}</button>
        </div>
      </form>
    </div>
  `;
    document.body.appendChild(modal);
    // Picker selection listeners
    modal.querySelectorAll('.icon-swatch').forEach((swatch) => {
        swatch.addEventListener('click', () => {
            modal.querySelectorAll('.icon-swatch').forEach((s) => s.classList.remove('selected'));
            swatch.classList.add('selected');
            selectedIcon = swatch.getAttribute('data-icon') || AVAILABLE_ICONS[0];
        });
    });
    modal.querySelectorAll('.color-swatch').forEach((swatch) => {
        swatch.addEventListener('click', () => {
            modal.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
            swatch.classList.add('selected');
            selectedColor = swatch.getAttribute('data-color') || AVAILABLE_COLORS[0];
        });
    });
    const close = () => modal.remove();
    document.getElementById('close-cat-modal')?.addEventListener('click', close);
    document.getElementById('cancel-cat-modal')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal)
            close();
    });
    const form = document.getElementById('category-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name_he = document.getElementById('cat-name-he').value.trim();
        const name_en = document.getElementById('cat-name-en').value.trim();
        const budgetLimitVal = parseFloat(document.getElementById('cat-budget-limit').value) || 0;
        if (!name_he || !name_en) {
            showToast(getCurrentLang() === 'he' ? 'נא למלא את שמות הקטגוריה' : 'Please provide category names', 'error');
            return;
        }
        try {
            if (editingCategoryId) {
                await api.put(`/categories/${editingCategoryId}`, {
                    name_he,
                    name_en,
                    icon: selectedIcon,
                    color: selectedColor,
                    budgetLimit: budgetLimitVal,
                });
                showToast(t('categoryUpdated'), 'success');
            }
            else {
                await api.post('/categories', {
                    name_he,
                    name_en,
                    icon: selectedIcon,
                    color: selectedColor,
                    budgetLimit: budgetLimitVal,
                });
                showToast(t('categoryCreated'), 'success');
            }
            close();
            await renderCategories();
        }
        catch (err) {
            showToast(err.message, 'error');
        }
    });
}
