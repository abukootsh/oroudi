import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, space } from '../theme';

// المحرّك الأصلي غير متاح على الويب (يسقط لـ JS مع تحذير) فنعطّله هناك
const useNativeDriver = Platform.OS !== 'web';

// بطاقة هيكلية (skeleton) تُعرض أثناء التحميل بدل دوّارة فارغة — تعطي إحساسًا
// بأن المحتوى قادم وتقلّل القلق البصري. نبضة خفيفة عبر Animated.
function SkeletonCardInner() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { flexDirection: 'row' }]}>
        <Animated.View style={[styles.image, { opacity: pulse }]} />
        <View style={styles.info}>
          <Animated.View style={[styles.line, styles.badge, { opacity: pulse }]} />
          <Animated.View style={[styles.line, styles.name, { opacity: pulse }]} />
          <Animated.View style={[styles.line, styles.price, { opacity: pulse }]} />
        </View>
      </View>
    </View>
  );
}

const SkeletonCard = React.memo(SkeletonCardInner);
export default SkeletonCard;

const bar = { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm } as const;

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.lg,
    marginBottom: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  card: { flexDirection: 'row', padding: space.md, gap: space.md, alignItems: 'center' },
  image: { ...bar, width: 72, height: 72, borderRadius: radius.md },
  info: { flex: 1, gap: 9, alignItems: 'flex-start' },
  line: { ...bar },
  badge: { width: 64, height: 16 },
  name: { width: '80%', height: 14 },
  price: { width: 90, height: 20 },
});
