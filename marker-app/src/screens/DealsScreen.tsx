import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchDeals, Product, productKey } from '../api';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import { Lang, t } from '../i18n';
import { colors, fonts, radius, space } from '../theme';

export default function DealsScreen({ lang }: { lang: Lang }) {
  const rtl = lang === 'ar';
  const [deals, setDeals] = useState<Product[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setDeals(null);
    fetchDeals(lang)
      .then(setDeals)
      .catch(() => setError(true));
  }, [lang]);

  useEffect(load, [load]);

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
        <FlatList
          data={deals}
          keyExtractor={productKey}
          renderItem={({ item }) => <ProductCard product={item} lang={lang} />}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
          windowSize={7}
          ListEmptyComponent={
            <Text style={[styles.centerText, { marginTop: 40 }]}>{t('noResults', lang)}</Text>
          }
        />
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
