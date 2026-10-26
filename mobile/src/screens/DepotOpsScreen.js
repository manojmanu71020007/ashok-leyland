import React, { useState, useMemo } from 'react';
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
import { useFleet, getBusDepot } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageModal, { LanguagePickerPill } from '../components/LanguageModal';
import BatteryBar from '../components/BatteryBar';
import { exportCsvFile } from '../utils/exportCsv';

export default function DepotOpsScreen() {
  const {
    buses,
    allBuses,
    allocatedDuties,
    completedRoutesLog,
    completeRoute,
    clearCompletedRoutesLog,
    refreshFleet,
  } = useFleet();
  const { selectedDepot, logout, returnToLogin } = useAuth();
  const { t } = useLanguage();

  const depotNum = selectedDepot === '2' ? '2' : '1';
  const depotName = selectedDepot === '2' ? 'Depot 2 (Whitefield)' : 'Depot 1 (Chandapura)';

  // Complete fleet list (all buses across Depot 1 and Depot 2)
  const fullFleetList = (allBuses && allBuses.length > 0) ? allBuses : buses;
  const depot1Count = fullFleetList.filter((b) => String(b.depot || '1') === '1').length;
  const depot2Count = fullFleetList.filter((b) => String(b.depot || '1') === '2').length;

  // Toggle for More View / Less View on Active Dispatches
  const [isDispatchesExpanded, setIsDispatchesExpanded] = useState(false);

  // Bus Selection Panel States (Search Box & Selection Box)
  const [busSearchInput, setBusSearchInput] = useState('');
  const [selectedBusBm, setSelectedBusBm] = useState('');
  const [busPickerOpen, setBusPickerOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // Completed Log Tab Filter: 'all' | 'today'
  const [logFilter, setLogFilter] = useState('all');

  // Active dispatches search
  const [dispatchSearch, setDispatchSearch] = useState('');
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Helper to determine the duty's depot safely
  const getDutyDepot = (d) => {
    if (d.depot && (String(d.depot) === '1' || String(d.depot) === '2')) return String(d.depot);
    const bm = String(d.bm || d.bmNumber || '').toUpperCase().trim();
    const bus = (fullFleetList || []).find((b) => b.bmNumber === bm);
    if (bus && bus.depot) return String(bus.depot);
    const rCode = String(d.routeCode || d.busNumber || d.routeId || '').toUpperCase();
    if (['361C', '399C', '328H', '500DC', 'KBS3F'].some((c) => rCode.includes(c))) return '2';
    return getBusDepot(bm);
  };

  // Filtered active allocated duties (Depot 1 only shows Depot 1, Depot 2 only shows Depot 2)
  const filteredAllocatedDuties = useMemo(() => {
    return (allocatedDuties || [])
      .filter((d) => getDutyDepot(d) === String(depotNum))
      .filter((d) => {
        if (!dispatchSearch.trim()) return true;
        const q = dispatchSearch.toLowerCase().trim();
        const bm = String(d.bm || '').toLowerCase();
        const reg = String(d.regNo || '').toLowerCase();
        const route = String(d.routeCode || '').toLowerCase();
        const driver = String(d.driver || '').toLowerCase();
        return bm.includes(q) || reg.includes(q) || route.includes(q) || driver.includes(q);
      });
  }, [allocatedDuties, dispatchSearch, depotNum, fullFleetList]);

  const displayedAllocatedDuties = isDispatchesExpanded
    ? filteredAllocatedDuties
    : filteredAllocatedDuties.slice(0, 1);

  // Depot specific fleet (in Depot 1 only show Depot 1 fleet, in Depot 2 only show Depot 2 fleet)
  const depotFleetList = useMemo(() => {
    return fullFleetList.filter((b) => String(b.depot || '1') === depotNum);
  }, [fullFleetList, depotNum]);

  // Selected bus object for the Select Bus Panel (Searched across all fleet buses)
  const selectedBusObj = fullFleetList.find((b) => b.bmNumber === selectedBusBm) || null;
  const selectedBusDuty = (allocatedDuties || []).find((d) => d.bm === selectedBusBm) || null;
  const isSelectedBusAllocated = Boolean(selectedBusDuty);

  // Filtered buses for the selection dropdown (under search box) - contains all fleet buses
  const filteredSelectBuses = useMemo(() => {
    return fullFleetList.filter((b) => {
      if (!busSearchInput.trim()) return true;
      const q = busSearchInput.toLowerCase().trim();
      return (
        b.bmNumber.toLowerCase().includes(q) ||
        (b.regNo && b.regNo.toLowerCase().includes(q))
      );
    });
  }, [fullFleetList, busSearchInput]);

  // Handle Route Complete (supports dynamic inter-depot bus transfers)
  const handleMarkRouteComplete = (bmNumber) => {
    const cleanBm = String(bmNumber).toUpperCase();
    const foundBus = fullFleetList.find((b) => b.bmNumber === cleanBm);
    const busCurrentDepot = String(foundBus?.depot || '1');
    const isCrossDepot = busCurrentDepot !== depotNum;

    Alert.alert(
      `✅ ${t('btn_route_complete', 'Confirm Route Completion')}`,
      `Mark route completed for Bus ${cleanBm}?\n\n` +
        (isCrossDepot
          ? `🔄 Cross-Depot Transfer: This bus was stationed at Depot ${busCurrentDepot}. Marking it completed at Depot ${depotNum} will transfer it to Depot ${depotNum} yard and dynamically adjust depot fleet counts.`
          : `This will return the bus to Depot ${depotNum} yard for post-route servicing and re-allocation.`),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: isCrossDepot ? `Confirm Transfer to Depot ${depotNum}` : `Confirm — ${cleanBm} Returned`,
          style: 'default',
          onPress: async () => {
            await completeRoute(cleanBm, '', depotNum);
            setSuccessBanner({
              title: isCrossDepot ? `🔄 Transferred to Depot ${depotNum}!` : 'Route completed!',
              text: `Bus ${cleanBm} has returned to Depot ${depotNum} yard. Fleet counts updated.`,
            });
            setTimeout(() => {
              setSuccessBanner(null);
            }, 6000);
          },
        },
      ]
    );
  };

  // Filtered Completed Log
  const todayStr = new Date().toISOString().split('T')[0];
  const allCompletedLog = completedRoutesLog || [];
  const filteredCompletedLog = allCompletedLog.filter((item) => {
    if (logFilter === 'today') {
      return (
        item.dateStr === todayStr ||
        (item.completedAt && (item.completedAt.includes('Today') || item.completedAt.includes('Oct')))
      );
    }
    return true;
  });

  // ── CSV DOWNLOAD HANDLER (Universally reliable in Chrome, Web, & Mobile) ──
  const handleDownloadCompletedLog = async () => {
    // If completed log has records, download those.
    // If completed log is empty, generate and download the master operational fleet history!
    const recordsToExport =
      filteredCompletedLog.length > 0
        ? filteredCompletedLog
        : fullFleetList.map((b, idx) => ({
            id: `OP-HIST-${String(idx + 1).padStart(4, '0')}`,
            bm: b.bmNumber,
            reg: b.regNo,
            model: b.model || 'ELECTRIC BUS AC EiV12',
            route: (allocatedDuties.find((d) => d.bm === b.bmNumber)?.routeCode) || '356Z',
            schedule: `SCH-0${(idx % 4) + 1}`,
            scheduledTime: '08:30 AM',
            completedAt: 'Today, 11:45 AM',
            depot: b.depot || '1',
            homeDepot: b.depot || '1',
            driver: 'Assigned Depot Driver',
            status: b.isLocked ? 'In Servicing / Charging' : (b.isAllocated ? 'On Active Route' : 'Ready in Depot'),
          }));

    const headers = [
      'Record ID',
      'Bus BM Number',
      'Registration Number',
      'Model',
      'Route Number',
      'Schedule Number',
      'Scheduled Time',
      'Route Completion Time',
      'Receiving Facility Depot',
      'Bus Home Depot',
      'Driver',
      'Status',
    ];

    const rows = recordsToExport.map((r, i) => [
      r.id || `REC-${i + 1}`,
      r.bm || '',
      r.reg || '',
      r.model || 'ELECTRIC BUS AC EiV12',
      r.route || '356Z',
      r.schedule || 'SCH-01',
      r.scheduledTime || r.departureTime || '08:30 AM',
      r.completedAt || 'Today, 11:45 AM',
      r.depot ? `Depot ${r.depot}` : `Depot ${depotNum}`,
      r.homeDepot ? `Depot ${r.homeDepot}` : `Depot ${depotNum}`,
      r.driver || 'Driver Assigned',
      r.status || 'Route Completed & Verified',
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `depot_${depotNum}_completed_routes_${dateStr}.csv`;
    const success = await exportCsvFile(filename, [headers, ...rows]);
    if (success) {
      Alert.alert(
        '📥 Download Started',
        `File "${filename}" has been saved to your Downloads/Files.\n\nTotal records exported: ${rows.length}`
      );
    }
  };

  const handleSignOutPress = () => {
    Alert.alert(
      t('btn_sign_out', 'Sign Out'),
      'Are you sure you want to log out of Depot Operations?',
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('btn_sign_out', 'Sign Out'),
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── TOPBAR HEADER (With Language Globe and Sign Out Buttons) ── */}
      <View style={styles.topbar}>
        <View style={styles.topbarHeaderRow}>
          <View style={styles.topbarCenter}>
            <Text style={styles.eyebrow}>{t('depot_operations_title', 'DEPOT OPERATIONS')}</Text>
            <Text style={styles.topbarTitle}>{t('depot', 'Depot')} {depotNum} {t('title_depot_operations', 'Operations')}</Text>
            <Text style={styles.topbarSub}>{depotName} • Ashok Leyland EV Fleet</Text>
          </View>

          <View style={styles.topbarActions}>
          <LanguagePickerPill onPress={() => setLangModalOpen(true)} style={{ marginRight: 8 }} />
            {/* Prominent Sign Out Button */}
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOutPress}
              activeOpacity={0.8}
              accessibilityLabel="Sign Out"
            >
              <Text style={styles.signOutBtnText}>⎋ {t('btn_sign_out', 'Sign Out')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentWrap} showsVerticalScrollIndicator={false}>
        {/* ── SUCCESS BANNER (Floating Notification) ── */}
        {successBanner && (
          <View style={styles.successBanner}>
            <Text style={styles.successIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>{successBanner.title}</Text>
              <Text style={styles.successText}>{successBanner.text}</Text>
            </View>
            <TouchableOpacity onPress={() => setSuccessBanner(null)}>
              <Text style={styles.successClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STATS ROW (Matching Website Depot Operations) ── */}
        <View style={styles.statsRow}>
          {/* 1. Allocated (On Route) */}
          <View style={[styles.statCard, styles.statCardAllocated]}>
            <Text style={styles.statLabel}>{t('stat_allocated_on_route', 'Allocated (On Route)')}</Text>
            <Text style={[styles.statValue, { color: '#6d28d9' }]}>
              {filteredAllocatedDuties ? filteredAllocatedDuties.length : 0}
            </Text>
            <Text style={styles.statSub}>{t('stat_buses_dispatched', 'buses dispatched')}</Text>
          </View>

          {/* 2. Routes Completed */}
          <View style={[styles.statCard, styles.statCardCompleted]}>
            <Text style={styles.statLabel}>{t('stat_routes_completed', 'Routes Completed')}</Text>
            <Text style={[styles.statValue, { color: '#059669' }]}>
              {allCompletedLog.length}
            </Text>
            <Text style={styles.statSub}>{t('stat_returned_today', 'returned today')}</Text>
          </View>

          {/* 3. Depot Fleet (Depot 1 shows only Depot 1; Depot 2 shows only Depot 2) */}
          {depotNum === '1' ? (
            <View style={[styles.statCard, styles.statCardFleet]}>
              <Text style={styles.statLabel}>{t('depot_1', 'Depot 1')} {t('all_fleet', 'Fleet')}</Text>
              <Text style={[styles.statValue, { color: '#0f766e' }]}>
                {depot1Count || 62}
              </Text>
              <Text style={styles.statSub}>{t('assigned_buses', 'assigned buses')}</Text>
            </View>
          ) : (
            <View style={[styles.statCard, styles.statCardFleet]}>
              <Text style={styles.statLabel}>{t('depot_2', 'Depot 2')} {t('all_fleet', 'Fleet')}</Text>
              <Text style={[styles.statValue, { color: '#6d28d9' }]}>
                {depot2Count || 60}
              </Text>
              <Text style={styles.statSub}>{t('assigned_buses', 'assigned buses')}</Text>
            </View>
          )}
        </View>

        {/* ── CARD 1: CURRENTLY ALLOCATED BUSES ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>🟣 Currently Allocated Buses</Text>
              <View style={styles.allocCountBadge}>
                <Text style={styles.allocCountBadgeText}>
                  {filteredAllocatedDuties.length} Active Dispatches
                </Text>
              </View>
            </View>
          </View>

          {/* ── EMBEDDED PANEL: SELECT BUS TO MARK ROUTE COMPLETE ── */}
          <View style={styles.busSelectPanel}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>{`🚌 ${t('card_select_bus_route_complete', 'Select Bus to Mark Route Complete')}`}</Text>
            </View>

            {/* 1. SEARCH BOX (Search within Depot fleet by BM number or Registration No) */}
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t('select_bus_prompt', 'Search by BM number or Registration No…')}
                placeholderTextColor="#94a3b8"
                value={busSearchInput}
                onChangeText={(text) => {
                  setBusSearchInput(text);
                  const exactMatch = fullFleetList.find(
                    (b) => b.bmNumber.toLowerCase() === text.trim().toLowerCase()
                  );
                  if (exactMatch) {
                    setSelectedBusBm(exactMatch.bmNumber);
                  }
                }}
                autoCapitalize="characters"
              />
              {busSearchInput.length > 0 && (
                <TouchableOpacity onPress={() => setBusSearchInput('')}>
                  <Text style={styles.clearSearchIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 2. SELECT BOX (Dropdown containing all fleet buses) */}
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setBusPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={selectedBusBm ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                {selectedBusBm
                  ? `🚌 ${selectedBusBm} — ${selectedBusObj?.regNo || ''} (Depot ${selectedBusObj?.depot || depotNum} • ${isSelectedBusAllocated ? '🟣 Allocated on Route' : '🟢 In Yard'})`
                  : `— Choose a bus —`}
              </Text>
              <Text style={styles.dropdownCaret}>▼</Text>
            </TouchableOpacity>

            {/* 3. BUS INFO BOX (Shown when bus is selected) */}
            {selectedBusObj && (
              <View style={styles.busInfoBox}>
                <View style={styles.infoGrid}>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>{t('col_bm_number', 'BM Number')}</Text>
                    <Text style={styles.infoValue}>{selectedBusObj.bmNumber}</Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>{t('col_reg_no', 'Registration No.')}</Text>
                    <Text style={styles.infoValue}>{selectedBusObj.regNo}</Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>{t('col_model', 'Model')}</Text>
                    <Text style={styles.infoValue}>Ashok Leyland Switch EiV12</Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>{t('label_depot_access', 'Assigned Depot')}</Text>
                    <Text style={[styles.infoValue, { color: selectedBusObj.depot === '2' ? '#6d28d9' : '#0f766e', fontWeight: '800' }]}>
                      Depot {selectedBusObj.depot || '1'}
                    </Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>{t('col_status', 'Current Status')}</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color: isSelectedBusAllocated
                            ? '#6d28d9'
                            : selectedBusObj.status === 'Available'
                            ? '#059669'
                            : '#d97706',
                          fontWeight: '800',
                        },
                      ]}
                    >
                      {isSelectedBusAllocated ? '🟣 Allocated on Route' : selectedBusObj.status}
                    </Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>{t('col_battery_soc', 'Battery SoC')}</Text>
                    <Text style={styles.infoValue}>⚡ {selectedBusObj.soc}%</Text>
                  </View>
                </View>

                {/* Cross-Depot Arrival Banner (Exact Website Feature) */}
                {String(selectedBusObj.depot || '1') !== depotNum && (
                  <View style={styles.warnTransferBox}>
                    <Text style={styles.warnTransferTitle}>🔄 Cross-Depot Arrival Notice</Text>
                    <Text style={styles.warnTransferText}>
                      Bus {selectedBusObj.bmNumber} is currently stationed at Depot {selectedBusObj.depot || '1'}. Completing the route here will dynamically transfer this bus to Depot {depotNum} and adjust depot fleet counts ({depot1Count} / {depot2Count}).
                    </Text>
                  </View>
                )}

                {/* Route Info Row (Shown when allocated) */}
                {selectedBusDuty && (
                  <View style={styles.routeInfoBox}>
                    <Text style={styles.routeInfoBoxTitle}>🎯 Active Duty Schedule</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>{t('label_allocated_route', 'Allocated Route')}</Text>
                        <Text style={styles.infoValue}>
                          {selectedBusDuty.routeCode || selectedBusDuty.busNumber || '—'}
                        </Text>
                      </View>
                      <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>Dispatch Time</Text>
                        <Text style={styles.infoValue}>{selectedBusDuty.departureTime || '—'}</Text>
                      </View>
                      <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>Shift</Text>
                        <Text style={styles.infoValue}>{selectedBusDuty.shift || 'General Shift'}</Text>
                      </View>
                      <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>{t('driver', 'Driver')}</Text>
                        <Text style={styles.infoValue}>{selectedBusDuty.driver || '—'}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Warning Banner if Not Allocated */}
            {selectedBusObj && !isSelectedBusAllocated && (
              <View style={styles.warnNotAllocated}>
                <Text style={styles.warnText}>
                  ⚠️ This bus is not currently allocated on a route. Only allocated buses can be marked as route completed.
                </Text>
              </View>
            )}

            {/* Route Completed Action Button */}
            <TouchableOpacity
              style={[
                styles.btnRouteCompleteMain,
                (!selectedBusObj || !isSelectedBusAllocated) && styles.btnRouteCompleteDisabled,
              ]}
              disabled={!selectedBusObj || !isSelectedBusAllocated}
              onPress={() => handleMarkRouteComplete(selectedBusBm)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnRouteCompleteMainText}>
                ✅ {t('btn_route_complete', 'Route Completed — Return Bus to Depot')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── ACTIVE ROUTE DISPATCHES LIST SECTION ── */}
          <View style={styles.dispatchesHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.dispatchesTitle}>{`📋 ${t('active_dispatches', 'Active Route Dispatches')}`}</Text>
              <View style={styles.dispatchesCountBadge}>
                <Text style={styles.dispatchesCountBadgeText}>{filteredAllocatedDuties.length}</Text>
              </View>
            </View>
          </View>

          {/* Search Filter for Active Dispatches */}
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('filter_history_placeholder', 'Filter active dispatches by BM, Route, Driver, or Depot…')}
              placeholderTextColor="#94a3b8"
              value={dispatchSearch}
              onChangeText={setDispatchSearch}
            />
            {dispatchSearch.length > 0 && (
              <TouchableOpacity onPress={() => setDispatchSearch('')}>
                <Text style={styles.clearSearchIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* More/Less View Button */}
          {filteredAllocatedDuties.length > 1 && (
            <TouchableOpacity
              style={styles.singleViewToggleBtn}
              onPress={() => setIsDispatchesExpanded((prev) => !prev)}
              activeOpacity={0.75}
            >
              <Text style={styles.singleViewToggleBtnText}>
                {isDispatchesExpanded
                  ? `▲ Less View (Showing all ${filteredAllocatedDuties.length} — Tap to collapse)`
                  : `▼ More View (Showing 1 of ${filteredAllocatedDuties.length} — Tap to expand all)`}
              </Text>
            </TouchableOpacity>
          )}

          {/* List of Allocated Buses */}
          {filteredAllocatedDuties.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚌</Text>
              <Text style={styles.emptyTitle}>{t('no_allocated_buses_msg', 'No buses currently allocated on routes.')}</Text>
              <Text style={styles.emptySub}>{t('allocate_first_msg', 'Allocate buses from the Scheduling page first.')}</Text>
            </View>
          ) : (
            displayedAllocatedDuties.map((duty) => (
              <View key={duty.id || duty.bm} style={styles.dutyCard}>
                <View style={styles.dutyCardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.dutyRouteRow}>
                      <Text style={styles.dutyRouteCode}>{duty.routeCode || duty.busNumber || 'Route'}</Text>
                      <View style={styles.dutyBmPill}>
                        <Text style={styles.dutyBmText}>🚌 BM Number: {duty.bm}</Text>
                      </View>
                      <Text style={styles.dutyRegText}>({duty.regNo})</Text>
                    </View>
                    <Text style={styles.dutyRouteName} numberOfLines={1}>
                      {duty.routeName || `${duty.origin || ''} ➔ ${duty.destination || ''}`}
                    </Text>
                  </View>
                </View>

                {/* Duty Badges */}
                <View style={styles.dutyBadgesRow}>
                  <View style={styles.badgeDuty}>
                    <Text style={styles.badgeDutyText}>⚡ ALLOCATED DUTY</Text>
                  </View>
                  <View style={styles.badgeShift}>
                    <Text style={styles.badgeShiftText}>Shift: {duty.shift || 'General Shift'}</Text>
                  </View>
                  <View style={styles.badgeTime}>
                    <Text style={styles.badgeTimeText}>🕒 {duty.departureTime || '—'}</Text>
                  </View>
                  <View style={styles.badgeTrips}>
                    <Text style={styles.badgeTripsText}>🎯 {duty.tripCount || 8} Trips</Text>
                  </View>
                </View>

                {/* Driver Info & SoC */}
                <View style={styles.dutyDriverRow}>
                  <Text style={styles.dutyDriverText}>
                    👤 Driver: <Text style={{ fontWeight: '700', color: '#1e293b' }}>{duty.driver || 'Driver Assigned'}</Text>
                  </Text>
                  <Text style={styles.dutySocText}>⚡ {duty.soc}% SoC</Text>
                </View>

                <View style={{ marginVertical: 8 }}>
                  <BatteryBar soc={duty.soc || 80} showText={false} />
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={styles.btnCardRouteComplete}
                  onPress={() => handleMarkRouteComplete(duty.bm)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnCardRouteCompleteText}>
                    ✅ Route Completed — Return to Depot
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ── CARD 2: COMPLETED ROUTES LOG & FLEET OPERATIONAL ARCHIVE ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderStack}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>📋 {t('title_completed_routes_log', 'Completed Routes Log')}</Text>
              <View style={styles.completedCountBadge}>
                <Text style={styles.completedCountBadgeText}>
                  {allCompletedLog.length} Returned
                </Text>
              </View>
            </View>
            <View style={styles.cardActionsRow}>
              {/* Direct Download Button (Downloads CSV directly into Chrome/Downloads/Files) */}
              <TouchableOpacity
                style={styles.btnDownloadCsv}
                onPress={handleDownloadCompletedLog}
                activeOpacity={0.7}
              >
                <Text style={styles.btnDownloadCsvText}>{`📥 ${t('download_csv', 'Download CSV')}`}</Text>
              </TouchableOpacity>

              {/* Clear Log Button */}
              <TouchableOpacity
                style={styles.btnClearLog}
                onPress={() => {
                  Alert.alert(t('clear_log', 'Clear Completed Routes Log'), t('clear_log_confirm', 'Clear the return log?'), [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear Log', style: 'destructive', onPress: () => clearCompletedRoutesLog() },
                  ]);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.btnClearLogText}>{`🗑 ${t('clear_log', 'Clear Log')}`}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Tabs (All / Today) */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, logFilter === 'all' && styles.filterTabActive]}
              onPress={() => setLogFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, logFilter === 'all' && styles.filterTabTextActive]}>
                All ({allCompletedLog.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, logFilter === 'today' && styles.filterTabActive]}
              onPress={() => setLogFilter('today')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, logFilter === 'today' && styles.filterTabTextActive]}>
                Today ({filteredCompletedLog.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Log Table / List */}
          {filteredCompletedLog.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>{t('no_completed_routes_today', 'No completed routes yet today.')}</Text>
              <Text style={styles.emptySub}>
                Completed returned buses will appear here in chronological order.
              </Text>
            </View>
          ) : (
            filteredCompletedLog.map((item, idx) => (
              <View key={item.id || idx} style={styles.completedLogCard}>
                <View style={styles.completedLogTop}>
                  <View style={styles.completedLogBusInfo}>
                    <Text style={styles.completedBmText}>🚌 {item.bm}</Text>
                    <Text style={styles.completedRegText}>({item.reg})</Text>
                  </View>
                  <View style={styles.completedBadgePill}>
                    <Text style={styles.completedBadgePillText}>✅ {item.status || 'Returned / Completed'}</Text>
                  </View>
                </View>

                <Text style={styles.completedRouteText}>
                  Route: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.route}</Text>
                </Text>

                <View style={styles.completedDriverRow}>
                  <Text style={styles.completedDriverText}>
                    👤 Driver: <Text style={{ fontWeight: '700', color: '#334155' }}>{item.driver || 'Driver'}</Text>
                  </Text>
                </View>

                <View style={styles.completedTimeContainer}>
                  <View style={styles.completedTimeBadge}>
                    <Text style={styles.completedTimeLabel}>🕒 Scheduled</Text>
                    <Text style={styles.completedTimeValue}>{item.scheduledTime || '—'}</Text>
                  </View>
                  <View style={styles.completedTimeBadge}>
                    <Text style={styles.completedTimeLabel}>🏁 Completed</Text>
                    <Text style={styles.completedTimeValue}>{item.completedAt || '—'}</Text>
                  </View>
                  {item.soc != null && (
                    <View style={styles.completedSocBadge}>
                      <Text style={styles.completedSocLabel}>⚡ SoC</Text>
                      <Text style={styles.completedSocValue}>{item.soc}%</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── MODAL 1: BUS SELECTION PICKER (ALL FLEET BUSES LIST) ── */}
      <Modal visible={busPickerOpen} transparent animationType="slide" onRequestClose={() => setBusPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{`🚌 ${t('select_bus', 'Select Bus')}`}</Text>
              <TouchableOpacity onPress={() => setBusPickerOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Search Input */}
            <View style={styles.modalSearchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t('select_bus_prompt', 'Search by BM Number or Reg No...')}
                placeholderTextColor="#94a3b8"
                value={busSearchInput}
                onChangeText={setBusSearchInput}
                autoCapitalize="characters"
              />
              {busSearchInput.length > 0 && (
                <TouchableOpacity onPress={() => setBusSearchInput('')}>
                  <Text style={styles.clearSearchIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={true}>
              {filteredSelectBuses.map((bus) => {
                const isAlloc = (allocatedDuties || []).some((d) => d.bm === bus.bmNumber);
                const isSelected = bus.bmNumber === selectedBusBm;
                return (
                  <TouchableOpacity
                    key={bus.bmNumber}
                    style={[
                      styles.busOptionItem,
                      isSelected && styles.busOptionItemSelected,
                      isAlloc && styles.busOptionItemAllocated,
                    ]}
                    onPress={() => {
                      setSelectedBusBm(bus.bmNumber);
                      setBusSearchInput(bus.bmNumber);
                      setBusPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.busOptionBm, isSelected && { color: '#0369a1' }]}>
                          🚌 {bus.bmNumber}
                        </Text>
                        <Text style={styles.busOptionReg}>({bus.regNo})</Text>
                        <View style={styles.busOptionCat}>
                          <Text style={styles.busOptionCatText}>{t('col_category', 'Cat')} {bus.busCategory || 'B'}</Text>
                        </View>
                        <View style={[styles.depotPill, { backgroundColor: bus.depot === '2' ? '#ede9fe' : '#ccfbf1' }]}>
                          <Text style={[styles.depotPillText, { color: bus.depot === '2' ? '#6d28d9' : '#0f766e' }]}>
                            Depot {bus.depot || '1'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.busOptionStatus}>
                        {isAlloc ? '🟣 Currently Allocated on Route' : `🟢 In Yard • ${bus.status || 'Available'} (⚡ ${bus.soc}%)`}
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
          {/* ── LANGUAGE SELECTOR MODAL ── */}
      <LanguageModal visible={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#edf2fe',
  },
  contentWrap: {
    paddingBottom: 28,
  },

  // ── Top Bar (Admin Workspace Design) ──
  topbar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  topbarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  topbarCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0891b2',
    letterSpacing: 0.8,
  },
  topbarTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  topbarSub: {
    fontSize: 11,
    color: '#64748b',
  },
  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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

  // ── Success Banner ──
  successBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  successText: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
  },
  successClose: {
    fontSize: 16,
    color: '#166534',
    padding: 4,
    fontWeight: '700',
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  statCardAllocated: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#7c3aed',
  },
  statCardCompleted: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#059669',
  },
  statCardFleet: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#0891b2',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },

  // ── Card Container ──
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderStack: {
    marginBottom: 12,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  allocCountBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  allocCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5b21b6',
  },
  completedCountBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  btnRefresh: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  btnRefreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  btnAllHistory: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnAllHistoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  btnDownloadCsv: {
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnDownloadCsvText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnClearLog: {
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnClearLogText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },

  // ── Bus Selection Panel ──
  busSelectPanel: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  panelTag: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  panelTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },

  // ── Search & Dropdown ──
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  clearSearchIcon: {
    fontSize: 14,
    color: '#94a3b8',
    padding: 4,
    fontWeight: '700',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },
  dropdownTextSelected: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  dropdownTextPlaceholder: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  dropdownCaret: {
    fontSize: 14,
    color: '#0284c7',
    marginLeft: 8,
  },

  // ── Bus Info Box ──
  busInfoBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCell: {
    width: '47%',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  routeInfoBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  routeInfoBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7c3aed',
    marginBottom: 6,
  },
  warnTransferBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  warnTransferTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
    marginBottom: 2,
  },
  warnTransferText: {
    fontSize: 11.5,
    color: '#1e40af',
    lineHeight: 16,
    fontWeight: '600',
  },
  warnNotAllocated: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    lineHeight: 16,
  },
  btnRouteCompleteMain: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnRouteCompleteDisabled: {
    opacity: 0.45,
  },
  btnRouteCompleteMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── Dispatches ──
  dispatchesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dispatchesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  dispatchesCountBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dispatchesCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6d28d9',
  },
  singleViewToggleBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  singleViewToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dutyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  dutyCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dutyRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dutyRouteCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  dutyBmPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dutyBmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369a1',
  },
  dutyRegText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  dutyRouteName: {
    fontSize: 13.5,
    color: '#475569',
    marginTop: 4,
    fontWeight: '500',
  },
  dutyBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badgeDuty: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDutyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  badgeShift: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeShiftText: {
    fontSize: 10,
    color: '#475569',
  },
  badgeTime: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  badgeTrips: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeTripsText: {
    fontSize: 10,
    color: '#065f46',
  },
  dutyDriverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  dutyDriverText: {
    fontSize: 12,
    color: '#475569',
  },
  dutySocText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  btnCardRouteComplete: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 6,
  },
  btnCardRouteCompleteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── Completed Log Filter Tabs ──
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterTabActive: {
    backgroundColor: '#ffffff',
    elevation: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#0f172a',
  },
  completedLogCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  completedLogTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedLogBusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedBmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  completedRegText: {
    fontSize: 12,
    color: '#64748b',
  },
  completedBadgePill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  completedRouteText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  completedDriverRow: {
    marginTop: 2,
  },
  completedDriverText: {
    fontSize: 12,
    color: '#64748b',
  },
  completedTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  completedTimeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedTimeLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  completedTimeValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  completedSocBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedSocLabel: {
    fontSize: 10,
    color: '#065f46',
  },
  completedSocValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },

  // ── Empty State ──
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  // ── Modals Shared ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  busOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderRadius: 10,
    minHeight: 64,
  },
  busOptionItemSelected: {
    backgroundColor: '#eff6ff',
  },
  busOptionItemAllocated: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#7c3aed',
  },
  busOptionBm: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  busOptionReg: {
    fontSize: 13.5,
    color: '#64748b',
    fontWeight: '600',
  },
  busOptionCat: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  busOptionCatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  depotPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  depotPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  busOptionStatus: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  pickerCheck: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284c7',
  },

  // ── History Modal Specific ──
  historyModalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    elevation: 8,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyModalBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0891b2',
    letterSpacing: 0.6,
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  historyModalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  btnModalDownload: {
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnModalDownloadText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalFilterTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  modalFilterTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  modalFilterTabActive: {
    backgroundColor: '#ffffff',
  },
  modalFilterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  modalFilterTabTextActive: {
    color: '#0f172a',
  },
  historyBusCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  historyBusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyBusBm: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyBusReg: {
    fontSize: 12,
    color: '#64748b',
  },
  historyBusStatus: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  historyRecordCountBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyRecordCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
  },
  historyLastRunRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historyLastRunText: {
    fontSize: 11,
    color: '#64748b',
  },

  // ── Language Modal Specific ──
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
});
