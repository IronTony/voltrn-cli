#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const {
  intro,
  outro,
  text,
  select,
  multiselect,
  confirm,
  spinner,
  note,
  isCancel,
  cancel,
} = require('@clack/prompts');
const pc = require('picocolors');

// Import utilities
const { log } = require('./cli/utils/logger');

// Import configuration functions
const {
  updateTsConfig,
  fixEslintConfig,
  setupPathAliases,
  setupEnvironmentScripts,
  setupSrcDirectory,
} = require('./cli/utils/config');

// Import package manager utilities
const {
  getPackageManager,
  withLegacyPeerDeps,
  isPackageManagerInstalled,
} = require('./cli/utils/package-manager');

// Import git setup
const { initGitRepository } = require('./cli/setup/git');

// Import framework setup
const {
  createProject,
  installIOSDependencies,
} = require('./cli/setup/framework');

// Import navigation setup
const {
  setupReactNavigation,
  setupExpoRouter,
  createExampleScreens,
} = require('./cli/setup/navigation');

// Import i18n setup
const { setupI18n } = require('./cli/setup/i18n');

// Import theme setup
const { setupTheme } = require('./cli/setup/theme');

// Import auth setup
const { setupAuthFlow } = require('./cli/setup/auth');
const { createAuthScreens } = require('./cli/setup/auth-screens');
const { createAuthNavigator } = require('./cli/setup/auth-navigator');
const { generateReadme } = require('./cli/setup/readme');
const { setupTests } = require('./cli/setup/tests');
const { setupBootsplash } = require('./cli/setup/bootsplash');
const { setupLicense } = require('./cli/setup/license');

// Import screen config utilities
const {
  parseScreenList,
  validateScreenNames,
  buildScreenConfig,
  NAVIGATION_PATTERNS,
} = require('./cli/utils/screen-config');

const pkg = require('./package.json');

function guardCancel(value) {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
  return value;
}

