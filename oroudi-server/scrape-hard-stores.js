// سكرابر خارجي يعمل على GitHub Actions (بيئة كاملة الصلاحيات تدعم Chrome
// حقيقي بعكس استضافة الخادم المجانية). يجلب متاجر نمط "browser" من لوحة
// التحكم، يكشط كل كلمة متتبعة، ويغذّي كاش الخادم الحي عبر push-cache.
const { scrapeStore } = require('./scraper');

const SERVER = process.env.OROUDI_SERVER || 'https://oroudi-server.onrender.com';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('❌ ADMIN_TOKEN غير مضبوط');
  process.exit(1);
}

async function api(path, opts = {}) {
  const res = await fetch(`${SERVER}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const { stores } = await api('/api/admin/stores');
  const browserStores = stores.filter((s) => {
    try {
      return JSON.parse(s.config).type === 'browser' && s.enabled;
    } catch {
      return false;
    }
  });
  if (!browserStores.length) {
    console.log('لا يوجد متاجر نمط browser فعّالة — لا شيء لعمله');
    return;
  }

  const { queries } = await api('/api/admin/tracked');
  console.log(`متاجر: ${browserStores.map((s) => s.key).join(', ')} | كلمات: ${queries.length}`);

  let ok = 0;
  let failed = 0;
  for (const store of browserStores) {
    for (const q of queries) {
      const t0 = Date.now();
      try {
        const products = await scrapeStore(store, q, 'ar', 30000);
        await api('/api/admin/push-cache', {
          method: 'POST',
          body: JSON.stringify({ store_key: store.key, query: q, lang: 'ar', products }),
        });
        console.log(`✓ ${store.key} / ${q}: ${products.length} منتج (${Date.now() - t0}ms)`);
        ok += 1;
      } catch (err) {
        console.log(`✗ ${store.key} / ${q}: ${err.message}`);
        failed += 1;
      }
    }
  }
  console.log(`\nاكتمل: ${ok} نجاح، ${failed} فشل`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('خطأ عام:', err);
    process.exit(1);
  });
