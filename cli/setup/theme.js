/**
 * Theme Setup Module
 * Creates a complete theming system with dark/light mode support
 */

const fs = require('fs');
const path = require('path');
const { executeCommand } = require('../utils/commands');
const { log } = require('../utils/logger');
const { parseJsonFile } = require('../utils/config');
const {
  updateBabelAliases,
  writeBabelConfig,
} = require('../utils/babel-config');

/**
 * Set up theming system in the generated project
 * @param {string} projectPath - Path to the generated project
 * @param {boolean} isExpo - Whether this is an Expo project
 * @param {boolean} useI18n - Whether i18n is enabled (MMKV already installed)
 */
function setupTheme(projectPath, isExpo, useI18n, pm) {
  log.info('Setting up theming system...');

  // Install MMKV if not already installed (i18n installs it)
  if (!useI18n) {
    log.info('Installing MMKV for theme persistence...');
    executeCommand(
      pm.add('react-native-mmkv react-native-nitro-modules')
    );
  }

  const srcDir = path.join(projectPath, 'src');

  // Create theme directory
  const themeDir = path.join(srcDir, 'theme');
  if (!fs.existsSync(themeDir)) {
    fs.mkdirSync(themeDir, { recursive: true });
  }

  // Create MMKV directory if not already created by i18n
  if (!useI18n) {
    const mmkvDir = path.join(srcDir, 'mmkv');
    if (!fs.existsSync(mmkvDir)) {
      fs.mkdirSync(mmkvDir, { recursive: true });
    }

    const mmkvSetup = `import { createMMKV } from 'react-native-mmkv';

export const MMKVStorage = createMMKV({
  id: 'user-starter-storage',
});
`;
    fs.writeFileSync(path.join(mmkvDir, 'index.ts'), mmkvSetup);
  }

  // Write theme files
  fs.writeFileSync(path.join(themeDir, 'colors.ts'), generateColors());
  fs.writeFileSync(path.join(themeDir, 'spacing.ts'), generateSpacing());
  fs.writeFileSync(path.join(themeDir, 'typography.ts'), generateTypography());
  fs.writeFileSync(path.join(themeDir, 'theme.ts'), generateTheme());
  fs.writeFileSync(path.join(themeDir, 'ThemeContext.tsx'), generateThemeContext());
  fs.writeFileSync(path.join(themeDir, 'index.ts'), generateThemeIndex());

  // Create ThemeToggle component
  const componentsDir = path.join(srcDir, 'components');
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(componentsDir, 'ThemeToggle.tsx'), generateThemeToggleComponent(useI18n));

  // Add @theme path alias
  addThemeAlias(projectPath, isExpo, useI18n);

  log.success('Theming system configured with dark/light mode support');

  if (isExpo && !useI18n) {
    log.warning(
      'Since this project uses react-native-mmkv for theme persistence, you need to run "npx expo prebuild" before starting the app.'
    );
  }
}

function addThemeAlias(projectPath, isExpo, useI18n) {
  // Update tsconfig.json
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = parseJsonFile(tsconfigPath);

    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
    }
    if (!tsconfig.compilerOptions.baseUrl) {
      tsconfig.compilerOptions.baseUrl = '.';
    }
    if (!tsconfig.compilerOptions.paths) {
      tsconfig.compilerOptions.paths = {};
    }

    tsconfig.compilerOptions.paths['@theme'] = ['./src/theme'];
    tsconfig.compilerOptions.paths['@theme/*'] = ['./src/theme/*'];

    // Also add @mmkv alias if i18n hasn't already done so
    if (!useI18n) {
      tsconfig.compilerOptions.paths['@mmkv'] = ['./src/mmkv'];
    }

    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  }

  // Update babel.config.js
  const aliases = {
    '@theme': './src/theme',
  };

  if (!useI18n) {
    aliases['@mmkv'] = './src/mmkv';
  }

  const babelConfig = updateBabelAliases(projectPath, aliases);
  writeBabelConfig(projectPath, babelConfig);
}

// ─── Theme File Generators ─────────────────────────────────────────────

function generateColors() {
  return `/**
 * Color tokens for light and dark themes
 * Customize these to match your brand
 */

export const lightColors = {
  /** Main brand color - used for primary buttons, links, active states */
  primary: '#3498db',
  /** Secondary actions and accents */
  secondary: '#95a5a6',
  /** Success states, confirmations, active language buttons */
  success: '#27ae60',
  /** Warnings, inactive language buttons */
  warning: '#e67e22',
  /** Errors, destructive actions, logout buttons */
  danger: '#e74c3c',
  /** Main screen background */
  background: '#f8f9fa',
  /** Card/surface background */
  surface: '#ffffff',
  /** Primary text color */
  text: '#2c3e50',
  /** Secondary/muted text */
  textSecondary: '#7f8c8d',
  /** Border and divider color */
  border: '#ecf0f1',
  /** Card background */
  card: '#ffffff',
  /** Input background */
  inputBackground: '#ffffff',
  /** Input border */
  inputBorder: 'grey',
  /** Button text on colored backgrounds */
  buttonText: '#ffffff',
};

export const darkColors = {
  primary: '#5dade2',
  secondary: '#7f8c8d',
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ecf0f1',
  textSecondary: '#bdc3c7',
  border: '#2c2c2c',
  card: '#1e1e1e',
  inputBackground: '#2c2c2c',
  inputBorder: '#555555',
  buttonText: '#ffffff',
};

export type Colors = typeof lightColors;
`;
}

