import { Image } from 'expo-image';
import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { discountPercent, Product } from '../api';
import { useFavorites } from '../favorites';
import type { Lang } from '../i18n';
import { t } from '../i18n';
import { chainInfo, colors, fonts } from '../theme';

interface Props {
  product: Product;
  lang: Lang;
}

function ProductCardInner({ product, lang }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const rtl = lang === 'ar';
  const chain = chainInfo(product.chain);
  const chainColor = product.chain_color ?? chain.color;
  // متجر غير معرّف في الثيم: نستخدم اسمه العربي القادم من الخادم
  const chainLabel =
    rtl && chain.ar === product.chain && product.chain_ar
      ? product.chain_ar
      : rtl
        ? chain.ar
        : chain.en;
  const discount = discountPercent(product);
  const name = rtl ? product.name_ar || product.name : product.name;
  const fav = isFavorite(product);

  // يفتح صفحة المنتج في موقع المتجر: تبويب جديد على الويب، والمتصفح الخارجي على الجوال
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
    <Pressable
      onPress={open}
      disabled={!open}
      style={({ pressed }) => [
        styles.card,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        pressed && open ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.imageBox}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} contentFit="contain" />
        ) : (
          <Text style={styles.imageFallback}>🛒</Text>
        )}
      </View>

      <View style={[styles.info, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.badgeRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
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
        </View>
        {!!product.brand && (
          <Text style={[styles.brand, rtl && styles.rtlText]} numberOfLines={1}>
            {product.brand}
          </Text>
        )}
        <Text style={[styles.name, rtl && styles.rtlText]} numberOfLines={2}>
          {name}
        </Text>
        <View style={[styles.priceRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <Text style={styles.price}>
            {product.price.toFixed(2)}
            <Text style={styles.currency}> {t('sar', lang)}</Text>
          </Text>
          {discount > 0 && (
            <Text style={styles.originalPrice}>
              {product.original_price!.toFixed(2)}
            </Text>
          )}
        </View>
        {!product.in_stock && (
          <Text style={styles.outOfStock}>{t('outOfStock', lang)}</Text>
        )}
        {!!open && <Text style={styles.openLink}>{t('openInStore', lang)}</Text>}
      </View>

      <Pressable
        onPress={() => toggleFavorite(product)}
        hitSlop={10}
        style={styles.favButton}
      >
        <Text style={[styles.favIcon, fav && { color: colors.tomato }]}>
          {fav ? '♥' : '♡'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const ProductCard = React.memo(ProductCardInner);
export default ProductCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
    alignItems: 'center',
  },
  cardPressed: { opacity: 0.7 },
  imageBox: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: 64, height: 64 },
  imageFallback: { fontSize: 28 },
  info: { flex: 1, gap: 2 },
  badgeRow: { gap: 6, alignItems: 'center' },
  chainBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  chainText: { color: colors.white, fontSize: 11, fontFamily: fonts.semibold },
  discountBadge: {
    backgroundColor: colors.leaf,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  discountText: { color: colors.white, fontSize: 11, fontFamily: fonts.semibold },
  brand: { fontSize: 11, color: colors.inkSoft, fontFamily: fonts.medium },
  name: { fontSize: 14, color: colors.ink, fontFamily: fonts.semibold, lineHeight: 20 },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  priceRow: { alignItems: 'baseline', gap: 8, marginTop: 2 },
  price: { fontSize: 18, color: colors.tomatoDeep, fontFamily: fonts.bold },
  currency: { fontSize: 12, color: colors.inkSoft, fontFamily: fonts.medium },
  originalPrice: {
    fontSize: 13,
    color: colors.inkSoft,
    textDecorationLine: 'line-through',
    fontFamily: fonts.regular,
  },
  outOfStock: { fontSize: 11, color: colors.tomato, fontFamily: fonts.medium },
  openLink: { fontSize: 11, color: colors.leaf, fontFamily: fonts.semibold, marginTop: 2 },
  favButton: { alignSelf: 'flex-start' },
  favIcon: { fontSize: 22, color: colors.inkSoft },
});
