import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setActiveThemePalette, resolveThemePalette, THEME_COLOR_OPTIONS, type AccentColorKey, type ThemeAppearanceMode, type AppThemeColors } from '../theme/colors';

interface ThemeContextValue {
  accentColor: AccentColorKey;
  appearance: ThemeAppearanceMode;
  resolvedAppearance: 'light' | 'dark';
  colors: AppThemeColors;
  setAccentColor: (value: AccentColorKey) => void;
  setAppearance: (value: ThemeAppearanceMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const ACCENT_STORAGE_KEY = 'talkto:accentColor';
const APPEARANCE_STORAGE_KEY = 'talkto:appearance';

const getSystemAppearance = () => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColorState] = useState<AccentColorKey>('green');
  const [appearance, setAppearanceState] = useState<ThemeAppearanceMode>('system');
  const [resolvedAppearance, setResolvedAppearance] = useState<'light' | 'dark'>(getSystemAppearance);

  const applyTheme = useCallback((nextAccent: AccentColorKey, nextAppearance: ThemeAppearanceMode, nextResolvedAppearance: 'light' | 'dark') => {
    const palette = resolveThemePalette(nextAccent, nextAppearance === 'system' ? nextResolvedAppearance : nextAppearance);
    setActiveThemePalette(palette);
    StatusBar.setBarStyle(nextAppearance === 'system'
      ? nextResolvedAppearance === 'dark' ? 'light-content' : 'dark-content'
      : nextAppearance === 'dark' ? 'light-content' : 'dark-content');
  }, []);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [storedAccent, storedAppearance] = await Promise.all([
          AsyncStorage.getItem(ACCENT_STORAGE_KEY),
          AsyncStorage.getItem(APPEARANCE_STORAGE_KEY),
        ]);

        if (storedAccent && storedAccent in THEME_COLOR_OPTIONS) {
          setAccentColorState(storedAccent as AccentColorKey);
        }

        if (storedAppearance === 'light' || storedAppearance === 'dark' || storedAppearance === 'system') {
          setAppearanceState(storedAppearance);
        }
      } catch (error) {
        console.log('Unable to load theme preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (appearance === 'system') {
        setResolvedAppearance(colorScheme === 'dark' ? 'dark' : 'light');
      }
    });

    return () => subscription.remove();
  }, [appearance]);

  useEffect(() => {
    applyTheme(accentColor, appearance, resolvedAppearance);
  }, [accentColor, appearance, resolvedAppearance, applyTheme]);

  const setAccentColor = useCallback(async (value: AccentColorKey) => {
    setAccentColorState(value);
    await AsyncStorage.setItem(ACCENT_STORAGE_KEY, value);
  }, []);

  const setAppearance = useCallback(async (value: ThemeAppearanceMode) => {
    setAppearanceState(value);
    await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, value);
  }, []);

  const colors = useMemo(() => resolveThemePalette(accentColor, appearance === 'system' ? resolvedAppearance : appearance), [accentColor, appearance, resolvedAppearance]);

  const value = useMemo<ThemeContextValue>(() => ({
    accentColor,
    appearance,
    resolvedAppearance,
    colors,
    setAccentColor,
    setAppearance,
  }), [accentColor, appearance, resolvedAppearance, colors, setAccentColor, setAppearance]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
};
