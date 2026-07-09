// محرك السكرابر العام: يقرأ أي متجر عبر إعدادات (config) تُدخل من لوحة التحكم
// — بدون كتابة كود لكل متجر. يدعم نمطين:
//
// ═══ النمط الأول: JSON (متجر يوفر بحثًا يرجع JSON) ═══
// {
//   "search_url": "https://store.com/api/search?q={q}",   // {q} الكلمة، {lang} اللغة
//   "headers": { "Accept-Language": "{lang}" },            // اختياري
//   "results_path": "data.products",                       // مسار مصفوفة النتائج
//   "fields": {                                            // مسارات الحقول داخل كل نتيجة
//     "id": "id", "name": "title", "name_ar": "title_ar",
//     "brand": "brand.name", "image": "images.0", "url": "slug",
//     "unit": "size", "price": "price", "original_price": "old_price",
//     "discount_amount": "discount",                       // يُطرح من السعر إن وجد
//     "stock": "qty",                                      // رقم: متوفر إذا > 0
//     "in_stock": "available",                             // منطقي مباشر
//     "chain": "chain"                                     // لمصادر متعددة المتاجر
//   },
//   "url_prefix": "https://store.com/product/",            // يُسبق لقيمة url النسبية
//   "image_prefix": "",
//   "price_divisor": 1,                                    // 100 إذا كان السعر بالهللات
//   "exclude_chains": ["Tamimi"]
// }
//
// ═══ النمط الثاني: HTML (موقع بلا JSON — نقرأ صفحته مباشرة) ═══
// {
//   "type": "html",
//   "search_url": "https://store.com/search?q={q}",        // أو صفحة العروض مباشرة
//   "item_selector": ".product-card",                      // محدد CSS لكل منتج
//   "fields": {                                            // محددات CSS داخل المنتج
//     "name":  { "sel": ".title" },
//     "price": { "sel": ".price" },                        // «12.95 ر.س» تُقرأ رقمًا تلقائيًا
//     "original_price": { "sel": ".old-price" },
//     "image": { "sel": "img", "attr": "src" },
//     "url":   { "sel": "a", "attr": "href" },
//     "brand": { "sel": ".brand" },
//     "out_of_stock": { "sel": ".sold-out" }               // إن وُجد العنصر → غير متوفر
//   },
//   "url_prefix": "https://store.com"
// }
// كل حقل يقبل أيضًا "regex" لالتقاط جزء من النص، و"attr" لقراءة خاصية بدل النص.
//
// ═══ النمط الثالث: browser (مواقع خلف حماية بوت متقدمة مثل Akamai/Cloudflare) ═══
// يستخدم Google Chrome الحقيقي المثبت على الجهاز (وليس Chromium المدمج) —
// بصمته أصعب على أدوات الحماية اكتشافها. أبطأ من الأنماط الأخرى، فاستخدمه
// فقط للمواقع التي تفشل معها JSON وHTML العاديين.
// {
//   "type": "browser",
//   "search_url": "https://store.com/search?q={q}",
//   "extract": "next_data",                 // أو "html" (افتراضي)
//   // extract=next_data: يقرأ JSON المدمج في <script id="__NEXT_DATA__">
//   "results_path": "props.pageProps.productSearchResult.items",
//   "fields": { "id": "id", "name": "name", "price": "price", ... },
//   // extract=html: نفس حقول نمط HTML أعلاه (item_selector + fields.sel/attr)
// }

let cheerio = null;

