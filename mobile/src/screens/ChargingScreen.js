import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { exportCsvFile } from '../utils/exportCsv';

export default function ChargingScreen() {
  const {
    buses,
    lockedBuses,
    chargingHistory,
    lockBus,
    submitChargingRecord,
  } = useFleet();
  const { selectedDepot, logout, returnToLogin } = useAuth();
  const { t } = useLanguage();

  const depotNum = selectedDepot === '2' ? '2' : '1';
  const depotName = selectedDepot === '2' ? 'Depot 2' : 'Depot 1 (Chandapura)';

  // ── Search & Bus Selection State ──
  const [searchInput, setSearchInput] = useState('');
  const [selectedBus, setSelectedBus] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── Charging Parameters ──
  const [socBefore, setSocBefore] = useState(20);
  const [socAfter, setSocAfter] = useState(80);
  const [socBeforeInput, setSocBeforeInput] = useState('20');
  const [socAfterInput, setSocAfterInput] = useState('80');
  const [chargingStatus, setChargingStatus] = useState('Completed');
  const [remarks, setRemarks] = useState('');

  // ── Swipeable Bar State ──
  const [barWidthBefore, setBarWidthBefore] = useState(300);
  const [barWidthAfter, setBarWidthAfter] = useState(300);

  const handleTouchSoc = (locationX, barWidth, type) => {
    if (!barWidth || barWidth <= 0) return;
    const clampedX = Math.max(0, Math.min(barWidth, locationX));
    const pct = Math.round((clampedX / barWidth) * 100);
    const validPct = Math.max(0, Math.min(100, pct));
    if (type === 'before') {
      setSocBefore(validPct);
      setSocBeforeInput(String(validPct));
    } else {
      setSocAfter(validPct);
      setSocAfterInput(String(validPct));
    }
  };

  // ── Modals ──
  const [ongoingModalOpen, setOngoingModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [historyQuery, setHistoryQuery] = useState('');

  // Filter depot buses strictly
  const depotBuses = buses.filter((b) => String(b.depot || '1') === depotNum);

  // Filter buses based on visible search input
  const filteredBuses = depotBuses.filter((b) => {
    if (!searchInput.trim()) return true;
    const q = searchInput.toLowerCase().trim();
    return (
      b.bmNumber.toLowerCase().includes(q) ||
      (b.regNo && b.regNo.toLowerCase().includes(q))
    );
  });

  const handleSelectBus = (bus) => {
    setSelectedBus(bus);
    setDropdownOpen(false);
    if (bus) {
      setSearchInput(bus.bmNumber);
      const current = Number(bus.soc || 80);
      setSocBefore(current);
      setSocBeforeInput(String(current));
      const target = Math.min(100, Math.max(current, 85));
      setSocAfter(target);
      setSocAfterInput(String(target));
    }
  };

  const handleClearSelection = () => {
    setSelectedBus(null);
    setSearchInput('');
  };

  // Check lock status
  const isLockedForCharging = selectedBus
    ? lockedBuses.some(
        (x) =>
          String(x.bm || x.bmNumber).toUpperCase() === selectedBus.bmNumber &&
          String(x.page || '').toLowerCase().includes('charg')
      )
    : false;

  const isLockedForCleaning = selectedBus
    ? lockedBuses.some(
        (x) =>
          String(x.bm || x.bmNumber).toUpperCase() === selectedBus.bmNumber &&
          String(x.page || '').toLowerCase().includes('clean')
      )
    : false;

  const ongoingChargingList = lockedBuses.filter((x) => {
    const isChg = String(x.page || '').toLowerCase().includes('charg');
    const busDepot = String(x.depot || '1');
    return isChg && busDepot === depotNum;
  });

  const getNowFormatted = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fullTimeStr = `${timeStr}, ${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return { now, timeStr, fullTimeStr };
  };

  const handleLockBus = () => {
    if (!selectedBus) {
      Alert.alert('Selection Required', 'Please choose a bus first.');
      return;
    }
    if (selectedBus.isAllocated) {
      Alert.alert('Bus On Route', `Bus ${selectedBus.bmNumber} is currently on route. It cannot be charged until marked 'Completed Route' in Depot Operations!`);
      return;
    }
    if (isLockedForCleaning) {
      Alert.alert('Bus In Cleaning', `Bus ${selectedBus.bmNumber} is currently undergoing cleaning! Complete cleaning first.`);
      return;
    }

    const { now, fullTimeStr } = getNowFormatted();
    const entry = {
      bm: selectedBus.bmNumber,
      reg: selectedBus.regNo,
      depot: depotNum,
      page: 'charging',
      startTime: fullTimeStr,
      startTimestamp: now.getTime(),
    };

    lockBus(entry);
    Alert.alert('⚡ Bus Locked for Charging', `Bus ${selectedBus.bmNumber} is now locked for charging.`);
  };

  const handleUnlockAndSubmit = () => {
    if (!selectedBus) {
      Alert.alert('Selection Required', 'Please select a bus first.');
      return;
    }

    const lockEntry = lockedBuses.find(
      (x) =>
        String(x.bm || x.bmNumber).toUpperCase() === selectedBus.bmNumber &&
        String(x.page || '').toLowerCase().includes('charg')
    );

    const { now, timeStr, fullTimeStr } = getNowFormatted();
    const startTs = lockEntry?.startTimestamp || now.getTime();
    const diffMs = Math.max(0, now.getTime() - startTs);
    const diffMins = Math.round(diffMs / 60000);
    const durationStr = diffMins < 1 ? 'Just finished (<1 min)' : diffMins >= 60 ? `${Math.floor(diffMins / 60)} hr ${diffMins % 60} mins` : `${diffMins} mins`;

    const delta = Number(socAfter) - Number(socBefore);
    const usableSoc = Math.max(0, Number(socAfter) - 10);
    const fullDutyKm = Math.round(usableSoc * 1.42);

    const record = {
      id: `charg_${Date.now()}`,
      bm: selectedBus.bmNumber,
      reg: selectedBus.regNo,
      depot: depotNum,
      processType: 'Depot Fast Plug-in Charging',
      startTime: lockEntry?.startTime || fullTimeStr,
      unlockTime: fullTimeStr,
      duration: durationStr,
      startSoc: `${socBefore}%`,
      finalSoc: `${socAfter}%`,
      socBef: socBefore,
      socAft: socAfter,
      delta: delta,
      chargerBay: lockEntry?.chargerBay || 'Bay #1',
      chargingStatus: chargingStatus,
      status: chargingStatus,
      clearanceState: Number(socAfter) >= 90 ? '✅ High Range Fleet Category A (Single Charge Ready)' : '✅ Feasible for Dispatch',
      remarks: remarks.trim() || 'Fast charging completed. BMS cleared for dispatch.',
      timeStr: timeStr,
      dateStr: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      fullDutyKm: fullDutyKm,
    };

    Alert.alert(
      'Confirm Charging Submission',
      `Unlock ${selectedBus.bmNumber} and submit Charging Record?\n\n• Start: ${socBefore}%\n• Confirmed SoC: ${socAfter}%\n• Status: ${chargingStatus}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock & Submit',
          onPress: async () => {
            await submitChargingRecord(record);
            Alert.alert('✅ Charging Verified', `Bus ${selectedBus.bmNumber} unlocked & record saved! (${socBefore}% ➔ ${socAfter}%)`);
            setRemarks('');
            setSelectedBus(null);
            setSearchInput('');
          },
        },
      ]
    );
  };

  const usableSoc = Math.max(0, Number(socAfter) - 10);
  const fullDutyKm = Math.round(usableSoc * 1.42);
  const recentRecords = chargingHistory
    .filter((r) => String(r.depot || '1') === depotNum)
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── TOP NAV BAR (With Language Globe and Sign Out Buttons) ── */}
      <View style={styles.topBar}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>CHARGING {depotNum} LOG</Text>
          <Text style={styles.headerSub}>{depotName}</Text>
        </View>
        <View style={styles.topbarActions}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => {
              Alert.alert(t('btn_sign_out', 'Sign Out'), 'Are you sure you want to log out of Charging Operations?', [
                { text: t('cancel', 'Cancel'), style: 'cancel' },
                { text: t('btn_sign_out', 'Sign Out'), style: 'destructive', onPress: () => logout() },
              ]);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutBtnText}>⎋ {t('btn_sign_out', 'Sign Out')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>⚡ Charging {depotNum} Log</Text>
          <Text style={styles.bannerSub}>
            Record bus charging sessions — Depot {depotNum} ({depotBuses.length} Active Buses)
          </Text>
        </View>

        {/* ── 1. SELECT BUS (Exact Website Layout: Search Box + Dropdown) ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚌 Select Bus</Text>

          {/* Explicit Search Box */}
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by BM number or Registration No..."
              placeholderTextColor="#94a3b8"
              value={searchInput}
              onChangeText={(text) => {
                setSearchInput(text);
                if (!dropdownOpen) setDropdownOpen(true);
              }}
              autoCapitalize="characters"
            />
            {searchInput.length > 0 && (
              <TouchableOpacity onPress={handleClearSelection} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dropdown Trigger */}
          <TouchableOpacity
            style={[styles.dropdownTrigger, selectedBus && styles.dropdownTriggerActive]}
            onPress={() => setDropdownOpen(!dropdownOpen)}
            activeOpacity={0.8}
          >
            <Text style={styles.busIcon}>🚌</Text>
            <Text style={[styles.dropdownText, selectedBus && styles.dropdownTextActive]}>
              {selectedBus ? `${selectedBus.bmNumber}  —  ${selectedBus.regNo}` : '— Choose a bus —'}
            </Text>
            <Text style={styles.caret}>{dropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* Inline Filtered Dropdown List */}
          {dropdownOpen && (
            <View style={styles.dropdownListContainer}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {filteredBuses.length === 0 ? (
                  <View style={styles.noMatch}>
                    <Text style={styles.noMatchText}>No matching buses in Depot {depotNum}</Text>
                  </View>
                ) : (
                  filteredBuses.map((bus) => (
                    <TouchableOpacity
                      key={bus.bmNumber}
                      style={[
                        styles.dropdownItem,
                        selectedBus?.bmNumber === bus.bmNumber && styles.dropdownItemActive,
                      ]}
                      onPress={() => handleSelectBus(bus)}
                    >
                      <View style={styles.dropdownItemRow}>
                        <Text style={styles.dropdownBm}>{bus.bmNumber}</Text>
                        <Text style={styles.dropdownReg}>{bus.regNo}</Text>
                        <Text style={styles.dropdownSoc}>{bus.soc}% SoC</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Bus Info Box (when a bus is selected) */}
          {selectedBus && (
            <View style={styles.busInfoBox}>
              <View style={styles.busInfoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>BM Number</Text>
                  <Text style={styles.infoValHighlight}>{selectedBus.bmNumber}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Registration No.</Text>
                  <Text style={styles.infoVal}>{selectedBus.regNo}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Model</Text>
                  <Text style={styles.infoVal}>Switch EiV 12</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <View style={[styles.statusBadge, isLockedForCharging ? styles.statusBadgeCharging : styles.statusBadgeAvail]}>
                    <Text style={[styles.statusBadgeText, isLockedForCharging ? styles.statusTextCharging : styles.statusTextAvail]}>
                      {isLockedForCharging ? '⚡ Charging' : selectedBus.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Warnings */}
              {isLockedForCleaning && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>⚠️ Bus {selectedBus.bmNumber} is currently undergoing cleaning! Complete cleaning first.</Text>
                </View>
              )}
              {selectedBus.isAllocated && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>⚠️ Bus {selectedBus.bmNumber} is on route. Complete route in Depot Ops first.</Text>
                </View>
              )}

              {/* Lock Banner */}
              {isLockedForCharging && (
                <View style={styles.lockBanner}>
                  <Text style={styles.lockBannerText}>
                    ⚡ This bus is currently locked for charging — complete session and click Unlock to submit record.
                  </Text>
                </View>
              )}

              {/* Lock / Unlock Row */}
              <View style={styles.lockRow}>
                {!isLockedForCharging ? (
                  <TouchableOpacity
                    style={styles.lockBtn}
                    onPress={handleLockBus}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.lockBtnText}>🔒 Lock Bus for Charging</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.unlockBtn}
                    onPress={handleUnlockAndSubmit}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.unlockBtnText}>🔓 Unlock & Submit Charging Record</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Ongoing Charging Button */}
          <View style={styles.ongoingBar}>
            <TouchableOpacity
              style={styles.btnOngoing}
              onPress={() => setOngoingModalOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnOngoingText}>⚡ Ongoing Charging</Text>
              <View style={styles.ongoingCountBadge}>
                <Text style={styles.ongoingCountBadgeText}>{ongoingChargingList.length}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. BATTERY SOC CARD ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Battery SOC</Text>

          {/* SOC Before */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                SOC Before Charging: <Text style={styles.socBeforeHighlight}>{socBefore}%</Text>
              </Text>
              <TextInput
                style={styles.socInput}
                keyboardType="numeric"
                value={socBeforeInput}
                onChangeText={(v) => {
                  const cleaned = v.replace(/[^0-9]/g, '');
                  setSocBeforeInput(cleaned);
                  if (cleaned !== '') {
                    const n = Math.min(100, Math.max(0, parseInt(cleaned, 10)));
                    setSocBefore(n);
                  }
                }}
                onBlur={() => {
                  if (socBeforeInput === '' || isNaN(parseInt(socBeforeInput, 10))) {
                    setSocBeforeInput(String(socBefore));
                  } else {
                    const n = Math.min(100, Math.max(0, parseInt(socBeforeInput, 10)));
                    setSocBefore(n);
                    setSocBeforeInput(String(n));
                  }
                }}
              />
            </View>
            <View
              style={styles.touchableBarContainer}
              onLayout={(e) => setBarWidthBefore(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={(e) => handleTouchSoc(e.nativeEvent.locationX, barWidthBefore, 'before')}
              onResponderMove={(e) => handleTouchSoc(e.nativeEvent.locationX, barWidthBefore, 'before')}
            >
              <View style={styles.socBarBg}>
                <View style={[styles.socBarFillBefore, { width: `${socBefore}%` }]} />
                <View style={[styles.socThumb, { left: `${Math.max(0, Math.min(94, socBefore - 2))}%` }]} />
              </View>
            </View>
          </View>

          {/* SOC After */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                Confirmed Manual SOC After: <Text style={styles.socAfterHighlight}>{socAfter}%</Text>
              </Text>
              <TextInput
                style={[styles.socInput, styles.socInputAfter]}
                keyboardType="numeric"
                value={socAfterInput}
                onChangeText={(v) => {
                  const cleaned = v.replace(/[^0-9]/g, '');
                  setSocAfterInput(cleaned);
                  if (cleaned !== '') {
                    const n = Math.min(100, Math.max(0, parseInt(cleaned, 10)));
                    setSocAfter(n);
                  }
                }}
                onBlur={() => {
                  if (socAfterInput === '' || isNaN(parseInt(socAfterInput, 10))) {
                    setSocAfterInput(String(socAfter));
                  } else {
                    const n = Math.min(100, Math.max(0, parseInt(socAfterInput, 10)));
                    setSocAfter(n);
                    setSocAfterInput(String(n));
                  }
                }}
              />
            </View>
            <View
              style={styles.touchableBarContainer}
              onLayout={(e) => setBarWidthAfter(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={(e) => handleTouchSoc(e.nativeEvent.locationX, barWidthAfter, 'after')}
              onResponderMove={(e) => handleTouchSoc(e.nativeEvent.locationX, barWidthAfter, 'after')}
            >
              <View style={styles.socBarBg}>
                <View style={[styles.socBarFillAfter, { width: `${socAfter}%` }]} />
                <View style={[styles.socThumb, styles.socThumbAfter, { left: `${Math.max(0, Math.min(94, socAfter - 2))}%` }]} />
              </View>
            </View>

            {/* Presets */}
            <View style={styles.presetsRow}>
              <Text style={styles.presetLabel}>Quick Presets:</Text>
              {[80, 90, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.presetChip, socAfter === val && styles.presetChipActive]}
                  onPress={() => {
                    setSocAfter(val);
                    setSocAfterInput(String(val));
                  }}
                >
                  <Text style={[styles.presetChipText, socAfter === val && styles.presetChipTextActive]}>
                    {val}% Full
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status Pills */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Charging Status</Text>
            <View style={styles.pillsRow}>
              {[
                { id: 'Completed', label: '✅ Completed' },
                { id: 'Partial', label: '⚡ Partial' },
                { id: 'Fault', label: '⚠️ Fault' },
              ].map((pill) => (
                <TouchableOpacity
                  key={pill.id}
                  style={[styles.statusPill, chargingStatus === pill.id && styles.statusPillActive]}
                  onPress={() => setChargingStatus(pill.id)}
                >
                  <Text style={[styles.statusPillText, chargingStatus === pill.id && styles.statusPillTextActive]}>
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Remarks */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Remarks (optional)</Text>
            <TextInput
              style={styles.remarksInput}
              placeholder="Charger fault, battery warning, unusual readings..."
              placeholderTextColor="#94a3b8"
              value={remarks}
              onChangeText={setRemarks}
              multiline
            />
          </View>
        </View>

        {/* ── 3. ACTION UNLOCK CARD (when bus locked) ── */}
        {selectedBus && isLockedForCharging && (
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionUnlockBtn}
              onPress={handleUnlockAndSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.actionUnlockBtnText}>🔓 Unlock & Submit Charging Record</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 4. RECENT CHARGING RECORDS ── */}
        <View style={styles.card}>
          <View style={styles.recentHeaderStack}>
            <View style={styles.recentTitleGroup}>
              <Text style={styles.cardTitle}>📋 Recent Charging Records</Text>
              <View style={styles.badgeRecent}>
                <Text style={styles.badgeRecentText}>Recent 5</Text>
              </View>
            </View>
            <View style={styles.recentActionsRow}>
              <TouchableOpacity
                style={styles.btnDownloadCsv}
                onPress={() => {
                  const headers = [
                    'Record ID',
                    'Bus Number',
                    'Registration No.',
                    'Operating Depot',
                    'Charger Bay',
                    'Initial SoC',
                    'Final SoC',
                    'SoC Delta (%)',
                    'Start Timestamp',
                    'Completed / Unlocked At',
                    'Verified By User',
                    'Remarks',
                  ];
                  const rows = recentRecords.map((item) => [
                    item.id || 'rec_' + Math.random().toString(36).substr(2, 6),
                    item.bm,
                    item.reg,
                    'Depot ' + (item.depot || depotNum),
                    item.chargerBay || 'Bay #1',
                    item.startSoc + '%',
                    item.finalSoc + '%',
                    '+' + item.delta + '%',
                    item.startTime || '—',
                    item.unlockTime || item.timeStr,
                    item.user || 'operator@bmtc.gov.in',
                    item.remarks || 'Standard charging session verified',
                  ]);
                  exportCsvFile(
                    `charging_verification_history_depot${depotNum}_${new Date().toISOString().slice(0, 10)}.csv`,
                    [headers, ...rows]
                  );
                }}
              >
                <Text style={styles.btnDownloadCsvText}>📥 Download CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() => setHistoryModalOpen(true)}
              >
                <Text style={styles.historyBtnText}>📜 History</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.recentSub}>
            Displaying the 5 most recent bus charging records. Tap any record to view details.
          </Text>

          {recentRecords.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentText}>No charging records logged for Depot {depotNum} yet.</Text>
            </View>
          ) : (
            recentRecords.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentItem}
                onPress={() => setDetailModalItem(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.logDot, item.status === 'Completed' ? styles.dotGreen : styles.dotAmber]} />
                <View style={styles.recentItemBody}>
                  <View style={styles.recentItemTop}>
                    <Text style={styles.recentBm}>⚡ {item.bm}</Text>
                    <Text style={styles.recentReg}>{item.reg}</Text>
                  </View>
                  <View style={styles.recentSocRow}>
                    <Text style={styles.recentSocText}>
                      Start: {item.startSoc} ➔ <Text style={styles.recentSocBold}>Final: {item.finalSoc}</Text> (+{item.delta}%)
                    </Text>
                    <Text style={styles.recentTime}>{item.unlockTime?.split(',')[0] || item.timeStr}</Text>
                  </View>
                  {item.remarks && (
                    <Text style={styles.recentRemarks} numberOfLines={1}>
                      "{item.remarks}"
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── ONGOING CHARGING MODAL ── */}
      <Modal
        visible={ongoingModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOngoingModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalDepotSub}>DEPOT {depotNum} ACTIVE CHARGING SESSIONS</Text>
                <Text style={styles.modalTitle}>⚡ Ongoing Charging</Text>
              </View>
              <TouchableOpacity onPress={() => setOngoingModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {ongoingChargingList.length === 0 ? (
                <View style={styles.emptyOngoing}>
                  <Text style={styles.emptyOngoingEmoji}>⚡</Text>
                  <Text style={styles.emptyOngoingTitle}>No Buses Currently Charging</Text>
                  <Text style={styles.emptyOngoingSub}>No buses are currently locked for charging.</Text>
                </View>
              ) : (
                ongoingChargingList.map((entry) => (
                  <View key={entry.bm} style={styles.ongoingItem}>
                    <View style={styles.ongoingItemLeft}>
                      <Text style={styles.ongoingBm}>🚌 {entry.bm}</Text>
                      <Text style={styles.ongoingReg}>{entry.reg}</Text>
                      <Text style={styles.ongoingTime}>Started: {entry.startTime?.split(',')[0] || 'Recently'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.ongoingSelectBtn}
                      onPress={() => {
                        const b = depotBuses.find((x) => x.bmNumber === entry.bm);
                        if (b) handleSelectBus(b);
                        setOngoingModalOpen(false);
                      }}
                    >
                      <Text style={styles.ongoingSelectBtnText}>Select Bus</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalFooterBtn} onPress={() => setOngoingModalOpen(false)}>
                <Text style={styles.modalFooterBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal
        visible={!!detailModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalDepotSub}>DEPOT VERIFICATION RECORD</Text>
                <Text style={styles.modalTitle}>
                  🚌 Bus {detailModalItem?.bm} <Text style={styles.modalSubReg}>({detailModalItem?.reg})</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalItem(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {detailModalItem && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Process Type:</Text>
                  <Text style={[styles.detailVal, styles.detailValHighlight]}>{detailModalItem.processType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Started Time:</Text>
                  <Text style={styles.detailVal}>{detailModalItem.startTime}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Unlocked Time:</Text>
                  <Text style={[styles.detailVal, { color: '#15803d', fontWeight: '800' }]}>{detailModalItem.unlockTime}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Duration:</Text>
                  <Text style={styles.detailVal}>{detailModalItem.duration}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Battery SoC:</Text>
                  <Text style={[styles.detailVal, { fontWeight: '800' }]}>
                    {detailModalItem.startSoc} ➔ {detailModalItem.finalSoc} (+{detailModalItem.delta}%)
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Full Duty Range:</Text>
                  <Text style={styles.detailVal}>{detailModalItem.fullDutyKm} km</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Remarks:</Text>
                  <Text style={styles.detailVal}>{detailModalItem.remarks}</Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalFooterBtn} onPress={() => setDetailModalItem(null)}>
                <Text style={styles.modalFooterBtnText}>Close Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── HISTORY MODAL ── */}
      <Modal
        visible={historyModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalDepotSub}>DEPOT {depotNum} ARCHIVE</Text>
                <Text style={styles.modalTitle}>📜 Charging History Log</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.historySearchWrap}>
              <TextInput
                style={styles.historySearchInput}
                placeholder="Filter history by BM number or registration..."
                placeholderTextColor="#94a3b8"
                value={historyQuery}
                onChangeText={setHistoryQuery}
                autoCapitalize="characters"
              />
            </View>

            <ScrollView style={styles.modalBody}>
              {chargingHistory
                .filter((r) => {
                  const matchesDepot = String(r.depot || '1') === depotNum;
                  if (!matchesDepot) return false;
                  if (!historyQuery.trim()) return true;
                  const q = historyQuery.toLowerCase().trim();
                  return (
                    (r.bm && r.bm.toLowerCase().includes(q)) ||
                    (r.reg && r.reg.toLowerCase().includes(q)) ||
                    (r.remarks && r.remarks.toLowerCase().includes(q))
                  );
                })
                .map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.recentItem}
                    onPress={() => {
                      setHistoryModalOpen(false);
                      setDetailModalItem(r);
                    }}
                  >
                    <View style={[styles.logDot, styles.dotGreen]} />
                    <View style={styles.recentItemBody}>
                      <View style={styles.recentItemTop}>
                        <Text style={styles.recentBm}>{r.bm}</Text>
                        <Text style={styles.recentReg}>{r.reg}</Text>
                        <Text style={styles.recentTime}>{r.unlockTime?.split(',')[0] || r.timeStr}</Text>
                      </View>
                      <Text style={styles.recentRemarks} numberOfLines={1}>
                        SoC: {r.startSoc} ➔ {r.finalSoc} • {r.duration}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalFooterBtn} onPress={() => setHistoryModalOpen(false)}>
                <Text style={styles.modalFooterBtnText}>Close History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#edf2fe',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4361ee',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  depotTag: {
    backgroundColor: '#edf2fe',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  depotTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4361ee',
  },
  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  signOutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '800',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
  },
  dropdownTriggerActive: {
    borderColor: '#4361ee',
    backgroundColor: '#edf2fe',
  },
  busIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14.5,
    color: '#64748b',
    fontWeight: '600',
  },
  dropdownTextActive: {
    color: '#4361ee',
    fontWeight: '800',
  },
  caret: {
    fontSize: 14,
    color: '#64748b',
  },
  dropdownListContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    marginTop: 6,
    maxHeight: 190,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownScroll: {
    maxHeight: 190,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#edf2fe',
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBm: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    width: 75,
  },
  dropdownReg: {
    fontSize: 12.5,
    color: '#64748b',
    flex: 1,
    marginLeft: 8,
  },
  dropdownSoc: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4361ee',
  },
  noMatch: {
    padding: 16,
    alignItems: 'center',
  },
  noMatchText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  busInfoBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  busInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoCol: {
    minWidth: '45%',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 1,
  },
  infoValHighlight: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusBadgeAvail: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeCharging: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextAvail: {
    color: '#166534',
  },
  statusTextCharging: {
    color: '#92400e',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '700',
    lineHeight: 18,
  },
  lockBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  lockBannerText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  lockRow: {
    marginTop: 10,
  },
  lockBtn: {
    backgroundColor: '#4361ee',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  lockBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  unlockBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  unlockBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  ongoingBar: {
    marginTop: 10,
  },
  btnOngoing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 8,
  },
  btnOngoingText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#047857',
  },
  ongoingCountBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ongoingCountBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  formGroup: {
    marginTop: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  socBeforeHighlight: {
    color: '#0284c7',
    fontSize: 16.5,
    fontWeight: '800',
  },
  socAfterHighlight: {
    color: '#16a34a',
    fontSize: 16.5,
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  socInput: {
    width: 60,
    height: 38,
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderRadius: 6,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 15,
    color: '#0284c7',
  },
  socInputAfter: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
    color: '#16a34a',
  },
  touchableBarContainer: {
    paddingVertical: 10,
    justifyContent: 'center',
  },
  socBarBg: {
    height: 16,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  socBarFillBefore: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 8,
  },
  socBarFillAfter: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 8,
  },
  socThumb: {
    position: 'absolute',
    top: -5,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0284c7',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  socThumbAfter: {
    backgroundColor: '#16a34a',
  },
  swipeHintText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  presetChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  presetChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#065f46',
    fontWeight: '800',
  },
  rangePill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  rangePillText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '600',
  },
  rangePillBold: {
    fontWeight: '800',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusPillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  statusPillTextActive: {
    color: '#065f46',
    fontWeight: '800',
  },
  remarksInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#1e293b',
    minHeight: 54,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  actionCard: {
    marginBottom: 14,
  },
  actionUnlockBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionUnlockBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  recentHeaderStack: {
    marginBottom: 8,
  },
  recentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recentTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeRecent: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  badgeRecentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  btnDownloadCsv: {
    backgroundColor: '#4361ee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnDownloadCsvText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  historyBtn: {
    backgroundColor: '#edf2fe',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  historyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4361ee',
  },
  recentSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGreen: {
    backgroundColor: '#10b981',
  },
  dotAmber: {
    backgroundColor: '#f59e0b',
  },
  recentItemBody: {
    flex: 1,
  },
  recentItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentBm: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  recentReg: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  bayChip: {
    backgroundColor: '#edf2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  bayChipText: {
    fontSize: 11.5,
    fontWeight: '750',
    color: '#4361ee',
  },
  recentSocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  recentSocText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  recentSocBold: {
    fontWeight: '800',
    color: '#10b981',
  },
  recentTime: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  recentRemarks: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 3,
  },
  emptyRecent: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyRecentText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '82%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalDepotSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4361ee',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  modalSubReg: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
  },
  modalBody: {
    padding: 18,
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  modalFooterBtn: {
    backgroundColor: '#4361ee',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalFooterBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyOngoing: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyOngoingEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyOngoingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  emptyOngoingSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  ongoingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ongoingItemLeft: {
    flex: 1,
  },
  ongoingBm: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  ongoingReg: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  ongoingTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  ongoingBayText: {
    fontSize: 12,
    fontWeight: '750',
    color: '#4361ee',
    marginTop: 2,
  },
  ongoingSelectBtn: {
    backgroundColor: '#4361ee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  ongoingSelectBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailValHighlight: {
    color: '#4361ee',
    fontWeight: '800',
  },
  historySearchWrap: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historySearchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
  },
});
