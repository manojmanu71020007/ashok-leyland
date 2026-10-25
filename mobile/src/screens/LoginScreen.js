import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { OFFICIAL_DIRECTORY } from '../context/accounts';

export default function LoginScreen() {
  const { loginWithCredentials } = useAuth();
  const { t } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  // Focus tracking for input border highlight (matching admin inputs)
  const [focusedField, setFocusedField] = useState(null);

  const handleSignIn = () => {
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Please enter your username or email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    // Small delay to provide smooth tactile feedback matching website
    setTimeout(() => {
      const res = loginWithCredentials(username.trim(), password);
      setLoading(false);

      if (!res.ok) {
        setErrorMessage(res.error || 'Invalid username or password. Please verify your credentials and try again.');
      }
    }, 250);
  };

  const handleSelectFromDirectory = (item) => {
    setUsername(item.username);
    setPassword(item.password);
    setErrorMessage('');
    setDirectoryModalOpen(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── TOPBAR HEADER (Matching Admin Workspace Style) ── */}
          <View style={styles.topbar}>
            <View style={styles.brandRow}>
              <View style={styles.brandLogoCircle}>
                <Text style={styles.brandLogoIcon}>⚡</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>ASHOK LEYLAND EV FLEET</Text>
                <Text style={styles.topbarTitle}>{t('login_title', 'Portal Sign In')}</Text>
              </View>
            </View>
            <Text style={styles.topbarSub}>
              {t('login_sub', 'Enter authorized credentials to access your designated operations portal.')}
            </Text>
          </View>

          {/* ── MAIN SIGN IN CARD (Admin Workspace Panel UI) ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>🔐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Account Authentication</Text>
                <Text style={styles.cardSubtitle}>
                  Single sign-in routes directly to your allocated division
                </Text>
              </View>
            </View>

            {/* Error Notification Alert (Matching Website alert-error) */}
            {Boolean(errorMessage) && (
              <View style={styles.alertBox}>
                <Text style={styles.alertIcon}>⚠️</Text>
                <Text style={styles.alertText}>{errorMessage}</Text>
              </View>
            )}

            {/* 1. Username Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Username or Email <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => usernameRef.current?.focus()}
                style={[
                  styles.inputWrap,
                  focusedField === 'username' && styles.inputWrapFocused,
                  Boolean(errorMessage) && styles.inputWrapError,
                ]}
              >
                <Text style={styles.inputLeadingIcon}>👤</Text>
                <TextInput
                  ref={usernameRef}
                  style={styles.textInput}
                  placeholder="Enter your username (e.g. CDM001, IS-DEPOT-1)"
                  placeholderTextColor="#94a3b8"
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {Boolean(username) && (
                  <TouchableOpacity
                    onPress={() => {
                      setUsername('');
                      usernameRef.current?.focus();
                    }}
                    style={styles.clearBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* 2. Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Password <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => passwordRef.current?.focus()}
                style={[
                  styles.inputWrap,
                  focusedField === 'password' && styles.inputWrapFocused,
                  Boolean(errorMessage) && styles.inputWrapError,
                ]}
              >
                <Text style={styles.inputLeadingIcon}>🔑</Text>
                <TextInput
                  ref={passwordRef}
                  style={styles.textInput}
                  placeholder="Enter your account password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeBtnText}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            {/* 3. Sign In Action Button (Matching Admin Action Button) */}
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.signInBtnText}>Authenticating...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.signInBtnText}>Sign In ➔</Text>
                </View>
              )}
            </TouchableOpacity>


          </View>

          {/* Footer Branding Note */}
          <View style={styles.footerWrap}>
            <Text style={styles.footerText}>
              Ashok Leyland Intelligent EV Fleet Management System
            </Text>
            <Text style={styles.footerSubText}>
              Depot 1 (Chandapura BMT-32) & Depot 2 (Central DPT-41)
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── MODAL: AUTHORIZED LOGINS DIRECTORY ── */}
      {directoryModalOpen && (
        <Modal
          visible={directoryModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDirectoryModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalHeaderTitle}>📋 Master Webpage Logins</Text>
                  <Text style={styles.modalHeaderSub}>
                    Official credentials from Webpage_Credentials.xlsx
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDirectoryModalOpen(false)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTip}>
                  Tap any role below to automatically pre-fill its allocated credentials:
                </Text>
                {OFFICIAL_DIRECTORY.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dirItemCard}
                    onPress={() => handleSelectFromDirectory(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.dirItemTopRow}>
                      <View style={styles.dirBadge}>
                        <Text style={styles.dirBadgeText}>{item.category}</Text>
                      </View>
                      <Text style={styles.dirAutoFillPill}>Tap to fill ➔</Text>
                    </View>
                    <Text style={styles.dirItemRole}>{item.role}</Text>
                    <Text style={styles.dirItemDest}>📍 {item.destination}</Text>
                    <View style={styles.dirCredsRow}>
                      <Text style={styles.dirCredKey}>
                        User: <Text style={styles.dirCredVal}>{item.username}</Text>
                      </Text>
                      <Text style={styles.dirCredKey}>
                        Password: <Text style={styles.dirCredVal}>{item.password}</Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setDirectoryModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalDoneBtnText}>Close Directory</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#edf2fe',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  // ── Top Bar Header (Matches Admin Workspace exactly) ──
  topbar: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  langModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    elevation: 8,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langItemActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
  },
  langItemFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  langItemLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  langItemLabelActive: {
    color: '#065f46',
  },
  langItemNative: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  langCheck: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  brandLogoIcon: {
    fontSize: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0891b2',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  topbarTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  topbarSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Main Card (Matches Admin Panel container) ──
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 20,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // ── Alert Error Box ──
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1.2,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  alertIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
    lineHeight: 18,
  },

  // ── Form Field Group ──
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#dc2626',
    fontWeight: '800',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapFocused: {
    borderColor: '#0284c7',
    backgroundColor: '#ffffff',
    shadowColor: '#0284c7',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  inputWrapError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  inputLeadingIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 0,
    height: '100%',
    minHeight: 46,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '700',
  },
  eyeBtn: {
    padding: 6,
  },
  eyeBtnText: {
    fontSize: 16,
  },

  // ── Sign In Button ──
  signInBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0284c7',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  signInBtnDisabled: {
    opacity: 0.65,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // ── Quick Directory Link ──
  directoryLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  directoryLinkIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  directoryLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
    textDecorationLine: 'underline',
  },

  // ── Footer ──
  footerWrap: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Directory Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalHeaderSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '700',
  },
  modalTip: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0891b2',
    backgroundColor: '#ecfeff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  dirItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  dirItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dirBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dirBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  dirAutoFillPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dirItemRole: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  dirItemDest: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  dirCredsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dirCredKey: {
    fontSize: 11,
    color: '#64748b',
  },
  dirCredVal: {
    fontWeight: '700',
    color: '#0f172a',
  },
  modalDoneBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  modalDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});
