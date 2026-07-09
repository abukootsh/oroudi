// خادم عروضي — بحث موحّد عبر متاجر تُدار من لوحة التحكم /admin
const express = require('express');
const path = require('path');
const db = require('./db');
const { scrapeStore } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'oroudi-admin';
const CACHE_TTL_MS = 10 * 60 * 1000; // ١٠ دقائق لكل (متجر، كلمة، لغة)

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

const CITIES = [
  { id: 'riyadh', en: 'Riyadh', ar: 'الرياض' },
  { id: 'jeddah', en: 'Jeddah', ar: 'جدة' },
  { id: 'dammam', en: 'Dammam', ar: 'الدمام' },
  { id: 'makkah', en: 'Makkah', ar: 'مكة المكرمة' },
  { id: 'madinah', en: 'Madinah', ar: 'المدينة المنورة' },
  { id: 'taif', en: 'Taif', ar: 'الطائف' },
  { id: 'buraidah', en: 'Buraidah', ar: 'بريدة' },
  { id: 'abha', en: 'Abha', ar: 'أبها' },
  { id: 'tabuk', en: 'Tabuk', ar: 'تبوك' },
  { id: 'hail', en: 'Hail', ar: 'حائل' },
];

// ---------- API عام (يستهلكه التطبيق) ----------

app.get('/api/cities', (req, res) => {
  res.json({ cities: CITIES, selected: 'riyadh' });
});

// مرادفات شائعة: لو كلمة الزائر لم تُرجع شيئًا نعيد البحث بمرادفها
const SYNONYMS = {
  'رز': 'أرز',
  'ارز': 'أرز',
  'بندورة': 'طماطم',
  'اجبان': 'جبن',
  'مياه': 'ماء',
};

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const lang = req.query.lang === 'en' ? 'en' : 'ar';
  const city = String(req.query.city || '');
  if (!q) return res.status(400).json({ error: 'q مطلوب' });

  const started = Date.now();
  const stores = db.prepare('SELECT * FROM stores WHERE enabled = 1').all();
  const errors = {};
  const getCache = db.prepare(
    'SELECT json, ts FROM cached WHERE store_key=? AND query=? AND lang=?',
  );
  const putCache = db.prepare(
    'INSERT OR REPLACE INTO cached (store_key, query, lang, json, ts) VALUES (?,?,?,?,?)',
  );
  const logScrape = db.prepare(
    'INSERT INTO scrape_logs (store_key, query, ok, count, ms, error) VALUES (?,?,?,?,?,?)',
  );

  async function gather(qx) {
    const perStore = await Promise.all(
      stores.map(async (store) => {
        const hit = getCache.get(store.key, qx, lang);
        if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return JSON.parse(hit.json);
        const t0 = Date.now();
        try {
          const products = await scrapeStore(store, qx, lang);
          putCache.run(store.key, qx, lang, JSON.stringify(products), Date.now());
          logScrape.run(store.key, qx, 1, products.length, Date.now() - t0, null);
          return products;
        } catch (err) {
          errors[store.key] = String(err.message || err);
          logScrape.run(store.key, qx, 0, 0, Date.now() - t0, errors[store.key]);
          return hit ? JSON.parse(hit.json) : []; // كاش قديم أفضل من لا شيء
        }
      }),
    );
    return perStore.flat().sort((a, b) => a.price - b.price);
  }

  let results = await gather(q);
  // نتائج قليلة وكلمة لها مرادف؟ ندمج نتائج المرادف أيضًا
  if (results.length < 5 && SYNONYMS[q]) {
    const extra = await gather(SYNONYMS[q]);
    const seen = new Set(results.map((p) => `${p.store_key}:${p.id}`));
    for (const p of extra) {
      if (!seen.has(`${p.store_key}:${p.id}`)) results.push(p);
    }
    results.sort((a, b) => a.price - b.price);
  }

  db.prepare('INSERT INTO search_logs (query, lang, city, results, ms) VALUES (?,?,?,?,?)').run(
    q, lang, city, results.length, Date.now() - started,
  );
  res.json({ query: q, lang, count: results.length, results, errors });
});

