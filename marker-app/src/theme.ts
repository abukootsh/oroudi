// هوية «عروضي» البصرية — أخضر طازج (توفير/بقالة) + عنبري للعروض والأرخص.
export const colors = {
  // الأساس
  primary: '#059669', // أخضر طازج
  primaryDeep: '#047857',
  primarySoft: '#ECFDF5', // خلفية خضراء فاتحة جدًا
  accent: '#E8850C', // عنبري — العروض و«الأرخص»
  accentSoft: '#FFF4E6',

  // الأسطح والنصوص
  bg: '#F5F8F7', // خلفية دافئة محايدة
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F4',
  ink: '#0F1E1A', // نص أساسي
  inkSoft: '#5C6B66', // نص ثانوي
  inkFaint: '#8A9793',
  line: '#E4EAE8',

  // دلالات
  cheapest: '#0F9D58', // أخضر «الأرخص»
  discount: '#E8850C',
  danger: '#DC2626',
  white: '#FFFFFF',

  // أسماء قديمة (توافق مع كود لم يُحدَّث بعد)
  paper: '#F5F8F7',
  paperDeep: '#F1F5F4',
  tomato: '#059669',
  tomatoDeep: '#047857',
  leaf: '#0F9D58',
};

// نظام مسافات ثماني (4/8) للاتساق
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

// ظلال متسقة (خفيفة، بلون الهوية)
export const shadow = {
  card: {
    shadowColor: '#0F1E1A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#059669',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
};

export type ChainInfo = { color: string; darkText?: boolean; ar: string; en: string };

const CHAINS: Record<string, ChainInfo> = {
  danube: { color: '#0057a8', ar: 'الدانوب', en: 'Danube' },
  bindawood: { color: '#c8a13a', ar: 'بن داود', en: 'BinDawood' },
  carrefour: { color: '#004e9f', ar: 'كارفور', en: 'Carrefour' },
  ninja: { color: '#e4405f', ar: 'نينجا', en: 'Ninja' },
  lulu: { color: '#2e9e49', ar: 'لولو', en: 'Lulu' },
  panda: { color: '#00a0a8', ar: 'بنده', en: 'Panda' },
  tamimi: { color: '#c8102e', ar: 'التميمي', en: 'Tamimi' },
  noon: { color: '#feee00', darkText: true, ar: 'نون', en: 'Noon' },
  hungerstation: { color: '#f47b20', ar: 'هنقرستيشن', en: 'Hungerstation' },
};

export const CHAIN_KEYS = Object.keys(CHAINS);

export function chainInfo(chain: string): ChainInfo {
  return (
    CHAINS[chain.toLowerCase()] ?? { color: colors.inkSoft, ar: chain, en: chain }
  );
}

export const fonts = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
};
