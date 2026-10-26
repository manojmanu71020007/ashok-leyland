import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import {
  useFleet,
  getTimeCategory,
  getRouteComplexity,
  getMatrixStatus,
  getBusActualRangeKm,
  getBusDrainRatePerKm,
  getRequiredSingleChargeSoc,
  STATIC_BUS_CATEGORIES,
  STATIC_BUS_RANGES,
  getBusCategory,
  getBusRegNo,
  getBusDepot,
} from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageModal, { LanguagePickerPill } from '../components/LanguageModal';
import BatteryBar from '../components/BatteryBar';
import { exportCsvFile } from '../utils/exportCsv';

// ── DEPOT 1 ROUTES (Exact Match with Website scheduling.html) ──
const DEPOT_1_ROUTES = [
  {
    id: '356Z',
    code: '356Z',
    name: 'Chandapura ➔ Anekal (356Z)',
    origin: 'Chandapura',
    destination: 'Anekal',
    distance: 28.7,
    fullDutyKm: 55.0,
    category: 'Standard',
    requiredCat: 'C',
    drainSoc: 24,
    timetables: ['01:45 PM', '02:00 PM', '02:25 PM', '02:35 PM'],
    shift: 'General Shift',
  },
  {
    id: '360K',
    code: '360K',
    name: 'Chandapura ➔ Kempegowda Bus Station (360K)',
    origin: 'Chandapura',
    destination: 'Kempegowda Bus Station',
    distance: 36.2,
    fullDutyKm: 78.4,
    category: 'Standard',
    requiredCat: 'B',
    drainSoc: 28,
    timetables: [
      '09:55 AM',
      '10:00 AM',
      '12:05 PM',
      '02:05 PM',
      '02:15 PM',
      '02:25 PM',
      '02:35 PM',
      '02:45 PM',
    ],
    shift: 'General Shift',
  },
  {
    id: '600F',
    code: '600F',
    name: 'Bommasandra Depot 32 ➔ Basavanagudi (600F)',
    origin: 'Bommasandra Depot 32',
    destination: 'Basavanagudi',
    distance: 27.8,
    fullDutyKm: 62.0,
    category: 'Standard',
    requiredCat: 'B',
    drainSoc: 25,
    timetables: [
      '12:30 PM',
      '12:40 PM',
      '12:50 PM',
      '01:00 PM',
      '01:10 PM',
      '01:15 PM',
      '01:25 PM',
      '01:35 PM',
      '01:45 PM',
      '01:55 PM',
      '02:05 PM',
      '02:15 PM',
      '02:25 PM',
      '02:30 PM',
      '02:35 PM',
      '02:40 PM',
      '02:45 PM',
      '02:55 PM',
      '03:35 PM',
      '03:45 PM',
      '03:55 PM',
      '04:05 PM',
      '04:15 PM',
      '04:25 PM',
    ],
    shift: 'General Shift',
  },
  {
    id: 'KBS3A',
    code: 'KBS3A',
    name: 'Chandapura ➔ Kempegowda Bus Station (KBS3A)',
    origin: 'Chandapura',
    destination: 'Kempegowda Bus Station',
    distance: 35.8,
    fullDutyKm: 72.0,
    category: 'Moderate',
    requiredCat: 'B',
    drainSoc: 26,
    timetables: [
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '01:35 PM',
      '01:45 PM',
      '01:55 PM',
      '02:05 PM',
      '02:15 PM',
      '02:25 PM',
      '02:35 PM',
      '02:45 PM',
      '02:55 PM',
      '03:05 PM',
    ],
    shift: 'General Shift',
  },
];

// ── DEPOT 2 ROUTES (Exact Match with Website scheduling.html) ──
const DEPOT_2_ROUTES = [
  {
    id: '361C',
    code: '361C',
    name: 'Attibele ➔ Kempegowda Bus Station (361C)',
    origin: 'Attibele',
    destination: 'Kempegowda Bus Station',
    distance: 38.5,
    fullDutyKm: 108.0,
    category: 'Complex',
    requiredCat: 'A',
    drainSoc: 36,
    timetables: [
      '01:10 PM',
      '01:30 PM',
      '01:50 PM',
      '02:10 PM',
      '02:30 PM',
      '02:50 PM',
      '03:10 PM',
      '03:30 PM',
      '03:50 PM',
    ],
    shift: 'Night Halt',
  },
  {
    id: '399C',
    code: '399C',
    name: 'Hosakote ➔ Electronic City (399C)',
    origin: 'Hosakote',
    destination: 'Electronic City',
    distance: 34.0,
    fullDutyKm: 85.0,
    category: 'Complex',
    requiredCat: 'A',
    drainSoc: 32,
    timetables: ['01:15 PM', '02:00 PM', '02:40 PM', '03:35 PM'],
    shift: 'General Shift',
  },
  {
    id: '328H',
    code: '328H',
    name: 'Hoskote ➔ Kempegowda Bus Station (328H)',
    origin: 'Hoskote',
    destination: 'Kempegowda Bus Station',
    distance: 32.5,
    fullDutyKm: 95.0,
    category: 'Moderate',
    requiredCat: 'B',
    drainSoc: 30,
    timetables: [
      '01:00 PM',
      '01:10 PM',
      '01:20 PM',
      '01:30 PM',
      '01:45 PM',
      '01:50 PM',
      '02:00 PM',
      '02:10 PM',
      '02:15 PM',
      '02:30 PM',
      '02:45 PM',
      '03:00 PM',
      '03:10 PM',
      '03:20 PM',
      '03:30 PM',
      '03:40 PM',
      '03:50 PM',
      '04:00 PM',
    ],
    shift: 'Night Halt',
  },
  {
    id: '500DC',
    code: '500DC',
    name: 'Attibele ➔ Whitefield (500DC)',
    origin: 'Attibele',
    destination: 'Whitefield',
    distance: 31.0,
    fullDutyKm: 101.1,
    category: 'Standard',
    requiredCat: 'A',
    drainSoc: 32,
    timetables: ['07:45 AM', '08:00 AM', '08:15 AM', '08:30 AM', '01:10 PM'],
    shift: 'General Shift',
  },
  {
    id: 'KBS3F',
    code: 'KBS3F',
    name: 'Attibele ➔ Kempegowda Bus Station (KBS3F)',
    origin: 'Attibele',
    destination: 'Kempegowda Bus Station (KBS3F)',
    distance: 39.2,
    fullDutyKm: 76.0,
    category: 'Standard',
    requiredCat: 'B',
    drainSoc: 22,
    timetables: [
      '09:45 AM',
      '10:05 AM',
      '10:10 AM',
      '10:20 AM',
      '01:50 PM',
      '02:10 PM',
      '03:45 PM',
      '04:00 PM',
    ],
    shift: 'General shift',
  },
];

const DEPOT_DRIVERS = {
  '1': [
    { id: 'DRV-101', name: 'Ramesh Kumar (BMTC-4101)' },
    { id: 'DRV-102', name: 'Suresh Gowda (BMTC-4102)' },
    { id: 'DRV-103', name: 'Anand Murthy (BMTC-4103)' },
    { id: 'DRV-104', name: 'Manjunath H. (BMTC-4104)' },
    { id: 'DRV-105', name: 'Venkatesh P. (BMTC-4105)' },
    { id: 'DRV-106', name: 'Ravi Shankar (BMTC-4106)' },
    { id: 'DRV-107', name: 'Kiran Kumar (BMTC-4107)' },
    { id: 'DRV-108', name: 'Nagaraj V. (BMTC-4108)' },
    { id: 'DRV-109', name: 'Shivanna M. (BMTC-4109)' },
    { id: 'DRV-110', name: 'Lokesh Gowda (BMTC-4110)' },
  ],
  '2': [
    { id: 'DRV-201', name: 'Basavaraju K. (BMTC-4201)' },
    { id: 'DRV-202', name: 'Prakash Nayak (BMTC-4202)' },
    { id: 'DRV-203', name: 'Girish Reddy (BMTC-4203)' },
    { id: 'DRV-204', name: 'Shanthakumar (BMTC-4204)' },
    { id: 'DRV-205', name: 'Chandrashekar (BMTC-4205)' },
    { id: 'DRV-206', name: 'Harish Babu (BMTC-4206)' },
    { id: 'DRV-207', name: 'Jagadish Patil (BMTC-4207)' },
    { id: 'DRV-208', name: 'Mohan Rao (BMTC-4208)' },
    { id: 'DRV-209', name: 'Umesh Nayak (BMTC-4209)' },
    { id: 'DRV-210', name: 'Vijay Kumar (BMTC-4210)' },
  ],
};

