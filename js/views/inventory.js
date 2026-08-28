import { fmtMoney } from '../calc.js';

let searchTerm = '';

export function renderInventory(container, state, actions) {
  const products = state.products
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  container.innerHTML = `
    <div class="toolbar">
      <input type="search" class="search-input" id="inv-search" placeholder="Search products…" value="${escapeHtml(searchTerm)}">
      <button class="btn btn-gold btn-sm" id="inv-add-btn">+ Add product</button>
    </div>
    ${products.length ? `
    <div class="card table-wrap">
      <table>
        <thead><tr>
          <th>Product</th><th>Category</th><th class="num">Cost</th><th class="num">Sell price</th>
          <th class="num">Stock</th><th></th>
        </tr></thead>
        <tbody>
          ${products.map((p) => rowHtml(p)).join('')}
        </tbody>
      </table>
    </div>` : emptyState()}
  `;

  container.querySelector('#inv-add-btn').addEventListener('click', () => openProductModal(state, actions));
  container.querySelector('#inv-search').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderInventory(container, state, actions);
  });
  container.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => openProductModal(state, actions, state.products.find((p) => p.id === btn.dataset.edit)))
  );
  container.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (confirm('Delete this product? This cannot be undone.')) {
        actions.deleteItem('products', btn.dataset.delete)
          .then(() => actions.toast('Product deleted'))
          .catch((e) => actions.toast(e.message, true));
      }
    })
  );
}

function rowHtml(p) {
  const low = Number(p.qty) <= Number(p.reorderLevel ?? 3);
  const margin = Number(p.sellPrice) - Number(p.costPrice);
  return `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong><div style="font-size:0.75rem;color:var(--ink-soft);">margin ${fmtMoney(margin)}</div></td>
      <td>${escapeHtml(p.category || '—')}</td>
      <td class="num">${fmtMoney(p.costPrice)}</td>
      <td class="num">${fmtMoney(p.sellPrice)}</td>
      <td class="num">
        <span class="pill ${low ? 'pill-red' : 'pill-green'}">${p.qty} ${low ? '· low' : ''}</span>
      </td>
      <td style="text-align:right;white-space:nowrap;">
        <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-delete="${p.id}">Delete</button>
      </td>
    </tr>`;
}

function emptyState() {
  return `<div class="card empty-state">
    <div class="big">No products yet</div>
    <p>Add your first product to start tracking stock and sales.</p>
  </div>`;
}

export function openProductModal(state, actions, existing = null) {
  const p = existing || { name: '', category: '', costPrice: '', sellPrice: '', qty: '', reorderLevel: 3 };
  actions.openModal(`
    <h3>${existing ? 'Edit product' : 'Add product'}</h3>
    <form id="product-form">
      <div class="field"><label>Product name</label><input type="text" id="pf-name" required value="${escapeAttr(p.name)}"></div>
      <div class="field"><label>Category</label><input type="text" id="pf-category" placeholder="e.g. Beverages" value="${escapeAttr(p.category)}"></div>
      <div class="form-row">
        <div class="field"><label>Cost price (GH₵)</label><input type="number" step="0.01" min="0" id="pf-cost" required value="${p.costPrice}"></div>
        <div class="field"><label>Sell price (GH₵)</label><input type="number" step="0.01" min="0" id="pf-sell" required value="${p.sellPrice}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Stock quantity</label><input type="number" step="1" min="0" id="pf-qty" required value="${p.qty}"></div>
        <div class="field"><label>Low-stock alert at</label><input type="number" step="1" min="0" id="pf-reorder" value="${p.reorderLevel ?? 3}"></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="pf-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Add product'}</button>
      </div>
    </form>
  `);
  document.getElementById('pf-cancel').addEventListener('click', actions.closeModal);
  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('pf-name').value.trim(),
      category: document.getElementById('pf-category').value.trim(),
      costPrice: Number(document.getElementById('pf-cost').value),
      sellPrice: Number(document.getElementById('pf-sell').value),
      qty: Number(document.getElementById('pf-qty').value),
      reorderLevel: Number(document.getElementById('pf-reorder').value) || 0
    };
    try {
      if (existing) {
        await actions.updateItem('products', existing.id, data);
        actions.toast('Product updated');
      } else {
        data.createdAt = new Date().toISOString();
        await actions.addItem('products', data);
        actions.toast('Product added');
      }
      actions.closeModal();
    } catch (err) {
      actions.toast(err.message, true);
    }
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
