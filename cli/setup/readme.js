/**
 * README.md Generator
 * Generates a project-specific README based on CLI options selected during creation.
 */

const fs = require('fs');
const path = require('path');
const { log } = require('../utils/logger');
const { NAVIGATION_PATTERNS } = require('../utils/screen-config');

const PATTERN_LABELS = {
  [NAVIGATION_PATTERNS.STACK]: 'Stack',
  [NAVIGATION_PATTERNS.TABS]: 'Bottom Tabs',
  [NAVIGATION_PATTERNS.DRAWER]: 'Drawer',
  [NAVIGATION_PATTERNS.TABS_DRAWER]: 'Tabs + Drawer',
};

function buildHeader(projectName) {
  return `# ${projectName}

This project was bootstrapped with [VoltRN Boilerplate CLI](https://www.npmjs.com/package/create-voltrn-boilerplate).`;
}

function buildFeatures(
  isExpo,
  useExpoRouter,
  useI18n,
  useAuthFlow,
  useTheme,
  screenConfig,
) {
  const framework = isExpo
    ? 'Expo (managed workflow)'
    : 'React Native CLI (bare workflow)';
  const navigation = useExpoRouter
    ? 'Expo Router (file-based routing)'
    : 'React Navigation';

  const lines = [
    '## Features',
    '',
    `- **Framework:** ${framework}`,
    `- **Navigation:** ${navigation}`,
  ];

  if (!useAuthFlow && screenConfig.navigationPattern) {
    const label = PATTERN_LABELS[screenConfig.navigationPattern] || 'Stack';
    lines.push(`- **Navigation Pattern:** ${label}`);
  }

  if (useI18n) {
    lines.push(
      '- **Internationalization (i18n):** react-i18next with MMKV storage',
    );
  }

  if (useAuthFlow) {
    lines.push(
      '- **Authentication:** JWT-based auth flow with @forward-software/react-auth',
    );
  }

  if (useTheme) {
    lines.push(
      '- **Theming:** Dark/Light mode with system detection and MMKV persistence',
    );
  }

  lines.push('- **Splash Screen:** react-native-bootsplash with auto-hide');
  lines.push('- **App Icons:** @forward-software/react-native-toolbox');
  lines.push('- **TypeScript:** Strict mode enabled');

  return lines.join('\n');
}

function buildPrerequisites(isExpo) {
  const lines = [
    '## Prerequisites',
    '',
    '- [Node.js](https://nodejs.org/) (v18 or higher)',
  ];

  if (isExpo) {
    lines.push('- Expo CLI (`npx expo`)');
  } else {
    lines.push(
      '- [Xcode](https://developer.apple.com/xcode/) (for iOS development)',
    );
    lines.push(
      '- [Android Studio](https://developer.android.com/studio) (for Android development)',
    );
    lines.push('- [CocoaPods](https://cocoapods.org/) (for iOS dependencies)');
  }

  lines.push(
    '- [Watchman](https://facebook.github.io/watchman/) (recommended)',
  );

  return lines.join('\n');
}

function buildGettingStarted(projectName, isExpo, useI18n, useTheme, pm) {
  const lines = [
    '## Getting Started',
    '',
    '```bash',
    `cd ${projectName}`,
    pm.install,
  ];

  if (isExpo) {
    lines.push('');
    lines.push(
      '# Required: generate native code (react-native-bootsplash, react-native-mmkv, etc.)',
    );
    lines.push('npx expo prebuild');
  }

  lines.push('```');

  return lines.join('\n');
}

function buildRunningTheApp(isExpo) {
  const lines = ['## Running the App', ''];

  if (isExpo) {
    lines.push('**iOS:**');
    lines.push('```bash');
    lines.push('npx expo run:ios');
    lines.push('```');
    lines.push('');
    lines.push('**Android:**');
    lines.push('```bash');
    lines.push('npx expo run:android');
    lines.push('```');
  } else {
    lines.push('**iOS:**');
    lines.push('```bash');
    lines.push('npx react-native run-ios');
    lines.push('```');
    lines.push('');
    lines.push('**Android:**');
    lines.push('```bash');
    lines.push('npx react-native run-android');
    lines.push('```');
  }

  return lines.join('\n');
}

