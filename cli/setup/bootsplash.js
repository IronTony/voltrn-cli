const fs = require('fs');
const path = require('path');
const { executeCommand } = require('../utils/commands');
const { log } = require('../utils/logger');

/**
 * Set up react-native-bootsplash (splash screen) and
 * @forward-software/react-native-toolbox (app icons) in the generated project.
 *
 * @param {string} projectPath - Path to the generated project
 * @param {boolean} isExpo - Whether the project uses Expo
 * @param {boolean} useExpoRouter - Whether the project uses Expo Router
 * @param {boolean} useAuthFlow - Whether auth flow is enabled
 */
async function setupBootsplash(projectPath, isExpo, useExpoRouter, useAuthFlow, pm) {
  log.info('Installing react-native-bootsplash and react-native-toolbox...');

  // Install packages
  await executeCommand(pm.add('react-native-bootsplash'), { cwd: projectPath });
  await executeCommand(
    pm.addDev('@forward-software/react-native-toolbox'),
    { cwd: projectPath },
  );

  // Create assets directory
  const assetsDir = path.join(projectPath, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Copy VoltRN logo as splash and icon placeholders
  const logoSvgSource = path.join(__dirname, '..', 'assets', 'voltrn-logo.svg');
  const logoPngSource = path.join(__dirname, '..', 'assets', 'voltrn-logo.png');
  const logoSvg = fs.readFileSync(logoSvgSource, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'splashscreen.svg'), logoSvg);
  fs.writeFileSync(path.join(assetsDir, 'icon.svg'), logoSvg);
  fs.copyFileSync(logoPngSource, path.join(assetsDir, 'icon.png'));

  // Add npm scripts to project's package.json
  addAssetScripts(projectPath);

  // Configure Expo plugin if needed
  if (isExpo) {
    configureExpoPlugin(projectPath);
  }

  // Run initial splash and icon generation (RN CLI only. Expo does it during prebuild)
  if (!isExpo) {
    await runSplashGeneration(projectPath);
    await runIconGeneration(projectPath);
  }

  // Wire up BootSplash.hide() in the app entry point
  wireBootSplashHide(projectPath, isExpo, useExpoRouter, useAuthFlow);

  log.success('Splash screen and app icon setup complete');
}

/**
 * Add assets:splash and assets:icons scripts to the project's package.json
 */
