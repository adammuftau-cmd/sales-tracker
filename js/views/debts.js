import { fmtMoney, fmtDate, todayISO, outstandingDebt } from '../calc.js';

export function renderDebts(container, state, actions) {
  const debts = [...state.debts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = outstandingDebt(debts);

  container.innerHTML = `
    <div class="toolbar">
      <div class="card" style="padding:12px 18px;display:flex;gap:8px;align-items:baseline;">
        <span style="color:var(--ink-soft);font-size:0.8rem;">Total outstanding</span>
        <span class="tnum" style="font-weight:700;color:${total > 0 ? 'var(--red)' : 'var(--teal-deep)'};">${fmtMoney(total)}</span>
      </div>
      <button class="btn btn-gold btn-sm" id="debt-add-btn">+ Add debt</button>
    </div>
    ${debts.length ? `
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Customer</th><th>Incurred</th><th>Due</th><th class="num">Original</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${debts.map((d) => rowHtml(d)).join('')}
        </tbody>
      </table>
    </div>` : `<div class="card empty-state"><div class="big">No debts on record</div><p>Credit sales create a debt automatically — or add one manually.</p></div>`}
  `;

  container.querySelector('#debt-add-btn').addEventListener('click', () => openDebtModal(state, actions));
  container.querySelectorAll('[data-pay]').forEach((btn) =>
    btn.addEventListener('click', () => openPaymentModal(state, actions, debts.find((d) => d.id === btn.dataset.pay)))
  );
  container.querySelectorAll('[data-del-debt]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (confirm('Delete this debt record?')) {
        actions.deleteItem('debts', btn.dataset.delDebt).then(() => actions.toast('Debt deleted')).catch((e) => actions.toast(e.message, true));
      }
    })
  );
}

function statusPill(d) {
  if (d.status === 'paid') return `<span class="pill pill-green">Paid</span>`;
  if (d.status === 'partial') return `<span class="pill pill-gold">Partial</span>`;
  const overdue = d.dueDate && new Date(d.dueDate) < new Date(new Date().toDateString());
  return `<span class="pill ${overdue ? 'pill-red' : 'pill-gray'}">${overdue ? 'Overdue' : 'Unpaid'}</span>`;
}

function rowHtml(d) {
  return `
    <tr>
      <td><strong>${escapeHtml(d.customerName)}</strong>${d.phone ? `<div style="font-size:0.75rem;color:var(--ink-soft);">${escapeHtml(d.phone)}</div>` : ''}</td>
      <td>${d.dateIncurred ? fmtDate(d.dateIncurred) : '—'}</td>
      <td>${d.dueDate ? fmtDate(d.dueDate) : '—'}</td>
      <td class="num">${fmtMoney(d.originalAmount)}</td>
      <td class="num">${fmtMoney(d.balance)}</td>
      <td>${statusPill(d)}</td>
      <td style="text-align:right;white-space:nowrap;">
        ${d.status !== 'paid' ? `<button class="btn btn-ghost btn-sm" data-pay="${d.id}">Record payment</button>` : ''}
        <button class="btn btn-danger btn-sm" data-del-debt="${d.id}">Delete</button>
      </td>
    </tr>`;
}

export function openDebtModal(state, actions) {
  actions.openModal(`
    <h3>Add debt</h3>
    <form id="debt-form">
      <div class="form-row">
        <div class="field"><label>Customer name</label><input type="text" id="df-name" required></div>
        <div class="field"><label>Phone (optional)</label><input type="text" id="df-phone"></div>
      </div>
      <div class="field"><label>Amount owed (GH₵)</label><input type="number" step="0.01" min="0" id="df-amount" required></div>
      <div class="form-row">
        <div class="field"><label>Date incurred</label><input type="date" id="df-date" value="${todayISO()}"></div>
        <div class="field"><label>Due date (optional)</label><input type="date" id="df-due"></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="df-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">Add debt</button>
      </div>
    </form>
  `);
  document.getElementById('df-cancel').addEventListener('click', actions.closeModal);
  document.getElementById('debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById('df-amount').value);
    try {
      await actions.addItem('debts', {
        customerName: document.getElementById('df-name').value.trim(),
        phone: document.getElementById('df-phone').value.trim(),
        originalAmount: amount, balance: amount,
        dateIncurred: document.getElementById('df-date').value || todayISO(),
        dueDate: document.getElementById('df-due').value || '',
        status: 'unpaid', payments: [], createdAt: new Date().toISOString()
      });
      actions.toast('Debt added');
      actions.closeModal();
    } catch (err) {
      actions.toast(err.message, true);
    }
  });
}

function openPaymentModal(state, actions, debt) {
  actions.openModal(`
    <h3>Record payment — ${escapeHtml(debt.customerName)}</h3>
    <p style="color:var(--ink-soft);font-size:0.88rem;margin-top:-8px;">Balance owed: <strong class="tnum">${fmtMoney(debt.balance)}</strong></p>
    <form id="payment-form">
      <div class="field"><label>Payment amount (GH₵)</label><input type="number" step="0.01" min="0.01" max="${debt.balance}" id="pf-amount" required></div>
      <div class="field"><label>Date</label><input type="date" id="pf-date" value="${todayISO()}"></div>
      <div class="auth-error" id="payment-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="pf-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">Save payment</button>
      </div>
    </form>
  `);
  document.getElementById('pf-cancel').addEventListener('click', actions.closeModal);
  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('payment-error');
    const amount = Number(document.getElementById('pf-amount').value);
    if (amount <= 0 || amount > Number(debt.balance) + 0.001) {
      errorEl.textContent = `Enter an amount up to ${fmtMoney(debt.balance)}.`;
      return;
    }
    const newBalance = Math.max(0, Number(debt.balance) - amount);
    const payments = [...(debt.payments || []), { date: document.getElementById('pf-date').value || todayISO(), amount }];
    try {
      await actions.updateItem('debts', debt.id, {
        balance: newBalance,
        status: newBalance <= 0.001 ? 'paid' : 'partial',
        payments
      });
      actions.toast('Payment recorded');
      actions.closeModal();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