// ── Master Dataset Schedules for Route-Duty Pair Matching (Exact match with scheduling.html) ──
const DEFAULT_DATASET_SCHEDULES = [
  { scheduleId: '356Z/1', route: '356Z', shift: 'General Shift', fixBm: 'BM238', swapBm: 'BM278', outTime: '07:15:00', inTime: '15:15:00', category: 'Standard', singleChargeReqKm: 45 },
  { scheduleId: '356Z/2', route: '356Z', shift: 'General Shift', fixBm: 'BM217', swapBm: 'BM256', outTime: '08:30:00', inTime: '16:30:00', category: 'Standard', singleChargeReqKm: 45 },
  { scheduleId: '356Z/3', route: '356Z', shift: 'Shift B', fixBm: 'BM256', swapBm: 'BM205', outTime: '13:10:00', inTime: '21:10:00', category: 'Standard', singleChargeReqKm: 45 },
  { scheduleId: '356Z/4', route: '356Z', shift: 'Shift B', fixBm: 'BM217', swapBm: 'BM238', outTime: '14:20:00', inTime: '22:20:00', category: 'Standard', singleChargeReqKm: 45 },
  { scheduleId: '356Z/5', route: '356Z', shift: 'Night Halt', fixBm: 'BM218', swapBm: 'BM303', outTime: '19:40:00', inTime: '06:00:00', category: 'Standard', singleChargeReqKm: 45 },
  { scheduleId: '360K/1', route: '360K', shift: 'General Shift', fixBm: 'BM291', swapBm: 'BM264', outTime: '07:00:00', inTime: '15:00:00', category: 'Standard', singleChargeReqKm: 55 },
  { scheduleId: '360K/2', route: '360K', shift: 'General Shift', fixBm: 'BM205', swapBm: 'BM056', outTime: '08:15:00', inTime: '16:15:00', category: 'Standard', singleChargeReqKm: 55 },
  { scheduleId: '360K/3', route: '360K', shift: 'Shift B', fixBm: 'BM292', swapBm: 'BM198', outTime: '13:10:00', inTime: '21:10:00', category: 'Standard', singleChargeReqKm: 55 },
  { scheduleId: '360K/4', route: '360K', shift: 'Shift B', fixBm: 'BM199', swapBm: 'BM005', outTime: '14:00:00', inTime: '22:00:00', category: 'Standard', singleChargeReqKm: 55 },
  { scheduleId: '360K/5', route: '360K', shift: 'Night Halt', fixBm: 'BM282', swapBm: 'BM080', outTime: '18:30:00', inTime: '06:30:00', category: 'Standard', singleChargeReqKm: 55 },
  { scheduleId: '600F/1', route: '600F', shift: 'General Shift', fixBm: 'BM003', swapBm: 'BM277', outTime: '06:45:00', inTime: '14:45:00', category: 'Standard', singleChargeReqKm: 42 },
  { scheduleId: '600F/2', route: '600F', shift: 'General Shift', fixBm: 'BM258', swapBm: 'BM273', outTime: '08:00:00', inTime: '16:00:00', category: 'Standard', singleChargeReqKm: 42 },
  { scheduleId: '600F/3', route: '600F', shift: 'Shift B', fixBm: 'BM249', swapBm: 'BM203', outTime: '13:10:00', inTime: '21:10:00', category: 'Standard', singleChargeReqKm: 42 },
  { scheduleId: '600F/4', route: '600F', shift: 'Shift B', fixBm: 'BM265', swapBm: 'BM264', outTime: '14:30:00', inTime: '22:30:00', category: 'Standard', singleChargeReqKm: 42 },
  { scheduleId: '600F/5', route: '600F', shift: 'Night Halt', fixBm: 'BM255', swapBm: 'BM274', outTime: '19:15:00', inTime: '06:15:00', category: 'Standard', singleChargeReqKm: 42 },
  { scheduleId: '361C/1', route: '361C', shift: 'General Shift', fixBm: 'BM299', swapBm: 'BM280', outTime: '07:30:00', inTime: '15:30:00', category: 'Complex', singleChargeReqKm: 60 },
  { scheduleId: '361C/2', route: '361C', shift: 'General Shift', fixBm: 'BM054', swapBm: 'BM303', outTime: '09:00:00', inTime: '17:00:00', category: 'Complex', singleChargeReqKm: 60 },
  { scheduleId: '361C/3', route: '361C', shift: 'Shift B', fixBm: 'BM289', swapBm: 'BM020', outTime: '13:10:00', inTime: '21:10:00', category: 'Complex', singleChargeReqKm: 60 },
  { scheduleId: '361C/4', route: '361C', shift: 'Shift B', fixBm: 'BM174', swapBm: 'BM225', outTime: '15:00:00', inTime: '23:00:00', category: 'Complex', singleChargeReqKm: 60 },
  { scheduleId: '399C/1', route: '399C', shift: 'General Shift', fixBm: 'BM216', swapBm: 'BM282', outTime: '07:45:00', inTime: '15:45:00', category: 'Complex', singleChargeReqKm: 55 },
  { scheduleId: '399C/2', route: '399C', shift: 'General Shift', fixBm: 'BM272', swapBm: 'BM286', outTime: '09:15:00', inTime: '17:15:00', category: 'Complex', singleChargeReqKm: 55 },
  { scheduleId: '399C/3', route: '399C', shift: 'Shift B', fixBm: 'BM216', swapBm: 'BM088', outTime: '13:10:00', inTime: '21:10:00', category: 'Complex', singleChargeReqKm: 55 },
  { scheduleId: '399C/4', route: '399C', shift: 'Shift B', fixBm: 'BM282', swapBm: 'BM272', outTime: '15:30:00', inTime: '23:30:00', category: 'Complex', singleChargeReqKm: 55 },
  { scheduleId: '328H/1', route: '328H', shift: 'Night Halt', fixBm: 'BM279', swapBm: 'BM294', outTime: '13:10:00', inTime: '10:30:00', category: 'Complex', singleChargeReqKm: 145.7 },
  { scheduleId: '328H/10', route: '328H', shift: 'Night Halt', fixBm: 'BM294', swapBm: 'BM279', outTime: '13:45:00', inTime: '11:45:00', category: 'Moderate', singleChargeReqKm: 110 },
  { scheduleId: '328H/12', route: '328H', shift: 'Night Halt', fixBm: 'BM279', swapBm: 'BM294', outTime: '13:50:00', inTime: '11:10:00', category: 'Complex', singleChargeReqKm: 145.7 },
  { scheduleId: '500DC/12', route: '500DC', shift: 'General Shift', fixBm: 'BM240', swapBm: 'BM255', outTime: '07:45:00', inTime: '14:45:00', category: 'Standard', singleChargeReqKm: 85 },
  { scheduleId: '500DC/13', route: '500DC', shift: 'General Shift', fixBm: 'BM255', swapBm: 'BM274', outTime: '08:00:00', inTime: '15:00:00', category: 'Standard', singleChargeReqKm: 85 },
  { scheduleId: '500DC/14', route: '500DC', shift: 'General Shift', fixBm: 'BM274', swapBm: 'BM240', outTime: '08:15:00', inTime: '15:15:00', category: 'Standard', singleChargeReqKm: 85 },
  { scheduleId: '500DC/15', route: '500DC', shift: 'General Shift', fixBm: 'BM240', swapBm: 'BM274', outTime: '08:30:00', inTime: '15:30:00', category: 'Standard', singleChargeReqKm: 85 },
  { scheduleId: '500DC/1', route: '500DC', shift: 'Shift B', fixBm: 'BM255', swapBm: 'BM240', outTime: '13:10:00', inTime: '21:10:00', category: 'Standard', singleChargeReqKm: 85 },
  { scheduleId: 'KBS3A/1', route: 'KBS3A', shift: 'General Shift', fixBm: 'BM086', swapBm: 'BM268', outTime: '07:00:00', inTime: '15:00:00', category: 'Moderate', singleChargeReqKm: 55 },
  { scheduleId: 'KBS3A/2', route: 'KBS3A', shift: 'General Shift', fixBm: 'BM268', swapBm: 'BM081', outTime: '08:30:00', inTime: '16:30:00', category: 'Moderate', singleChargeReqKm: 55 },
  { scheduleId: 'KBS3A/3', route: 'KBS3A', shift: 'Shift B', fixBm: 'BM259', swapBm: 'BM210', outTime: '13:10:00', inTime: '21:10:00', category: 'Moderate', singleChargeReqKm: 55 },
  { scheduleId: 'KBS3A/4', route: 'KBS3A', shift: 'Shift B', fixBm: 'BM210', swapBm: 'BM209', outTime: '14:15:00', inTime: '22:15:00', category: 'Moderate', singleChargeReqKm: 55 },
  { scheduleId: 'KBS3F/1', route: 'KBS3F', shift: 'General Shift', fixBm: 'BM293', swapBm: 'BM250', outTime: '07:15:00', inTime: '15:15:00', category: 'Standard', singleChargeReqKm: 30 },
  { scheduleId: 'KBS3F/2', route: 'KBS3F', shift: 'General Shift', fixBm: 'BM250', swapBm: 'BM275', outTime: '08:45:00', inTime: '16:45:00', category: 'Standard', singleChargeReqKm: 30 },
  { scheduleId: 'KBS3F/3', route: 'KBS3F', shift: 'Shift B', fixBm: 'BM293', swapBm: 'BM082', outTime: '13:10:00', inTime: '21:10:00', category: 'Standard', singleChargeReqKm: 30 },
  { scheduleId: 'KBS3F/4', route: 'KBS3F', shift: 'Shift B', fixBm: 'BM275', swapBm: 'BM293', outTime: '14:30:00', inTime: '22:30:00', category: 'Standard', singleChargeReqKm: 30 },
];

