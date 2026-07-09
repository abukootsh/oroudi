import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PopularItem } from '../api';
import { Lang, t } from '../i18n';
import { colors, fonts, radius } from '../theme';

interface Props {
  items: PopularItem[];
  lang: Lang;
  onSelect: (query: string) => void;
}

export default function PopularPills({ items, lang, onSelect }: Props) {
  if (!items.length) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="flame" size={15} color={colors.accent} />
        <Text style={styles.title}>{t('popularComparisons', lang)}</Text>
      </View>
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
            <View style={styles.countBadge}>
              <Text style={styles.pillCount}>{item.count}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillName: { fontSize: 13, fontFamily: fonts.semibold, color: colors.ink },
  countBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: 'center',
  },
  pillCount: { fontSize: 11, fontFamily: fonts.bold, color: colors.primaryDeep },
});
