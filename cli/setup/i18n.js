const fs = require('fs');
const path = require('path');
const { executeCommand } = require('../utils/commands');
const { log } = require('../utils/logger');
const { parseJsonFile } = require('../utils/config');
const {
  updateBabelAliases,
  writeBabelConfig,
} = require('../utils/babel-config');

function setupI18n(projectPath, isExpo, pm) {
  log.info('Installing i18next with TypeScript support...');
  executeCommand(
    pm.add('i18next react-i18next react-native-mmkv react-native-nitro-modules')
  );
  if (isExpo) {
    executeCommand('npx expo install react-native-localize');
    executeCommand(
      pm.addDev('babel-plugin-module-resolver babel-preset-expo @expo/config-plugins')
    );
  } else {
    executeCommand(pm.add('react-native-localize'));
    executeCommand(pm.addDev('babel-plugin-module-resolver'));
  }

  // Ensure src directory exists (for both Expo and React Native CLI)
  const srcDir = path.join(projectPath, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir);
  }

  // Create i18n directory inside src
  const i18nDir = path.join(srcDir, 'i18n');
  if (!fs.existsSync(i18nDir)) {
    fs.mkdirSync(i18nDir, { recursive: true });
  }

  // Create locales directory
  const localesDir = path.join(i18nDir, 'locales');
  if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir);
  }

  // Create translation files
  const translations = {
    en: {
      common: {
        english: 'English',
        italian: 'Italian',
        language: 'Language',
        goTo: 'Go to',
        goBack: 'Go Back',
      },
      HomeScreen: {
        title: 'Home',
        description:
          'This is a boilerplate React Native application with navigation and i18n support.',
      },
      DetailsScreen: {
        title: 'Details',
        description: 'This is the details page of your application.',
      },
    },
    it: {
      common: {
        english: 'Inglese',
        italian: 'Italiano',
        language: 'Lingua',
        goTo: 'Vai a',
        goBack: 'Indietro',
      },
      HomeScreen: {
        title: 'Home',
        description:
          'Questo è un boilerplate React Native con navigazione e supporto i18n.',
      },
      DetailsScreen: {
        title: 'Dettaglio',
        description: 'Questa è la pagina dei dettagli della tua applicazione.',
      },
    },
  };

  fs.writeFileSync(
    path.join(localesDir, 'en.json'),
    JSON.stringify(translations.en, null, 2)
  );
  fs.writeFileSync(
    path.join(localesDir, 'it.json'),
    JSON.stringify(translations.it, null, 2)
  );

  // Create languageConfig.ts
  const languageConfig = `// Import here your languages
import en from './locales/en.json';
import it from './locales/it.json';

// Set here you favourite default language
export const defaultLanguage = 'en';

// Export here your language files import
// Structure resources with namespace wrapping
export const languagesResources = {
  en: {
    common: en,
  },
  it: {
    common: it,
  },
};
`;

  fs.writeFileSync(path.join(i18nDir, 'languageConfig.ts'), languageConfig);

  // Create mmkv directory inside src (srcDir already defined above)
  const mmkvDir = path.join(srcDir, 'mmkv');
  if (!fs.existsSync(mmkvDir)) {
    fs.mkdirSync(mmkvDir, { recursive: true });
  }

  // Create mmkv storage setup
  const mmkvSetup = `import { createMMKV } from 'react-native-mmkv';

export const MMKVStorage = createMMKV({
  id: 'user-starter-storage', // please change this one according to your project
});
`;

  fs.writeFileSync(path.join(mmkvDir, 'index.ts'), mmkvSetup);

  // Create languageDetector.ts
  const languageDetector = `import { MMKVStorage } from '@mmkv';
import { findBestLanguageTag } from 'react-native-localize';
import { defaultLanguage, languagesResources } from './languageConfig';

const LOCALE_PERSISTENCE_KEY = 'app_locale';

const noop = (): void => {
  // Do nothing
};

const RNLanguageDetector = {
  type: 'languageDetector',
  async: true,
  detect: (cb: (detectedLocale: string) => void): void => {
    try {
      // Retrieve cached locale
      const persistedLocale = MMKVStorage.getString(LOCALE_PERSISTENCE_KEY);

      // If not found, detect from device
      if (!persistedLocale) {
        // Find best available language from the resource ones
        const languageTags = Object.keys(languagesResources);
        const detectedLocale = findBestLanguageTag(languageTags);

        // Return detected locale or default language
        return cb(detectedLocale?.languageTag ?? defaultLanguage);
      }

      cb(persistedLocale);
    } catch {
      console.warn('Failed to detect locale!');
      console.warn('Will use defaultLanguage:', defaultLanguage);

      cb(defaultLanguage);
    }
  },
  init: noop,
  cacheUserLanguage: (locale: string): void => {
    MMKVStorage.set(LOCALE_PERSISTENCE_KEY, locale);
  },
};

export default RNLanguageDetector;
`;

  fs.writeFileSync(path.join(i18nDir, 'languageDetector.ts'), languageDetector);

  // Create i18n.ts config
  const i18nConfig = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Text } from 'react-native';
