/**
 * Screen Templates Index
 * Centralized export for all screen templates
 */

const { getIntroScreenTemplate } = require('./IntroScreen');
const { getLoginScreenTemplate } = require('./LoginScreen');
const { getPublicHomeScreenTemplate } = require('./PublicHomeScreen');
const { getPrivateHomeScreenTemplate } = require('./PrivateHomeScreen');
const { getProfileScreenTemplate } = require('./ProfileScreen');
const { getSettingsScreenTemplate } = require('./SettingsScreen');
const { getDetailsScreenTemplate } = require('./DetailsScreen');
const { getGenericScreenTemplate } = require('./GenericScreen');
const { FRAMEWORKS, getScreenFileName } = require('./adapter');

/**
 * Get all screen templates for a given framework
 */
function getAllScreenTemplates(framework) {
  return {
    IntroScreen: getIntroScreenTemplate(framework),
    LoginScreen: getLoginScreenTemplate(framework),
    PublicHomeScreen: getPublicHomeScreenTemplate(framework),
    PrivateHomeScreen: getPrivateHomeScreenTemplate(framework),
    ProfileScreen: getProfileScreenTemplate(framework),
    SettingsScreen: getSettingsScreenTemplate(framework),
    DetailsScreen: getDetailsScreenTemplate(framework),
  };
}

/**
 * Get file name for a screen based on framework
 */
function getScreenFile(framework, screenName) {
  return getScreenFileName(framework, screenName);
}

/**
 * Map of screen names that have specialized templates
 */
const SPECIALIZED_TEMPLATES = {
  Intro: getIntroScreenTemplate,
  Login: getLoginScreenTemplate,
  PublicHome: getPublicHomeScreenTemplate,
  PrivateHome: getPrivateHomeScreenTemplate,
  Profile: getProfileScreenTemplate,
  Settings: getSettingsScreenTemplate,
  Details: getDetailsScreenTemplate,
};

/**
 * Get screen template for a given name.
 * Uses specialized template if available, otherwise generic.
 * @param {string} framework - 'react-navigation' or 'expo-router'
 * @param {string} screenName - PascalCase screen name
 * @param {object} options - { useI18n: boolean }
 */
function getScreenTemplateForName(framework, screenName, options = {}) {
  if (options.useAuthFlow) {
    const specialized = SPECIALIZED_TEMPLATES[screenName];
    if (specialized) {
      return specialized(framework, options);
    }
    // Force Details template for first stack screen with custom name
    if (options.useDetailsTemplate) {
      return getDetailsScreenTemplate(framework, { ...options, screenName });
    }
  }
  return getGenericScreenTemplate(framework, screenName, options);
}

module.exports = {
  FRAMEWORKS,
  getAllScreenTemplates,
  getScreenFile,
  getScreenTemplateForName,
  getIntroScreenTemplate,
  getLoginScreenTemplate,
  getPublicHomeScreenTemplate,
  getPrivateHomeScreenTemplate,
  getProfileScreenTemplate,
  getSettingsScreenTemplate,
  getDetailsScreenTemplate,
  getGenericScreenTemplate,
};