function addAssetScripts(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (!pkg.scripts) {
    pkg.scripts = {};
  }

  pkg.scripts['assets:splash'] =
    'npx react-native-bootsplash generate assets/splashscreen.svg --platforms=android,ios --background=1A1A2E --logo-width=128 --assets-output=assets/bootsplash';
  pkg.scripts['assets:icons'] =
    'npx @forward-software/react-native-toolbox icons assets/icon.svg';

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

/**
 * Add react-native-bootsplash as an Expo plugin in app.json
 */
function configureExpoPlugin(projectPath) {
  const appJsonPath = path.join(projectPath, 'app.json');
  if (!fs.existsSync(appJsonPath)) {
    return;
  }

  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  if (!appJson.expo) {
    return;
  }

  if (!appJson.expo.plugins) {
    appJson.expo.plugins = [];
  }

  appJson.expo.plugins.push([
    'react-native-bootsplash',
    {
      logo: './assets/splashscreen.svg',
      logoWidth: 128,
      background: '#1A1A2E',
      assetsOutput: 'assets/bootsplash',
    },
  ]);

  appJson.expo.icon = './assets/icon.png';

  if (!appJson.expo.android) {
    appJson.expo.android = {};
  }
  appJson.expo.android.adaptiveIcon = {
    foregroundImage: './assets/icon.png',
    backgroundColor: '#1A1A2E',
  };

  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  log.info('Added react-native-bootsplash plugin to app.json');
}

/**
 * Run the initial splash screen generation for RN CLI projects
 */
async function runSplashGeneration(projectPath) {
  try {
    await executeCommand(
      'npx react-native-bootsplash generate assets/splashscreen.svg --platforms=android,ios --background=1A1A2E --logo-width=128 --assets-output=assets/bootsplash',
      { cwd: projectPath },
    );
    log.success('Splash screen assets generated');
  } catch (error) {
    log.warning(
      'Could not generate splash screen assets automatically. Run "npm run assets:splash" manually after setup.',
    );
  }
}

/**
 * Run the initial app icon generation for RN CLI projects
 */
async function runIconGeneration(projectPath) {
  try {
    await executeCommand(
      'npx @forward-software/react-native-toolbox icons assets/icon.svg',
      { cwd: projectPath },
    );
    log.success('App icon assets generated');
  } catch (error) {
    log.warning(
      'Could not generate app icon assets automatically. Run "npm run assets:icons" manually after setup.',
    );
  }
}

/**
 * Wire up BootSplash.hide() in the app entry point.
 *
 * For Expo Router (auth): replaces Expo SplashScreen with BootSplash in _layout.tsx
 * For Expo Router (no auth): adds BootSplash.hide() to _layout.tsx
 * For React Navigation: adds BootSplash.hide() to App.tsx
 */
function wireBootSplashHide(projectPath, isExpo, useExpoRouter, useAuthFlow) {
  if (useExpoRouter) {
    patchExpoRouterLayout(projectPath, useAuthFlow);
  } else {
    patchAppTsx(projectPath);
  }
}

/**
 * Patch App.tsx (React Navigation: both Expo and RN CLI) to add BootSplash.hide()
 */
function patchAppTsx(projectPath) {
  const appTsxPath = path.join(projectPath, 'App.tsx');
  if (!fs.existsSync(appTsxPath)) {
    log.warning('App.tsx not found. Skipping BootSplash.hide() injection');
    return;
  }

  let content = fs.readFileSync(appTsxPath, 'utf8');

  // Add imports
  const bootsplashImport =
    "import BootSplash from 'react-native-bootsplash';\nimport { useEffect } from 'react';";

  // Insert import after the first import line
  const firstImportEnd = content.indexOf('\n');
  content =
    content.slice(0, firstImportEnd + 1) +
    bootsplashImport +
    '\n' +
    content.slice(firstImportEnd + 1);

  // Add useEffect inside the App function body
  const functionBodyMatch = content.match(/function App\(\).*?\{[\s]*\n/);
  if (functionBodyMatch) {
    const insertPos =
      content.indexOf(functionBodyMatch[0]) + functionBodyMatch[0].length;
    const hideEffect = `  useEffect(() => {
    BootSplash.hide({ fade: true });
  }, []);\n\n`;
    content =
      content.slice(0, insertPos) + hideEffect + content.slice(insertPos);
  }

  fs.writeFileSync(appTsxPath, content);
  log.info('Added BootSplash.hide() to App.tsx');
}

/**
 * Patch Expo Router root _layout.tsx to use BootSplash instead of Expo SplashScreen
 */
function patchExpoRouterLayout(projectPath, useAuthFlow) {
  const layoutPath = path.join(projectPath, 'app', '_layout.tsx');
  if (!fs.existsSync(layoutPath)) {
    log.warning(
      'app/_layout.tsx not found. Skipping BootSplash.hide() injection',
    );
    return;
  }

  let content = fs.readFileSync(layoutPath, 'utf8');

  if (useAuthFlow) {
    // Auth flow already has SplashScreen logic. Replace with BootSplash
    // Replace Expo SplashScreen import
    content = content.replace(
      /import\s*\{([^}]*)\bSplashScreen\b([^}]*)\}\s*from\s*'expo-router'/,
      (match, before, after) => {
        const remaining = (before + after)
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && s !== 'SplashScreen')
          .join(', ');
        return `import { ${remaining} } from 'expo-router';\nimport BootSplash from 'react-native-bootsplash'`;
      },
    );

    // Replace SplashScreen.preventAutoHideAsync()
    content = content.replace(
      /\/\/.*Prevent.*splash.*\n?.*SplashScreen\.preventAutoHideAsync\(\);?\n?/i,
      '',
    );

    // Replace SplashScreen.hideAsync() with BootSplash.hide()
    content = content.replace(
      /SplashScreen\.hideAsync\(\)/g,
      'BootSplash.hide({ fade: true })',
    );
  } else {
    // No auth. Add BootSplash import and hide call
    const bootsplashImport =
      "import BootSplash from 'react-native-bootsplash';";

    // Add import after existing imports
    const lastImportMatch = content.match(/^import .+$/gm);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const lastImportPos = content.lastIndexOf(lastImport) + lastImport.length;
      content =
        content.slice(0, lastImportPos) +
        '\n' +
        bootsplashImport +
        "\nimport { useEffect } from 'react';\n" +
        content.slice(lastImportPos);
    }

    // Find the main layout/function and add useEffect with BootSplash.hide()
    // Look for function body patterns used in the generated layouts
    const funcPatterns = [
      /function RootLayoutNav\(\).*?\{[\s]*\n/,
      /function Layout\(\).*?\{[\s]*\n/,
      /export default function.*?\{[\s]*\n/,
    ];

    for (const pattern of funcPatterns) {
      const match = content.match(pattern);
      if (match) {
        const insertPos = content.indexOf(match[0]) + match[0].length;
        const hideEffect = `  useEffect(() => {
    BootSplash.hide({ fade: true });
  }, []);\n\n`;
        content =
          content.slice(0, insertPos) + hideEffect + content.slice(insertPos);
        break;
      }
    }
  }

  fs.writeFileSync(layoutPath, content);
  log.info('Added BootSplash.hide() to app/_layout.tsx');
}

module.exports = {
  setupBootsplash,
};
