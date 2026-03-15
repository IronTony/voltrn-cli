const fs = require('fs');
const path = require('path');
const { log } = require('../utils/logger');
const {
  getScreenTemplateForName,
  getScreenFile,
  FRAMEWORKS,
} = require('../templates/screens');
const { convertToExpoRouterPath } = require('../templates/screens/adapter');

function createExpoRouterAuthScreensImpl(projectPath, screenConfig = null, options = {}) {
  const config = screenConfig || {
    hasAuth: true,
    fixedScreens: ['Intro', 'Login'],
    publicScreens: ['PublicHome'],
    privateTabScreens: ['PrivateHome', 'Profile', 'Settings'],
    privateStackScreens: ['Details'],
  };

  const useTheme = options.useTheme || false;

  const appDir = path.join(projectPath, 'app');
  const framework = FRAMEWORKS.EXPO_ROUTER;

  // Create (auth) group for public routes
  const authGroupDir = path.join(appDir, '(auth)');
  if (!fs.existsSync(authGroupDir)) {
    fs.mkdirSync(authGroupDir, { recursive: true });
  }

  // Create (tabs) group for private routes
  const tabsGroupDir = path.join(appDir, '(tabs)');
  if (!fs.existsSync(tabsGroupDir)) {
    fs.mkdirSync(tabsGroupDir, { recursive: true });
  }

  // Create fixed auth screens in (auth) group
  config.fixedScreens.forEach((name) => {
    const opts = { useI18n: true, useAuthFlow: true, useTheme };
    if (name === 'Intro') {
      opts.firstPublicScreen = config.publicScreens[0];
    }
    const template = getScreenTemplateForName(framework, name, opts);
    const fileName = convertToExpoRouterPath(name) + '.tsx';
    fs.writeFileSync(path.join(authGroupDir, fileName), template);
  });

  // Create public screens in (auth) group
  config.publicScreens.forEach((name) => {
    const navTargets = config.publicScreens.filter(s => s !== name);
    const template = getScreenTemplateForName(framework, name, {
      useI18n: true,
      useAuthFlow: true,
      useTheme,
      navTargets,
    });
    const fileName = convertToExpoRouterPath(name) + '.tsx';
    fs.writeFileSync(path.join(authGroupDir, fileName), template);
  });

  // Create tab screens in (tabs) group
  config.privateTabScreens.forEach((name, index) => {
    const screenOpts = { useI18n: true, useAuthFlow: true, useTheme };
    // Pass all private stack screens to first tab (PrivateHome) so it can generate nav buttons
    if (index === 0) {
      screenOpts.privateStackScreens = config.privateStackScreens;
      screenOpts.navTargets = config.privateStackScreens;
    }
    // Add logout to last tab screen (mirrors default Profile position)
    if (index === config.privateTabScreens.length - 1) {
      screenOpts.showLogout = true;
    }
    const template = getScreenTemplateForName(framework, name, screenOpts);
    // First tab screen becomes index.tsx
    const fileName = index === 0 ? 'index.tsx' : convertToExpoRouterPath(name) + '.tsx';
    fs.writeFileSync(path.join(tabsGroupDir, fileName), template);
  });

  // Create private stack screens in app directory (outside groups, shared)
  config.privateStackScreens.forEach((name, index) => {
    const opts = { useI18n: true, useAuthFlow: true, useTheme };
    // Use Details template for first stack screen (shows user profile data)
    if (index === 0) {
      opts.useDetailsTemplate = true;
    }
    const template = getScreenTemplateForName(framework, name, opts);
    const fileName = convertToExpoRouterPath(name) + '.tsx';
    fs.writeFileSync(path.join(appDir, fileName), template);
  });

  const allScreens = [
    ...config.fixedScreens,
    ...config.publicScreens,
    ...config.privateTabScreens,
    ...config.privateStackScreens,
  ];
  log.success(`Expo Router file-based routing screens created (${allScreens.join(', ')})`);
}

module.exports = {
  createExpoRouterAuthScreensImpl,
};
