import { fmtMoney, fmtDate, todayISO } from '../calc.js';

let rowCounter = 0;

export function renderSales(container, state, actions) {
  const sales = [...state.sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100);

  container.innerHTML = `
    <div class="toolbar">
      <div style="color:var(--ink-soft);font-size:0.85rem;">Showing most recent ${sales.length} sale${sales.length === 1 ? '' : 's'}</div>
      <button class="btn btn-gold btn-sm" id="sales-add-btn">+ New sale</button>
    </div>
    ${sales.length ? `
    <div class="card table-wrap">
      <table>
        <thead><tr>
          <th>Date</th><th>Items</th><th>Payment</th><th class="num">Total</th><th class="num">Profit</th><th></th>
        </tr></thead>
        <tbody>
          ${sales.map((s) => rowHtml(s)).join('')}
        </tbody>
      </table>
    </div>` : `<div class="card empty-state"><div class="big">No sales recorded yet</div><p>Log your first sale of the day to get started.</p></div>`}
  `;

  container.querySelector('#sales-add-btn').addEventListener('click', () => openSaleModal(state, actions));
  container.querySelectorAll('[data-del-sale]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (confirm('Delete this sale record? Stock will not be restored automatically.')) {
        actions.deleteItem('sales', btn.dataset.delSale).then(() => actions.toast('Sale deleted')).catch((e) => actions.toast(e.message, true));
      }
    })
  );
}

function rowHtml(s) {
  const itemsSummary = (s.items || []).map((i) => `${i.qty}× ${escapeHtml(i.name)}`).join(', ');
  const profit = (Number(s.total) || 0) - (Number(s.cost) || 0);
  return `
    <tr>
      <td>${fmtDate(s.date)}</td>
      <td style="max-width:260px;">${itemsSummary}${s.customerName ? `<div style="font-size:0.75rem;color:var(--ink-soft);">${escapeHtml(s.customerName)}</div>` : ''}</td>
      <td><span class="pill ${s.paymentType === 'credit' ? 'pill-gold' : 'pill-green'}">${s.paymentType === 'credit' ? 'Credit' : 'Cash'}</span></td>
      <td class="num">${fmtMoney(s.total)}</td>
      <td class="num">${fmtMoney(profit)}</td>
      <td style="text-align:right;"><button class="btn btn-danger btn-sm" data-del-sale="${s.id}">Delete</button></td>
    </tr>`;
}

export function openSaleModal(state, actions) {
  rowCounter = 0;
  const html = `
    <h3>New sale</h3>
    <form id="sale-form">
      <div class="field"><label>Date</label><input type="date" id="sf-date" value="${todayISO()}" required></div>
      <div id="sale-items"></div>
      <button type="button" class="btn btn-ghost btn-sm" id="sf-add-row" style="margin-bottom:14px;">+ Add item</button>

      <div class="field">
        <label>Payment type</label>
        <select id="sf-payment">
          <option value="cash">Cash</option>
          <option value="credit">Credit (customer owes)</option>
        </select>
      </div>
      <div id="sf-credit-fields" style="display:none;">
        <div class="form-row">
          <div class="field"><label>Customer name</label><input type="text" id="sf-customer"></div>
          <div class="field"><label>Phone (optional)</label><input type="text" id="sf-phone"></div>
        </div>
        <div class="field"><label>Payment due date</label><input type="date" id="sf-duedate"></div>
      </div>

      <div class="leader-row" style="font-size:1rem;margin-top:6px;">
        <span class="lbl" style="font-weight:600;">Sale total</span><span class="dots"></span>
        <span class="val" id="sf-total">GH₵ 0.00</span>
      </div>

      <div class="auth-error" id="sale-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="sf-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">Record sale</button>
      </div>
    </form>
  `;
  actions.openModal(html);
  document.getElementById('sf-cancel').addEventListener('click', actions.closeModal);

  if (!state.products.length) {
    document.getElementById('sale-error').textContent = 'Add a product in Inventory first.';
  }

  addItemRow(state);
  document.getElementById('sf-add-row').addEventListener('click', () => addItemRow(state));
  document.getElementById('sf-payment').addEventListener('change', (e) => {
    document.getElementById('sf-credit-fields').style.display = e.target.value === 'credit' ? 'block' : 'none';
  });

  document.getElementById('sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitSale(state, actions);
  });
}

