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
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FavoritesProvider } from './src/favorites';
import { Lang, t } from './src/i18n';
import { registerPushToken, scheduleComebackReminders } from './src/notifications';
import DealsScreen from './src/screens/DealsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SearchScreen from './src/screens/SearchScreen';
import { colors, fonts } from './src/theme';

type Tab = 'search' | 'deals' | 'favorites';

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  const [lang, setLang] = useState<Lang>('ar');
  const [tab, setTab] = useState<Tab>('search');

  useEffect(() => {
    scheduleComebackReminders();
    registerPushToken();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={[styles.root, styles.loading]}>
        <ActivityIndicator size="large" color={colors.tomato} />
      </View>
    );
  }

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'search', icon: '🔍', label: t('tabSearch', lang) },
    { key: 'deals', icon: '🏷️', label: t('tabDeals', lang) },
    { key: 'favorites', icon: '♥', label: t('tabFavorites', lang) },
  ];

  return (
    <FavoritesProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />

        <View style={styles.header}>
          <Pressable
            style={styles.langButton}
            onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          >
            <Text style={styles.langText}>{lang === 'ar' ? 'EN' : 'عربي'}</Text>
          </Pressable>
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>🛒 {t('appName', lang)}</Text>
            <Text style={styles.brandTagline} numberOfLines={2}>
              {t('tagline', lang)}
            </Text>
          </View>
          <View style={styles.langButtonGhost} />
        </View>

        <View style={styles.content}>
          {tab === 'search' && <SearchScreen key={lang} lang={lang} />}
          {tab === 'deals' && <DealsScreen lang={lang} />}
          {tab === 'favorites' && <FavoritesScreen lang={lang} />}
        </View>

        <View style={styles.tabBar}>
          {tabs.map((item) => (
            <Pressable
              key={item.key}
              style={styles.tabItem}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabIcon, tab === item.key && styles.tabIconActive]}>
                {item.icon}
              </Text>
              <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </FavoritesProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  loading: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  brand: { flex: 1, alignItems: 'center', gap: 2 },
  brandTitle: { fontSize: 24, fontFamily: fonts.bold, color: colors.ink },
  brandTagline: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 16,
  },
  langButton: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    width: 52,
    alignItems: 'center',
  },
  langButtonGhost: { width: 52 },
  langText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.ink },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingBottom: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 18, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 11, fontFamily: fonts.medium, color: colors.inkSoft },
  tabLabelActive: { color: colors.tomatoDeep, fontFamily: fonts.bold },
});
