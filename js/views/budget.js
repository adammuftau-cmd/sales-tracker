import { fmtMoney } from '../calc.js';
import { CATEGORIES } from './expenses.js';

let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

export function renderBudget(container, state, actions) {
  const monthBudgets = state.budget.filter((b) => b.month === selectedMonth);
  const monthExpenses = state.expenses.filter((e) => (e.date || '').slice(0, 7) === selectedMonth);

  const plannedTotal = monthBudgets.reduce((s, b) => s + Number(b.plannedAmount), 0);
  const actualTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);

  container.innerHTML = `
    <div class="toolbar">
      <div class="field" style="margin:0;">
        <input type="month" id="budget-month" value="${selectedMonth}" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:var(--radius-sm);background:var(--paper-raised);">
      </div>
      <button class="btn btn-gold btn-sm" id="budget-add-btn">+ Add budget line</button>
    </div>

    <div class="grid kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
      <div class="kpi"><div class="label">Planned</div><div class="value">${fmtMoney(plannedTotal)}</div></div>
      <div class="kpi"><div class="label">Actual spend</div><div class="value">${fmtMoney(actualTotal)}</div></div>
      <div class="kpi"><div class="label">Remaining</div><div class="value ${plannedTotal - actualTotal < 0 ? 'negative' : ''}">${fmtMoney(plannedTotal - actualTotal)}</div></div>
    </div>

    ${monthBudgets.length ? `
    <div class="card">
      ${monthBudgets.map((b) => budgetLineHtml(b, monthExpenses)).join('')}
    </div>` : `<div class="card empty-state"><div class="big">No budget set for this month</div><p>Add a planned amount per category to compare against actual spend.</p></div>`}
  `;

  container.querySelector('#budget-month').addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    renderBudget(container, state, actions);
  });
  container.querySelector('#budget-add-btn').addEventListener('click', () => openBudgetModal(state, actions, selectedMonth));
  container.querySelectorAll('[data-del-budget]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (confirm('Remove this budget line?')) {
        actions.deleteItem('budget', btn.dataset.delBudget).then(() => actions.toast('Budget line removed')).catch((e) => actions.toast(e.message, true));
      }
    })
  );
}

function budgetLineHtml(b, monthExpenses) {
  const actual = monthExpenses.filter((e) => e.category === b.category).reduce((s, e) => s + Number(e.amount), 0);
  const pct = Math.min(100, (actual / Number(b.plannedAmount || 1)) * 100);
  const over = actual > Number(b.plannedAmount);
  return `
    <div style="padding:12px 0;border-bottom:1px dashed var(--line);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>${escapeHtml(b.category)}</strong>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="tnum" style="font-size:0.85rem;color:var(--ink-soft);">${fmtMoney(actual)} / ${fmtMoney(b.plannedAmount)}</span>
          <button class="btn btn-danger btn-sm" data-del-budget="${b.id}">×</button>
        </div>
      </div>
      <div class="progress-bar ${over ? 'over' : ''}"><div style="width:${pct}%"></div></div>
    </div>`;
}

export function openBudgetModal(state, actions, month) {
  const m = month || selectedMonth;
  actions.openModal(`
    <h3>Add budget line</h3>
    <form id="budget-form">
      <div class="field"><label>Month</label><input type="month" id="bf-month" value="${m}" required></div>
      <div class="field">
        <label>Category</label>
        <select id="bf-category">${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Planned amount (GH₵)</label><input type="number" step="0.01" min="0" id="bf-amount" required></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="bf-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">Save budget line</button>
      </div>
    </form>
  `);
  document.getElementById('bf-cancel').addEventListener('click', actions.closeModal);
  document.getElementById('budget-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await actions.addItem('budget', {
        month: document.getElementById('bf-month').value,
        category: document.getElementById('bf-category').value,
        plannedAmount: Number(document.getElementById('bf-amount').value),
        createdAt: new Date().toISOString()
      });
      actions.toast('Budget line added');
      actions.closeModal();
    } catch (err) {
      actions.toast(err.message, true);
    }
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
