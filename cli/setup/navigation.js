const fs = require('fs');
const path = require('path');
const { executeCommand } = require('../utils/commands');
const { log } = require('../utils/logger');
const { addNavigationAlias } = require('../utils/config');
const { NAVIGATION_PATTERNS } = require('../utils/screen-config');
const {
  generateNavTypes,
  generateAppNavigator,
  generateExpoRouterLayout,
  generateExpoRouterTabsLayout,
  generateExpoRouterDrawerLayout,
  generateTabNavigator,
  generateDrawerNavigator,
  generateTabDrawerDrawerNavigator,
  createDynamicScreens,
} = require('./dynamic-screens');

async function setupReactNavigation(projectPath, isExpo, useI18n, screenConfig = null, useTheme = false, pm) {
  log.info('Installing React Navigation...');

  const config = screenConfig || {
    hasAuth: false,
    navigationPattern: NAVIGATION_PATTERNS.STACK,
    screens: ['Home', 'Details'],
    initialScreen: 'Home',
  };

  const pattern = config.navigationPattern || NAVIGATION_PATTERNS.STACK;

  // Base React Navigation packages
  await executeCommand(
    pm.add('@react-navigation/native @react-navigation/native-stack')
  );
  if (isExpo) {
    await executeCommand(
      'npx expo install react-native-screens react-native-safe-area-context'
    );
  } else {
    await executeCommand(
      pm.add('react-native-screens react-native-safe-area-context')
    );
  }

  // Install additional deps based on navigation pattern
  if (
    pattern === NAVIGATION_PATTERNS.TABS ||
    pattern === NAVIGATION_PATTERNS.TABS_DRAWER
  ) {
    await executeCommand(pm.add('@react-navigation/bottom-tabs'));
  }

  if (
    pattern === NAVIGATION_PATTERNS.DRAWER ||
    pattern === NAVIGATION_PATTERNS.TABS_DRAWER
  ) {
    await executeCommand(pm.add('@react-navigation/drawer'));
    if (isExpo) {
      await executeCommand(
        'npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets'
      );
    } else {
      await executeCommand(
        pm.add('react-native-gesture-handler react-native-reanimated react-native-worklets')
      );
    }

    // Add reanimated babel plugin (must be last in plugins array)
    const { readBabelConfig, writeBabelConfig } = require('../utils/babel-config');
    const babelConfig = readBabelConfig(projectPath);
    if (babelConfig) {
      if (!babelConfig.plugins) babelConfig.plugins = [];
      if (!babelConfig.plugins.includes('react-native-reanimated/plugin')) {
        babelConfig.plugins.push('react-native-reanimated/plugin');
      }
      writeBabelConfig(projectPath, babelConfig);
    }
  }

  // Create navigation.d.ts in root
  const navTypes = generateNavTypes(config);
  fs.writeFileSync(path.join(projectPath, 'navigation.d.ts'), navTypes);

  // Add @navigation alias to babel.config.js and tsconfig.json
  addNavigationAlias(projectPath);

  // Create AppNavigator.tsx
  const navSetup = generateAppNavigator(config, useI18n, useTheme);
  const srcDir = path.join(projectPath, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir);
  }
  fs.writeFileSync(path.join(srcDir, 'AppNavigator.tsx'), navSetup);

  // Create navigator files if needed
  if (
    pattern === NAVIGATION_PATTERNS.TABS ||
    pattern === NAVIGATION_PATTERNS.TABS_DRAWER ||
    pattern === NAVIGATION_PATTERNS.DRAWER
  ) {
    const navigatorsDir = path.join(srcDir, 'navigators');
    if (!fs.existsSync(navigatorsDir)) {
      fs.mkdirSync(navigatorsDir, { recursive: true });
    }

    if (pattern === NAVIGATION_PATTERNS.TABS) {
      const tabNav = generateTabNavigator(config, useI18n, false, useTheme);
      fs.writeFileSync(path.join(navigatorsDir, 'TabNavigator.tsx'), tabNav);
    } else if (pattern === NAVIGATION_PATTERNS.DRAWER) {
      const drawerNav = generateDrawerNavigator(config, useI18n, useTheme);
      fs.writeFileSync(
        path.join(navigatorsDir, 'DrawerNavigator.tsx'),
        drawerNav
      );
    } else if (pattern === NAVIGATION_PATTERNS.TABS_DRAWER) {
      const tabNav = generateTabNavigator(config, useI18n, true, useTheme);
      fs.writeFileSync(path.join(navigatorsDir, 'TabNavigator.tsx'), tabNav);
      const drawerNav = generateTabDrawerDrawerNavigator(config, useI18n, useTheme);
      fs.writeFileSync(
        path.join(navigatorsDir, 'DrawerNavigator.tsx'),
        drawerNav
      );
    }
  }
}

