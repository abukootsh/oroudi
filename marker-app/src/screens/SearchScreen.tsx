import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  discountPercent,
  fetchPopular,
  PopularItem,
  Product,
  productKey,
  searchProducts,
} from '../api';
import Chip from '../components/Chip';
import PopularPills from '../components/PopularPills';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import { Lang, POPULAR_QUERIES, t } from '../i18n';
import { chainInfo, colors, fonts, radius, shadow, space } from '../theme';

type SortMode = 'cheap' | 'expensive' | 'discount';

export default function SearchScreen({ lang }: { lang: Lang }) {
  const rtl = lang === 'ar';
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortMode>('cheap');
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const lastQuery = useRef('');

  useEffect(() => {
    fetchPopular().then(setPopular).catch(() => {});
  }, []);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      lastQuery.current = trimmed;
      setQuery(trimmed);
      setLoading(true);
      setError(false);
      setSelectedChains(new Set());
      try {
        setProducts(await searchProducts(trimmed, lang, "riyadh"));
      } catch {
        setError(true);
        setProducts(null);
      } finally {
        setLoading(false);
      }
    },
    [lang],
  );

  const chainChips = useMemo(() => {
    const chips: { key: string; ar: string; en: string; color: string; count: number }[] = [];
    for (const p of products ?? []) {
      const k = p.chain.toLowerCase();
      const existing = chips.find((c) => c.key === k);
      if (existing) {
        existing.count += 1;
        continue;
      }
      const info = chainInfo(p.chain);
      const known = info.ar !== p.chain;
      chips.push({
        key: k,
        ar: known ? info.ar : p.chain_ar ?? p.chain,
        en: known ? info.en : p.chain,
        color: p.chain_color ?? info.color,
        count: 1,
      });
    }
    return chips.sort((a, b) => b.count - a.count);
  }, [products]);

  const visible = useMemo(() => {
    if (!products) return [];
    const list = products.filter(
      (p) => selectedChains.size === 0 || selectedChains.has(p.chain.toLowerCase()),
    );
    if (sort === 'cheap') list.sort((a, b) => a.price - b.price);
    else if (sort === 'expensive') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => discountPercent(b) - discountPercent(a));
    return list;
  }, [products, selectedChains, sort]);

  // مفتاح البطاقة ذات أقل سعر بين المتوفر — تبرز بشارة «الأرخص»
  const cheapestKey = useMemo(() => {
    const pool = visible.filter((p) => p.in_stock);
    if (!pool.length) return null;
    let best = pool[0];
    for (const p of pool) if (p.price < best.price) best = p;
    return productKey(best);
  }, [visible]);

  const toggleChain = (key: string) => {
    setSelectedChains((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sortModes: { key: SortMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'cheap', icon: 'trending-down', label: t('cheapest', lang) },
    { key: 'expensive', icon: 'trending-up', label: t('priciest', lang) },
    { key: 'discount', icon: 'pricetag', label: t('biggestDiscount', lang) },
  ];

  return (
    <View style={styles.container}>
      {/* صندوق البحث */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.inkFaint} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('searchPlaceholder', lang)}
          placeholderTextColor={colors.inkFaint}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(query)}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable style={styles.searchButton} onPress={() => runSearch(query)}>
          <Ionicons name="search" size={18} color={colors.white} />
        </Pressable>
      </View>

      {/* حالة الخمول */}
      {products === null && !loading && !error && (
        <ScrollView contentContainerStyle={styles.idleWrap}>
          <View style={styles.idleIconCircle}>
            <Ionicons name="pricetags-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.idleText}>{t('searchIdle', lang)}</Text>
          <Text style={styles.popularTitle}>{t('popular', lang)}</Text>
          <View style={styles.popularChips}>
            {POPULAR_QUERIES[lang].map((q) => (
              <Chip key={q} label={q} onPress={() => runSearch(q)} />
            ))}
          </View>
          <PopularPills items={popular} lang={lang} onSelect={runSearch} />
        </ScrollView>
      )}

      {loading && (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      )}

      {error && !loading && (
        <View style={styles.centerWrap}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.inkFaint} />
          <Text style={styles.centerText}>{t('error', lang)}</Text>
          <Pressable style={styles.retryButton} onPress={() => runSearch(query)}>
            <Text style={styles.retryText}>{t('retry', lang)}</Text>
          </Pressable>
        </View>
      )}

      {products !== null && !loading && !error && (
        <>
          {/* عدّاد النتائج */}
          <View style={[styles.resultBar, { flexDirection: 'row' }]}>
            <Text style={styles.resultCount}>
              <Text style={styles.resultNum}>{visible.length}</Text> {t('results', lang)}
            </Text>
            <Text style={styles.resultStores}>
              {chainChips.length} {t('stores', lang)}
            </Text>
          </View>

          {/* شرائح المتاجر */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            <Chip
              label={`${t('allStores', lang)} · ${products.length}`}
              active={selectedChains.size === 0}
              onPress={() => setSelectedChains(new Set())}
            />
            {chainChips.map((c) => (
              <Chip
                key={c.key}
                label={`${rtl ? c.ar : c.en} ${c.count}`}
                active={selectedChains.has(c.key)}
                color={c.color}
                dot={c.color}
                onPress={() => toggleChain(c.key)}
              />
            ))}
          </ScrollView>

          {/* الترتيب */}
          <View style={[styles.sortRow, { flexDirection: 'row' }]}>
            {sortModes.map((m) => {
              const on = sort === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setSort(m.key)}
                  style={[
                    styles.sortButton,
                    { flexDirection: 'row' },
                    on && styles.sortButtonActive,
                  ]}
                >
                  <Ionicons name={m.icon} size={13} color={on ? colors.white : colors.inkSoft} />
                  <Text style={[styles.sortText, on && styles.sortTextActive]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            style={styles.listFlex}
            data={visible}
            keyExtractor={productKey}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                lang={lang}
                cheapest={productKey(item) === cheapestKey}
              />
            )}
            contentContainerStyle={styles.list}
            initialNumToRender={10}
            windowSize={7}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={40} color={colors.inkFaint} />
                <Text style={styles.emptyTitle}>{t('noResults', lang)}</Text>
                <Text style={styles.centerText}>{t('noResultsHint', lang)}</Text>
              </View>
            }
            ListFooterComponent={
              <PopularPills items={popular} lang={lang} onSelect={runSearch} />
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    marginHorizontal: space.lg,
    marginBottom: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    paddingHorizontal: 6,
    ...shadow.card,
  },
  searchIcon: { marginHorizontal: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.ink,
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
  },
  cityLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityLabel: { fontSize: 13, color: colors.inkSoft, fontFamily: fonts.semibold },
  idleWrap: { alignItems: 'center', paddingTop: space.xl, paddingHorizontal: space.xl, paddingBottom: space.xxl },
  idleIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  idleText: {
    fontSize: 14,
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: space.xl,
    lineHeight: 22,
  },
  popularTitle: { fontSize: 13, color: colors.ink, fontFamily: fonts.semibold, marginBottom: space.md },
  popularChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  skeletonWrap: { flex: 1, paddingTop: space.sm },
  centerWrap: { alignItems: 'center', paddingTop: 48, gap: space.md },
  centerText: { fontSize: 14, color: colors.inkSoft, fontFamily: fonts.medium, textAlign: 'center' },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
  resultBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
  },
  resultCount: { fontSize: 13, color: colors.inkSoft, fontFamily: fonts.medium },
  resultNum: { color: colors.primaryDeep, fontFamily: fonts.bold, fontSize: 15 },
  resultStores: { fontSize: 12, color: colors.inkFaint, fontFamily: fonts.medium },
  chipScroll: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: space.sm },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: space.lg, alignItems: 'center' },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: space.lg, marginBottom: space.md },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
  },
  sortButtonActive: { backgroundColor: colors.primary },
  sortText: { fontSize: 12.5, color: colors.inkSoft, fontFamily: fonts.medium },
  sortTextActive: { color: colors.white, fontFamily: fonts.semibold },
  list: { paddingBottom: space.xl },
  listFlex: { flex: 1 },
  emptyBox: {
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xxl,
    marginHorizontal: space.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.xl,
  },
  emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink, textAlign: 'center' },
});