// أشهر المقارنات — من عمليات بحث زوار تطبيقك أنت.
// تُستبعد الكلمات التي لم تُرجع أي نتيجة (مثل الكلمات العشوائية «بببب»)
app.get('/api/popular', (req, res) => {
  const rows = db
    .prepare(
      `SELECT query, COUNT(*) n FROM search_logs
       WHERE ts > datetime('now','-30 days')
         AND results > 0
         AND length(query) >= 2
       GROUP BY query ORDER BY n DESC LIMIT 12`,
    )
    .all();
  res.json({ popular: rows.map((r) => ({ query: r.query, count: r.n })) });
});

function computeDeals() {
  const rows = db
    .prepare('SELECT json FROM cached WHERE ts > ?')
    .all(Date.now() - 24 * 60 * 60 * 1000);
  const seen = new Set();
  const deals = [];
  for (const row of rows) {
    for (const p of JSON.parse(row.json)) {
      const key = `${p.store_key ?? p.chain}:${p.id}`;
      if (p.original_price && p.original_price > p.price && p.in_stock && !seen.has(key)) {
        seen.add(key);
        deals.push(p);
      }
    }
  }
  deals.sort(
    (a, b) => (1 - a.price / a.original_price) < (1 - b.price / b.original_price) ? 1 : -1,
  );
  return deals;
}

// العروض — كل المنتجات المخفّضة من آخر نتائج مخزّنة.
// خوادم الاستضافة المجانية (مثل Render) تعيد الكاش لحالته الأولية بعد كل
// نوم/إعادة تشغيل، فإن كان الكاش فارغًا نجلب دفعة طازجة فورًا قبل الرد
// بدل انتظار الجدولة الدورية التي قد لا تُتاح لها فرصة العمل في الخلفية.
app.get('/api/deals', async (req, res) => {
  let deals = computeDeals();
  if (deals.length === 0) {
    await refreshAll('لا يوجد كاش — عند طلب صفحة العروض').catch(() => {});
    deals = computeDeals();
  }
  res.json({ count: deals.length, results: deals.slice(0, 100) });
});

app.post('/api/register-device', (req, res) => {
  const { token, platform } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token مطلوب' });
  db.prepare('INSERT OR REPLACE INTO devices (token, platform) VALUES (?,?)').run(
    String(token), String(platform || ''),
  );
  res.json({ ok: true });
});

// ---------- API الإدارة (لوحة التحكم) ----------

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'رمز الدخول غير صحيح' });
  }
  next();
}

app.get('/api/admin/stores', requireAdmin, (req, res) => {
  const stores = db.prepare('SELECT * FROM stores ORDER BY id').all();
  res.json({ stores });
});

app.post('/api/admin/stores', requireAdmin, (req, res) => {
  const { key, name_ar, name_en, color, enabled, config } = req.body || {};
  if (!key || !name_ar || !config) {
    return res.status(400).json({ error: 'key و name_ar و config مطلوبة' });
  }
  try {
    JSON.parse(typeof config === 'string' ? config : JSON.stringify(config));
  } catch {
    return res.status(400).json({ error: 'config ليس JSON صالحًا' });
  }
  const cfgText = typeof config === 'string' ? config : JSON.stringify(config, null, 2);
  db.prepare(
    `INSERT INTO stores (key, name_ar, name_en, color, enabled, config) VALUES (?,?,?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET name_ar=excluded.name_ar, name_en=excluded.name_en,
       color=excluded.color, enabled=excluded.enabled, config=excluded.config`,
  ).run(key, name_ar, name_en || key, color || '#888888', enabled === false ? 0 : 1, cfgText);
  db.prepare('DELETE FROM cached WHERE store_key=?').run(key);
  res.json({ ok: true });
});

