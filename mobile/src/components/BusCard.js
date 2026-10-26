import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import BatteryBar from './BatteryBar';
import { isBusNewlyAdded } from '../context/FleetContext';
import { useLanguage } from '../context/LanguageContext';

export default function BusCard({ bus, onQuickSoc, onPress }) {
  const { t } = useLanguage();
  const catStyle = colors.getCategoryColor(bus.busCategory);
  const isNew = isBusNewlyAdded(bus);

  const getStatusBadge = () => {
    switch (bus.status) {
      case 'Charging':
        return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', label: `⚡ ${t('in_charging_bay', 'In Charging Bay')}` };
      case 'Cleaning':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: `🧼 ${t('cleaning_protocol', 'Cleaning Protocol')}` };
      case 'Allocated':
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: `🛣️ ${t('on_route', 'On Route')} (${bus.assignedRoute || t('duty', 'Duty')})` };
      default:
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: `✓ ${t('ready_for_scheduling_badge', 'Ready for Scheduling')}` };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => onPress && onPress(bus)}
    >
      {/* Top Row: BM Number, Registration, and Status Badges */}
      <View style={styles.topRow}>
        <View style={styles.idContainer}>
          <Text style={styles.bmNumber}>{bus.bmNumber}</Text>
          <Text style={styles.regNo}>{bus.regNo}</Text>
        </View>

        <View style={styles.badgesRow}>
          {isNew && (
            <View style={styles.newlyAddedBadge}>
              <Text style={styles.newlyAddedBadgeText}>{`✨ ${t('badge_newly_added_bus', 'Newly Added')}`}</Text>
            </View>
          )}

          {/* Category Pill */}
          <View style={[styles.catBadge, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
            <Text style={[styles.catText, { color: catStyle.text }]}>{t('col_category', 'Cat')} {bus.busCategory}</Text>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg, borderColor: statusBadge.border, borderWidth: 1 }]}>
            <Text style={[styles.statusText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
          </View>
        </View>
      </View>

      {/* Middle Row: Route or Depot Info */}
      <View style={styles.metaRow}>
        <Text style={styles.depotText}>{t('depot', 'Depot')} {bus.depot}</Text>
        {bus.assignedRoute ? (
          <Text style={styles.routeText}>{t('th_route', 'Route')}: {bus.assignedRoute}</Text>
        ) : (
          <Text style={styles.rangeText}>{bus.fullDutyDistanceKm} km {t('full_range', 'full range')}</Text>
        )}
      </View>

      {/* Battery SoC Bar */}
      <View style={styles.batteryContainer}>
        <BatteryBar soc={bus.soc} isCharging={bus.isCharging} />
      </View>

      {/* Action Footer */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.quickSocBtn}
          onPress={() => onQuickSoc && onQuickSoc(bus)}
        >
          <Text style={styles.quickSocText}>{`⚡ ${t('quick_update_soc', 'Quick Update SoC')}`}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  idContainer: {
    flexDirection: 'column',
  },
  bmNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  regNo: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  catText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  depotText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  rangeText: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  batteryContainer: {
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  quickSocBtn: {
    backgroundColor: '#f0f9ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  quickSocText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  newlyAddedBadge: {
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'center',
    marginRight: 4,
  },
  newlyAddedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3730a3',
  },
});