const ROUTE_DESIGNATED_BMS = {
  '356Z': ['BM256', 'BM205', 'BM238', 'BM217', 'BM278', 'BM303'],
  '360K': ['BM291', 'BM264', 'BM205', 'BM292', 'BM198', 'BM199'],
  '600F': ['BM003', 'BM277', 'BM258', 'BM273', 'BM249', 'BM010'],
  '361C': ['BM299', 'BM280', 'BM054', 'BM289', 'BM304'],
  '399C': ['BM216', 'BM282', 'BM272', 'BM286'],
  '328H': ['BM279', 'BM294', 'BM282', 'BM153', 'BM285'],
  '500DC': ['BM240', 'BM255', 'BM274', 'BM283'],
  'KBS3A': ['BM086', 'BM268', 'BM259', 'BM210'],
  'KBS3F': ['BM293', 'BM250', 'BM275', 'BM082'],
};

const parseTimeToMinutes = (t) => {
  if (!t) return 720;
  const isAmPm = /am|pm/i.test(t);
  const clean = t.trim();
  if (isAmPm) {
    const [timePart, mod] = clean.split(' ');
    let [h, m] = (timePart || '12:00').split(':').map(Number);
    if (isNaN(h)) h = 12;
    if (isNaN(m)) m = 0;
    if (/pm/i.test(mod) && h < 12) h += 12;
    if (/am/i.test(mod) && h === 12) h = 0;
    return h * 60 + m;
  }
  const parts = clean.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
};

const adjustTimeStr = (timeStr, deltaMinutes) => {
  try {
    const isAmPm = /am|pm/i.test(timeStr);
    let [timePart, modifier] = timeStr.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;

    if (isAmPm && modifier) {
      if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }

    let totalMins = hours * 60 + minutes + deltaMinutes;
    if (totalMins < 0) totalMins += 24 * 60;
    totalMins = totalMins % (24 * 60);

    let newH = Math.floor(totalMins / 60);
    let newM = totalMins % 60;

    if (isAmPm) {
      const ampm = newH >= 12 ? 'PM' : 'AM';
      let h12 = newH % 12;
      if (h12 === 0) h12 = 12;
      return `${String(h12).padStart(2, '0')}:${String(newM).padStart(2, '0')} ${ampm}`;
    } else {
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }
  } catch (e) {
    return timeStr;
  }
};

