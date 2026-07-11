// فلتر دقة النتائج — يعمل في التطبيق نفسه (client-side) حتى لا يعتمد على
// نشر الخادم. يمنع الأخطاء الفاضحة: بحث «سكر» يجب ألا يجلب «طحين» أو
// «سكريمرز» (حلوى). يطابق كلمات كاملة لا سلاسل فرعية، ويستبعد صيغ النفي.

const SYNONYMS: Record<string, string> = {
  رز: 'أرز',
  ارز: 'أرز',
  بندورة: 'طماطم',
  اجبان: 'جبن',
  مياه: 'ماء',
};

export function normalizeAr(text: string): string {
  return String(text || '')
    .replace(/[ً-ْٰ]/g, '') // التشكيل
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .toLowerCase()
    .trim();
}

const AR_PREFIXES = ['وال', 'بال', 'فال', 'كال', 'لل', 'ال', 'و', 'ب', 'ف', 'ك', 'ل'];

function wordMatches(w: string, nt: string): boolean {
  let s = w;
  for (const p of AR_PREFIXES) {
    if (s.startsWith(p) && s.length - p.length >= 2) {
      s = s.slice(p.length);
      break;
    }
  }
  if (s === nt) return true;
  if (s.startsWith(nt) && s.length - nt.length <= 2) return true;
  if (s.endsWith(nt) && s.length - nt.length === 1) return true;
  return false;
}

function isRelevant(nameAr: string, nameEn: string, terms: string[]): boolean {
  const words = normalizeAr(`${nameAr} ${nameEn}`).split(/\s+/).filter(Boolean);
  for (const t of terms) {
    const nt = normalizeAr(t);
    if (!nt) continue;
    const idx = words.findIndex((w) => wordMatches(w, nt));
    if (idx === -1) continue;
    const prev = words[idx - 1] || '';
    const prev2 = words[idx - 2] || '';
    if (/^(بدون|بلا|خالي|خال|منزوع|قليل|زيرو|دايت|لايت)$/.test(prev)) continue;
    if (/^(خالي|خال)$/.test(prev2) && prev === 'من') continue;
    return true;
  }
  return false;
}

export function filterRelevant<T extends { name_ar?: string; name?: string }>(
  items: T[],
  query: string,
): T[] {
  const terms = [query];
  const syn = SYNONYMS[normalizeAr(query)];
  if (syn) terms.push(syn);
  const out = items.filter((p) => isRelevant(p.name_ar || '', p.name || '', terms));
  // إن أزال الفلتر كل شيء (كلمة غير متوقعة)، نعيد الأصل بدل شاشة فارغة مضلّلة
  return out.length > 0 ? out : items;
}
