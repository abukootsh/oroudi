import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

interface Props {
  label: string;
  active?: boolean;
  color?: string;
  dot?: string;
  onPress: () => void;
}

export default function Chip({ label, active, color, dot, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: color ?? colors.primary,
          borderColor: color ?? colors.primary,
        },
      ]}
    >
      {!!dot && <View style={[styles.dot, { backgroundColor: active ? colors.white : dot }]} />}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, color: colors.ink, fontFamily: fonts.medium },
  labelActive: { color: colors.white, fontFamily: fonts.semibold },
});
