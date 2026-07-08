// هوية ماركر البصرية — نفس ألوان الموقع
export const colors = {
  paper: '#faf6ee',
  paperDeep: '#f3ecdd',
  ink: '#241f1a',
  inkSoft: '#6f6558',
  line: '#e2d8c5',
  tomato: '#d92b2b',
  tomatoDeep: '#b31f1f',
  leaf: '#2e7d4f',
  white: '#ffffff',
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
  noon: { color: '#e8b007', darkText: true, ar: 'نون', en: 'Noon' },
  hungerstation: { color: '#f47b20', ar: 'هنقرستيشن', en: 'Hungerstation' },
};

// ترتيب عرض المتاجر في شريط الفلترة (كما في الموقع)
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