function getPath(obj, path) {
  if (!path) return undefined;
  let cur = obj;
  for (const part of String(path).split('.')) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function extractHtml(item, spec) {
  if (spec == null) return undefined;
  if (typeof spec === 'string') spec = { sel: spec };
  const el = spec.sel ? item.find(spec.sel).first() : item;
  if (!el.length) return undefined;
  let value = spec.attr ? el.attr(spec.attr) : el.text();
  if (value == null) return undefined;
  value = String(value).trim();
  if (spec.regex) {
    const m = value.match(new RegExp(spec.regex));
    value = m ? (m[1] ?? m[0]) : undefined;
  }
  return value;
}

// يقرأ الأرقام حتى داخل نص مثل «كان 12.95 ر.س» ويحوّل الأرقام العربية
function toNumber(value) {
  if (value == null) return NaN;
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const western = String(value).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const m = western.match(/\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : NaN;
}

function substitute(template, q, lang) {
  return String(template)
    .replace(/\{q\}/g, encodeURIComponent(q))
    .replace(/\{lang\}/g, lang);
}

function absolutize(value, prefix) {
  if (!value) return '';
  const s = String(value);
  if (/^https?:\/\//.test(s)) return s;
  return (prefix || '') + s;
}

// متصفح Chrome حقيقي واحد يُعاد استخدامه لكل طلبات نمط "browser" — إطلاق
// متصفح جديد كل مرة يبطئ ويستهلك ذاكرة أكبر بكثير على الاستضافة المجانية.
let sharedBrowser = null;

async function getSharedBrowser() {
  if (sharedBrowser) return sharedBrowser;
  const { chromium } = require('playwright');
  sharedBrowser = await chromium.launch({
    channel: 'chrome',
    args: ['--disable-dev-shm-usage'],
  });
  return sharedBrowser;
}

async function scrapeViaBrowser(cfg, q, lang, timeoutMs) {
  const browser = await getSharedBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  });
  const page = await context.newPage();
  try {
    const url = substitute(cfg.search_url, q, lang);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(cfg.wait_ms || 4000);

    // بعض المواقع تحمّل الصور بتحميل كسول (lazy) فقط عند التمرير — نمرر
    // للأسفل تدريجيًا حتى تُحمَّل كل بطاقات النتائج قبل قراءة الصفحة.
    if (cfg.scroll) {
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await page.waitForTimeout(400);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }

    if (cfg.extract === 'next_data') {
      const raw = await page.evaluate(() => {
        const s = document.getElementById('__NEXT_DATA__');
        return s ? s.textContent : null;
      });
      if (!raw) throw new Error('لم يُعثر على __NEXT_DATA__ في الصفحة');
      const json = JSON.parse(raw);
      let arr = getPath(json, cfg.results_path);
      if (arr == null) arr = [];
      if (!Array.isArray(arr)) throw new Error(`results_path "${cfg.results_path}" لم يُرجع مصفوفة`);
      return { rows: arr, get: getPath };
    }

    const html = await page.content();
    if (!cheerio) cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const selector = cfg.item_selector;
    if (!selector) throw new Error('item_selector مطلوب في نمط browser (extract=html)');
    const rows = $(selector).toArray().map((el) => $(el));
    return { rows, get: extractHtml };
  } finally {
    await context.close();
  }
}

async function scrapeStore(store, q, lang, timeoutMs = 15000) {
  const cfg = typeof store.config === 'string' ? JSON.parse(store.config) : store.config;

  if (cfg.type === 'browser') {
    const { rows, get } = await scrapeViaBrowser(cfg, q, lang, Math.max(timeoutMs, 25000));
    return buildProducts(rows, get, store, cfg);
  }

  const url = substitute(cfg.search_url, q, lang);
  const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' };
  for (const [k, v] of Object.entries(cfg.headers || {})) {
    headers[k] = substitute(v, q, lang);
  }

  const method = (cfg.method || 'GET').toUpperCase();
  const fetchOpts = { method, headers, signal: undefined };
  if (method !== 'GET' && cfg.body != null) {
    fetchOpts.headers = { 'Content-Type': 'application/json', ...headers };
    fetchOpts.body = substitute(
      typeof cfg.body === 'string' ? cfg.body : JSON.stringify(cfg.body),
      q,
      lang,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let rows, get;
  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (cfg.type === 'html') {
      const html = await res.text();
      if (!cheerio) cheerio = require('cheerio');
      const $ = cheerio.load(html);
      const selector = cfg.item_selector || cfg.results_path;
      if (!selector) throw new Error('item_selector مطلوب في نمط html');
      rows = $(selector).toArray().map((el) => $(el));
      get = extractHtml;
    } else {
      const json = await res.json();
      let arr = getPath(json, cfg.results_path);
      // بعض المتاجر ترجع null بدل مصفوفة فارغة عند غياب النتائج — ليست خطأ
      if (arr == null) arr = [];
      if (!Array.isArray(arr)) {
        throw new Error(`results_path "${cfg.results_path}" لم يُرجع مصفوفة`);
      }
      rows = arr;
      get = getPath;
    }
  } finally {
    clearTimeout(timer);
  }

  return buildProducts(rows, get, store, cfg);
}

function buildProducts(rows, get, store, cfg) {
  const f = cfg.fields || {};
  const divisor = Number(cfg.price_divisor) || 1;
  const products = [];
  for (const row of rows) {
    let price = toNumber(get(row, f.price));
    if (!Number.isFinite(price)) continue;
    price /= divisor;

    let original = toNumber(get(row, f.original_price));
    original = Number.isFinite(original) ? original / divisor : null;

    const discount = toNumber(get(row, f.discount_amount));
    if (Number.isFinite(discount) && discount > 0) {
      original = original ?? price;
      price = price - discount / divisor;
    }
    if (original != null && original <= price) original = null;

    let inStock = true;
    if (f.stock != null) inStock = toNumber(get(row, f.stock)) > 0;
    else if (f.in_stock != null) inStock = Boolean(get(row, f.in_stock));
    else if (f.out_of_stock != null) inStock = get(row, f.out_of_stock) == null;

    const name = String(get(row, f.name) ?? '').trim();
    if (!name) continue;

    const chainValue = String(get(row, f.chain) ?? store.name_en);
    if (
      Array.isArray(cfg.exclude_chains) &&
      cfg.exclude_chains.some((c) => c.toLowerCase() === chainValue.toLowerCase())
    ) {
      continue;
    }

    const productUrl = absolutize(get(row, f.url), cfg.url_prefix);
    products.push({
      chain: chainValue,
      chain_ar: f.chain ? undefined : store.name_ar,
      chain_color: f.chain ? undefined : store.color,
      store_key: store.key,
      name,
      name_ar: String(get(row, f.name_ar) ?? name).trim(),
      brand: String(get(row, f.brand) ?? '').trim(),
      price: Math.round(price * 100) / 100,
      original_price: original,
      unit: String(get(row, f.unit) ?? '').trim(),
      image: absolutize(get(row, f.image), cfg.image_prefix),
      in_stock: inStock,
      url: productUrl,
      // البطاقة تفتح في موقع المتجر فقط إذا كان الرابط مطلقًا
      link: /^https?:\/\//.test(productUrl) ? productUrl : undefined,
      id: String(get(row, f.id) ?? name),
    });
  }
  return products;
}

module.exports = { scrapeStore };
