/**
 * PublicHomeScreen Template
 * Template for the public/home screen (guest access)
 */

const PUBLIC_HOME_SCREEN_TEMPLATE = `import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
{{NAVIGATION_IMPORT}}
import { useTranslation } from 'react-i18next';
{{I18N_IMPORTS}}

{{NAVIGATION_TYPE}}

{{FUNCTION_SIGNATURE}}
  const { t } = useTranslation();
  {{NAVIGATION_HOOK}}
  {{CURRENT_LOCALE}}

  const switchLocale = useCallback(
    (locale: string) => () => {
      switchLocaleTo(locale);
    },
    [],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('PublicHomeScreen.title')}</Text>
      <Text style={styles.description}>
        {t('PublicHomeScreen.description')}
      </Text>

      <Text style={styles.langTitle}>{t('common.language')}</Text>
      <View style={styles.languageButtonsContainer}>
        <Pressable
          style={[
            styles.languageButton,
            currentLocale === 'it'
              ? styles.activeButton
              : styles.inactiveButton,
          ]}
          onPress={switchLocale('it')}
        >
          <Text style={styles.languageButtonText}>{t('common.italian')}</Text>
        </Pressable>

        <Pressable
          style={[
            styles.languageButton,
            currentLocale === 'en'
              ? styles.activeButton
              : styles.inactiveButton,
          ]}
          onPress={switchLocale('en')}
        >
          <Text style={styles.languageButtonText}>{t('common.english')}</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.backButton}
        onPress={() => {{INTRO_ROUTE}}}
      >
        <Text style={styles.backButtonText}>{t('PublicHomeScreen.backToIntro')}</Text>
      </Pressable>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#7f8c8d',
    lineHeight: 24,
  },
  langTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 4,
  },
  languageButton: {
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#27ae60',
  },
  inactiveButton: {
    backgroundColor: '#e67e22',
  },
  languageButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  languageButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  backButton: {
    marginTop: 40,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
  },
});

export default PublicHomeScreen;
`;

function getPublicHomeScreenTemplate(framework, options = {}) {
  const { renderTemplate, FRAMEWORKS, getNavigateMethod, applyTheme } = require('./adapter');
  const { toDisplayTitle } = require('./GenericScreen');

  let template = PUBLIC_HOME_SCREEN_TEMPLATE;

  // Handle i18n imports
  if (framework === FRAMEWORKS.REACT_NAVIGATION) {
    template = template.replace(
      '{{I18N_IMPORTS}}',
      `import '@i18n/i18n';
import i18n from '@i18n/i18n';
import { switchLocaleTo } from '@i18n/utils';`
    );
    template = template.replace(
      '{{CURRENT_LOCALE}}',
      'const currentLocale = i18n.language;'
    );
  } else {
    template = template.replace(
      '{{I18N_IMPORTS}}',
      `import i18n from '@i18n/i18n';
import { switchLocaleTo } from '@i18n/utils';`
    );
    template = template.replace(
      '{{CURRENT_LOCALE}}',
      'const currentLocale = i18n.language;'
    );
  }

  const routes = {
    INTRO_ROUTE: 'Intro',
  };

  let rendered = renderTemplate(template, framework, {
    screenName: 'PublicHome',
    componentName: 'PublicHomeScreen',
    routes,
  });

  // Inject navigation buttons for other public screens
  const navTargets = options.navTargets || [];
  if (navTargets.length > 0) {
    // Build navigation buttons
    const buttons = navTargets.map((target) => {
      const navMethod = getNavigateMethod(framework, target);
      const targetTitle = toDisplayTitle(target);
      return `        <Pressable style={styles.navButton} onPress={() => ${navMethod}}>
          <Text style={styles.navButtonText}>{t('common.goTo')} ${targetTitle}</Text>
        </Pressable>`;
    }).join('\n');

    const navSection =
      `      <View style={styles.navSection}>\n` +
      buttons + '\n' +
      `      </View>\n`;

    // Insert nav section before the "Back to Intro" button
    rendered = rendered.replace(
      '      <Pressable\n        style={styles.backButton}',
      navSection + '\n      <Pressable\n        style={styles.backButton}'
    );

    // Add navigation styles before closing });
    rendered = rendered.replace(
      '});',
      `  navSection: {
    marginTop: 20,
    gap: 12,
  },
  navButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});`
    );
  }

  if (options.useTheme) {
    rendered = applyTheme(rendered);
  }

  return rendered;
}

module.exports = {
  PUBLIC_HOME_SCREEN_TEMPLATE,
  getPublicHomeScreenTemplate,
};
