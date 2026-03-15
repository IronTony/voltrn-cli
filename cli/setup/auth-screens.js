const fs = require('fs');
const path = require('path');
const { log } = require('../utils/logger');
const {
  getScreenTemplateForName,
  getScreenFile,
  FRAMEWORKS,
} = require('../templates/screens');
const { toDisplayTitle } = require('../templates/screens/GenericScreen');

function createAuthScreens(
  projectPath,
  useExpoRouter = false,
  screenConfig = null,
  options = {},
) {
  const config = screenConfig || {
    hasAuth: true,
    fixedScreens: ['Intro', 'Login'],
    publicScreens: ['PublicHome'],
    privateTabScreens: ['PrivateHome', 'Profile', 'Settings'],
    privateStackScreens: ['Details'],
  };

  const useTheme = options.useTheme || false;

  const framework = useExpoRouter
    ? FRAMEWORKS.EXPO_ROUTER
    : FRAMEWORKS.REACT_NAVIGATION;

  // Update i18n translations for auth screens (including theme keys if enabled)
  updateAuthTranslations(projectPath, config, useTheme);

  // For React Navigation, create all screens in src/screens
  if (!useExpoRouter) {
    const screensDir = path.join(projectPath, 'src', 'screens');
    if (!fs.existsSync(screensDir)) {
      fs.mkdirSync(screensDir, { recursive: true });
    }

    const allScreens = [
      ...config.fixedScreens,
      ...config.publicScreens,
      ...config.privateTabScreens,
      ...config.privateStackScreens,
    ];

    allScreens.forEach((name) => {
      const opts = { useI18n: true, useAuthFlow: true, useTheme };

      // If this is a public screen, add navTargets to other public screens
      if (config.publicScreens.includes(name)) {
        opts.navTargets = config.publicScreens.filter((s) => s !== name);
      }

      // Pass all private stack screens to first tab so it can generate nav buttons
      // privateStackScreens is used by PrivateHome specialized template
      // navTargets is used by GenericScreen template (for custom-named tab screens)
      if (config.privateTabScreens[0] === name) {
        opts.privateStackScreens = config.privateStackScreens;
        opts.navTargets = config.privateStackScreens;
      }

      // Pass first public screen to Intro so it navigates to the right screen
      if (name === 'Intro') {
        opts.firstPublicScreen = config.publicScreens[0];
      }

      // Add language switcher to first public screen if it's custom-named
      if (config.publicScreens[0] === name && name !== 'PublicHome') {
        opts.showLanguageSwitcher = true;
      }

      // Add logout to last tab screen (mirrors default Profile position)
      if (name === config.privateTabScreens[config.privateTabScreens.length - 1]) {
        opts.showLogout = true;
        // Add theme toggle if Settings is not among tab screens
        if (useTheme && !config.privateTabScreens.includes('Settings')) {
          opts.showThemeToggle = true;
        }
      }

      // Use Details template for first stack screen (shows user profile data)
      if (name === config.privateStackScreens[0]) {
        opts.useDetailsTemplate = true;
      }

      const template = getScreenTemplateForName(framework, name, opts);
      const fileName = getScreenFile(framework, `${name}Screen`);
      fs.writeFileSync(path.join(screensDir, fileName), template);
    });
  }

  // For Expo Router, delegate to auth-navigator-expo.js for file-based routing
  if (useExpoRouter) {
    const {
      createExpoRouterAuthScreensImpl,
    } = require('./auth-navigator-expo');
    createExpoRouterAuthScreensImpl(projectPath, config, { useTheme });
  }

  const allScreens = [
    ...config.fixedScreens,
    ...config.publicScreens,
    ...config.privateTabScreens,
    ...config.privateStackScreens,
  ];
  log.success(`Auth screens created (${allScreens.join(', ')})`);
}

/**
 * Known screen translations that have specialized content
 */
