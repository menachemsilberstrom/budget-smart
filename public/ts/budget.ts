import { api, MonthlyBudget, showToast, t, getCurrentLang } from './api.js';

export async function fetchBudget(year: number, month: number): Promise<MonthlyBudget> {
  return await api.get<MonthlyBudget>(`/budget/${year}/${month}`);
}

export async function saveBudget(year: number, month: number, planned: number): Promise<MonthlyBudget> {
  const result = await api.post<MonthlyBudget>(`/budget/${year}/${month}`, { planned });
  showToast(getCurrentLang() === 'he' ? 'התקציב עודכן בהצלחה!' : 'Budget updated successfully!', 'success');
  return result;
}

export function openBudgetModal(currentPlanned: number, onSave: (newPlanned: number) => void): void {
  const existingModal = document.getElementById('budget-modal');
  if (existingModal) existingModal.remove();

  const isHe = getCurrentLang() === 'he';
  const overlay = document.createElement('div');
  overlay.id = 'budget-modal';
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${t('editBudget')}</h3>
        <button type="button" class="modal-close" id="close-budget-modal">&times;</button>
      </div>
      <form id="budget-edit-form">
        <div class="form-group">
          <label class="form-label">${t('enterPlannedAmount')}</label>
          <div class="amount-input-wrapper">
            <span class="amount-currency">₪</span>
            <input type="number" step="any" min="0" id="budget-input" class="form-input amount-input-lg" value="${currentPlanned || ''}" placeholder="0" required autofocus />
          </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-outline" style="flex: 1;" id="cancel-budget-modal">${t('cancel')}</button>
          <button type="submit" class="btn btn-primary" style="flex: 1;">${t('save')}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('close-budget-modal')?.addEventListener('click', close);
  document.getElementById('cancel-budget-modal')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const form = document.getElementById('budget-edit-form') as HTMLFormElement;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('budget-input') as HTMLInputElement;
    const val = parseFloat(input.value) || 0;
    close();
    onSave(val);
  });
}
