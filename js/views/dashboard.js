import {
  fmtMoney, filterByPeriod, aggregateSales, expensesTotal, netProfit,
  bestSellers, worstSellers, outstandingDebt, trendSeries
} from '../calc.js';

let selectedPeriod = 'month';
let chartInstance = null;

const PERIOD_LABELS = { today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year' };

export function renderDashboard(container, state) {
  const periodSales = filterByPeriod(state.sales, 'date', selectedPeriod);
  const periodExpenses = filterByPeriod(state.expenses, 'date', selectedPeriod);
  const { revenue, cogs, grossProfit, count } = aggregateSales(periodSales);
  const expTotal = expensesTotal(periodExpenses);
  const net = netProfit(grossProfit, expTotal);
  const debtOutstanding = outstandingDebt(state.debts);
  const lowStock = state.products.filter((p) => Number(p.qty) <= Number(p.reorderLevel ?? 3));

  container.innerHTML = `
    <div class="period-tabs">
      ${Object.entries(PERIOD_LABELS).map(([key, label]) =>
        `<button data-period="${key}" class="${key === selectedPeriod ? 'active' : ''}">${label}</button>`
      ).join('')}
    </div>

    <div class="grid kpi-grid">
      <div class="kpi"><div class="label">Revenue</div><div class="value">${fmtMoney(revenue)}</div><div class="sub">${count} sale${count === 1 ? '' : 's'}</div></div>
      <div class="kpi"><div class="label">Cost of Goods Sold</div><div class="value">${fmtMoney(cogs)}</div><div class="sub">from stock sold</div></div>
      <div class="kpi"><div class="label">Gross Profit</div><div class="value">${fmtMoney(grossProfit)}</div><div class="sub">revenue − COGS</div></div>
      <div class="kpi"><div class="label">Expenses</div><div class="value">${fmtMoney(expTotal)}</div><div class="sub">${PERIOD_LABELS[selectedPeriod].toLowerCase()}</div></div>
      <div class="kpi"><div class="label">Net Profit</div><div class="value ${net < 0 ? 'negative' : ''}">${fmtMoney(net)}</div><div class="sub">gross profit − expenses</div></div>
      <div class="kpi"><div class="label">Outstanding Debt</div><div class="value ${debtOutstanding > 0 ? 'negative' : ''}">${fmtMoney(debtOutstanding)}</div><div class="sub">owed by customers</div></div>
    </div>

    <div class="two-col">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-family:var(--font-display);font-size:1rem;">Revenue trend</strong>
        </div>
        <canvas id="trend-chart" height="140" style="margin-top:12px;"></canvas>
      </div>
      <div class="card">
        <strong style="font-family:var(--font-display);font-size:1rem;">Best &amp; lowest sellers</strong>
        <div class="section-title" style="margin:14px 0 6px;font-size:0.85rem;">Best selling (by qty)</div>
        ${renderSellerList(bestSellers(periodSales, 5))}
        <div class="section-title" style="margin:16px 0 6px;font-size:0.85rem;">Lowest selling</div>
        ${renderSellerList(worstSellers(periodSales, 5))}
      </div>
    </div>

    ${lowStock.length ? `
    <div class="section-title">Low stock alert</div>
    <div class="card">
      ${lowStock.map((p) => `
        <div class="leader-row">
          <span class="lbl">${escapeHtml(p.name)}</span>
          <span class="dots"></span>
          <span class="val" style="color:var(--red);">${p.qty} left</span>
        </div>`).join('')}
    </div>` : ''}
  `;

  container.querySelectorAll('[data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedPeriod = btn.dataset.period;
      renderDashboard(container, state);
    });
  });

  drawTrendChart(state);
}

function renderSellerList(items) {
  if (!items.length) return `<div style="color:var(--ink-soft);font-size:0.85rem;padding:8px 0;">No sales in this period yet.</div>`;
  return items.map((p) => `
    <div class="leader-row">
      <span class="lbl">${escapeHtml(p.name)}</span>
      <span class="dots"></span>
      <span class="val">${p.qty} sold</span>
    </div>`).join('');
}

function drawTrendChart(state) {
  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;
  const granularity = selectedPeriod === 'year' ? 'month' : 'day';
  const buckets = selectedPeriod === 'year' ? 12 : 14;
  const revSeries = trendSeries(state.sales, 'date', (s) => Number(s.total) || 0, granularity, buckets);
  const expSeries = trendSeries(state.expenses, 'date', (e) => Number(e.amount) || 0, granularity, buckets);

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: revSeries.labels,
      datasets: [
        { label: 'Revenue', data: revSeries.values, borderColor: '#0F3D3E', backgroundColor: 'rgba(15,61,62,0.08)', fill: true, tension: 0.3, pointRadius: 2 },
        { label: 'Expenses', data: expSeries.values, borderColor: '#B5482D', backgroundColor: 'rgba(181,72,45,0.06)', fill: true, tension: 0.3, pointRadius: 2 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Inter', size: 11 } } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#E4DDCB' }, ticks: { callback: (v) => 'GH₵' + v } }
      }
    }
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
