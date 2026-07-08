import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  City,
  discountPercent,
  fetchCities,
  fetchPopular,
  PopularItem,
  Product,
  productKey,
  searchProducts,
} from '../api';
import Chip from '../components/Chip';
import PopularPills from '../components/PopularPills';
import ProductCard from '../components/ProductCard';
import { Lang, POPULAR_QUERIES, t } from '../i18n';
import { chainInfo, colors, fonts } from '../theme';

type SortMode = 'cheap' | 'expensive' | 'discount';

export default function SearchScreen({ lang }: { lang: Lang }) {
  const rtl = lang === 'ar';
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortMode>('cheap');
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState('riyadh');
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const lastQuery = useRef('');
  const cityRef = useRef('riyadh');

  useEffect(() => {
    fetchCities()
      .then(({ cities, selected }) => {
        setCities(cities);
        setCityId(selected);
        cityRef.current = selected;
      })
      .catch(() => {});
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
        setProducts(await searchProducts(trimmed, lang, cityRef.current));
      } catch {
        setError(true);
        setProducts(null);
      } finally {
        setLoading(false);
      }
    },
    [lang],
  );

  const pickCity = useCallback(
    (id: string) => {
      setCityId(id);
      cityRef.current = id;
      // أعد البحث الحالي بأسعار المدينة الجديدة
      if (lastQuery.current) runSearch(lastQuery.current);
    },
    [runSearch],
  );

  // شرائح المتاجر تُبنى ديناميكيًا من النتائج الفعلية —
  // أي متجر تضيفه من لوحة التحكم يظهر هنا تلقائيًا بلونه واسمه
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
      const known = info.ar !== p.chain; // معرّف في الثيم؟
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

  const toggleChain = (key: string) => {
    setSelectedChains((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sortModes: { key: SortMode; label: string }[] = [
    { key: 'cheap', label: t('cheapest', lang) },
    { key: 'expensive', label: t('priciest', lang) },
    { key: 'discount', label: t('biggestDiscount', lang) },
  ];

  const cityRow = cities.length > 0 && (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
      contentContainerStyle={styles.chipRow}
    >
      <Text style={styles.cityLabel}>{t('yourCity', lang)}</Text>
      {cities.map((c) => (
        <Chip
          key={c.id}
          label={rtl ? c.ar : c.en}
          active={cityId === c.id}
          color={colors.leaf}
          onPress={() => pickCity(c.id)}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput
          style={[styles.input, rtl && { textAlign: 'right', writingDirection: 'rtl' }]}
          placeholder={t('searchPlaceholder', lang)}
          placeholderTextColor={colors.inkSoft}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(query)}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable style={styles.searchButton} onPress={() => runSearch(query)}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </Pressable>
      </View>

      {cityRow}

      {products === null && !loading && !error && (
        <ScrollView contentContainerStyle={styles.idleWrap}>
          <Text style={styles.idleEmoji}>🛒</Text>
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
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.tomato} />
          <Text style={styles.centerText}>{t('loading', lang)}</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.centerWrap}>
          <Text style={styles.centerText}>{t('error', lang)}</Text>
          <Pressable style={styles.retryButton} onPress={() => runSearch(query)}>
            <Text style={styles.retryText}>{t('retry', lang)}</Text>
          </Pressable>
        </View>
      )}

      {products !== null && !loading && !error && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            <Chip
              label={`${t('allStores', lang)} (${products.length})`}
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

          <View style={[styles.sortRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            {sortModes.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setSort(m.key)}
                style={[styles.sortButton, sort === m.key && styles.sortButtonActive]}
              >
                <Text style={[styles.sortText, sort === m.key && styles.sortTextActive]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <FlatList
            style={styles.listFlex}
            data={visible}
            keyExtractor={productKey}
            renderItem={({ item }) => <ProductCard product={item} lang={lang} />}
            contentContainerStyle={styles.list}
            initialNumToRender={10}
            windowSize={7}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🫥</Text>
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
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    paddingStart: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: colors.tomato,
    borderRadius: 10,
    margin: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  searchButtonText: { fontSize: 16 },
  cityLabel: {
    fontSize: 13,
    color: colors.inkSoft,
    fontFamily: fonts.semibold,
    alignSelf: 'center',
  },
  idleWrap: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 24, paddingBottom: 32 },
  idleEmoji: { fontSize: 52, marginBottom: 12 },
  idleText: {
    fontSize: 14,
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  popularTitle: { fontSize: 13, color: colors.ink, fontFamily: fonts.semibold, marginBottom: 12 },
  popularChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  centerWrap: { alignItems: 'center', paddingTop: 48, gap: 14 },
  centerText: { fontSize: 14, color: colors.inkSoft, fontFamily: fonts.medium, textAlign: 'center' },
  retryButton: {
    backgroundColor: colors.tomato,
    borderRadius: 99,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  retryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
  chipScroll: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: 6 },
  chipRow: { gap: 8, paddingHorizontal: 16, alignItems: 'center' },
  sortRow: { gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  sortButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.paperDeep,
  },
  sortButtonActive: { backgroundColor: colors.ink },
  sortText: { fontSize: 12, color: colors.inkSoft, fontFamily: fonts.medium },
  sortTextActive: { color: colors.white },
  list: { paddingBottom: 24 },
  listFlex: { flex: 1 },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 24,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink, textAlign: 'center' },
});
