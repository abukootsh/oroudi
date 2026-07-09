import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Lang } from './i18n';

export interface Product {
  chain: string;
  name: string;
  name_ar: string;
  price: number;
  original_price: number | null;
  unit: string;
  image: string;
  in_stock: boolean;
  url: string;
  id: string;
  brand: string;
  // من خادم عروضي: رابط مباشر لصفحة المنتج في موقع المتجر (إن توفر)
  link?: string;
  chain_ar?: string;
  chain_color?: string;
  store_key?: string;
}

export interface City {
  id: string;
  ar: string;
  en: string;
}

export interface PopularItem {
  query: string;
  count: number;
}

// عنوان خادم عروضي المنشور على Render
const PROD_SERVER = 'https://oroudi-server.onrender.com';

// أثناء التطوير: نشتق عنوان جهازك تلقائيًا من Expo حتى يصل الجوال
// للخادم على نفس الشبكة، والويب يستخدم localhost مباشرة.
function resolveServer(): string {
  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host) return `http://${host}:4000`;
    if (Platform.OS === 'web') return 'http://localhost:4000';
  }
  return PROD_SERVER;
}

export const SERVER = resolveServer();

export function productKey(p: Product): string {
  return `${p.store_key ?? p.chain}:${p.id}`;
}

export function discountPercent(p: Product): number {
  if (p.original_price == null || p.original_price <= p.price) return 0;
  return Math.round((1 - p.price / p.original_price) * 100);
}

// خوادم الاستضافة المجانية (مثل Render) تنام بعد فترة خمول وتحتاج حتى
// دقيقة لتستيقظ. نرسل نبضة تنشيط عند فتح التطبيق حتى يكون الخادم صاحيًا
// غالبًا وقت أول بحث فعلي من المستخدم.
export function warmUpServer(): void {
  fetch(`${SERVER}/api/cities`).catch(() => {});
}

export async function searchProducts(
  query: string,
  lang: Lang,
  city: string,
): Promise<Product[]> {
  const res = await fetch(
    `${SERVER}/api/search?q=${encodeURIComponent(query)}&lang=${lang}&city=${encodeURIComponent(city)}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.results ?? []) as Product[];
}

export async function fetchCities(): Promise<{ cities: City[]; selected: string }> {
  const res = await fetch(`${SERVER}/api/cities`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return { cities: json.cities ?? [], selected: json.selected ?? 'riyadh' };
}

// أشهر المقارنات — من عمليات بحث زوار تطبيقك (يجمعها خادمك)
export async function fetchPopular(): Promise<PopularItem[]> {
  const res = await fetch(`${SERVER}/api/popular`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.popular ?? []) as PopularItem[];
}

export async function fetchDeals(_lang: Lang): Promise<Product[]> {
  const res = await fetch(`${SERVER}/api/deals`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.results ?? []) as Product[];
}

export async function registerDevice(token: string): Promise<void> {
  await fetch(`${SERVER}/api/register-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: Platform.OS }),
  });
}
