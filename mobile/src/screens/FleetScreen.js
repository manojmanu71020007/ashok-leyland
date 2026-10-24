import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { useFleet } from '../context/FleetContext';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import BusCard from '../components/BusCard';
import SocModal from '../components/SocModal';
import ScannerModal from '../components/ScannerModal';

export default function FleetScreen({ navigation }) {
  const { buses, stats, loading, refreshing, refreshFleet, updateSoc } = useFleet();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [selectedBusForSoc, setSelectedBusForSoc] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Filtered List
  const filteredBuses = buses.filter((bus) => {
    // Search filter
    const matchesSearch =
      bus.bmNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.regNo.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCat =
      selectedCategory === 'ALL' || bus.busCategory === selectedCategory;

    // Status filter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'AVAILABLE' && bus.status === 'Available') ||
      (statusFilter === 'CHARGING' && bus.isCharging) ||
      (statusFilter === 'ALLOCATED' && bus.status === 'Allocated');

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <View style={styles.container}>
      <Header title="FLEET DASHBOARD" />

      {/* KPI Stats Scrollable Bar */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatCard label="Total Fleet" value={stats.total} color={colors.primary} icon="🚌" />
          <StatCard label="Ready for Sched" value={stats.available} color={colors.success} icon="⚡" />
          <StatCard label="On Route" value={stats.allocated} color={colors.warning} icon="🛣️" />
          <StatCard label="In Charging Bay" value={stats.charging} color={colors.purple} icon="🔌" />
        </ScrollView>
      </View>

      {/* Search & Category Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search BM or Reg (e.g. BM001)"
              placeholderTextColor={colors.textSubtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => setScannerVisible(true)}
          >
            <Text style={styles.scanBtnText}>📷 Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.pillsRow}>
          {['ALL', 'A', 'B', 'C'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, selectedCategory === cat && styles.pillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.pillText, selectedCategory === cat && styles.pillTextActive]}>
                {cat === 'ALL' ? 'All Classes' : `Cat ${cat}`}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.pillDivider} />

          {['ALL', 'AVAILABLE', 'CHARGING'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.pill, statusFilter === st && styles.pillActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[styles.pillText, statusFilter === st && styles.pillTextActive]}>
                {st === 'ALL' ? 'All' : st === 'AVAILABLE' ? 'Ready' : 'In Bay'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bus Cards List */}
      <FlatList
        data={filteredBuses}
        keyExtractor={(item) => item.bmNumber}
        renderItem={({ item }) => (
          <BusCard
            bus={item}
            onQuickSoc={(b) => setSelectedBusForSoc(b)}
            onPress={(b) => setSelectedBusForSoc(b)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFleet}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Buses Found</Text>
            <Text style={styles.emptySub}>
              {loading
                ? 'Loading fleet data from server...'
                : 'Try adjusting your search or depot filter.'}
            </Text>
          </View>
        }
      />

      {/* Quick SoC Update Modal */}
      <SocModal
        visible={!!selectedBusForSoc}
        bus={selectedBusForSoc}
        onClose={() => setSelectedBusForSoc(null)}
        onSave={updateSoc}
      />

      {/* Barcode & QR Camera Scanner */}
      <ScannerModal
        visible={scannerVisible}
        buses={buses}
        onClose={() => setScannerVisible(false)}
        onScanBus={(scannedBus) => {
          setSelectedBusForSoc(scannedBus);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsContainer: {
    paddingVertical: 12,
  },
  statsRow: {
    paddingHorizontal: 12,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
  },
  scanBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  scanBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  clearSearch: {
    color: colors.textMuted,
    fontSize: 14,
    padding: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  pillDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
  },
});