export default function SchedulingScreen() {
  const { buses, allBuses, lockedBuses = [], allocatedDuties = [], allocateBusToRoute } = useFleet();
  const { selectedDepot, logout, returnToLogin } = useAuth();
  const { t } = useLanguage();

  const depotNum = selectedDepot === '2' ? '2' : '1';
  const depotLabel = selectedDepot === '2' ? 'Depot 2' : 'Depot 1 (Chandapura)';

  const availableRoutes = depotNum === '2' ? DEPOT_2_ROUTES : DEPOT_1_ROUTES;
  const availableDrivers = DEPOT_DRIVERS[depotNum] || DEPOT_DRIVERS['1'];

  // Scheduling states
  const [selectedRoute, setSelectedRoute] = useState(availableRoutes[0]);
  const [scheduledTime, setScheduledTime] = useState(availableRoutes[0].timetables[0]);
  const [selectedDriver, setSelectedDriver] = useState(availableDrivers[0]);
  const [driverNameInput, setDriverNameInput] = useState(availableDrivers[0].name);
  const [driverError, setDriverError] = useState('');
  const [selectedCandidateBm, setSelectedCandidateBm] = useState(null);
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Sync route and driver when depot changes
  React.useEffect(() => {
    const routesForDepot = depotNum === '2' ? DEPOT_2_ROUTES : DEPOT_1_ROUTES;
    const isCurrentInDepot = routesForDepot.some((r) => r.id === selectedRoute.id);
    if (!isCurrentInDepot) {
      setSelectedRoute(routesForDepot[0]);
      setScheduledTime(routesForDepot[0].timetables[0]);
      setSelectedCandidateBm(null);
    }
    const driversForDepot = DEPOT_DRIVERS[depotNum] || DEPOT_DRIVERS['1'];
    setSelectedDriver(driversForDepot[0]);
    setDriverNameInput(driversForDepot[0].name);
    setDriverError('');
  }, [depotNum]);

  const handleDriverTextChange = (text) => {
    // Allow driver name with numbers and separators (e.g. Ramesh Kumar - 4101)
    const filtered = text.replace(/[^a-zA-Z0-9\s\.\-\(\)\+\#\/]/g, '');
    setDriverError('');
    setDriverNameInput(filtered);
    const matched = availableDrivers.find(
      (d) => d.name.toLowerCase() === filtered.trim().toLowerCase()
    );
    if (matched) {
      setSelectedDriver(matched);
    } else {
      setSelectedDriver({
        id: 'DRV-CUSTOM',
        name: filtered.trim(),
        badge: `BMTC-${depotNum}9999`,
        shift: 'General',
      });
    }
  };

  // Picker Modals
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);

  // Available buses in that depot strictly (excluding locked buses for charging, cleaning, or allocated)
  const isBusAvailableForScheduling = (b) => {
    const bm = String(b.bmNumber || b.id || '').toUpperCase().trim();
    const isAlloc = b.isAllocated || allocatedDuties.some((d) => String(d.bm || d.bmNumber || d.busId || '').toUpperCase().trim() === bm);
    const isLock = b.isLocked || b.isCharging || b.isCleaning || lockedBuses.some((lb) => String(lb.bm || lb.bmNumber || '').toUpperCase().trim() === bm);
    return !isAlloc && !isLock && b.status !== 'Blocked' && b.status !== 'Deleted';
  };

  const resolvedAll = (allBuses && allBuses.length > 0) ? allBuses : buses;
  const depotBuses = resolvedAll.filter((b) => String(b.depot || '1') === depotNum);
  const readyBuses = depotBuses.filter(isBusAvailableForScheduling);
  const eligibleDepotBuses = depotBuses.filter((b) => !b.isLocked && !b.isCharging && !b.isCleaning && !b.isAllocated && !b.isNeedsServicing && !b.needsCharging && !b.needsCleaning);
  const pool = readyBuses.length > 0 ? readyBuses : eligibleDepotBuses;

  // 1. Master Matched Timetable Duty & Schedule Pair (Exact match with scheduling.html)
  const matchedSched = useMemo(() => {
    const routeCode = String(selectedRoute?.code || selectedRoute?.id || selectedRoute?.routeCode || '356Z').toUpperCase().trim();
    const depTimeClean = (scheduledTime || '13:10').trim();
    const depShort = depTimeClean.substring(0, 5);
    const depMin = parseTimeToMinutes(depShort);
    const routeSchedules = DEFAULT_DATASET_SCHEDULES.filter(
      (s) => String(s.route || '').toUpperCase().trim() === routeCode
    );
    let found = routeSchedules.find((s) => s.outTime && s.outTime.substring(0, 5) === depShort);
    if (!found && routeSchedules.length > 0) {
      found = routeSchedules.slice().sort((a, b) => {
        const diffA = Math.abs(parseTimeToMinutes(a.outTime || '12:00') - depMin);
        const diffB = Math.abs(parseTimeToMinutes(b.outTime || '12:00') - depMin);
        return diffA - diffB;
      })[0];
    }
    return found || null;
  }, [selectedRoute, scheduledTime]);

  // 2. Route Complexity & Time Category Matrix evaluation (Exact match to website scheduling.html)
  const complexity = getRouteComplexity(selectedRoute, matchedSched, scheduledTime);
  const timeCatInfo = getTimeCategory(scheduledTime);
  const isPeak = Boolean(timeCatInfo && timeCatInfo.isPeak);
  const matrixStatus = getMatrixStatus(complexity, timeCatInfo);

  // 3. Strict Feasibility Evaluation Engine (Exact 1:1 match with scheduling.html evaluateBusFeasibility)
  const evaluateBusFeasibility = useCallback((busOrBm, candidateRole, routeDist, depTimeShort, targetShift) => {
    if (!busOrBm) return { feasible: false, reason: 'No vehicle assigned in schedule' };
    const key = typeof busOrBm === 'string' ? busOrBm.toUpperCase().trim() : String(busOrBm.bmNumber || busOrBm.id || '').toUpperCase().trim();
    const busObj = typeof busOrBm === 'object' ? busOrBm : (resolvedAll.find((b) => String(b.bmNumber || b.id || '').toUpperCase().trim() === key) || pool.find((b) => String(b.bmNumber || b.id || '').toUpperCase().trim() === key));

    // Depot Isolation Check: Bus must belong to depotNum
    const busDepot = busObj ? String(busObj.depot || '1') : getBusDepot(key);
    if (String(busDepot) !== String(depotNum)) {
      return { feasible: false, bm: key, reason: `Bus ${key} belongs to Depot ${busDepot} (Active view: Depot ${depotNum}).` };
    }

    // Lock / turnaround / servicing / allocation check
    const isLocked = Boolean(busObj?.isLocked || lockedBuses.some((lb) => String(lb.bm || lb.bmNumber || '').toUpperCase().trim() === key));
    if (isLocked || busObj?.isCharging || busObj?.isCleaning || busObj?.isTurnaround) {
      return { feasible: false, bm: key, reason: `Bus ${key} is locked under cleaning/charging.` };
    }
    const alreadyAllocated = allocatedDuties.find((d) => String(d.bm || d.bmNumber || d.busId || '').toUpperCase().trim() === key);
    if (alreadyAllocated) {
      return { feasible: false, bm: key, reason: `Bus ${key} is already allocated to Route ${alreadyAllocated.routeCode || alreadyAllocated.busNumber}.` };
    }
    if (busObj && busObj.condition === 'Not Good') {
      return { feasible: false, bm: key, reason: `Bus ${key} flagged for maintenance inspection.` };
    }

    const liveSoc = Number(busObj?.soc ?? 80);
    const constantMinReqSoc = getRequiredSingleChargeSoc(routeDist, matchedSched, key, depTimeShort);
    const minAllowedSoc = constantMinReqSoc - 2;
    if (liveSoc < minAllowedSoc) {
      return { feasible: false, bm: key, liveSoc, reqSoc: constantMinReqSoc, reason: `Bus ${key} battery at ${liveSoc}% does not match minimum required SoC (${constantMinReqSoc}%).` };
    }

    const drainDetails = getBusDrainRatePerKm(key, depTimeShort);
    const drainPerKm = drainDetails.effectiveDrainPerKm;
    const usableCoverableKm = Math.max(0, Math.round((liveSoc - 15) / drainPerKm));
    let operatingKm = Number(routeDist) || 28.7;
    if (matchedSched && matchedSched.singleChargeReqKm) {
      operatingKm = Number(matchedSched.singleChargeReqKm);
    }
    if (operatingKm > 65) operatingKm = 65;
    if (usableCoverableKm < Math.floor(operatingKm * 0.95)) {
      return { feasible: false, bm: key, liveSoc, reason: `Usable range (${usableCoverableKm} km) cannot cover required ${operatingKm.toFixed(1)} km.` };
    }

    const page4Category = busObj?.busCategory || STATIC_BUS_CATEGORIES[key] || getBusCategory(key);
    const isExtremePeak = (timeCatInfo.key === 'EXTREME_PEAK');
    const isPeakOnly = (timeCatInfo.key === 'PEAK');
    const isNormalTime = (timeCatInfo.key === 'NORMAL');
    const isComplex = (complexity === 'complex');
    const isModerate = (complexity === 'moderate');
    const isStandard = (complexity === 'standard');
    const isSimple = (complexity === 'simple');

    // Matrix Rules (Page 4 Specifications)
    if (isComplex && page4Category !== 'A') {
      return { feasible: false, bm: key, reason: `Complex route strictly requires Category A bus. Bus ${key} is Category ${page4Category}.` };
    }
    if (isExtremePeak && page4Category !== 'A') {
      return { feasible: false, bm: key, reason: `Extreme Peak hours strictly require Category A bus. Bus ${key} is Category ${page4Category}.` };
    }
    if ((isModerate || isStandard) && isPeakOnly && page4Category !== 'A') {
      return { feasible: false, bm: key, reason: `Route during Peak hours strictly requires Category A bus. Bus ${key} is Category ${page4Category}.` };
    }
    if ((isModerate || isStandard) && isNormalTime && page4Category === 'C') {
      return { feasible: false, bm: key, reason: `Normal time requires Category B (or A). Category C bus ${key} cannot be allocated.` };
    }
    if (isSimple && isPeakOnly && page4Category === 'C') {
      return { feasible: false, bm: key, reason: `Simple route during Peak requires Category B (or A). Category C bus ${key} cannot be allocated.` };
    }

    return {
      feasible: true,
      bm: key,
      busObj: busObj || { bmNumber: key, id: key, soc: liveSoc, depot: busDepot, busCategory: page4Category },
      liveSoc,
      busCategory: page4Category,
      constantMinReqSoc,
      minAllowedSoc,
      reqSoc: constantMinReqSoc,
      usableCoverableKm,
      actualRangeKm: drainDetails.busRangeKm,
      role: candidateRole
    };
  }, [resolvedAll, pool, depotNum, lockedBuses, allocatedDuties, matchedSched, timeCatInfo, complexity]);

  // 4. Candidate Buses Generation & Mandatory Assignment (Exact 1:1 match with scheduling.html getRouteCandidateBuses)
  const candidateBuses = useMemo(() => {
    const routeCode = String(selectedRoute?.code || selectedRoute?.id || selectedRoute?.routeCode || '356Z').toUpperCase().trim();
    const depTimeClean = scheduledTime || '13:10';
    const depShort = depTimeClean.substring(0, 5);
    const depMin = parseTimeToMinutes(depShort);
    const routeDist = Number(selectedRoute?.distance || 28.7);

    const targetShift = (matchedSched && matchedSched.shift)
      ? matchedSched.shift
      : (depMin >= 300 && depMin < 810 ? 'General Shift' : (depMin >= 810 && depMin < 1320 ? 'Shift B' : 'Night Halt'));

    const candidates = [];
    const seenBms = new Set();

    const addCand = (bm, role) => {
      if (!bm) return;
      const key = String(bm).toUpperCase().trim();
      if (seenBms.has(key)) return;
      const feas = evaluateBusFeasibility(key, role, routeDist, depShort, targetShift);
      if (feas && feas.feasible) {
        seenBms.add(key);
        const b = feas.busObj || pool.find((x) => String(x.bmNumber || x.id || '').toUpperCase().trim() === key) || {};
        const liveSoc = feas.liveSoc;
        const operatingKm = (matchedSched && matchedSched.singleChargeReqKm) ? Number(matchedSched.singleChargeReqKm) : routeDist;
        const energyNeeded = Math.round(operatingKm * 1.25);
        const projectedArrivalSoc = Math.max(0, Math.round(liveSoc - (operatingKm / 1.42)));
        const bufferSoc = Math.max(0, projectedArrivalSoc - 10);
        candidates.push({
          ...b,
          bmNumber: key,
          bm: key,
          regNo: b.regNo || getBusRegNo(key),
          role,
          shift: targetShift,
          liveSoc,
          soc: liveSoc,
          busCategory: feas.busCategory,
          category: feas.busCategory,
          constantMinReqSoc: feas.constantMinReqSoc,
          reqSoc: feas.constantMinReqSoc,
          fullDutyKm: Math.round(Math.max(0, liveSoc - 10) * 1.42),
          actualRangeKm: feas.actualRangeKm,
          energyNeeded,
          projectedArrivalSoc,
          bufferSoc,
          departureTime: depTimeClean,
          routeCode: routeCode,
        });
      }
    };

    // 1. Primary duty bus from master timetable roster (fixBm)
    if (matchedSched && matchedSched.fixBm) {
      addCand(matchedSched.fixBm, `Primary Bus (${targetShift})`);
    }

    // 2. Designated swap bus from master timetable roster (swapBm)
    if (matchedSched && matchedSched.swapBm) {
      addCand(matchedSched.swapBm, `Designated Swap Bus (${targetShift})`);
    }

    // 3. Other scheduled buses for this route
    const routeSchedules = DEFAULT_DATASET_SCHEDULES.filter(
      (s) => String(s.route || '').toUpperCase().trim() === routeCode
    );
    routeSchedules.forEach((s) => {
      if (candidates.length >= 8) return;
      if (s.fixBm) addCand(s.fixBm, `Route Standby Bus (${s.shift || targetShift})`);
      if (s.swapBm) addCand(s.swapBm, `Route Standby Bus (${s.shift || targetShift})`);
    });

    // 4. Route-designated corridor fallback
    const designatedList = ROUTE_DESIGNATED_BMS[routeCode] || [];
    designatedList.forEach((bm) => {
      if (candidates.length >= 8) return;
      addCand(bm, 'Route Standby Bus');
    });

    // 5. Depot reserve fleet search to guarantee at least 3 candidates (exact match to scheduling.html)
    if (candidates.length < 3) {
      const allFleetKeys = Object.keys(STATIC_BUS_RANGES).filter((k) => {
        const bDepot = getBusDepot(k);
        return String(bDepot) === String(depotNum);
      }).sort((a, b) => {
        const busA = resolvedAll.find((x) => String(x.bmNumber || x.id || '').toUpperCase().trim() === a);
        const busB = resolvedAll.find((x) => String(x.bmNumber || x.id || '').toUpperCase().trim() === b);
        const socA = Number(busA?.soc ?? 80);
        const socB = Number(busB?.soc ?? 80);
        return socB - socA;
      });

      const aKeys = allFleetKeys.filter((k) => (STATIC_BUS_RANGES[k] || 110) >= 120 || STATIC_BUS_CATEGORIES[k] === 'A');
      const bKeys = allFleetKeys.filter((k) => !aKeys.includes(k) && ((STATIC_BUS_RANGES[k] || 110) >= 100 || STATIC_BUS_CATEGORIES[k] === 'B'));
      const cKeys = allFleetKeys.filter((k) => !aKeys.includes(k) && !bKeys.includes(k));

      let searchPasses = [];
      if (matrixStatus === 'A') {
        searchPasses = [aKeys];
      } else if (matrixStatus === 'A/B') {
        searchPasses = [bKeys, aKeys];
      } else {
        searchPasses = [cKeys, bKeys, aKeys];
      }

      for (const group of searchPasses) {
        for (const bm of group) {
          if (candidates.length >= 6) break;
          addCand(bm, 'Depot Reserve Fleet Bus');
        }
        if (candidates.length >= 3) break;
      }
    }

    // 6. Sort candidates matching scheduling.html:
    // Category priority (by matrix status) -> Role rank (Primary > Swap > Standby) -> Battery SoC descending
    candidates.sort((a, b) => {
      const getRoleRank = (r) => {
        const str = (r || '').toLowerCase();
        if (str.includes('primary')) return 1;
        if (str.includes('swap')) return 2;
        return 3;
      };

      let catPriority = { A: 0, B: 1, C: 2 };
      if (matrixStatus === 'A/B') {
        catPriority = { B: 0, A: 1, C: 2 };
      } else if (matrixStatus === 'A/B/C') {
        catPriority = { C: 0, B: 1, A: 2 };
      }

      const catA = catPriority[a.busCategory] ?? 3;
      const catB = catPriority[b.busCategory] ?? 3;
      if (catA !== catB) return catA - catB;

      const rankA = getRoleRank(a.role);
      const rankB = getRoleRank(b.role);
      if (rankA !== rankB) return rankA - rankB;

      return (Number(b.liveSoc ?? 0) - Number(a.liveSoc ?? 0));
    });

    const recommendedPool = candidates.slice(0, 3);

    // 7. Determine Mandatory Locked Candidate according to Matrix Status (exact match with scheduling.html)
    let lockedCand = null;
    if (matrixStatus === 'A/B') {
      const bBuses = recommendedPool.filter((c) => c.busCategory === 'B');
      if (bBuses.length > 0) {
        lockedCand = bBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0];
      } else {
        const aBuses = recommendedPool.filter((c) => c.busCategory === 'A');
        lockedCand = aBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0] || recommendedPool[0];
      }
    } else if (matrixStatus === 'A/B/C') {
      const cBuses = recommendedPool.filter((c) => c.busCategory === 'C');
      const bBuses = recommendedPool.filter((c) => c.busCategory === 'B');
      const aBuses = recommendedPool.filter((c) => c.busCategory === 'A');
      if (cBuses.length > 0) {
        lockedCand = cBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0];
      } else if (bBuses.length > 0) {
        lockedCand = bBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0];
      } else {
        lockedCand = aBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0] || recommendedPool[0];
      }
    } else {
      const aBuses = recommendedPool.filter((c) => c.busCategory === 'A');
      lockedCand = aBuses.length > 0 ? aBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0] : recommendedPool[0];
    }

    if (lockedCand) {
      lockedCand.isMandatory = true;
      lockedCand.isHighestSocLocked = true;
      lockedCand.role = `⭐ Mandatory Allocation (Cat ${lockedCand.busCategory} — Highest SoC: ${lockedCand.liveSoc}%)`;
      lockedCand.allocType = `⭐ Mandatory Allocation (Matrix ${matrixStatus} — Cat ${lockedCand.busCategory})`;
    }

    recommendedPool.forEach((cand) => {
      if (cand !== lockedCand) {
        cand.isMandatory = false;
        cand.isHighestSocLocked = false;
        cand.matrixStatusType = matrixStatus;
        cand.role = `Available Candidate (Cat ${cand.busCategory} — ${cand.liveSoc}% SoC)`;
        cand.allocType = `Available for Other Routes (Cat ${cand.busCategory})`;
      }
    });

    // Final candidates order: Mandatory locked bus is ALWAYS first (index 0)
    const finalCandidates = [];
    if (lockedCand) finalCandidates.push(lockedCand);
    recommendedPool.forEach((cand) => {
      if (cand !== lockedCand) finalCandidates.push(cand);
    });

    return finalCandidates;
  }, [pool, selectedRoute, scheduledTime, matrixStatus, matchedSched, evaluateBusFeasibility]);

  // Mandatory candidate bus is ALWAYS index 0
  const mandatoryCandidate = candidateBuses[0] || null;

  // Active candidate: if user clicked a bus, use it; otherwise automatically default to the Mandatory bus (matching scheduling.html)
  const activeCandidate = selectedCandidateBm
    ? (candidateBuses.find((c) => c.bmNumber === selectedCandidateBm) || mandatoryCandidate)
    : mandatoryCandidate;

  // Check if current selection is an Operator Override (choosing any bus other than mandatory allocation bus)
  const isManualOverride = Boolean(
    activeCandidate &&
    mandatoryCandidate &&
    activeCandidate.bmNumber !== mandatoryCandidate.bmNumber
  );

  // Allowed categories matrix matching scheduling.html
  const allowedMatrix = {
    standard: { NORMAL: ['B', 'A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
    simple: { NORMAL: ['B', 'C', 'A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
    moderate: { NORMAL: ['B', 'A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
    complex: { NORMAL: ['A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
  };
  const timeKey = timeCatInfo.key || (isPeak ? 'PEAK' : 'NORMAL');
  const allowedCategories = (allowedMatrix[complexity.toLowerCase()] || allowedMatrix.standard)[timeKey] || ['A'];
  const requiresCatA = complexity.toLowerCase() === 'complex' || isPeak;
  const isMatrixCompliant = activeCandidate
    ? (requiresCatA ? activeCandidate.busCategory === 'A' : allowedCategories.includes(activeCandidate.busCategory || 'B'))
    : false;
  const sortedCats = allowedCategories.slice().sort().join('/');
  const catDisplay = requiresCatA ? 'A' : sortedCats;

  // Change route
  const handleSelectRoute = (r) => {
    setSelectedRoute(r);
    setScheduledTime(r.timetables[0]);
    setSelectedCandidateBm(null);
    setRoutePickerOpen(false);
  };

  // Commit Allocation
  const handleCommitAllocation = () => {
    if (!activeCandidate) {
      Alert.alert(
        'No Buses Available',
        'No buses are available to fill the requirements for that particular route and time.'
      );
      return;
    }

    const trimmedDriver = (driverNameInput || '').trim();
    if (!trimmedDriver) {
      Alert.alert(
        'Driver Name Required',
        'Please enter or select an assigned driver name before allocating.'
      );
      return;
    }
// Numbers and names allowed in driver part

    const finalDriverName = trimmedDriver;

    Alert.alert(
      'Confirm Bus Allocation',
      `Are you sure you want to allocate Bus ${activeCandidate.bmNumber} (${activeCandidate.regNo}) to Route ${selectedRoute.code}?\n\n` +
        `• Departure Time: ${scheduledTime}\n` +
        `• Driver: ${finalDriverName}\n` +
        `• Battery SoC: ${activeCandidate.soc}%\n` +
        (isManualOverride
          ? `• Allocation: Operator Override (Mandatory was ${mandatoryCandidate?.bmNumber || 'BM---'})\n`
          : `• Allocation: ${activeCandidate.allocType || 'Mandatory Recommendation'}\n`) +
        `\nDo you want to confirm and commit this dispatch duty?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm & Allocate',
          style: 'default',
          onPress: () => {
            const duty = {
              id: `duty_${activeCandidate.bmNumber}_${selectedRoute.code}_${Date.now()}`,
              bm: activeCandidate.bmNumber,
              bmNumber: activeCandidate.bmNumber,
              regNo: activeCandidate.regNo,
              routeId: selectedRoute.id,
              routeCode: selectedRoute.code,
              busNumber: selectedRoute.code,
              routeName: `${selectedRoute.name} — ${selectedRoute.distance} km`,
              origin: selectedRoute.origin,
              destination: selectedRoute.destination,
              departureTime: scheduledTime,
              isManualOverride: isManualOverride,
              allocType: isManualOverride
                ? `Committed Duty (Operator Override from Bus ${mandatoryCandidate?.bmNumber || 'Mandatory'})`
                : (activeCandidate.isHighestSocLocked ? 'Committed Duty Allocation (Mandatory Recommendation)' : 'Committed Duty Allocation'),
              shift: selectedRoute.shift,
              soc: activeCandidate.soc,
              fullDutyKm: activeCandidate.fullDutyKm || 108,
              routeDist: selectedRoute.distance,
              tripCount: 8,
              busCategory: activeCandidate.busCategory || 'A',
              driver: finalDriverName,
              depot: depotNum,
              allocatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', 21 Oct 2026',
              status: 'Allocated',
            };

            allocateBusToRoute(duty);

            Alert.alert(
              isManualOverride ? '⚠️ Committed Duty Allocation (Manual Over-ride)' : '⚡ Committed Duty Allocation',
              `Bus ${activeCandidate.bmNumber} (${activeCandidate.regNo}) assigned to Route ${selectedRoute.code} departing at ${scheduledTime} with Driver ${finalDriverName}${isManualOverride ? ` [MANUAL OVER-RIDE: Mandatory was ${mandatoryCandidate?.bmNumber}]` : ''}!\n\nThis allocation is now live in Admin Workspace and Depot Operations.`,
              [{ text: 'OK', style: 'default' }]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── TOPBAR ── */}
      <View style={styles.topbar}>
        <View style={styles.topbarCenter}>
          <Text style={styles.eyebrow}>{t('smart_allocation_subtitle', 'AI ENERGY & FLEET SCHEDULING')}</Text>
          <Text style={styles.topbarTitle}>{t('smart_allocation_title', 'Bus Scheduling & Dispatch')}</Text>
          <Text style={styles.topbarSub}>Depot {depotNum} • {depotLabel}</Text>
        </View>
        <View style={styles.topbarActions}>
          <LanguagePickerPill onPress={() => setLangModalOpen(true)} style={{ marginRight: 8 }} />
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => {
              Alert.alert(t('btn_sign_out', 'Sign Out'), t('sign_out_confirm_sched', 'Are you sure you want to log out of Scheduling?'), [
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

      <ScrollView contentContainerStyle={styles.contentWrap} showsVerticalScrollIndicator={false}>
        {/* ── PANEL 1: SCHEDULE REQUIREMENT ── */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('panel_schedule_req_title', 'Schedule requirement')}</Text>
          <Text style={styles.panelNote}>
            {t('panel_schedule_req_note', 'Define the next departure and let the allocation rules evaluate fleet readiness.')}
          </Text>

          {/* 1. Bus Route Selector */}
          <Text style={styles.fieldLabel}>{t('label_select_bus_route', 'Select Bus Route')}</Text>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setRoutePickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectBoxText}>
              🚌 {selectedRoute.code} — {selectedRoute.name} ({selectedRoute.distance} km)
            </Text>
            <Text style={styles.caret}>▼</Text>
          </TouchableOpacity>

          {/* 2. {t('label_departure_time', 'Scheduled Departure Time')} */}
          <Text style={styles.fieldLabel}>
            {t('label_scheduled_departure_time', 'Scheduled Departure Time (from dataset)')} <Text style={{ color: '#dc2626' }}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setTimePickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectBoxText}>
              🕒 {scheduledTime || (selectedRoute.timetables && selectedRoute.timetables[0]) || 'Choose a departure time'}
            </Text>
            <Text style={styles.caret}>▼</Text>
          </TouchableOpacity>

          {/* 4. Schedule distance */}
          <Text style={styles.fieldLabel}>{t('schedule_distance', 'Schedule distance (km)')}</Text>
          <View style={styles.readonlyInput}>
            <Text style={styles.readonlyInputText}>{selectedRoute.distance} km ({t('fixed_gtfs_data', 'Fixed GTFS data')})</Text>
          </View>

          {/* 5. Assigned Driver Input & Dropdown */}
          <View style={styles.driverLabelRow}>
            <Text style={styles.fieldLabel}>
              {t('assigned_driver', 'Assigned Driver')} <Text style={{ color: '#dc2626' }}>*</Text>
            </Text>
            <View style={styles.driverDepotBadge}>
              <Text style={styles.driverDepotBadgeText}>
                Depot {depotNum} Drivers ({availableDrivers.length} Available)
              </Text>
            </View>
          </View>
          <View style={[styles.driverInputWrapper, driverError ? styles.driverInputWrapperError : null]}>
            <Text style={styles.driverInputIcon}>👤</Text>
            <TextInput
              style={styles.driverInputField}
              value={driverNameInput}
              onChangeText={handleDriverTextChange}
              placeholder={t('placeholder_driver', 'Type driver name or pick from roster...')}
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.driverRosterBtn}
              onPress={() => setDriverPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.driverRosterBtnText}>{t('roster_btn', 'Roster')} ▼</Text>
            </TouchableOpacity>
          </View>
          {driverError ? (
            <Text style={styles.driverErrorText}>{driverError}</Text>
          ) : null}

          {/* ── CANDIDATE BUSES SECTION (2 to 3 Buses Ready) ── */}
          <View style={styles.candidateSection}>
            <View style={styles.candidateHeader}>
              <View style={styles.candidateTitleWrap}>
                <Text style={styles.candidateTitleIcon}>🚌</Text>
                <View>
                  <Text style={styles.candidateTitle}>{t('candidate_buses_ready', 'Candidate Buses For This Route & Time')}</Text>
                  <Text style={styles.candidateSub}>
                    Select one of the {candidateBuses.length} eligible candidate buses for this departure
                  </Text>
                </View>
              </View>
              <View style={styles.candidateCountBadge}>
                <Text style={styles.candidateCountBadgeText}>
                  {candidateBuses.length} Candidates Ready
                </Text>
              </View>
            </View>

            {/* Candidate Cards Grid */}
            <View style={styles.candidateGrid}>
              {candidateBuses.length === 0 ? (
                <View style={{ width: '100%', padding: 18, backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fecdd3', borderRadius: 12, alignItems: 'center', marginVertical: 8 }}>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>⚠️</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#991b1b', textAlign: 'center', marginBottom: 4 }}>
                    No buses are available to fill the requirements for that particular route and time.
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#7f1d1d', textAlign: 'center', lineHeight: 16 }}>
                    All depot vehicles either do not match Matrix Status {matrixStatus} or are currently undergoing charging, cleaning, or have insufficient SoC.
                  </Text>
                </View>
              ) : (
                candidateBuses.map((bus) => {
                const isLocked = bus.isHighestSocLocked;
                const isSelected = activeCandidate && activeCandidate.bmNumber === bus.bmNumber;
                const isOverrideBus = isSelected && !isLocked;
                return (
                  <TouchableOpacity
                    key={bus.bmNumber}
                    style={[
                      styles.candCard,
                      isLocked && styles.candCardLocked,
                      isSelected && styles.candCardSelected,
                      isOverrideBus && styles.candCardOverride,
                    ]}
                    onPress={() => {
                      setSelectedCandidateBm(selectedCandidateBm === bus.bmNumber ? null : bus.bmNumber);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.candCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.candBusId}>🚌 {bus.bmNumber}</Text>
                        <Text style={styles.candRegText}>({bus.regNo})</Text>
                      </View>
                      <View style={[styles.catPill, bus.busCategory === 'A' ? styles.catPillA : styles.catPillB]}>
                        <Text style={styles.catPillText}>{t('col_category', 'Category')} {bus.busCategory || 'B'}</Text>
                      </View>
                    </View>

                    {/* Allocation Status Banner matching scheduling.html */}
                    <View style={styles.candLockBannerRow}>
                      {isLocked ? (
                        <View style={styles.mandatoryBanner}>
                          <Text style={styles.mandatoryBannerText}>{`⭐ ${t('mandatory_allocation', 'MANDATORY ALLOCATION')}`}</Text>
                        </View>
                      ) : (
                        isOverrideBus ? (
                          <View style={styles.overrideBanner}>
                            <Text style={styles.overrideBannerText}>{`⚠️ ${t('operator_override', 'OPERATOR OVERRIDE')}`}</Text>
                          </View>
                        ) : (
                          <View style={styles.availBanner}>
                            <Text style={styles.availBannerText}>{`⚡ ${t('eligible_candidate', 'Eligible Candidate')}`}</Text>
                          </View>
                        )
                      )}
                      <Text style={[styles.candSubStatus, { color: isLocked ? '#0369a1' : (isOverrideBus ? '#b45309' : '#0284c7') }]}>
                        {isLocked ? '● Matrix Recommendation' : (isOverrideBus ? '● Selected as Override' : 'Available in Depot')}
                      </Text>
                    </View>

                    {/* SoC Row */}
                    <View style={[styles.candSocRow, isLocked && { backgroundColor: '#fffdf7', borderColor: '#fde68a' }]}>
                      <Text style={styles.candSocLbl}>{t('current_soc', 'Current SoC')}</Text>
                      <Text style={[styles.candSocVal, { color: isLocked ? '#b45309' : '#0f766e' }]}>
                        ⚡ {bus.soc}%
                      </Text>
                    </View>

                    <View style={{ marginVertical: 4 }}>
                      <BatteryBar soc={bus.soc} showText={false} />
                    </View>

                    <View style={styles.candRangeRow}>
                      <Text style={styles.candRangeText}>
                        Usable Range: ~{bus.fullDutyKm} km (Single Charge Ready)
                      </Text>
                    </View>

                    {/* Selection Pill */}
                    <View
                      style={[
                        styles.candFooterBtn,
                        isSelected && styles.candFooterBtnActive,
                        isOverrideBus && styles.candFooterBtnOverride,
                      ]}
                    >
                      <Text style={[styles.candFooterBtnText, isSelected && styles.candFooterBtnTextActive]}>
                        {isOverrideBus
                          ? '✓ Selected (Override)'
                          : isSelected
                          ? (isLocked ? '✓ Selected (Mandatory)' : '✓ Selected')
                          : (isLocked ? 'Select Mandatory ➔' : 'Select Candidate ➔')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }))}
            </View>
          </View>

          {/* ── ASSIGNED DUTY BANNER ── */}
          {activeCandidate && (
            <View style={[styles.dutyBanner, isManualOverride && styles.dutyBannerOverride]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dutyBannerText}>
                  <Text style={{ fontWeight: '800', color: isManualOverride ? '#b45309' : '#0369a1' }}>
                    {isManualOverride ? '⚠️ Manual Over-ride Duty:' : '🎯 Assigned Duty:'}
                  </Text>{' '}
                  BM Number: <Text style={{ fontWeight: '800' }}>{activeCandidate.bmNumber}</Text> on Route{' '}
                  <Text style={{ fontWeight: '800' }}>{selectedRoute.code}</Text> ({selectedRoute.name})
                  {isManualOverride && (
                    <Text style={{ color: '#b45309', fontWeight: '700' }}>
                      {' '}(Mandatory was Bus {mandatoryCandidate?.bmNumber})
                    </Text>
                  )}
                </Text>
              </View>
              <View style={styles.dutyBannerBadges}>
                <View style={styles.tripBadge}>
                  <Text style={styles.tripBadgeText}>8 {t('trips_badge', 'Trips')}</Text>
                </View>
                <View style={styles.chargeInfoBadge}>
                  <Text style={styles.chargeInfoBadgeText}>⚡ {t('est_charge_badge', 'Est. Charge')}: ~{selectedRoute.drainSoc}% SoC</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── ALLOCATE BUS BUTTON ── */}
          <TouchableOpacity
            style={[styles.btnAllocate, isManualOverride && styles.btnAllocateOverride]}
            onPress={handleCommitAllocation}
            activeOpacity={0.85}
          >
            <Text style={styles.btnAllocateText}>
              {isManualOverride ? '⚠️ Allocate Bus (Manual Over-ride)' : '⚡ Allocate Bus'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── PANEL 2: ALLOCATION RESULT & RULES ── */}
        {activeCandidate ? (
          <View style={[styles.panel, isManualOverride && styles.panelOverride]}>
            <View style={styles.panelHeaderWithAction}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.panelTitle}>{t('allocation_result_of', 'Allocation result of')} {activeCandidate.bmNumber}</Text>
                  {isManualOverride ? (
                    <View style={styles.manualOverridePill}>
                      <Text style={styles.manualOverridePillText}>{`⚠️ ${t('operator_override', 'Operator Override')}`}</Text>
                    </View>
                  ) : (
                    <View style={styles.mandatoryPill}>
                      <Text style={styles.mandatoryPillText}>{`⭐ ${t('mandatory_allocation', 'Mandatory Allocation')}`}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.panelNote}>
                  {isManualOverride
                    ? `⚠️ Operator Override: You have manually selected Bus ${activeCandidate.bmNumber} instead of the system mandatory bus (${mandatoryCandidate?.bmNumber}).`
                    : 'Live telemetry and manual inspection checks confirm this bus can complete the duty.'}
                </Text>
              </View>

              <View style={[styles.allocCalloutBox, isManualOverride && styles.allocCalloutBoxOverride]}>
                <Text style={styles.allocCalloutIcon}>{isManualOverride ? '⚠️' : '⭐'}</Text>
                <Text style={[styles.allocCalloutText, isManualOverride && styles.allocCalloutTextOverride]}>
                  {isManualOverride
                    ? `Operator Override Active: Bus ${activeCandidate.bmNumber} (Category ${activeCandidate.busCategory || 'A'}, ${activeCandidate.soc}% SoC) was chosen by the operator instead of mandatory recommendation Bus ${mandatoryCandidate?.bmNumber} (${mandatoryCandidate?.soc}% SoC under Matrix Status ${matrixStatus}). This bus can be allocated with driver.`
                    : `Mandatory Allocation: Bus ${activeCandidate.bmNumber} is recommended under Matrix Status ${matrixStatus} rules (Category ${activeCandidate.busCategory || 'A'}, ${activeCandidate.soc}% SoC). You may choose any alternate candidate bus above to allocate as an operator override.`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.btnDownloadSchedule}
                onPress={async () => {
                  try {
                    const headers = [
                      'Depot',
                      'Route Code',
                      'Route Name',
                      'Origin',
                      'Destination',
                      'Distance',
                      'Scheduled Time',
                      'Shift',
                      'Driver Name',
                      'Driver ID',
                      'Bus BM Number',
                      'Registration Number',
                      'Bus Model',
                      'Category',
                      'Initial SoC (%)',
                      'Energy Needed (kWh)',
                      'Projected Arrival SoC (%)',
                      'Buffer SoC (%)',
                      'Allocation Status',
                      'Allocation Type',
                    ];
                    const rows = [
                      [
                        depotLabel,
                        selectedRoute.code || '',
                        selectedRoute.name || '',
                        selectedRoute.origin || '',
                        selectedRoute.destination || '',
                        selectedRoute.distance || '',
                        scheduledTime || '',
                        selectedRoute.shift || 'General Shift',
                        selectedDriver.name || '',
                        selectedDriver.id || '',
                        activeCandidate.bmNumber || '',
                        activeCandidate.regNo || '',
                        activeCandidate.model || 'ELECTRIC BUS AC EiV12',
                        activeCandidate.category || 'A',
                        activeCandidate.soc !== undefined ? `${activeCandidate.soc}%` : '',
                        activeCandidate.energyNeeded !== undefined ? `${activeCandidate.energyNeeded} kWh` : '',
                        activeCandidate.projectedArrivalSoc !== undefined ? `${activeCandidate.projectedArrivalSoc}%` : '',
                        activeCandidate.bufferSoc !== undefined ? `${activeCandidate.bufferSoc}%` : '',
                        'Recommended & Ready for Route Departure',
                        isManualOverride ? 'Manual Over-ride' : 'Mandatory Recommendation',
                      ],
                    ];
                    const dateStr = new Date().toISOString().slice(0, 10);
                    const cleanBm = String(activeCandidate.bmNumber || 'BUS').replace(/\s+/g, '_');
                    const cleanRoute = String(selectedRoute.code || 'ROUTE').replace(/\s+/g, '_');
                    await exportCsvFile(`schedule_allocation_${cleanRoute}_${cleanBm}_${dateStr}.csv`, [headers, ...rows]);
                  } catch (e) {
                    Alert.alert('Download Error', e.message || 'Could not export schedule report.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.btnDownloadScheduleText}>{`📥 ${t('download_csv', 'Download CSV')}`}</Text>
              </TouchableOpacity>
            </View>

            {/* KPIs Grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiVal}>{candidateBuses.length}</Text>
                <Text style={styles.kpiLbl}>{t('candidate_buses_available', 'Candidate buses available')}</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={[styles.kpiVal, { color: '#0f766e' }]}>{activeCandidate.soc}%</Text>
                <Text style={styles.kpiLbl}>{t('selected_bus_soc', 'Selected bus SOC')}</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={[styles.kpiVal, { color: '#0284c7' }]}>{activeCandidate.fullDutyKm} km</Text>
                <Text style={styles.kpiLbl}>{t('full_duty_distance', 'Full Duty Distance')} ({t('single_charge_ready', 'Single Charge Ready')})</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiVal}>{selectedRoute.distance} km</Text>
                <Text style={styles.kpiLbl}>{t('route_distance', 'Route Distance')}</Text>
              </View>
            </View>

            {/* Transparent Rules Breakdown */}
            <View style={styles.rulesList}>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('full_duty_distance', 'Full Duty Distance')}</Text>
                <Text style={styles.ruleVal}>{activeCandidate.fullDutyKm} km</Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('operation_mode', 'Operation Mode')}</Text>
                <Text style={[styles.ruleVal, { color: '#15803d', fontWeight: '800' }]}>{t('single_charge_operation', 'Single Charge Operation')}</Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('total_distance', 'Total distance')}</Text>
                <Text style={styles.ruleVal}>{selectedRoute.distance} km</Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('route_category', 'Route category')}</Text>
                <Text style={styles.ruleVal}>{complexity.toUpperCase()}</Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('bus_category', 'Bus category')}</Text>
                <Text style={styles.ruleVal}>Category {activeCandidate.busCategory || 'A'}</Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('matrix_status', 'Matrix status')}</Text>
                <Text style={[styles.ruleVal, { color: isMatrixCompliant ? '#16a34a' : '#dc2626', fontWeight: '800' }]}>
                  {isMatrixCompliant
                    ? `✅ Allowed (Cat ${catDisplay})`
                    : `⚠️ Required Cat ${catDisplay} (Current: Cat ${activeCandidate.busCategory || 'B'})`}
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('allocation_type', 'Allocation Type')}</Text>
                <Text style={[styles.ruleVal, isManualOverride ? { color: '#d97706', fontWeight: '900' } : { color: '#0369a1', fontWeight: '800' }]}>
                  {isManualOverride
                    ? `⚠️ Operator Override (Selected ${activeCandidate.bmNumber} instead of mandatory ${mandatoryCandidate?.bmNumber})`
                    : (activeCandidate.allocType || `⭐ Mandatory Allocation (Matrix ${matrixStatus} — Cat ${activeCandidate.busCategory || 'A'})`)}
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('departure_mode', 'Departure Mode')}</Text>
                <Text style={styles.ruleVal}>{t('timetable_scheduled', 'Timetable Scheduled')}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.panel, styles.panelCollapsedNotice]}>
            <Text style={styles.collapsedNoticeIcon}>👆</Text>
            <Text style={styles.collapsedNoticeTitle}>{t('bus_details_collapsed', 'Bus Details Collapsed')}</Text>
            <Text style={styles.collapsedNoticeSub}>
              Click on any candidate bus card above to inspect its live battery SoC, full single-charge range, and transparent matrix status rules.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── MODAL: ROUTE SELECTOR ── */}
      <Modal visible={routePickerOpen} transparent animationType="fade" onRequestClose={() => setRoutePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>{`🚌 ${t('select_transit_route_modal', 'Select Transit Bus Route')}`}</Text>
              <TouchableOpacity onPress={() => setRoutePickerOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {availableRoutes.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickerItem, r.id === selectedRoute.id && styles.pickerItemActive]}
                  onPress={() => handleSelectRoute(r)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemTitle}>{r.code} — {r.name}</Text>
                    <Text style={styles.pickerItemSub}>
                      GTFS Distance: {r.distance} km • Category {r.requiredCat} ({r.category})
                    </Text>
                  </View>
                  {r.id === selectedRoute.id && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: TIME SELECTOR ── */}
      <Modal visible={timePickerOpen} transparent animationType="fade" onRequestClose={() => setTimePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>{`🕒 ${t('scheduled_times_modal', 'Scheduled Departure Times')}`}</Text>
              <TouchableOpacity onPress={() => setTimePickerOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {selectedRoute.timetables.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pickerItem, t === scheduledTime && styles.pickerItemActive]}
                  onPress={() => {
                    setScheduledTime(t);
                    setTimePickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerItemTitle}>🕒 {t}</Text>
                  {t === scheduledTime && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: DRIVER SELECTOR ── */}
      <Modal visible={driverPickerOpen} transparent animationType="fade" onRequestClose={() => setDriverPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>{`👤 ${t('select_driver_modal', 'Select Assigned Driver')} (${t('depot', 'Depot')} ${depotNum})`}</Text>
              <TouchableOpacity onPress={() => setDriverPickerOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {availableDrivers.map((drv) => {
                const isSelected = selectedDriver.id === drv.id || driverNameInput.trim().toLowerCase() === drv.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={drv.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedDriver(drv);
                      setDriverNameInput(drv.name);
                      setDriverError('');
                      setDriverPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerItemTitle}>👤 {drv.name}</Text>
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
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderRadius: 20,
    backgroundColor: '#ffffff',
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
  topbarCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4361ee',
    letterSpacing: 0.8,
  },
  topbarTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  topbarSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  depotBadge: {
    backgroundColor: '#edf2fe',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  depotBadgeText: {
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
  contentWrap: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Panels */
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  panelNote: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  selectBoxText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  caret: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  departureHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  manualOverrideBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  manualOverrideBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#92400e',
  },
  timeStepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeInputBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#4361ee',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  stepBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  timeDisplayBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  overrideHintBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overrideHintText: {
    fontSize: 12.5,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
  },
  resetTimeBtn: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetTimeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#b45309',
  },
  readonlyInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  readonlyInputText: {
    fontSize: 14.5,
    color: '#475569',
    fontWeight: '600',
  },
  driverLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  driverDepotBadge: {
    backgroundColor: '#edf2fe',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  driverDepotBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4361ee',
  },
  driverInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 6,
  },
  driverInputWrapperError: {
    borderColor: '#dc2626',
    backgroundColor: '#fff5f5',
  },
  driverInputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  driverInputField: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 8,
  },
  driverRosterBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  driverRosterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  driverErrorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 4,
  },
  fixedTimetableBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fixedTimetableBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  timetableChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
    paddingVertical: 2,
  },
  timeChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timeChipActive: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  timeChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  peakIndicatorBadge: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  peakIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
  },

  /* Candidate Buses Section */
  candidateSection: {
    marginTop: 16,
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  candidateTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  candidateTitleIcon: {
    fontSize: 22,
  },
  candidateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  candidateSub: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  candidateCountBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  candidateCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6d28d9',
  },
  candidateGrid: {
    gap: 12,
  },
  candCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  candCardLocked: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffdfa',
  },
  candCardSelected: {
    borderColor: '#4361ee',
    borderWidth: 2,
  },
  candCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  candBusId: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  candRegText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catPillA: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1,
  },
  catPillB: {
    backgroundColor: '#faf5ff',
    borderColor: '#d8b4fe',
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  candLockBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  lockedBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockedBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  availBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  availBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  candSubStatus: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
  candSocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  candSocLbl: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  candSocVal: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  candRangeRow: {
    marginTop: 4,
    marginBottom: 6,
  },
  candRangeText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  candFooterBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 6,
  },
  candFooterBtnActive: {
    backgroundColor: '#4361ee',
  },
  candFooterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  candFooterBtnTextActive: {
    color: '#ffffff',
  },

  /* Duty Banner */
  dutyBanner: {
    backgroundColor: '#edf2fe',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  dutyBannerText: {
    fontSize: 13.5,
    color: '#0f172a',
    lineHeight: 20,
  },
  dutyBannerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  tripBadge: {
    backgroundColor: '#4361ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tripBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  chargeInfoBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chargeInfoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
  },

  /* Big Allocate Button */
  btnAllocate: {
    backgroundColor: '#4361ee',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#4361ee',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  btnAllocateOverride: {
    backgroundColor: '#d97706',
    shadowColor: '#d97706',
  },
  btnAllocateText: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#ffffff',
  },

  /* Header with Action (Download) */
  panelHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  mandatoryBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mandatoryBannerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
    letterSpacing: 0.3,
  },
  overrideBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overrideBannerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.3,
  },
  allocCalloutBox: {
    marginTop: 10,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  allocCalloutBoxOverride: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  allocCalloutIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  allocCalloutText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#0369a1',
    fontWeight: '500',
  },
  allocCalloutTextOverride: {
    color: '#92400e',
  },
  panelOverride: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffdfa',
  },
  dutyBannerOverride: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  candCardOverride: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffdf5',
  },
  candFooterBtnOverride: {
    backgroundColor: '#f59e0b',
  },
  manualOverridePill: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  manualOverridePillText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#92400e',
  },
  mandatoryPill: {
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mandatoryPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0369a1',
  },
  btnDownloadSchedule: {
    backgroundColor: '#4361ee',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    shadowColor: '#4361ee',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  btnDownloadScheduleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Collapsed Placeholder Notice */
  panelCollapsedNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  collapsedNoticeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  collapsedNoticeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  collapsedNoticeSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* KPIs */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  kpiLbl: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    lineHeight: 16,
  },

  /* Rules Breakdown */
  rulesList: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    gap: 2,
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  ruleLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    minWidth: 125,
    flexShrink: 0,
  },
  ruleVal: {
    fontSize: 13,
    fontWeight: '750',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
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
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
    padding: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemActive: {
    backgroundColor: '#edf2fe',
    borderRadius: 12,
  },
  pickerItemTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerItemSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  pickerCheck: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4361ee',
  },
});
