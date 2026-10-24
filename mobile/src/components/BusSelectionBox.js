import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';
import BatteryBar from './BatteryBar';
import { INITIAL_FLEET } from '../context/initialFleet';

export default function BusSelectionBox({
  buses = [],
  selectedBus = null,
  onSelectBus,
  placeholder = 'Select a Bus from list...',
  title = 'SELECT DEPOT BUS',
  searchPlaceholder = 'Search by BM or Reg No...',
  showDepotBadge = false,
  label = 'BUS SELECTION BOX',
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback to INITIAL_FLEET if buses is empty so the list is NEVER empty
  const activeFleet = buses && buses.length > 0 ? buses : INITIAL_FLEET;

  const filteredList = activeFleet.filter((b) => {
    if (!b) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const bm = String(b.bmNumber || b.id || '').toLowerCase();
    const reg = String(b.regNo || '').toLowerCase();
    const route = String(b.assignedRoute || '').toLowerCase();
    return bm.includes(q) || reg.includes(q) || route.includes(q);
  });

  const handleSelect = (bus) => {
    onSelectBus && onSelectBus(bus);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelectBus && onSelectBus(null);
  };

  return (
    <View style={styles.container}>
      {/* Label and Count */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.countBadge}>
          {activeFleet.length} Buses {showDepotBadge ? '(All Depots)' : 'Available'}
        </Text>
      </View>

      {/* Main Trigger Box (Selection Box) */}
      <View style={styles.triggerRow}>
        <TouchableOpacity
          style={[styles.selectionTrigger, selectedBus && styles.selectionTriggerActive]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.busIcon}>🚌</Text>
          <View style={styles.selectionTextWrap}>
            {selectedBus ? (
              <View>
                <View style={styles.selectedTitleRow}>
                  <Text style={styles.selectedBm}>{selectedBus.bmNumber}</Text>
                  <Text style={styles.selectedReg}>{selectedBus.regNo}</Text>
                  {showDepotBadge && (
                    <View style={styles.inlineDepotBadge}>
                      <Text style={styles.inlineDepotText}>Depot {selectedBus.depot}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.selectedSub}>
                  SoC: {selectedBus.soc}% • Cat {selectedBus.busCategory} • Status: {selectedBus.status}
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>{placeholder}</Text>
            )}
          </View>
          <Text style={styles.caret}>▾</Text>
        </TouchableOpacity>

        {selectedBus && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} title="Clear selection">
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Selection Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalSub}>{activeFleet.length} total buses in yard list</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input Box */}
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textSubtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bus List */}
            <FlatList
              data={filteredList}
              keyExtractor={(item) => item.bmNumber}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = selectedBus && selectedBus.bmNumber === item.bmNumber;
                const catStyle = colors.getCategoryColor(item.busCategory);
                return (
                  <TouchableOpacity
                    style={[styles.busItem, isSelected && styles.busItemActive]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.busItemLeft}>
                      <View style={styles.busIdRow}>
                        <Text style={[styles.busItemBm, isSelected && styles.busItemBmActive]}>
                          {item.bmNumber}
                        </Text>
                        <Text style={styles.busItemReg}>{item.regNo}</Text>
                        {showDepotBadge && (
                          <View style={styles.depotItemBadge}>
                            <Text style={styles.depotItemBadgeText}>Depot {item.depot}</Text>
                          </View>
                        )}
                        <View style={[styles.catItemBadge, { backgroundColor: catStyle.bg }]}>
                          <Text style={[styles.catItemText, { color: catStyle.text }]}>
                            Cat {item.busCategory}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.batteryRow}>
                        <View style={{ width: 120 }}>
                          <BatteryBar soc={item.soc} isCharging={item.isCharging} size="sm" showText={false} />
                        </View>
                        <Text style={[styles.socText, { color: colors.getSocColor(item.soc) }]}>
                          {item.soc}% SoC
                        </Text>
                        <Text style={styles.statusPill}>{item.status}</Text>
                      </View>
                    </View>

                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    {buses && buses.length === 0
                      ? 'Loading fleet buses...'
                      : searchQuery
                      ? `No buses match "${searchQuery}"`
                      : 'No buses found'}
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  countBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  selectionTriggerActive: {
    borderColor: colors.primary,
    backgroundColor: '#f0f9ff',
  },
  busIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  selectionTextWrap: {
    flex: 1,
  },
  placeholderText: {
    fontSize: 13,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  selectedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  selectedBm: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
  },
  selectedReg: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  inlineDepotBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inlineDepotText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  selectedSub: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  caret: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 6,
  },
  clearBtn: {
    width: 38,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  clearBtnText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  clearSearchText: {
    color: colors.textSubtle,
    fontSize: 13,
    padding: 4,
  },
  list: {
    maxHeight: 380,
  },
  busItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 6,
  },
  busItemActive: {
    backgroundColor: '#f0f9ff',
    borderColor: colors.primary,
  },
  busItemLeft: {
    flex: 1,
  },
  busIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  busItemBm: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  busItemBmActive: {
    color: colors.primary,
  },
  busItemReg: {
    fontSize: 11,
    color: colors.textMuted,
  },
  depotItemBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  depotItemBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  catItemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  catItemText: {
    fontSize: 9,
    fontWeight: '800',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPill: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  checkMark: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '900',
    marginLeft: 8,
  },
  emptyWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
