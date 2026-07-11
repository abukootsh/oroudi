// بذور عروضي المشتركة — مصدر واحد للحقيقة لكل من:
//   • db.js        (يزرعها في SQLite عند الإقلاع، شبكة أمان بعد مسح القرص)
//   • scrape-hard-stores.js (يعيد إنشاء متاجر المتصفح في الخادم الحي قبل
//     الكشط — «تعافٍ ذاتي»: إن مسحت استضافة Render المجانية القرص وأعادت
//     البذر من كودٍ قديم بلا لولو/نينجا، يعيدها السكرابر خلال ساعات تلقائيًا).

// كلمات يجلبها التحديث التلقائي مرتين يوميًا (سلع أساسية)
const TRACKED_QUERIES = [
  'حليب', 'أرز', 'دجاج', 'زيت', 'سكر', 'ماء', 'قهوة',
  'شاي', 'جبن', 'بيض', 'خبز', 'عصير', 'طماطم', 'مكرونة',
];

// المتاجر التسعة. config يوصف طريقة قراءة الأسعار (JSON / HTML / متصفح).
const STORES = [
  // ١) التميمي — API عام حقيقي يعمل مباشرة (العربية عبر ترويسة Accept-Language)
  {
    key: 'tamimi', name_ar: 'التميمي', name_en: 'Tamimi', color: '#c8102e', enabled: 1,
    config: {
      search_url: 'https://shop.tamimimarkets.com/api/product?q={q}&limit=100',
      headers: { 'Accept-Language': '{lang}', 'User-Agent': 'Mozilla/5.0' },
      results_path: 'data.product',
      fields: {
        // الصورة تحت variants[0].images[0] لا في images العلوي (يكون null غالبًا)
        id: 'id', name: 'name', brand: 'brand.name', image: 'variants.0.images.0', url: 'slug',
        unit: 'variants.0.name', price: 'variants.0.storeSpecificData.0.mrp',
        discount_amount: 'variants.0.storeSpecificData.0.discount',
        stock: 'variants.0.storeSpecificData.0.stock',
      },
      url_prefix: 'https://shop.tamimimarkets.com/product/',
    },
  },
  // ٢) الدانوب — منصة Spree + بحث Algolia (مفتاح بحث عام آمن، مكتشف من كود الموقع)
  {
    key: 'danube', name_ar: 'الدانوب', name_en: 'Danube', color: '#0057a8', enabled: 1,
    config: {
      search_url:
        'https://1D2IEWLQAD-dsn.algolia.net/1/indexes/spree_products/query?x-algolia-application-id=1D2IEWLQAD&x-algolia-api-key=87ca3b6b2ce56f0bb76fc194a8d170e2',
      method: 'POST', body: '{"params":"query={q}&hitsPerPage=60"}', results_path: 'hits',
      fields: {
        id: 'master_id', name: 'full_name_en', name_ar: 'full_name_ar', image: 'image',
        url: 'url_ar', price: 'price', original_price: 'original_price',
      },
      url_prefix: 'https://www.danube.sa',
    },
  },
  // ٣) بن داود — نفس منصة الدانوب (Spree + Algolia)
  {
    key: 'bindawood', name_ar: 'بن داود', name_en: 'BinDawood', color: '#c8a13a', enabled: 1,
    config: {
      search_url:
        'https://KBGHG5MR5E-dsn.algolia.net/1/indexes/spree_products/query?x-algolia-application-id=KBGHG5MR5E&x-algolia-api-key=8c6b85b7bdebb06d260ccde6b810884b',
      method: 'POST', body: '{"params":"query={q}&hitsPerPage=60"}', results_path: 'hits',
      fields: {
        id: 'master_id', name: 'full_name_en', name_ar: 'full_name_ar', image: 'image',
        url: 'url_ar', price: 'price', original_price: 'original_price',
      },
      url_prefix: 'https://www.bindawood.sa',
    },
  },
  // ٤) بنده — بوابة API داخلية موحّدة (interactions gateway)، غير محمية.
  {
    key: 'panda', name_ar: 'بنده', name_en: 'Panda', color: '#00a0a8', enabled: 1,
    config: {
      search_url: 'https://panda.sa/api/interactions', method: 'POST',
      headers: {
        method: 'GET', path: '/products?search_key={q}&page=1', 'x-language': '{lang}',
        'x-panda-source': 'PandaClick', 'api-version': '2026-01-01', 'x-pandaclick-agent': '4',
        'x-session-id': '051E210C-08B8-40C0-BCD9-E86B91A8BF90', version: 'v3',
      },
      body: '{}', results_path: 'data.products',
      fields: {
        id: 'id', name: 'name', brand: 'brand.name', image: 'varieties.0.imageURL',
        price: 'varieties.0.price', original_price: 'varieties.0.undiscounted_price',
        unit: 'varieties.0.unit', stock: 'varieties.0.availability', url: 'varieties.0.id',
      },
      url_prefix: 'https://panda.sa/ar/p/',
    },
  },
  // ٥) هنقرستيشن ماركت — خلف Cloudflare، لكن Chrome حقيقي (نمط browser) يجتازه.
  {
    key: 'hungerstation', name_ar: 'هنقرستيشن', name_en: 'Hungerstation', color: '#f47b20', enabled: 1,
    config: {
      type: 'browser',
      search_url:
        'https://hungerstation.com/sa-ar/qc/14013/hmarket/branch/a67ba893-443c-41b6-ba70-fc35a9b2f9f3~54608?query={q}',
      extract: 'next_data', results_path: 'props.pageProps.productSearchResult.items',
      fields: {
        id: 'id', name: 'name', image: 'images.0.url', price: 'price',
        original_price: 'originalPrice', url: 'sku',
      },
      url_prefix:
        'https://hungerstation.com/sa-ar/qc/14013/hmarket/branch/a67ba893-443c-41b6-ba70-fc35a9b2f9f3~54608/product/x/',
    },
  },
  // ٦) كارفور — خلف Akamai، لكن Chrome حقيقي يجتازه. البيانات في HTML الصفحة.
  {
    key: 'carrefour', name_ar: 'كارفور', name_en: 'Carrefour', color: '#004e9f', enabled: 1,
    config: {
      type: 'browser', search_url: 'https://www.carrefourksa.com/mafsau/ar/search?keyword={q}',
      extract: 'html', item_selector: 'div[style*="grid-column"]',
      fields: {
        name: { sel: '.line-clamp-2' },
        price: { sel: '.flex.flex-wrap.gap-2xs > div:first-child' },
        original_price: { sel: '.line-through' },
        image: { sel: 'img', attr: 'src' },
        url: { sel: 'a[href*="/p/"]', attr: 'href' },
      },
      url_prefix: 'https://www.carrefourksa.com',
    },
  },
  // ٧) نون — نمط browser للاتساق. الصورة من مسار /p/ لتفادي placeholder والكاروسيل.
  {
    key: 'noon', name_ar: 'نون', name_en: 'Noon', color: '#e8b007', enabled: 1,
    config: {
      type: 'browser', search_url: 'https://www.noon.com/saudi-ar/search/?q={q}',
      extract: 'html', item_selector: 'a[href*="/p/"]',
      fields: {
        name: { sel: '[class*="_title_"]' },
        price: { sel: '[class*="_sellingPrice_"]' },
        // السعر قبل الخصم (المشطوب) لإظهار عروض نون في صفحة العروض
        original_price: { sel: '[class*="_oldPrice_"]' },
        image: { sel: 'img[src*="nooncdn.com/p/"]', attr: 'src' },
        url: { attr: 'href' },
      },
      url_prefix: 'https://www.noon.com',
    },
  },
  // ٨) لولو — خلف Cloudflare يكتشف المتصفح الآلي؛ نمط «متخفٍّ» (stealth) يتجاوزه
  //    بلا بروكسي. استخراج مخصص لبنية Akinon (أصناف CSS عشوائية).
  {
    key: 'lulu', name_ar: 'لولو', name_en: 'Lulu', color: '#2e9e49', enabled: 1,
    config: {
      type: 'browser', stealth: true, warmup_url: 'https://gcc.luluhypermarket.com/ar-sa',
      search_url: 'https://gcc.luluhypermarket.com/ar-sa/list/?search_text={q}',
      wait_until: 'networkidle', scroll: true, extract: 'lulu',
      fields: { name: 'name', price: 'price', image: 'image', url: 'url' },
      url_prefix: 'https://gcc.luluhypermarket.com',
    },
  },
  // ٩) نينجا — صفحة البحث تُصيَّر بالكامل في HTML بلا تسجيل دخول ولا عنوان.
  //    خلف حماية بوت، فنستخدم النمط المتخفّي ونقرأ بمحددات CSS (بطاقة داخل <a>).
  {
    key: 'ninja', name_ar: 'نينجا', name_en: 'Ninja', color: '#5b2d90', enabled: 1,
    config: {
      type: 'browser', stealth: true,
      search_url: 'https://ananinja.com/sa/{lang}/product/search?q={q}',
      wait_until: 'domcontentloaded', wait_ms: 6000, extract: 'html',
      item_selector: 'a[href*="/product/"]:not([href*="search"])',
      fields: {
        name: { sel: 'h3' },
        // السعر الحالي: أول p.font-medium (الأحمر عند الخصم، الرمادي بلا خصم)
        price: { sel: 'p.font-medium' },
        // السعر قبل الخصم (المشطوب) لإظهار عروض نينجا في صفحة العروض
        original_price: { sel: 'p.line-through' },
        image: { sel: 'img', attr: 'src' },
        url: { attr: 'href' },
      },
      url_prefix: 'https://ananinja.com',
    },
  },
];

module.exports = { TRACKED_QUERIES, STORES };
