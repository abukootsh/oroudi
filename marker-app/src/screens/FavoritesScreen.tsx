import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { productKey } from '../api';
import ProductCard from '../components/ProductCard';
import { useFavorites } from '../favorites';
import { Lang, t } from '../i18n';
import { colors, fonts, radius, space } from '../theme';

export default function FavoritesScreen({ lang }: { lang: Lang }) {
  const rtl = lang === 'ar';
  const { favorites } = useFavorites();

  return (
    <View style={styles.container}>
      <View style={[styles.head, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <View style={styles.headIcon}>
          <Ionicons name="heart" size={18} color={colors.danger} />
        </View>
        <Text style={styles.title}>{t('tabFavorites', lang)}</Text>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.centerWrap}>
          <View style={styles.emptyCircle}>
            <Ionicons name="heart-outline" size={40} color={colors.inkFaint} />
          </View>
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
  head: {
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  headIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontFamily: fonts.bold, color: colors.ink },
  centerWrap: { alignItems: 'center', paddingTop: 60, gap: space.lg },
  emptyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: 14,
    color: colors.inkSoft,
    fontFamily: fonts.medium,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  list: { paddingBottom: space.xl },
});
