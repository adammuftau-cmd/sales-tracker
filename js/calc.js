// All money figures are stored as plain numbers (GH₵, major units, decimals allowed).

export function fmtMoney(n) {
  const v = Number(n) || 0;
  return 'GH₵ ' + v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Returns [startDate, endDate] (inclusive) as Date objects for a named period,
// anchored on `anchor` (defaults to now). Weeks start Monday.
export function periodRange(period, anchor = new Date()) {
  const a = new Date(anchor);
  a.setHours(0, 0, 0, 0);
  let start, end;
  if (period === 'today') {
    start = new Date(a);
    end = new Date(a); end.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    const day = (a.getDay() + 6) % 7; // 0 = Monday
    start = new Date(a); start.setDate(a.getDate() - day);
    end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    start = new Date(a.getFullYear(), a.getMonth(), 1);
    end = new Date(a.getFullYear(), a.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    start = new Date(a.getFullYear(), 0, 1);
    end = new Date(a.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    start = new Date(0); end = new Date(8640000000000000);
  }
  return [start, end];
}

export function inRange(dateStr, start, end) {
  const t = new Date(dateStr).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function filterByPeriod(items, dateField, period, anchor) {
  const [start, end] = periodRange(period, anchor);
  return items.filter((it) => inRange(it[dateField], start, end));
}

// ---- Sales aggregation ----
export function aggregateSales(sales) {
  let revenue = 0, cogs = 0, count = 0;
  for (const s of sales) {
    revenue += Number(s.total) || 0;
    cogs += Number(s.cost) || 0;
    count += 1;
  }
  const grossProfit = revenue - cogs;
  return { revenue, cogs, grossProfit, count };
}

export function expensesTotal(expenses) {
  return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

export function netProfit(grossProfit, expTotal) {
  return grossProfit - expTotal;
}

// Aggregate product performance (qty sold, revenue) across a set of sales.
export function productPerformance(sales) {
  const map = new Map();
  for (const s of sales) {
    for (const item of (s.items || [])) {
      const key = item.productId || item.name;
      const cur = map.get(key) || { name: item.name, qty: 0, revenue: 0 };
      cur.qty += Number(item.qty) || 0;
      cur.revenue += (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
      map.set(key, cur);
    }
  }
  return Array.from(map.values());
}

export function bestSellers(sales, n = 5) {
  return productPerformance(sales).sort((a, b) => b.qty - a.qty).slice(0, n);
}
export function worstSellers(sales, n = 5) {
  return productPerformance(sales).sort((a, b) => a.qty - b.qty).slice(0, n);
}

export function outstandingDebt(debts) {
  return debts.reduce((sum, d) => sum + (d.status === 'paid' ? 0 : Number(d.balance) || 0), 0);
}

// Buckets sales/expenses into a trailing series for charts.
// granularity: 'day' (last 14) | 'month' (last 12)
export function trendSeries(items, dateField, valueFn, granularity = 'day', buckets = 14) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const labels = [];
  const values = [];
  for (let i = buckets - 1; i >= 0; i--) {
    let bucketStart, bucketEnd, label;
    if (granularity === 'day') {
      bucketStart = new Date(now); bucketStart.setDate(now.getDate() - i);
      bucketEnd = new Date(bucketStart); bucketEnd.setHours(23, 59, 59, 999);
      label = bucketStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else {
      bucketStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      bucketEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      label = bucketStart.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    }
    const sum = items.filter((it) => inRange(it[dateField], bucketStart, bucketEnd))
      .reduce((acc, it) => acc + valueFn(it), 0);
    labels.push(label);
    values.push(sum);
  }
  return { labels, values };
}
