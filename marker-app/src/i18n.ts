export type Lang = 'ar' | 'en';

const strings = {
  appName: { ar: 'عروضي', en: 'Oroudi' },
  tagline: {
    ar: 'بحث واحد يقارن لك أسعار البقالة في الأسواق السعودية — الأرخص أولاً',
    en: 'One search compares grocery prices across Saudi stores — cheapest first',
  },
  searchPlaceholder: { ar: 'ابحث… طماطم، حليب، رز، دجاج', en: 'Search… tomato, milk, rice, chicken' },
  popular: { ar: 'أشهر عمليات البحث', en: 'Popular searches' },
  popularComparisons: { ar: 'أشهر المقارنات', en: 'Popular comparisons' },
  yourCity: { ar: 'مدينتك:', en: 'Your city:' },
  tabSearch: { ar: 'بحث', en: 'Search' },
  tabDeals: { ar: 'العروض', en: 'Deals' },
  tabFavorites: { ar: 'المفضلة', en: 'Favorites' },
  cheapest: { ar: 'الأرخص', en: 'Cheapest' },
  priciest: { ar: 'الأغلى', en: 'Priciest' },
  biggestDiscount: { ar: 'أعلى خصم', en: 'Top discount' },
  allStores: { ar: 'كل المتاجر', en: 'All stores' },
  results: { ar: 'نتيجة', en: 'results' },
  noResults: {
    ar: 'لم نجد أي نتيجة لهذه الكلمة',
    en: 'We could not find any results for this word',
  },
  noResultsHint: {
    ar: 'تأكد من الإملاء أو جرّب كلمة أبسط مثل «حليب» أو «رز»',
    en: 'Check the spelling or try a simpler word like “milk” or “rice”',
  },
  error: { ar: 'تعذّر الاتصال، حاول مرة أخرى', en: 'Connection failed, try again' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry' },
  outOfStock: { ar: 'غير متوفر', en: 'Out of stock' },
  openInStore: { ar: 'افتح في المتجر ↗', en: 'Open in store ↗' },
  was: { ar: 'كان', en: 'was' },
  sar: { ar: 'ر.س', en: 'SAR' },
  dealsTitle: { ar: 'أفضل العروض اليوم', en: 'Best deals today' },
  dealsHint: {
    ar: 'اضغط على أي عرض ليفتح في موقع المتجر بتبويب جديد',
    en: 'Tap any deal to open it in the store in a new tab',
  },
  favoritesEmpty: {
    ar: 'اضغط ♡ على أي منتج لحفظه هنا',
    en: 'Tap ♡ on any product to save it here',
  },
  searchIdle: {
    ar: 'اكتب اسم منتج وسنقارن لك سعره في كل الأسواق',
    en: 'Type a product and we compare its price everywhere',
  },
  loading: { ar: 'جارٍ المقارنة…', en: 'Comparing…' },
};

export type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: Lang): string {
  return strings[key][lang];
}

export const POPULAR_QUERIES: Record<Lang, string[]> = {
  ar: ['طماطم', 'حليب', 'رز', 'دجاج', 'بيض', 'زيت', 'قهوة', 'ماء', 'سكر', 'خبز'],
  en: ['tomato', 'milk', 'rice', 'chicken', 'eggs', 'oil', 'coffee', 'water', 'sugar', 'bread'],
};