function buildAuthSection(useExpoRouter, screenConfig, pm) {
  const lines = [
    '## Authentication Flow',
    '',
    'This project includes a complete JWT-based authentication flow powered by [@forward-software/react-auth](https://www.npmjs.com/package/@forward-software/react-auth).',
    '',
    'The example uses the [Platzi Fake Store API](https://fakeapi.platzi.com/en/about/introduction/) as a demo backend.',
    '',
    '**Demo login credentials:**',
    '',
    '```',
    'Email:    john@mail.com',
    'Password: changeme',
    '```',
    '',
    '### Routes',
    '',
    '**Public:**',
  ];

  const fixedScreens = screenConfig.fixedScreens || ['Intro', 'Login'];
  const publicScreens = screenConfig.publicScreens || [];
  [...fixedScreens, ...publicScreens].forEach((s) => {
    lines.push(`- ${s}Screen`);
  });

  lines.push('');
  lines.push('**Private (Tabs):**');
  const tabScreens = screenConfig.privateTabScreens || [];
  tabScreens.forEach((s) => {
    lines.push(`- ${s}Screen`);
  });

  const stackScreens = screenConfig.privateStackScreens || [];
  if (stackScreens.length > 0) {
    lines.push('');
    lines.push('**Private (Stack):**');
    stackScreens.forEach((s) => {
      lines.push(`- ${s}Screen`);
    });
  }

  lines.push('');
  lines.push('### Environment Management');
  lines.push('');
  lines.push(
    'Environment variables are stored in `.env.*` files (gitignored):',
  );
  lines.push('');
  lines.push('- `.env.development` Development environment');
  lines.push('- `.env.staging` Staging environment');
  lines.push('- `.env.production` Production environment');
  lines.push('- `.env.example` Template with required keys (committed to git)');
  lines.push('');
  lines.push('Switch environments using:');
  lines.push('');
  lines.push('```bash');
  lines.push(`${pm.run('env:dev')}      # Development`);
  lines.push(`${pm.run('env:stage')}    # Staging`);
  lines.push(`${pm.run('env:prod')}     # Production`);
  lines.push('```');
  lines.push('');
  lines.push(
    'This generates `src/env/env.js` (also gitignored) which is imported via `@env/env`.',
  );

  return lines.join('\n');
}

function buildI18nSection(isExpo) {
  const lines = [
    '## Internationalization (i18n)',
    '',
    'This project uses [react-i18next](https://react.i18next.com/) with [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) for language persistence.',
    '',
    '### Translation Files',
    '',
    'Translations are located in `src/i18n/locales/`:',
    '',
    '- `en.json` - English (default)',
    '- `it.json` - Italian',
    '',
    '### Adding a New Language',
    '',
    '1. Create a new JSON file in `src/i18n/locales/` (e.g., `fr.json`)',
    '2. Add the language to `src/i18n/languageConfig.ts`',
    '3. Import and register it in `src/i18n/i18n.ts`',
  ];

  if (isExpo) {
    lines.push('');
    lines.push(
      '> **Note:** Since i18n uses `react-native-mmkv` (a native module), you must run `npx expo prebuild` before starting the app.',
    );
  }

  return lines.join('\n');
}

function buildThemeSection() {
  const lines = [
    '## Theming (Dark/Light Mode)',
    '',
    'This project includes a theming system with dark/light mode support.',
    '',
    '### Color Scheme Modes',
    '',
    '- **Light** - Light theme',
    '- **Dark** - Dark theme',
    '- **System** (default) - Follows device system preference',
    '',
    '### Usage',
    '',
    '```tsx',
    "import { useTheme } from '@theme';",
    '',
    'function MyComponent() {',
    '  const { theme, colorScheme, setColorScheme, isDark } = useTheme();',
    '',
    '  return (',
    '    <View style={{ backgroundColor: theme.colors.background }}>',
    '      <Text style={{ color: theme.colors.text }}>Hello</Text>',
    '    </View>',
    '  );',
    '}',
    '```',
    '',
    '### Customization',
    '',
    'Edit color tokens in `src/theme/colors.ts` to match your brand.',
    'The theme toggle is located in the Settings screen.',
    '',
    '### Persistence',
    '',
    'Theme preference is persisted using MMKV storage and restored on app launch.',
  ];

  return lines.join('\n');
}

function buildProjectStructure(
  isExpo,
  useExpoRouter,
  useI18n,
  useAuthFlow,
  useTheme,
  screenConfig,
) {
  const lines = ['## Project Structure', '', '```'];

  if (useExpoRouter) {
    lines.push('app/                    # File-based routing (Expo Router)');
    if (useAuthFlow) {
      lines.push('  (auth)/               # Auth route group');
      lines.push('  (tabs)/               # Tab route group');
    }
    lines.push('  _layout.tsx');
  }

  lines.push('src/');
  lines.push('  screens/              # Screen components');
  lines.push('  components/           # Reusable components');

  if (useI18n) {
    lines.push('  i18n/                 # Internationalization');
    lines.push('    locales/            # Translation files');
    lines.push('  mmkv/                 # MMKV storage setup');
  }

  if (useTheme) {
    lines.push('  theme/                # Theming system (dark/light mode)');
  }

  if (useAuthFlow) {
    lines.push('  auth/                 # Auth client (JWT)');
    lines.push('  hooks/                # Custom hooks');
    lines.push('  env/                  # Environment configuration');
  }

  if (!useExpoRouter) {
    lines.push('  navigators/           # Navigation setup');
    if (useAuthFlow) {
      lines.push('    TabNavigator.tsx');
    }
    lines.push('  AppNavigator.tsx      # Main navigator');
  }

  if (useAuthFlow) {
    lines.push('scripts/');
    lines.push('  set-environment.js    # Environment switching script');
  }

  if (!useExpoRouter) {
    lines.push('navigation.d.ts         # Navigation types');
  }

  lines.push('tsconfig.json');
  lines.push('babel.config.js');
  lines.push('```');

  return lines.join('\n');
}

