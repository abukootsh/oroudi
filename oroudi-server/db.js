// قاعدة بيانات عروضي — SQLite ملف واحد بجانب الخادم
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'oroudi.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,          -- معرف لاتيني قصير: tamimi, carrefour...
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#888888',
  enabled INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL,              -- JSON: طريقة قراءة أسعار المتجر
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY,
  query TEXT NOT NULL,
  lang TEXT,
  city TEXT,
  results INTEGER,
  ms INTEGER,
  ts TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS scrape_logs (
  id INTEGER PRIMARY KEY,
  store_key TEXT NOT NULL,
  query TEXT,
  ok INTEGER NOT NULL,
  count INTEGER,
  ms INTEGER,
  error TEXT,
  ts TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cached (
  store_key TEXT NOT NULL,
  query TEXT NOT NULL,
  lang TEXT NOT NULL,
  json TEXT NOT NULL,
  ts INTEGER NOT NULL,               -- epoch ms
  PRIMARY KEY (store_key, query, lang)
);
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  platform TEXT,
  ts TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tracked_queries (
  query TEXT PRIMARY KEY               -- كلمات يجلبها التحديث التلقائي مرتين يوميًا
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// بذور الكلمات المتتبعة (سلع أساسية) — عدّلها من لوحة التحكم.
// OR IGNORE بدل شرط "الجدول فارغ": استضافات مجانية مثل Render قد تمسح
// القرص مع كل نشر جديد، فنضمن وجود الكلمات الأساسية دائمًا دون تكرار
// أو حذف أي كلمات أضافها المستخدم بنفسه.
{
  const ins = db.prepare('INSERT OR IGNORE INTO tracked_queries (query) VALUES (?)');
  for (const q of [
    'حليب', 'أرز', 'دجاج', 'زيت', 'سكر', 'ماء', 'قهوة',
    'شاي', 'جبن', 'بيض', 'خبز', 'عصير', 'طماطم', 'مكرونة',
  ]) {
    ins.run(q);
  }
}

// ---- بذور المتاجر ----
// OR IGNORE لنفس السبب أعلاه: تضمن وجود المتاجر الأساسية بعد كل إعادة
// تشغيل حتى لو القرص انمسح، دون المساس بأي متجر أضافه المستخدم أو عدّله
// (لن يُستبدل، فقط يُضاف الناقص). لتحديث إعدادات متجر أساسي، عدّله من
// اللوحة مباشرة — البذور هنا شبكة أمان فقط.
{
  const insert = db.prepare(
    'INSERT OR IGNORE INTO stores (key, name_ar, name_en, color, enabled, config) VALUES (?,?,?,?,?,?)',
  );

  // ١) التميمي — API عام حقيقي يعمل مباشرة (العربية عبر ترويسة Accept-Language)
  insert.run(
    'tamimi',
    'التميمي',
    'Tamimi',
    '#c8102e',
    1,
    JSON.stringify(
      {
        search_url: 'https://shop.tamimimarkets.com/api/product?q={q}&limit=100',
        headers: { 'Accept-Language': '{lang}', 'User-Agent': 'Mozilla/5.0' },
        results_path: 'data.product',
        fields: {
          id: 'id',
          name: 'name',
          brand: 'brand.name',
          image: 'images.0',
          url: 'slug',
          unit: 'variants.0.name',
          price: 'variants.0.storeSpecificData.0.mrp',
          discount_amount: 'variants.0.storeSpecificData.0.discount',
          stock: 'variants.0.storeSpecificData.0.stock',
        },
        url_prefix: 'https://shop.tamimimarkets.com/product/',
      },
      null,
      2,
    ),
  );

  // ٢) الدانوب — منصة Spree + بحث Algolia (مفتاح بحث عام آمن، مكتشف من كود الموقع)
  insert.run(
    'danube',
    'الدانوب',
    'Danube',
    '#0057a8',
    1,
    JSON.stringify(
      {
        search_url:
          'https://1D2IEWLQAD-dsn.algolia.net/1/indexes/spree_products/query?x-algolia-application-id=1D2IEWLQAD&x-algolia-api-key=87ca3b6b2ce56f0bb76fc194a8d170e2',
        method: 'POST',
        body: '{"params":"query={q}&hitsPerPage=60"}',
        results_path: 'hits',
        fields: {
          id: 'master_id',
          name: 'full_name_en',
          name_ar: 'full_name_ar',
          image: 'image',
          url: 'url_ar',
          price: 'price',
          original_price: 'original_price',
        },
        url_prefix: 'https://www.danube.sa',
      },
      null,
      2,
    ),
  );

  // ٣) بن داود — نفس منصة الدانوب (Spree + Algolia)
  insert.run(
    'bindawood',
    'بن داود',
    'BinDawood',
    '#c8a13a',
    1,
    JSON.stringify(
      {
        search_url:
          'https://KBGHG5MR5E-dsn.algolia.net/1/indexes/spree_products/query?x-algolia-application-id=KBGHG5MR5E&x-algolia-api-key=8c6b85b7bdebb06d260ccde6b810884b',
        method: 'POST',
        body: '{"params":"query={q}&hitsPerPage=60"}',
        results_path: 'hits',
        fields: {
          id: 'master_id',
          name: 'full_name_en',
          name_ar: 'full_name_ar',
          image: 'image',
          url: 'url_ar',
          price: 'price',
          original_price: 'original_price',
        },
        url_prefix: 'https://www.bindawood.sa',
      },
      null,
      2,
    ),
  );

  // ٤) بنده — بوابة API داخلية موحّدة (interactions gateway)، غير محمية.
  //    الطلب الحقيقي يُمرَّر عبر ترويسات method/path بدل رابط مباشر.
  insert.run(
    'panda',
    'بنده',
    'Panda',
    '#00a0a8',
    1,
    JSON.stringify(
      {
        search_url: 'https://panda.sa/api/interactions',
        method: 'POST',
        headers: {
          method: 'GET',
          path: '/products?search_key={q}&page=1',
          'x-language': '{lang}',
          'x-panda-source': 'PandaClick',
          'api-version': '2026-01-01',
          'x-pandaclick-agent': '4',
          'x-session-id': '051E210C-08B8-40C0-BCD9-E86B91A8BF90',
          version: 'v3',
        },
        body: '{}',
        results_path: 'data.products',
        fields: {
          id: 'id',
          name: 'name',
          brand: 'brand.name',
          image: 'varieties.0.imageURL',
          price: 'varieties.0.price',
          original_price: 'varieties.0.undiscounted_price',
          unit: 'varieties.0.unit',
          stock: 'varieties.0.availability',
          url: 'varieties.0.id',
        },
        url_prefix: 'https://panda.sa/ar/p/',
      },
      null,
      2,
    ),
  );

  // ٥) هنقرستيشن ماركت — خلف Cloudflare، لكن Chrome حقيقي (نمط browser) يجتازه.
  //    البيانات JSON نظيفة مدمجة في __NEXT_DATA__ داخل الصفحة نفسها.
  insert.run(
    'hungerstation',
    'هنقرستيشن',
    'Hungerstation',
    '#f47b20',
    1,
    JSON.stringify(
      {
        type: 'browser',
        search_url:
          'https://hungerstation.com/sa-ar/qc/14013/hmarket/branch/a67ba893-443c-41b6-ba70-fc35a9b2f9f3~54608?query={q}',
        extract: 'next_data',
        results_path: 'props.pageProps.productSearchResult.items',
        fields: {
          id: 'id',
          name: 'name',
          image: 'images.0.url',
          price: 'price',
          original_price: 'originalPrice',
          url: 'sku',
        },
        url_prefix:
          'https://hungerstation.com/sa-ar/qc/14013/hmarket/branch/a67ba893-443c-41b6-ba70-fc35a9b2f9f3~54608/product/x/',
      },
      null,
      2,
    ),
  );

  // ٦) كارفور — خلف Akamai، لكن Chrome حقيقي يجتازه أيضًا. البيانات مُصيَّرة
  //    داخل HTML الصفحة (بلا JSON مدمج)، فنقرأها بمحددات CSS.
  insert.run(
    'carrefour',
    'كارفور',
    'Carrefour',
    '#004e9f',
    1,
    JSON.stringify(
      {
        type: 'browser',
        search_url: 'https://www.carrefourksa.com/mafsau/ar/search?keyword={q}',
        extract: 'html',
        item_selector: 'div[style*="grid-column"]',
        fields: {
          name: { sel: '.line-clamp-2' },
          price: { sel: '.flex.flex-wrap.gap-2xs > div:first-child' },
          original_price: { sel: '.line-through' },
          image: { sel: 'img', attr: 'src' },
          url: { sel: 'a[href*="/p/"]', attr: 'href' },
        },
        url_prefix: 'https://www.carrefourksa.com',
      },
      null,
      2,
    ),
  );

  // ٧) نون — لا يحجب حتى Chromium البسيط، لكن نستخدم نمط browser للاتساق.
  insert.run(
    'noon',
    'نون',
    'Noon',
    '#e8b007',
    1,
    JSON.stringify(
      {
        type: 'browser',
        search_url: 'https://www.noon.com/saudi-ar/search/?q={q}',
        extract: 'html',
        item_selector: 'a[href*="/p/"]',
        fields: {
          name: { sel: '[class*="_title_"]' },
          price: { sel: '[class*="_sellingPrice_"]' },
          // أي صورة مسارها /p/ = صورة منتج حقيقية (نتجاوز placeholder والأيقونات
          // ونتفادى مشكلة الكاروسيل الذي يحوي عدة صور بعضها لم يُحمّل بعد)
          image: { sel: 'img[src*="nooncdn.com/p/"]', attr: 'src' },
          url: { attr: 'href' },
        },
        url_prefix: 'https://www.noon.com',
      },
      null,
      2,
    ),
  );
}

module.exports = db;
