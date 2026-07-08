import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PopularItem } from '../api';
import { Lang, t } from '../i18n';
import { colors, fonts } from '../theme';

interface Props {
  items: PopularItem[];
  lang: Lang;
  onSelect: (query: string) => void;
}

export default function PopularPills({ items, lang, onSelect }: Props) {
  if (!items.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('popularComparisons', lang)}</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            key={item.query}
            style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
            onPress={() => onSelect(item.query)}
          >
            <Text style={styles.pillName} numberOfLines={1}>
              {item.query}
            </Text>
            <Text style={styles.pillCount}>×{item.count}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  title: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillName: { fontSize: 13, fontFamily: fonts.semibold, color: colors.ink },
  pillCount: { fontSize: 11.5, fontFamily: fonts.semibold, color: colors.leaf },
});
