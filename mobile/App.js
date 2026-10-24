import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { FleetProvider } from './src/context/FleetContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#f8fafc" />
      <LanguageProvider>
        <AuthProvider>
          <FleetProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </FleetProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
