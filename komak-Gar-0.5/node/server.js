const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]', 'utf8');

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('اطلاعات سفارش معتبر نیست.'));
      }
    });
    request.on('error', reject);
  });
}

function serveFile(request, response, pathname) {
  const requestedPath = pathname === '/' ? '/project.html' : pathname;
  const relativePath = requestedPath.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(ROOT, relativePath.includes('/') ? relativePath : path.join('html', relativePath)));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('صفحه پیدا نشد.');
    return;
  }

  response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'helpgar-local-store' });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/orders') {
    sendJson(response, 200, readOrders());
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/orders/status') {
    try {
      const input = await readBody(request);
      const allowedStatuses = ['جدید', 'تأیید شد', 'در حال آماده‌سازی', 'ارسال شد', 'تکمیل شد', 'لغو شد'];
      if (!input.id || !allowedStatuses.includes(input.status)) {
        sendJson(response, 400, { error: 'وضعیت سفارش معتبر نیست.' });
        return;
      }
      const orders = readOrders();
      const order = orders.find((entry) => entry.id === String(input.id));
      if (!order) {
        sendJson(response, 404, { error: 'سفارش پیدا نشد.' });
        return;
      }
      order.status = input.status;
      writeOrders(orders);
      sendJson(response, 200, { ok: true, order });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/orders/payment-status') {
    try {
      const input = await readBody(request);
      const allowedPaymentStatuses = ['در انتظار پرداخت', 'پرداخت شد', 'بازگشت داده شد'];
      if (!input.id || !allowedPaymentStatuses.includes(input.paymentStatus)) {
        sendJson(response, 400, { error: 'وضعیت پرداخت معتبر نیست.' });
        return;
      }
      const orders = readOrders();
      const order = orders.find((entry) => entry.id === String(input.id));
      if (!order) {
        sendJson(response, 404, { error: 'سفارش پیدا نشد.' });
        return;
      }
      order.paymentStatus = input.paymentStatus;
      writeOrders(orders);
      sendJson(response, 200, { ok: true, order });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/orders') {
    try {
      const input = await readBody(request);
      const name = String(input.name || '').trim();
      const phone = String(input.phone || '').trim();
      const address = String(input.address || '').trim();
      const items = Array.isArray(input.items) ? input.items : [];
      if (!name || !phone || !address || !items.length) {
        sendJson(response, 400, { error: 'نام، شماره تماس، آدرس و حداقل یک محصول لازم است.' });
        return;
      }
      if (items.some((item) => !item || !String(item.name || '').trim() || !Number.isFinite(Number(item.price)) || Number(item.price) < 0 || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1)) {
        sendJson(response, 400, { error: 'اطلاعات محصولات سفارش معتبر نیست.' });
        return;
      }

      const order = {
        id: `HG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        createdAt: new Date().toISOString(),
        status: 'جدید',
        name,
        phone,
        address,
        notes: String(input.notes || '').trim(),
        paymentMethod: String(input.paymentMethod || 'پرداخت هنگام تحویل').trim(),
        paymentStatus: 'در انتظار پرداخت',
        deliveryDate: String(input.deliveryDate || '').trim(),
        items: items.map((item) => ({
          name: String(item.name || '').trim(),
          price: Number(item.price) || 0,
          quantity: Math.max(1, Number(item.quantity) || 1),
          image: String(item.image || '')
        })),
        total: items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
      };

      const orders = readOrders();
      orders.push(order);
      writeOrders(orders);
      sendJson(response, 201, { ok: true, order });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === 'GET') {
    serveFile(request, response, decodeURIComponent(url.pathname));
    return;
  }

  sendJson(response, 405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Helpgar local store: http://127.0.0.1:${PORT}/`);
  console.log(`Orders API: http://127.0.0.1:${PORT}/api/orders`);
});
