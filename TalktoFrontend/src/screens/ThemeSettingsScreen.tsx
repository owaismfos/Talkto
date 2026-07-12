import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME_COLOR_OPTIONS, type AccentColorKey, type AppThemeColors } from '../theme/colors';
import { useTheme } from '../contexts/ThemeContext';

const appearanceOptions = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System Default' },
] as const;

const ThemeSettingsScreen = () => {
  const { accentColor, appearance, resolvedAppearance, colors, setAccentColor, setAppearance } = useTheme();
  const [isHydrated, setIsHydrated] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const currentAppearanceLabel = useMemo(() => {
    if (appearance === 'system') {
      return `System (${resolvedAppearance})`;
    }
    return appearance;
  }, [appearance, resolvedAppearance]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Theme</Text>
        <Text style={styles.heroText}>Choose a color palette and appearance mode for the whole app.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Accent color</Text>
        <View style={styles.colorGrid}>
          {Object.entries(THEME_COLOR_OPTIONS).map(([key, option]) => {
            const isSelected = accentColor === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.colorOption, isSelected && styles.colorOptionSelected]}
                onPress={() => setAccentColor(key as AccentColorKey)}
              >
                <View style={[styles.colorSwatch, { backgroundColor: option.primary }]} />
                <Text style={styles.colorLabel}>{option.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        {appearanceOptions.map(option => {
          const selected = appearance === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.appearanceRow, selected && styles.appearanceRowSelected]}
              onPress={() => setAppearance(option.id)}
            >
              <Text style={styles.appearanceLabel}>{option.label}</Text>
              {selected ? <Text style={styles.selectedText}>✓</Text> : null}
            </TouchableOpacity>
          );
        })}
        <Text style={styles.appearanceHint}>Current mode: {isHydrated ? currentAppearanceLabel : 'Loading...'}</Text>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, paddingBottom: 32, gap: 12 },
  hero: { backgroundColor: colors.brand, borderRadius: 22, padding: 16 },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  heroText: { color: 'rgba(255,255,255,0.84)', fontSize: 13, lineHeight: 20, marginTop: 6 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: { width: '47%', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 10, alignItems: 'center' },
  colorOptionSelected: { borderColor: colors.brand, backgroundColor: colors.accentSoft },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, marginBottom: 6 },
  colorLabel: { color: colors.text, fontWeight: '700' },
  appearanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  appearanceRowSelected: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 10 },
  appearanceLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  selectedText: { color: colors.brand, fontWeight: '800' },
  appearanceHint: { color: colors.muted, fontSize: 12, marginTop: 8 },
});

export default ThemeSettingsScreen;
