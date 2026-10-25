import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageModal, { LanguagePickerPill } from '../components/LanguageModal';
import { useFleet } from '../context/FleetContext';
import { colors } from '../theme/colors';
import BusCard from '../components/BusCard';
import SocModal from '../components/SocModal';
import ScannerModal from '../components/ScannerModal';

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { id: 'hi', label: 'हिन्दी (Hindi)' },
  { id: 'te', label: 'తెలుగు (Telugu)' },
  { id: 'ta', label: 'தமிழ் (Tamil)' },
];

export default function PortalScreen({ navigation }) {
  const { selectedDepot, switchDepot, logout, isAuthenticated } = useAuth();
  const { buses, stats, loading, refreshing, refreshFleet, updateSoc } = useFleet();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [depotDrawerVisible, setDepotDrawerVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const { currentLang, setLanguage, t } = useLanguage();
  const [selectedBusForSoc, setSelectedBusForSoc] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  const depotName =
    selectedDepot === '2' ? 'Depot 2' : 'Depot 1 (Chandapura)';
  const depotNum = selectedDepot === '2' ? '2' : '1';

  // Filtered bus list
  const filteredBuses = buses.filter((bus) => {
    const matchesSearch =
      bus.bmNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.regNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || bus.busCategory === selectedCategory;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'AVAILABLE' && bus.status === 'Available') ||
      (statusFilter === 'CHARGING' && bus.isCharging) ||
      (statusFilter === 'ALLOCATED' && bus.status === 'Allocated');

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── TOP NAV BAR (Matches website header) ── */}
      <View style={styles.topNav}>
        <View style={styles.topNavLeft}>
          {/* Hamburger Drawer Button */}
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setDepotDrawerVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.hamburgerBar} />
            <View style={styles.hamburgerBar} />
            <View style={styles.hamburgerBar} />
          </TouchableOpacity>

          {/* Active Depot Chip */}
          <TouchableOpacity
            style={styles.activeDepotChip}
            onPress={() => setDepotDrawerVisible(true)}
          >
            <Text style={styles.activeDepotText}>🏢 {depotName}</Text>
            <Text style={styles.chipCaret}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topNavRight}>
          <LanguagePickerPill onPress={() => setLangModalVisible(true)} style={{ marginRight: 6 }} />
          {/* Quick Sign Out Button - strictly rendered only after login */}
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.signOutPill}
              onPress={() => {
                Alert.alert('Sign Out', 'Return to Admin Login Screen?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: logout },
                ]);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutPillText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
        ListHeaderComponent={
          <View>
            {/* ── QUICK ACCESS PORTAL TILES (Exact Website Frontend) ── */}
            <View style={styles.quickSection}>
              <View style={styles.quickHeaderRow}>
                <Text style={styles.quickTitle}>
                  ⚡ DEPOT {depotNum} QUICK ACTIONS
                </Text>
                <View style={styles.quickBadge}>
                  <Text style={styles.quickBadgeText}>{stats.total} Buses</Text>
                </View>
              </View>

              {/* 4 Glassmorphism Gradient Tiles */}
              <View style={styles.tilesGrid}>
                {/* 1. Charging Tile */}
                <TouchableOpacity
                  style={[styles.quickTile, styles.tileCharging]}
                  onPress={() => navigation.navigate('Operations', { initialTab: 'CHARGING' })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.tileEmoji}>⚡</Text>
                  <Text style={[styles.tileTitle, styles.tileTitleCharging]}>Charging {depotNum}</Text>
                  <Text style={[styles.tileSub, styles.tileSubCharging]}>Log sessions</Text>
                </TouchableOpacity>

                {/* 2. Cleaning Tile */}
                <TouchableOpacity
                  style={[styles.quickTile, styles.tileCleaning]}
                  onPress={() => navigation.navigate('Operations', { initialTab: 'CLEANING' })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.tileEmoji}>🧹</Text>
                  <Text style={[styles.tileTitle, styles.tileTitleCleaning]}>Cleaning {depotNum}</Text>
                  <Text style={[styles.tileSub, styles.tileSubCleaning]}>Status record</Text>
                </TouchableOpacity>

                {/* 3. Scheduling Tile */}
                <TouchableOpacity
                  style={[styles.quickTile, styles.tileScheduling]}
                  onPress={() => navigation.navigate('Dispatch')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.tileEmoji}>🎯</Text>
                  <Text style={[styles.tileTitle, styles.tileTitleScheduling]}>Scheduling {depotNum}</Text>
                  <Text style={[styles.tileSub, styles.tileSubScheduling]}>Smart allocation</Text>
                </TouchableOpacity>

                {/* 4. Depot Ops Tile */}
                <TouchableOpacity
                  style={[styles.quickTile, styles.tileDepotOps]}
                  onPress={() => navigation.navigate('Operations', { initialTab: 'COMPLETED' })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.tileEmoji}>🚍</Text>
                  <Text style={[styles.tileTitle, styles.tileTitleDepotOps]}>Depot Ops {depotNum}</Text>
                  <Text style={[styles.tileSub, styles.tileSubDepotOps]}>Route complete</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── KPI FLEET SUMMARY BAR ── */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: colors.success }]}>
                <Text style={styles.kpiVal}>{stats.available}</Text>
                <Text style={styles.kpiLbl}>Ready for Sched</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: colors.warning }]}>
                <Text style={styles.kpiVal}>{stats.allocated}</Text>
                <Text style={styles.kpiLbl}>On Route</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: colors.purple }]}>
                <Text style={styles.kpiVal}>{stats.charging}</Text>
                <Text style={styles.kpiLbl}>In Charging Bay</Text>
              </View>
            </View>

            {/* ── SEARCH & 📷 SCAN BAR ── */}
            <View style={styles.searchSection}>
              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search BM or Reg (e.g. BM001, KA51)"
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Text style={styles.clearSearch}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Camera Scanner Button */}
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setScannerVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.scanBtnText}>📷 Scan</Text>
                </TouchableOpacity>
              </View>

              {/* Category Pills */}
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
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Buses Found</Text>
            <Text style={styles.emptySub}>
              {loading ? 'Synchronizing with live depot server...' : 'No buses match your filter.'}
            </Text>
          </View>
        }
      />

      {/* ── DEPOT HAMBURGER DRAWER MODAL ── */}
      <Modal visible={depotDrawerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDepotDrawerVisible(false)}
        >
          <View style={styles.drawerCard}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>SELECT OPERATING DEPOT</Text>
              <TouchableOpacity onPress={() => setDepotDrawerVisible(false)}>
                <Text style={styles.drawerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {[
              { id: '1', title: 'Depot 1 (Chandapura)', count: '58 Buses', desc: 'Primary Bangalore EV Hub' },
              { id: '2', title: 'Depot 2', count: '65 Buses', desc: 'Secondary Transit Facility' },
            ].map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.depotOption, selectedDepot === d.id && styles.depotOptionActive]}
                onPress={() => {
                  switchDepot(d.id);
                  setDepotDrawerVisible(false);
                }}
              >
                <View>
                  <Text style={[styles.depotOptionTitle, selectedDepot === d.id && styles.depotOptionTitleActive]}>
                    {d.title}
                  </Text>
                  <Text style={styles.depotOptionDesc}>{d.desc}</Text>
                </View>
                <View style={styles.depotOptionBadge}>
                  <Text style={styles.depotOptionBadgeText}>{d.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── QUICK SOC SHEET ── */}
      <SocModal
        visible={!!selectedBusForSoc}
        bus={selectedBusForSoc}
        onClose={() => setSelectedBusForSoc(null)}
        onSave={updateSoc}
      />

      {/* ── CAMERA BARCODE / QR SCANNER ── */}
      <ScannerModal
        visible={scannerVisible}
        buses={buses}
        onClose={() => setScannerVisible(false)}
        onScanBus={(scannedBus) => setSelectedBusForSoc(scannedBus)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  hamburgerBar: {
    width: 18,
    height: 2.2,
    backgroundColor: '#0f172a',
    borderRadius: 2,
  },
  activeDepotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  activeDepotText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  chipCaret: {
    color: '#64748b',
    fontSize: 12,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
    gap: 4,
  },
  langIcon: {
    fontSize: 13,
  },
  langText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  signOutPill: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  signOutPillText: {
    color: '#e11d48',
    fontSize: 11,
    fontWeight: '800',
  },
  quickSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  quickHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickTitle: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickBadge: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  quickBadgeText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '800',
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tileCharging: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  tileCleaning: {
    borderColor: '#7dd3fc',
    backgroundColor: '#f0f9ff',
  },
  tileScheduling: {
    borderColor: '#c4b5fd',
    backgroundColor: '#f5f3ff',
  },
  tileDepotOps: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  tileEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  tileTitleCharging: {
    color: '#15803d',
  },
  tileSubCharging: {
    color: '#166534',
  },
  tileTitleCleaning: {
    color: '#0369a1',
  },
  tileSubCleaning: {
    color: '#0284c7',
  },
  tileTitleScheduling: {
    color: '#5b21b6',
  },
  tileSubScheduling: {
    color: '#6d28d9',
  },
  tileTitleDepotOps: {
    color: '#9a3412',
  },
  tileSubDepotOps: {
    color: '#c2410c',
  },
  tileSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 3.5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  kpiVal: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  kpiLbl: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 44,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 13,
  },
  clearSearch: {
    color: '#94a3b8',
    fontSize: 14,
    padding: 4,
  },
  scanBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  scanBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  pillDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 2,
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  drawerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 0.5,
  },
  drawerClose: {
    fontSize: 18,
    color: '#64748b',
    padding: 4,
  },
  depotOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  depotOptionActive: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  depotOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  depotOptionTitleActive: {
    color: '#0284c7',
  },
  depotOptionDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  depotOptionBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  depotOptionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langOptionActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  langOptionText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  langOptionTextActive: {
    color: '#0284c7',
    fontWeight: '800',
  },
  checkIcon: {
    color: '#0284c7',
    fontSize: 16,
    fontWeight: '900',
  },
});
