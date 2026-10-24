import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useFleet } from '../context/FleetContext';

export default function Header({
  title = 'ASHOK LEYLAND',
  onBack,
  showDepotTabs = true,
}) {
  const { selectedDepot, switchDepot, logout, isAuthenticated } = useAuth();
  const { lastUpdated, error } = useFleet();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to return to the Admin Login screen?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Nav Row: Back to Portal button & Sign Out button */}
      <View style={styles.navRow}>
        {onBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnIcon}>←</Text>
            <Text style={styles.backBtnText}>Back to Portal</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.brandBadgeWrap}>
            <Text style={styles.brandBadge}>⚡ EV FLEET SYSTEM</Text>
          </View>
        )}

        <View style={styles.rightActions}>
          {/* Live Sync Pill */}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.pulseDot,
                { backgroundColor: error ? colors.danger : colors.success },
              ]}
            />
            <Text style={styles.statusText}>
              {error ? 'Offline' : 'Live Sync'}
            </Text>
          </View>

          {/* Quick Sign Out Button - strictly rendered only after login */}
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Title Row */}
      <View style={styles.brandRow}>
        <Text style={styles.brandTitle}>{title}</Text>
      </View>

      {/* Depot Selector Tabs (Only Depot 1 & Depot 2 - No Both Depots) */}
      {showDepotTabs && (
        <View style={styles.depotTabs}>
          <TouchableOpacity
            style={[
              styles.depotTab,
              selectedDepot !== '2' && styles.depotTabActive,
            ]}
            onPress={() => switchDepot('1')}
          >
            <Text
              style={[
                styles.depotTabText,
                selectedDepot !== '2' && styles.depotTabTextActive,
              ]}
            >
              🏢 Depot 1 (Chandapura)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.depotTab,
              selectedDepot === '2' && styles.depotTabActive,
            ]}
            onPress={() => switchDepot('2')}
          >
            <Text
              style={[
                styles.depotTabText,
                selectedDepot === '2' && styles.depotTabTextActive,
              ]}
            >
              🏢 Depot 2
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 5,
  },
  backBtnIcon: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '900',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  brandBadgeWrap: {
    paddingVertical: 2,
  },
  brandBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  signOutBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: '#e11d48',
    fontSize: 11,
    fontWeight: '800',
  },
  brandRow: {
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  depotTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  depotTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  depotTabActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  depotTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  depotTabTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
});