function addItemRow(state) {
  const wrap = document.getElementById('sale-items');
  const id = `row-${rowCounter++}`;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.id = id;
  row.innerHTML = `
    <select class="item-product" style="flex:1;">
      <option value="">Select product…</option>
      ${state.products.map((p) => `<option value="${p.id}" data-price="${p.sellPrice}" data-cost="${p.costPrice}" data-stock="${p.qty}">${escapeHtml(p.name)} (${p.qty} in stock)</option>`).join('')}
    </select>
    <input type="number" class="item-qty qty" min="1" value="1">
    <button type="button" class="remove-item">×</button>
  `;
  wrap.appendChild(row);
  row.querySelector('.remove-item').addEventListener('click', () => { row.remove(); recalcTotal(); });
  row.querySelector('.item-product').addEventListener('change', recalcTotal);
  row.querySelector('.item-qty').addEventListener('input', recalcTotal);
  recalcTotal();
}

function recalcTotal() {
  let total = 0;
  document.querySelectorAll('#sale-items .item-row').forEach((row) => {
    const sel = row.querySelector('.item-product');
    const opt = sel.options[sel.selectedIndex];
    const qty = Number(row.querySelector('.item-qty').value) || 0;
    const price = opt ? Number(opt.dataset.price) || 0 : 0;
    total += qty * price;
  });
  const totalEl = document.getElementById('sf-total');
  if (totalEl) totalEl.textContent = fmtMoney(total);
}

async function submitSale(state, actions) {
  const errorEl = document.getElementById('sale-error');
  errorEl.textContent = '';
  const rows = Array.from(document.querySelectorAll('#sale-items .item-row'));
  const items = [];
  let total = 0, cost = 0;

  for (const row of rows) {
    const sel = row.querySelector('.item-product');
    const opt = sel.options[sel.selectedIndex];
    const qty = Number(row.querySelector('.item-qty').value) || 0;
    if (!sel.value || qty <= 0) continue;
    const product = state.products.find((p) => p.id === sel.value);
    if (!product) continue;
    if (qty > Number(product.qty)) {
      errorEl.textContent = `Only ${product.qty} of "${product.name}" in stock.`;
      return;
    }
    items.push({ productId: product.id, name: product.name, qty, unitPrice: Number(product.sellPrice), unitCost: Number(product.costPrice) });
    total += qty * Number(product.sellPrice);
    cost += qty * Number(product.costPrice);
  }

  if (!items.length) { errorEl.textContent = 'Add at least one item.'; return; }

  const paymentType = document.getElementById('sf-payment').value;
  const date = document.getElementById('sf-date').value || todayISO();
  const customerName = document.getElementById('sf-customer')?.value.trim() || '';
  if (paymentType === 'credit' && !customerName) {
    errorEl.textContent = 'Enter a customer name for credit sales.';
    return;
  }

  const saleData = {
    date, items, total, cost, profit: total - cost,
    paymentType, customerName: paymentType === 'credit' ? customerName : '',
    createdAt: new Date().toISOString()
  };

  try {
    const saleRef = await actions.addItem('sales', saleData);

    // Deduct stock for each item sold.
    await Promise.all(items.map((it) => {
      const product = state.products.find((p) => p.id === it.productId);
      const newQty = Math.max(0, Number(product.qty) - it.qty);
      return actions.updateItem('products', it.productId, { qty: newQty });
    }));

    // Credit sale -> auto-create a linked debt record.
    if (paymentType === 'credit') {
      const phone = document.getElementById('sf-phone')?.value.trim() || '';
      const dueDate = document.getElementById('sf-duedate')?.value || '';
      await actions.addItem('debts', {
        customerName, phone, originalAmount: total, balance: total,
        dateIncurred: date, dueDate, status: 'unpaid', relatedSaleId: saleRef.id,
        payments: [], createdAt: new Date().toISOString()
      });
    }

    actions.toast('Sale recorded');
    actions.closeModal();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
