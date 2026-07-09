import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { discountPercent, Product } from '../api';
import { useFavorites } from '../favorites';
import type { Lang } from '../i18n';
import { t } from '../i18n';
import { chainInfo, colors, fonts, radius, shadow, space } from '../theme';

interface Props {
  product: Product;
  lang: Lang;
  cheapest?: boolean; // أرخص نتيجة في القائمة — تبرز بشارة
}

function ProductCardInner({ product, lang, cheapest }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const rtl = lang === 'ar';
  const chain = chainInfo(product.chain);
  const chainColor = product.chain_color ?? chain.color;
  const chainLabel =
    rtl && chain.ar === product.chain && product.chain_ar
      ? product.chain_ar
      : rtl
        ? chain.ar
        : chain.en;
  const discount = discountPercent(product);
  const name = rtl ? product.name_ar || product.name : product.name;
  const fav = isFavorite(product);

  const open = product.link
    ? () => {
        if (Platform.OS === 'web') {
          (globalThis as any).open?.(product.link, '_blank', 'noopener');
        } else {
          Linking.openURL(product.link!);
        }
      }
    : undefined;

  return (
    <View style={[styles.wrap, cheapest && styles.wrapCheapest]}>
      {cheapest && (
        <View style={[styles.cheapBar, { flexDirection: 'row' }]}>
          <Ionicons name="trending-down" size={13} color={colors.white} />
          <Text style={styles.cheapBarText}>{t('cheapestBadge', lang)}</Text>
        </View>
      )}
      <Pressable
        onPress={open}
        disabled={!open}
        style={({ pressed }) => [
          styles.card,
          { flexDirection: 'row' },
          pressed && open ? styles.cardPressed : null,
        ]}
      >
        <View style={styles.imageBox}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.image} contentFit="contain" />
          ) : (
            <Ionicons name="cube-outline" size={28} color={colors.inkFaint} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.badgeRow}>
            <View style={[styles.chainBadge, { backgroundColor: chainColor }]}>
              <Text style={[styles.chainText, chain.darkText && { color: colors.ink }]}>
                {chainLabel}
              </Text>
            </View>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
            {!product.in_stock && (
              <View style={styles.oosBadge}>
                <Text style={styles.oosText}>{t('outOfStock', lang)}</Text>
              </View>
            )}
          </View>

          {!!product.brand && (
            <Text style={styles.brand} numberOfLines={1}>
              {product.brand}
            </Text>
          )}
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>

          <View style={[styles.priceRow, { flexDirection: 'row' }]}>
            <Text style={[styles.price, cheapest && { color: colors.accent }]}>
              {product.price.toFixed(2)}
              <Text style={styles.currency}> {t('sar', lang)}</Text>
            </Text>
            {discount > 0 && (
              <Text style={styles.originalPrice}>{product.original_price!.toFixed(2)}</Text>
            )}
          </View>

          {!!open && (
            <View style={styles.openRow}>
              <Text style={styles.openLink}>{t('openInStore', lang)}</Text>
              <Ionicons name="chevron-back" size={13} color={colors.primary} />
            </View>
          )}
        </View>

        <Pressable
          onPress={() => toggleFavorite(product)}
          hitSlop={12}
          style={styles.favButton}
        >
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={22}
            color={fav ? colors.danger : colors.inkFaint}
          />
        </Pressable>
      </Pressable>
    </View>
  );
}

const ProductCard = React.memo(ProductCardInner);
export default ProductCard;

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.lg,
    marginBottom: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  wrapCheapest: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    ...shadow.raised,
  },
  cheapBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  cheapBarText: { color: colors.white, fontSize: 11.5, fontFamily: fonts.bold },
  card: {
    flexDirection: 'row',
    padding: space.md,
    gap: space.md,
    alignItems: 'center',
  },
  cardPressed: { opacity: 0.65 },
  imageBox: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: 66, height: 66 },
  info: { flex: 1, gap: 3, alignItems: 'flex-start' },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  chainBadge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  chainText: { color: colors.white, fontSize: 11, fontFamily: fonts.semibold },
  discountBadge: {
    backgroundColor: colors.cheapest,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  discountText: { color: colors.white, fontSize: 11, fontFamily: fonts.bold },
  oosBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  oosText: { color: colors.danger, fontSize: 10.5, fontFamily: fonts.medium },
  brand: { fontSize: 11, color: colors.inkFaint, fontFamily: fonts.medium },
  name: { fontSize: 14, color: colors.ink, fontFamily: fonts.semibold, lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  price: { fontSize: 19, color: colors.primaryDeep, fontFamily: fonts.bold },
  currency: { fontSize: 12, color: colors.inkSoft, fontFamily: fonts.medium },
  originalPrice: {
    fontSize: 13,
    color: colors.inkFaint,
    textDecorationLine: 'line-through',
    fontFamily: fonts.regular,
  },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  openLink: { fontSize: 11.5, color: colors.primary, fontFamily: fonts.semibold },
  favButton: { alignSelf: 'flex-start', padding: 2 },
});
