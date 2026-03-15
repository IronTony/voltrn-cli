/**
 * GenericScreen Template
 * Generates a minimal screen for user-defined screen names
 */

const GENERIC_SCREEN_TEMPLATE_WITH_I18N = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

{{FUNCTION_SIGNATURE}}
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('{{SCREEN_NAME}}Screen.title')}</Text>
      <Text style={styles.description}>
        {t('{{SCREEN_NAME}}Screen.description')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    color: '#7f8c8d',
    lineHeight: 24,
  },
});

export default {{COMPONENT_NAME}};
`;

const GENERIC_SCREEN_TEMPLATE_NO_I18N = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

{{FUNCTION_SIGNATURE}}
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{{SCREEN_TITLE}}</Text>
      <Text style={styles.description}>
        Welcome to the {{SCREEN_TITLE}} screen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    color: '#7f8c8d',
    lineHeight: 24,
  },
});

export default {{COMPONENT_NAME}};
`;

/**
 * Convert PascalCase to spaced title: "MyProfile" -> "My Profile"
 */
function toDisplayTitle(screenName) {
  return screenName.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Get a rendered generic screen template
 * @param {string} framework - 'react-navigation' or 'expo-router'
 * @param {string} screenName - PascalCase name like 'About', 'FAQ', 'MyProfile'
 * @param {object} options - { useI18n: boolean, navTargets: string[], showBack: boolean, showLanguageSwitcher: boolean }
 */
function getGenericScreenTemplate(framework, screenName, options = {}) {
  const {
    renderTemplate,
    getNavigationImport,
    getNavigationHook,
    getNavigateMethod,
    getBackMethod,
    applyTheme,
    FRAMEWORKS,
  } = require('./adapter');
  const { useI18n = false, navTargets = [], showBack = false, showLanguageSwitcher = false, useTheme = false, showThemeToggle = false, showLogout = false } = options;

  const componentName = `${screenName}Screen`;
  const displayTitle = toDisplayTitle(screenName);

  const template = useI18n
    ? GENERIC_SCREEN_TEMPLATE_WITH_I18N
    : GENERIC_SCREEN_TEMPLATE_NO_I18N;

  let rendered = renderTemplate(template, framework, {
    screenName,
    componentName,
  });

  // Replace generic placeholders
  rendered = rendered
    .replace(/\{\{SCREEN_NAME\}\}/g, screenName)
    .replace(/\{\{COMPONENT_NAME\}\}/g, componentName)
    .replace(/\{\{SCREEN_TITLE\}\}/g, displayTitle);

  // Inject navigation if navTargets or showBack is provided
  const hasNav = navTargets.length > 0 || showBack;
  if (hasNav) {
    // 1. Add Pressable to react-native import
    rendered = rendered.replace(
      /{ View, Text, StyleSheet }/,
      '{ View, Text, StyleSheet, Pressable }'
    );

    // 2. Add navigation import after last import line
    const navImport = getNavigationImport(framework);
    const lastImportIndex = rendered.lastIndexOf('import ');
    const lastImportEnd = rendered.indexOf('\n', lastImportIndex);
    rendered =
      rendered.slice(0, lastImportEnd + 1) +
      navImport +
      '\n' +
      rendered.slice(lastImportEnd + 1);

    // 3. Add navigation hook after function opening
    const navHook = getNavigationHook(framework, screenName);
    if (useI18n) {
      // Insert after useTranslation line
      rendered = rendered.replace(
        "const { t } = useTranslation();",
        `const { t } = useTranslation();\n  ${navHook}`
      );
    } else {
      // Insert after function signature opening brace
      const funcSigEnd = rendered.indexOf('{\n', rendered.indexOf('function '));
      rendered =
        rendered.slice(0, funcSigEnd + 2) +
        `  ${navHook}\n\n` +
        rendered.slice(funcSigEnd + 2);
    }

    // 4. Build navigation buttons
    const buttons = [];
    navTargets.forEach((target) => {
      const navMethod = getNavigateMethod(framework, target);
      const targetTitle = toDisplayTitle(target);
      const buttonLabel = useI18n
        ? `{t('common.goTo')} ${targetTitle}`
        : `Go to ${targetTitle}`;
      buttons.push(
        `        <Pressable style={styles.button} onPress={() => ${navMethod}}>` +
          '\n' +
          `          <Text style={styles.buttonText}>${buttonLabel}</Text>` +
          '\n' +
          `        </Pressable>`
      );
    });
    if (showBack) {
      const backMethod = getBackMethod(framework);
      const backLabel = useI18n
        ? `{t('common.goBack')}`
        : 'Go Back';
      buttons.push(
        `        <Pressable style={styles.button} onPress={() => ${backMethod}}>` +
          '\n' +
          `          <Text style={styles.buttonText}>${backLabel}</Text>` +
          '\n' +
          `        </Pressable>`
      );
    }

    const navSection =
      `      <View style={styles.navSection}>\n` +
      buttons.join('\n') +
      '\n' +
      `      </View>`;

    // 5. Insert nav section before closing </View>
    // Find the outermost closing </View> (the container)
    const lastViewClose = rendered.lastIndexOf('    </View>');
    rendered =
      rendered.slice(0, lastViewClose) +
      navSection +
      '\n' +
      rendered.slice(lastViewClose);

    // 6. Add button styles to StyleSheet
    rendered = rendered.replace(
      '});',
      `  navSection: {
    marginTop: 30,
    gap: 12,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});`
    );
  }

  // Inject language switcher if requested (matches PublicHomeScreen styling)
  if (showLanguageSwitcher && useI18n) {
    // Add i18n and switchLocaleTo imports
    const lastImportIndex = rendered.lastIndexOf('import ');
    const lastImportEnd = rendered.indexOf('\n', lastImportIndex);
    rendered =
      rendered.slice(0, lastImportEnd + 1) +
      "import i18n from '@i18n/i18n';\n" +
      "import { switchLocaleTo } from '@i18n/utils';\n" +
      rendered.slice(lastImportEnd + 1);

    // Add useCallback to React import
    rendered = rendered.replace(
      "import React from 'react'",
      "import React, { useCallback } from 'react'"
    );

    // Add Pressable to react-native import if not already there
    if (!rendered.includes('Pressable')) {
      rendered = rendered.replace(
        /{ View, Text, StyleSheet }/,
        '{ View, Text, StyleSheet, Pressable }'
      );
    }

    // Add currentLocale and switchLocale callback after useTranslation
    rendered = rendered.replace(
      "const { t } = useTranslation();",
      `const { t } = useTranslation();
  const currentLocale = i18n.language;

  const switchLocale = useCallback(
    (locale: string) => () => {
      switchLocaleTo(locale);
    },
    [],
  );`
    );

    // Build language switcher section (same layout as PublicHomeScreen)
    const langSection =
      `      <Text style={styles.langTitle}>{t('common.language')}</Text>\n` +
      `      <View style={styles.languageButtonsContainer}>\n` +
      `        <Pressable\n` +
      `          style={[\n` +
      `            styles.languageButton,\n` +
      `            currentLocale === 'it'\n` +
      `              ? styles.activeButton\n` +
      `              : styles.inactiveButton,\n` +
      `          ]}\n` +
      `          onPress={switchLocale('it')}\n` +
      `        >\n` +
      `          <Text style={styles.languageButtonText}>{t('common.italian')}</Text>\n` +
      `        </Pressable>\n` +
      `\n` +
      `        <Pressable\n` +
      `          style={[\n` +
      `            styles.languageButton,\n` +
      `            currentLocale === 'en'\n` +
      `              ? styles.activeButton\n` +
      `              : styles.inactiveButton,\n` +
      `          ]}\n` +
      `          onPress={switchLocale('en')}\n` +
      `        >\n` +
      `          <Text style={styles.languageButtonText}>{t('common.english')}</Text>\n` +
      `        </Pressable>\n` +
      `      </View>`;

    // Insert before the closing </View> of the container
    const lastViewClose = rendered.lastIndexOf('    </View>');
    rendered =
      rendered.slice(0, lastViewClose) +
      langSection +
      '\n' +
      rendered.slice(lastViewClose);

    // Add language switcher styles (matching PublicHomeScreen)
    rendered = rendered.replace(
      '});',
      `  langTitle: {
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
});`
    );
  }

  // Inject logout button if requested (for last tab screen with auth flow)
  if (showLogout) {
    // 1. Add Pressable to react-native import if not already there
    if (!rendered.includes('Pressable')) {
      rendered = rendered.replace(
        /{ View, Text, StyleSheet }/,
        '{ View, Text, StyleSheet, Pressable }'
      );
    }

    // 2. Add auth and navigation imports after last import line
    const authImports = [
      "import { useAuthClient } from '@auth';",
      "import { useAsyncCallback } from '@hooks/useAsyncCallback';",
    ];
    // Add navigation import if not already present
    if (!rendered.includes('useNavigation') && !rendered.includes('useRouter')) {
      authImports.push(getNavigationImport(framework));
    }
    const lastImportIdx = rendered.lastIndexOf('import ');
    const lastImportEndIdx = rendered.indexOf('\n', lastImportIdx);
    rendered =
      rendered.slice(0, lastImportEndIdx + 1) +
      authImports.join('\n') +
      '\n' +
      rendered.slice(lastImportEndIdx + 1);

    // 3. Add auth hooks and navigation hook (if not already present)
    const logoutNav = framework === FRAMEWORKS.EXPO_ROUTER
      ? "router.replace('/intro')"
      : "navigation.navigate('Intro')";
    const navHookLine = !rendered.includes('const navigation =') && !rendered.includes('const router =')
      ? `\n  ${getNavigationHook(framework, screenName)}`
      : '';
    const authHooks =
      `${navHookLine}
  const client = useAuthClient();
  const { tokens } = client;
  const [onLogout, isLogoutLoading] = useAsyncCallback(async () => {
    await client.logout();
    ${logoutNav};
  }, [client]);`;

    if (useI18n) {
      rendered = rendered.replace(
        "const { t } = useTranslation();",
        `const { t } = useTranslation();${authHooks}`
      );
    }

    // 4. Insert token info and logout button before closing </View>
    const accessTokenLabel = useI18n ? "{t('common.accessToken')}" : 'Access Token';
    const refreshTokenLabel = useI18n ? "{t('common.refreshToken')}" : 'Refresh Token';
    const tokenSection =
      `      <View style={styles.infoContainer}>\n` +
      `        <Text style={styles.label}>${accessTokenLabel}</Text>\n` +
      `        <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">\n` +
      `          {tokens?.access_token || '-'}\n` +
      `        </Text>\n` +
      `      </View>\n` +
      `\n` +
      `      <View style={styles.infoContainer}>\n` +
      `        <Text style={styles.label}>${refreshTokenLabel}</Text>\n` +
      `        <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">\n` +
      `          {tokens?.refresh_token || '-'}\n` +
      `        </Text>\n` +
      `      </View>`;

    const logoutLabel = useI18n ? "{t('common.logout')}" : 'Logout';
    const logoutButton =
      tokenSection + '\n\n' +
      `      <Pressable\n` +
      `        style={styles.logoutButton}\n` +
      `        onPress={onLogout}\n` +
      `        disabled={!client.isAuthenticated || isLogoutLoading}\n` +
      `      >\n` +
      `        <Text style={styles.logoutButtonText}>${logoutLabel}</Text>\n` +
      `      </Pressable>`;

    const lastViewCloseLogout = rendered.lastIndexOf('    </View>');
    rendered =
      rendered.slice(0, lastViewCloseLogout) +
      logoutButton +
      '\n' +
      rendered.slice(lastViewCloseLogout);

    // 5. Add token info and logout styles
    rendered = rendered.replace(
      '});',
      `  infoContainer: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  label: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
    fontWeight: '500',
  },
  value: {
    fontSize: 18,
    color: '#2c3e50',
  },
  logoutButton: {
    marginTop: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});`
    );
  }

  // Inject ThemeToggle component if requested
  if (showThemeToggle) {
    // Add ThemeToggle import after last import
    const lastImportIndex = rendered.lastIndexOf('import ');
    const lastImportEnd = rendered.indexOf('\n', lastImportIndex);
    rendered =
      rendered.slice(0, lastImportEnd + 1) +
      "import ThemeToggle from '@components/ThemeToggle';\n" +
      rendered.slice(lastImportEnd + 1);

    // Insert <ThemeToggle /> before the closing </View> of the container
    const lastViewClose = rendered.lastIndexOf('    </View>');
    rendered =
      rendered.slice(0, lastViewClose) +
      '      <ThemeToggle />\n' +
      rendered.slice(lastViewClose);
  }

  if (useTheme) {
    rendered = applyTheme(rendered);
  }

  return rendered;
}

module.exports = {
  GENERIC_SCREEN_TEMPLATE_WITH_I18N,
  GENERIC_SCREEN_TEMPLATE_NO_I18N,
  getGenericScreenTemplate,
  toDisplayTitle,
};
