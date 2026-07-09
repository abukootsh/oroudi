import { Ionicons } from '@expo/vector-icons';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { warmUpServer } from './src/api';
import { FavoritesProvider } from './src/favorites';
import { Lang, t } from './src/i18n';
import { registerPushToken, scheduleComebackReminders } from './src/notifications';
import DealsScreen from './src/screens/DealsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SearchScreen from './src/screens/SearchScreen';
import { colors, fonts, radius, shadow, space } from './src/theme';

type Tab = 'search' | 'deals' | 'favorites';

const TABS: {
  key: Tab;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'search', icon: 'search', iconOutline: 'search-outline' },
  { key: 'deals', icon: 'pricetags', iconOutline: 'pricetags-outline' },
  { key: 'favorites', icon: 'heart', iconOutline: 'heart-outline' },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  const [lang, setLang] = useState<Lang>('ar');
  const [tab, setTab] = useState<Tab>('search');
  const rtl = lang === 'ar';
  const { width } = useWindowDimensions();
  // على الويب العريض: نؤطّر التطبيق في عمود موبايل موسّط بدل مدّه على الشاشة
  const framed = Platform.OS === 'web' && width > 560;

  useEffect(() => {
    warmUpServer();
    scheduleComebackReminders();
    registerPushToken();
  }, []);

  // اتجاه صفحة الويب حسب اللغة (RTL للعربية) — يضبط شريط التمرير ومحاذاة
  // العناصر الأصلية بشكل صحيح في المتصفح.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [rtl, lang]);

  if (!fontsLoaded) {
    return (
      <View style={[styles.root, styles.loading]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const labels: Record<Tab, string> = {
    search: t('tabSearch', lang),
    deals: t('tabDeals', lang),
    favorites: t('tabFavorites', lang),
  };

  return (
    <FavoritesProvider>
      <View style={styles.outer}>
        <SafeAreaView style={[styles.root, framed && styles.rootFramed]}>
          <StatusBar style="dark" />

          {/* الهيدر */}
          <View style={[styles.header, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <View style={[styles.brand, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <View style={styles.logoBadge}>
              <Ionicons name="basket" size={20} color={colors.white} />
            </View>
            <View style={{ alignItems: rtl ? 'flex-end' : 'flex-start' }}>
              <Text style={styles.brandTitle}>{t('appName', lang)}</Text>
              <Text style={styles.brandTagline}>{t('brandSub', lang)}</Text>
            </View>
          </View>
          <Pressable
            style={styles.langButton}
            onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          >
            <Ionicons name="language" size={14} color={colors.primaryDeep} />
            <Text style={styles.langText}>{lang === 'ar' ? 'EN' : 'ع'}</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {tab === 'search' && <SearchScreen key={lang} lang={lang} />}
          {tab === 'deals' && <DealsScreen lang={lang} />}
          {tab === 'favorites' && <FavoritesScreen lang={lang} />}
        </View>

        {/* شريط التبويبات */}
        <View style={styles.tabBar}>
          {TABS.map((item) => {
            const on = tab === item.key;
            return (
              <Pressable key={item.key} style={styles.tabItem} onPress={() => setTab(item.key)}>
                <View style={[styles.tabIconWrap, on && styles.tabIconWrapActive]}>
                  <Ionicons
                    name={on ? item.icon : item.iconOutline}
                    size={20}
                    color={on ? colors.white : colors.inkFaint}
                  />
                </View>
                <Text style={[styles.tabLabel, on && styles.tabLabelActive]}>
                  {labels[item.key]}
                </Text>
              </Pressable>
            );
          })}
          </View>
        </SafeAreaView>
      </View>
    </FavoritesProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#E6ECEA', alignItems: 'center' },
  root: { flex: 1, width: '100%', backgroundColor: colors.bg },
  // إطار الموبايل الموسّط على الويب العريض
  rootFramed: {
    maxWidth: 480,
    marginVertical: 20,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadow.card,
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  loading: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  brand: { alignItems: 'center', gap: space.md },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  brandTitle: { fontSize: 22, fontFamily: fonts.bold, color: colors.ink, lineHeight: 26 },
  brandTagline: { fontSize: 11, fontFamily: fonts.medium, color: colors.inkFaint },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  langText: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.primaryDeep },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap: {
    width: 44,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 11, fontFamily: fonts.medium, color: colors.inkFaint },
  tabLabelActive: { color: colors.primaryDeep, fontFamily: fonts.bold },
});