async function setupExpoRouter(projectPath, useI18n, useAuthFlow = false, screenConfig = null, useTheme = false, pm) {
  log.info('Installing Expo Router...');
  await executeCommand(
    'npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar react-dom'
  );

  // Add scheme for expo-linking (required by Expo Router)
  const appJsonPath = path.join(projectPath, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.expo) {
      const projectName = path.basename(projectPath);
      appJson.expo.scheme = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
      log.info('Added scheme to app.json for Expo Router linking');
    }
  }

  const config = screenConfig || {
    hasAuth: false,
    navigationPattern: NAVIGATION_PATTERNS.STACK,
    screens: ['Home', 'Details'],
    initialScreen: 'Home',
  };

  const pattern = config.navigationPattern || NAVIGATION_PATTERNS.STACK;

  // Install drawer support for Expo Router if needed
  if (
    pattern === NAVIGATION_PATTERNS.DRAWER ||
    pattern === NAVIGATION_PATTERNS.TABS_DRAWER
  ) {
    await executeCommand(
      'npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated react-native-worklets'
    );

    // Add reanimated babel plugin (must be last in plugins array)
    const { readBabelConfig, writeBabelConfig } = require('../utils/babel-config');
    const babelConfig = readBabelConfig(projectPath);
    if (babelConfig) {
      if (!babelConfig.plugins) babelConfig.plugins = [];
      if (!babelConfig.plugins.includes('react-native-reanimated/plugin')) {
        babelConfig.plugins.push('react-native-reanimated/plugin');
      }
      writeBabelConfig(projectPath, babelConfig);
    }
  }

  // Update package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.main = 'expo-router/entry';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Create app directory structure
  const appDir = path.join(projectPath, 'app');
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir);
  }

  // Don't create layout here if auth flow is enabled - it will be created later
  if (!useAuthFlow) {
    // Root _layout.tsx
    const layout = generateExpoRouterLayout(config, useI18n, useTheme);
    fs.writeFileSync(path.join(appDir, '_layout.tsx'), layout);

    // Create group layouts for tabs/drawer
    if (pattern === NAVIGATION_PATTERNS.TABS) {
      const tabsDir = path.join(appDir, '(tabs)');
      if (!fs.existsSync(tabsDir)) {
        fs.mkdirSync(tabsDir, { recursive: true });
      }
      const tabsLayout = generateExpoRouterTabsLayout(config, useI18n, false, useTheme);
      fs.writeFileSync(path.join(tabsDir, '_layout.tsx'), tabsLayout);
    } else if (pattern === NAVIGATION_PATTERNS.DRAWER) {
      const drawerDir = path.join(appDir, '(drawer)');
      if (!fs.existsSync(drawerDir)) {
        fs.mkdirSync(drawerDir, { recursive: true });
      }
      const drawerLayout = generateExpoRouterDrawerLayout(config, useI18n, useTheme);
      fs.writeFileSync(path.join(drawerDir, '_layout.tsx'), drawerLayout);
    } else if (pattern === NAVIGATION_PATTERNS.TABS_DRAWER) {
      const drawerDir = path.join(appDir, '(drawer)');
      const tabsDir = path.join(drawerDir, '(tabs)');
      if (!fs.existsSync(tabsDir)) {
        fs.mkdirSync(tabsDir, { recursive: true });
      }
      const drawerLayout = generateExpoRouterDrawerLayout(config, useI18n, useTheme);
      fs.writeFileSync(path.join(drawerDir, '_layout.tsx'), drawerLayout);
      const tabsLayout = generateExpoRouterTabsLayout(config, useI18n, true, useTheme);
      fs.writeFileSync(path.join(tabsDir, '_layout.tsx'), tabsLayout);
    }
  }

  log.success('Expo Router configured with TypeScript');
}

function createExampleScreens(
  projectPath,
  useExpoRouter,
  useI18n,
  useAuthFlow = false,
  screenConfig = null,
  options = {}
) {
  const config = screenConfig || {
    hasAuth: false,
    navigationPattern: NAVIGATION_PATTERNS.STACK,
    screens: ['Home', 'Details'],
    initialScreen: 'Home',
  };

  const useTheme = options.useTheme || false;

  createDynamicScreens(projectPath, config, {
    useExpoRouter,
    useI18n,
    useTheme,
  });

  // For React Navigation, also create App.tsx
  if (!useExpoRouter) {
    const pattern = config.navigationPattern || NAVIGATION_PATTERNS.STACK;
    const needsGestureHandler =
      pattern === NAVIGATION_PATTERNS.DRAWER ||
      pattern === NAVIGATION_PATTERNS.TABS_DRAWER;

    const themeImport = useTheme ? "import { ThemeProvider } from '@theme';\n" : '';
    const appContent = useTheme
      ? '<ThemeProvider>\n      <AppNavigator />\n    </ThemeProvider>'
      : '<AppNavigator />';

    const appTsx = `import React from 'react';
import AppNavigator from './src/AppNavigator';
${useI18n ? "import '@i18n/i18n';" : ''}
${needsGestureHandler ? "import 'react-native-gesture-handler';" : ''}
${themeImport}
function App(): React.JSX.Element {
  return ${useTheme ? '(\n    ' : ''}${appContent}${useTheme ? '\n  )' : ''};
}

export default App;`;

    fs.writeFileSync(path.join(projectPath, 'App.tsx'), appTsx);
  }

  log.success('Example screens created with full TypeScript typing');
}

module.exports = {
  setupReactNavigation,
  setupExpoRouter,
  createExampleScreens,
};
