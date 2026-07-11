import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchDeals, Product, productKey } from '../api';
import Chip from '../components/Chip';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import { Lang, t } from '../i18n';
import { normalizeAr } from '../relevance';
import { chainInfo, colors, fonts, radius, shadow, space } from '../theme';

export default function DealsScreen({ lang }: { lang: Lang }) {
  const rtl = lang === 'ar';
  const [deals, setDeals] = useState<Product[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setError(false);
    setDeals(null);
    setQuery('');
    setSelectedChains(new Set());
    fetchDeals(lang)
      .then(setDeals)
      .catch(() => setError(true));
  }, [lang]);

  useEffect(load, [load]);

  // شرائح المتاجر التي لها عروض (مع العدد)
  const chainChips = useMemo(() => {
    const chips: { key: string; ar: string; en: string; color: string; count: number }[] = [];
    for (const p of deals ?? []) {
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
  }, [deals]);

  // فلترة بالبحث والمتجر ثم فرز من الأرخص للأغلى
  const visible = useMemo(() => {
    if (!deals) return null;
    const q = normalizeAr(query.trim());
    const list = deals.filter((p) => {
      if (selectedChains.size > 0 && !selectedChains.has(p.chain.toLowerCase())) return false;
      if (!q) return true;
      const name = normalizeAr(`${p.name_ar || ''} ${p.name || ''} ${p.brand || ''}`);
      return name.includes(q);
    });
    return list.sort((a, b) => a.price - b.price);
  }, [deals, query, selectedChains]);

  const toggleChain = (key: string) => {
    setSelectedChains((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <View style={styles.headIcon}>
          <Ionicons name="pricetags" size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text style={styles.title}>{t('dealsTitle', lang)}</Text>
          <Text style={styles.hint}>{t('dealsHint', lang)}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.centerWrap}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.inkFaint} />
          <Text style={styles.centerText}>{t('error', lang)}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>{t('retry', lang)}</Text>
          </Pressable>
        </View>
      ) : deals === null ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : (
        <>
          {/* بحث داخل العروض */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.inkFaint} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('dealsSearchPlaceholder', lang)}
              placeholderTextColor={colors.inkFaint}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={10} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
              </Pressable>
            )}
          </View>

          {/* فلتر المتاجر */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            <Chip
              label={`${t('allStores', lang)} · ${deals.length}`}
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

          <FlatList
            data={visible}
            keyExtractor={productKey}
            renderItem={({ item }) => <ProductCard product={item} lang={lang} />}
            contentContainerStyle={styles.list}
            initialNumToRender={10}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.centerText, { marginTop: 40 }]}>{t('dealsNoMatch', lang)}</Text>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  headIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontFamily: fonts.bold, color: colors.ink },
  hint: { fontSize: 12, fontFamily: fonts.medium, color: colors.inkSoft, marginTop: 1 },
  searchBox: {
    flexDirection: 'row',
    marginHorizontal: space.lg,
    marginBottom: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    paddingHorizontal: 12,
    ...shadow.card,
  },
  searchIcon: { marginHorizontal: 4 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.ink,
    paddingVertical: 11,
  },
  clearBtn: { padding: 2 },
  chipScroll: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: space.sm },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: space.lg, alignItems: 'center' },
  skeletonWrap: { flex: 1, paddingTop: space.sm },
  centerWrap: { alignItems: 'center', paddingTop: 48, gap: space.md },
  centerText: { fontSize: 14, color: colors.inkSoft, fontFamily: fonts.medium, textAlign: 'center' },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
  list: { paddingBottom: space.xl },
});
