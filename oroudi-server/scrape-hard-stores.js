// سكرابر خارجي يعمل على GitHub Actions (بيئة كاملة الصلاحيات تدعم Chrome
// حقيقي بعكس استضافة الخادم المجانية). يجلب متاجر نمط "browser" من لوحة
// التحكم، يكشط كل كلمة متتبعة، ويغذّي كاش الخادم الحي عبر push-cache.
const { scrapeStore } = require('./scraper');
const { STORES } = require('./seed-data');

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
  // تعافٍ ذاتي: نضمن وجود متاجر المتصفح في الخادم الحي قبل الكشط. إن مسحت
  // Render القرص وأعادت البذر من كودٍ قديم بلا لولو/نينجا، يعيدها هذا التشغيل
  // (كل ١٢ ساعة) تلقائيًا — فلا يعتمد بقاؤها على نشر Render اليدوي. نضيف الناقص
  // فقط حتى لا نطمس أي تعديل يدوي أجراه المستخدم على متجر موجود من اللوحة.
  {
    const existing = new Set((await api('/api/admin/stores')).stores.map((s) => s.key));
    for (const s of STORES.filter((x) => x.config.type === 'browser' && !existing.has(x.key))) {
      try {
        await api('/api/admin/stores', {
          method: 'POST',
          body: JSON.stringify({
            key: s.key, name_ar: s.name_ar, name_en: s.name_en,
            color: s.color, enabled: true, config: s.config,
          }),
        });
        console.log(`↻ أُعيد إنشاء متجر ناقص: ${s.key}`);
      } catch (err) {
        console.log(`تحذير: تعذّر ضمان متجر ${s.key}: ${err.message}`);
      }
    }
  }

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

  // لقطة دائمة: نجمع كل النتائج ونكتبها في browser-cache.json المُلتزَم في
  // المستودع. الخادم يجلبها من GitHub raw عند الإقلاع فيتعافى من مسح قرص
  // Render فورًا (بلا انتظار الكشط التالي). نبقي push-cache أيضًا للفورية.
  const snapshot = {};
  let ok = 0;
  let failed = 0;
  for (const store of browserStores) {
    for (const q of queries) {
      const t0 = Date.now();
      try {
        // نتائج المتجر مرتّبة بالصلة (الأنسب أولًا)؛ نكتفي بأول ٨٠ لكل كلمة كي
        // تبقى اللقطة وحمولة التطبيق خفيفة (نينجا يرجع حتى ٤٠٠ لكلمة واحدة).
        const products = (await scrapeStore(store, q, 'ar', 30000)).slice(0, 80);
        await api('/api/admin/push-cache', {
          method: 'POST',
          body: JSON.stringify({ store_key: store.key, query: q, lang: 'ar', products }),
        });
        (snapshot[store.key] ||= {})[q] = products;
        console.log(`✓ ${store.key} / ${q}: ${products.length} منتج (${Date.now() - t0}ms)`);
        ok += 1;
      } catch (err) {
        // نُبقي أي نتيجة سابقة لهذه الكلمة في اللقطة إن وُجدت (لا نفرّغها بالفشل)
        console.log(`✗ ${store.key} / ${q}: ${err.message}`);
        failed += 1;
      }
    }
  }

  // نكتب اللقطة فقط إن نجح جزء معقول (نتفادى الكتابة بلقطة شبه فارغة تُفسد
  // بيانات جيدة سابقة إن فشلت الجولة كلها لعارض شبكي مؤقت).
  const fs = require('fs');
  const path = require('path');
  const outPath = path.join(__dirname, 'browser-cache.json');
  if (ok > 0) {
    fs.writeFileSync(outPath, JSON.stringify(snapshot));
    console.log(`💾 كُتبت اللقطة: ${outPath} (${Object.keys(snapshot).length} متجر)`);
  } else {
    console.log('لم تُكتب اللقطة (لا نجاحات) — أُبقيت اللقطة السابقة كما هي');
  }

  console.log(`\nاكتمل: ${ok} نجاح، ${failed} فشل`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('خطأ عام:', err);
    process.exit(1);
  });
