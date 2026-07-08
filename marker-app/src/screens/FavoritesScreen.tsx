import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { productKey } from '../api';
import ProductCard from '../components/ProductCard';
import { useFavorites } from '../favorites';
import { Lang, t } from '../i18n';
import { colors, fonts } from '../theme';

export default function FavoritesScreen({ lang }: { lang: Lang }) {
  const { favorites } = useFavorites();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>♥ {t('tabFavorites', lang)}</Text>
      {favorites.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyEmoji}>🤍</Text>
          <Text style={styles.centerText}>{t('favoritesEmpty', lang)}</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={productKey}
          renderItem={({ item }) => <ProductCard product={item} lang={lang} />}
          contentContainerStyle={styles.list}
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
    marginBottom: 12,
  },
  centerWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 44 },
  centerText: {
    fontSize: 14,
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  list: { paddingBottom: 24 },
});
