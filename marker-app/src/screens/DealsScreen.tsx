import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchDeals, Product, productKey } from '../api';
import ProductCard from '../components/ProductCard';
import { Lang, t } from '../i18n';
import { colors, fonts } from '../theme';

export default function DealsScreen({ lang }: { lang: Lang }) {
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
      <Text style={styles.title}>🏷️ {t('dealsTitle', lang)}</Text>
      <Text style={styles.hint}>{t('dealsHint', lang)}</Text>

      {error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.centerText}>{t('error', lang)}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>{t('retry', lang)}</Text>
          </Pressable>
        </View>
      ) : deals === null ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.tomato} />
          <Text style={styles.centerText}>{t('loading', lang)}</Text>
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
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 2,
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 12,
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
  list: { paddingBottom: 24 },
});
