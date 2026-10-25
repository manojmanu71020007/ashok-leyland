import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api, getServerUrl, setServerUrl, DEFAULT_SERVER_URL } from '../api/client';
import Header from '../components/Header';

export default function SettingsScreen({ navigation }) {
  const { user, selectedDepot, switchDepot, logout } = useAuth();
  const [serverInput, setServerInput] = useState(getServerUrl());
  const [testingPing, setTestingPing] = useState(false);
  const { currentLang: selectedLang, setLanguage: setSelectedLang, t } = useLanguage();

  const testConnection = async () => {
    setTestingPing(true);
    setServerUrl(serverInput);
    try {
      const res = await api.checkHealth();
      if (res.ok) {
        Alert.alert('Server Connected', `Successfully reached: ${serverInput}`);
      } else {
        Alert.alert('Connection Failed', res.error || 'Server is not responding.');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setTestingPing(false);
    }
  };

  const resetServer = () => {
    setServerInput(DEFAULT_SERVER_URL);
    setServerUrl(DEFAULT_SERVER_URL);
    Alert.alert('Reset Complete', 'Reverted back to live cloud server (Render).');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="SETTINGS & NETWORK"
        onBack={() => navigation.navigate('Portal')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CURRENT OPERATOR SESSION</Text>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.name || 'Depot Manager'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'operator@ashokleyland.com'}</Text>
              <Text style={styles.userRole}>Role: {user?.role || 'Fleet Operator'}</Text>
            </View>
          </View>
        </View>

        {/* Server Connection URL */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BACKEND SERVER ENDPOINT</Text>
          <Text style={styles.cardDesc}>
            Connects to the Ashok Leyland fleet synchronization server.
          </Text>
          <TextInput
            style={styles.input}
            value={serverInput}
            onChangeText={setServerInput}
            autoCapitalize="none"
            placeholder="https://..."
            placeholderTextColor={colors.textSubtle}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnTest]}
              onPress={testConnection}
              disabled={testingPing}
            >
              <Text style={styles.btnTestText}>
                {testingPing ? 'Testing...' : '⚡ Test Connection'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnReset]} onPress={resetServer}>
              <Text style={styles.btnResetText}>Reset Cloud URL</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Depot Preference */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DEFAULT DEPOT FACILITY</Text>
          <View style={styles.choiceRow}>
            {[
              { id: '1', label: 'Depot 1 (Chandapura)' },
              { id: '2', label: 'Depot 2' },
            ].map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.choiceBtn, selectedDepot === d.id && styles.choiceBtnActive]}
                onPress={() => switchDepot(d.id)}
              >
                <Text
                  style={[
                    styles.choiceText,
                    selectedDepot === d.id && styles.choiceTextActive,
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SYSTEM LANGUAGE (ಭಾಷೆ / भाषा)</Text>
          <View style={styles.choiceRow}>
            {[
              { id: 'en', label: 'English' },
              { id: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
              { id: 'hi', label: 'हिन्दी (Hindi)' },
              { id: 'te', label: 'తెలుగు (Telugu)' },
              { id: 'ta', label: 'தமிழ் (Tamil)' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[styles.choiceBtn, selectedLang === lang.id && styles.choiceBtnActive]}
                onPress={() => setSelectedLang(lang.id)}
              >
                <Text
                  style={[
                    styles.choiceText,
                    selectedLang === lang.id && styles.choiceTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Out Action */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to end your current session?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
              ]
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutIcon}>🚪</Text>
          <Text style={styles.signOutText}>Sign Out / Switch Admin</Text>
        </TouchableOpacity>

        {/* App Info Footer */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Ashok Leyland Fleet Manager v1.0.0 (Native)</Text>
          <Text style={styles.appBuild}>Built with React Native & Expo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: 20,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  userRole: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnTest: {
    backgroundColor: colors.primaryDark,
  },
  btnTestText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  btnReset: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnResetText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceBtnActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  choiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  choiceTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 20,
  },
  signOutIcon: {
    fontSize: 16,
  },
  signOutText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '800',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appVersion: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  appBuild: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 4,
  },
});