app.post('/api/admin/stores/:key/toggle', requireAdmin, (req, res) => {
  db.prepare('UPDATE stores SET enabled = 1 - enabled WHERE key=?').run(req.params.key);
  res.json({ ok: true });
});

app.delete('/api/admin/stores/:key', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM stores WHERE key=?').run(req.params.key);
  db.prepare('DELETE FROM cached WHERE store_key=?').run(req.params.key);
  res.json({ ok: true });
});

// اختبار إعدادات متجر قبل حفظه: يرجع عيّنة من النتائج أو الخطأ
app.post('/api/admin/test', requireAdmin, async (req, res) => {
  const { config, q, name_ar, name_en, color } = req.body || {};
  try {
    const products = await scrapeStore(
      {
        key: '_test',
        name_ar: name_ar || 'اختبار',
        name_en: name_en || 'Test',
        color: color || '#888888',
        config: typeof config === 'string' ? config : JSON.stringify(config),
      },
      String(q || 'حليب'),
      'ar',
    );
    res.json({ ok: true, count: products.length, sample: products.slice(0, 5) });
  } catch (err) {
    res.json({ ok: false, error: String(err.message || err) });
  }
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const totalSearches = db.prepare('SELECT COUNT(*) n FROM search_logs').get().n;
  const todaySearches = db
    .prepare(`SELECT COUNT(*) n FROM search_logs WHERE ts > datetime('now','start of day')`)
    .get().n;
  const topQueries = db
    .prepare(
      `SELECT query, COUNT(*) n FROM search_logs GROUP BY query ORDER BY n DESC LIMIT 20`,
    )
    .all();
  const devices = db.prepare('SELECT COUNT(*) n FROM devices').get().n;
  const storeHealth = db
    .prepare(
      `SELECT store_key,
              SUM(ok) ok_count, COUNT(*) - SUM(ok) fail_count,
              CAST(AVG(ms) AS INT) avg_ms, MAX(ts) last_run
       FROM scrape_logs WHERE ts > datetime('now','-7 days')
       GROUP BY store_key`,
    )
    .all();
  const lastRefreshRow = db.prepare('SELECT value FROM settings WHERE key=?').get('last_refresh');
  res.json({
    totalSearches,
    todaySearches,
    topQueries,
    devices,
    storeHealth,
    lastRefresh: lastRefreshRow ? JSON.parse(lastRefreshRow.value) : null,
  });
});

// إشعار جماعي لكل الأجهزة المسجلة عبر Expo Push
app.post('/api/admin/notify', requireAdmin, async (req, res) => {
  const { title, body } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title و body مطلوبان' });
  const tokens = db.prepare('SELECT token FROM devices').all().map((r) => r.token);
  if (!tokens.length) return res.json({ ok: true, sent: 0 });

  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100).map((to) => ({ to, title, body, sound: 'default' }));
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (r.ok) sent += chunk.length;
  }
  res.json({ ok: true, sent });
});

// الكلمات المتتبعة (يجلبها التحديث التلقائي)
app.get('/api/admin/tracked', requireAdmin, (req, res) => {
  res.json({ queries: db.prepare('SELECT query FROM tracked_queries').all().map((r) => r.query) });
});

app.post('/api/admin/tracked', requireAdmin, (req, res) => {
  const queries = (req.body?.queries ?? [])
    .map((q) => String(q).trim())
    .filter((q) => q.length >= 2);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM tracked_queries').run();
    const ins = db.prepare('INSERT OR IGNORE INTO tracked_queries (query) VALUES (?)');
    for (const q of queries) ins.run(q);
  });
  tx();
  res.json({ ok: true, count: queries.length });
});

app.post('/api/admin/refresh', requireAdmin, async (req, res) => {
  await refreshAll('يدوي من اللوحة').catch(() => {});
  res.json({ ok: true, started: true });
});

