const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const {
  readBabelConfig,
  updateBabelAliases,
  writeBabelConfig,
} = require('./babel-config');

/**
 * Normalize tsconfig include patterns.
 * Fixes malformed patterns (e.g., triple-asterisk-dot to double-asterisk-slash-dot format).
 * This is called automatically when parsing tsconfig.json files.
 */
function normalizeTsConfigInclude(tsconfig) {
  if (tsconfig.include && Array.isArray(tsconfig.include)) {
    tsconfig.include = tsconfig.include.map((pattern) => {
      if (typeof pattern === 'string') {
        // Fix patterns like "***.tsx" to "**/*.tsx"
        return pattern.replace(/^\*\*\*\./, '**/*.');
      }
      return pattern;
    });
  }
  return tsconfig;
}

/**
 * Parse JSON file. Handles trailing commas and comments (common in tsconfig.json).
 * Since we write back with JSON.stringify(), comments are not preserved anyway.
 * Automatically normalizes tsconfig.json include patterns.
 */
function parseJsonFile(filePath) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  // Read file
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw error;
  }

  // Try standard JSON.parse first (fast path for valid JSON)
  try {
    const result = JSON.parse(content);

    // Validate that result is an object
    if (
      result === null ||
      typeof result !== 'object' ||
      Array.isArray(result)
    ) {
      throw new Error(
        `Invalid JSON file: expected object, got ${
          result === null
            ? 'null'
            : Array.isArray(result)
            ? 'array'
            : typeof result
        }`
      );
    }

    // Automatically normalize tsconfig.json include patterns
    if (filePath.endsWith('tsconfig.json')) {
      normalizeTsConfigInclude(result);
    }

    return result;
  } catch (parseError) {
    // If it's not a syntax error, rethrow it
    if (parseError.name !== 'SyntaxError') {
      throw parseError;
    }

    // Try to fix common issues: trailing commas and comments
    let cleaned = content
      // Remove single-line comments
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove trailing commas before } or ]
      .replace(/,\s*(\}|\])/g, '$1')
      .trim();

    // Try parsing again
    try {
      const result = JSON.parse(cleaned);

      // Validate that result is an object
      if (
        result === null ||
        typeof result !== 'object' ||
        Array.isArray(result)
      ) {
        throw new Error(
          `Invalid JSON file: expected object, got ${
            result === null
              ? 'null'
              : Array.isArray(result)
              ? 'array'
              : typeof result
          }`
        );
      }

      // Automatically normalize tsconfig.json include patterns
      if (filePath.endsWith('tsconfig.json')) {
        normalizeTsConfigInclude(result);
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to parse JSON file: ${filePath}\n${error.message}`
      );
    }
  }
}

function updateTsConfig(projectPath) {
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');

  // Check if tsconfig.json exists
  if (!fs.existsSync(tsconfigPath)) {
    log.warning('tsconfig.json not found. Skipping TypeScript configuration.');
    return;
  }

  try {
    const tsconfig = parseJsonFile(tsconfigPath);

    // Ensure compilerOptions exists and is an object
    if (
      !tsconfig.compilerOptions ||
      typeof tsconfig.compilerOptions !== 'object'
    ) {
      tsconfig.compilerOptions = {};
    }

    // Merge existing compilerOptions with strict mode settings
    tsconfig.compilerOptions = {
      ...tsconfig.compilerOptions,
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictBindCallApply: true,
      strictPropertyInitialization: true,
      noImplicitThis: true,
      alwaysStrict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
    };

    // Add exclude array to ignore config files
    if (!tsconfig.exclude) {
      tsconfig.exclude = [];
    }
    const configFilesToExclude = ['babel.config.js', '.eslintrc.js'];
    configFilesToExclude.forEach((file) => {
      if (!tsconfig.exclude.includes(file)) {
        tsconfig.exclude.push(file);
      }
    });

    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    log.success('TypeScript configured with strict mode');
  } catch (error) {
    log.error(`1. Failed to update tsconfig.json: ${error.message}`);
    throw error;
  }
}

function fixEslintConfig(projectPath) {
  const eslintrcPath = path.join(projectPath, '.eslintrc.js');
  if (fs.existsSync(eslintrcPath)) {
    const eslintConfig = `module.exports = {
  root: true,
  extends: '@react-native',
  parserOptions: {
    requireConfigFile: false,
  },
};
`;
    fs.writeFileSync(eslintrcPath, eslintConfig);
    log.success('ESLint configured to skip Babel config requirement');
  }
}

async function setupPathAliases(projectPath, isExpo, pm) {
  // Install babel-plugin-module-resolver and babel-preset-expo (for Expo)
  log.info('Installing babel dependencies...');
  const { executeCommand } = require('./commands');
  if (isExpo) {
    await executeCommand(
      pm.addDev('babel-plugin-module-resolver babel-preset-expo')
    );
  } else {
    await executeCommand(pm.addDev('babel-plugin-module-resolver'));
  }

  // Update tsconfig.json to include path aliases
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');

  // Check if tsconfig.json exists
  if (!fs.existsSync(tsconfigPath)) {
    log.warning(
      'tsconfig.json not found. Skipping path aliases configuration.'
    );
    return;
  }

  try {
    const tsconfig = parseJsonFile(tsconfigPath);

    if (
      !tsconfig.compilerOptions ||
      typeof tsconfig.compilerOptions !== 'object'
    ) {
      tsconfig.compilerOptions = {};
    }

    if (!tsconfig.compilerOptions.paths) {
      tsconfig.compilerOptions.paths = {};
    }
    tsconfig.compilerOptions.paths['@components/*'] = ['./src/components/*'];
    tsconfig.compilerOptions.paths['@screens/*'] = ['./src/screens/*'];

    // Add @navigation alias if react-navigation is used (navigation.d.ts exists)
    if (fs.existsSync(path.join(projectPath, 'navigation.d.ts'))) {
      tsconfig.compilerOptions.paths['@navigation'] = ['./navigation.d.ts'];
    }

    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  } catch (error) {
    log.error(
      `2. Failed to update tsconfig.json for path aliases: ${error.message}`
    );
    throw error;
  }

  // Update babel.config.js to include path aliases
  const preset = isExpo
    ? 'babel-preset-expo'
    : 'module:@react-native/babel-preset';

  const aliases = {
    '@components': './src/components',
    '@screens': './src/screens',
  };

  // Add @navigation alias if react-navigation is used
  if (fs.existsSync(path.join(projectPath, 'navigation.d.ts'))) {
    aliases['@navigation'] = './navigation.d.ts';
  }

  const babelConfig = updateBabelAliases(projectPath, aliases, preset);
  writeBabelConfig(projectPath, babelConfig);

  log.success('Path aliases configured for TypeScript and Babel');
}

function addNavigationAlias(projectPath) {
  // Update babel.config.js to add @navigation alias
  // Try to read existing config to preserve preset
  const existingConfig = readBabelConfig(projectPath);
  let preset = null;

  if (
    existingConfig &&
    existingConfig.presets &&
    existingConfig.presets.length > 0
  ) {
    // Use existing preset
    preset = existingConfig.presets[0];
  } else {
    // Detect preset from app.json if config doesn't exist
    if (fs.existsSync(path.join(projectPath, 'app.json'))) {
      try {
        const appJson = JSON.parse(
          fs.readFileSync(path.join(projectPath, 'app.json'), 'utf8')
        );
        preset = appJson.expo
          ? 'babel-preset-expo'
          : 'module:@react-native/babel-preset';
      } catch {
        preset = 'module:@react-native/babel-preset';
      }
    } else {
      preset = 'module:@react-native/babel-preset';
    }
  }

  const aliases = {
    '@navigation': './navigation.d.ts',
  };

  const babelConfig = updateBabelAliases(projectPath, aliases, preset);
  writeBabelConfig(projectPath, babelConfig);

  // Update tsconfig.json to add @navigation alias
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = parseJsonFile(tsconfigPath);

      // Validate tsconfig is an object
      if (!tsconfig || typeof tsconfig !== 'object') {
        throw new Error(
          `Invalid tsconfig.json: expected object, got ${typeof tsconfig}`
        );
      }

      if (
        !tsconfig.compilerOptions ||
        typeof tsconfig.compilerOptions !== 'object'
      ) {
        tsconfig.compilerOptions = {};
      }

      if (
        !tsconfig.compilerOptions.paths ||
        typeof tsconfig.compilerOptions.paths !== 'object'
      ) {
        tsconfig.compilerOptions.paths = {};
      }

      // Add @navigation alias if it doesn't exist
      if (!tsconfig.compilerOptions.paths['@navigation']) {
        tsconfig.compilerOptions.paths['@navigation'] = ['./navigation.d.ts'];
      }

      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    } catch (error) {
      log.error(
        `3. Failed to update tsconfig.json for navigation alias: ${error.message}`
      );
      throw error;
    }
  }
}

function setupEnvironmentScripts(projectPath) {
  // Copy scripts directory to the new project
  const scriptsSourceDir = path.join(__dirname, '../../scripts');
  const scriptsDestDir = path.join(projectPath, 'scripts');

  if (!fs.existsSync(scriptsDestDir)) {
    fs.mkdirSync(scriptsDestDir, { recursive: true });
  }

  // Copy set-environment.js script
  const scriptSourcePath = path.join(scriptsSourceDir, 'set-environment.js');
  const scriptDestPath = path.join(scriptsDestDir, 'set-environment.js');

  if (fs.existsSync(scriptSourcePath)) {
    fs.copyFileSync(scriptSourcePath, scriptDestPath);
    log.info('Copied environment management script');
  } else {
    log.warning('Warning: set-environment.js not found in scripts folder');
  }

  // Create .env.* files with placeholder values
  const envTemplate = (envName) =>
    `# ${envName.charAt(0).toUpperCase() + envName.slice(1)} Environment Configuration\n` +
    `# These values are used by 'npm run env:${envName === 'development' ? 'dev' : envName === 'staging' ? 'stage' : 'prod'}'\n\n` +
    `API_URL=https://api.escuelajs.co/api\n` +
    `API_KEY=${envName}-api-key\n` +
    `ENVIRONMENT=${envName}\n`;

  fs.writeFileSync(
    path.join(projectPath, '.env.development'),
    envTemplate('development')
  );
  fs.writeFileSync(
    path.join(projectPath, '.env.staging'),
    envTemplate('staging')
  );
  fs.writeFileSync(
    path.join(projectPath, '.env.production'),
    envTemplate('production')
  );

  // Create .env.example (committed to git as a template)
  const envExample =
    `# Environment Configuration\n` +
    `# Copy this file to .env.development, .env.staging, .env.production\n` +
    `# and fill in the values for each environment.\n\n` +
    `API_URL=https://api.example.com\n` +
    `API_KEY=your-api-key-here\n` +
    `ENVIRONMENT=development\n`;

  fs.writeFileSync(path.join(projectPath, '.env.example'), envExample);
  log.info('Created .env.* environment files and .env.example');

  // Add environment entries to .gitignore
  addToGitignore(projectPath, [
    '# Environment files',
    '.env.*',
    '!.env.example',
    'src/env/env.js',
  ]);

  // Update package.json to add environment scripts
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  // Add environment scripts
  packageJson.scripts['env:dev'] =
    'node scripts/set-environment.js development';
  packageJson.scripts['env:stage'] = 'node scripts/set-environment.js staging';
  packageJson.scripts['env:prod'] =
    'node scripts/set-environment.js production';

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  log.success('Environment management scripts added to package.json');
}

/**
 * Append entries to .gitignore, skipping any that already exist
 */
function addToGitignore(projectPath, entries) {
  const gitignorePath = path.join(projectPath, '.gitignore');
  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
  }
  const linesToAdd = entries.filter((entry) => !content.includes(entry));
  if (linesToAdd.length > 0) {
    content += '\n' + linesToAdd.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, content);
  }
}

function setupSrcDirectory(projectPath, spinner) {
  spinner?.message('Creating src/components...');

  // Create src directory (for both Expo and React Native CLI)
  const srcDir = path.join(projectPath, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir);
  }

  // Create components directory
  const componentsDir = path.join(srcDir, 'components');
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir);
  }

  // Create a placeholder README in components
  const componentsReadme = `# Components

Place your reusable React components here.

Example structure:
- Button/
  - index.tsx
  - styles.ts
- Card/
  - index.tsx
  - styles.ts
`;

  fs.writeFileSync(path.join(componentsDir, 'README.md'), componentsReadme);
}

module.exports = {
  updateTsConfig,
  fixEslintConfig,
  setupPathAliases,
  addNavigationAlias,
  setupEnvironmentScripts,
  addToGitignore,
  setupSrcDirectory,
  parseJsonFile,
};
