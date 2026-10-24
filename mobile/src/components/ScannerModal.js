import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme/colors';

export default function ScannerModal({ visible, onClose, onScanBus, buses = [] }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible, permission]);

  const handleBarcodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    const raw = String(data || '').trim().toUpperCase();
    // Match BM number pattern (e.g., BM001, BM014) or look up in fleet
    const matchedBus = buses.find(
      (b) =>
        b.bmNumber === raw ||
        raw.includes(b.bmNumber) ||
        (b.regNo && raw.includes(b.regNo.replace(/\s+/g, '')))
    );

    if (matchedBus) {
      onScanBus(matchedBus);
      onClose();
    } else {
      Alert.alert(
        'Code Scanned',
        `Scanned: "${raw}"\nNo matching bus found in current fleet.`,
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DEPOT QR / BARCODE SCANNER</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Camera View or Permission Prompt */}
        {permission?.granted ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Target Reticle Overlay */}
            <View style={styles.overlay}>
              <View style={styles.reticle}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.guideText}>
                Align Bus Barcode or Charger Bay QR Code inside frame
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.permContainer}>
            <Text style={styles.permIcon}>📷</Text>
            <Text style={styles.permTitle}>Camera Permission Required</Text>
            <Text style={styles.permSub}>
              Camera access is needed to scan bus barcodes and charger bay QR codes on the depot floor.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Grant Camera Access</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Simulator Test Section for Testing without physical barcodes */}
        <View style={styles.simulatorSection}>
          <Text style={styles.simLabel}>🧪 QUICK SIMULATOR (TAP TO TEST SCAN):</Text>
          <View style={styles.simRow}>
            {(buses.slice(0, 4) || []).map((bus) => (
              <TouchableOpacity
                key={bus.bmNumber}
                style={styles.simChip}
                onPress={() => {
                  onScanBus(bus);
                  onClose();
                }}
              >
                <Text style={styles.simChipText}>⚡ {bus.bmNumber}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.surface,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  reticle: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    width: '90%',
    height: 2,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  guideText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 28,
    textAlign: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  permContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  permIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  permSub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permBtn: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  simulatorSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  simLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  simRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simChip: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  simChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
