import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageModal({ visible, onClose }) {
  const { currentLang, setLanguage, languages, t } = useLanguage();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>🌐 {t('select_language', 'Select Language')}</Text>
                  <Text style={styles.subtitle}>
                    {t('select_language_subtitle', 'Choose your preferred language')}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Languages List */}
              <View style={styles.langList}>
                {languages.map((lang) => {
                  const isActive = currentLang === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[styles.langItem, isActive && styles.langItemActive]}
                      onPress={() => {
                        setLanguage(lang.code);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.langItemLeft}>
                        <Text style={styles.flagText}>{lang.flag || '🌐'}</Text>
                        <View>
                          <Text style={[styles.langNative, isActive && styles.langNativeActive]}>
                            {lang.native}
                          </Text>
                          <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                            {lang.label}
                          </Text>
                        </View>
                      </View>
                      {isActive ? (
                        <View style={styles.checkCircleActive}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      ) : (
                        <View style={styles.checkCircleInactive} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.doneBtnText}>{t('close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * Reusable pill button to display in top bars / headers.
 */
export function LanguagePickerPill({ onPress, style }) {
  const { currentLangObj } = useLanguage();

  return (
    <TouchableOpacity
      style={[styles.pillBtn, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.pillGlobe}>🌐</Text>
      <Text style={styles.pillText}>{currentLangObj?.native || 'English'}</Text>
      <Text style={styles.pillCaret}>▾</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  langList: {
    gap: 10,
    marginBottom: 16,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  langItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  langItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flagText: {
    fontSize: 22,
  },
  langNative: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  langNativeActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  langLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '500',
  },
  langLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  checkCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  checkCircleInactive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  doneBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillGlobe: {
    fontSize: 13,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pillCaret: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '800',
  },
});
