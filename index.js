#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Import utilities
const { displayBanner, log, colors } = require('./cli/utils/logger');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function questionWithValidation(query, validOptions, defaultOption = null) {
  while (true) {
    const answer = await question(query);
    const trimmed = answer.trim();
    if (trimmed === '' && defaultOption) {
      return defaultOption;
    }
    if (validOptions.includes(trimmed)) {
      return trimmed;
    }
    log.error(`Invalid option "${trimmed}". Please enter one of: ${validOptions.join(', ')}`);
  }
}

async function main() {
  // Display banner
  displayBanner();

  // Get project name
  const projectName = await question('Enter project name: ');
  if (!projectName) {
    console.error('Project name is required');
    process.exit(1);
  }

  // Package manager selection
  log.step('Package Manager');
  console.log('1. npm');
  console.log('2. yarn');
  console.log('3. pnpm');
  console.log('4. bun');
  const pmChoice = await questionWithValidation(
    'Which package manager do you want to use? (1/2/3/4) [default: 1]: ',
    ['1', '2', '3', '4'],
    '1'
  );
  const pmNames = { '1': 'npm', '2': 'yarn', '3': 'pnpm', '4': 'bun' };
  const pm = getPackageManager(pmNames[pmChoice]);

  // Git repository
  const gitChoice = await questionWithValidation(
    'Initialize a git repository? (y/n) [default: y]: ',
    ['y', 'n', 'Y', 'N'],
    'y'
  );
  const initGit = gitChoice.toLowerCase() === 'y';

  // Question 1: React Native or Expo
  log.step('Step 1: Choose your framework');
  console.log('1. React Native CLI (bare workflow)');
  console.log('2. Expo (managed workflow)');
  const frameworkChoice = await questionWithValidation('Select option (1 or 2): ', ['1', '2']);
  const isExpo = frameworkChoice === '2';

  // Resolve package manager with legacy-peer-deps for Expo/npm
  const pmForSetup = withLegacyPeerDeps(pm, isExpo);

  // Question 2: Navigation
  log.step('Step 2: Choose your navigation library');
  if (isExpo) {
    console.log('1. React Navigation');
    console.log('2. Expo Router');
    const navChoice = await questionWithValidation('Select option (1 or 2): ', ['1', '2']);
    var useExpoRouter = navChoice === '2';
  } else {
    log.info('React Navigation will be used (standard for React Native CLI)');
    var useExpoRouter = false;
  }

  // Question 3: i18n
  log.step('Step 3: Internationalization (i18n)');
  const i18nChoice = await questionWithValidation(
    'Do you want i18next for internationalization? (y/n): ',
    ['y', 'n', 'Y', 'N']
  );
  let useI18n = i18nChoice.toLowerCase() === 'y';

  // Question 4: Authentication Flow
  let useAuthFlow = false;
  log.step('Step 4: Authentication Flow');
  const authChoice = await questionWithValidation(
    'Do you want to include authentication flow with @forward-software/react-auth? (y/n): ',
    ['y', 'n', 'Y', 'N']
  );
  useAuthFlow = authChoice.toLowerCase() === 'y';

  if (useAuthFlow && !useI18n) {
    log.warning(
      'Authentication flow requires i18n. Enabling i18n automatically...'
    );
    useI18n = true;
  }

  // Question 5: Theming
  log.step('Step 5: Theming');
  const themeChoice = await questionWithValidation(
    'Do you want to enable theming (dark/light mode)? (y/n) [default: y]: ',
    ['y', 'n', 'Y', 'N'],
    'y'
  );
  const useThemeSystem = themeChoice.toLowerCase() === 'y';

  // Question 6: Configure screens
  log.step('Step 6: Configure your screens');
  let screenConfig;

  if (useAuthFlow) {
    console.log(
      `\n  ${colors.cyan}Auth flow includes: IntroScreen, LoginScreen (mandatory)${colors.reset}\n`
    );

    const publicInput = await question(
      '  Enter PUBLIC screen names (comma-separated) [default: PublicHome]: '
    );
    const publicScreens = parseScreenList(publicInput, ['PublicHome']);
    const publicValidation = validateScreenNames(publicScreens, true);
    if (!publicValidation.valid) {
      publicValidation.errors.forEach((e) => log.error(e));
      log.warning('Using default public screens instead.');
    }

    const tabInput = await question(
      '  Enter PRIVATE TAB screen names (comma-separated) [default: PrivateHome, Profile, Settings]: '
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

    const stackInput = await question(
      '  Enter additional PRIVATE STACK screen names (comma-separated) [default: Details]: '
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
      true
    );
  } else {
    const screensInput = await question(
      '  Enter screen names (comma-separated) [default: Home, Details]: '
    );
    const screens = parseScreenList(screensInput, ['Home', 'Details']);
    const validation = validateScreenNames(screens);
    if (!validation.valid) {
      validation.errors.forEach((e) => log.error(e));
      log.warning('Using default screens instead.');
    }
    const validScreens = validation.valid ? screens : ['Home', 'Details'];

    // Step 7: Navigation pattern (non-auth only)
    log.step('Step 7: Choose navigation pattern');
    console.log('1. Stack (screens connected with buttons)');
    console.log('2. Bottom Tabs');
    console.log('3. Drawer (side menu)');
    console.log('4. Tabs + Drawer (side menu with bottom tabs)');
    const patternChoice = await questionWithValidation('Select option (1, 2, 3, or 4): ', ['1', '2', '3', '4']);

    let navigationPattern = NAVIGATION_PATTERNS.STACK;
    let tabScreens;
    let drawerScreens;

    if (patternChoice === '2') {
      navigationPattern = NAVIGATION_PATTERNS.TABS;
      tabScreens = [];
      for (const screen of validScreens) {
        const choice = await questionWithValidation(
          `  Where should "${screen}" go? (1) Tab  (2) Stack  [default: 1]: `,
          ['1', '2'],
          '1'
        );
        if (choice !== '2') {
          tabScreens.push(screen);
        }
      }
    } else if (patternChoice === '3') {
      navigationPattern = NAVIGATION_PATTERNS.DRAWER;
      drawerScreens = [];
      for (const screen of validScreens) {
        const choice = await questionWithValidation(
          `  Where should "${screen}" go? (1) Drawer  (2) Stack  [default: 1]: `,
          ['1', '2'],
          '1'
        );
        if (choice !== '2') {
          drawerScreens.push(screen);
        }
      }
    } else if (patternChoice === '4') {
      navigationPattern = NAVIGATION_PATTERNS.TABS_DRAWER;
      tabScreens = [];
      drawerScreens = [];
      for (const screen of validScreens) {
        const choice = await questionWithValidation(
          `  Where should "${screen}" go? (1) Tab  (2) Drawer  (3) Stack  [default: 1]: `,
          ['1', '2', '3'],
          '1'
        );
        if (choice === '2') {
          drawerScreens.push(screen);
        } else if (choice !== '3') {
          tabScreens.push(screen);
        }
      }
    }

    screenConfig = buildScreenConfig(
      {
        screens: validScreens,
        navigationPattern,
        tabScreens,
        drawerScreens,
      },
      false
    );
  }

  rl.close();

  // Create project with TypeScript
  createProject(projectName, isExpo);

  const projectPath = path.join(process.cwd(), projectName);
  process.chdir(projectPath);

  // Add MPL-2.0 license
  log.step('Adding license...');
  setupLicense(projectPath);

  // Create src directory structure (for both Expo and React Native CLI)
  log.step('Setting up project structure...');
  setupSrcDirectory(projectPath);

  // Install navigation
  log.step('Setting up navigation...');
  if (isExpo && useExpoRouter) {
    setupExpoRouter(projectPath, useI18n, useAuthFlow, screenConfig, useThemeSystem, pmForSetup);
  } else {
    setupReactNavigation(projectPath, isExpo, useI18n, screenConfig, useThemeSystem, pmForSetup);
  }

  // Install i18n
  if (useI18n) {
    log.step('Setting up i18next...');
    setupI18n(projectPath, isExpo, pmForSetup);
  } else {
    // Set up basic path aliases even without i18n
    log.step('Setting up path aliases...');
    setupPathAliases(projectPath, isExpo, pmForSetup);
  }

  // Setup theming
  if (useThemeSystem) {
    log.step('Setting up theming system...');
    setupTheme(projectPath, isExpo, useI18n, pmForSetup);
  }

  // Setup auth flow
  if (useAuthFlow) {
    log.step('Setting up authentication flow...');
    setupAuthFlow(projectPath, isExpo, useExpoRouter, screenConfig, pmForSetup);
    createAuthScreens(projectPath, useExpoRouter, screenConfig, { useTheme: useThemeSystem });
    createAuthNavigator(projectPath, useExpoRouter, screenConfig, { useTheme: useThemeSystem });
  }

  // Create example screens
  if (!useAuthFlow) {
    log.step('Creating example screens...');
    createExampleScreens(
      projectPath,
      useExpoRouter,
      useI18n,
      useAuthFlow,
      screenConfig,
      { useTheme: useThemeSystem }
    );
  }

  // Update tsconfig for strict mode
  updateTsConfig(projectPath);

  // Fix ESLint config for React Native CLI only
  if (!isExpo) {
    fixEslintConfig(projectPath);
  }

  // Display navigation setup messages if React Navigation was used
  if (!isExpo || !useExpoRouter) {
    if (!isExpo) {
      log.warning(
        'Remember to complete native setup for React Navigation on iOS/Android'
      );
    }
    const navigationDtsPath = path.join(projectPath, 'navigation.d.ts');
    if (fs.existsSync(navigationDtsPath)) {
      log.success('Navigation alias (@navigation) added to path aliases');
      log.success(
        'React Navigation configured with TypeScript (navigation.d.ts created)'
      );
    }
  }

  // Setup splash screen & app icons
  log.step('Setting up splash screen & app icons...');
  setupBootsplash(projectPath, isExpo, useExpoRouter, useAuthFlow, pmForSetup);

  // Run pod install for iOS (React Native CLI only). Must run AFTER bootsplash
  // is installed so the native module gets linked
  if (!isExpo) {
    installIOSDependencies(projectPath);
  }

  // Setup environment scripts (only if auth flow is used, which includes axios)
  if (useAuthFlow) {
    log.step('Setting up environment management scripts...');
    setupEnvironmentScripts(projectPath);
  }

  // Generate project README.md
  log.step('Generating README.md...');
  generateReadme(projectPath, projectName, {
    isExpo,
    useExpoRouter,
    useI18n,
    useAuthFlow,
    useTheme: useThemeSystem,
    screenConfig,
    pm: pmForSetup,
  });

  // Generate MMKV storage tests
  log.step('Generating storage tests...');
  setupTests(projectPath, {
    useI18n,
    useAuthFlow,
    useTheme: useThemeSystem,
  });

  // Display navigation pattern info for non-auth flow
  if (!useAuthFlow && screenConfig.navigationPattern) {
    const patternLabels = {
      [NAVIGATION_PATTERNS.STACK]: 'Stack',
      [NAVIGATION_PATTERNS.TABS]: 'Bottom Tabs',
      [NAVIGATION_PATTERNS.DRAWER]: 'Drawer',
      [NAVIGATION_PATTERNS.TABS_DRAWER]: 'Tabs + Drawer',
    };
    const patternLabel = patternLabels[screenConfig.navigationPattern] || 'Stack';
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

  log.success(
    `\n${colors.bright}Project ${projectName} created successfully!${colors.reset}`
  );
  console.log(`\nTo get started:`);
  console.log(`  cd ${projectName}`);
  if (useAuthFlow) {
    console.log(`\n${colors.yellow}⚠️  IMPORTANT:${colors.reset}`);
    console.log(`\nEnvironment management:`);
    console.log(`  ${pm.run('env:dev')}      # Set development environment`);
    console.log(`  ${pm.run('env:stage')}    # Set staging environment`);
    console.log(`  ${pm.run('env:prod')}     # Set production environment`);
  }

  if (useAuthFlow) {
    const publicNames = screenConfig.publicScreens.join('/');
    const tabNames = screenConfig.privateTabScreens.join('/');

    console.log(`\n${colors.cyan}Authentication Flow:${colors.reset}`);
    console.log(`  ✅ JWT-based auth with @forward-software/react-auth`);
    console.log(
      `  ✅ Intro → Login/${publicNames} (public routes)`
    );
    if (useExpoRouter) {
      console.log(
        `  ✅ Tabs (Expo Router) → ${tabNames} (private routes)`
      );
      console.log(
        `  ✅ File-based routing with (auth) and (tabs) route groups`
      );
    } else {
      console.log(
        `  ✅ MainTabs → ${tabNames} (private routes)`
      );
    }
    console.log(`  ✅ Configure API_URL in src/env/env.js`);
    console.log(`  ✅ See AUTH_FLOW.md for complete documentation`);
  }

  if (useThemeSystem) {
    console.log(`\n${colors.cyan}Theming:${colors.reset}`);
    console.log(`  ✅ Dark/Light mode with system detection`);
    console.log(`  ✅ Theme toggle in Settings screen`);
    console.log(`  ✅ MMKV persistence for theme preference`);
    console.log(`  ✅ Customize colors in src/theme/colors.ts`);
  }

  // Expo projects always need prebuild (bootsplash requires native code,
  // and optionally mmkv for i18n/theme)
  if (isExpo) {
    console.log(`\n${colors.yellow}⚠️  IMPORTANT:${colors.reset}`);
    console.log(
      `  This project uses native modules (react-native-bootsplash${useI18n || useThemeSystem ? ', react-native-mmkv' : ''}).`
    );
    console.log(`  You need to generate native code before running the app:`);
    console.log(`  ${colors.cyan}npx expo prebuild${colors.reset}`);
  }

  console.log(`\nRun your app:`);
  if (isExpo) {
    console.log(`  npx expo run:ios`);
    console.log(`  or`);
    console.log(`  npx expo run:android`);
  } else {
    console.log(`  npx react-native run-android`);
    console.log(`  or`);
    console.log(`  npx react-native run-ios`);
  }

  // Initialize git repository (must be last, after all files are written)
  if (initGit) {
    log.step('Initializing git repository...');
    initGitRepository(projectPath);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