// يجلب صفحة متجر ويجهّزها للمعاينة داخل اللوحة: يزيل السكربتات (لا نريد
// جافاسكربت الموقع الأصلي يعمل)، يضيف <base> لتصحيح روابط الصور/الأنماط،
// ويحقن أداة الاختيار بالنقر الخاصة بنا.
app.get('/api/admin/proxy-html', requireAdmin, async (req, res) => {
  const target = String(req.query.url || '');
  if (!/^https?:\/\//.test(target)) return res.status(400).json({ error: 'رابط غير صالح' });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        'Accept-Language': 'ar',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!upstream.ok) return res.status(502).json({ error: `HTTP ${upstream.status}` });
    let html = await upstream.text();

    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    $('script').remove();
    $('*').each((_, el) => {
      for (const attr of Object.keys(el.attribs || {})) {
        if (attr.toLowerCase().startsWith('on')) $(el).removeAttr(attr);
      }
    });
    if (!$('base').length) $('head').prepend(`<base href="${target}">`);
    $('body').append(`<script>${PICKER_SCRIPT}</script>`);

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send($.html());
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
});

// أداة الاختيار بالنقر: تُحقن داخل صفحة المتجر المعروضة في إطار معزول (iframe sandbox).
// عند تفعيل وضع اختيار (postMessage من اللوحة)، تلوّن العنصر تحت المؤشر، وعند
// النقر تحسب أقصر محدد CSS ممكن وترسله للوحة الأم عبر postMessage.
const PICKER_SCRIPT = `
(function () {
  var mode = null;      // 'item' أو اسم حقل مثل 'name','price','image','url','brand'
  var itemEl = null;    // عنصر بطاقة المنتج المختارة (لحصر بحث الحقول داخلها)
  var hoverBox = document.createElement('div');
  hoverBox.style.cssText = 'position:absolute;pointer-events:none;z-index:999999;border:2px solid #d92b2b;background:rgba(217,43,43,.12);display:none;box-sizing:border-box;';
  document.body.appendChild(hoverBox);

  function classSelector(el) {
    if (!el.className || typeof el.className !== 'string') return el.tagName.toLowerCase();
    var cls = el.className.trim().split(/\\s+/).filter(Boolean)[0];
    return cls ? el.tagName.toLowerCase() + '.' + CSS.escape(cls) : el.tagName.toLowerCase();
  }

  // يوجد أقرب سلف "يتكرر": له إخوة بنفس نمط class داخل نفس الأب (بطاقة منتج نمطية)
  function findRepeatingAncestor(el) {
    var node = el;
    for (var i = 0; i < 8 && node && node !== document.body; i++) {
      var parent = node.parentElement;
      if (parent) {
        var sel = classSelector(node);
        var siblings = parent.querySelectorAll(':scope > ' + sel);
        if (siblings.length >= 2) return node;
      }
      node = parent;
    }
    return el.parentElement || el;
  }

  function relativeSelector(root, el) {
    if (el === root) return ':scope';
    var parts = [];
    var node = el;
    while (node && node !== root && node !== document.body) {
      parts.unshift(classSelector(node));
      node = node.parentElement;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
  }

  document.addEventListener('mousemove', function (e) {
    if (!mode) { hoverBox.style.display = 'none'; return; }
    var r = e.target.getBoundingClientRect();
    hoverBox.style.display = 'block';
    hoverBox.style.left = (r.left + window.scrollX) + 'px';
    hoverBox.style.top = (r.top + window.scrollY) + 'px';
    hoverBox.style.width = r.width + 'px';
    hoverBox.style.height = r.height + 'px';
  }, true);

  document.addEventListener('click', function (e) {
    if (!mode) return;
    e.preventDefault();
    e.stopPropagation();

    if (mode === 'item') {
      itemEl = findRepeatingAncestor(e.target);
      var sel = classSelector(itemEl);
      var count = document.querySelectorAll(sel).length;
      parent.postMessage({ type: 'oroudi-pick', mode: 'item', selector: sel, count: count }, '*');
    } else if (itemEl) {
      var relSel = relativeSelector(itemEl, e.target);
      var attr = null;
      if (e.target.tagName === 'IMG') attr = 'src';
      else if (e.target.tagName === 'A') attr = 'href';
      parent.postMessage({
        type: 'oroudi-pick', mode: mode, selector: relSel, attr: attr,
        text: (e.target.innerText || '').trim().slice(0, 60),
      }, '*');
    }
    return false;
  }, true);

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'oroudi-set-mode') mode = e.data.mode;
  });
})();
`;

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ---------- التحديث التلقائي: ١٢ ليلًا و١٢ ظهرًا ----------
// يجلب الكلمات المتتبعة من كل المتاجر الفعّالة ويحدّث الكاش،
// فتبقى «العروض» والأسعار الشائعة محدثة حتى بلا زوار.

// عملية تحديث واحدة فقط تعمل في أي لحظة؛ أي طلب يصل أثناء تنفيذها
// (مثل عدة زوار يفتحون صفحة العروض معًا) ينتظر نفس العملية بدل تكرارها.
let refreshPromise = null;

function refreshAll(reason) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = runRefresh(reason).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

const REFRESH_CONCURRENCY = 6;

async function runRefresh(reason) {
  const started = Date.now();
  console.log(`⟳ بدء التحديث التلقائي (${reason})…`);
  const stores = db.prepare('SELECT * FROM stores WHERE enabled = 1').all();
  const queries = db.prepare('SELECT query FROM tracked_queries').all().map((r) => r.query);
  const putCache = db.prepare(
    'INSERT OR REPLACE INTO cached (store_key, query, lang, json, ts) VALUES (?,?,?,?,?)',
  );
  const logScrape = db.prepare(
    'INSERT INTO scrape_logs (store_key, query, ok, count, ms, error) VALUES (?,?,?,?,?,?)',
  );

  const tasks = [];
  for (const store of stores) for (const q of queries) tasks.push({ store, q });
  let ok = 0;
  let failed = 0;
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const { store, q } = tasks[next++];
      const t0 = Date.now();
      try {
        const products = await scrapeStore(store, q, 'ar');
        putCache.run(store.key, q, 'ar', JSON.stringify(products), Date.now());
        logScrape.run(store.key, q, 1, products.length, Date.now() - t0, null);
        ok += 1;
      } catch (err) {
        logScrape.run(store.key, q, 0, 0, Date.now() - t0, String(err.message || err));
        failed += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: REFRESH_CONCURRENCY }, worker));

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)').run(
    'last_refresh',
    JSON.stringify({ at: new Date().toISOString(), reason, ok, failed }),
  );
  console.log(`✓ اكتمل التحديث: ${ok} نجاح، ${failed} فشل، ${Math.round((Date.now() - started) / 1000)} ثانية`);
}

function msUntilNextNoonOrMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  if (now.getHours() < 12) next.setHours(12);
  else {
    next.setHours(0);
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function scheduleRefreshLoop() {
  setTimeout(async () => {
    await refreshAll('مجدول ١٢/١٢').catch(() => {});
    scheduleRefreshLoop();
  }, msUntilNextNoonOrMidnight());
}
scheduleRefreshLoop();

// عند الإقلاع: حدّث إن لم يجرِ تحديث خلال آخر ١٢ ساعة
{
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get('last_refresh');
  const last = row ? Date.parse(JSON.parse(row.value).at) : 0;
  if (Date.now() - last > 12 * 60 * 60 * 1000) {
    setTimeout(() => refreshAll('عند الإقلاع'), 3000);
  }
}

app.listen(PORT, () => {
  console.log(`عروضي server → http://localhost:${PORT}`);
  console.log(`لوحة التحكم → http://localhost:${PORT}/admin  (الرمز: ${ADMIN_TOKEN})`);
});
