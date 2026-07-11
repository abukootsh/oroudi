// قاعدة بيانات عروضي — SQLite ملف واحد بجانب الخادم
const Database = require('better-sqlite3');
const path = require('path');
const { TRACKED_QUERIES, STORES } = require('./seed-data');

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

// بذور الكلمات المتتبعة والمتاجر من المصدر المشترك seed-data.js.
// OR IGNORE بدل شرط «الجدول فارغ»: استضافات مجانية مثل Render قد تمسح القرص
// مع كل إقلاع، فنضمن وجود الأساسيات دائمًا دون تكرار أو حذف ما أضافه المستخدم.
// (لتحديث متجر أساسي عدّله من اللوحة — البذور هنا شبكة أمان فقط.)
{
  const insQ = db.prepare("INSERT OR IGNORE INTO tracked_queries (query) VALUES (?)");
  for (const q of TRACKED_QUERIES) insQ.run(q);

  const insS = db.prepare(
    "INSERT OR IGNORE INTO stores (key, name_ar, name_en, color, enabled, config) VALUES (?,?,?,?,?,?)",
  );
  for (const s of STORES) {
    insS.run(s.key, s.name_ar, s.name_en, s.color, s.enabled, JSON.stringify(s.config, null, 2));
  }
}

module.exports = db;
