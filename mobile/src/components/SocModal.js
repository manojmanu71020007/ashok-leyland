import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import BatteryBar from './BatteryBar';

export default function SocModal({ visible, bus, onClose, onSave }) {
  const [socValue, setSocValue] = useState(80);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bus) {
      setSocValue(bus.soc || 80);
    }
  }, [bus]);

  if (!bus) return null;

  const adjustSoc = (delta) => {
    setSocValue((prev) => Math.max(0, Math.min(100, prev + delta)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(bus.bmNumber, socValue);
      onClose();
    } catch (e) {
      Alert.alert('Update Failed', e.message || 'Could not sync with server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.busTitle}>{bus.bmNumber}</Text>
              <Text style={styles.busSub}>{bus.regNo} • Depot {bus.depot}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Current Battery Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>CONFIRMED MANUAL SOC</Text>
            <Text style={[styles.socBig, { color: colors.getSocColor(socValue) }]}>
              {socValue}%
            </Text>
            <BatteryBar soc={socValue} showText={false} size="lg" />
          </View>

          {/* Quick Adjustment Buttons */}
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => adjustSoc(-10)}>
              <Text style={styles.quickBtnText}>-10%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => adjustSoc(-5)}>
              <Text style={styles.quickBtnText}>-5%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => adjustSoc(+5)}>
              <Text style={styles.quickBtnText}>+5%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => adjustSoc(+10)}>
              <Text style={styles.quickBtnText}>+10%</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.presetRow}>
            <TouchableOpacity
              style={[styles.presetBtn, socValue === 100 && styles.presetBtnActive]}
              onPress={() => setSocValue(100)}
            >
              <Text style={styles.presetText}>⚡ 100% Full Charge</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetBtn, socValue === 85 && styles.presetBtnActive]}
              onPress={() => setSocValue(85)}
            >
              <Text style={styles.presetText}>🔋 85% Standard</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>Confirm & Sync</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  busTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  busSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  previewContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  socBig: {
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 10,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
