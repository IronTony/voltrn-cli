/**
 * IntroScreen Template
 * Template for the intro/welcome screen
 */

const INTRO_SCREEN_TEMPLATE = `import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
{{NAVIGATION_IMPORT}}
import { useTranslation } from 'react-i18next';

{{NAVIGATION_TYPE}}

{{FUNCTION_SIGNATURE}}
  const { t } = useTranslation();
  {{NAVIGATION_HOOK}}

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('IntroScreen.welcome')}</Text>
      <Text style={styles.description}>
        {t('IntroScreen.description')}
      </Text>

      <View style={styles.buttonsContainer}>
        <Pressable
          style={[styles.button, styles.publicButton]}
          onPress={() => {{PUBLIC_HOME_ROUTE}}}
        >
          <Text style={styles.buttonText}>{t('IntroScreen.continueAsGuest')}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.loginButton]}
          onPress={() => {{LOGIN_ROUTE}}}
        >
          <Text style={styles.buttonText}>{t('IntroScreen.login')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#7f8c8d',
    lineHeight: 26,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 15,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  publicButton: {
    backgroundColor: '#95a5a6',
  },
  loginButton: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
});

export default IntroScreen;
`;

function getIntroScreenTemplate(framework, options = {}) {
  const { renderTemplate, applyTheme } = require('./adapter');

  const routes = {
    PUBLIC_HOME_ROUTE: options.firstPublicScreen || 'PublicHome',
    LOGIN_ROUTE: 'Login',
  };

  let rendered = renderTemplate(INTRO_SCREEN_TEMPLATE, framework, {
    screenName: 'Intro',
    componentName: 'IntroScreen',
    routes,
  });

  if (options.useTheme) {
    rendered = applyTheme(rendered);
  }

  return rendered;
}

module.exports = {
  INTRO_SCREEN_TEMPLATE,
  getIntroScreenTemplate,
};