const KNOWN_EN_TRANSLATIONS = {
  IntroScreen: {
    welcome: 'Welcome!',
    description: 'Choose how you want to continue with the app',
    continueAsGuest: 'Continue as Guest',
    login: 'Login',
  },
  LoginScreen: {
    title: 'Login',
    subtitle: 'Enter your details to continue',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    loginButton: 'Login',
    loading: 'Loading...',
    back: 'Back',
    error: 'Error',
    fillAllFields: 'Please fill in all fields',
    loginFailed: 'Login failed. Please try again.',
  },
  PublicHomeScreen: {
    title: 'Public Home',
    description: 'You are browsing as a guest. Login to access more features.',
    backToIntro: 'Back to Intro',
  },
  PrivateHomeScreen: {
    welcome: 'Welcome back!',
    title: 'Private Home',
    description: 'You have full access to all features',
  },
  ProfileScreen: {
    title: 'Profile',
    accessToken: 'Access Token',
    refreshToken: 'Refresh Token',
    logout: 'Logout',
  },
  SettingsScreen: {
    title: 'Settings',
    description: 'Configure your app settings here',
  },
  DetailsScreen: {
    title: 'Profile Details',
    details: 'Details Screen',
    description: 'This is the details page of your application.',
    goBack: 'Go Back',
    loading: 'Loading profile...',
    error: 'Error',
    noToken: 'No access token available',
    fetchError: 'Failed to fetch profile data',
    noData: 'No profile data available',
    id: 'ID',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    password: 'Password',
  },
};

const KNOWN_IT_TRANSLATIONS = {
  IntroScreen: {
    welcome: 'Benvenuto!',
    description: "Scegli come vuoi continuare con l'app",
    continueAsGuest: 'Continua come Ospite',
    login: 'Accedi',
  },
  LoginScreen: {
    title: 'Accedi',
    subtitle: 'Inserisci i tuoi dati per continuare',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    loginButton: 'Accedi',
    loading: 'Caricamento...',
    back: 'Indietro',
    error: 'Errore',
    fillAllFields: 'Compila tutti i campi',
    loginFailed: 'Accesso fallito. Riprova.',
  },
  PublicHomeScreen: {
    title: 'Home Pubblica',
    description:
      'Stai navigando come ospite. Accedi per accedere a più funzionalità.',
    backToIntro: "Torna all'Intro",
  },
  PrivateHomeScreen: {
    welcome: 'Bentornato!',
    title: 'Home Privata',
    description: 'Hai accesso completo a tutte le funzionalità',
  },
  ProfileScreen: {
    title: 'Profilo',
    accessToken: 'Token di Accesso',
    refreshToken: 'Token di Refresh',
    logout: 'Esci',
  },
  SettingsScreen: {
    title: 'Impostazioni',
    description: "Configura le impostazioni dell'app qui",
  },
  DetailsScreen: {
    title: 'Profilo',
    details: 'Dettaglio',
    description: 'Questa è la pagina dei dettagli della tua applicazione.',
    goBack: 'Indietro',
    loading: 'Caricamento profilo...',
    error: 'Errore',
    noToken: 'Token di accesso non disponibile',
    fetchError: 'Impossibile recuperare i dati del profilo',
    noData: 'Nessun dato del profilo disponibile',
    id: 'ID',
    name: 'Nome',
    email: 'Email',
    role: 'Ruolo',
    password: 'Password',
  },
};

