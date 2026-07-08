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

// بذور الكلمات المتتبعة (سلع أساسية) — عدّلها من لوحة التحكم
if (db.prepare('SELECT COUNT(*) n FROM tracked_queries').get().n === 0) {
  const ins = db.prepare('INSERT INTO tracked_queries (query) VALUES (?)');
  for (const q of [
    'حليب', 'أرز', 'دجاج', 'زيت', 'سكر', 'ماء', 'قهوة',
    'شاي', 'جبن', 'بيض', 'خبز', 'عصير', 'طماطم', 'مكرونة',
  ]) {
    ins.run(q);
  }
}

// ---- بذور: متجران نموذجيان ----
const count = db.prepare('SELECT COUNT(*) n FROM stores').get().n;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO stores (key, name_ar, name_en, color, enabled, config) VALUES (?,?,?,?,?,?)',
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
}

module.exports = db;