async function main() {
  // Intro
  intro(
    `${pc.bgCyan(pc.black(' create-voltrn-boilerplate '))} ${pc.dim('v' + pkg.version)}`,
  );

  // 1. Project name
  const projectName = guardCancel(
    await text({
      message: 'What will your project be called?',
      placeholder: 'my-app',
      validate: (v) => (!v.trim() ? 'Project name is required' : undefined),
    }),
  );

  // 2. Package manager (only show installed ones)
  const allPms = [
    { value: 'npm', label: 'npm' },
    { value: 'yarn', label: 'yarn' },
    { value: 'pnpm', label: 'pnpm' },
    { value: 'bun', label: 'bun' },
  ];
  const pmOptions = allPms.filter((opt) =>
    isPackageManagerInstalled(opt.value),
  );

  if (pmOptions.length === 0) {
    cancel(
      'No supported package manager found on this system. Install npm, yarn, pnpm, or bun and try again.',
    );
    process.exit(1);
  }

  const pmName = guardCancel(
    await select({
      message: 'Which package manager?',
      options: pmOptions,
      initialValue: pmOptions[0].value,
    }),
  );
  const pm = getPackageManager(pmName);

  // 3. Git init
  const initGit = guardCancel(
    await confirm({
      message: 'Initialize a git repository?',
      initialValue: true,
    }),
  );

  // 4. Framework
  const frameworkValue = guardCancel(
    await select({
      message: 'Which framework?',
      options: [
        { value: 'rn', label: 'React Native CLI', hint: 'bare workflow' },
        { value: 'expo', label: 'Expo', hint: 'managed workflow' },
      ],
    }),
  );
  const isExpo = frameworkValue === 'expo';
  const pmForSetup = withLegacyPeerDeps(pm, isExpo);

  // 5. Navigation (Expo only)
  let useExpoRouter = false;
  if (isExpo) {
    const navValue = guardCancel(
      await select({
        message: 'Which navigation library?',
        options: [
          { value: 'react-nav', label: 'React Navigation' },
          { value: 'expo-router', label: 'Expo Router' },
        ],
      }),
    );
    useExpoRouter = navValue === 'expo-router';
  }

  // 6. Features (multiselect)
  const features = guardCancel(
    await multiselect({
      message: 'Which features would you like to include? (space to select)',
      options: [
        {
          value: 'i18n',
          label: 'Internationalization (i18next)',
        },
        {
          value: 'auth',
          label: 'Authentication flow',
          hint: 'requires i18n',
        },
        {
          value: 'theming',
          label: 'Theming (dark/light mode)',
        },
      ],
      required: false,
      initialValues: ['theming'],
    }),
  );

  let useI18n = features.includes('i18n');
  const useAuthFlow = features.includes('auth');
  const useThemeSystem = features.includes('theming');

  // Auth requires i18n
  if (useAuthFlow && !useI18n) {
    useI18n = true;
    note(
      'i18n has been automatically enabled because Authentication flow requires it.',
      'Dependency resolved',
    );
  }

  // 7. Screen configuration
  let screenConfig;

  if (useAuthFlow) {
    note('Intro + Login screens are always included.', 'Auth screens');

    const publicInput = guardCancel(
      await text({
        message: 'Public screen names (comma-separated)',
        placeholder: 'PublicHome',
        defaultValue: 'PublicHome',
      }),
    );
    const publicScreens = parseScreenList(publicInput, ['PublicHome']);
    const publicValidation = validateScreenNames(publicScreens, true);
    if (!publicValidation.valid) {
      publicValidation.errors.forEach((e) => log.error(e));
      log.warning('Using default public screens instead.');
    }

    const tabInput = guardCancel(
      await text({
        message: 'Private tab screen names (comma-separated)',
        placeholder: 'PrivateHome, Profile, Settings',
        defaultValue: 'PrivateHome, Profile, Settings',
      }),
    );
    const privateTabScreens = parseScreenList(tabInput, [
      'PrivateHome',
      'Profile',
      'Settings',
    ]);
    const tabValidation = validateScreenNames(privateTabScreens, true);
    if (!tabValidation.valid) {
      tabValidation.errors.forEach((e) => log.error(e));
      log.warning('Using default tab screens instead.');
    }

    const stackInput = guardCancel(
      await text({
        message: 'Additional private stack screen names (comma-separated)',
        placeholder: 'Details',
        defaultValue: 'Details',
      }),
    );
    const privateStackScreens = parseScreenList(stackInput, ['Details']);
    const stackValidation = validateScreenNames(privateStackScreens, true);
    if (!stackValidation.valid) {
      stackValidation.errors.forEach((e) => log.error(e));
      log.warning('Using default stack screens instead.');
    }

    screenConfig = buildScreenConfig(
      {
        publicScreens: publicValidation.valid ? publicScreens : undefined,
        privateTabScreens: tabValidation.valid ? privateTabScreens : undefined,
        privateStackScreens: stackValidation.valid
          ? privateStackScreens
          : undefined,
      },
      true,
    );
  } else {
    const screensInput = guardCancel(
      await text({
        message: 'Screen names (comma-separated)',
        placeholder: 'Home, Details',
        defaultValue: 'Home, Details',
      }),
    );
    const screens = parseScreenList(screensInput, ['Home', 'Details']);
    const validation = validateScreenNames(screens);
    if (!validation.valid) {
      validation.errors.forEach((e) => log.error(e));
      log.warning('Using default screens instead.');
    }
    const validScreens = validation.valid ? screens : ['Home', 'Details'];

    // Navigation pattern
    const patternChoice = guardCancel(
      await select({
        message: 'Navigation pattern',
        options: [
          {
            value: '1',
            label: 'Stack',
            hint: 'screens connected with buttons',
          },
          { value: '2', label: 'Bottom Tabs' },
          { value: '3', label: 'Drawer', hint: 'side menu' },
          {
            value: '4',
            label: 'Tabs + Drawer',
            hint: 'side menu with bottom tabs',
          },
        ],
      }),
    );

    let navigationPattern = NAVIGATION_PATTERNS.STACK;
    let tabScreens;
    let drawerScreens;

    if (patternChoice === '2') {
      navigationPattern = NAVIGATION_PATTERNS.TABS;
      tabScreens = [];
      for (const screen of validScreens) {
        const placement = guardCancel(
          await select({
            message: `Where should "${screen}" go?`,
            options: [
              { value: 'tab', label: 'Tab' },
              { value: 'stack', label: 'Stack' },
            ],
            initialValue: 'tab',
          }),
        );
        if (placement === 'tab') tabScreens.push(screen);
      }
    } else if (patternChoice === '3') {
      navigationPattern = NAVIGATION_PATTERNS.DRAWER;
      drawerScreens = [];
      for (const screen of validScreens) {
        const placement = guardCancel(
          await select({
            message: `Where should "${screen}" go?`,
            options: [
              { value: 'drawer', label: 'Drawer' },
              { value: 'stack', label: 'Stack' },
            ],
            initialValue: 'drawer',
          }),
        );
        if (placement === 'drawer') drawerScreens.push(screen);
      }
    } else if (patternChoice === '4') {
      navigationPattern = NAVIGATION_PATTERNS.TABS_DRAWER;
      tabScreens = [];
      drawerScreens = [];
      for (const screen of validScreens) {
        const placement = guardCancel(
          await select({
            message: `Where should "${screen}" go?`,
            options: [
              { value: 'tab', label: 'Tab' },
              { value: 'drawer', label: 'Drawer' },
              { value: 'stack', label: 'Stack' },
            ],
            initialValue: 'tab',
          }),
        );
        if (placement === 'tab') tabScreens.push(screen);
        if (placement === 'drawer') drawerScreens.push(screen);
      }
    }

    screenConfig = buildScreenConfig(
      {
        screens: validScreens,
        navigationPattern,
        tabScreens,
        drawerScreens,
      },
      false,
    );
  }

  // --- Scaffolding phase ---
  const s = spinner();

  s.start('Creating project...');
  await createProject(projectName, isExpo);
  const projectPath = path.join(process.cwd(), projectName);
  process.chdir(projectPath);
  s.stop('Project created');

  s.start('Setting up project structure...');
  setupLicense(projectPath, s);
  setupSrcDirectory(projectPath, s);
  s.stop('Project structure ready');

  s.start('Setting up navigation...');
  if (isExpo && useExpoRouter) {
    await setupExpoRouter(
      projectPath,
      useI18n,
      useAuthFlow,
      screenConfig,
      useThemeSystem,
      pmForSetup,
    );
  } else {
    await setupReactNavigation(
      projectPath,
      isExpo,
      useI18n,
      screenConfig,
      useThemeSystem,
      pmForSetup,
    );
  }
  s.stop('Navigation configured');

  if (useI18n) {
    s.start('Setting up i18next...');
    await setupI18n(projectPath, isExpo, pmForSetup);
    s.stop('i18next configured');
  } else {
    s.start('Setting up path aliases...');
    await setupPathAliases(projectPath, isExpo, pmForSetup);
    s.stop('Path aliases configured');
  }

  if (useThemeSystem) {
    s.start('Setting up theming system...');
    await setupTheme(projectPath, isExpo, useI18n, pmForSetup);
    s.stop('Theming configured');
  }

  if (useAuthFlow) {
    s.start('Setting up authentication flow...');
    await setupAuthFlow(projectPath, isExpo, useExpoRouter, screenConfig, pmForSetup);
    createAuthScreens(projectPath, useExpoRouter, screenConfig, {
      useTheme: useThemeSystem,
    });
    createAuthNavigator(projectPath, useExpoRouter, screenConfig, {
      useTheme: useThemeSystem,
    });
    s.stop('Authentication flow configured');
  }

  if (!useAuthFlow) {
    s.start('Creating example screens...');
    createExampleScreens(
      projectPath,
      useExpoRouter,
      useI18n,
      useAuthFlow,
      screenConfig,
      { useTheme: useThemeSystem },
    );
    s.stop('Example screens created');
  }

  updateTsConfig(projectPath);

  if (!isExpo) {
    fixEslintConfig(projectPath);
  }

  if (!isExpo || !useExpoRouter) {
    if (!isExpo) {
      log.warning(
        'Remember to complete native setup for React Navigation on iOS/Android',
      );
    }
    const navigationDtsPath = path.join(projectPath, 'navigation.d.ts');
    if (fs.existsSync(navigationDtsPath)) {
      log.success('Navigation alias (@navigation) added to path aliases');
      log.success(
        'React Navigation configured with TypeScript (navigation.d.ts created)',
      );
    }
  }

  s.start('Setting up splash screen & app icons...');
  await setupBootsplash(projectPath, isExpo, useExpoRouter, useAuthFlow, pmForSetup);
  s.stop('Splash screen & app icons ready');

  if (!isExpo) {
    s.start('Installing iOS dependencies (this may take a few minutes)...');
    await installIOSDependencies(projectPath);
    s.stop('iOS dependencies installed');
  }

  if (useAuthFlow) {
    s.start('Setting up environment management...');
    setupEnvironmentScripts(projectPath);
    s.stop('Environment management ready');
  }

  s.start('Generating README.md...');
  generateReadme(projectPath, projectName, {
    isExpo,
    useExpoRouter,
    useI18n,
    useAuthFlow,
    useTheme: useThemeSystem,
    screenConfig,
    pm: pmForSetup,
  });
  s.stop('README.md generated');

  s.start('Generating storage tests...');
  setupTests(projectPath, {
    useI18n,
    useAuthFlow,
    useTheme: useThemeSystem,
  });
  s.stop('Storage tests generated');

  if (initGit) {
    s.start('Initializing git repository...');
    initGitRepository(projectPath);
    s.stop('Git repository initialized');
  }

  // --- Summary ---
  if (!useAuthFlow && screenConfig.navigationPattern) {
    const patternLabels = {
      [NAVIGATION_PATTERNS.STACK]: 'Stack',
      [NAVIGATION_PATTERNS.TABS]: 'Bottom Tabs',
      [NAVIGATION_PATTERNS.DRAWER]: 'Drawer',
      [NAVIGATION_PATTERNS.TABS_DRAWER]: 'Tabs + Drawer',
    };
    const patternLabel =
      patternLabels[screenConfig.navigationPattern] || 'Stack';
    log.success(`Navigation pattern: ${patternLabel}`);

    if (screenConfig.tabScreens) {
      log.success(`Tab screens: ${screenConfig.tabScreens.join(', ')}`);
    }
    if (screenConfig.drawerScreens && screenConfig.drawerScreens.length > 0) {
      log.success(`Drawer screens: ${screenConfig.drawerScreens.join(', ')}`);
    }
    if (screenConfig.stackScreens && screenConfig.stackScreens.length > 0) {
      log.success(`Stack screens: ${screenConfig.stackScreens.join(', ')}`);
    }
  }

  // Next steps
  const nextSteps = [];
  nextSteps.push(`cd ${projectName}`);

  if (useAuthFlow) {
    nextSteps.push('');
    nextSteps.push(`${pm.run('env:dev')}      - Set development environment`);
    nextSteps.push(`${pm.run('env:stage')}    - Set staging environment`);
    nextSteps.push(`${pm.run('env:prod')}     - Set production environment`);
  }

  if (isExpo) {
    nextSteps.push('');
    nextSteps.push(
      `npx expo prebuild  (native modules: react-native-bootsplash${useI18n || useThemeSystem ? ', react-native-mmkv' : ''})`,
    );
    nextSteps.push('npx expo run:ios  /  npx expo run:android');
  } else {
    nextSteps.push('npx react-native run-ios  /  npx react-native run-android');
  }

  if (useAuthFlow) {
    nextSteps.push('');
    nextSteps.push('Configure API_URL in src/env/env.js');
    nextSteps.push('See README.md for complete documentation');
    nextSteps.push('');
    nextSteps.push('Demo login credentials:');
    nextSteps.push('  Email:    john@mail.com');
    nextSteps.push('  Password: changeme');
  }

  note(nextSteps.join('\n'), 'Next steps');

  outro(`Your project is ready! Have fun building ${pc.cyan(projectName)}.`);
}

main().catch((error) => {
  cancel(`Something went wrong: ${error.message}`);
  if (error.command) {
    process.stderr.write(`\nFailed command: ${error.command}\n`);
  }
  if (error.stderr && error.stderr.length) {
    process.stderr.write(error.stderr.toString());
  }
  if (error.stdout && error.stdout.length) {
    process.stdout.write(error.stdout.toString());
  }
  process.exit(1);
});