function updateAuthTranslations(projectPath, config, useTheme = false) {
  const localesDir = path.join(projectPath, 'src', 'i18n', 'locales');

  const allScreens = [
    ...config.fixedScreens,
    ...config.publicScreens,
    ...config.privateTabScreens,
    ...config.privateStackScreens,
  ];

  // --- English translations ---
  const enJsonPath = path.join(localesDir, 'en.json');
  const enTranslations = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));

  // Add common auth translations
  if (!enTranslations.common) enTranslations.common = {};
  enTranslations.common.logout = 'Logout';
  enTranslations.common.accessToken = 'Access Token';
  enTranslations.common.refreshToken = 'Refresh Token';
  enTranslations.common.language = 'Language';
  enTranslations.common.english = 'English';
  enTranslations.common.italian = 'Italiano';

  if (useTheme) {
    enTranslations.common.themeAppearance = 'Appearance';
    enTranslations.common.themeLight = 'Light';
    enTranslations.common.themeDark = 'Dark';
    enTranslations.common.themeSystem = 'System';
  }

  allScreens.forEach((name) => {
    const key = `${name}Screen`;
    if (KNOWN_EN_TRANSLATIONS[key]) {
      enTranslations[key] = KNOWN_EN_TRANSLATIONS[key];
    } else {
      // Generate generic translations for custom screens
      const displayTitle = toDisplayTitle(name);
      enTranslations[key] = {
        title: displayTitle,
        description: `Welcome to the ${displayTitle} screen.`,
      };
    }
  });

  // Add goTo<ScreenName> keys to first tab screen for each private stack screen
  const enFirstTabKey = `${config.privateTabScreens[0]}Screen`;
  if (!enTranslations[enFirstTabKey]) enTranslations[enFirstTabKey] = {};
  config.privateStackScreens.forEach((name) => {
    const displayTitle = toDisplayTitle(name);
    enTranslations[enFirstTabKey][`goTo${name}`] = `Go to ${displayTitle}`;
  });

  // Copy Details translations to first custom stack screen (for user profile data)
  const firstStack = config.privateStackScreens[0];
  if (firstStack !== 'Details') {
    const firstStackKey = `${firstStack}Screen`;
    enTranslations[firstStackKey] = {
      ...KNOWN_EN_TRANSLATIONS.DetailsScreen,
      title: toDisplayTitle(firstStack),
    };
  }

  // TabNavigator translations - dynamic based on config
  const tabNav = { tabBarLabels: {} };
  config.privateTabScreens.forEach((name) => {
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);
    const displayTitle = toDisplayTitle(name);
    tabNav[camelName] = displayTitle;
    tabNav.tabBarLabels[camelName] = displayTitle;
  });
  enTranslations.TabNavigator = tabNav;

  // AppNavigator translations - dynamic
  const appNav = { mainTabs: 'Home' };
  config.publicScreens.forEach((name) => {
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);
    appNav[camelName] = toDisplayTitle(name);
  });
  config.privateStackScreens.forEach((name) => {
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);
    appNav[camelName] = toDisplayTitle(name);
  });
  enTranslations.AppNavigator = appNav;

  fs.writeFileSync(enJsonPath, JSON.stringify(enTranslations, null, 2));

  // --- Italian translations ---
  const itJsonPath = path.join(localesDir, 'it.json');
  const itTranslations = JSON.parse(fs.readFileSync(itJsonPath, 'utf8'));

  // Add common auth translations
  if (!itTranslations.common) itTranslations.common = {};
  itTranslations.common.logout = 'Esci';
  itTranslations.common.accessToken = 'Token di Accesso';
  itTranslations.common.refreshToken = 'Token di Refresh';
  itTranslations.common.language = 'Lingua';
  itTranslations.common.english = 'English';
  itTranslations.common.italian = 'Italiano';

  if (useTheme) {
    itTranslations.common.themeAppearance = 'Aspetto';
    itTranslations.common.themeLight = 'Chiaro';
    itTranslations.common.themeDark = 'Scuro';
    itTranslations.common.themeSystem = 'Sistema';
  }

  allScreens.forEach((name) => {
    const key = `${name}Screen`;
    if (KNOWN_IT_TRANSLATIONS[key]) {
      itTranslations[key] = KNOWN_IT_TRANSLATIONS[key];
    } else {
      const displayTitle = toDisplayTitle(name);
      itTranslations[key] = {
        title: displayTitle,
        description: `Benvenuto nella schermata ${displayTitle}.`,
      };
    }
  });

  // Add goTo<ScreenName> keys to first tab screen for each private stack screen
  const itFirstTabKey = `${config.privateTabScreens[0]}Screen`;
  if (!itTranslations[itFirstTabKey]) itTranslations[itFirstTabKey] = {};
  config.privateStackScreens.forEach((name) => {
    const displayTitle = toDisplayTitle(name);
    itTranslations[itFirstTabKey][`goTo${name}`] = `Vai a ${displayTitle}`;
  });

  // Copy Details translations to first custom stack screen (for user profile data)
  const firstStackIt = config.privateStackScreens[0];
  if (firstStackIt !== 'Details') {
    const firstStackKeyIt = `${firstStackIt}Screen`;
    itTranslations[firstStackKeyIt] = {
      ...KNOWN_IT_TRANSLATIONS.DetailsScreen,
      title: toDisplayTitle(firstStackIt),
    };
  }

  // TabNavigator translations
  const itTabNav = { tabBarLabels: {} };
  config.privateTabScreens.forEach((name) => {
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);
    const displayTitle = toDisplayTitle(name);
    itTabNav[camelName] = displayTitle;
    itTabNav.tabBarLabels[camelName] = displayTitle;
  });
  itTranslations.TabNavigator = itTabNav;

  // AppNavigator translations
  const itAppNav = { mainTabs: 'Home' };
  config.publicScreens.forEach((name) => {
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);
    itAppNav[camelName] = toDisplayTitle(name);
  });
  config.privateStackScreens.forEach((name) => {
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);
    itAppNav[camelName] = toDisplayTitle(name);
  });
  itTranslations.AppNavigator = itAppNav;

  fs.writeFileSync(itJsonPath, JSON.stringify(itTranslations, null, 2));
}

module.exports = {
  createAuthScreens,
};