function buildPathAliases(useExpoRouter, useI18n, useAuthFlow, useTheme) {
  const lines = [
    '## Path Aliases',
    '',
    'The following import aliases are configured in `babel.config.js` and `tsconfig.json`:',
    '',
    '| Alias | Path |',
    '|-------|------|',
    '| `@components/*` | `src/components/*` |',
    '| `@screens/*` | `src/screens/*` |',
  ];

  if (!useExpoRouter) {
    lines.push('| `@navigation` | `navigation.d.ts` |');
  }

  if (useI18n) {
    lines.push('| `@i18n/*` | `src/i18n/*` |');
    lines.push('| `@mmkv/*` | `src/mmkv/*` |');
  }

  if (useTheme) {
    lines.push('| `@theme` | `src/theme` |');
  }

  if (useAuthFlow) {
    lines.push('| `@auth/*` | `src/auth/*` |');
    lines.push('| `@hooks/*` | `src/hooks/*` |');
    lines.push('| `@env/*` | `src/env/*` |');
  }

  return lines.join('\n');
}

function buildAssetsSection(pm) {
  const lines = [
    '## App Icons & Splash Screen',
    '',
    'This project uses [react-native-bootsplash](https://github.com/zoontek/react-native-bootsplash) for splash screens and [@forward-software/react-native-toolbox](https://github.com/forwardsoftware/react-native-toolbox) for app icon generation.',
    '',
    '### Customize Splash Screen',
    '',
    '1. Replace `assets/splashscreen.svg` (or `.png`) with your own logo',
    '   - SVG recommended for best quality at all densities',
    '   - If using PNG: minimum **1024x1024px**',
    '2. Run:',
    '',
    '```bash',
    pm.run('assets:splash'),
    '```',
    '',
    'Available flags for customization:',
    '',
    '| Flag | Description | Default |',
    '|------|-------------|---------|',
    '| `--background` | Background color (hex) | `1A1A2E` |',
    '| `--logo-width` | Logo width at @1x in dp | `150` |',
    '| `--platforms` | Target platforms | `android,ios` |',
    '| `--dark-background` | Dark mode background (license key required) |  -|',
    '| `--dark-logo` | Dark mode logo path (license key required) |  -|',
    '',
    '### Customize App Icon',
    '',
    '1. Replace `assets/icon.png` with your own image (PNG format, minimum **1024x1024px**)',
    '2. Run:',
    '',
    '```bash',
    pm.run('assets:icons'),
    '```',
    '',
    'This generates all required sizes for both iOS and Android automatically.',
  ];

  return lines.join('\n');
}

function buildLicenseSection() {
  return `## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/).`;
}

function buildFooter() {
  return `---

Generated with [VoltRN Boilerplate CLI](https://www.npmjs.com/package/create-voltrn-boilerplate)`;
}

/**
 * Generate a project-specific README.md
 */
function generateReadme(projectPath, projectName, options) {
  const {
    isExpo,
    useExpoRouter,
    useI18n,
    useAuthFlow,
    useTheme = false,
    screenConfig,
    pm,
  } = options;

  const sections = [
    buildHeader(projectName),
    buildFeatures(
      isExpo,
      useExpoRouter,
      useI18n,
      useAuthFlow,
      useTheme,
      screenConfig,
    ),
    buildPrerequisites(isExpo),
    buildGettingStarted(projectName, isExpo, useI18n, useTheme, pm),
    buildRunningTheApp(isExpo),
  ];

  if (useAuthFlow) {
    sections.push(buildAuthSection(useExpoRouter, screenConfig, pm));
  }

  if (useI18n) {
    sections.push(buildI18nSection(isExpo));
  }

  if (useTheme) {
    sections.push(buildThemeSection());
  }

  sections.push(buildAssetsSection(pm));
  sections.push(
    buildProjectStructure(
      isExpo,
      useExpoRouter,
      useI18n,
      useAuthFlow,
      useTheme,
      screenConfig,
    ),
  );
  sections.push(
    buildPathAliases(useExpoRouter, useI18n, useAuthFlow, useTheme),
  );
  sections.push(buildLicenseSection());
  sections.push(buildFooter());

  const readme = sections.join('\n\n');
  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
  log.success('README.md generated');
}

module.exports = { generateReadme };