import { defaultLanguage, languagesResources } from './languageConfig';
import RNLanguageDetector from './languageDetector';

i18n
  // @ts-ignore
  .use(RNLanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // @ts-ignore
    debug: process.env.NODE_ENV === 'development',
    resources: languagesResources,
    compatibilityJSON: 'v3',
    // language to use if translations in user language are not available.
    fallbackLng: defaultLanguage,

    ns: ['common'],
    defaultNS: 'common',

    // Use dot notation for both namespaces and keys
    keySeparator: '.',
    nsSeparator: false, // Disable namespace separator to use dots for nested keys only

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
      defaultTransParent: Text,
      transSupportBasicHtmlNodes: false,
    },
  });

export default i18n;
`;

  fs.writeFileSync(path.join(i18nDir, 'i18n.ts'), i18nConfig);

  // Create utils directory inside i18n
  const i18nUtilsDir = path.join(i18nDir, 'utils');
  if (!fs.existsSync(i18nUtilsDir)) {
    fs.mkdirSync(i18nUtilsDir);
  }

  // Create i18n utils
  const i18nUtils = `import i18n from '@i18n/i18n';

export const switchLocaleTo = (locale: string) => {
  i18n.changeLanguage(locale);
};
`;

  fs.writeFileSync(path.join(i18nUtilsDir, 'index.ts'), i18nUtils);

  // Update tsconfig.json to include i18n-specific path aliases
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  const tsconfig = parseJsonFile(tsconfigPath);

  if (!tsconfig.compilerOptions) {
    tsconfig.compilerOptions = {};
  }

  // Set baseUrl for better path resolution
  if (!tsconfig.compilerOptions.baseUrl) {
    tsconfig.compilerOptions.baseUrl = '.';
  }

  if (!tsconfig.compilerOptions.paths) {
    tsconfig.compilerOptions.paths = {};
  }

  // Add i18n-specific path aliases
  tsconfig.compilerOptions.paths['@mmkv'] = ['./src/mmkv'];
  tsconfig.compilerOptions.paths['@i18n/*'] = ['./src/i18n/*'];

  // Add general aliases if not already present
  if (!tsconfig.compilerOptions.paths['@components/*']) {
    tsconfig.compilerOptions.paths['@components/*'] = ['./src/components/*'];
  }
  if (!tsconfig.compilerOptions.paths['@screens/*']) {
    tsconfig.compilerOptions.paths['@screens/*'] = ['./src/screens/*'];
  }

  // Add @navigation alias if react-navigation is used (navigation.d.ts exists)
  if (fs.existsSync(path.join(projectPath, 'navigation.d.ts'))) {
    tsconfig.compilerOptions.paths['@navigation'] = ['./navigation.d.ts'];
  }

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

  // Update babel.config.js to include path aliases
  const preset = isExpo
    ? 'babel-preset-expo'
    : 'module:@react-native/babel-preset';

  const aliases = {
    '@mmkv': './src/mmkv',
    '@i18n': './src/i18n',
    '@components': './src/components',
    '@screens': './src/screens',
  };

  // Add @navigation alias if react-navigation is used
  if (fs.existsSync(path.join(projectPath, 'navigation.d.ts'))) {
    aliases['@navigation'] = './navigation.d.ts';
  }

  const babelConfig = updateBabelAliases(projectPath, aliases, preset);
  writeBabelConfig(projectPath, babelConfig);

  log.success('i18next configured with MMKV storage and language detector');
  log.success('Babel configured with module resolver for path aliases');

  // Add reminder for Expo projects using MMKV
  if (isExpo) {
    log.warning(
      '⚠️  IMPORTANT: Since this project uses react-native-mmkv, you need to run "npx expo prebuild" before starting the app to generate native code.'
    );
  }
}

module.exports = {
  setupI18n,
};
