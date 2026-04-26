const fs = require('fs');
const path = require('path');
const { executeCommand } = require('../utils/commands');
const { log } = require('../utils/logger');
const { parseJsonFile } = require('../utils/config');
const {
  updateBabelAliases,
  writeBabelConfig,
} = require('../utils/babel-config');

async function setupAuthFlow(projectPath, isExpo, useExpoRouter = false, screenConfig = null, pm) {
  // Default screen config if none provided
  const config = screenConfig || {
    hasAuth: true,
    fixedScreens: ['Intro', 'Login'],
    publicScreens: ['PublicHome'],
    privateTabScreens: ['PrivateHome', 'Profile', 'Settings'],
    privateStackScreens: ['Details'],
  };
  log.info('Installing authentication dependencies...');

  // Install auth packages
  // For Expo Router, we don't need @react-navigation/bottom-tabs since we use expo-router tabs
  if (useExpoRouter) {
    await executeCommand(
      pm.add('@forward-software/react-auth axios jwt-check-expiry')
    );
  } else {
    await executeCommand(
      pm.add('@forward-software/react-auth @react-navigation/bottom-tabs axios jwt-check-expiry')
    );
  }

  const srcDir = path.join(projectPath, 'src');

  // Create auth directory
  const authDir = path.join(srcDir, 'auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create auth client
  const authClient = `import { MMKVStorage } from '@mmkv';
import type { AuthClient } from '@forward-software/react-auth';
import axios, { AxiosInstance } from 'axios';
import isJwtTokenExpired from 'jwt-check-expiry';
import env from '@env/env';

type AuthTokens = Partial<{
  access_token: string;
  refresh_token: string;
}>;

type AuthCredentials = {
  email: string;
  password: string;
};

class MyAuthClient implements AuthClient<AuthTokens, AuthCredentials> {
  private axiosAuthClient: AxiosInstance | null = null;

  async onInit() {
    this.axiosAuthClient = axios.create({
      baseURL: env.API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // get tokens from persisted state (MMKV (suggested))
    const tokens = MMKVStorage.getString('tokens');

    if (tokens) {
      return JSON.parse(tokens);
    }

    return null;
  }

  async onLogin(credentials?: AuthCredentials): Promise<AuthTokens> {
    if (!this.axiosAuthClient) {
      return Promise.reject('axios client not initialized!');
    }

    // Replace auth/login with your url without the domain
    const payload = await this.axiosAuthClient.post('/v1/auth/login', {
      email: credentials?.email,
      password: credentials?.password,
    });

    // Check the response data. Sometimes it's data.data, sometimes it's data
    MMKVStorage.set('tokens', JSON.stringify(payload.data));

    return payload.data;
  }

  async onRefresh(currentTokens: AuthTokens): Promise<AuthTokens> {
    if (!this.axiosAuthClient) {
      return Promise.reject('axios client not initialized!');
    }

    if (
      !!currentTokens.access_token &&
      !isJwtTokenExpired(currentTokens.access_token)
    ) {
      return currentTokens;
    }

    const payload = await this.axiosAuthClient.post(
      // Replace jwt/refresh with your url without the domain
      '/v1/auth/refresh-token',
      {
        refreshToken: currentTokens.refresh_token,
      },
      {
        headers: {
          Authorization: \`Bearer \${currentTokens.access_token}\`,
        },
      },
    );

    MMKVStorage.set('tokens', JSON.stringify(payload.data));
    return payload.data;
  }

  onLogout(): Promise<void> {
    MMKVStorage.clearAll();
    // If you need to call an API to logout, just use the onLogin code to do your stuff
    return Promise.resolve();
  }
}

export default MyAuthClient;
`;

  fs.writeFileSync(path.join(authDir, 'client.ts'), authClient);

  // Create auth index
  const authIndex = `import MyAuthClient from './client';
import { createAuth } from '@forward-software/react-auth';

export const authClient = new MyAuthClient();

export const { AuthProvider, useAuthClient } = createAuth(authClient);
`;

  fs.writeFileSync(path.join(authDir, 'index.ts'), authIndex);

  // Create hooks directory
  const hooksDir = path.join(srcDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Create useAsyncCallback hook
  const useAsyncCallback = `import { DependencyList, useCallback, useState } from 'react';

export function useAsyncCallback<
  T extends (...args: never[]) => Promise<unknown>,
>(callback: T, deps: DependencyList): [T, boolean] {
  const [isLoading, setLoading] = useState(false);

  const cb = useCallback(async (...argsx: never[]) => {
    setLoading(true);
    const res = await callback(...argsx);
    setLoading(false);
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps) as T;

  return [cb, isLoading];
}
`;

  fs.writeFileSync(
    path.join(hooksDir, 'useAsyncCallback.ts'),
    useAsyncCallback
  );

  // Create useUserCredentials hook
  const useUserCredentials = `import { useCallback, useState } from 'react';

export function useUserCredentials() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const updateEmail = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const updatePassword = useCallback((text: string) => {
    setPassword(text);
  }, []);

  return {
    email,
    password,
    updateEmail,
    updatePassword,
  };
}
`;

  fs.writeFileSync(
    path.join(hooksDir, 'useUserCredentials.ts'),
    useUserCredentials
  );

  // Create useProfile hook
  const useProfile = `import { useEffect, useState, useCallback } from 'react';
import { useAuthClient } from '@auth';
import { MMKVStorage } from '@mmkv';
import axios from 'axios';
import env from '@env/env';

type ProfileData = {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  avatar: string;
};

const PROFILE_CACHE_KEY = 'user_profile';

export function useProfile() {
  const { tokens } = useAuthClient();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileFromAPI = useCallback(async () => {
    if (!tokens?.access_token) {
      setError('No access token available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get<ProfileData>(
        \`\${env.API_URL}/v1/auth/profile\`,
        {
          headers: {
            Authorization: \`Bearer \${tokens.access_token}\`,
          },
        },
      );

      const profile = response.data;
      setProfileData(profile);

      // Save to MMKV cache
      MMKVStorage.set(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch profile data',
      );
      // On error, try to load from cache as fallback
      try {
        const cachedProfile = MMKVStorage.getString(PROFILE_CACHE_KEY);
        if (cachedProfile) {
          const parsedProfile = JSON.parse(cachedProfile) as ProfileData;
          setProfileData(parsedProfile);
        }
      } catch {
        // If cache also fails, leave error state
      }
    } finally {
      setIsLoading(false);
    }
  }, [tokens?.access_token]);

  const fetchProfile = useCallback(
    async (forceRefresh = false) => {
      // Try to load from cache first if not forcing refresh
      if (!forceRefresh) {
        try {
          const cachedProfile = MMKVStorage.getString(PROFILE_CACHE_KEY);
          if (cachedProfile) {
            const parsedProfile = JSON.parse(cachedProfile) as ProfileData;
            setProfileData(parsedProfile);
            setIsLoading(false);
            setError(null);
            // Still fetch in background to update cache
            fetchProfileFromAPI().catch(() => {
              // Silent fail for background refresh
            });
            return;
          }
        } catch (err) {
          // If cache read fails, continue to fetch from API
          console.warn('Failed to read profile from cache:', err);
        }
      }

      // Fetch from API
      await fetchProfileFromAPI();
    },
    [fetchProfileFromAPI],
  );

  useEffect(() => {
    fetchProfile(false);
  }, [fetchProfile]);

  const refreshProfile = useCallback(() => {
    fetchProfile(true);
  }, [fetchProfile]);

  return {
    profileData,
    isLoading,
    error,
    refreshProfile,
  };
}
`;

  fs.writeFileSync(path.join(hooksDir, 'useProfile.ts'), useProfile);

  // Create Tab Navigator only for React Navigation (not Expo Router)
  if (!useExpoRouter) {
    // Create navigators directory
    const navigatorsDir = path.join(srcDir, 'navigators');
    if (!fs.existsSync(navigatorsDir)) {
      fs.mkdirSync(navigatorsDir, { recursive: true });
    }

    // Generate dynamic Tab Navigator based on screenConfig
    const tabScreens = config.privateTabScreens;
    const DEFAULT_ICONS = { 0: '🏠', 1: '👤', 2: '⚙️', 3: '📋', 4: '🔔', 5: '💬' };

    const tabImports = tabScreens
      .map(
        (name) =>
          `import ${name}Screen from '@screens/${name}Screen';`
      )
      .join('\n');

    const tabIconCallbacks = tabScreens
      .map(
        (name, i) =>
          `  const render${name}Icon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <TabIcon label="${DEFAULT_ICONS[i] || '📄'}" focused={focused} />
    ),
    [],
  );`
      )
      .join('\n\n');

    const tabScreenEntries = tabScreens
      .map(
        (name, i) =>
          `      <Tab.Screen
        name="${name}"
        component={${name}Screen}
        options={{
          title: t('TabNavigator.${name.charAt(0).toLowerCase() + name.slice(1)}'),
          tabBarLabel: t('TabNavigator.tabBarLabels.${name.charAt(0).toLowerCase() + name.slice(1)}'),
          tabBarIcon: render${name}Icon,
        }}
      />`
      )
      .join('\n');

    const tabNavigator = `import React, { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import type { TabParamList } from '@navigation';
${tabImports}
import { useTranslation } from 'react-i18next';

const Tab = createBottomTabNavigator<TabParamList>();

// Simple icon component (you can replace with react-native-vector-icons if needed)
const TabIcon = React.memo(
  ({ label, focused }: { label: string; focused: boolean }) => (
    <Text
      style={[styles.icon, focused ? styles.iconFocused : styles.iconInactive]}
    >
      {label}
    </Text>
  ),
);

function TabNavigator(): React.JSX.Element {
  const { t } = useTranslation();

${tabIconCallbacks}

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#95a5a6',
        headerShown: true,
        tabBarStyle: styles.tabBar,
      }}
    >
${tabScreenEntries}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
  },
  iconFocused: {
    color: '#3498db',
  },
  iconInactive: {
    color: '#95a5a6',
  },
  tabBar: {
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
});

export default TabNavigator;
`;

    fs.writeFileSync(
      path.join(navigatorsDir, 'TabNavigator.tsx'),
      tabNavigator
    );
  }

  // Update babel.config.js to add auth and hooks aliases
  const preset = isExpo
    ? 'babel-preset-expo'
    : 'module:@react-native/babel-preset';

  const aliases = {
    '@mmkv': './src/mmkv',
    '@i18n': './src/i18n',
    '@components': './src/components',
    '@screens': './src/screens',
    '@env/env': './src/env/env.js',
    '@auth': './src/auth',
    '@hooks': './src/hooks',
  };

  // Add @navigation alias for React Navigation (not Expo Router)
  if (!useExpoRouter) {
    aliases['@navigation'] = './navigation.d.ts';
  }

  const babelConfig = updateBabelAliases(projectPath, aliases, preset);
  writeBabelConfig(projectPath, babelConfig);

  // Update tsconfig.json
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');

  // Check if tsconfig.json exists
  if (!fs.existsSync(tsconfigPath)) {
    log.warning(
      'tsconfig.json not found. Skipping auth path aliases configuration.'
    );
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

    if (
      !tsconfig.compilerOptions.paths ||
      typeof tsconfig.compilerOptions.paths !== 'object'
    ) {
      tsconfig.compilerOptions.paths = {};
    }

    tsconfig.compilerOptions.paths['@auth'] = ['./src/auth'];
    tsconfig.compilerOptions.paths['@auth/*'] = ['./src/auth/*'];
    tsconfig.compilerOptions.paths['@hooks'] = ['./src/hooks'];
    tsconfig.compilerOptions.paths['@hooks/*'] = ['./src/hooks/*'];
    tsconfig.compilerOptions.paths['@env/env'] = ['./src/env/env.js'];

    // Add @navigation alias for React Navigation (not Expo Router)
    if (!useExpoRouter) {
      tsconfig.compilerOptions.paths['@navigation'] = ['./navigation.d.ts'];
    }

    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  } catch (error) {
    log.error(
      `Failed to update tsconfig.json for auth path aliases: ${error.message}`
    );
    throw error;
  }

  // Update navigation.d.ts for auth flow (only for React Navigation, not Expo Router)
  if (!useExpoRouter) {
    // Build dynamic RootStackParamList from config
    const rootStackScreens = [
      ...config.fixedScreens,
      ...config.publicScreens,
      'MainTabs',
      ...config.privateStackScreens,
    ];
    const rootStackEntries = rootStackScreens
      .map((name) => `  ${name}: undefined;`)
      .join('\n');

    const tabEntries = config.privateTabScreens
      .map((name) => `  ${name}: undefined;`)
      .join('\n');

    const navTypes = `/**
 * Navigation types for React Navigation
 * Learn more: https://reactnavigation.org/docs/typescript/
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/**
 * Root Stack Navigator Param List
 * Define all your route names and their params here
 */
export type RootStackParamList = {
${rootStackEntries}
};

/**
 * Bottom Tab Navigator Param List
 */
export type TabParamList = {
${tabEntries}
};

/**
 * Helper type for root stack screen props
 * Usage: type Props = RootStackScreenProps<'Intro'>;
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/**
 * Helper type for tab screen props
 * Usage: type Props = TabScreenProps<'${config.privateTabScreens[0]}'>;
 */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * Global type declaration for React Navigation
 * This makes the types available to useNavigation, Link, etc.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}`;

    fs.writeFileSync(path.join(projectPath, 'navigation.d.ts'), navTypes);
    log.success('Navigation types updated for auth flow');
  }

  log.success('Authentication flow dependencies installed');
  log.success('Auth client created with JWT token support');
  log.success(
    'Custom hooks created (useAsyncCallback, useUserCredentials, useProfile)'
  );
  if (!useExpoRouter) {
    log.success(`Tab navigator created with ${config.privateTabScreens.length} tabs`);
  }
}

module.exports = {
  setupAuthFlow,
};