function generateSpacing() {
  return `/**
 * Spacing scale
 * Consistent spacing values used across the app
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export type Spacing = typeof spacing;
`;
}

function generateTypography() {
  return `/**
 * Typography scale
 * Consistent font sizes used across the app
 */

export const typography = {
  h1: 28,
  h2: 24,
  h3: 20,
  body: 16,
  caption: 14,
  label: 12,
} as const;

export type Typography = typeof typography;
`;
}

function generateTheme() {
  return `/**
 * Theme definition combining colors, spacing, and typography
 */

import { lightColors, darkColors, type Colors } from './colors';
import { spacing, type Spacing } from './spacing';
import { typography, type Typography } from './typography';

export type Theme = {
  colors: Colors;
  spacing: Spacing;
  typography: Typography;
};

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  typography,
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  typography,
};

/**
 * Maps our theme to React Navigation's theme format
 */
export function toNavigationTheme(theme: Theme) {
  return {
    dark: theme.colors.background === darkColors.background,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };
}
`;
}

function generateThemeContext() {
  return `/**
 * Theme Context and Provider
 * Provides theme state management with system color scheme detection and MMKV persistence
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { MMKVStorage } from '@mmkv';
import { lightTheme, darkTheme, type Theme } from './theme';

type ColorSchemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  /** The resolved theme object (colors, spacing, typography) */
  theme: Theme;
  /** Current color scheme mode: 'light', 'dark', or 'system' */
  colorScheme: ColorSchemeMode;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
  /** Set a specific color scheme mode */
  setColorScheme: (mode: ColorSchemeMode) => void;
  /** Whether the current resolved theme is dark */
  isDark: boolean;
};

const THEME_PERSISTENCE_KEY = 'app_color_scheme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();

  const [colorScheme, setColorSchemeState] = useState<ColorSchemeMode>(() => {
    const persisted = MMKVStorage.getString(THEME_PERSISTENCE_KEY);
    if (persisted === 'light' || persisted === 'dark' || persisted === 'system') {
      return persisted;
    }
    return 'system';
  });

  const setColorScheme = useCallback((mode: ColorSchemeMode) => {
    setColorSchemeState(mode);
    MMKVStorage.set(THEME_PERSISTENCE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  }, [colorScheme, setColorScheme]);

  const resolvedIsDark = useMemo(() => {
    if (colorScheme === 'system') {
      return systemColorScheme === 'dark';
    }
    return colorScheme === 'dark';
  }, [colorScheme, systemColorScheme]);

  const theme = useMemo(() => {
    return resolvedIsDark ? darkTheme : lightTheme;
  }, [resolvedIsDark]);

  const value = useMemo(
    () => ({
      theme,
      colorScheme,
      toggleTheme,
      setColorScheme,
      isDark: resolvedIsDark,
    }),
    [theme, colorScheme, toggleTheme, setColorScheme, resolvedIsDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme
 * @returns ThemeContextType with theme, colorScheme, toggleTheme, setColorScheme, isDark
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
`;
}

function generateThemeToggleComponent(useI18n) {
  const i18nImport = useI18n ? "import { useTranslation } from 'react-i18next';\n" : '';
  const i18nHook = useI18n ? '  const { t } = useTranslation();\n' : '';
  const labelAppearance = useI18n ? "{t('common.themeAppearance')}" : 'Appearance';
  const labelLight = useI18n ? "{t('common.themeLight')}" : 'Light';
  const labelDark = useI18n ? "{t('common.themeDark')}" : 'Dark';
  const labelSystem = useI18n ? "{t('common.themeSystem')}" : 'System';

  return `import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@theme';
${i18nImport}
function ThemeToggle(): React.JSX.Element {
  const { theme, colorScheme, setColorScheme } = useTheme();
${i18nHook}
  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        ${labelAppearance}
      </Text>
      <View style={styles.options}>
        <Pressable
          style={[
            styles.option,
            { borderColor: theme.colors.border },
            colorScheme === 'light' && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' },
          ]}
          onPress={() => setColorScheme('light')}
        >
          <Text style={[styles.optionText, { color: theme.colors.text }]}>
            ${labelLight}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.option,
            { borderColor: theme.colors.border },
            colorScheme === 'dark' && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' },
          ]}
          onPress={() => setColorScheme('dark')}
        >
          <Text style={[styles.optionText, { color: theme.colors.text }]}>
            ${labelDark}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.option,
            { borderColor: theme.colors.border },
            colorScheme === 'system' && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' },
          ]}
          onPress={() => setColorScheme('system')}
        >
          <Text style={[styles.optionText, { color: theme.colors.text }]}>
            ${labelSystem}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  options: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ThemeToggle;
`;
}

function generateThemeIndex() {
  return `export { ThemeProvider, useTheme } from './ThemeContext';
export { lightTheme, darkTheme, toNavigationTheme } from './theme';
export { lightColors, darkColors } from './colors';
export { spacing } from './spacing';
export { typography } from './typography';
export type { Theme } from './theme';
export type { Colors } from './colors';
export type { Spacing } from './spacing';
export type { Typography } from './typography';
`;
}

module.exports = {
  setupTheme,
};
