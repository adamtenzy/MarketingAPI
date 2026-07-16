const API_VERSION = '2024-10';
const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.API_KEY;
  if (apiKey && req.query.key !== apiKey) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const store = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_TOKEN;
  if (!store || !token) {
    res.status(500).json({ error: 'missing_config', message: 'SHOPIFY_STORE or SHOPIFY_TOKEN env var not set' });
    return;
  }

  const range = RANGE_DAYS[req.query.range] ? req.query.range : '30d';
  const since = new Date(Date.now() - RANGE_DAYS[range] * 86400000).toISOString();

  try {
    const orders = await fetchAllOrders(store, token, since);
    res.status(200).json(computeMetrics(orders, range));
  } catch (err) {
    res.status(502).json({ error: 'shopify_fetch_failed', message: err.message });
  }
};

async function fetchAllOrders(store, token, since) {
  const orders = [];
  let url = `https://${store}/admin/api/${API_VERSION}/orders.json?status=any&created_at_min=${encodeURIComponent(since)}&limit=250`;

  while (url) {
    const resp = await fetch(url, { headers: { 'X-Shopify-Access-Token': token } });
    if (!resp.ok) {
      throw new Error(`Shopify API responded ${resp.status}`);
    }
    const data = await resp.json();
    orders.push(...data.orders);

    const link = resp.headers.get('link') || '';
    const next = link.split(',').find((part) => part.includes('rel="next"'));
    url = next ? next.split(';')[0].trim().slice(1, -1) : null;
  }

  return orders;
}

function computeMetrics(orders, range) {
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
  const orderCount = orders.length;
  const averageOrderValue = orderCount ? totalRevenue / orderCount : 0;

  const refunded = orders.filter((o) => o.financial_status === 'refunded' || o.financial_status === 'partially_refunded');
  const refundRate = orderCount ? refunded.length / orderCount : 0;

  const ordersPerCustomer = {};
  orders.forEach((o) => {
    const id = o.customer && o.customer.id;
    if (id) ordersPerCustomer[id] = (ordersPerCustomer[id] || 0) + 1;
  });
  const newCustomers = Object.values(ordersPerCustomer).filter((n) => n === 1).length;
  const returningCustomers = Object.values(ordersPerCustomer).filter((n) => n > 1).length;

  const productTotals = {};
  orders.forEach((o) => {
    (o.line_items || []).forEach((item) => {
      const entry = productTotals[item.title] || { revenue: 0, units: 0 };
      entry.revenue += parseFloat(item.price) * item.quantity;
      entry.units += item.quantity;
      productTotals[item.title] = entry;
    });
  });
  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([title, { revenue, units }]) => ({ title, revenue: round2(revenue), units }));

  const revenueByDay = {};
  orders.forEach((o) => {
    const day = o.created_at.slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] || 0) + parseFloat(o.total_price || '0');
  });
  const dailyTrend = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue: round2(revenue) }));

  return {
    range,
    totalRevenue: round2(totalRevenue),
    orderCount,
    averageOrderValue: round2(averageOrderValue),
    refundRate: Math.round(refundRate * 1000) / 1000,
    newCustomers,
    returningCustomers,
    topProducts,
    dailyTrend,
    generatedAt: new Date().toISOString(),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
