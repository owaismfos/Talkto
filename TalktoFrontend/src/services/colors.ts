export type AccentColorKey = 'green' | 'yellow' | 'blue' | 'pink' | 'gray';
export type ThemeAppearanceMode = 'light' | 'dark' | 'system';

export interface AppThemeColors {
  brand: string;
  brandDark: string;
  accent: string;
  accentLight: string;
  accentSoft: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  bubbleMe: string;
  bubbleThem: string;
  danger: string;
  inputBackground: string;
  overlay: string;
  headerText: string;
}

export const THEME_COLOR_OPTIONS: Record<AccentColorKey, { name: string; primary: string; darker: string; light: string; background: string }> = {
  green: { name: 'Green', primary: '#16A34A', darker: '#16A34A', light: '#DCFCE7', background: '#F0FDF4' },
  yellow: { name: 'Yellow', primary: '#EAB308', darker: '#CA8A04', light: '#FEF9C3', background: '#FEFCE8' },
  blue: { name: 'Blue', primary: '#3B82F6', darker: '#2563EB', light: '#DBEAFE', background: '#EFF6FF' },
  pink: { name: 'Pink', primary: '#EC4899', darker: '#DB2777', light: '#FCE7F3', background: '#FDF2F8' },
  gray: { name: 'Gray', primary: '#64748B', darker: '#475569', light: '#F1F5F9', background: '#F8FAFC' },
};

const LIGHT_THEME: AppThemeColors = {
  brand: '#22C55E',
  brandDark: '#16A34A',
  accent: '#22C55E',
  accentLight: '#DCFCE7',
  accentSoft: '#F0FDF4',
  surface: '#F7F8FA',
  card: '#FFFFFF',
  border: '#E4E7EC',
  text: '#0F1728',
  muted: '#667085',
  bubbleMe: '#DCF8C6',
  bubbleThem: '#FFFFFF',
  danger: '#D92D20',
  inputBackground: '#FFFFFF',
  overlay: 'rgba(15,23,40,0.16)',
  headerText: '#FFFFFF',
};

const DARK_THEME: AppThemeColors = {
  brand: '#22C55E',
  brandDark: '#16A34A',
  accent: '#22C55E',
  accentLight: '#1F2937',
  accentSoft: '#111827',
  surface: '#0F172A',
  card: '#111827',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  bubbleMe: '#14532D',
  bubbleThem: '#1E293B',
  danger: '#F87171',
  inputBackground: '#1E293B',
  overlay: 'rgba(2,6,23,0.54)',
  headerText: '#FFFFFF',
};

let activeTheme: AppThemeColors = { ...LIGHT_THEME };

export const resolveThemePalette = (accentKey: AccentColorKey, appearance: 'light' | 'dark'): AppThemeColors => {
  const palette = THEME_COLOR_OPTIONS[accentKey];
  const base = appearance === 'dark' ? DARK_THEME : LIGHT_THEME;
  return {
    ...base,
    brand: palette.primary,
    brandDark: palette.darker,
    accent: palette.primary,
    accentLight: palette.light,
    accentSoft: palette.background,
  };
};

export const setActiveThemePalette = (palette: AppThemeColors) => {
  Object.assign(activeTheme, palette);
};

export const WHATSAPP_COLORS: AppThemeColors = activeTheme;