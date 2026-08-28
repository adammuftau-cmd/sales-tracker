import { fmtMoney, fmtDate, todayISO, expensesTotal } from '../calc.js';

const CATEGORIES = ['Rent', 'Utilities', 'Transport', 'Salaries', 'Supplies', 'Maintenance', 'Marketing', 'Other'];

export function renderExpenses(container, state, actions) {
  const expenses = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = expensesTotal(expenses);

  container.innerHTML = `
    <div class="toolbar">
      <div class="card" style="padding:12px 18px;display:flex;gap:8px;align-items:baseline;">
        <span style="color:var(--ink-soft);font-size:0.8rem;">Total logged</span>
        <span class="tnum" style="font-weight:700;color:var(--teal-deep);">${fmtMoney(total)}</span>
      </div>
      <button class="btn btn-gold btn-sm" id="exp-add-btn">+ Add expense</button>
    </div>
    ${expenses.length ? `
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Category</th><th>Note</th><th class="num">Amount</th><th></th></tr></thead>
        <tbody>
          ${expenses.map((e) => `
            <tr>
              <td>${fmtDate(e.date)}</td>
              <td><span class="pill pill-gray">${escapeHtml(e.category)}</span></td>
              <td>${escapeHtml(e.note || '—')}</td>
              <td class="num">${fmtMoney(e.amount)}</td>
              <td style="text-align:right;"><button class="btn btn-danger btn-sm" data-del="${e.id}">Delete</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : `<div class="card empty-state"><div class="big">No expenses logged yet</div><p>Track rent, transport, supplies and more here.</p></div>`}
  `;

  container.querySelector('#exp-add-btn').addEventListener('click', () => openExpenseModal(state, actions));
  container.querySelectorAll('[data-del]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (confirm('Delete this expense?')) {
        actions.deleteItem('expenses', btn.dataset.del).then(() => actions.toast('Expense deleted')).catch((e) => actions.toast(e.message, true));
      }
    })
  );
}

export function openExpenseModal(state, actions) {
  actions.openModal(`
    <h3>Add expense</h3>
    <form id="expense-form">
      <div class="field"><label>Date</label><input type="date" id="ef-date" value="${todayISO()}" required></div>
      <div class="field">
        <label>Category</label>
        <select id="ef-category">${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Amount (GH₵)</label><input type="number" step="0.01" min="0" id="ef-amount" required></div>
      <div class="field"><label>Note (optional)</label><input type="text" id="ef-note" placeholder="e.g. Fuel for delivery"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="ef-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">Save expense</button>
      </div>
    </form>
  `);
  document.getElementById('ef-cancel').addEventListener('click', actions.closeModal);
  document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await actions.addItem('expenses', {
        date: document.getElementById('ef-date').value,
        category: document.getElementById('ef-category').value,
        amount: Number(document.getElementById('ef-amount').value),
        note: document.getElementById('ef-note').value.trim(),
        createdAt: new Date().toISOString()
      });
      actions.toast('Expense added');
      actions.closeModal();
    } catch (err) {
      actions.toast(err.message, true);
    }
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export { CATEGORIES };
