/**
 * DetailsScreen Template
 * Template for the details screen
 * Note: React Navigation and Expo Router versions differ significantly
 */

const DETAILS_SCREEN_TEMPLATE_RN = `import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@hooks/useProfile';

function DetailsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { profileData, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>{t('DetailsScreen.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('DetailsScreen.error')}</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('DetailsScreen.noData')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('DetailsScreen.title')}</Text>

      {profileData.avatar && (
        <View style={styles.avatarContainer}>
          <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.id')}</Text>
        <Text style={styles.value}>{profileData.id}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.name')}</Text>
        <Text style={styles.value}>{profileData.name}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.email')}</Text>
        <Text style={styles.value}>{profileData.email}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.role')}</Text>
        <Text style={styles.value}>{profileData.role}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.password')}</Text>
        <Text style={styles.value}>{profileData.password}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2c3e50',
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3498db',
  },
  infoContainer: {
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
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});

export default DetailsScreen;
`;

const DETAILS_SCREEN_TEMPLATE_EXPO = `import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@hooks/useProfile';

function DetailsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { profileData, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>{t('DetailsScreen.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('DetailsScreen.error')}</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('DetailsScreen.noData')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('DetailsScreen.title')}</Text>

      {profileData.avatar && (
        <View style={styles.avatarContainer}>
          <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.id')}</Text>
        <Text style={styles.value}>{profileData.id}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.name')}</Text>
        <Text style={styles.value}>{profileData.name}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.email')}</Text>
        <Text style={styles.value}>{profileData.email}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.role')}</Text>
        <Text style={styles.value}>{profileData.role}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('DetailsScreen.password')}</Text>
        <Text style={styles.value}>{profileData.password}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2c3e50',
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3498db',
  },
  infoContainer: {
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
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});

export default DetailsScreen;
`;

function getDetailsScreenTemplate(framework, options = {}) {
  const { FRAMEWORKS, applyTheme } = require('./adapter');
  const screenName = options.screenName || 'Details';
  const componentName = `${screenName}Screen`;

  let rendered;
  if (framework === FRAMEWORKS.REACT_NAVIGATION) {
    rendered = DETAILS_SCREEN_TEMPLATE_RN;
  } else {
    rendered = DETAILS_SCREEN_TEMPLATE_EXPO;
  }

  // Replace hardcoded names with dynamic ones
  rendered = rendered.replace(/function DetailsScreen/g, `function ${componentName}`);
  rendered = rendered.replace(/export default DetailsScreen/g, `export default ${componentName}`);
  rendered = rendered.replace(/DetailsScreen\./g, `${componentName}.`);

  if (options.useTheme) {
    rendered = applyTheme(rendered);
  }

  return rendered;
}

module.exports = {
  DETAILS_SCREEN_TEMPLATE_RN,
  DETAILS_SCREEN_TEMPLATE_EXPO,
  getDetailsScreenTemplate,
};
