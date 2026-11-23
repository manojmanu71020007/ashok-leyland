import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import {
  useFleet,
  getTimeCategory,
  getRouteComplexity,
  getMatrixStatus,
  isBusNewlyAdded,
  getBusActualRangeKm,
  getTimeCategoryDrainMultiplier,
  getBusDrainRatePerKm,
  getRequiredSingleChargeSoc,
  getEstimatedTripDrainSoc,
  getBusDepot,
} from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageModal, { LanguagePickerPill } from '../components/LanguageModal';
import BatteryBar from '../components/BatteryBar';
import { exportCsvFile } from '../utils/exportCsv';
import { getSequentialTasksForDuty } from '../utils/detailedScheduleTrips';
import { api } from '../api/client';
import {
  getAllDepots,
  registerNewDepot,
  deleteDepot,
  getDepotCredentialsList,
  getDepotDisplayName,
  subscribeDepotChanges,
  addRouteToDepot,
  removeRouteFromDepot,
  getRoutesForDepot,
  getRouteDefinition,
} from '../context/accounts';
import {
  getMasterDataset,
  addRouteToDataset,
  updateRouteComplexityInDataset,
  updateTimeComplexityInDataset,
  updateRouteTimetablesInDataset,
  addDepartureTimeToRoute,
  syncDatasetWithServer,
  subscribeDatasetChanges,
} from '../context/routeDataset';

let NativeWebView = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (e) {
    NativeWebView = null;
  }
}

// ── Multi-Language Dictionary ──
const I18N = {
  en: {
    depotOps: 'DEPOT OPERATIONS',
    adminWorkspace: 'Admin Workspace',
    adminSubtitle: 'Allocate the right available bus to the right schedule using battery state, expected range, route distance, cleaning, charging, maintenance, and driver readiness.',
    scheduleReq: 'Schedule requirement',
    scheduleReqNote: 'Define the next departure and let the allocation rules evaluate fleet readiness.',
    searchRoute: 'Search Route (Origin ➔ Destination)',
    selectRoute: 'Select Bus Route',
    scheduledTime: 'Scheduled Departure Time (from dataset)',
    departureTime: 'Departure time',
    manualOverride: 'Manual Over-ride',
    manualOverrideHint: '⚠️ Manual Over-ride: Time modified from scheduled timetable',
    resetTimetable: 'Reset to Timetable',
    scheduleDistance: 'Schedule distance (km)',
    autoAllocCard: '💡 Recommended Candidate Bus',
    shift: 'Shift',
    readyForDispatch: '● Ready for Dispatch',
    timeSlot: 'Time Slot',
    liveBatterySoc: 'Live Battery SOC',
    fullDutyDistance: 'Full Duty Distance',
    routeDistance: 'Route Distance',
    driverStatus: 'Driver Status',
    assigned: 'Assigned',
    operationMode: 'Single Charge Operation',
    allocationResult: 'Allocation result',
    transparentNote: 'Live telemetry and inspection checks confirm this bus can complete the duty.',
    allocatedBuses: 'Allocated Buses',
    allocatedBusesSub: 'Ready for Departure',
    notAllocatedBuses: 'Not-Allocated Buses',
    notAllocatedBusesSub: 'Ineligible or In Reserve',
    availableBuses: 'Available Buses for Scheduling',
    availableBusesSub: 'Available for Scheduling Only',
    totalBuses: 'Total Buses',
    totalBusesSub: 'Depot Fleet',
    lockedBuses: 'Locked Buses',
    addDeleteBuses: 'Add / Delete Buses',
    signOut: 'Sign Out ⎋',
    language: 'Language',
  },
  kn: {
    depotOps: 'ಡಿಪೋ ಕಾರ್ಯಾಚರಣೆಗಳು',
    adminWorkspace: 'ಅಡ್ಮಿನ್ ಕಾರ್ಯಕ್ಷೇತ್ರ',
    adminSubtitle: 'ಬ್ಯಾಟರಿ ಸ್ಥಿತಿ, ನಿರೀಕ್ಷಿತ ವ್ಯಾಪ್ತಿ ಮತ್ತು ಮಾರ್ಗದ ದೂರವನ್ನು ಆಧರಿಸಿ ಸರಿಯಾದ ಬಸ್ ನಿಯೋಜಿಸಿ.',
    scheduleReq: 'ವೇಳಾಪಟ್ಟಿ ಅವಶ್ಯಕತೆ',
    scheduleReqNote: 'ಮುಂದಿನ ನಿರ್ಗಮನವನ್ನು ವಿವರಿಸಿ ಮತ್ತು ಫ್ಲೀಟ್ ಸಿದ್ಧತೆಯನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ.',
    searchRoute: 'ಮಾರ್ಗ ಹುಡುಕಿ',
    selectRoute: 'ಬಸ್ ಮಾರ್ಗ ಆಯ್ಕೆಮಾಡಿ',
    scheduledTime: 'ನಿಗದಿತ ನಿರ್ಗಮನ ಸಮಯ',
    departureTime: 'ನಿರ್ಗಮನ ಸಮಯ',
    manualOverride: 'ಹಸ್ತಚಾಲಿತ ಬದಲಾವಣೆ',
    manualOverrideHint: '⚠️ ಹಸ್ತಚಾಲಿತ ಬದಲಾವಣೆ: ವೇಳಾಪಟ್ಟಿಯಿಂದ ಸಮಯ ಬದಲಾಗಿದೆ',
    resetTimetable: 'ವೇಳಾಪಟ್ಟಿಗೆ ಮರುಹೊಂದಿಸಿ',
    scheduleDistance: 'ವೇಳಾಪಟ್ಟಿ ದೂರ (ಕಿಮೀ)',
    autoAllocCard: '💡 ಶಿಫಾರಸು ಮಾಡಿದ ಅಭ್ಯರ್ಥಿ ಬಸ್',
    shift: 'ಶಿಫ್ಟ್',
    readyForDispatch: '● ರವಾನೆಗೆ ಸಿದ್ಧವಾಗಿದೆ',
    timeSlot: 'ಸಮಯದ ಸ್ಲಾಟ್',
    liveBatterySoc: 'ಲೈವ್ ಬ್ಯಾಟರಿ SOC',
    fullDutyDistance: 'ಪೂರ್ಣ ಡ್ಯೂಟಿ ದೂರ',
    routeDistance: 'ಮಾರ್ಗ ದೂರ',
    driverStatus: 'ಚಾಲಕ ಸ್ಥಿತಿ',
    assigned: 'ನಿಯೋಜಿಸಲಾಗಿದೆ',
    operationMode: 'ಸಿಂಗಲ್ ಚಾರ್ಜ್ ಕಾರ್ಯಾಚರಣೆ',
    allocationResult: 'ಹಂಚಿಕೆ ಫಲಿತಾಂಶ',
    transparentNote: 'ಲೈವ್ ಟೆಲಿಮೆಟ್ರಿ ಬಸ್ ಕರ್ತವ್ಯವನ್ನು ಪೂರ್ಣಗೊಳಿಸಬಹುದೆಂದು ಖಚಿತಪಡಿಸುತ್ತದೆ.',
    allocatedBuses: 'ಹಂಚಿಕೆಯಾದ ಬಸ್‌ಗಳು',
    allocatedBusesSub: 'ರವಾನೆಗೆ ಸಿದ್ಧ',
    notAllocatedBuses: 'ಹಂಚಿಕೆಯಾಗದ ಬಸ್‌ಗಳು',
    notAllocatedBusesSub: 'ಅನರ್ಹ ಅಥವಾ ಮೀಸಲು',
    availableBuses: 'ಹೊರಡುವಿಕೆಗೆ ಲಭ್ಯವಿರುವ ಬಸ್‌ಗಳು',
    availableBusesSub: 'ಶೆಡ್ಯೂಲಿಂಗ್‌ಗೆ ಮಾತ್ರ ಲಭ್ಯ',
    totalBuses: 'ಒಟ್ಟು ಬಸ್‌ಗಳು',
    totalBusesSub: 'ಡಿಪೋ ಫ್ಲೀಟ್',
    lockedBuses: 'ಲಾಕ್ ಆದ ಬಸ್‌ಗಳು',
    addDeleteBuses: 'ಬಸ್ ಸೇರಿಸಿ / ಅಳಿಸಿ',
    signOut: 'ಸೈನ್ ಔಟ್ ⎋',
    language: 'ಭಾಷೆ',
  },
  hi: {
    depotOps: 'डिपो संचालन',
    adminWorkspace: 'एडमिन कार्यक्षेत्र',
    adminSubtitle: 'बैटरी स्थिति, अपेक्षित रेंज और दूरी के आधार पर सही बस आवंटित करें।',
    scheduleReq: 'शेड्यूल आवश्यकता',
    scheduleReqNote: 'अगले प्रस्थान को परिभाषित करें और फ्लीट तत्परता का मूल्यांकन करें।',
    searchRoute: 'रूट खोजें',
    selectRoute: 'बस रूट चुनें',
    scheduledTime: 'अनुसूचित प्रस्थान समय',
    departureTime: 'प्रस्थान समय',
    manualOverride: 'मैन्युअल ओवर-राइड',
    manualOverrideHint: '⚠️ मैन्युअल ओवर-राइड: निर्धारित समय में बदलाव किया गया',
    resetTimetable: 'समय सारणी पर रीसेट करें',
    scheduleDistance: 'शेड्यूल दूरी (किमी)',
    autoAllocCard: '💡 अनुशंसित उम्मीदवार बस',
    shift: 'शिफ्ट',
    readyForDispatch: '● रवानगी के लिए तैयार',
    timeSlot: 'समय स्लॉट',
    liveBatterySoc: 'लाइव बैटरी SOC',
    fullDutyDistance: 'फुल ड्यूटी दूरी',
    routeDistance: 'रूट दूरी',
    driverStatus: 'चालक स्थिति',
    assigned: 'आवंटित',
    operationMode: 'सिंगल चार्ज ऑपरेशन',
    allocationResult: 'आवंटन परिणाम',
    transparentNote: 'लाइव टेलीमेट्री पुष्टि करती है कि यह बस ड्यूटी पूरी कर सकती है।',
    allocatedBuses: 'आवंटित बसें',
    allocatedBusesSub: 'प्रस्थान के लिए तैयार',
    notAllocatedBuses: 'अनावंटित बसें',
    notAllocatedBusesSub: 'अयोग्य या रिजर्व में',
    availableBuses: 'प्रस्थान के लिए उपलब्ध बसें',
    availableBusesSub: 'केवल शेड्यूलिंग हेतु उपलब्ध',
    totalBuses: 'कुल बसें',
    totalBusesSub: 'डिपो फ्लीट',
    lockedBuses: 'लॉक्ड बसें',
    addDeleteBuses: 'बस जोड़ें / हटाएं',
    signOut: 'साइन आउट ⎋',
    language: 'भाषा',
  },
  te: {
    depotOps: 'డిపో కార్యకలాపాలు',
    adminWorkspace: 'అడ్మిన్ వర్క్‌స్పేస్',
    adminSubtitle: 'బ్యాటరీ స్థితి, మార్గ దూరం ఆధారంగా సరైన బస్సును కేటాయించండి.',
    scheduleReq: 'షెడ్యూల్ అవసరం',
    scheduleReqNote: 'తదుపరి బయలుదేరడాన్ని నిర్ణయించండి.',
    searchRoute: 'రూట్ వెతకండి',
    selectRoute: 'బస్సు రూట్ ఎంచుకోండి',
    scheduledTime: 'షెడ్యూల్డ్ బయలుదేరే సమయం',
    departureTime: 'బయలుదేరే సమయం',
    manualOverride: 'మాన్యువల్ మార్పు',
    manualOverrideHint: '⚠️ మాన్యువల్ మార్పు: సమయం మార్చబడింది',
    resetTimetable: 'టైమ్‌టేబుల్‌కు రీసెట్ చేయండి',
    scheduleDistance: 'షెడ్యూల్ దూరం (కి.మీ)',
    autoAllocCard: '💡 సిఫార్సు చేయబడిన బస్సు',
    shift: 'షిఫ్ట్',
    readyForDispatch: '● బయలుదేరడానికి సిద్ధంగా ఉంది',
    timeSlot: 'సమయ స్లాట్',
    liveBatterySoc: 'లైవ్ బ్యాటరీ SOC',
    fullDutyDistance: 'పూర్తి డ్యూటీ దూరం',
    routeDistance: 'రూట్ దూరం',
    driverStatus: 'డ్రైవర్ స్థితి',
    assigned: 'కేటాయించబడింది',
    operationMode: 'సింగిల్ ఛార్జ్ ఆపరేషన్',
    allocationResult: 'కేటాయింపు ఫలితం',
    transparentNote: 'లైవ్ టెలిమెట్రీ ఈ బస్సు డ్యూటీని పూర్తి చేయగలదని ధృవీకరిస్తుంది.',
    allocatedBuses: 'కేటాయించిన బస్సులు',
    allocatedBusesSub: 'బయలుదేరడానికి సిద్ధం',
    notAllocatedBuses: 'కేటాయించని బస్సులు',
    notAllocatedBusesSub: 'రిజర్వ్‌లో ఉన్నవి',
    availableBuses: 'బయలుదేరడానికి అందుబాటులో ఉన్న బస్సులు',
    availableBusesSub: 'షెడ్యూలింగ్ కోసం మాత్రమే',
    totalBuses: 'మొత్తం బస్సులు',
    totalBusesSub: 'డిపో ఫ్లీట్',
    lockedBuses: 'లాక్ చేసిన బస్సులు',
    addDeleteBuses: 'బస్సు చేర్చు / తొలగించు',
    signOut: 'సైన్ అవుట్ ⎋',
    language: 'భాష',
  },
  ta: {
    depotOps: 'டிப்போ செயல்பாடுகள்',
    adminWorkspace: 'நிர்வாகப் பணியிடம்',
    adminSubtitle: 'பேட்டரி நிலை மற்றும் தூரத்தின் அடிப்படையில் சரியான பேருந்தை ஒதுக்குங்கள்.',
    scheduleReq: 'அட்டவணை தேவை',
    scheduleReqNote: 'அடுத்த புறப்பாட்டை வரையறுக்கவும்.',
    searchRoute: 'பாதையைத் தேடுங்கள்',
    selectRoute: 'பேருந்து பாதையைத் தேர்வுசெய்க',
    scheduledTime: 'திட்டமிடப்பட்ட புறப்பாடு நேரம்',
    departureTime: 'புறப்பாடு நேரம்',
    manualOverride: 'கைமுறை மாற்றம்',
    manualOverrideHint: '⚠️ கைமுறை மாற்றம்: நேரம் மாற்றப்பட்டது',
    resetTimetable: 'அட்டவணைக்கு மீட்டமை',
    scheduleDistance: 'அட்டவணை தூரம் (கிமீ)',
    autoAllocCard: '💡 பரிந்துரைக்கப்பட்ட பேருந்து',
    shift: 'ஷிப்ட்',
    readyForDispatch: '● புறப்படத் தயார்',
    timeSlot: 'நேர இடைவெளி',
    liveBatterySoc: 'நேரலை பேட்டரி SOC',
    fullDutyDistance: 'முழு பணி தூரம்',
    routeDistance: 'பாதை தூரம்',
    driverStatus: 'ஓட்டுநர் நிலை',
    assigned: 'ஒதுக்கப்பட்டது',
    operationMode: 'ஒற்றை சார்ஜ் செயல்பாடு',
    allocationResult: 'ஒதுக்கீட்டு முடிவு',
    transparentNote: 'நேரடி டெலிமெட்ரி இந்த பேருந்து பணியை முடிக்க முடியும் என்பதை உறுதிப்படுத்துகிறது.',
    allocatedBuses: 'ஒதுக்கப்பட்ட பேருந்துகள்',
    allocatedBusesSub: 'புறப்படத் தயார்',
    notAllocatedBuses: 'ஒதுக்கப்படாத பேருந்துகள்',
    notAllocatedBusesSub: 'ரிசர்வ் பேருந்துகள்',
    availableBuses: 'புறப்படுவதற்கு கிடைக்கும் பேருந்துகள்',
    availableBusesSub: 'அட்டவணைக்கு மட்டும் கிடைக்கும்',
    totalBuses: 'மொத்த பேருந்துகள்',
    totalBusesSub: 'டிப்போ பேருந்துகள்',
    lockedBuses: 'பூட்டப்பட்ட பேருந்துகள்',
    addDeleteBuses: 'பேருந்து சேர் / நீக்கு',
    signOut: 'வெளியேறு ⎋',
    language: 'மொழி',
  },
};



// ── DEPOT 1 & DEPOT 2 CORRIDOR ROUTES (Exact Match with admin.html & scheduling.html) ──
const DEPOT_1_ROUTES_DATA = [
  { id: '356Z', code: '356Z', name: 'CPR ➔ ANK (356Z)', origin: 'CPR', destination: 'ANK', distance: 112.0, revenueKm: 112.0, corridorDistance: 11.2, fullDutyKm: 126.28, actualKm: 126.28, category: 'Standard', requiredCat: 'B', drainSoc: 64, timetables: ['07:15 AM', '08:30 AM', '01:10 PM', '02:20 PM', '07:40 PM'], shift: 'General Shift' },
  { id: '360K', code: '360K', name: 'ATB ➔ KBS (360K)', origin: 'ATB', destination: 'KBS', distance: 143.2, revenueKm: 143.2, corridorDistance: 35.8, fullDutyKm: 180.18, actualKm: 180.18, category: 'Standard', requiredCat: 'B', drainSoc: 82, timetables: ['07:00 AM', '08:15 AM', '01:10 PM', '02:00 PM', '06:30 PM'], shift: 'General Shift' },
  { id: '600F', code: '600F', name: 'BSK ➔ ATB (600F)', origin: 'BSK', destination: 'ATB', distance: 98.6, revenueKm: 98.6, corridorDistance: 28.8, fullDutyKm: 157.96, actualKm: 157.96, category: 'Standard', requiredCat: 'B', drainSoc: 57, timetables: ['06:45 AM', '08:00 AM', '01:10 PM', '02:30 PM', '07:15 PM'], shift: 'General Shift' },
  { id: 'KBS3A', code: 'KBS3A', name: 'ATB ➔ KBS (KBS3A)', origin: 'ATB', destination: 'KBS', distance: 140.8, revenueKm: 140.8, corridorDistance: 35.2, fullDutyKm: 127.49, actualKm: 127.49, category: 'Moderate', requiredCat: 'B', drainSoc: 81, timetables: ['07:00 AM', '08:30 AM', '01:10 PM', '02:15 PM', '06:00 PM'], shift: 'General Shift' },
];

const DEPOT_2_ROUTES_DATA = [
  { id: '361C', code: '361C', name: 'ANK ➔ KMT (361C)', origin: 'ANK', destination: 'KMT', distance: 253.8, revenueKm: 253.8, corridorDistance: 38.0, fullDutyKm: 141.79, actualKm: 141.79, category: 'Complex', requiredCat: 'A', drainSoc: 74, timetables: ['07:30 AM', '09:00 AM', '01:10 PM', '03:00 PM', '05:50 AM'], shift: 'Night Halt' },
  { id: '399C', code: '399C', name: 'CTP ➔ ANK (399C)', origin: 'CTP', destination: 'ANK', distance: 143.0, revenueKm: 143.0, corridorDistance: 34.5, fullDutyKm: 146.03, actualKm: 146.03, category: 'Complex', requiredCat: 'A', drainSoc: 82, timetables: ['07:45 AM', '09:15 AM', '01:10 PM', '03:30 PM'], shift: 'General Shift' },
  { id: '328H', code: '328H', name: 'ATB ➔ HSK (328H)', origin: 'ATB', destination: 'HSK', distance: 269.4, revenueKm: 269.4, corridorDistance: 40.0, fullDutyKm: 159.5, actualKm: 159.5, category: 'Moderate', requiredCat: 'B', drainSoc: 78, timetables: ['01:10 PM', '01:45 PM', '01:50 PM', '07:00 AM', '10:30 AM'], shift: 'Night Halt' },
  { id: '500DC', code: '500DC', name: 'HBL ➔ TNF (500DC)', origin: 'HBL', destination: 'TNF', via: 'CSB', distance: 86.1, revenueKm: 86.1, corridorDistance: 49.1, fullDutyKm: 188.54, actualKm: 188.54, chargingOcc: 1, noChargingOcc: 1, splitDuty: true, singleChargeReqKm: 91.9, category: 'Standard', requiredCat: 'B', drainSoc: 50, timetables: ['07:45 AM', '08:00 AM', '08:15 AM', '08:30 AM', '10:55 AM', '11:10 AM', '11:25 AM', '11:40 AM', '01:10 PM', '02:15 PM', '03:45 PM'], shift: 'General Shift' },
  { id: 'KBS3F', code: 'KBS3F', name: 'ATB ➔ KBS (KBS3F)', origin: 'ATB', destination: 'KBS', distance: 128.4, revenueKm: 128.4, corridorDistance: 35.2, fullDutyKm: 209.88, actualKm: 209.88, category: 'Standard', requiredCat: 'B', drainSoc: 74, timetables: ['05:45 AM', '07:15 AM', '08:45 AM', '01:10 PM', '02:30 PM'], shift: 'General shift' },
];

export const ALL_ROUTES_DATA = [...DEPOT_1_ROUTES_DATA, ...DEPOT_2_ROUTES_DATA];

const DEPOT_DRIVERS = {
  '1': [
    { id: 'DRV-101', name: 'Ramesh Kumar (BMTC-4101)' },
    { id: 'DRV-102', name: 'Suresh Gowda (BMTC-4102)' },
    { id: 'DRV-103', name: 'Anand Murthy (BMTC-4103)' },
    { id: 'DRV-104', name: 'Manjunath H. (BMTC-4104)' },
    { id: 'DRV-105', name: 'Venkatesh P. (BMTC-4105)' },
  ],
  '2': [
    { id: 'DRV-201', name: 'Basavaraju K. (BMTC-4201)' },
    { id: 'DRV-202', name: 'Prakash Nayak (BMTC-4202)' },
    { id: 'DRV-203', name: 'Girish Reddy (BMTC-4203)' },
    { id: 'DRV-204', name: 'Shanthakumar (BMTC-4204)' },
    { id: 'DRV-205', name: 'Harish Babu (BMTC-4206)' },
  ],
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

// ── Helper: Unified Single Charge Operation Threshold SoC (Form 4 Transit Standard Parity) ──
export const getRequiredOperatingSoc = (duty, rData = null) => {
  if (duty && Number.isFinite(Number(duty.reqSoc)) && Number(duty.reqSoc) > 0) {
    return Number(duty.reqSoc);
  }
  if (duty && Number.isFinite(Number(duty.estimatedSoc)) && Number(duty.estimatedSoc) > 0) {
    return Number(duty.estimatedSoc);
  }
  const bm = duty?.bm || duty?.bmNumber;
  const rCode = duty ? String(duty.routeCode || duty.busNumber || '').toUpperCase().replace(/^ROUTE\s*/i, '') : '';
  const routeObj = rData || (rCode ? ALL_ROUTES_DATA.find((r) => r.code === rCode || r.id === rCode) : null);
  const depTime = duty?.departureTime || duty?.scheduledTime || '01:10 PM';

  // Form 4 Transit Standard:
  // Operating stretch for continuous single-charge operation is derived from singleChargeReqKm or split duty
  let targetKm = duty?.singleChargeReqKm || routeObj?.singleChargeReqKm;
  if (!targetKm) {
    const fullDist = Number(duty?.fullDutyKm || routeObj?.fullDutyKm || (routeObj?.distance * (duty?.tripCount || 4)) || 100);
    const chgOcc = Number(duty?.chargingOcc ?? routeObj?.chargingOcc ?? 0);
    targetKm = chgOcc > 0 ? Math.ceil(fullDist / (chgOcc + 1)) : (routeObj?.distance || 28.7);
  }
  return getRequiredSingleChargeSoc(targetKm, duty || routeObj, bm, depTime);
};

// ── Detailed Duty Tasks & Feasibility Generator (Matching Website i-Symbol Info Modal) ──
const generateBusDutyDetails = (duty) => {
  if (!duty) return null;
  const bm = duty.bm || duty.bmNumber || 'BM250';
  const regNo = duty.regNo || ('KA51AH' + String(bm).replace(/\D/g, ''));
  const model = duty.model || 'ELECTRIC BUS AC EiV12';
  const depotNum = String(duty.depot || '1');
  const routeCode = duty.routeCode || duty.busNumber || '500DC';
  const origin = duty.origin || 'Silk Board';
  const destination = duty.destination || 'Kadugodi';
  const routeName = duty.routeName || `${origin} ➔ ${destination}`;
  const scheduledTime = duty.departureTime || '08:15 AM';
  const shift = duty.shift || 'General Shift';
  const scheduleId = duty.scheduleId || `${routeCode}/12`;
  const soc = Number.isFinite(Number(duty.soc)) ? Number(duty.soc) : 85;
  const fullDutyKm = duty.fullDutyKm || Math.round(soc * 1.42);
  const driver = duty.driver || 'Driver Assigned';
  const driverId = duty.driverId || 'DRV-102';
  const tripCount = duty.tripCount || 5;

  const rData = ALL_ROUTES_DATA.find((r) => r.code === routeCode || r.id === routeCode) || null;
  const routeDist = Number(duty.distance || duty.routeDist || (rData ? rData.distance : 28.7));
  const reqSoc = getRequiredOperatingSoc(duty, rData);
  const surplus = Math.max(0, soc - reqSoc);
  const depotTransitKm = 8.5;

  const vehicleRouteReason = `Bus ${bm} (Category A) is allocated to Route ${routeCode} for ${scheduledTime} departure (${shift}).`;
  const energyReason = `Current battery SoC of ${soc}% satisfies the Single Charge Operation threshold (${reqSoc}% minimum required) with a reserve margin of +${surplus}%, providing ${fullDutyKm} km usable range for this ${routeDist.toFixed(1)} km scheduled trip without mid-route recharging.`;
  const categoryReason = `Route ${routeCode} operations require Category A buses (>120 km range). Bus ${bm} fulfills this with ${fullDutyKm} km full duty single charge range.`;
  const dispatchReason = `Operator Choice: Bus ${bm} was evaluated as compliant from the candidate pool for this route.`;

  const tasks = getSequentialTasksForDuty({
    ...duty,
    routeCode,
    scheduleId,
    depot: depotNum,
    origin,
    destination,
    departureTime: scheduledTime,
    distance: routeDist,
  });

  return {
    bm,
    regNo,
    model,
    depotNum,
    routeCode,
    routeName,
    scheduledTime,
    shift,
    scheduleId,
    soc,
    fullDutyKm,
    routeDist,
    driver,
    driverId,
    tripCount,
    reqSoc,
    surplus,
    reasons: {
      vehicleRoute: vehicleRouteReason,
      energy: energyReason,
      category: categoryReason,
      dispatch: dispatchReason,
    },
    tasks,
  };
};

// ── PHOTO-MATCHING SVG/VIEW ICONS ──
const CalendarIcon = ({ color = '#4f46e5', size = 22 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.9, height: size * 0.88, borderRadius: 5, borderWidth: 1.8, borderColor: color, padding: 2, alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: -3.5, left: 3, width: 2.2, height: 4, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: -3.5, right: 3, width: 2.2, height: 4, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: '100%', height: 1.5, backgroundColor: color, marginTop: 3 }} />
      <View style={{ width: '85%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
        <View style={{ width: 2.2, height: 2.2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 2.2, height: 2.2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 2.2, height: 2.2, borderRadius: 1, backgroundColor: color }} />
      </View>
      <View style={{ width: '85%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <View style={{ width: 2.2, height: 2.2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 2.2, height: 2.2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 2.2, height: 2.2, borderRadius: 1, backgroundColor: color }} />
      </View>
    </View>
  </View>
);

const CheckCircleIcon = ({ color = '#10b981', size = 24 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.8, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontSize: size * 0.55, fontWeight: '900', lineHeight: size * 0.75 }}>✓</Text>
  </View>
);

const BusFrontIcon = ({ color = '#2563eb', size = 22 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.82, height: size * 0.9, borderRadius: 5, borderWidth: 1.8, borderColor: color, padding: 1.5, alignItems: 'center' }}>
      <View style={{ width: '92%', height: '42%', borderRadius: 2.5, borderWidth: 1.2, borderColor: color, marginBottom: 2 }} />
      <View style={{ width: '88%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 1 }}>
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
        <View style={{ width: 6, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      </View>
    </View>
  </View>
);

const LockIcon = ({ color = '#ef4444', size = 22 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.54, height: size * 0.38, borderTopLeftRadius: size * 0.27, borderTopRightRadius: size * 0.27, borderWidth: 1.8, borderBottomWidth: 0, borderColor: color }} />
    <View style={{ width: size * 0.78, height: size * 0.52, borderRadius: 3, borderWidth: 1.8, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: color }} />
    </View>
  </View>
);

const BellIcon = ({ color = '#1e293b', size = 20 }) => (
  <View style={{ width: size + 4, height: size + 4, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.72, height: size * 0.7, borderTopLeftRadius: size * 0.36, borderTopRightRadius: size * 0.36, borderWidth: 1.8, borderColor: color }} />
    <View style={{ width: size * 0.95, height: 2, borderRadius: 1, backgroundColor: color, marginTop: -0.5 }} />
    <View style={{ width: 3, height: 2, borderBottomLeftRadius: 1.5, borderBottomRightRadius: 1.5, backgroundColor: color, marginTop: 1 }} />
  </View>
);

const HomeNavIcon = ({ color = '#94a3b8', size = 20, active = false }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.7, height: size * 0.42, borderTopLeftRadius: 2, borderLeftWidth: active ? 2.2 : 1.8, borderTopWidth: active ? 2.2 : 1.8, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -2 }} />
    <View style={{ width: size * 0.6, height: size * 0.45, borderLeftWidth: active ? 2.2 : 1.8, borderRightWidth: active ? 2.2 : 1.8, borderBottomWidth: active ? 2.2 : 1.8, borderColor: color, marginTop: -3, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
  </View>
);

const UserNavIcon = ({ color = '#94a3b8', size = 20, active = false }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: (size * 0.42) / 2, borderWidth: active ? 2.2 : 1.8, borderColor: color }} />
    <View style={{ width: size * 0.72, height: size * 0.34, borderTopLeftRadius: (size * 0.72) / 2, borderTopRightRadius: (size * 0.72) / 2, borderWidth: active ? 2.2 : 1.8, borderBottomWidth: 0, borderColor: color, marginTop: 2 }} />
  </View>
);

// ── Universal SubScreen Header with Back Button & Count/Badge ──
const SubScreenHeader = ({ title, subtitle, onBack, count, badge, onLangPress }) => {
  const { t } = useLanguage();
  return (
    <View style={styles.subScreenHeader}>
      <View style={styles.subScreenHeaderBar}>
        <TouchableOpacity
          style={styles.subScreenBackPill}
          onPress={onBack}
          activeOpacity={0.8}
          accessibilityLabel="Go back to Home"
        >
          <Text style={styles.subScreenBackIcon}>←</Text>
          <Text style={styles.subScreenBackLabel}>{t ? t('Back', 'Back') : 'Back'}</Text>
        </TouchableOpacity>

        <View style={styles.subScreenHeaderTitles}>
          <Text style={styles.subScreenHeaderMainTitle} numberOfLines={1}>
            {typeof title === 'string' && t ? t(title, title) : title}
          </Text>
          {subtitle ? (
            <Text style={styles.subScreenHeaderSubTitle} numberOfLines={1}>
              {typeof subtitle === 'string' && t ? t(subtitle, subtitle) : subtitle}
            </Text>
          ) : null}
        </View>

        {onLangPress && (
          <LanguagePickerPill onPress={onLangPress} style={{ paddingVertical: 4, paddingHorizontal: 7, marginRight: 6 }} />
        )}

        {count !== undefined && count !== null ? (
          <View style={styles.subScreenCountPill}>
            <Text style={styles.subScreenCountText}>{count}</Text>
          </View>
        ) : badge ? (
          <View style={styles.subScreenBadgePill}>
            <Text style={styles.subScreenBadgeText}>{typeof badge === 'string' && t ? t(badge, badge) : badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};


// ── PHOTO-MATCHING CIRCULAR DONUT CHART (Dynamically updated by Allocated & Not Allocated) ──
const DonutChart = ({ total = 0, allocated = 0, notAllocated = 0 }) => {
  const numTotal = Number(total);
  const safeAllocated = Math.max(0, Number(allocated) || 0);
  const safeNotAllocated = Math.max(0, Number(notAllocated) || 0);
  const safeTotal = Number.isFinite(numTotal)
    ? Math.max(0, numTotal)
    : (safeAllocated + safeNotAllocated);

  const ratio = safeTotal > 0 ? safeAllocated / safeTotal : 0;
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  // 1. Web Platform: Standard SVG
  if (Platform.OS === 'web') {
    return (
      <View style={styles.donutWrapper}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
        >
          {/* Base lavender ring (Not Allocated), neutral gray if 0 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={safeTotal > 0 ? '#ddd6fe' : '#e2e8f0'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Dynamic green progress arc (Allocated) */}
          {safeAllocated > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#10b981"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <View style={styles.donutCenterContent}>
          <Text style={styles.donutTotalNum}>{safeTotal}</Text>
          <Text style={styles.donutTotalLabel}>Total fleet</Text>
        </View>
      </View>
    );
  }

  // 2. Native Mobile Platform (Android & iOS): Hardware-accelerated SVG via WebView
  if (Platform.OS !== 'web' && NativeWebView) {
    const svgHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; overflow:hidden; }
    body, html { width:100%; height:100%; background:transparent; display:flex; align-items:center; justify-content:center; }
  </style>
</head>
<body>
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <g transform="rotate(-90 ${size / 2} ${size / 2})">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="${safeTotal > 0 ? '#ddd6fe' : '#e2e8f0'}" stroke-width="${strokeWidth}" fill="none" />
      ${safeAllocated > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#10b981" stroke-width="${strokeWidth}" fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" />` : ''}
    </g>
    <text x="${size / 2}" y="${size / 2 - 2}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" text-anchor="middle" fill="#1e293b">${safeTotal}</text>
    <text x="${size / 2}" y="${size / 2 + 15}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" text-anchor="middle" fill="#64748b">Total fleet</text>
  </svg>
</body>
</html>
`;

    return (
      <View style={styles.donutWrapper}>
        <NativeWebView
          originWhitelist={['*']}
          source={{ html: svgHtml }}
          style={{ width: size, height: size, backgroundColor: 'transparent' }}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          scalesPageToFit={false}
        />
      </View>
    );
  }

  // Fallback if WebView not present
  return (
    <View style={styles.donutWrapper}>
      <View style={styles.donutCenterContent}>
        <Text style={styles.donutTotalNum}>{safeTotal}</Text>
        <Text style={styles.donutTotalLabel}>Total fleet</Text>
      </View>
    </View>
  );
};

export default function AdminWorkspaceScreen() {
  const {
    buses: contextBuses,
    allBuses,
    lockedBuses,
    allocatedDuties,
    completedRoutesLog,
    allocateBusToRoute,
    completeRoute,
    resetAllAllocations,
    addBusToFleet,
    addBusesBatchToFleet,
    deleteBusFromFleet,
    deleteBusesBatchFromFleet,
    restoreBusToFleet,
    localAddedBuses,
    localDeletedBuses,
    unlockBus,
    unlockAllBuses,
    refreshFleet,
  } = useFleet();
  const { user, selectedDepot, logout, openDepotScreen } = useAuth();

  // Admin Workspace is the enterprise view of the ENTIRE fleet (both Depot 1 and Depot 2)
  const buses = (allBuses && allBuses.length > 0) ? allBuses : contextBuses;

  // Enterprise Depot Filter: 'all' | '1' | '2' (Allows full enterprise view of both Depot 1 and Depot 2)
  const [adminDepotFilter, setAdminDepotFilter] = useState('all');

  const [langModalOpen, setLangModalOpen] = useState(false);

  // Current language synced via LanguageContext
  const { currentLang, setLanguage: setCurrentLang, t: tContext, languages = [] } = useLanguage();
  const t = React.useMemo(() => {
    const fn = (key, fallback = '') => {
      if (!key) return fallback || '';
      const legacy = (I18N[currentLang] && I18N[currentLang][key]) || (I18N.en && I18N.en[key]);
      if (legacy) return legacy;
      return tContext ? tContext(key, fallback) : (fallback || key);
    };
    return new Proxy(fn, {
      get: (target, prop) => {
        if (
          typeof prop !== 'string' ||
          prop in target ||
          prop.startsWith('$') ||
          ['bind', 'call', 'apply', 'name', 'length', 'toString', 'valueOf', 'prototype', 'toJSON'].includes(prop)
        ) {
          return target[prop];
        }
        const legacy = (I18N[currentLang] && I18N[currentLang][prop]) || (I18N.en && I18N.en[prop]);
        if (legacy) return legacy;
        return tContext ? tContext(prop) : prop;
      },
    });
  }, [currentLang, tContext]);

  // Modals state
  const [lockedModalOpen, setLockedModalOpen] = useState(false);

  // ── Modal 0: Plus (+) Options Chooser Modal State ──
  const [plusOptionsModalOpen, setPlusOptionsModalOpen] = useState(false);

  // ── Modal 3: Add / Delete Buses State ──
  const [addDeleteModalOpen, setAddDeleteModalOpen] = useState(false);
  const [addDeleteFullscreen, setAddDeleteFullscreen] = useState(true);

  // ── Modal 3B: Add / Delete Depots Only State ──
  const [addDeleteDepotsModalOpen, setAddDeleteDepotsModalOpen] = useState(false);
  const [addDeleteDepotsFullscreen, setAddDeleteDepotsFullscreen] = useState(true);
  const [depotsTab, setDepotsTab] = useState('add'); // 'add' | 'delete' | 'directory'

  // ── Modal 3C: Add / Delete Routes Modal State (With Depot Dropdown Menu First) ──
  const [addDeleteRoutesModalOpen, setAddDeleteRoutesModalOpen] = useState(false);
  const [addDeleteRoutesFullscreen, setAddDeleteRoutesFullscreen] = useState(true);
  const [routesTab, setRoutesTab] = useState('add'); // 'add' | 'delete' | 'directory'
  const [routesSelectedDepot, setRoutesSelectedDepot] = useState(''); // Dropdown menu for selecting depot (Mandatory selection)
  const [routesDepotPickerOpen, setRoutesDepotPickerOpen] = useState(false);

  // ── Modal 3D: Add / Delete Bus Drivers Modal State ──
  const [addDeleteDriversModalOpen, setAddDeleteDriversModalOpen] = useState(false);
  const [addDeleteDriversFullscreen, setAddDeleteDriversFullscreen] = useState(true);
  const [driversTab, setDriversTab] = useState('add'); // 'add' | 'delete' | 'directory'
  const [driversSelectedDepot, setDriversSelectedDepot] = useState(''); // Mandatory depot selection
  const [driversDepotPickerOpen, setDriversDepotPickerOpen] = useState(false);

  // Driver Form States
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverId, setNewDriverId] = useState('');
  const [newDriverDepot, setNewDriverDepot] = useState('1');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverShift, setNewDriverShift] = useState('General Shift');
  const [newDriverCategory, setNewDriverCategory] = useState('B');
  const [selectedDriversToDelete, setSelectedDriversToDelete] = useState([]);
  const [delDriverReason, setDelDriverReason] = useState('Transferred to another depot');
  const [delDriverCustomReason, setDelDriverCustomReason] = useState('');
  const [delDriverSearchQuery, setDelDriverSearchQuery] = useState('');

  const INITIAL_DRIVERS_LIST = [
    { id: 'DRV-101', name: 'Ramesh Kumar (BMTC-4101)', depot: '1', phone: '+91 98450 11001', shift: 'General Shift', status: 'Active', category: 'A' },
    { id: 'DRV-102', name: 'Suresh Gowda (BMTC-4102)', depot: '1', phone: '+91 98450 11002', shift: 'General Shift', status: 'Active', category: 'B' },
    { id: 'DRV-103', name: 'Anand Murthy (BMTC-4103)', depot: '1', phone: '+91 98450 11003', shift: 'Shift B', status: 'Active', category: 'B' },
    { id: 'DRV-104', name: 'Manjunath H. (BMTC-4104)', depot: '1', phone: '+91 98450 11004', shift: 'Shift B', status: 'Active', category: 'A' },
    { id: 'DRV-105', name: 'Venkatesh P. (BMTC-4105)', depot: '1', phone: '+91 98450 11005', shift: 'Night Halt', status: 'Active', category: 'C' },
    { id: 'DRV-106', name: 'Ravi Shankar (BMTC-4106)', depot: '1', phone: '+91 98450 11006', shift: 'General Shift', status: 'Active', category: 'B' },
    { id: 'DRV-107', name: 'Kiran Kumar (BMTC-4107)', depot: '1', phone: '+91 98450 11007', shift: 'Shift B', status: 'Active', category: 'B' },
    { id: 'DRV-108', name: 'Nagaraj V. (BMTC-4108)', depot: '1', phone: '+91 98450 11008', shift: 'Night Halt', status: 'Active', category: 'A' },
    { id: 'DRV-201', name: 'Basavaraju K. (BMTC-4201)', depot: '2', phone: '+91 98450 22001', shift: 'General Shift', status: 'Active', category: 'A' },
    { id: 'DRV-202', name: 'Prakash Nayak (BMTC-4202)', depot: '2', phone: '+91 98450 22002', shift: 'General Shift', status: 'Active', category: 'B' },
    { id: 'DRV-203', name: 'Girish Reddy (BMTC-4203)', depot: '2', phone: '+91 98450 22003', shift: 'Shift B', status: 'Active', category: 'B' },
    { id: 'DRV-204', name: 'Shanthakumar (BMTC-4204)', depot: '2', phone: '+91 98450 22004', shift: 'Shift B', status: 'Active', category: 'A' },
    { id: 'DRV-205', name: 'Chandrashekar (BMTC-4205)', depot: '2', phone: '+91 98450 22005', shift: 'Night Halt', status: 'Active', category: 'C' },
    { id: 'DRV-206', name: 'Harish Babu (BMTC-4206)', depot: '2', phone: '+91 98450 22006', shift: 'General Shift', status: 'Active', category: 'B' },
    { id: 'DRV-301', name: 'Mahesh Gowda (BMTC-4301)', depot: '3', phone: '+91 98450 33001', shift: 'General Shift', status: 'Active', category: 'A' },
    { id: 'DRV-302', name: 'Raghavendra Rao (BMTC-4302)', depot: '3', phone: '+91 98450 33002', shift: 'Shift B', status: 'Active', category: 'B' },
    { id: 'DRV-303', name: 'Chethan Kumar (BMTC-4303)', depot: '3', phone: '+91 98450 33003', shift: 'Night Halt', status: 'Active', category: 'A' },
  ];

  const [driversList, setDriversList] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('bmtc_drivers_roster_v1');
        if (saved) return JSON.parse(saved);
      }
    } catch (_) {}
    return INITIAL_DRIVERS_LIST;
  });

  const [driverAuditLogs, setDriverAuditLogs] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('bmtc_driver_audit_logs_v1');
        if (saved) return JSON.parse(saved);
      }
    } catch (_) {}
    return [];
  });

  React.useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bmtc_drivers_roster_v1', JSON.stringify(driversList));
      }
    } catch (_) {}
  }, [driversList]);

  React.useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bmtc_driver_audit_logs_v1', JSON.stringify(driverAuditLogs));
      }
    } catch (_) {}
  }, [driverAuditLogs]);

  // Dynamic Depot Management States (Auto-creation of Charging, Cleaning, Scheduling, Ops & Credentials)
  const [depotsList, setDepotsList] = useState(getAllDepots());
  const [depotCredentialsList, setDepotCredentialsList] = useState(getDepotCredentialsList());
  const [depotAddMode, setDepotAddMode] = useState('depot'); // 'depot' (Add Depot with Route Dropdown) | 'route' (Add Corridor)
  const [newDepotId, setNewDepotId] = useState('');
  const [newDepotName, setNewDepotName] = useState('');
  const [newDepotLocation, setNewDepotLocation] = useState('');
  const [selectedDepotRoutes, setSelectedDepotRoutes] = useState([]);
  const [routeDropdownOpen, setRouteDropdownOpen] = useState(false);
  const [routeDropdownSearch, setRouteDropdownSearch] = useState('');

  // Delete Depot states
  const [depotDelMode, setDepotDelMode] = useState('depot'); // 'depot' (Delete Depot) | 'route' (Decommission Route)
  const [selectedDepotToDelete, setSelectedDepotToDelete] = useState('');
  const [selectedDepotsToDelete, setSelectedDepotsToDelete] = useState([]);
  const [delDepotReason, setDelDepotReason] = useState('Depot Consolidation');
  const [delDepotCustomReason, setDelDepotCustomReason] = useState('');
  const [delDepotSearchQuery, setDelDepotSearchQuery] = useState('');

  // Subscribe to dynamic depot changes across the app
  React.useEffect(() => {
    const unsub = subscribeDepotChanges(() => {
      setDepotsList(getAllDepots());
      setDepotCredentialsList(getDepotCredentialsList());
    });
    return unsub;
  }, []);

  // Dynamic Route & Corridor Management State
  const [customRoutes, setCustomRoutes] = useState([]);
  const [deletedRouteCodes, setDeletedRouteCodes] = useState([]);
  const [depotAuditLogs, setDepotAuditLogs] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('depot_audit_logs_v1');
        if (saved) return JSON.parse(saved);
      }
    } catch (_) {}
    return [];
  });
  const [depotDirectorySearch, setDepotDirectorySearch] = useState('');
  const [depotAuditLogSearch, setDepotAuditLogSearch] = useState('');
  const [depotAuditActionFilter, setDepotAuditActionFilter] = useState('all'); // 'all' | 'DEPOT_CREATED' | 'DEPOT_DELETED' | 'ADDED' | 'DELETED'
  const [depotAuditActionDropdownOpen, setDepotAuditActionDropdownOpen] = useState(false);
  const [fleetAuditActionFilter, setFleetAuditActionFilter] = useState('all'); // 'all' | 'ADDED' | 'DELETED'
  const [fleetAuditActionDropdownOpen, setFleetAuditActionDropdownOpen] = useState(false);
  const [homeDepotDropdownOpen, setHomeDepotDropdownOpen] = useState(false);
  const [totalFleetDepotDropdownOpen, setTotalFleetDepotDropdownOpen] = useState(false);
  const [profileLangDropdownOpen, setProfileLangDropdownOpen] = useState(false);
  const [selectedDatasetFile, setSelectedDatasetFile] = useState(null);
  const [datasetTargetDepot, setDatasetTargetDepot] = useState('');
  const [datasetTargetDepotName, setDatasetTargetDepotName] = useState('');
  const [datasetDepotModalOpen, setDatasetDepotModalOpen] = useState(false);
  const [isUploadingDataset, setIsUploadingDataset] = useState(false);
  const [datasetUploadStatus, setDatasetUploadStatus] = useState(null);

  // Persist Depot Audit Logs to localStorage
  React.useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('depot_audit_logs_v1', JSON.stringify(depotAuditLogs));
      }
    } catch (_) {}
  }, [depotAuditLogs]);

  // Form State: Add Route to Depot
  const [depotRouteFullName, setDepotRouteFullName] = useState('');
  const [depotRouteShortName, setDepotRouteShortName] = useState('');
  const [depotRouteOrigin, setDepotRouteOrigin] = useState('');
  const [depotRouteDestination, setDepotRouteDestination] = useState('');
  const [depotRouteDistance, setDepotRouteDistance] = useState('');
  const [depotTargetDepot, setDepotTargetDepot] = useState('1'); // '1' | '2' | 'custom'
  const [routeDepotDropdownOpen, setRouteDepotDropdownOpen] = useState(false);
  const [depotCustomName, setDepotCustomName] = useState('');
  const [depotRouteShift, setDepotRouteShift] = useState('General Shift');
  const [depotRouteCategory, setDepotRouteCategory] = useState('Standard');
  const [depotRouteTimeComplexity, setDepotRouteTimeComplexity] = useState('Normal');
  const [depotRouteTimetables, setDepotRouteTimetables] = useState('06:30 AM, 08:00 AM, 01:10 PM, 03:00 PM, 06:45 PM');
  const [datasetVersionTick, setDatasetVersionTick] = useState(0);

  React.useEffect(() => {
    const unsub = subscribeDatasetChanges(() => {
      setDatasetVersionTick((v) => v + 1);
    });
    return unsub;
  }, []);

  const handleUpdateRouteComplexity = (routeCode, depotId, currentComplexity) => {
    const complexities = ['Simple', 'Standard', 'Moderate', 'Complex'];
    const currentIdx = complexities.findIndex((c) => c.toLowerCase() === String(currentComplexity || 'Standard').toLowerCase());
    const nextIdx = (currentIdx + 1) % complexities.length;
    const nextComp = complexities[nextIdx];
    updateRouteComplexityInDataset(routeCode, depotId, nextComp);
    setDatasetVersionTick((v) => v + 1);
    Alert.alert(
      '⚡ Route Complexity Updated',
      `Route [${routeCode}] complexity is now updated to "${nextComp}".\n\n` +
      (nextComp === 'Complex'
        ? '• Strictly requires Category A Fleet Buses across all operating hours.'
        : nextComp === 'Moderate'
        ? '• Requires Category B or higher Fleet Buses.'
        : '• Standard fleet eligible for dispatch.'),
      [{ text: 'OK' }]
    );
  };

  const handleUpdateTimeComplexity = (routeCode, depotId, currentTimeComplexity) => {
    const timeTiers = ['Normal', 'Peak', 'Extreme Peak'];
    const currentIdx = timeTiers.findIndex((t) => t.toLowerCase() === String(currentTimeComplexity || 'Normal').toLowerCase());
    const nextIdx = (currentIdx + 1) % timeTiers.length;
    const nextTier = timeTiers[nextIdx];
    updateTimeComplexityInDataset(routeCode, depotId, nextTier);
    setDatasetVersionTick((v) => v + 1);
    Alert.alert(
      '🕒 Time Complexity Updated',
      `Route [${routeCode}] time complexity is now updated to "${nextTier}".\n\n` +
      (nextTier === 'Extreme Peak'
        ? '• +30% high battery drain multiplier.\n• Requires Category A bus.'
        : nextTier === 'Peak'
        ? '• +15% moderate battery drain multiplier.'
        : '• Baseline normal drain rate.'),
      [{ text: 'OK' }]
    );
  };

  // Form State: Delete Route / Depot
  const [delRouteSelectedCode, setDelRouteSelectedCode] = useState('');
  const [selectedRoutesToDelete, setSelectedRoutesToDelete] = useState([]);
  const [delRouteReason, setDelRouteReason] = useState('Route Realignment');
  const [delRouteCustomReason, setDelRouteCustomReason] = useState('');
  const [delRouteSearchQuery, setDelRouteSearchQuery] = useState('');

  const [routeAllocatedModalOpen, setRouteAllocatedModalOpen] = useState(false);
  const [routeAllocatedModalRoute, setRouteAllocatedModalRoute] = useState(ALL_ROUTES_DATA[0].code);
  const [routeAllocatedSearch, setRouteAllocatedSearch] = useState('');
  const [routeAllocatedFullscreen, setRouteAllocatedFullscreen] = useState(true);

  // Home Page Depot Search State
  const [homeDepotSearch, setHomeDepotSearch] = useState('');

  // Notifications State: Recently Completed Route Tracking & Read-Status Badge
  const [lastViewedCompletedCount, setLastViewedCompletedCount] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const s = localStorage.getItem('last_viewed_completed_count');
        if (s !== null) {
          const parsed = parseInt(s, 10);
          return isNaN(parsed) ? 0 : parsed;
        }
      }
    } catch (_) {}
    return 0;
  });

  // Schedule Overview Filters: 1 Search Box & 3 Dropdown Menus (Depots, Routes, & Departure Times)
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [scheduleSelectedDepot, setScheduleSelectedDepot] = useState('all'); // 'all' | depotId
  const [scheduleDepotPickerOpen, setScheduleDepotPickerOpen] = useState(false);
  const [scheduleRoutePickerOpen, setScheduleRoutePickerOpen] = useState(false);
  const [scheduleTimePickerOpen, setScheduleTimePickerOpen] = useState(false);
  const [newDepartureTimeInput, setNewDepartureTimeInput] = useState('');
  const [showAddDepartureTimeInput, setShowAddDepartureTimeInput] = useState(false);

  // Notifications Modal State: Recently Route Completed Buses
  const [recentCompletedModalOpen, setRecentCompletedModalOpen] = useState(false);
  const [recentCompletedFullscreen, setRecentCompletedFullscreen] = useState(true);
  const [recentCompletedSearch, setRecentCompletedSearch] = useState('');
  const [recentCompletedSortBy, setRecentCompletedSortBy] = useState('time-desc');
  const [recentCompletedDepot, setRecentCompletedDepot] = useState('all');

  // Locked Buses Modal controls (Breakdown & Sorting)
  const [lockedDepotFilter, setLockedDepotFilter] = useState('all'); // 'all' | '1' | '2'
  const [lockedFilterType, setLockedFilterType] = useState('all'); // 'all' | 'charging' | 'cleaning'
  const [lockedSortBy, setLockedSortBy] = useState('charging-first');
  const [lockedSearch, setLockedSearch] = useState('');

  // BM Duty Details Modal State (Website i-symbol information in app)
  const [selectedBmDuty, setSelectedBmDuty] = useState(null);
  const [bmDetailsModalOpen, setBmDetailsModalOpen] = useState(false);

  // Scroll ref & layout positions for auto-scroll
  const mainScrollRef = useRef(null);
  const fleetNavGridRef = useRef(null);
  const [homeLayoutY, setHomeLayoutY] = useState(0);
  const [schedulingLayoutY, setSchedulingLayoutY] = useState(0);
  const [fleetOverviewLayoutY, setFleetOverviewLayoutY] = useState(0);
  const [fleetNavGridOffsetY, setFleetNavGridOffsetY] = useState(0);
  const [navSectionY, setNavSectionY] = useState(0);

  // Active Fleet Section: 'ALLOCATED' | 'NOT_ALLOCATED' | 'AVAILABLE_DEPARTURE' | 'TOTAL_BUSES' | null
  // Initially null so Allocated Buses is NOT in clicked/expanded mode on load
  const [activeSection, setActiveSection] = useState(null);

  // ── Bottom Navigation Tab State ──
  // 'HOME' | 'SCHEDULE' | 'FLEET' | 'PROFILE'
  const [activeAdminTab, setActiveAdminTab] = useState('HOME');

  const navigateToAdminTab = (tab) => {
    setActiveAdminTab(tab);
    setHomeDepotDropdownOpen(false);
    setTotalFleetDepotDropdownOpen(false);
    setProfileLangDropdownOpen(false);
    if (mainScrollRef.current) {
      try {
        mainScrollRef.current.scrollTo({ y: 0, animated: false });
      } catch (e) {}
    }
  };

  // Open BM Details Modal
  const handleOpenBmDutyDetails = (duty) => {
    const details = generateBusDutyDetails(duty);
    setSelectedBmDuty(details);
    setBmDetailsModalOpen(true);
  };

  // Scroll smoothly down to Total Buses near Not-Allocated Buses
  const handleScrollToTotalBuses = () => {
    navigateToAdminTab('TOTAL_FLEET');
  };

  // Combined Active Routes List (Default Depots + Custom Depots + Registered Routes - Deleted Routes)
  const allAvailableRoutes = useMemo(() => {
    const list = [];
    const seen = new Set();
    const CORE_DEPOT_1_CODES = ['356Z', '360K', '600F', 'KBS3A'];
    const CORE_DEPOT_2_CODES = ['361C', '399C', '328H', '500DC', 'KBS3F'];

    // 1. Process custom registered routes first
    (customRoutes || []).forEach((r) => {
      const code = String(r.code || r.id).toUpperCase().trim();
      const dId = String(r.depotId || '1');
      if (dId === '1' && CORE_DEPOT_2_CODES.includes(code)) return;
      if (dId === '2' && CORE_DEPOT_1_CODES.includes(code)) return;
      if (!deletedRouteCodes.includes(code) && !seen.has(`${dId}_${code}`)) {
        seen.add(`${dId}_${code}`);
        list.push({ ...r, code, depotId: dId });
      }
    });

    // 2. Process all dynamic and default depots in depotsList (strictly filtering duplicates between Depot 1 & 2)
    (depotsList || []).forEach((depot) => {
      const dId = String(depot.id);
      const dName = depot.name || `Depot ${dId}`;
      const dRoutes = Array.isArray(depot.routes) ? depot.routes : [];

      dRoutes.forEach((routeCode) => {
        const cleanCode = String(routeCode).toUpperCase().trim();
        if (!cleanCode || deletedRouteCodes.includes(cleanCode)) return;

        // Strictly filter duplicate routes between Depot 1 and Depot 2
        if (dId === '1' && CORE_DEPOT_2_CODES.includes(cleanCode)) return;
        if (dId === '2' && CORE_DEPOT_1_CODES.includes(cleanCode)) return;

        if (seen.has(`${dId}_${cleanCode}`)) return;
        seen.add(`${dId}_${cleanCode}`);

        const dynamicDef = getRouteDefinition(cleanCode);
        const baseRoute = ALL_ROUTES_DATA.find((r) => r.code === cleanCode || r.id === cleanCode);
        if (dynamicDef) {
          list.push({
            ...dynamicDef,
            id: `${dId}_${cleanCode}`,
            code: cleanCode,
            depotId: dId,
            depotName: dName,
          });
        } else if (baseRoute) {
          list.push({
            ...baseRoute,
            id: `${dId}_${cleanCode}`,
            code: cleanCode,
            depotId: dId,
            depotName: dName,
          });
        } else {
          list.push({
            id: `${dId}_${cleanCode}`,
            code: cleanCode,
            name: `Route ${cleanCode} (${dName})`,
            fullName: `Route ${cleanCode} (${dName})`,
            shortName: cleanCode,
            origin: `${dName} Station`,
            destination: 'Central Terminal',
            distance: 28.5,
            fullDutyKm: 57.0,
            category: 'Standard',
            requiredCat: 'B',
            drainSoc: 26,
            timetables: ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'],
            shift: 'General Shift',
            depotId: dId,
            depotName: dName,
            custom: true,
          });
        }
      });
    });

    // 3. Ensure core default routes for Depot 1 and Depot 2 are included without duplicate crossover
    DEPOT_1_ROUTES_DATA.forEach((r) => {
      const code = String(r.code).toUpperCase();
      if (!deletedRouteCodes.includes(code) && !seen.has(`1_${code}`)) {
        seen.add(`1_${code}`);
        list.push({ ...r, depotId: '1', depotName: 'Depot 1 (Chandapura)' });
      }
    });
    DEPOT_2_ROUTES_DATA.forEach((r) => {
      const code = String(r.code).toUpperCase();
      if (!deletedRouteCodes.includes(code) && !seen.has(`2_${code}`)) {
        seen.add(`2_${code}`);
        list.push({ ...r, depotId: '2', depotName: 'Depot 2 (Attibele / Hoskote)' });
      }
    });

    // 4. Enrich with Master Route & Schedule Dataset (including uploaded spreadsheets & dynamic departure times)
    try {
      const masterDs = getMasterDataset();
      if (masterDs && Array.isArray(masterDs.routes)) {
        masterDs.routes.forEach((mr) => {
          const code = String(mr.code || mr.id).toUpperCase().trim();
          const dId = String(mr.depotId || '1');
          if (deletedRouteCodes.includes(code)) return;
          if (dId === '1' && CORE_DEPOT_2_CODES.includes(code)) return;
          if (dId === '2' && CORE_DEPOT_1_CODES.includes(code)) return;

          const existingIdx = list.findIndex((x) => x.code === code && String(x.depotId) === dId);
          if (existingIdx >= 0) {
            // Merge richer timetables from dataset
            if (Array.isArray(mr.timetables) && mr.timetables.length > 0) {
              const combined = Array.from(new Set([...(list[existingIdx].timetables || []), ...mr.timetables]));
              list[existingIdx].timetables = combined;
            }
            if (Array.isArray(mr.schedules) && mr.schedules.length > 0) {
              list[existingIdx].schedules = mr.schedules;
            }
          } else if (!seen.has(`${dId}_${code}`)) {
            seen.add(`${dId}_${code}`);
            list.push({
              ...mr,
              id: `${dId}_${code}`,
              code,
              depotId: dId,
              depotName: mr.depotName || (dId === '1' ? 'Depot 1 (Chandapura)' : dId === '2' ? 'Depot 2 (Attibele / Hoskote)' : `Depot ${dId}`),
            });
          }
        });
      }
    } catch (_) {}

    return list;
  }, [depotsList, customRoutes, deletedRouteCodes, datasetVersionTick]);

  const depot1Routes = useMemo(() => {
    return allAvailableRoutes.filter((r) => String(r.depotId) === '1');
  }, [allAvailableRoutes]);

  const depot2Routes = useMemo(() => {
    return allAvailableRoutes.filter((r) => String(r.depotId) === '2');
  }, [allAvailableRoutes]);

  const customDepotRoutes = useMemo(() => {
    return allAvailableRoutes.filter((r) => String(r.depotId) !== '1' && String(r.depotId) !== '2');
  }, [allAvailableRoutes]);

  // Schedule Requirement State (Supports routes from ALL depots)
  const [selectedRoute, setSelectedRoute] = useState(ALL_ROUTES_DATA[0]);
  const [scheduledTime, setScheduledTime] = useState(ALL_ROUTES_DATA[0].timetables[0]);

  // Detected operating depot for the selected route
  const selectedRouteDepot = String(selectedRoute?.depotId || (DEPOT_2_ROUTES_DATA.some((r) => r.id === selectedRoute?.id) ? '2' : '1'));
  const routeDrivers = DEPOT_DRIVERS[selectedRouteDepot] || DEPOT_DRIVERS['1'];
  const [selectedDriver, setSelectedDriver] = useState(routeDrivers[0]);

  // Sync driver when route changes
  React.useEffect(() => {
    const drivers = DEPOT_DRIVERS[selectedRouteDepot] || DEPOT_DRIVERS['1'];
    setSelectedDriver(drivers[0]);
  }, [selectedRouteDepot]);

  // ── Schedule Overview: Filtered Depots for Dropdown (respects search box) ──
  const filteredDepotsForDropdown = useMemo(() => {
    if (!scheduleSearchQuery.trim()) return depotsList;
    const q = scheduleSearchQuery.trim().toLowerCase();
    return depotsList.filter((d) => {
      const dName = (d.name || '').toLowerCase();
      const dLoc = (d.location || '').toLowerCase();
      const dId = String(d.id).toLowerCase();
      if (dName.includes(q) || dLoc.includes(q) || dId === q || `depot ${dId}`.includes(q)) {
        return true;
      }
      const dRoutes = allAvailableRoutes.filter((r) => String(r.depotId) === String(d.id));
      return dRoutes.some((r) => {
        return (
          (r.code && r.code.toLowerCase().includes(q)) ||
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.origin && r.origin.toLowerCase().includes(q)) ||
          (r.destination && r.destination.toLowerCase().includes(q))
        );
      });
    });
  }, [depotsList, allAvailableRoutes, scheduleSearchQuery]);

  // ── Schedule Overview: Filtered Routes for Dropdown (filtered by selected depot AND search box) ──
  const filteredRoutesForDropdown = useMemo(() => {
    let routes = allAvailableRoutes;
    if (scheduleSelectedDepot !== 'all') {
      routes = routes.filter((r) => String(r.depotId) === String(scheduleSelectedDepot));
    }
    if (scheduleSearchQuery.trim()) {
      const q = scheduleSearchQuery.trim().toLowerCase();
      routes = routes.filter((r) => {
        const rCode = (r.code || '').toLowerCase();
        const rName = (r.name || r.fullName || '').toLowerCase();
        const rOrigin = (r.origin || '').toLowerCase();
        const rDest = (r.destination || '').toLowerCase();
        const rDepot = (r.depotName || `Depot ${r.depotId}`).toLowerCase();
        return (
          rCode.includes(q) ||
          rName.includes(q) ||
          rOrigin.includes(q) ||
          rDest.includes(q) ||
          rDepot.includes(q) ||
          String(r.depotId) === q
        );
      });
    }
    return routes;
  }, [allAvailableRoutes, scheduleSelectedDepot, scheduleSearchQuery]);

  // ── Schedule Overview: Handler when user selects depot from dropdown ──
  const handleSelectScheduleDepot = (depotId) => {
    const cleanId = String(depotId);
    setScheduleSelectedDepot(cleanId);
    setScheduleDepotPickerOpen(false);

    let eligible = allAvailableRoutes;
    if (cleanId !== 'all') {
      eligible = allAvailableRoutes.filter((r) => String(r.depotId) === cleanId);
    }
    if (scheduleSearchQuery.trim()) {
      const q = scheduleSearchQuery.trim().toLowerCase();
      const matched = eligible.filter((r) => {
        return (
          (r.code && r.code.toLowerCase().includes(q)) ||
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.origin && r.origin.toLowerCase().includes(q)) ||
          (r.destination && r.destination.toLowerCase().includes(q))
        );
      });
      if (matched.length > 0) eligible = matched;
    }

    if (eligible.length > 0) {
      const currentValid = eligible.some(
        (r) => r.id === selectedRoute?.id || (r.code === selectedRoute?.code && String(r.depotId) === String(selectedRoute?.depotId))
      );
      if (!currentValid) {
        setSelectedRoute(eligible[0]);
        setScheduledTime((eligible[0].timetables && eligible[0].timetables[0]) || '01:10 PM');
      }
    }
  };

  // ── Schedule Overview: Handler when user selects route from dropdown ──
  const handleSelectScheduleRoute = (route) => {
    setSelectedRoute(route);
    setScheduledTime((route.timetables && route.timetables[0]) || '01:10 PM');
    if (scheduleSelectedDepot !== 'all' && String(scheduleSelectedDepot) !== String(route.depotId)) {
      setScheduleSelectedDepot(String(route.depotId || '1'));
    }
    setScheduleRoutePickerOpen(false);
  };

  // ── Handler: Create New Depot (With confirmation & translation) ──
  const handleCreateNewDepot = () => {
    const cleanId = String(newDepotId || '').trim().replace(/^DEPOT\s*/i, '');
    if (!cleanId) {
      Alert.alert(t('missing_field', 'Missing Field'), t('enter_depot_id_msg', 'Please enter a Depot Number / ID (e.g. 3, 4, or EC-3).'));
      return;
    }
    if (!newDepotName.trim()) {
      Alert.alert(t('missing_field', 'Missing Field'), t('enter_depot_name_msg', 'Please enter Depot Name (e.g. Depot 3 — Electronic City).'));
      return;
    }

    if (cleanId === '1' || cleanId === '2') {
      Alert.alert(t('protected_master_facility', 'Protected Master Facility'), `Depot ${cleanId} ${t('core_depot_exists_msg', 'is a core operational depot and already exists.')}`);
      return;
    }

    const depotTitle = newDepotName.trim();
    Alert.alert(
      t('confirm_add_depot_title', 'Confirm Add Depot'),
      `${t('confirm_add_depot_msg', 'Are you sure you want to add this depot?')}\n\n• ${t('depot_name_field', 'Depot Name')}: ${depotTitle}\n• ${t('depot_number_id', 'Depot ID')}: ${cleanId}${newDepotLocation.trim() ? `\n• ${t('location_label', 'Location')}: ${newDepotLocation.trim()}` : ''}`,
      [
        { text: t('btn_cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('btn_confirm_add', 'Confirm Add'),
          onPress: () => {
            try {
              const res = registerNewDepot({
                id: cleanId,
                name: depotTitle,
                location: newDepotLocation.trim() || depotTitle,
                routes: [],
                password: 'Test@123',
              });

              setDepotAuditLogs((prev) => [
                {
                  id: Date.now().toString(),
                  action: 'DEPOT_CREATED',
                  code: `DEPOT-${cleanId}`,
                  fullName: depotTitle,
                  origin: newDepotLocation.trim() || 'Central',
                  destination: 'Active',
                  distance: 0,
                  depot: depotTitle,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
                ...prev,
              ]);

              setNewDepotId('');
              setNewDepotName('');
              setNewDepotLocation('');
              setSelectedDepotRoutes([]);
              setRouteDropdownOpen(false);

              Alert.alert(
                t('depot_created_success_title', 'Depot Created Successfully!'),
                `${t('depot_name_field', 'Depot')}: ${res.depot.name} (ID: ${cleanId})\n\n${t('depot_created_success_msg', 'Depot has been created and registered in the network.')}`,
                [{ text: t('tab_depot_audit_log', '📋 Depot Audit Log'), onPress: () => setDepotsTab('directory') }]
              );
            } catch (err) {
              Alert.alert(t('creation_error', 'Creation Error'), err.message || 'Failed to create depot.');
            }
          },
        },
      ]
    );
  };

  // ── Handler: Delete Depot (With confirmation, batch multi-selection, & translation) ──
  const handleDeleteDepot = () => {
    const targets = selectedDepotsToDelete.length > 0
      ? selectedDepotsToDelete
      : (selectedDepotToDelete ? [selectedDepotToDelete] : []);

    if (targets.length === 0) {
      Alert.alert(t('selection_required', 'Selection Required'), t('select_depot_delete_msg', 'Please select at least one depot to delete.'));
      return;
    }

    const finalReason = delDepotReason === 'Other' ? (delDepotCustomReason.trim() || 'Decommissioned by Admin') : delDepotReason;
    const names = targets.map((id) => {
      const d = depotsList.find((x) => String(x.id) === String(id));
      return d ? `${d.name} (ID: ${id})` : `Depot ${id}`;
    }).join(', ');

    Alert.alert(
      t('confirm_delete_depot_title', 'Confirm Delete Depot'),
      `${t('confirm_delete_depot_msg', 'Are you sure you want to delete these depots?')}\n\n• ${t('depot_name_field', 'Depot(s)')}: ${names}\n• ${t('decommission_reason_label', 'Reason')}: ${finalReason}`,
      [
        { text: t('btn_cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('btn_confirm_delete', 'Confirm Delete'),
          style: 'destructive',
          onPress: () => {
            targets.forEach((depotId) => {
              deleteDepot(depotId);

              // Unassign custom routes
              setCustomRoutes((prev) => prev.filter((r) => String(r.depotId) !== depotId));

              if (adminDepotFilter === depotId) {
                setAdminDepotFilter('all');
              }
              if (selectedDepot === depotId && typeof switchDepot === 'function') {
                const remaining = getAllDepots();
                const nextDepot = remaining.length > 0 ? String(remaining[0].id) : '1';
                switchDepot(nextDepot);
              }

              const dObj = depotsList.find((d) => String(d.id) === depotId);
              const dName = dObj ? dObj.name : `Depot ${depotId}`;

              setDepotAuditLogs((prev) => [
                {
                  id: (Date.now() + Math.random()).toString(),
                  action: 'DEPOT_DELETED',
                  code: `DEPOT-${depotId}`,
                  fullName: dName,
                  origin: 'Decommissioned',
                  destination: 'Decommissioned',
                  distance: 0,
                  depot: dName,
                  reason: finalReason,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
                ...prev,
              ]);
            });

            setSelectedDepotToDelete('');
            setSelectedDepotsToDelete([]);
            Alert.alert(
              t('depot_deleted_success_title', 'Depots Deleted'),
              `Successfully removed ${targets.length} depot(s) from the depot network.`
            );
          },
        },
      ]
    );
  };

  // ── Handler: Open & Download All Depot Login Credentials as CSV ──
  const handleOpenDepotCredentialsCsv = useCallback(async () => {
    try {
      const credentialsData = getDepotCredentialsList();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Depot_Login_Credentials_All_Depots_${dateStr}.csv`;

      const headers = [
        'Depot ID',
        'Depot Name',
        'Depot Facility Type',
        'Location / Address',
        'Assigned Routes',
        'Operation Name',
        'Designated Role',
        'Login Username',
        'Password',
        'Target Webpage / Screen',
        'Official Email',
      ];

      const rows = [];
      credentialsData.forEach((depot) => {
        const dId = String(depot.depotId);
        const dName = depot.depotName || `Depot ${dId}`;
        const dType = depot.isDefault ? 'Core Master Depot' : 'Custom Added Depot';
        const dLoc = depot.location || '';
        const dRoutes = Array.isArray(depot.routes) ? depot.routes.join('; ') : '';

        (depot.credentials || []).forEach((cred) => {
          rows.push([
            `Depot ${dId}`,
            dName,
            dType,
            dLoc,
            dRoutes,
            cred.operation || '',
            cred.role || '',
            cred.username || '',
            cred.password || '',
            cred.pageName || '',
            cred.email || '',
          ]);
        });
      });

      const success = await exportCsvFile(filename, [headers, ...rows]);
      if (success) {
        Alert.alert(
          'CSV File Opened',
          `Login credentials CSV for all ${credentialsData.length} operating depots has been generated and opened on your device.\n\nFile: ${filename}`
        );
      }
    } catch (err) {
      console.error('Failed to export depot credentials CSV:', err);
      Alert.alert('Export Error', `Could not open CSV file: ${err?.message || err}`);
    }
  }, [depotsList]);

  // ── Helper: Trigger Native File Browser for Spreadsheet / CSV ──
  const triggerDatasetFilePicker = useCallback(() => {
    if (typeof document !== 'undefined') {
      let fileInput = document.getElementById('admin-dataset-file-input');
      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.id = 'admin-dataset-file-input';
        fileInput.type = 'file';
        fileInput.accept = '.xlsx,.xls,.csv';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
      }
      fileInput.value = '';
      fileInput.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;
            const base64Data = dataUrl.split(',')[1] || '';
            setSelectedDatasetFile({
              name: file.name,
              size: file.size,
              type: file.type,
              base64Data: base64Data
            });
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
    } else {
      Alert.alert('Dataset Upload', 'Please open the app in a browser to upload spreadsheet or CSV files.');
    }
  }, []);

  // ── Handler: Select Dataset Spreadsheet / CSV File from Local Machine ──
  // Prompts for target depot details before browsing the file
  const handleSelectDatasetSpreadsheet = useCallback(() => {
    setDatasetUploadStatus(null);
    setDatasetDepotModalOpen(true);
  }, []);

  // ── Handler: When user selects a depot in the dataset depot modal ──
  const handleSelectDepotForDataset = useCallback((depotId, depotName) => {
    setDatasetTargetDepot(depotId);
    setDatasetTargetDepotName(depotName);
    setDatasetDepotModalOpen(false);
    setTimeout(() => {
      triggerDatasetFilePicker();
    }, 250);
  }, [triggerDatasetFilePicker]);

  // ── Handler: Upload & Apply Dataset Spreadsheet to Server ──
  const handleUploadDatasetFile = useCallback(async () => {
    if (!selectedDatasetFile) return;
    if (!datasetTargetDepot) {
      Alert.alert(
        t('depot_required', 'Depot Required'),
        t('depot_selection_required', 'Please select which depot to add this dataset to before uploading.')
      );
      setDatasetDepotModalOpen(true);
      return;
    }
    setIsUploadingDataset(true);
    setDatasetUploadStatus(null);
    try {
      const response = await fetch('/api/upload-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedDatasetFile.name,
          fileType: selectedDatasetFile.type,
          base64Data: selectedDatasetFile.base64Data,
          datasetType: 'spreadsheet',
          targetDepot: datasetTargetDepot,
          targetDepotName: datasetTargetDepotName || `Depot ${datasetTargetDepot}`
        })
      });
      const data = await response.json();
      if (data && data.ok) {
        setDatasetUploadStatus({
          isError: false,
          message: `✅ ${data.message || `Dataset "${selectedDatasetFile.name}" added to ${datasetTargetDepotName || 'Depot ' + datasetTargetDepot} successfully!`}`
        });
        const uploadedName = selectedDatasetFile.name;
        const targetDepotDisplay = datasetTargetDepotName || `Depot ${datasetTargetDepot}`;
        setSelectedDatasetFile(null);

        // Immediately inject added buses into fleet state with 0ms UI delay
        if (data.busesAdded > 0 && Array.isArray(data.addedBuses)) {
          if (typeof addBusesBatchToFleet === 'function') {
            addBusesBatchToFleet(data.addedBuses);
          }
        }

        // Immediately sync updated master route & schedule dataset with 0ms UI delay
        if (data.routesDataset) {
          syncDatasetWithServer(data.routesDataset);
        }
        setDatasetVersionTick((v) => v + 1);

        // Trigger fleet refresh
        if (typeof refreshFleet === 'function') {
          refreshFleet();
        }

        const reportLines = [];
        if (data.busesAdded > 0) reportLines.push(`• 🚌 Buses Added: ${data.busesAdded} vehicles registered`);
        if (data.routesAdded > 0) reportLines.push(`• 🛣️ New Routes: ${data.routesAdded} routes registered to dataset`);
        if (data.timetablesAdded > 0) reportLines.push(`• 🕒 Departure Times: ${data.timetablesAdded} timetable slots added`);
        if (data.schedulesAdded > 0) reportLines.push(`• 📋 Duty Schedules: ${data.schedulesAdded} schedules updated`);

        if (data.busesAdded > 0 && Array.isArray(data.addedBuses)) {
          const sampleList = data.addedBuses.slice(0, 5).map((b) => `• ${b.bm} (${b.regNo}) — Cat ${b.category}`).join('\n');
          const moreCount = data.addedBuses.length > 5 ? `\n• ...and ${data.addedBuses.length - 5} more` : '';
          Alert.alert(
            `✅ Dataset Updated Successfully!`,
            `Dataset "${uploadedName}" was processed successfully for ${targetDepotDisplay}.\n\n` +
            (reportLines.length > 0 ? reportLines.join('\n') + '\n\n' : '') +
            `Buses added to fleet:\n${sampleList}${moreCount}\n\nTotal fleet count is now updated (${data.totalFleetCount || ''} total buses).`
          );
        } else if (data.routesAdded > 0 || data.timetablesAdded > 0 || data.schedulesAdded > 0) {
          Alert.alert(
            `✅ Route & Timetable Dataset Updated!`,
            `Dataset "${uploadedName}" was processed successfully for ${targetDepotDisplay}.\n\n` +
            reportLines.join('\n') + '\n\n' +
            `Active schedules and departure timetables are now available across all dispatch consoles.`
          );
        } else {
          Alert.alert(
            'Dataset Added Successfully',
            `The spreadsheet "${uploadedName}" has been successfully added to ${targetDepotDisplay}.\n\nActive schedules, corridor routes, and allocation models are refreshed for this depot.`
          );
        }
      } else {
        throw new Error(data?.error || data?.details || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading dataset:', err);
      setDatasetUploadStatus({
        isError: true,
        message: `⚠️ Upload failed: ${err.message}`
      });
      Alert.alert('Upload Error', `Failed to upload dataset: ${err.message}`);
    } finally {
      setIsUploadingDataset(false);
    }
  }, [selectedDatasetFile, datasetTargetDepot, datasetTargetDepotName]);

  // ── Handler: Add Route to Depot (With confirmation & translation) ──
  const handleAddRouteToDepot = () => {
    // ── GUARD: Mandatory Depot Selection ──
    const activeDepot = routesSelectedDepot && routesSelectedDepot !== 'all' ? routesSelectedDepot : (depotTargetDepot && depotTargetDepot !== 'all' && depotTargetDepot !== 'custom' ? depotTargetDepot : '');
    if (!activeDepot || activeDepot === 'all') {
      Alert.alert(
        t('depot_required_title', 'Operating Depot Required'),
        t('depot_required_add_route_msg', 'Please select an operating depot from the drop-down menu before adding a route. The action cannot proceed without selecting a depot.')
      );
      return;
    }
    if (!depotRouteFullName.trim()) {
      Alert.alert(t('missing_field', 'Missing Field'), t('enter_route_fullname_msg', 'Please enter Route [Full Name].'));
      return;
    }
    if (!depotRouteShortName.trim()) {
      Alert.alert(t('missing_field', 'Missing Field'), t('enter_route_code_msg', 'Please enter Route [Short Name] / Code.'));
      return;
    }
    if (!depotRouteOrigin.trim()) {
      Alert.alert(t('missing_field', 'Missing Field'), t('enter_route_origin_msg', 'Please enter Route Starting Point (Origin).'));
      return;
    }
    if (!depotRouteDestination.trim()) {
      Alert.alert(t('missing_field', 'Missing Field'), t('enter_route_dest_msg', 'Please enter Route Destination Name.'));
      return;
    }
    const distNum = parseFloat(depotRouteDistance);
    if (!depotRouteDistance || isNaN(distNum) || distNum <= 0) {
      Alert.alert(t('invalid_distance', 'Invalid Distance'), t('enter_valid_dist_msg', 'Please enter a valid total distance in km (e.g. 28.5).'));
      return;
    }

    const cleanCode = depotRouteShortName.trim().toUpperCase().replace(/\s+/g, '');
    const alreadyExists = allAvailableRoutes.some((r) => r.code === cleanCode || r.id === cleanCode);
    if (alreadyExists) {
      Alert.alert(t('route_exists', 'Route Exists'), `Route "${cleanCode}" ${t('route_already_active_msg', 'is already active in the depot network.')}`);
      return;
    }

    const resolvedDepotId = depotTargetDepot === 'custom' ? (depotCustomName.trim() || 'Depot 3') : depotTargetDepot;
    const targetDepotObj = depotsList.find((d) => String(d.id) === String(resolvedDepotId));
    const resolvedDepotName = targetDepotObj ? targetDepotObj.name : (resolvedDepotId === '1'
      ? 'Depot 1 (Chandapura)'
      : resolvedDepotId === '2'
      ? 'Depot 2 (Attibele / Hoskote)'
      : `Depot ${resolvedDepotId}`);

    const parsedTimetables = (depotRouteTimetables || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const finalTimetables = parsedTimetables.length > 0
      ? parsedTimetables
      : ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'];

    Alert.alert(
      t('confirm_add_route_title', 'Confirm Add Route'),
      `${t('confirm_add_route_msg', 'Are you sure you want to add this route?')}\n\n• ${t('route_short_name_label', 'Route Code')}: ${cleanCode}\n• ${t('route_full_name_label', 'Route Full Name')}: ${depotRouteFullName.trim()}\n• ${t('route_origin_label', 'Origin')}: ${depotRouteOrigin.trim()}\n• ${t('route_destination_label', 'Destination')}: ${depotRouteDestination.trim()}\n• ${t('route_distance_label', 'Total Distance')}: ${distNum} km\n• ${t('operating_depot_label', 'Operating Depot')}: ${resolvedDepotName}`,
      [
        { text: t('btn_cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('btn_confirm_add', 'Confirm Add'),
          onPress: () => {
            const newRoute = {
              id: cleanCode,
              code: cleanCode,
              name: `${depotRouteOrigin.trim()} ➔ ${depotRouteDestination.trim()} (${cleanCode})`,
              fullName: depotRouteFullName.trim(),
              shortName: cleanCode,
              origin: depotRouteOrigin.trim(),
              destination: depotRouteDestination.trim(),
              distance: distNum,
              fullDutyKm: parseFloat((distNum * 2).toFixed(1)),
              category: depotRouteCategory || 'Standard',
              routeComplexity: depotRouteCategory || 'Standard',
              requiredCat: depotRouteCategory === 'Complex' ? 'A' : (depotRouteCategory === 'Moderate' ? 'B' : 'B'),
              drainSoc: Math.min(95, Math.max(10, Math.round(distNum * 0.85))),
              timeComplexity: depotRouteTimeComplexity || 'Normal',
              timetables: finalTimetables,
              shift: depotRouteShift || 'General Shift',
              depotId: resolvedDepotId,
              depotName: resolvedDepotName,
              custom: true,
              createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            // Attach route to depot in accounts and sync across devices
            addRouteToDepot(resolvedDepotId, newRoute);
            try {
              addRouteToDataset(resolvedDepotId, newRoute);
              api.updateRoutesDataset({ action: 'add_route', depotId: resolvedDepotId, route: newRoute }).catch(() => {});
            } catch (_) {}
            setDatasetVersionTick((v) => v + 1);

            setCustomRoutes((prev) => [newRoute, ...prev]);
            setDeletedRouteCodes((prev) => prev.filter((c) => c !== cleanCode));
            setDepotAuditLogs((prev) => [
              {
                id: Date.now().toString(),
                action: 'ADDED',
                code: cleanCode,
                fullName: depotRouteFullName.trim(),
                origin: depotRouteOrigin.trim(),
                destination: depotRouteDestination.trim(),
                distance: distNum,
                depot: resolvedDepotName,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
              ...prev,
            ]);

            setDepotRouteFullName('');
            setDepotRouteShortName('');
            setDepotRouteOrigin('');
            setDepotRouteDestination('');
            setDepotRouteDistance('');
            setDepotCustomName('');

            Alert.alert(
              t('route_registered_success_title', 'Route Registered Successfully'),
              `${t('route_short_name_label', 'Route')}: ${cleanCode}\n${t('route_full_name_label', 'Full Name')}: ${newRoute.fullName}\n${t('route_origin_label', 'Origin')}: ${newRoute.origin} ➔ ${newRoute.destination}\n${t('route_distance_label', 'Total Distance')}: ${distNum} km\n${t('operating_depot_label', 'Operating Depot')}: ${resolvedDepotName}`,
              [{ text: t('tab_depot_audit_log', '📋 Depot Audit Log'), onPress: () => setDepotsTab('directory') }]
            );
          },
        },
      ]
    );
  };

  // ── Handler: Delete Route from Depot (With confirmation, batch multi-selection, & translation) ──
  const handleDeleteRouteFromDepot = () => {
    // ── GUARD: Mandatory Depot Selection ──
    if (!routesSelectedDepot || routesSelectedDepot === 'all') {
      Alert.alert(
        t('depot_required_title', 'Operating Depot Required'),
        t('depot_required_del_route_msg', 'Please select an operating depot from the drop-down menu before deleting routes. The action cannot proceed without selecting a depot.')
      );
      return;
    }
    const targets = selectedRoutesToDelete.length > 0
      ? selectedRoutesToDelete
      : (delRouteSelectedCode ? [delRouteSelectedCode] : []);

    if (targets.length === 0) {
      Alert.alert(t('selection_required', 'Selection Required'), t('select_route_delete_msg', 'Please select at least one route to delete.'));
      return;
    }

    const finalReason = delRouteReason === 'Other' ? (delRouteCustomReason.trim() || 'Decommissioned by Admin') : delRouteReason;

    Alert.alert(
      t('confirm_delete_route_title', 'Confirm Delete Route'),
      `${t('confirm_delete_route_msg', 'Are you sure you want to delete the selected route(s)?')}\n\n• ${t('route_short_name_label', 'Routes')} (${targets.length}): ${targets.slice(0, 5).join(', ')}${targets.length > 5 ? '... and ' + (targets.length - 5) + ' more' : ''}\n• ${t('decommission_reason_label', 'Reason')}: ${finalReason}`,
      [
        { text: t('btn_cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('btn_confirm_delete', 'Confirm Delete'),
          style: 'destructive',
          onPress: () => {
            targets.forEach((codeToDelete) => {
              const matchedRoute = allAvailableRoutes.find((r) => r.code === codeToDelete || r.id === codeToDelete);
              const routeDepotId = String(matchedRoute?.depotId || '1');
              removeRouteFromDepot(routeDepotId, codeToDelete);
              setDeletedRouteCodes((prev) => [...prev, codeToDelete]);
              setCustomRoutes((prev) => prev.filter((r) => r.code !== codeToDelete && r.id !== codeToDelete));
              setDepotAuditLogs((prev) => [
                {
                  id: (Date.now() + Math.random()).toString(),
                  action: 'DELETED',
                  code: codeToDelete,
                  fullName: matchedRoute?.fullName || matchedRoute?.name || codeToDelete,
                  origin: matchedRoute?.origin || '',
                  destination: matchedRoute?.destination || '',
                  distance: matchedRoute?.distance || 0,
                  depot: matchedRoute?.depotName || (matchedRoute?.depotId === '2' ? 'Depot 2' : 'Depot 1'),
                  reason: finalReason,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
                ...prev,
              ]);
            });

            setDelRouteSelectedCode('');
            setSelectedRoutesToDelete([]);
            Alert.alert(
              t('route_deleted_success_title', 'Routes Decommissioned'),
              `Successfully removed ${targets.length} route(s) from active service.`
            );
          },
        },
      ]
    );
  };

  // ── Handlers: Driver Induction & Decommissioning ──
  const handleAddDriver = () => {
    // ── GUARD: Mandatory Depot Selection ──
    const activeDriverDepot = driversSelectedDepot && driversSelectedDepot !== 'all' ? driversSelectedDepot : (newDriverDepot && newDriverDepot !== 'all' ? newDriverDepot : '');
    if (!activeDriverDepot || activeDriverDepot === 'all') {
      Alert.alert(
        t('depot_required_title', 'Operating Depot Required'),
        t('depot_required_add_driver_msg', 'Please select an operating depot from the drop-down menu before adding a bus driver. The action cannot proceed without selecting a depot.')
      );
      return;
    }
    if (!newDriverName.trim()) {
      Alert.alert(t('missing_field', 'Missing Field'), 'Please enter Driver Full Name.');
      return;
    }
    const cleanId = newDriverId.trim() || `DRV-${Date.now().toString().slice(-4)}`;
    const targetDepot = newDriverDepot || '1';
    const targetDepotObj = depotsList.find((d) => String(d.id) === String(targetDepot));
    const targetDepotName = targetDepotObj ? targetDepotObj.name : `Depot ${targetDepot}`;

    const newDriverObj = {
      id: cleanId,
      name: newDriverName.trim(),
      depot: String(targetDepot),
      phone: newDriverPhone.trim() || '—',
      shift: newDriverShift || 'General Shift',
      category: newDriverCategory || 'B',
      status: 'Active',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setDriversList((prev) => [newDriverObj, ...prev]);
    setDriverAuditLogs((prev) => [
      {
        id: Date.now().toString(),
        action: 'DRIVER_ADDED',
        driverId: cleanId,
        driverName: newDriverName.trim(),
        depot: targetDepotName,
        reason: 'New Driver Induction',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);

    try {
      api.addDriver(newDriverObj).catch(() => {});
    } catch (_) {}

    setNewDriverName('');
    setNewDriverId('');
    setNewDriverPhone('');

    Alert.alert(
      'Driver Inducted Successfully',
      `Driver ${newDriverObj.name} (Badge: ${cleanId}) has been registered and assigned to ${targetDepotName}.`
    );
  };

  const handleDeleteDrivers = () => {
    // ── GUARD: Mandatory Depot Selection ──
    if (!driversSelectedDepot || driversSelectedDepot === 'all') {
      Alert.alert(
        t('depot_required_title', 'Operating Depot Required'),
        t('depot_required_del_driver_msg', 'Please select an operating depot from the drop-down menu before withdrawing drivers. The action cannot proceed without selecting a depot.')
      );
      return;
    }
    if (selectedDriversToDelete.length === 0) {
      Alert.alert(t('selection_required', 'Selection Required'), 'Please select at least one driver to delete / decommission.');
      return;
    }

    const finalReason = delDriverReason === 'Other' ? (delDriverCustomReason.trim() || 'Decommissioned by Admin') : delDriverReason;
    const names = selectedDriversToDelete.map((id) => {
      const d = driversList.find((x) => x.id === id);
      return d ? `${d.name} (${id})` : id;
    }).join(', ');

    Alert.alert(
      'Confirm Decommission Driver(s)',
      `Are you sure you want to withdraw ${selectedDriversToDelete.length} driver(s)?\n\n• Drivers: ${names}\n• Reason: ${finalReason}`,
      [
        { text: t('btn_cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('btn_confirm_delete', 'Confirm Withdraw'),
          style: 'destructive',
          onPress: () => {
            const targets = [...selectedDriversToDelete];
            setDriversList((prev) => prev.filter((d) => !targets.includes(d.id)));
            targets.forEach((id) => {
              const matched = driversList.find((d) => d.id === id);
              setDriverAuditLogs((prev) => [
                {
                  id: (Date.now() + Math.random()).toString(),
                  action: 'DRIVER_DECOMMISSIONED',
                  driverId: id,
                  driverName: matched ? matched.name : id,
                  depot: matched ? `Depot ${matched.depot}` : 'Depot',
                  reason: finalReason,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
                ...prev,
              ]);
            });

            try {
              api.deleteDrivers({ ids: targets, reason: finalReason }).catch(() => {});
            } catch (_) {}

            setSelectedDriversToDelete([]);
            Alert.alert(
              'Drivers Decommissioned',
              `Successfully withdrawn ${targets.length} driver(s) from active depot roster.`
            );
          },
        },
      ]
    );
  };

  // Section 1: Allocated Buses Controls
  const [allocSearch, setAllocSearch] = useState('');
  const [allocSortBy, setAllocSortBy] = useState('route-asc');

  // Section 2: Not-Allocated Buses Controls
  const [notAllocSearch, setNotAllocSearch] = useState('');
  const [notAllocSortBy, setNotAllocSortBy] = useState('bm-asc');

  // Section 3: Available Buses Controls
  const [availCategoryFilter, setAvailCategoryFilter] = useState('all');
  const [availSortBy, setAvailSortBy] = useState('soc-desc');
  const [availSearch, setAvailSearch] = useState('');

  // Section 4: Total Buses Controls
  const [totalStatusFilter, setTotalStatusFilter] = useState('all');
  const [totalCategoryFilter, setTotalCategoryFilter] = useState('all');
  const [totalSortBy, setTotalSortBy] = useState('bm-asc');
  const [totalSearch, setTotalSearch] = useState('');

  // Add / Delete Bus form states (Matching admin.html)
  const [addDeleteTab, setAddDeleteTab] = useState('delete'); // 'delete' | 'add' | 'audit'
  const [addBm, setAddBm] = useState('');
  const [addReg, setAddReg] = useState('');
  const [addCat, setAddCat] = useState('B');
  const [addSoc, setAddSoc] = useState('100');
  const [addDepot, setAddDepot] = useState('');
  const [addDepotDropdownOpen, setAddDepotDropdownOpen] = useState(false);
  const [addBusDepotSearchQuery, setAddBusDepotSearchQuery] = useState('');
  const [addReasonSelect, setAddReasonSelect] = useState('New Electric Bus Induction (Ashok Leyland EiV12)');
  const [addReasonDetail, setAddReasonDetail] = useState('');

  const [delSearchQuery, setDelSearchQuery] = useState('');
  const [delSelectedBm, setDelSelectedBm] = useState('');
  const [selectedDelBms, setSelectedDelBms] = useState([]);
  const [delReg, setDelReg] = useState('');
  const [delDepot, setDelDepot] = useState('');
  const [delDepotDropdownOpen, setDelDepotDropdownOpen] = useState(false);
  const [delBusDepotSearchQuery, setDelBusDepotSearchQuery] = useState('');
  const [delReasonSelect, setDelReasonSelect] = useState('Major Breakdown / Motor Defect');
  const [delReasonDetail, setDelReasonDetail] = useState('');

  // Total Fleet Multi-Selection & Batch Delete States
  const [fleetMultiSelectMode, setFleetMultiSelectMode] = useState(false);
  const [selectedFleetBms, setSelectedFleetBms] = useState([]);

  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'audit_1',
      action: 'ADDED',
      bm: 'BM304',
      reg: 'KA51AH3040',
      depot: '2',
      reasonCategory: 'New Electric Bus Induction (Ashok Leyland EiV12)',
      detail: 'Inducted into Depot 2 under BMTC fleet expansion.',
      timestamp: '03:15 PM, 21 Oct 2026',
      user: 'admin@bmtc.gov.in',
    },
    {
      id: 'audit_2',
      action: 'ADDED',
      bm: 'BM303',
      reg: 'KA51AH3030',
      depot: '1',
      reasonCategory: 'Fleet Expansion (Depot 32)',
      detail: 'Inducted into Depot 1 fleet yard.',
      timestamp: '11:45 AM, 20 Oct 2026',
      user: 'admin@bmtc.gov.in',
    },
    {
      id: 'audit_3',
      action: 'DELETED',
      bm: 'BM099',
      reg: 'KA51AH0099',
      depot: '1',
      reasonCategory: 'Transferred to Central Workshop',
      detail: 'Scheduled overhaul and inverter replacement.',
      timestamp: '09:00 AM, 19 Oct 2026',
      user: 'admin@bmtc.gov.in',
    },
  ]);

  // Live Sync Fleet Audit Log with Website & Backend
  React.useEffect(() => {
    let isMounted = true;
    const fetchAudit = async () => {
      try {
        const res = await api.checkHealth();
        if (res.ok && res.data && isMounted) {
          const syncedLogs = [];
          if (res.data.addedBuses && typeof res.data.addedBuses === 'object') {
            Object.keys(res.data.addedBuses).forEach((bm) => {
              const b = res.data.addedBuses[bm];
              if (b) {
                syncedLogs.push({
                  id: `synced_add_${bm}`,
                  action: 'ADDED',
                  bm: String(b.busNumber || b.bm || bm).toUpperCase(),
                  reg: b.regNumber || b.regNo || `KA51AH${bm.replace(/\D/g, '').padStart(4, '0')}`,
                  depot: String(b.depot || '1'),
                  reasonCategory: b.reason || 'New Fleet Induction (Ashok Leyland EiV12)',
                  detail: b.details || b.note || 'Inducted into active fleet',
                  timestamp: b.timestamp || b.addedAt || 'Live Sync Record',
                  user: b.user || 'admin@bmtc.gov.in',
                });
              }
            });
          }
          if (res.data.deletedBuses && typeof res.data.deletedBuses === 'object') {
            Object.keys(res.data.deletedBuses).forEach((bm) => {
              const b = res.data.deletedBuses[bm];
              if (b) {
                syncedLogs.push({
                  id: `synced_del_${bm}`,
                  action: 'DELETED',
                  bm: String(b.busNumber || b.bm || bm).toUpperCase(),
                  reg: b.regNumber || b.regNo || `KA51AH${bm.replace(/\D/g, '').padStart(4, '0')}`,
                  depot: String(b.depot || '1'),
                  reasonCategory: b.reason || b.deletionReason || 'Major Breakdown / Decommissioned',
                  detail: b.details || b.note || 'Decommissioned from operations',
                  timestamp: b.timestamp || b.deletedAt || 'Live Sync Record',
                  user: b.user || 'admin@bmtc.gov.in',
                });
              }
            });
          }
          if (syncedLogs.length > 0) {
            setAuditLogs(syncedLogs);
          }
        }
      } catch (err) {
        console.warn('Could not sync fleet audit logs:', err);
      }
    };
    fetchAudit();
    const interval = setInterval(fetchAudit, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filtered buses for delete section (filters by delSearchQuery when provided)
  const filteredDelBuses = buses.filter((bus) => {
    if (!delSearchQuery.trim()) return true;
    const q = delSearchQuery.trim().toUpperCase();
    return (
      bus.bmNumber.toUpperCase().includes(q) ||
      (bus.regNo && bus.regNo.toUpperCase().includes(q))
    );
  });

  // ── Multi-Depot Fleet Partitioning (Depot 1 & Depot 2) ──
  const d1Buses = buses.filter((b) => String(b.depot || '1') === '1');
  const d2Buses = buses.filter((b) => String(b.depot || '1') === '2');

  const allAllocatedDuties = allocatedDuties || [];
  const getDutyDepot = (d) => {
    if (d.depot && (String(d.depot) === '1' || String(d.depot) === '2')) return String(d.depot);
    const bm = String(d.bm || d.bmNumber || '').toUpperCase().trim();
    const bus = buses.find((b) => b.bmNumber === bm);
    if (bus && bus.depot) return String(bus.depot);
    const rCode = String(d.routeCode || d.busNumber || d.routeId || '').toUpperCase();
    if (['361C', '399C', '328H', '500DC', 'KBS3F'].some((c) => rCode.includes(c))) return '2';
    return getBusDepot(bm);
  };
  const d1AllocatedDuties = allAllocatedDuties.filter((d) => getDutyDepot(d) === '1');
  const d2AllocatedDuties = allAllocatedDuties.filter((d) => getDutyDepot(d) === '2');

  const isBusAvailableForScheduling = (b) => {
    const bm = String(b.bmNumber || b.id || '').toUpperCase().trim();
    const isAlloc = b.isAllocated || allAllocatedDuties.some((d) => String(d.bm || d.bmNumber || d.busId || '').toUpperCase().trim() === bm);
    const isLock = b.isLocked || b.isCharging || b.isCleaning || lockedBuses.some((lb) => String(lb.bm || lb.bmNumber || '').toUpperCase().trim() === bm);
    return !isAlloc && !isLock && b.status !== 'Blocked' && b.status !== 'Deleted';
  };

  const allAvailableBuses = buses.filter(isBusAvailableForScheduling);
  const d1AvailableBuses = d1Buses.filter(isBusAvailableForScheduling);
  const d2AvailableBuses = d2Buses.filter(isBusAvailableForScheduling);

  const isDutyMatch = (d, bm) => {
    const cleanBm = String(bm || '').toUpperCase().trim();
    const dutyBm = String(d.bm || d.bmNumber || d.busId || '').toUpperCase().trim();
    return dutyBm === cleanBm;
  };
  const allNotAllocatedBuses = buses.filter((b) => !allAllocatedDuties.some((d) => isDutyMatch(d, b.bmNumber)));
  const d1NotAllocatedBuses = d1Buses.filter((b) => !d1AllocatedDuties.some((d) => isDutyMatch(d, b.bmNumber)));
  const d2NotAllocatedBuses = d2Buses.filter((b) => !d2AllocatedDuties.some((d) => isDutyMatch(d, b.bmNumber)));

  // Current View based on selected adminDepotFilter ('all' or any specific depot like '1', '2', '3'...)
  const viewBuses = useMemo(() => {
    if (adminDepotFilter === 'all') return buses;
    return buses.filter((b) => String(b.depot || '1').replace(/^DEPOT\s*/i, '').trim() === String(adminDepotFilter));
  }, [buses, adminDepotFilter]);

  const viewAllocatedDuties = useMemo(() => {
    if (adminDepotFilter === 'all') return allAllocatedDuties;
    return allAllocatedDuties.filter((d) => {
      const dDepot = String(d.depot || (buses.find((b) => b.bmNumber === d.bm)?.depot) || '1').replace(/^DEPOT\s*/i, '').trim();
      return dDepot === String(adminDepotFilter);
    });
  }, [allAllocatedDuties, buses, adminDepotFilter]);

  const viewAvailableBuses = useMemo(() => {
    return viewBuses.filter(
      (b) =>
        b.status === 'Available' &&
        !viewAllocatedDuties.some((d) => isDutyMatch(d, b.bmNumber)) &&
        !b.isLocked &&
        !b.isCharging &&
        !b.isCleaning
    );
  }, [viewBuses, viewAllocatedDuties]);

  const viewNotAllocatedBuses = useMemo(() => {
    return viewBuses.filter((b) => !viewAllocatedDuties.some((d) => isDutyMatch(d, b.bmNumber)));
  }, [viewBuses, viewAllocatedDuties]);

  // ── Candidate Bus Evaluation (Exact Match to website Matrix Status & Peak Rules) ──
  const timeCatInfo = getTimeCategory(scheduledTime);
  const isPeak = Boolean(timeCatInfo && timeCatInfo.isPeak);
  const complexity = getRouteComplexity(selectedRoute);
  const matrixStatus = getMatrixStatus(complexity, timeCatInfo);

  // Available buses from the route's assigned depot
  const routeDepotBuses = buses.filter((b) => String(b.depot || '1') === selectedRouteDepot);
  const routeReadyBuses = routeDepotBuses.filter(isBusAvailableForScheduling);
  const candidatePool = routeReadyBuses.length > 0 ? routeReadyBuses : routeDepotBuses;

  const candidateBus = useMemo(() => {
    let sorted = [];
    if (matrixStatus === 'A') {
      // STRICT RULE: ONLY Category A buses are eligible! If none available, do NOT fallback to B or C
      sorted = candidatePool.filter((b) => b.busCategory === 'A').sort((a, b) => (b.soc || 0) - (a.soc || 0));
    } else if (matrixStatus === 'A/B') {
      // Standard / Moderate routes: Category C strictly excluded under ALL conditions!
      if (isPeak) {
        // Peak: Category A primary, Category B fallback
        const catABuses = candidatePool.filter((b) => b.busCategory === 'A').sort((a, b) => (b.soc || 0) - (a.soc || 0));
        const catBBuses = candidatePool.filter((b) => b.busCategory === 'B').sort((a, b) => (b.soc || 0) - (a.soc || 0));
        sorted = [...catABuses, ...catBBuses];
      } else {
        // Normal: Category B primary, Category A fallback
        const catBBuses = candidatePool.filter((b) => b.busCategory === 'B').sort((a, b) => (b.soc || 0) - (a.soc || 0));
        const catABuses = candidatePool.filter((b) => b.busCategory === 'A').sort((a, b) => (b.soc || 0) - (a.soc || 0));
        sorted = [...catBBuses, ...catABuses];
      }
    } else if (matrixStatus === 'B/C/A' || (complexity === 'simple' && isPeak)) {
      // Simple + Peak: Category B Primary, Category C 1st Fallback, Category A 2nd Fallback
      const catBBuses = candidatePool.filter((b) => b.busCategory === 'B').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      const catCBuses = candidatePool.filter((b) => b.busCategory === 'C').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      const catABuses = candidatePool.filter((b) => b.busCategory === 'A').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      sorted = [...catBBuses, ...catCBuses, ...catABuses];
    } else {
      // Simple + Normal: Category C prioritized first, then Category B, then A
      const catCBuses = candidatePool.filter((b) => b.busCategory === 'C').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      const catBBuses = candidatePool.filter((b) => b.busCategory === 'B').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      const catABuses = candidatePool.filter((b) => b.busCategory === 'A').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      sorted = [...catCBuses, ...catBBuses, ...catABuses];
    }
    return sorted[0] || null;
  }, [candidatePool, matrixStatus]);

  const candidateSoc = candidateBus ? candidateBus.soc : 85;
  const fullDutyDistance = candidateBus ? Math.round(Math.max(0, candidateSoc - 10) * 1.42) : 107;

  // Allocated buses specifically on the selected route (Exact match to admin.html bus-allocated-kpi)
  const routeAllocatedCount = (allocatedDuties || []).filter((d) => {
    const r = String(d.routeCode || d.busNumber || d.routeId || '').toUpperCase().replace(/^ROUTE\s*/i, '');
    const sel = String(selectedRoute.code || '').toUpperCase().replace(/^ROUTE\s*/i, '');
    return r === sel;
  }).length;

  // Required SOC for the selected route (Exact match to admin.html updated bus-total KPI)
  // Pure Trip Battery Drain for one-way distance (matches Google 19-23%)
  const routeTripDrainSoc = useMemo(() => {
    if (!selectedRoute) return '—';
    const depTime = scheduledTime || selectedRoute?.timetables?.[0] || '01:10 PM';
    const dist = Number(selectedRoute.distance || selectedRoute.distKm || 28.7);
    const calculated = getEstimatedTripDrainSoc(dist, null, depTime);
    return calculated > 0 ? `${calculated}%` : '—';
  }, [selectedRoute, scheduledTime]);

  // Full Shift Duty Battery Drain for actual_km (matches Google 56-70%)
  const routeDutyDrainSoc = useMemo(() => {
    if (!selectedRoute) return '—';
    const depTime = scheduledTime || selectedRoute?.timetables?.[0] || '01:10 PM';
    const dutyDist = Number(selectedRoute.fullDutyKm || selectedRoute.actualKm || ((Number(selectedRoute.distance || selectedRoute.distKm) || 28.7) * 3));
    const calculated = getEstimatedTripDrainSoc(dutyDist, null, depTime);
    return calculated > 0 ? `${calculated}%` : '—';
  }, [selectedRoute, scheduledTime]);

  const isSplitDutyRoute = Boolean(
    (selectedRoute?.chargingOcc && selectedRoute.chargingOcc > 0) ||
    (selectedRoute?.noChargingOcc && selectedRoute.noChargingOcc > 0) ||
    selectedRoute?.splitDuty
  );

  // Uncharged Shift Duty Required SOC (includes 15% safety buffer).
  // For 188.54 km, base drain is 94.27% + 15% = 109.3% (>100%), which mathematically requires split duty!
  const unchargedDutyRequiredSoc = useMemo(() => {
    if (!selectedRoute) return 0;
    const depTime = scheduledTime || selectedRoute?.timetables?.[0] || '01:10 PM';
    const dutyDist = Number(selectedRoute.fullDutyKm || selectedRoute.actualKm || 0);
    if (!dutyDist) return 0;
    const drainInfo = getBusDrainRatePerKm(null, depTime);
    return Math.round(dutyDist * drainInfo.effectiveDrainPerKm + 15);
  }, [selectedRoute, scheduledTime]);

  const routeRequiredSoc = useMemo(() => {
    if (!selectedRoute) return '—';
    const depTime = scheduledTime || selectedRoute?.timetables?.[0] || '01:10 PM';
    // When route has split duty / mid-duty charge planned, dispatch required SOC is based on the continuous single-leg stretch:
    const targetDist = (isSplitDutyRoute || selectedRoute.singleChargeReqKm || unchargedDutyRequiredSoc > 100)
      ? Number(selectedRoute.singleChargeReqKm || (selectedRoute.fullDutyKm ? selectedRoute.fullDutyKm / 2 : 91.9))
      : Number(selectedRoute.distance || selectedRoute.distKm || 28.7);
    const calculated = getRequiredSingleChargeSoc(targetDist, selectedRoute, null, depTime);
    return calculated > 0 ? `${calculated}%` : '—';
  }, [selectedRoute, scheduledTime, isSplitDutyRoute, unchargedDutyRequiredSoc]);

  // Duties allocated specifically to routeAllocatedModalRoute (independent of departure time, matching admin.html)
  const routeAllocatedDuties = useMemo(() => {
    if (!routeAllocatedModalRoute) return [];
    const targetCode = String(routeAllocatedModalRoute).toUpperCase().replace(/^ROUTE\s*/i, '');
    return (allocatedDuties || []).filter((d) => {
      const r = String(d.routeCode || d.busNumber || d.routeId || '').toUpperCase().replace(/^ROUTE\s*/i, '');
      return r === targetCode;
    });
  }, [allocatedDuties, routeAllocatedModalRoute]);

  const filteredRouteAllocatedDuties = useMemo(() => {
    if (!routeAllocatedSearch.trim()) return routeAllocatedDuties;
    const q = routeAllocatedSearch.trim().toLowerCase();
    return routeAllocatedDuties.filter((d) => {
      return (
        String(d.bm || d.bmNumber || '').toLowerCase().includes(q) ||
        String(d.reg || d.regNo || '').toLowerCase().includes(q) ||
        String(d.driver || '').toLowerCase().includes(q) ||
        String(d.shift || '').toLowerCase().includes(q)
      );
    });
  }, [routeAllocatedDuties, routeAllocatedSearch]);

  // Allowed categories matrix matching scheduling.html
  const allowedMatrix = {
    standard: { NORMAL: ['B', 'A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
    simple: { NORMAL: ['B', 'C', 'A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
    moderate: { NORMAL: ['B', 'A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
    complex: { NORMAL: ['A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
  };
  const timeKey = (timeCatInfo && (timeCatInfo.key || timeCatInfo.category)) || (isPeak ? 'PEAK' : 'NORMAL');
  const allowedCategories = (allowedMatrix[complexity.toLowerCase()] || allowedMatrix.standard)[timeKey] || ['A'];
  const requiresCatA = complexity.toLowerCase() === 'complex' || isPeak;
  const isMatrixCompliant = candidateBus
    ? (requiresCatA ? candidateBus.busCategory === 'A' : allowedCategories.includes(candidateBus.busCategory || 'B'))
    : false;
  const sortedCats = allowedCategories.slice().sort().join('/');
  const catDisplay = requiresCatA ? 'A' : sortedCats;

  // ── Fleet Accounting Summary Breakdown ──
  const totalFleetAvailableCount = viewAvailableBuses.length;
  const totalFleetOnRouteCount = viewAllocatedDuties.length;
  const totalFleetLockedCount = viewBuses.filter((b) => b.isLocked || b.isCharging || b.isCleaning).length;

  // Scoped locked buses for the active depot filter (Updates dynamically when depot changes)
  const viewLockedBuses = useMemo(() => {
    return lockedBuses.filter((b) => {
      const bmClean = String(b.bm || b.bmNumber || '').toUpperCase().trim();
      const isDeleted = localDeletedBuses && (localDeletedBuses[bmClean] || Object.keys(localDeletedBuses).some((k) => k.toUpperCase().trim() === bmClean));
      if (isDeleted) return false;
      if (adminDepotFilter === 'all') return true;
      const bDepot = String(b.depot || (buses.find((x) => x.bmNumber === b.bm)?.depot) || '1');
      return bDepot === adminDepotFilter;
    });
  }, [lockedBuses, adminDepotFilter, buses, localDeletedBuses]);

  const viewChargingLockedCount = useMemo(() => {
    return viewLockedBuses.filter((b) => {
      const p = String(b.page || b.type || b.reason || '').toLowerCase();
      return (p.includes('charg') || b.isCharging) && !b.isTurnaround;
    }).length;
  }, [viewLockedBuses]);

  const viewCleaningLockedCount = useMemo(() => {
    return viewLockedBuses.filter((b) => {
      const p = String(b.page || b.type || b.reason || '').toLowerCase();
      return (p.includes('clean') || b.isCleaning) && !b.isTurnaround;
    }).length;
  }, [viewLockedBuses]);

  const viewTurnaroundLockedCount = useMemo(() => {
    return viewLockedBuses.filter((b) => {
      const p = String(b.page || b.type || b.reason || '').toLowerCase();
      return Boolean(b.isTurnaround || p.includes('turnaround'));
    }).length;
  }, [viewLockedBuses]);

  // Helper to determine if a bus is currently locked in either charging or cleaning
  const isBusLockedInService = (bm) => {
    const cleanBm = String(bm || '').toUpperCase().trim();
    if (!cleanBm) return false;
    const inLockedList = (lockedBuses || []).some((l) => {
      const lBm = String(l.bm || l.bmNumber || '').toUpperCase().trim();
      return lBm === cleanBm;
    });
    if (inLockedList) return true;
    const bus = (buses || []).find((x) => String(x.bmNumber || x.bm || x.id || '').toUpperCase().trim() === cleanBm);
    if (bus) {
      if (bus.isLocked || bus.isCharging || bus.isCleaning) return true;
      if (bus.status === 'Charging' || bus.status === 'Cleaning') return true;
    }
    return false;
  };

  // Unlocked Turnaround lists (strictly excludes any bus currently locked in charging or cleaning)
  const turnaroundAllList = useMemo(() => {
    return (completedRoutesLog || []).filter((item) => {
      const bm = String(item.bm || item.bmNumber || '').toUpperCase().trim();
      const isDeleted = localDeletedBuses && (localDeletedBuses[bm] || Object.keys(localDeletedBuses).some((k) => k.toUpperCase().trim() === bm));
      if (isDeleted) return false;
      return !isBusLockedInService(bm);
    });
  }, [completedRoutesLog, buses, lockedBuses, localDeletedBuses]);

  const turnaroundDepot1List = useMemo(() => {
    return turnaroundAllList.filter((item) => {
      const bm = String(item.bm || item.bmNumber || '').toUpperCase().trim();
      const isDeleted = localDeletedBuses && (localDeletedBuses[bm] || Object.keys(localDeletedBuses).some((k) => k.toUpperCase().trim() === bm));
      if (isDeleted) return false;
      const bDepot = String(item.depot || (buses.find((x) => x.bmNumber === bm)?.depot) || '1');
      return bDepot === '1';
    });
  }, [turnaroundAllList, buses]);

  const turnaroundDepot2List = useMemo(() => {
    return turnaroundAllList.filter((item) => {
      const bm = String(item.bm || item.bmNumber || '').toUpperCase().trim();
      const isDeleted = localDeletedBuses && (localDeletedBuses[bm] || Object.keys(localDeletedBuses).some((k) => k.toUpperCase().trim() === bm));
      if (isDeleted) return false;
      const bDepot = String(item.depot || (buses.find((x) => x.bmNumber === bm)?.depot) || '1');
      return bDepot === '2';
    });
  }, [turnaroundAllList, buses]);

  // Scoped Recently Completed / Turnaround count matching the active enterprise depot filter
  const viewRecentCompleted = useMemo(() => {
    if (adminDepotFilter === '1') return turnaroundDepot1List;
    if (adminDepotFilter === '2') return turnaroundDepot2List;
    return turnaroundAllList;
  }, [adminDepotFilter, turnaroundAllList, turnaroundDepot1List, turnaroundDepot2List]);

  // Scoped lists for Locked Buses Modal Directory
  const modalDepotLockedList = useMemo(() => {
    return lockedBuses.filter((b) => {
      const bmClean = String(b.bm || b.bmNumber || '').toUpperCase().trim();
      const isDeleted = localDeletedBuses && (localDeletedBuses[bmClean] || Object.keys(localDeletedBuses).some((k) => k.toUpperCase().trim() === bmClean));
      if (isDeleted) return false;
      if (lockedDepotFilter === 'all') return true;
      const bDepot = String(b.depot || (buses.find((x) => x.bmNumber === b.bm)?.depot) || '1');
      return bDepot === lockedDepotFilter;
    });
  }, [lockedBuses, lockedDepotFilter, buses, localDeletedBuses]);

  const modalDepotChargingCount = useMemo(() => {
    return modalDepotLockedList.filter((b) => {
      const p = String(b.page || b.type || b.reason || '').toLowerCase();
      return (p.includes('charg') || b.isCharging) && !b.isTurnaround;
    }).length;
  }, [modalDepotLockedList]);

  const modalDepotCleaningCount = useMemo(() => {
    return modalDepotLockedList.filter((b) => {
      const p = String(b.page || b.type || b.reason || '').toLowerCase();
      return (p.includes('clean') || b.isCleaning) && !b.isTurnaround;
    }).length;
  }, [modalDepotLockedList]);

  const modalDepotTurnaroundCount = useMemo(() => {
    return modalDepotLockedList.filter((b) => {
      const p = String(b.page || b.type || b.reason || '').toLowerCase();
      return Boolean(b.isTurnaround || p.includes('turnaround'));
    }).length;
  }, [modalDepotLockedList]);

  // Filtered & Sorted Locked Buses for Modal Directory
  const filteredLockedBuses = useMemo(() => {
    let list = modalDepotLockedList.filter((item) => {
      const isChg = (String(item.page || item.type || item.reason || '').toLowerCase().includes('charg') || item.isCharging) && !item.isTurnaround;
      const isCln = (String(item.page || item.type || item.reason || '').toLowerCase().includes('clean') || item.isCleaning) && !item.isTurnaround;
      const isTrn = Boolean(item.isTurnaround || String(item.page || item.type || item.reason || '').toLowerCase().includes('turnaround'));
      if (lockedFilterType === 'charging' && !isChg) return false;
      if (lockedFilterType === 'cleaning' && !isCln) return false;
      if (lockedFilterType === 'turnaround' && !isTrn) return false;
      if (!lockedSearch.trim()) return true;
      const q = lockedSearch.toLowerCase().trim();
      const bm = String(item.bm || item.bmNumber || '').toLowerCase();
      const reg = String(item.reg || '').toLowerCase();
      const bay = String(item.chargerBay || item.bay || '').toLowerCase();
      const reason = String(item.reason || '').toLowerCase();
      return bm.includes(q) || reg.includes(q) || bay.includes(q) || reason.includes(q);
    });

    return list.slice().sort((a, b) => {
      const isChgA = (String(a.page || a.type || a.reason || '').toLowerCase().includes('charg') || a.isCharging) && !a.isTurnaround;
      const isChgB = (String(b.page || b.type || b.reason || '').toLowerCase().includes('charg') || b.isCharging) && !b.isTurnaround;
      const isTrnA = Boolean(a.isTurnaround || String(a.page || a.type || a.reason || '').toLowerCase().includes('turnaround'));
      const isTrnB = Boolean(b.isTurnaround || String(b.page || b.type || b.reason || '').toLowerCase().includes('turnaround'));
      if (lockedSortBy === 'charging-first') {
        if (isChgA !== isChgB) return isChgA ? -1 : 1;
        return String(a.bm || a.bmNumber || '').localeCompare(String(b.bm || b.bmNumber || ''), undefined, { numeric: true });
      }
      if (lockedSortBy === 'cleaning-first') {
        if (isChgA !== isChgB) return isChgA ? 1 : -1;
        return String(a.bm || a.bmNumber || '').localeCompare(String(b.bm || b.bmNumber || ''), undefined, { numeric: true });
      }
      if (lockedSortBy === 'turnaround-first') {
        if (isTrnA !== isTrnB) return isTrnA ? -1 : 1;
        return String(a.bm || a.bmNumber || '').localeCompare(String(b.bm || b.bmNumber || ''), undefined, { numeric: true });
      }
      if (lockedSortBy === 'bm-asc') {
        return String(a.bm || a.bmNumber || '').localeCompare(String(b.bm || b.bmNumber || ''), undefined, { numeric: true });
      }
      if (lockedSortBy === 'depot') {
        return String(a.depot || '1').localeCompare(String(b.depot || '1'));
      }
      return 0;
    });
  }, [modalDepotLockedList, lockedFilterType, lockedSortBy, lockedSearch]);

  // Filtered & Sorted Recently Completed Routes for Notifications Modal
  // Strict rule: if the bus is locked in either charging or cleaning, it must NOT be in turnaround
  const filteredRecentCompleted = useMemo(() => {
    let sourceList = recentCompletedDepot === 'all'
      ? turnaroundAllList
      : recentCompletedDepot === '1'
        ? turnaroundDepot1List
        : turnaroundDepot2List;

    let list = sourceList.filter((item) => {
      if (!recentCompletedSearch.trim()) return true;
      const q = recentCompletedSearch.toLowerCase().trim();
      const bm = String(item.bm || item.bmNumber || '').toLowerCase();
      const reg = String(item.reg || '').toLowerCase();
      const route = String(item.route || '').toLowerCase();
      const driver = String(item.driver || '').toLowerCase();
      return bm.includes(q) || reg.includes(q) || route.includes(q) || driver.includes(q);
    });

    return list.slice().sort((a, b) => {
      if (recentCompletedSortBy === 'time-asc') {
        return String(a.completedAt || a.timestamp || '').localeCompare(String(b.completedAt || b.timestamp || ''));
      }
      if (recentCompletedSortBy === 'bm-asc') {
        return String(a.bm || '').localeCompare(String(b.bm || ''), undefined, { numeric: true });
      }
      // default: time-desc
      return String(b.completedAt || b.timestamp || '').localeCompare(String(a.completedAt || a.timestamp || ''));
    });
  }, [turnaroundAllList, turnaroundDepot1List, turnaroundDepot2List, recentCompletedDepot, recentCompletedSearch, recentCompletedSortBy]);

  // Unread Route Completed count for Header Bell Icon (based on route completed buses)
  const unreadCompletedCount = Math.max(0, turnaroundAllList.length - lastViewedCompletedCount);

  // Filtered Depots for Home Workspace Search Box
  const filteredHomeDepots = useMemo(() => {
    if (!homeDepotSearch || !homeDepotSearch.trim()) return depotsList;
    const q = homeDepotSearch.toLowerCase().trim();
    return depotsList.filter((d) => {
      const dId = String(d.id || '').toLowerCase();
      const dName = String(d.name || '').toLowerCase();
      const dLoc = String(d.location || '').toLowerCase();
      return dId.includes(q) || dName.includes(q) || dLoc.includes(q) || `depot ${dId}`.includes(q);
    });
  }, [depotsList, homeDepotSearch]);

  // Synchronize viewed completed count when notifications modal is open
  useEffect(() => {
    if (recentCompletedModalOpen && turnaroundAllList.length > lastViewedCompletedCount) {
      setLastViewedCompletedCount(turnaroundAllList.length);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('last_viewed_completed_count', String(turnaroundAllList.length));
        }
      } catch (_) {}
    }
  }, [recentCompletedModalOpen, turnaroundAllList.length, lastViewedCompletedCount]);

  // ── Filtered Lists for Each Section ──

  // 1. Filtered Allocated Duties
  const filteredAllocatedList = useMemo(() => {
    let list = viewAllocatedDuties.filter((duty) => {
      if (!allocSearch.trim()) return true;
      const q = allocSearch.toLowerCase().trim();
      const bm = String(duty.bm || duty.bmNumber || '').toLowerCase();
      const reg = String(duty.regNo || '').toLowerCase();
      const route = String(duty.routeCode || duty.routeName || '').toLowerCase();
      const driver = String(duty.driver || '').toLowerCase();
      const shift = String(duty.shift || '').toLowerCase();
      return bm.includes(q) || reg.includes(q) || route.includes(q) || driver.includes(q) || shift.includes(q);
    });

    return list.slice().sort((a, b) => {
      if (allocSortBy === 'route-desc') {
        const rA = String(a.routeCode || a.busNumber || '');
        const rB = String(b.routeCode || b.busNumber || '');
        return rB.localeCompare(rA, undefined, { numeric: true });
      }
      if (allocSortBy === 'time-asc') {
        return String(a.departureTime || '').localeCompare(String(b.departureTime || ''));
      }
      if (allocSortBy === 'time-desc') {
        return String(b.departureTime || '').localeCompare(String(a.departureTime || ''));
      }
      if (allocSortBy === 'soc-desc') {
        return (Number(b.soc) || 0) - (Number(a.soc) || 0);
      }
      if (allocSortBy === 'soc-asc') {
        return (Number(a.soc) || 0) - (Number(b.soc) || 0);
      }
      if (allocSortBy === 'bm-asc') {
        return String(a.bm || '').localeCompare(String(b.bm || ''), undefined, { numeric: true });
      }
      // default: route-asc
      const rA = String(a.routeCode || a.busNumber || '');
      const rB = String(b.routeCode || b.busNumber || '');
      if (rA !== rB) return rA.localeCompare(rB, undefined, { numeric: true });
      return String(a.departureTime || '').localeCompare(String(b.departureTime || ''));
    });
  }, [viewAllocatedDuties, allocSearch, allocSortBy]);

  // 2. Filtered Not-Allocated Buses
  const filteredNotAllocatedList = useMemo(() => {
    let list = viewNotAllocatedBuses.filter((b) => {
      if (!notAllocSearch.trim()) return true;
      const q = notAllocSearch.toLowerCase().trim();
      const bm = b.bmNumber.toLowerCase();
      const reg = (b.regNo || '').toLowerCase();
      return bm.includes(q) || reg.includes(q);
    });

    return list.slice().sort((a, b) => {
      if (notAllocSortBy === 'newly-added') {
        const aNew = isBusNewlyAdded(a, localAddedBuses) ? 1 : 0;
        const bNew = isBusNewlyAdded(b, localAddedBuses) ? 1 : 0;
        if (aNew !== bNew) return bNew - aNew;
        return a.bmNumber.localeCompare(b.bmNumber, undefined, { numeric: true });
      }
      if (notAllocSortBy === 'soc-desc') return (b.soc || 0) - (a.soc || 0);
      if (notAllocSortBy === 'soc-asc') return (a.soc || 0) - (b.soc || 0);
      if (notAllocSortBy === 'locked-first') {
        const lockA = (a.isLocked || a.isCharging || a.isCleaning) ? 1 : 0;
        const lockB = (b.isLocked || b.isCharging || b.isCleaning) ? 1 : 0;
        if (lockA !== lockB) return lockB - lockA;
        return a.bmNumber.localeCompare(b.bmNumber, undefined, { numeric: true });
      }
      if (notAllocSortBy === 'range-desc') {
        const rA = Math.round(Math.max(0, (a.soc || 0) - 10) * 1.42);
        const rB = Math.round(Math.max(0, (b.soc || 0) - 10) * 1.42);
        return rB - rA;
      }
      // default: bm-asc
      return a.bmNumber.localeCompare(b.bmNumber, undefined, { numeric: true });
    });
  }, [viewNotAllocatedBuses, notAllocSearch, notAllocSortBy, localAddedBuses]);

  // 3. Filtered Available Buses
  const filteredAvailableList = useMemo(() => {
    let list = viewAvailableBuses.filter((b) => {
      if (availCategoryFilter !== 'all' && b.busCategory !== availCategoryFilter) return false;
      if (!availSearch.trim()) return true;
      const q = availSearch.toLowerCase().trim();
      return b.bmNumber.toLowerCase().includes(q) || (b.regNo && b.regNo.toLowerCase().includes(q));
    });

    return list.slice().sort((a, b) => {
      if (availSortBy === 'newly-added') {
        const aNew = isBusNewlyAdded(a, localAddedBuses) ? 1 : 0;
        const bNew = isBusNewlyAdded(b, localAddedBuses) ? 1 : 0;
        if (aNew !== bNew) return bNew - aNew;
        return (b.soc || 0) - (a.soc || 0);
      }
      if (availSortBy === 'soc-desc') return (b.soc || 0) - (a.soc || 0);
      if (availSortBy === 'soc-asc') return (a.soc || 0) - (b.soc || 0);
      if (availSortBy === 'cat-asc') {
        const cA = String(a.busCategory || 'B');
        const cB = String(b.busCategory || 'B');
        if (cA !== cB) return cA.localeCompare(cB);
        return (b.soc || 0) - (a.soc || 0);
      }
      // default: bm-asc
      return a.bmNumber.localeCompare(b.bmNumber, undefined, { numeric: true });
    });
  }, [viewAvailableBuses, availCategoryFilter, availSearch, availSortBy, localAddedBuses]);

  // 4. Filtered Total Buses
  const filteredTotalList = useMemo(() => {
    let list = viewBuses.filter((b) => {
      if (totalCategoryFilter !== 'all' && b.busCategory !== totalCategoryFilter) return false;
      if (totalStatusFilter === 'available' && (b.status !== 'Available' || viewAllocatedDuties.some((d) => d.bm === b.bmNumber) || b.isLocked || b.isCharging || b.isCleaning)) return false;
      if (totalStatusFilter === 'allocated' && !viewAllocatedDuties.some((d) => d.bm === b.bmNumber)) return false;
      if (totalStatusFilter === 'locked' && !b.isLocked && !b.isCharging && !b.isCleaning) return false;
      if (totalStatusFilter === 'new' && !isBusNewlyAdded(b, localAddedBuses)) return false;
      if (!totalSearch.trim()) return true;
      const q = totalSearch.toLowerCase().trim();
      return (
        b.bmNumber.toLowerCase().includes(q) ||
        (b.regNo && b.regNo.toLowerCase().includes(q)) ||
        (b.driver && b.driver.toLowerCase().includes(q)) ||
        (b.busCategory && (`cat ${b.busCategory}`).toLowerCase().includes(q)) ||
        (b.depot && (`depot ${b.depot}`).toLowerCase().includes(q))
      );
    });

    return list.slice().sort((a, b) => {
      if (totalSortBy === 'newly-added') {
        const aNew = isBusNewlyAdded(a, localAddedBuses) ? 1 : 0;
        const bNew = isBusNewlyAdded(b, localAddedBuses) ? 1 : 0;
        if (aNew !== bNew) return bNew - aNew;
        return a.bmNumber.localeCompare(b.bmNumber, undefined, { numeric: true });
      }
      if (totalSortBy === 'soc-desc') return (b.soc || 0) - (a.soc || 0);
      if (totalSortBy === 'soc-asc') return (a.soc || 0) - (b.soc || 0);
      if (totalSortBy === 'range-desc') {
        const rA = Math.round(Math.max(0, (a.soc || 0) - 10) * 1.42);
        const rB = Math.round(Math.max(0, (b.soc || 0) - 10) * 1.42);
        return rB - rA;
      }
      // default: bm-asc
      return a.bmNumber.localeCompare(b.bmNumber, undefined, { numeric: true });
    });
  }, [viewBuses, totalCategoryFilter, totalStatusFilter, totalSearch, totalSortBy, allAllocatedDuties, localAddedBuses]);

  // Handlers for Add / Delete Matching admin.html
  const handleSelectDelBus = (bm) => {
    const clean = String(bm || '').trim().toUpperCase();
    setDelSelectedBm(clean);
    const bus = buses.find((b) => String(b.bmNumber).trim().toUpperCase() === clean);
    if (bus) {
      setDelReg(bus.regNo || `KA51AH${clean.replace(/\D/g, '').padStart(4, '0')}`);
      const resolvedDepot = String(bus.depot || '1').replace(/^DEPOT\s*/i, '').trim();
      setDelDepot(resolvedDepot);
    }
  };

  const handleSubmitAdd = async () => {
    // ── GUARD: Mandatory Depot Selection ──
    if (!addDepot || addDepot === '' || addDepot === 'all') {
      Alert.alert(
        'Depot Selection Required',
        'Please select an operating depot from the drop-down menu before adding a bus. The action cannot proceed without selecting a depot.'
      );
      return;
    }
    if (!addBm.trim()) {
      Alert.alert('Bus Number Required', 'Please enter a Bus Number (e.g. BM001 or BM305).');
      return;
    }
    if (!addReg.trim()) {
      Alert.alert('Registration Required', 'Please enter the Bus Registration Number (e.g. KA51AH4144).');
      return;
    }
    if (!addDepot) {
      Alert.alert('Operating Depot Required', 'Please select an operating depot from the dropdown menu.');
      return;
    }
    const cleanBm = addBm.trim().toUpperCase();
    const cleanReg = addReg.trim().toUpperCase();
    const reasonVal = addReasonDetail.trim() || addReasonSelect || 'New Electric Bus Induction';
    const socVal = Math.min(100, Math.max(10, parseInt(addSoc, 10) || 100));

    const addPayload = {
      bm: cleanBm,
      busNumber: cleanBm,
      regNo: cleanReg,
      regNumber: cleanReg,
      depot: String(addDepot || '1'),
      busCategory: addCat,
      category: addCat,
      soc: socVal,
      reason: reasonVal,
      reasonVal,
      make: 'Ashok Leyland',
      model: 'ELECTRIC BUS AC EiV12',
    };

    await addBusToFleet(addPayload);

    const newAuditEntry = {
      id: 'audit_' + Date.now(),
      action: 'ADDED',
      bm: cleanBm,
      reg: cleanReg,
      depot: String(addDepot || '1'),
      reasonCategory: addReasonSelect,
      detail: reasonVal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', 22 Oct 2026',
      user: user?.email || 'admin@bmtc.gov.in',
    };
    setAuditLogs((prev) => [newAuditEntry, ...prev]);

    Alert.alert(
      '✨ Bus Inducted',
      `Bus ${cleanBm} (${cleanReg}) added to fleet successfully!\n\nIt is now active and marked as "✨ Newly Added Bus" across all system dashboards.`
    );
    setAddBm('');
    setAddReg('');
    setAddReasonDetail('');
    setAddDeleteTab('audit');
  };

  const handleSubmitDelete = () => {
    // ── GUARD: Mandatory Depot Selection ──
    if (!delDepot || delDepot === '' || delDepot === 'all') {
      Alert.alert(
        'Depot Selection Required',
        'Please select an operating depot from the drop-down menu before deleting a bus. The action cannot proceed without selecting a depot.'
      );
      return;
    }
    const targets = selectedDelBms.length > 0
      ? selectedDelBms
      : (delSelectedBm.trim().toUpperCase() ? [delSelectedBm.trim().toUpperCase()] : []);

    if (targets.length === 0) {
      Alert.alert('Selection Required', 'Please enter or select at least one active bus to delete.');
      return;
    }

    const reasonVal = delReasonDetail.trim() || delReasonSelect || 'Fleet Maintenance Off-road';

    Alert.alert(
      '⚠️ Confirm Fleet Deletion',
      `Delete ${targets.length} bus(es) from available fleet?\n\n• Buses: ${targets.slice(0, 6).join(', ')}${targets.length > 6 ? '... and ' + (targets.length - 6) + ' more' : ''}\n• Reason: ${reasonVal}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `🗑 Confirm Delete (${targets.length})`,
          style: 'destructive',
          onPress: async () => {
            if (typeof deleteBusesBatchFromFleet === 'function') {
              await deleteBusesBatchFromFleet(targets, reasonVal);
            } else {
              for (const bm of targets) {
                await deleteBusFromFleet(bm, { bm, reason: reasonVal });
              }
            }

            targets.forEach((targetBm) => {
              const targetBus = buses.find((b) => b.bmNumber === targetBm);
              const targetReg = (targetBus && targetBus.regNo) || `KA51AH${targetBm.replace(/\D/g, '').padStart(4, '0')}`;
              const targetDepot = String(delDepot || (targetBus && targetBus.depot) || '1');
              setAuditLogs((prev) => [
                {
                  id: 'audit_' + Date.now() + Math.random(),
                  action: 'DELETED',
                  bm: targetBm,
                  reg: targetReg,
                  depot: targetDepot,
                  reasonCategory: delReasonSelect,
                  detail: reasonVal,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', 22 Oct 2026',
                  user: user?.email || 'admin@bmtc.gov.in',
                },
                ...prev,
              ]);
            });

            Alert.alert(
              '🗑️ Buses Deleted',
              `${targets.length} bus(es) have been successfully deleted from the available fleet.\n\nReason recorded: ${reasonVal}`
            );
            setSelectedDelBms([]);
            setDelSelectedBm('');
            setDelReg('');
            setDelReasonDetail('');
            setDelSearchQuery('');
            setAddDeleteTab('audit');
          },
        },
      ]
    );
  };

  // ── Handler: Batch Delete Selected Buses directly from Total Fleet View ──
  const handleBatchDeleteFleetBuses = () => {
    if (selectedFleetBms.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one bus to delete.');
      return;
    }

    const targets = [...selectedFleetBms];
    const reasonVal = 'Batch Fleet Decommissioning';

    Alert.alert(
      '⚠️ Confirm Fleet Deletion',
      `Permanently delete ${targets.length} selected buses from the active fleet?\n\n• Buses: ${targets.slice(0, 6).join(', ')}${targets.length > 6 ? '... and ' + (targets.length - 6) + ' more' : ''}\n• Action: Immediate Fleet Decommissioning`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `🗑 Delete (${targets.length} Buses)`,
          style: 'destructive',
          onPress: async () => {
            if (typeof deleteBusesBatchFromFleet === 'function') {
              await deleteBusesBatchFromFleet(targets, reasonVal);
            } else {
              for (const bm of targets) {
                await deleteBusFromFleet(bm, { bm, reason: reasonVal });
              }
            }

            targets.forEach((targetBm) => {
              const targetBus = buses.find((b) => b.bmNumber === targetBm);
              const targetReg = (targetBus && targetBus.regNo) || `KA51AH${targetBm.replace(/\D/g, '').padStart(4, '0')}`;
              const targetDepot = String((targetBus && targetBus.depot) || '1');
              setAuditLogs((prev) => [
                {
                  id: 'audit_' + Date.now() + Math.random(),
                  action: 'DELETED',
                  bm: targetBm,
                  reg: targetReg,
                  depot: targetDepot,
                  reasonCategory: 'Batch Fleet Decommissioning',
                  detail: reasonVal,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', 22 Oct 2026',
                  user: user?.email || 'admin@bmtc.gov.in',
                },
                ...prev,
              ]);
            });

            setSelectedFleetBms([]);
            setFleetMultiSelectMode(false);
            Alert.alert('🗑️ Fleet Updated', `${targets.length} buses deleted successfully.`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView ref={mainScrollRef} contentContainerStyle={styles.contentWrap} showsVerticalScrollIndicator={false}>
        {/* ── PHOTO-MATCHING ADMIN HOME DASHBOARD ── */}
        {activeAdminTab === 'HOME' && (
          <View style={styles.homeContainer} onLayout={(e) => setHomeLayoutY(e.nativeEvent.layout.y)}>
            {/* Top Header matching photo */}
            <View style={styles.screenHeader}>
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>AD</Text>
              </View>
              <View style={styles.headerTitles}>
                <Text style={styles.headerEyebrow}>{t('depot_operations_title', 'DEPOT OPERATIONS')}</Text>
                <Text style={styles.headerMainTitle}>{t('admin_workspace_title', 'Admin Workspace')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' }}
                  onPress={() => {
                    Alert.alert(t.signOut, 'Are you sure you want to log out of Admin Workspace?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
                    ]);
                  }}
                  activeOpacity={0.8}
                  accessibilityLabel="Sign Out"
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#b91c1c' }}>⎋ {t.signOut}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerBellBtn}
                  onPress={() => {
                    setLastViewedCompletedCount(turnaroundAllList.length);
                    try {
                      if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('last_viewed_completed_count', String(turnaroundAllList.length));
                      }
                    } catch (_) {}
                    setRecentCompletedFullscreen(true);
                    setRecentCompletedModalOpen(true);
                  }}
                  activeOpacity={0.8}
                  accessibilityLabel="Recently Completed Routes"
                >
                  <BellIcon color="#1e293b" size={20} />
                  {unreadCompletedCount > 0 && (
                    <>
                      <View style={styles.bellRedDot} pointerEvents="none" />
                      <View style={styles.bellNumberBadge} pointerEvents="none">
                        <Text style={styles.bellNumberBadgeText}>
                          {unreadCompletedCount > 99 ? '99+' : unreadCompletedCount}
                        </Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Depot Search Box for Home */}
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.modalFieldLabel}>{t('search_depots_label', 'Search Depots')}</Text>
              <View style={styles.homeDepotSearchBox}>
                <Text style={{ fontSize: 14, marginRight: 6, color: '#64748b' }}>🔍</Text>
                <TextInput
                  style={styles.homeDepotSearchInput}
                  placeholder={t('placeholder_search_depots', 'Search depots by name, location, or ID...')}
                  placeholderTextColor="#94a3b8"
                  value={homeDepotSearch}
                  onChangeText={(val) => {
                    setHomeDepotSearch(val);
                    if (val.trim() && !homeDepotDropdownOpen) {
                      setHomeDepotDropdownOpen(true);
                    }
                  }}
                />
                {homeDepotSearch.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setHomeDepotSearch('')}
                    style={{ padding: 4 }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Depot Filter Dropdown Menu for Home */}
            <View style={{ marginBottom: 14, zIndex: 60 }}>
              <Text style={styles.modalFieldLabel}>{t('operating_depot_label', 'Operating Depot')}</Text>
              <TouchableOpacity
                style={[styles.modalDropdownBtn, homeDepotDropdownOpen && styles.modalDropdownBtnActive, { backgroundColor: '#ffffff', borderColor: '#cbd5e1' }]}
                onPress={() => setHomeDepotDropdownOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>{adminDepotFilter === 'all' ? '🌐' : '🏢'}</Text>
                  <Text style={[styles.modalDropdownBtnText, { fontWeight: '700', color: '#1e293b' }]}>
                    {adminDepotFilter === 'all'
                      ? `${t('all_operating_depots', 'All Operating Depots')} (${buses.length} ${t('buses_label', 'buses')})`
                      : (() => {
                          const matched = depotsList.find((d) => String(d.id) === String(adminDepotFilter));
                          const count = buses.filter((b) => String(b.depot || '1').replace(/^DEPOT\s*/i, '').trim() === String(adminDepotFilter)).length;
                          return `${matched?.name || `Depot ${adminDepotFilter}`} (${count} ${t('buses_label', 'buses')})`;
                        })()}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#64748b' }}>
                  {homeDepotDropdownOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {homeDepotDropdownOpen && (
                <ScrollView style={[styles.modalDropdownMenu, { backgroundColor: '#ffffff', maxHeight: 220, zIndex: 100 }]} nestedScrollEnabled>
                  {(!homeDepotSearch.trim() || 'all operating depots'.includes(homeDepotSearch.toLowerCase().trim())) && (
                    <TouchableOpacity
                      style={[styles.modalDropdownItem, adminDepotFilter === 'all' && styles.modalDropdownItemActive]}
                      onPress={() => {
                        setAdminDepotFilter('all');
                        setLockedDepotFilter('all');
                        setRecentCompletedDepot('all');
                        setHomeDepotDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.modalDropdownItemText, adminDepotFilter === 'all' && styles.modalDropdownItemTextActive]}>
                        🌐 {t('all_operating_depots', 'All Operating Depots')} ({buses.length} {t('buses_label', 'buses')})
                      </Text>
                      {adminDepotFilter === 'all' && <Text style={{ color: '#2563eb', fontWeight: '800' }}>✓</Text>}
                    </TouchableOpacity>
                  )}
                  {filteredHomeDepots.length === 0 ? (
                    <View style={{ padding: 14, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                        {t('no_depots_found', 'No depots match your search.')}
                      </Text>
                    </View>
                  ) : (
                    filteredHomeDepots.map((d) => {
                      const dId = String(d.id);
                      const count = buses.filter((b) => String(b.depot || '1').replace(/^DEPOT\s*/i, '').trim() === dId).length;
                      const isSelected = adminDepotFilter === dId;
                      return (
                        <TouchableOpacity
                          key={dId}
                          style={[styles.modalDropdownItem, isSelected && styles.modalDropdownItemActive]}
                          onPress={() => {
                            setAdminDepotFilter(dId);
                            setLockedDepotFilter(dId);
                            setRecentCompletedDepot(dId);
                            setHomeDepotDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.modalDropdownItemText, isSelected && styles.modalDropdownItemTextActive]}>
                            🏢 {d.name || `Depot ${dId}`} ({count} {t('buses_label', 'buses')})
                          </Text>
                          {isSelected && <Text style={{ color: '#2563eb', fontWeight: '800' }}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>

            {/* Donut Chart Summary Card matching photo */}
            <View style={styles.fleetSummaryCard}>
              <View style={styles.fleetSummaryTopRow}>
                {/* Left: Donut Chart with bold 124 & Total fleet */}
                <DonutChart total={viewBuses.length} allocated={viewAllocatedDuties.length} notAllocated={viewNotAllocatedBuses.length} />

                {/* Right: Legend with Live system, Allocated, Not allocated */}
                <View style={styles.fleetSummaryLegend}>
                  <View style={styles.liveSystemBadge}>
                    <View style={styles.liveSystemDot} />
                    <Text style={styles.liveSystemText}>{t('live_system', 'Live system')}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.legendRow}
                    onPress={() => navigateToAdminTab('ALLOCATED')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.legendLabelWrap}>
                      <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.legendLabel}>{t('allocated', 'Allocated')}</Text>
                    </View>
                    <View style={styles.legendValGroup}>
                      <Text style={styles.legendVal}>{viewAllocatedDuties.length}</Text>
                      <Text style={styles.legendPctText}>
                        ({viewBuses.length > 0 ? Math.round((viewAllocatedDuties.length / viewBuses.length) * 100) : 0}%)
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.legendRow}
                    onPress={() => navigateToAdminTab('NOT_ALLOCATED')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.legendLabelWrap}>
                      <View style={[styles.legendDot, { backgroundColor: '#a5b4fc' }]} />
                      <Text style={styles.legendLabel}>{t('not_allocated', 'Not allocated')}</Text>
                    </View>
                    <View style={styles.legendValGroup}>
                      <Text style={styles.legendVal}>{viewNotAllocatedBuses.length}</Text>
                      <Text style={styles.legendPctText}>
                        ({viewBuses.length > 0 ? Math.round((viewNotAllocatedBuses.length / viewBuses.length) * 100) : 0}%)
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Horizontal Divider */}
              <View style={styles.fleetSummaryDivider} />

              {/* Bottom Row: Available for Departure */}
              <TouchableOpacity
                style={styles.fleetSummaryBottomRow}
                onPress={() => navigateToAdminTab('AVAILABLE_DEPARTURE')}
                activeOpacity={0.7}
              >
                <View style={styles.availDepartureLeft}>
                  <Text style={styles.availDepartureBolt}>⚡</Text>
                  <Text style={styles.availDepartureLabel}>{t('available_for_scheduling', 'Available for scheduling')}</Text>
                </View>
                <Text style={styles.availDepartureVal}>{viewAvailableBuses.length}</Text>
              </TouchableOpacity>
            </View>

            {/* Fleet Reconciliation Equation Bar (admin.html parity: Total = Available + On Route + Locked) */}
            <View style={styles.accountingBar}>
              <Text style={styles.accountingTitle}>{t('fleet_breakdown', '📊 Fleet Breakdown:')}</Text>
              <Text style={styles.accountingPill}>Total: {viewBuses.length}</Text>
              <Text style={styles.accountingEqual}>=</Text>
              <TouchableOpacity onPress={() => navigateToAdminTab('AVAILABLE_DEPARTURE')}>
                <Text style={[styles.accountingPill, { backgroundColor: '#f5f3ff', color: '#5b21b6' }]}>⚡ Avail: {viewAvailableBuses.length}</Text>
              </TouchableOpacity>
              <Text style={styles.accountingPlus}>+</Text>
              <TouchableOpacity onPress={() => navigateToAdminTab('ALLOCATED')}>
                <Text style={[styles.accountingPill, { backgroundColor: '#ecfdf5', color: '#065f46' }]}>🟣 On Route: {viewAllocatedDuties.length}</Text>
              </TouchableOpacity>
              <Text style={styles.accountingPlus}>+</Text>
              <TouchableOpacity onPress={() => { setLockedDepotFilter(adminDepotFilter); setLockedModalOpen(true); }}>
                <Text style={[styles.accountingPill, { backgroundColor: '#fee2e2', color: '#991b1b' }]}>
                  🔒 Locked: {viewLockedBuses.length}{viewTurnaroundLockedCount > 0 ? ` (⚡${viewChargingLockedCount} · 🧹${viewCleaningLockedCount} · 🔄${viewTurnaroundLockedCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* OPERATIONS HUB matching photo */}
            <View style={styles.operationsHubSection}>
              <Text style={styles.operationsHubTitle}>{t('operations_hub', 'OPERATIONS HUB')}</Text>

              <View style={styles.hubGrid}>
                {/* Tile 1: Available for departure */}
                <TouchableOpacity
                  style={styles.hubTile}
                  onPress={() => navigateToAdminTab('AVAILABLE_DEPARTURE')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hubTileIconBox, { backgroundColor: '#ede9fe' }]}>
                    <CalendarIcon color="#4f46e5" size={22} />
                  </View>
                  <Text style={styles.hubTileTitle}>Available for scheduling</Text>
                  <Text style={styles.hubTileSub}>{viewAvailableBuses.length} {t('ready_to_schedule', 'ready to schedule')}</Text>
                </TouchableOpacity>

                {/* Tile 2: Allocated buses */}
                <TouchableOpacity
                  style={styles.hubTile}
                  onPress={() => navigateToAdminTab('ALLOCATED')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hubTileIconBox, { backgroundColor: '#dcfce7' }]}>
                    <CheckCircleIcon color="#10b981" size={24} />
                  </View>
                  <Text style={styles.hubTileTitle}>Allocated buses</Text>
                  <Text style={styles.hubTileSub}>{viewAllocatedDuties.length} {t('on_active_route', 'on active route')}</Text>
                </TouchableOpacity>

                {/* Tile 3: Not allocated */}
                <TouchableOpacity
                  style={styles.hubTile}
                  onPress={() => navigateToAdminTab('NOT_ALLOCATED')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hubTileIconBox, { backgroundColor: '#dbeafe' }]}>
                    <BusFrontIcon color="#2563eb" size={22} />
                  </View>
                  <Text style={styles.hubTileTitle}>Not allocated</Text>
                  <Text style={styles.hubTileSub}>{viewNotAllocatedBuses.length} {t('in_yard_reserve', 'in yard reserve')}</Text>
                </TouchableOpacity>

                {/* Tile 4: Locked buses */}
                <TouchableOpacity
                  style={styles.hubTile}
                  onPress={() => {
                    setLockedDepotFilter(adminDepotFilter);
                    setLockedModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hubTileIconBox, { backgroundColor: '#fee2e2' }]}>
                    <LockIcon color="#ef4444" size={22} />
                  </View>
                  <Text style={styles.hubTileTitle}>Locked buses</Text>
                  <Text style={styles.hubTileSub}>{viewLockedBuses.length} locked ({viewChargingLockedCount} chg · {viewCleaningLockedCount} cln · {viewTurnaroundLockedCount} turnaround)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── PANEL 1: SCHEDULE REQUIREMENT & ALLOCATION RESULT ── */}
        {activeAdminTab === 'SCHEDULE' && (
        <View style={styles.panel} onLayout={(e) => setSchedulingLayoutY(e.nativeEvent.layout.y)}>
          <SubScreenHeader onLangPress={() => setLangModalOpen(true)}
            title="Schedule Overview"
            subtitle="Route candidate evaluation & dispatch readiness"
            onBack={() => navigateToAdminTab('HOME')}
            badge={`Depot ${selectedRouteDepot}`}
          />
          <View style={styles.rowBetween}>
            <Text style={styles.panelTitle}>{t.scheduleReq}</Text>
            <View style={[styles.depotPillBadge, selectedRouteDepot === '2' ? styles.depotPillBadge2 : styles.depotPillBadge1]}>
              <Text style={[styles.depotPillText, selectedRouteDepot === '2' ? styles.depotPillText2 : styles.depotPillText1]}>
                🏢 Depot {selectedRouteDepot}
              </Text>
            </View>
          </View>
          <Text style={styles.panelNote}>
            Use the search box and dropdown filters to inspect routes, departure timetables, and fleet feasibility across depots.
          </Text>

          {/* ── 1. UNIFIED SEARCH BOX (Searches both Depots and Routes) ── */}
          <View style={styles.scheduleSearchWrap}>
            <Text style={styles.scheduleSearchIcon}>🔍</Text>
            <TextInput
              style={styles.scheduleSearchInput}
              placeholder="Search routes or depots (e.g. Chandapura, 356Z, Hoskote)..."
              placeholderTextColor="#94a3b8"
              value={scheduleSearchQuery}
              onChangeText={setScheduleSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {scheduleSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setScheduleSearchQuery('')} style={styles.scheduleClearSearchBtn}>
                <Text style={styles.scheduleClearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── 2. TWO DROPDOWN MENUS (1. Select Depot, 2. Select Route) ── */}
          <View style={styles.scheduleDropdownsContainer}>
            {/* Dropdown 1: Select Depot */}
            <View style={styles.scheduleDropdownCol}>
              <Text style={styles.scheduleDropdownLabel}>🏢 1. Select Depot</Text>
              <TouchableOpacity
                style={styles.scheduleDropdownBtn}
                onPress={() => setScheduleDepotPickerOpen(true)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleDropdownBtnText} numberOfLines={1}>
                    {scheduleSelectedDepot === 'all'
                      ? `🌐 All Operating Depots (${depotsList.length} Facilities)`
                      : (depotsList.find((d) => String(d.id) === String(scheduleSelectedDepot))?.name || `Depot ${scheduleSelectedDepot}`)}
                  </Text>
                </View>
                <Text style={styles.scheduleDropdownCaret}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Dropdown 2: Select Route (Filtered for Selected Depot) */}
            <View style={styles.scheduleDropdownCol}>
              <Text style={styles.scheduleDropdownLabel}>
                🛣️ 2. Select Route {scheduleSelectedDepot !== 'all' ? `(Filtered: Depot ${scheduleSelectedDepot})` : '(All Routes)'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.scheduleDropdownBtn,
                  filteredRoutesForDropdown.length === 0 && styles.scheduleDropdownBtnDisabled,
                ]}
                onPress={() => {
                  if (filteredRoutesForDropdown.length > 0) {
                    setScheduleRoutePickerOpen(true);
                  } else {
                    Alert.alert(
                      'No Routes Available',
                      `No routes found for ${scheduleSelectedDepot === 'all' ? 'current search' : `Depot ${scheduleSelectedDepot}`}. Assign routes from Depot Management.`
                    );
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.scheduleDropdownBtnText,
                      filteredRoutesForDropdown.length === 0 && { color: '#94a3b8' },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedRoute
                      ? `🚌 [${selectedRoute.code}] ${selectedRoute.shortName || selectedRoute.code} (${selectedRoute.distance} km) • ${selectedRoute.depotName || ('Depot ' + selectedRoute.depotId)}`
                      : (filteredRoutesForDropdown.length === 0 ? 'No routes available' : '— Choose a route —')}
                  </Text>
                </View>
                <Text style={styles.scheduleDropdownCaret}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Dropdown 3: Select Scheduled Departure Time (Dataset Timetable) */}
            <View style={styles.scheduleDropdownCol}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.scheduleDropdownLabel}>
                  🕒 3. Departure Time (from dataset)
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddDepartureTimeInput(true);
                    setScheduleTimePickerOpen(true);
                  }}
                  style={{ paddingVertical: 2, paddingHorizontal: 6 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>+ Add Time</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.scheduleDropdownBtn}
                onPress={() => setScheduleTimePickerOpen(true)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleDropdownBtnText} numberOfLines={1}>
                    🕒 {scheduledTime || (selectedRoute?.timetables && selectedRoute.timetables[0]) || 'Select departure time'} • {(selectedRoute?.timetables || []).length} departure slots
                  </Text>
                </View>
                <Text style={styles.scheduleDropdownCaret}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Allocation Result KPIs (Required SOC of selected route & Allocated buses, matching admin.html) */}
          <View style={styles.adminKpiGrid}>
            <View style={styles.adminKpiBox}>
              <Text style={styles.adminKpiVal}>{routeRequiredSoc}</Text>
              <Text style={styles.adminKpiLbl}>Required SOC {selectedRoute?.code ? `(${selectedRoute.code})` : ''}</Text>
            </View>

            {/* Clickable Allocated Buses KPI -> Opens Route Allocated Buses Modal in Fullscreen Mode */}
            <TouchableOpacity
              style={[styles.adminKpiBox, styles.adminKpiBoxClickable]}
              onPress={() => {
                setRouteAllocatedModalRoute(selectedRoute.code);
                setRouteAllocatedSearch('');
                setRouteAllocatedFullscreen(true);
                setRouteAllocatedModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.kpiClickableTop}>
                <Text style={[styles.adminKpiVal, { color: '#08755f' }]}>{routeAllocatedCount}</Text>
                <View style={styles.kpiViewFleetPill}>
                  <Text style={styles.kpiViewFleetPillText}>View Fleet ➔</Text>
                </View>
              </View>
              <Text style={styles.adminKpiLbl}>Allocated buses ({selectedRoute.code})</Text>
              <Text style={styles.kpiClickableHint}>Tap to view route fleet</Text>
            </TouchableOpacity>

            <View style={styles.adminKpiBox}>
              <Text style={[styles.adminKpiVal, { color: '#0f766e' }]}>{candidateBus ? `${candidateSoc}%` : '—'}</Text>
              <Text style={styles.adminKpiLbl}>Selected bus SOC</Text>
            </View>
            <View style={styles.adminKpiBox}>
              <Text style={[styles.adminKpiVal, { color: '#0284c7' }]}>
                {selectedRoute?.fullDutyKm || selectedRoute?.actualKm ? `${selectedRoute.fullDutyKm || selectedRoute.actualKm} km` : (candidateBus ? `${fullDutyDistance} km` : '—')}
              </Text>
              <Text style={styles.adminKpiLbl}>Actual Shift Duty (actual_km)</Text>
            </View>
          </View>

          {/* Transparent Rules Breakdown (Matching admin.html) */}
          <View style={styles.rulesList}>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Actual Shift Duty (actual_km)</Text>
              <Text style={styles.ruleVal}>
                {selectedRoute?.fullDutyKm || selectedRoute?.actualKm ? `${selectedRoute.fullDutyKm || selectedRoute.actualKm} km` : (candidateBus ? `${fullDutyDistance} km` : '—')}
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Operation Mode</Text>
              <Text style={[styles.ruleVal, { color: (isSplitDutyRoute || unchargedDutyRequiredSoc > 100) ? '#0284c7' : '#15803d', fontWeight: '800' }]}>
                {(isSplitDutyRoute || unchargedDutyRequiredSoc > 100)
                  ? `⚡ Split Duty (${selectedRoute?.chargingOcc || 1} Mid-Duty Charge Scheduled)`
                  : 'Single Charge Operation'}
              </Text>
            </View>
            {(isSplitDutyRoute || unchargedDutyRequiredSoc > 100) && (
              <>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleLabel}>Single Charge Leg (single_charge_req_km)</Text>
                  <Text style={[styles.ruleVal, { color: '#0369a1', fontWeight: '700' }]}>
                    {selectedRoute?.singleChargeReqKm ? `${selectedRoute.singleChargeReqKm} km` : `${(Number(selectedRoute?.fullDutyKm || selectedRoute?.actualKm || 188.54) / 2).toFixed(1)} km`}
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleLabel}>Mid-Duty Charging Sessions</Text>
                  <Text style={[styles.ruleVal, { color: '#d97706', fontWeight: '700' }]}>
                    ⚡ {selectedRoute?.chargingOcc || selectedRoute?.noChargingOcc || 1} Session Planned per Form 4
                  </Text>
                </View>
              </>
            )}
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>One-Way Trip Distance</Text>
              <Text style={styles.ruleVal}>{selectedRoute.distance} km</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Route category</Text>
              <Text style={styles.ruleVal}>{complexity.toUpperCase()}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Bus category</Text>
              <Text style={styles.ruleVal}>Category {candidateBus?.busCategory || 'A'}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Matrix status</Text>
              <Text style={[styles.ruleVal, { color: isMatrixCompliant ? '#16a34a' : '#dc2626', fontWeight: '800' }]}>
                {isMatrixCompliant
                  ? `✅ Allowed (Cat ${catDisplay})`
                  : `⚠️ Required Cat ${catDisplay} (Current: Cat ${candidateBus?.busCategory || 'B'})`}
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Departure Mode</Text>
              <Text style={styles.ruleVal}>Timetable Scheduled</Text>
            </View>
          </View>

          {(isSplitDutyRoute || unchargedDutyRequiredSoc > 100) && (
            <View style={[styles.adminMonitoringNotice, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', marginTop: 10 }]}>
              <Text style={[styles.adminMonitoringNoticeText, { color: '#0369a1', fontWeight: '600' }]}>
                ⚡ Split Duty Planned: Shift duty mileage ({selectedRoute?.fullDutyKm || selectedRoute?.actualKm || 188.54} km) without charging would consume ~{unchargedDutyRequiredSoc}% SOC (&gt;100% capacity). The scheduler plans {selectedRoute?.chargingOcc || 1} mid-duty opportunity charging session during the shift break, capping continuous single-charge operating leg at {selectedRoute?.singleChargeReqKm || 91.9} km (~{routeRequiredSoc} required SOC for initial dispatch).
              </Text>
            </View>
          )}

          {/* Admin Inspection Notice (No commit allocate button in admin part) */}
          <View style={styles.adminMonitoringNotice}>
            <Text style={styles.adminMonitoringNoticeText}>
              👑 Admin Inspection Mode: Live fleet readiness and single-charge compliance monitoring. Bus dispatch allocations are committed from the Scheduling console.
            </Text>
          </View>
        </View>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 1 VIEW: ALLOCATED BUSES ── */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeAdminTab === 'ALLOCATED' && (
          <View style={styles.panel}>
            <SubScreenHeader onLangPress={() => setLangModalOpen(true)}
              title="Allocated Buses"
              subtitle="Active dispatches on scheduled routes"
              onBack={() => navigateToAdminTab('HOME')}
              count={viewAllocatedDuties.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.sectionHeaderStack}>
                <Text style={[styles.sectionHeadingTitle, { color: '#08755f' }]}>✅ {t('panel_allocated_buses', 'Allocated Buses')} ({viewAllocatedDuties.length})</Text>
                <View style={[styles.sectionActionsRow, { flexWrap: 'wrap', gap: 6 }]}>

                  <TouchableOpacity
                    style={styles.btnHeaderDownload}
                  onPress={async () => {
                    if (!viewAllocatedDuties || viewAllocatedDuties.length === 0) {
                      Alert.alert('No Records', 'No allocated bus dispatches to export.');
                      return;
                    }
                    const headers = [
                      'Depot',
                      'Bus BM Number',
                      'Registration Number',
                      'Model',
                      'Route Code',
                      'Route Name',
                      'Scheduled Departure Time',
                      'Shift',
                      'Assigned Driver',
                      'Driver ID',
                      'Battery SoC (%)',
                      'Status',
                    ];
                    const rows = viewAllocatedDuties.map((d) => [
                      d.depot ? `Depot ${d.depot}` : 'Depot 1',
                      d.bm || d.bmNumber || '',
                      d.regNo || '',
                      d.model || 'ELECTRIC BUS AC EiV12',
                      d.routeCode || d.busNumber || '',
                      d.routeName || '',
                      d.departureTime || '',
                      d.shift || 'General Shift',
                      d.driver || 'Driver Assigned',
                      d.driverId || '',
                      d.soc !== undefined ? `${d.soc}%` : '',
                      'Allocated & Ready for Departure',
                    ]);
                    const dateStr = new Date().toISOString().slice(0, 10);
                    const filterTag = adminDepotFilter === 'all' ? 'all_depots' : `depot_${adminDepotFilter}`;
                    await exportCsvFile(`allocated_buses_dispatches_${filterTag}_${dateStr}.csv`, [headers, ...rows]);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnHeaderDownloadText}>{t('btn_download_csv', '📥 Download CSV')}</Text>
                </TouchableOpacity>
              </View>
            </View>
              <Text style={styles.sectionNote}>
                Ready for departure — Sufficient Range, Condition Good & Driver Assigned ({adminDepotFilter === 'all' ? 'Depot 1 & Depot 2' : 'Depot ' + adminDepotFilter}).
              </Text>

              {/* Sort Controls (Matching website admin.html) */}
              <View style={styles.sortStripRow}>
                <Text style={styles.sortStripTitle}>Sort by:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
                  {[
                    { key: 'route-asc', label: 'Route (A→Z)' },
                    { key: 'route-desc', label: 'Route (Z→A)' },
                    { key: 'time-asc', label: '🕒 Time (Earliest)' },
                    { key: 'time-desc', label: '🕒 Time (Latest)' },
                    { key: 'soc-desc', label: '⚡ Battery SOC' },
                    { key: 'bm-asc', label: '🚌 BM Number' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.sortPill, allocSortBy === s.key && styles.sortPillActive]}
                      onPress={() => setAllocSortBy(s.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sortPillText, allocSortBy === s.key && styles.sortPillTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Search Bar */}
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search allocated buses by BM, route, driver..."
                  placeholderTextColor="#94a3b8"
                  value={allocSearch}
                  onChangeText={setAllocSearch}
                />
                {allocSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setAllocSearch('')}>
                    <Text style={styles.clearSearch}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Cards List - Whole Card is Clickable to Open Full Details */}
              {filteredAllocatedList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No buses allocated yet</Text>
                  <Text style={styles.emptySub}>
                    Select a route & departure time above, then tap ⚡ Allocate Bus to dispatch a vehicle.
                  </Text>
                </View>
              ) : (
                filteredAllocatedList.map((duty) => (
                  <TouchableOpacity
                    key={duty.id || duty.bm}
                    style={styles.allocatedCard}
                    onPress={() => handleOpenBmDutyDetails(duty)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.allocatedCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.allocatedRouteCode}>{duty.routeCode || duty.busNumber || 'Route'}</Text>
                          <View style={styles.allocatedBmBadgeBtn}>
                            <Text style={styles.allocatedBmText}>🚌 BM: {duty.bm}</Text>
                          </View>
                          {(isBusNewlyAdded(duty, localAddedBuses) || isBusNewlyAdded(buses.find(b => b.bmNumber === duty.bm), localAddedBuses)) && (
                            <View style={styles.cardNewlyAddedBadge}>
                              <Text style={styles.cardNewlyAddedText}>✨ Newly Added</Text>
                            </View>
                          )}
                          <View style={[styles.depotPillBadge, String(duty.depot || '1') === '2' ? styles.depotPillBadge2 : styles.depotPillBadge1]}>
                            <Text style={[styles.depotPillText, String(duty.depot || '1') === '2' ? styles.depotPillText2 : styles.depotPillText1]}>
                              Depot {duty.depot || '1'}
                            </Text>
                          </View>
                          <Text style={styles.allocatedRegText}>({duty.regNo})</Text>
                        </View>
                        <Text style={styles.allocatedRouteName} numberOfLines={1}>
                          {duty.routeName || `${duty.origin || ''} ➔ ${duty.destination || ''}`}
                        </Text>
                      </View>
                      <View style={styles.cardDetailsHintPill}>
                        <Text style={styles.cardDetailsHintText}>ℹ Details ➔</Text>
                      </View>
                    </View>

                    {/* Badges */}
                    <View style={styles.dutyBadgesWrap}>
                      <View style={styles.dutyBadge}>
                        <Text style={styles.dutyBadgeText}>⚡ ALLOCATED DUTY</Text>
                      </View>
                      <View style={styles.shiftBadge}>
                        <Text style={styles.shiftBadgeText}>Shift: {duty.shift || 'General Shift'}</Text>
                      </View>
                      <View style={styles.timeBadge}>
                        <Text style={styles.timeBadgeText}>🕒 {duty.departureTime || '—'}</Text>
                      </View>
                      <View style={[styles.timeBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                        <Text style={[styles.timeBadgeText, { color: '#92400e', fontWeight: '800' }]}>
                          🎯 Est. SoC: ~{(() => {
                            const rCode = String(duty.routeCode || duty.busNumber || '').toUpperCase().replace(/^ROUTE\s*/i, '');
                            const rData = ALL_ROUTES_DATA.find((r) => r.code === rCode || r.id === rCode);
                            return getRequiredOperatingSoc(duty, rData);
                          })()}%
                        </Text>
                      </View>
                      <View style={styles.tripBadge}>
                        <Text style={styles.tripBadgeText}>🎯 {duty.tripCount || 8} Trips</Text>
                      </View>
                    </View>

                    <Text style={styles.dutyDriver}>
                      👤 Driver: <Text style={{ fontWeight: '700', color: '#1e293b' }}>{duty.driver || 'Driver Assigned'}</Text>
                    </Text>

                    <View style={{ marginVertical: 6 }}>
                      <BatteryBar soc={duty.soc || 80} showText={false} />
                    </View>

                    <View style={styles.rowBetween}>
                      <Text style={styles.dutySoc}>
                        ⚡ {duty.soc}% SoC • Est. Required: ~{(() => {
                          const rCode = String(duty.routeCode || duty.busNumber || '').toUpperCase().replace(/^ROUTE\s*/i, '');
                          const rData = ALL_ROUTES_DATA.find((r) => r.code === rCode || r.id === rCode);
                          return getRequiredOperatingSoc(duty, rData);
                        })()}% • Range ~{duty.fullDutyKm || 108} km
                      </Text>
                      <Text style={styles.allocatedTapHint}>Tap for feasibility & itinerary</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 2 VIEW: NOT-ALLOCATED BUSES ── */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeAdminTab === 'NOT_ALLOCATED' && (
          <View style={styles.panel}>
            <SubScreenHeader onLangPress={() => setLangModalOpen(true)}
              title="Not-Allocated Buses"
              subtitle="Yard reserve, charging & maintenance isolation"
              onBack={() => navigateToAdminTab('HOME')}
              count={viewNotAllocatedBuses.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.sectionHeaderStack}>
                <Text style={[styles.sectionHeadingTitle, { color: '#a94b15' }]}>⛔ {t('panel_not_allocated_buses', 'Not-Allocated Buses')} ({viewNotAllocatedBuses.length})</Text>
                <View style={[styles.sectionActionsRow, { flexWrap: 'wrap', gap: 6 }]}>
                  <TouchableOpacity
                    style={styles.btnHeaderDownload}
                    onPress={async () => {
                      if (!viewNotAllocatedBuses || viewNotAllocatedBuses.length === 0) {
                        Alert.alert('No Records', 'No not-allocated buses to export.');
                        return;
                      }
                      const headers = [
                        'Depot',
                        'Bus BM Number',
                        'Registration Number',
                        'Model',
                        'Bus Category',
                        'Battery SoC (%)',
                        'Usable Range (km)',
                        'Status Reason',
                      ];
                      const rows = viewNotAllocatedBuses.map((b) => {
                        let reason = 'Depot Standby / Reserve';
                        if (b.isCharging) reason = 'Locked: Charging';
                        else if (b.isCleaning) reason = 'Locked: Cleaning';
                        else if (b.soc < 25) reason = 'Low Battery SoC (< 25%)';
                        return [
                          b.depot ? `Depot ${b.depot}` : 'Depot 1',
                          b.bmNumber || '',
                          b.regNo || '',
                          b.model || 'ELECTRIC BUS AC EiV12',
                          b.busCategory || 'B',
                          b.soc !== undefined ? `${b.soc}%` : '',
                          `${Math.round(Math.max(0, (b.soc || 0) - 10) * 1.42)} km`,
                          reason,
                        ];
                      });
                      const dateStr = new Date().toISOString().slice(0, 10);
                      const filterTag = adminDepotFilter === 'all' ? 'all_depots' : `depot_${adminDepotFilter}`;
                      await exportCsvFile(`not_allocated_buses_${filterTag}_${dateStr}.csv`, [headers, ...rows]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnHeaderDownloadText}>{t('btn_export_csv', '📥 Export CSV')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.sectionNote}>
                Ineligible or in reserve ({adminDepotFilter === 'all' ? 'Depot 1 & Depot 2' : 'Depot ' + adminDepotFilter}) — unassigned driver, low SoC, or maintenance.
              </Text>

              {/* Sort Controls (Matching website admin.html) */}
              <View style={styles.sortStripRow}>
                <Text style={styles.sortStripTitle}>Sort by:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
                  {[
                    { key: 'bm-asc', label: '🚌 BM Number (A→Z)' },
                    { key: 'newly-added', label: '✨ Newly Added First' },
                    { key: 'soc-desc', label: '⚡ Battery SOC (High→Low)' },
                    { key: 'soc-asc', label: '⚡ Battery SOC (Low→High)' },
                    { key: 'locked-first', label: '🔒 Locked Buses First' },
                    { key: 'range-desc', label: '🛣️ Usable Range (Highest)' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.sortPill, notAllocSortBy === s.key && styles.sortPillActive]}
                      onPress={() => setNotAllocSortBy(s.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sortPillText, notAllocSortBy === s.key && styles.sortPillTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Search */}
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search not allocated buses by BM or Reg No..."
                  placeholderTextColor="#94a3b8"
                  value={notAllocSearch}
                  onChangeText={setNotAllocSearch}
                />
              </View>

              {filteredNotAllocatedList.map((bus) => {
                const isLockedChg = bus.isCharging;
                const isLockedCln = bus.isCleaning;
                const isLowSoc = bus.soc < 25;
                return (
                  <View key={bus.bmNumber} style={styles.notAllocCard}>
                    <View style={styles.cardHeaderRowTop}>
                      <View style={styles.cardHeaderLeftWrap}>
                        <Text style={styles.notAllocBm}>🚌 {bus.bmNumber}</Text>
                        <Text style={styles.notAllocReg}>({bus.regNo})</Text>
                        {isBusNewlyAdded(bus, localAddedBuses) && (
                          <View style={styles.cardNewlyAddedBadge}>
                            <Text style={styles.cardNewlyAddedText}>✨ Newly Added</Text>
                          </View>
                        )}
                        <View style={[styles.depotPillBadge, String(bus.depot || '1') === '2' ? styles.depotPillBadge2 : styles.depotPillBadge1]}>
                          <Text style={[styles.depotPillText, String(bus.depot || '1') === '2' ? styles.depotPillText2 : styles.depotPillText1]}>
                            Depot {bus.depot || '1'}
                          </Text>
                        </View>
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>Cat {bus.busCategory || 'B'}</Text>
                        </View>
                      </View>
                      <View style={styles.socBadgePill}>
                        <Text style={styles.notAllocSoc}>⚡ {bus.soc}%</Text>
                      </View>
                    </View>

                    {/* Rejection / Reserve Reason Badge */}
                    <View style={styles.rejectBadgeRow}>
                      {isLockedChg && (
                        <View style={[styles.rejectBadge, { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' }]}>
                          <Text style={[styles.rejectBadgeText, { color: '#0369a1' }]}>🔒 Locked: Charging</Text>
                        </View>
                      )}
                      {isLockedCln && (
                        <View style={[styles.rejectBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                          <Text style={[styles.rejectBadgeText, { color: '#92400e' }]}>🧼 Locked: Cleaning</Text>
                        </View>
                      )}
                      {isLowSoc && !isLockedChg && (
                        <View style={[styles.rejectBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                          <Text style={[styles.rejectBadgeText, { color: '#dc2626' }]}>⚡ Low Battery SoC (&lt; 25%)</Text>
                        </View>
                      )}
                      {!isLockedChg && !isLockedCln && !isLowSoc && (
                        <View style={[styles.rejectBadge, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}>
                          <Text style={[styles.rejectBadgeText, { color: '#475569' }]}>🕒 Unallocated (Depot Standby / Reserve)</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ marginVertical: 4 }}>
                      <BatteryBar soc={bus.soc} showText={false} />
                    </View>
                    <Text style={styles.rangeSub}>Usable Range: ~{Math.round(Math.max(0, bus.soc - 10) * 1.42)} km</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 3 VIEW: AVAILABLE BUSES FOR DEPARTURE ── */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeAdminTab === 'AVAILABLE_DEPARTURE' && (
          <View style={styles.panel}>
            <SubScreenHeader onLangPress={() => setLangModalOpen(true)}
              title="Available for Scheduling"
              subtitle="Ready fleet strictly compliant for duty scheduling"
              onBack={() => navigateToAdminTab('HOME')}
              count={viewAvailableBuses.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.sectionHeaderStack}>
                <Text style={[styles.sectionHeadingTitle, { color: '#6d28d9' }]}>⚡ {t('panel_available_buses', 'Available Buses for Scheduling')} ({viewAvailableBuses.length})</Text>
                <View style={[styles.sectionActionsRow, { flexWrap: 'wrap', gap: 6 }]}>
                  <TouchableOpacity
                    style={styles.btnHeaderDownload}
                    onPress={async () => {
                      if (!viewAvailableBuses || viewAvailableBuses.length === 0) {
                        Alert.alert('No Records', 'No available buses to export.');
                        return;
                      }
                      const headers = [
                        'Depot',
                        'Bus BM Number',
                        'Registration Number',
                        'Model',
                        'Bus Category',
                        'Battery SoC (%)',
                        'Usable Range (km)',
                        'Status',
                      ];
                      const rows = viewAvailableBuses.map((b) => [
                        b.depot ? `Depot ${b.depot}` : 'Depot 1',
                        b.bmNumber || '',
                        b.regNo || '',
                        b.model || 'ELECTRIC BUS AC EiV12',
                        b.busCategory || 'B',
                        b.soc !== undefined ? `${b.soc}%` : '',
                        `${Math.round(Math.max(0, (b.soc || 0) - 10) * 1.42)} km`,
                        'Available & Compliant for Scheduling',
                      ]);
                      const dateStr = new Date().toISOString().slice(0, 10);
                      const filterTag = adminDepotFilter === 'all' ? 'all_depots' : `depot_${adminDepotFilter}`;
                      await exportCsvFile(`available_buses_${filterTag}_${dateStr}.csv`, [headers, ...rows]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnHeaderDownloadText}>{t('btn_export_csv', '📥 Export CSV')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.sectionNote}>
                Ready fleet ({adminDepotFilter === 'all' ? 'Depot 1 & Depot 2' : 'Depot ' + adminDepotFilter}). Cleaning and charging protocols strictly excluded.
              </Text>

              {/* Fleet Accounting Bar (admin.html parity: Total = Available + On Route + Locked) */}
              <View style={styles.accountingBar}>
                <Text style={styles.accountingTitle}>{t('fleet_breakdown', '📊 Fleet Breakdown:')}</Text>
                <Text style={styles.accountingPill}>Total: {viewBuses.length}</Text>
                <Text style={styles.accountingEqual}>=</Text>
                <Text style={[styles.accountingPill, { backgroundColor: '#f5f3ff', color: '#5b21b6' }]}>⚡ Avail: {viewAvailableBuses.length}</Text>
                <Text style={styles.accountingPlus}>+</Text>
                <Text style={[styles.accountingPill, { backgroundColor: '#ecfdf5', color: '#065f46' }]}>🟣 On Route: {viewAllocatedDuties.length}</Text>
                <Text style={styles.accountingPlus}>+</Text>
                <TouchableOpacity onPress={() => { setLockedDepotFilter(adminDepotFilter); setLockedModalOpen(true); }}>
                  <Text style={[styles.accountingPill, { backgroundColor: '#fee2e2', color: '#991b1b' }]}>
                    🔒 Locked: {viewLockedBuses.length}{viewTurnaroundLockedCount > 0 ? ` (⚡${viewChargingLockedCount} · 🧹${viewCleaningLockedCount} · 🔄${viewTurnaroundLockedCount})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Category Filter Pills */}
              <View style={styles.filterPillsRow}>
                {['all', 'A', 'B', 'C'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catFilterPill, availCategoryFilter === cat && styles.catFilterPillActive]}
                    onPress={() => setAvailCategoryFilter(cat)}
                  >
                    <Text style={[styles.catFilterPillText, availCategoryFilter === cat && styles.catFilterPillTextActive]}>
                      {cat === 'all' ? 'All Categories' : `Cat ${cat}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort Controls (Matching website admin.html) */}
              <View style={styles.sortStripRow}>
                <Text style={styles.sortStripTitle}>Sort by:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
                  {[
                    { key: 'newly-added', label: '✨ Newly Added First' },
                    { key: 'soc-desc', label: '⚡ Battery SOC (High→Low)' },
                    { key: 'soc-asc', label: '⚡ Battery SOC (Low→High)' },
                    { key: 'bm-asc', label: '🚌 BM Number (A→Z)' },
                    { key: 'cat-asc', label: '🏷️ Category (A→B→C)' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.sortPill, availSortBy === s.key && styles.sortPillActive]}
                      onPress={() => setAvailSortBy(s.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sortPillText, availSortBy === s.key && styles.sortPillTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Search */}
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search available buses by BM or Reg..."
                  placeholderTextColor="#94a3b8"
                  value={availSearch}
                  onChangeText={setAvailSearch}
                />
              </View>

              {filteredAvailableList.map((bus) => (
                <View key={bus.bmNumber} style={styles.availCard}>
                  <View style={styles.cardHeaderRowTop}>
                    <View style={styles.cardHeaderLeftWrap}>
                      <Text style={styles.availBm}>🚌 {bus.bmNumber}</Text>
                      <Text style={styles.availReg}>({bus.regNo})</Text>
                      {isBusNewlyAdded(bus, localAddedBuses) && (
                        <View style={styles.cardNewlyAddedBadge}>
                          <Text style={styles.cardNewlyAddedText}>✨ Newly Added</Text>
                        </View>
                      )}
                      <View style={[styles.depotPillBadge, String(bus.depot || '1') === '2' ? styles.depotPillBadge2 : styles.depotPillBadge1]}>
                        <Text style={[styles.depotPillText, String(bus.depot || '1') === '2' ? styles.depotPillText2 : styles.depotPillText1]}>
                          Depot {bus.depot || '1'}
                        </Text>
                      </View>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>Cat {bus.busCategory || 'B'}</Text>
                      </View>
                    </View>
                    <View style={styles.socBadgePill}>
                      <Text style={styles.availSoc}>⚡ {bus.soc}%</Text>
                    </View>
                  </View>

                  <View style={{ marginVertical: 6 }}>
                    <BatteryBar soc={bus.soc} showText={false} />
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={styles.availRange}>
                      Range: ~{Math.round(Math.max(0, bus.soc - 10) * 1.42)} km
                    </Text>
                    <Text style={styles.availReadyTag}>⚡ Available in Depot</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── SECTION 4 VIEW: TOTAL FLEET (TOTAL BUSES ONLY) ── */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeAdminTab === 'TOTAL_FLEET' && (
          <View style={styles.panel}>
            <SubScreenHeader onLangPress={() => setLangModalOpen(true)}
              title="Total Fleet"
              subtitle="Depot 1 & Depot 2 complete vehicle directory"
              onBack={() => navigateToAdminTab('HOME')}
              count={viewBuses.length}
            />

            {/* Depot Filter Dropdown Menu for Total Fleet */}
            <View style={{ marginBottom: 14, zIndex: 60 }}>
              <Text style={styles.modalFieldLabel}>{t('operating_depot_label', 'Operating Depot')}</Text>
              <TouchableOpacity
                style={[styles.modalDropdownBtn, totalFleetDepotDropdownOpen && styles.modalDropdownBtnActive, { backgroundColor: '#ffffff', borderColor: '#cbd5e1' }]}
                onPress={() => setTotalFleetDepotDropdownOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>{adminDepotFilter === 'all' ? '🌐' : '🏢'}</Text>
                  <Text style={[styles.modalDropdownBtnText, { fontWeight: '700', color: '#1e293b' }]}>
                    {adminDepotFilter === 'all'
                      ? `${t('all_operating_depots', 'All Operating Depots')} (${buses.length} ${t('buses_label', 'buses')})`
                      : (() => {
                          const matched = depotsList.find((d) => String(d.id) === String(adminDepotFilter));
                          const count = buses.filter((b) => String(b.depot || '1').replace(/^DEPOT\s*/i, '').trim() === String(adminDepotFilter)).length;
                          return `${matched?.name || `Depot ${adminDepotFilter}`} (${count} ${t('buses_label', 'buses')})`;
                        })()}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#64748b' }}>
                  {totalFleetDepotDropdownOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {totalFleetDepotDropdownOpen && (
                <ScrollView style={[styles.modalDropdownMenu, { backgroundColor: '#ffffff', maxHeight: 220, zIndex: 100 }]} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[styles.modalDropdownItem, adminDepotFilter === 'all' && styles.modalDropdownItemActive]}
                    onPress={() => {
                      setAdminDepotFilter('all');
                      setLockedDepotFilter('all');
                      setRecentCompletedDepot('all');
                      setTotalFleetDepotDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.modalDropdownItemText, adminDepotFilter === 'all' && styles.modalDropdownItemTextActive]}>
                      🌐 {t('all_operating_depots', 'All Operating Depots')} ({buses.length} {t('buses_label', 'buses')})
                    </Text>
                    {adminDepotFilter === 'all' && <Text style={{ color: '#2563eb', fontWeight: '800' }}>✓</Text>}
                  </TouchableOpacity>
                  {depotsList.map((d) => {
                    const dId = String(d.id);
                    const count = buses.filter((b) => String(b.depot || '1').replace(/^DEPOT\s*/i, '').trim() === dId).length;
                    const isSelected = adminDepotFilter === dId;
                    return (
                      <TouchableOpacity
                        key={dId}
                        style={[styles.modalDropdownItem, isSelected && styles.modalDropdownItemActive]}
                        onPress={() => {
                          setAdminDepotFilter(dId);
                          setLockedDepotFilter(dId);
                          setRecentCompletedDepot(dId);
                          setTotalFleetDepotDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.modalDropdownItemText, isSelected && styles.modalDropdownItemTextActive]}>
                          🏢 {d.name || `Depot ${dId}`} ({count} {t('buses_label', 'buses')})
                        </Text>
                        {isSelected && <Text style={{ color: '#2563eb', fontWeight: '800' }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.sectionHeaderStack}>
                <Text style={[styles.sectionHeadingTitle, { color: '#0f766e' }]}>🚌 {t('total_buses', 'Total Buses')} ({viewBuses.length})</Text>
                <View style={styles.sectionActionsRow}>
                  <TouchableOpacity
                    style={[styles.btnHeaderDownload, fleetMultiSelectMode && { backgroundColor: '#fee2e2', borderColor: '#f87171' }]}
                    onPress={() => {
                      setFleetMultiSelectMode((prev) => !prev);
                      setSelectedFleetBms([]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnHeaderDownloadText, fleetMultiSelectMode && { color: '#dc2626', fontWeight: '800' }]}>
                      {fleetMultiSelectMode ? '✕ Cancel Batch' : '☑ Batch Delete'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnHeaderDownload}
                    onPress={async () => {
                      if (!viewBuses || viewBuses.length === 0) {
                        Alert.alert('No Records', 'No buses available to export.');
                        return;
                      }
                      const headers = [
                        'Depot',
                        'BM Number',
                        'Registration Number',
                        'Bus Model',
                        'Category',
                        'Current SoC (%)',
                        'Operational Status',
                        'Charging Bay',
                        'Maintenance / Lock',
                        'Cleaning Status',
                      ];
                      const rows = viewBuses.map((b) => [
                        b.depot ? `Depot ${b.depot}` : 'Depot 1',
                        b.bmNumber || '',
                        b.regNo || '',
                        b.model || 'ELECTRIC BUS AC EiV12',
                        b.category || 'A',
                        b.soc !== undefined ? `${b.soc}%` : '',
                        b.status || 'Available',
                        b.chargingBay || '—',
                        b.locked ? 'LOCKED / MAINTENANCE' : 'ACTIVE / OPERATIONAL',
                        b.cleaningChecked ? 'Cleaned' : 'Pending Cleaning',
                      ]);
                      const dateStr = new Date().toISOString().slice(0, 10);
                      const filterTag = adminDepotFilter === 'all' ? 'all_depots' : `depot_${adminDepotFilter}`;
                      await exportCsvFile(`fleet_inventory_${filterTag}_${dateStr}.csv`, [headers, ...rows]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnHeaderDownloadText}>{t('btn_export_csv', '📥 Export CSV')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.sectionNote}>
                Complete fleet ({adminDepotFilter === 'all' ? 'Depot 1 & Depot 2' : 'Depot ' + adminDepotFilter}) with real-time status and telemetry.
              </Text>

              {/* Search Bar for Total Fleet */}
              <View style={[styles.searchWrap, { marginTop: 10, marginBottom: 14 }]}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search all ${viewBuses.length} buses (${adminDepotFilter === 'all' ? 'All Depots' : 'Depot ' + adminDepotFilter}) by BM number, registration, or driver...`}
                  placeholderTextColor="#94a3b8"
                  value={totalSearch}
                  onChangeText={setTotalSearch}
                />
                {totalSearch.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setTotalSearch('')}
                    style={{ padding: 6 }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Total Fleet Multi-Select / Batch Delete Control Bar */}
              {fleetMultiSelectMode && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fef2f2', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#991b1b' }}>
                      ☑ {selectedFleetBms.length} Selected
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' }}
                      onPress={() => setSelectedFleetBms(filteredTotalList.map((b) => b.bmNumber))}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Select All Filtered ({filteredTotalList.length})</Text>
                    </TouchableOpacity>
                    {selectedFleetBms.length > 0 && (
                      <TouchableOpacity
                        style={{ backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' }}
                        onPress={() => setSelectedFleetBms([])}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: selectedFleetBms.length > 0 ? '#dc2626' : '#94a3b8', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 }}
                    disabled={selectedFleetBms.length === 0}
                    onPress={handleBatchDeleteFleetBuses}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
                      🗑️ Delete Selected ({selectedFleetBms.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Fleet Accounting Bar (Available, On Route, Locked counts matching user request) */}
              <View style={styles.totalFleetStatsBar}>
                <View style={styles.totalStatBox}>
                  <Text style={styles.totalStatNum}>{viewBuses.length}</Text>
                  <Text style={styles.totalStatLbl}>{t('total_fleet', 'Total Fleet')}</Text>
                </View>
                <View style={styles.totalStatDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatNum, { color: '#16a34a' }]}>{totalFleetAvailableCount}</Text>
                  <Text style={styles.totalStatLbl}>{t('avail', 'Available')}</Text>
                </View>
                <View style={styles.totalStatDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatNum, { color: '#7c3aed' }]}>{totalFleetOnRouteCount}</Text>
                  <Text style={styles.totalStatLbl}>{t('on_route', 'On Route')}</Text>
                </View>
                <View style={styles.totalStatDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatNum, { color: '#dc2626' }]}>{totalFleetLockedCount}</Text>
                  <Text style={styles.totalStatLbl}>{t('locked', 'Locked')}</Text>
                </View>
              </View>

              {/* Status Filters with Real-Time Counts */}
              <View style={styles.filterPillsRow}>
                {[
                  { key: 'all', label: `${t('filter_all', 'All')} (${viewBuses.length})` },
                  { key: 'available', label: `🟢 ${t('avail', 'Available')} (${totalFleetAvailableCount})` },
                  { key: 'allocated', label: `🟣 ${t('on_route', 'On Route')} (${totalFleetOnRouteCount})` },
                  { key: 'locked', label: `🔒 ${t('filter_locked', 'Locked')} (${totalFleetLockedCount})` },
                  { key: 'new', label: `✨ Newly Added (${viewBuses.filter((b) => isBusNewlyAdded(b, localAddedBuses)).length})` },
                ].map((st) => (
                  <TouchableOpacity
                    key={st.key}
                    style={[styles.catFilterPill, totalStatusFilter === st.key && styles.catFilterPillActive]}
                    onPress={() => setTotalStatusFilter(st.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catFilterPillText, totalStatusFilter === st.key && styles.catFilterPillTextActive]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category Filter Pills (Matching website admin.html) */}
              <View style={styles.filterPillsRow}>
                {['all', 'A', 'B', 'C'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catFilterPill, totalCategoryFilter === cat && styles.catFilterPillActive]}
                    onPress={() => setTotalCategoryFilter(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catFilterPillText, totalCategoryFilter === cat && styles.catFilterPillTextActive]}>
                      {cat === 'all' ? 'All Categories' : `Cat ${cat}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort Controls (Matching website admin.html) */}
              <View style={styles.sortStripRow}>
                <Text style={styles.sortStripTitle}>Sort by:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
                  {[
                    { key: 'bm-asc', label: '🚌 BM Number (A→Z)' },
                    { key: 'newly-added', label: '✨ Newly Added First' },
                    { key: 'soc-desc', label: '⚡ Battery SOC (High→Low)' },
                    { key: 'soc-asc', label: '⚡ Battery SOC (Low→High)' },
                    { key: 'range-desc', label: '🛣️ Range (Highest First)' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.sortPill, totalSortBy === s.key && styles.sortPillActive]}
                      onPress={() => setTotalSortBy(s.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sortPillText, totalSortBy === s.key && styles.sortPillTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>



              {filteredTotalList.map((bus) => {
                const isAlloc = allAllocatedDuties.some((d) => d.bm === bus.bmNumber);
                const statusColor = isAlloc ? '#6d28d9' : bus.status === 'Available' ? '#15803d' : '#b45309';
                const isFleetSelected = selectedFleetBms.includes(bus.bmNumber);
                return (
                  <TouchableOpacity
                    key={bus.bmNumber}
                    style={[
                      styles.totalCard,
                      isFleetSelected && { borderColor: '#dc2626', borderWidth: 2, backgroundColor: '#fef2f2' },
                    ]}
                    activeOpacity={fleetMultiSelectMode ? 0.7 : 1}
                    onPress={() => {
                      if (fleetMultiSelectMode) {
                        setSelectedFleetBms((prev) =>
                          prev.includes(bus.bmNumber) ? prev.filter((x) => x !== bus.bmNumber) : [...prev, bus.bmNumber]
                        );
                      }
                    }}
                  >
                    <View style={styles.cardHeaderRowTop}>
                      <View style={styles.cardHeaderLeftWrap}>
                        {fleetMultiSelectMode && (
                          <Text style={{ fontSize: 18, fontWeight: '800', color: isFleetSelected ? '#dc2626' : '#94a3b8', marginRight: 8 }}>
                            {isFleetSelected ? '☑' : '☐'}
                          </Text>
                        )}
                        <Text style={styles.totalBm}>🚌 {bus.bmNumber}</Text>
                        <Text style={styles.totalReg}>({bus.regNo})</Text>
                        {isBusNewlyAdded(bus, localAddedBuses) && (
                          <View style={styles.cardNewlyAddedBadge}>
                            <Text style={styles.cardNewlyAddedText}>✨ Newly Added</Text>
                          </View>
                        )}
                        <View style={[styles.depotPillBadge, String(bus.depot || '1') === '2' ? styles.depotPillBadge2 : styles.depotPillBadge1]}>
                          <Text style={[styles.depotPillText, String(bus.depot || '1') === '2' ? styles.depotPillText2 : styles.depotPillText1]}>
                            Depot {bus.depot || '1'}
                          </Text>
                        </View>
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>Cat {bus.busCategory || 'B'}</Text>
                        </View>
                      </View>
                      <View style={styles.socBadgePill}>
                        <Text style={styles.totalSoc}>⚡ {bus.soc}%</Text>
                      </View>
                    </View>

                    <View style={{ marginVertical: 6 }}>
                      <BatteryBar soc={bus.soc} showText={false} />
                    </View>

                    <View style={styles.rowBetween}>
                      <Text style={[styles.totalStatus, { color: statusColor }]}>
                        ● {isAlloc ? 'Allocated on Route' : bus.status}
                      </Text>
                      <Text style={styles.totalRange}>
                        Range: ~{Math.round(Math.max(0, bus.soc - 10) * 1.42)} km
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── PROFILE TAB ── */}
        {activeAdminTab === 'PROFILE' && (
          <View style={styles.profileTabContainer}>
            <SubScreenHeader onLangPress={() => setLangModalOpen(true)}
              title={t('admin_profile', 'Admin Profile')}
              subtitle={t('profile_sub', 'Master credentials & system preferences')}
              onBack={() => navigateToAdminTab('HOME')}
              badge={t('status_active', 'Active')}
            />
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatarCircle}>
                <Text style={styles.profileAvatarText}>AD</Text>
              </View>
              <Text style={styles.profileName}>{user?.email?.split('@')[0]?.toUpperCase() || 'ADMIN'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'admin@bmtc.gov.in'}</Text>
              <View style={styles.profileRoleBadge}>
                <Text style={styles.profileRoleBadgeText}>👑 {t('fleet_admin', 'Fleet Administrator')}</Text>
              </View>
            </View>

            {/* Login Details Card */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>🔐 {t('login_details', 'Login Details')}</Text>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>{t('label_email', 'Email')}</Text>
                <Text style={styles.profileDetailValue}>{user?.email || 'admin@bmtc.gov.in'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>{t('label_role', 'Role')}</Text>
                <Text style={styles.profileDetailValue}>{t('role_fleet_admin', 'Master Fleet Administrator')}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>{t('label_depot_access', 'Depot Access')}</Text>
                <Text style={styles.profileDetailValue}>
                  {depotsList.map((d) => d.shortName || `Depot ${d.id}`).join(' • ')} (Enterprise Fleet)
                </Text>
              </View>
              <View style={[styles.profileDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.profileDetailLabel}>{t('label_session', 'Session')}</Text>
                <View style={styles.profileSessionBadge}>
                  <View style={styles.profileSessionDot} />
                  <Text style={styles.profileSessionText}>{t('status_active', 'Active')}</Text>
                </View>
              </View>
            </View>

            {/* ── 📊 DATASET / SPREADSHEET UPDATE CARD ── */}
            <View style={styles.profileCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>📊</Text>
                  <Text style={styles.profileCardTitle}>{t('update_dataset_title', 'Update Dataset / Spreadsheet')}</Text>
                </View>
                <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0' }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#059669' }}>
                    CSV / Excel (*.xlsx)
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12, fontWeight: '500', lineHeight: 18 }}>
                {t('update_dataset_desc', 'Upload or update dataset spreadsheets (e.g. SCH_DATA_NH_new__1_.xlsx, Form_4_Consolidation_-_Chandapura.xlsx, or CSV files) to refresh fleet allocation models, timetables, and bus battery benchmarks.')}
              </Text>

              {/* Dataset Quick Badges */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, color: '#334155', fontWeight: '600' }}>📄 SCH_DATA_NH_new__1_.xlsx</Text>
                </View>
                <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, color: '#334155', fontWeight: '600' }}>📄 Form_4_Consolidation_-_Chandapura.xlsx</Text>
                </View>
                <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, color: '#334155', fontWeight: '600' }}>📄 Chandapura_Depot_Battery_Allocation.xlsx</Text>
                </View>
                <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 11, color: '#334155', fontWeight: '600' }}>📊 Fleet / Route CSV Files (*.csv)</Text>
                </View>
              </View>

              {/* Target Depot Selector (Mandatory before adding dataset) */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 5 }}>
                  🏢 {t('target_depot_for_dataset', 'Target Depot for Dataset:')}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: datasetTargetDepot ? '#0284c7' : '#cbd5e1',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onPress={() => setDatasetDepotModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{datasetTargetDepot ? '🏢' : '❓'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: datasetTargetDepot ? '#0f172a' : '#64748b' }}>
                      {datasetTargetDepot
                        ? datasetTargetDepotName
                        : 'Select Target Depot (Required) ▼'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: datasetTargetDepot ? '#e0f2fe' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: datasetTargetDepot ? '#0369a1' : '#64748b' }}>
                      {datasetTargetDepot ? 'Change ➔' : 'Select ➔'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* File Selector / Action Row */}
              <TouchableOpacity
                style={styles.profileDatasetUploadBtn}
                onPress={handleSelectDatasetSpreadsheet}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bfdbfe' }}>
                    <Text style={{ fontSize: 18 }}>📁</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1e293b' }}>
                      {selectedDatasetFile ? selectedDatasetFile.name : t('btn_select_dataset_file', 'Select Spreadsheet or CSV File')}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#64748b' }}>
                      {selectedDatasetFile
                        ? `${(selectedDatasetFile.size / 1024).toFixed(1)} KB • Target: ${datasetTargetDepotName || 'Depot ' + datasetTargetDepot}`
                        : datasetTargetDepot
                          ? `Ready for ${datasetTargetDepotName} • Tap Browse to select file`
                          : 'Tap Browse to choose depot & select file (.xlsx, .xls, .csv)'}
                    </Text>
                  </View>
                </View>
                <View style={styles.profileDatasetActionPill}>
                  <Text style={styles.profileDatasetActionPillText}>
                    {selectedDatasetFile ? 'Change ➔' : 'Browse ➔'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Upload Confirmation Banner / Submit Button if file is selected */}
              {selectedDatasetFile && (
                <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f766e' }}>
                      ✅ Ready: {selectedDatasetFile.name}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedDatasetFile(null)}>
                      <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700' }}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#eff6ff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14 }}>🏢</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e40af' }}>
                        Target Depot: {datasetTargetDepotName || `Depot ${datasetTargetDepot || 'Not selected'}`}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setDatasetDepotModalOpen(true)}>
                      <Text style={{ fontSize: 11.5, color: '#2563eb', fontWeight: '800' }}>Change Depot ➔</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.profileDatasetApplyBtn, (!datasetTargetDepot || isUploadingDataset) && { opacity: 0.6 }]}
                    onPress={handleUploadDatasetFile}
                    disabled={!datasetTargetDepot || isUploadingDataset}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.profileDatasetApplyBtnText}>
                      {isUploadingDataset
                        ? '⏳ Adding Dataset to System...'
                        : `🚀 Add Dataset to ${datasetTargetDepotName || ('Depot ' + datasetTargetDepot)}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Upload status message if available */}
              {datasetUploadStatus ? (
                <View style={{ marginTop: 10, padding: 10, backgroundColor: datasetUploadStatus.isError ? '#fef2f2' : '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: datasetUploadStatus.isError ? '#fca5a5' : '#86efac' }}>
                  <Text style={{ fontSize: 12, color: datasetUploadStatus.isError ? '#b91c1c' : '#15803d', fontWeight: '600' }}>
                    {datasetUploadStatus.message}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* ── 🔑 DEPOT LOGIN CREDENTIALS (ALL DEPOTS) CSV ROW ── */}
            <View style={styles.profileCard}>
              <TouchableOpacity
                style={styles.profileCredentialsRowBtn}
                onPress={handleOpenDepotCredentialsCsv}
                activeOpacity={0.75}
              >
                <View style={styles.profileCredentialsRowLeft}>
                  <View style={styles.profileCredentialsIconWrap}>
                    <Text style={{ fontSize: 22 }}>🔑</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.profileCredentialsRowTitle}>
                      🔑 Depot Login Credentials (All Depots)
                    </Text>
                    <Text style={styles.profileCredentialsRowSubtitle}>
                      Tap to open & download credentials CSV on device ({depotsList.length} Active Depots)
                    </Text>
                  </View>
                </View>
                <View style={styles.profileCredentialsActionPill}>
                  <Text style={styles.profileCredentialsActionPillText}>📄 Open CSV ➔</Text>
                </View>
              </TouchableOpacity>

              {/* Quick Manage Depots Link */}
              <View style={styles.profileDepotsQuickBar}>
                <Text style={styles.profileDepotsQuickCountText}>
                  🏢 {depotsList.length} Depots: {depotsList.map((d) => d.shortName || `Depot ${d.id}`).join(', ')}
                </Text>
                <TouchableOpacity
                  style={styles.profileManageDepotsLink}
                  onPress={() => {
                    setDepotsTab('add');
                    setDepotAddMode('depot');
                    setAddDeleteDepotsFullscreen(true);
                    setAddDeleteDepotsModalOpen(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.profileManageDepotsLinkText}>⚙️ {t('add_delete_depots_routes', 'Add / Delete Depots')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 🌐 System Language Card (Admin Profile Section - Dropdown Menu) */}
            <View style={styles.profileCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.profileCardTitle}>🌐 {t('language_preference', 'Language Preference')}</Text>
                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb' }}>
                    {languages.find((l) => l.code === currentLang)?.native || 'English'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14, fontWeight: '500' }}>
                {t('select_language_subtitle', 'Select system interface language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ')}
              </Text>

              {/* Language Dropdown Trigger */}
              <TouchableOpacity
                style={[
                  styles.modalDropdownBtn,
                  profileLangDropdownOpen && styles.modalDropdownBtnActive,
                  { backgroundColor: '#ffffff', borderColor: profileLangDropdownOpen ? '#2563eb' : '#cbd5e1', paddingVertical: 14 }
                ]}
                onPress={() => setProfileLangDropdownOpen(!profileLangDropdownOpen)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>
                    {languages.find((l) => l.code === currentLang)?.flag || '🌐'}
                  </Text>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                      {languages.find((l) => l.code === currentLang)?.native || 'English'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#64748b', fontWeight: '500' }}>
                      {languages.find((l) => l.code === currentLang)?.label || 'English'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '800' }}>
                  {profileLangDropdownOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {/* Dropdown Menu Options */}
              {profileLangDropdownOpen && (
                <View style={[styles.modalDropdownMenu, { maxHeight: 260, borderColor: '#bfdbfe' }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 260 }}>
                    {languages.map((lang) => {
                      const isActive = currentLang === lang.code;
                      return (
                        <TouchableOpacity
                          key={lang.code}
                          style={[
                            styles.modalDropdownItem,
                            isActive && styles.modalDropdownItemActive,
                            { paddingVertical: 12, paddingHorizontal: 16 }
                          ]}
                          onPress={() => {
                            setCurrentLang(lang.code);
                            setProfileLangDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={{ fontSize: 20 }}>{lang.flag || '🌐'}</Text>
                            <View>
                              <Text style={[
                                styles.modalDropdownItemText,
                                isActive && styles.modalDropdownItemTextActive,
                                { fontSize: 14 }
                              ]}>
                                {lang.native}
                              </Text>
                              <Text style={{ fontSize: 11.5, color: isActive ? '#2563eb' : '#64748b', fontWeight: '500' }}>
                                {lang.label}
                              </Text>
                            </View>
                          </View>
                          {isActive && (
                            <View style={{ backgroundColor: '#2563eb', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Sign Out Card */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>⚙️ {t('account_actions', 'Account Actions')}</Text>
              <TouchableOpacity
                style={styles.profileSignOutBtn}
                onPress={() => {
                  Alert.alert(t('btn_sign_out', 'Sign Out'), t('sign_out_alert_msg', 'Sign out of the Admin Workspace?'), [
                    { text: t('cancel', 'Cancel'), style: 'cancel' },
                    { text: t('btn_sign_out', 'Sign Out'), style: 'destructive', onPress: () => logout() },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.profileSignOutBtnText}>🚪  {t('btn_sign_out', 'Sign Out')}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </View>
        )}
      </ScrollView>

      {/* ── MODAL 2: LOCKED BUSES DIRECTORY MODAL (Exact Match with admin.html) ── */}
      <Modal visible={lockedModalOpen} transparent animationType="slide" onRequestClose={() => setLockedModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>DEPOT VEHICLE ISOLATION DIRECTORY</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.modalTitle}>🔒 Locked Buses Directory</Text>
                  <View style={styles.lockedModalCountBadge}>
                    <Text style={styles.lockedModalCountText}>{modalDepotLockedList.length} Buses</Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  Buses currently isolated under fast charging, cleaning, or post-trip turnaround protocols (requiring both charging & cleaning before scheduling).
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                
                <TouchableOpacity onPress={() => setLockedModalOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Depot Selector Pills inside Locked Modal */}
            <View style={[styles.depotPillBar, { marginBottom: 10, marginTop: 4 }]}>
              {[
                { id: 'all', label: `All Depots (${lockedBuses.length})` },
                { id: '1', label: `Depot 1 (${lockedBuses.filter(b => String(b.depot || '1') === '1').length})` },
                { id: '2', label: `Depot 2 (${lockedBuses.filter(b => String(b.depot || '1') === '2').length})` },
              ].map((item) => {
                const isActive = lockedDepotFilter === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.depotPill, isActive && styles.depotPillActive]}
                    onPress={() => setLockedDepotFilter(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.depotPillLabel, isActive && styles.depotPillLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Breakdown Stats Bar (Includes Turnaround) */}
            <View style={styles.lockedStatsSummaryBar}>
              <View style={styles.lockedStatItem}>
                <Text style={styles.lockedStatNumber}>{modalDepotLockedList.length}</Text>
                <Text style={styles.lockedStatLabel}>Total Locked</Text>
              </View>
              <View style={styles.lockedStatDivider} />
              <View style={styles.lockedStatItem}>
                <Text style={[styles.lockedStatNumber, { color: '#0284c7' }]}>{modalDepotChargingCount}</Text>
                <Text style={styles.lockedStatLabel}>⚡ Charging</Text>
              </View>
              <View style={styles.lockedStatDivider} />
              <View style={styles.lockedStatItem}>
                <Text style={[styles.lockedStatNumber, { color: '#d97706' }]}>{modalDepotCleaningCount}</Text>
                <Text style={styles.lockedStatLabel}>🧹 Cleaning</Text>
              </View>
              <View style={styles.lockedStatDivider} />
              <View style={styles.lockedStatItem}>
                <Text style={[styles.lockedStatNumber, { color: '#92400e' }]}>{modalDepotTurnaroundCount}</Text>
                <Text style={styles.lockedStatLabel}>🔄 Turnaround</Text>
              </View>
            </View>

            {/* Type Filter Pills */}
            <View style={styles.filterPillsRow}>
              {[
                { id: 'all', label: `All (${modalDepotLockedList.length})` },
                { id: 'charging', label: `⚡ Charging (${modalDepotChargingCount})` },
                { id: 'cleaning', label: `🧹 Cleaning (${modalDepotCleaningCount})` },
                { id: 'turnaround', label: `🔄 Turnaround (${modalDepotTurnaroundCount})` },
              ].map((tab) => {
                const isActive = lockedFilterType === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.catFilterPill, isActive && styles.catFilterPillActive]}
                    onPress={() => setLockedFilterType(tab.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catFilterPillText, isActive && styles.catFilterPillTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search Box */}
            <View style={[styles.modalSearchRow, { marginBottom: 8 }]}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search locked bus, bay, or reason..."
                placeholderTextColor="#94a3b8"
                value={lockedSearch}
                onChangeText={setLockedSearch}
                autoCorrect={false}
              />
              {lockedSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLockedSearch('')} style={styles.modalClearSearch}>
                  <Text style={styles.modalClearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Sorting Strip */}
            <View style={styles.sortStripRow}>
              <Text style={styles.sortStripTitle}>Sort:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
                {[
                  { id: 'charging-first', label: '⚡ Charging First' },
                  { id: 'cleaning-first', label: '🧹 Cleaning First' },
                  { id: 'turnaround-first', label: '🔄 Turnaround First' },
                  { id: 'bm-asc', label: '🔤 BM A-Z' },
                  { id: 'depot', label: '🏢 Depot' },
                ].map((s) => {
                  const isActive = lockedSortBy === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.sortPill, isActive && styles.sortPillActive]}
                      onPress={() => setLockedSortBy(s.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {filteredLockedBuses.length === 0 ? (
                <View style={styles.emptyLockedBox}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>{lockedBuses.length === 0 ? '✅' : '🔍'}</Text>
                  <Text style={styles.emptyLockedTitle}>
                    {lockedBuses.length === 0 ? 'No Locked Buses in Fleet' : 'No Matching Locked Buses'}
                  </Text>
                  <Text style={styles.emptyLockedSub}>
                    {lockedBuses.length === 0
                      ? 'All buses are currently in service or available in yard.'
                      : 'Try adjusting your type filter or search keyword.'}
                  </Text>
                </View>
              ) : (
                filteredLockedBuses.map((item, idx) => {
                  const isChg = (String(item.page || item.type || item.reason || '').toLowerCase().includes('charg') || item.isCharging) && !item.isTurnaround;
                  const isCln = (String(item.page || item.type || item.reason || '').toLowerCase().includes('clean') || item.isCleaning) && !item.isTurnaround;
                  const isTrn = Boolean(item.isTurnaround || String(item.page || item.type || item.reason || '').toLowerCase().includes('turnaround'));
                  const busDepot = item.depot || '1';
                  return (
                    <View key={idx} style={[styles.lockedBusCard, isTrn && { borderColor: '#fde68a', backgroundColor: '#fffdfa' }]}>
                      <View style={styles.rowBetween}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.lockedBusBm}>🚌 {item.bm || item.bmNumber}</Text>
                          <Text style={styles.lockedBusReg}>({item.reg || `KA51AH${String(item.bm || '').replace(/\D/g, '').padStart(4, '0')}`})</Text>
                        </View>
                        <View style={[styles.depotBadgePill, busDepot === '2' ? styles.depotBadgePill2 : styles.depotBadgePill1]}>
                          <Text style={[styles.depotBadgePillText, busDepot === '2' ? { color: '#6d28d9' } : { color: '#0f766e' }]}>
                            Depot {busDepot}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.lockedBayRow}>
                        <View style={[styles.typeBadge, isTrn ? { backgroundColor: '#fef3c7', borderColor: '#d97706' } : isChg ? styles.typeBadgeChg : styles.typeBadgeCln]}>
                          <Text style={[styles.typeBadgeText, isTrn ? { color: '#92400e' } : isChg ? { color: '#0369a1' } : { color: '#b45309' }]}>
                            {isTrn ? '🔄 TURNAROUND (SERVICING REQUIRED)' : isChg ? '⚡ FAST CHARGING' : '🧹 CLEANING & WASH'}
                          </Text>
                        </View>
                        <Text style={styles.bayText}>📍 {item.chargerBay || item.bay || (isTrn ? 'Yard Holding Lane (Turnaround)' : isChg ? 'Charging Bay #1' : 'Cleaning Lane #1')}</Text>
                      </View>

                      <Text style={styles.lockedReasonText}>
                        <Text style={{ fontWeight: '700', color: '#475569' }}>Reason: </Text>
                        {item.reason || (isTrn ? 'Turnaround: Charging & Cleaning Required Before Scheduling' : isChg ? 'Under Fast Charging (target 100% floor)' : 'Under Bus Interior & Exterior Cleaning')}
                      </Text>

                      {isTrn && (
                        <View style={{ marginTop: 6, padding: 8, backgroundColor: '#fef3c7', borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400e', marginBottom: 4 }}>
                            📋 Mandatory Servicing Requirements:
                          </Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 11, color: item.chargingCompleted ? '#15803d' : '#b45309', fontWeight: '600' }}>
                              ⚡ Charging: {item.chargingCompleted ? '✅ Completed' : '⏳ Required'}
                            </Text>
                            <Text style={{ fontSize: 11, color: item.cleaningCompleted ? '#15803d' : '#b45309', fontWeight: '600' }}>
                              🧹 Cleaning: {item.cleaningCompleted ? '✅ Completed' : '⏳ Required'}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#78350f', marginTop: 4, fontStyle: 'italic' }}>
                            ⚠️ Must complete BOTH charging and cleaning before bus can be scheduled.
                          </Text>
                        </View>
                      )}

                      <View style={styles.lockedFooterRow}>
                        <Text style={styles.lockedTimeText}>🕒 Started: {item.startTime || 'Recently'}</Text>
                        <View style={[styles.isolatedBadge, isTrn && { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                          <Text style={[styles.isolatedBadgeText, isTrn && { color: '#92400e' }]}>
                            {isTrn ? '🔒 LOCKED (TURNAROUND)' : '🔒 ISOLATED'}
                          </Text>
                        </View>
                      </View>
                      
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Modal Footer with prominent Close button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalBtnCloseBottom}
                onPress={() => setLockedModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCloseBottomText}>✕ Close Isolation Directory</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2B: RECENTLY COMPLETED BUSES NOTIFICATIONS MODAL (FULL SCREEN MODE) ── */}
      <Modal
        visible={recentCompletedModalOpen}
        transparent={!recentCompletedFullscreen}
        animationType="slide"
        onRequestClose={() => setRecentCompletedModalOpen(false)}
        presentationStyle={recentCompletedFullscreen ? 'fullScreen' : 'overFullScreen'}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={recentCompletedFullscreen ? styles.modalBackdropFullScreen : styles.modalBackdrop}>
          <View style={recentCompletedFullscreen ? styles.modalCardFullScreen : [styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalEyebrow, { color: '#4361ee' }]}>{t('route_arrival_dispatch_log', 'ROUTE ARRIVAL & DISPATCH LOG')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.modalTitle}>🔔 {t('recently_completed_buses', 'Recently Completed Buses')}</Text>
                  <View style={[styles.lockedModalCountBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                    <Text style={[styles.lockedModalCountText, { color: '#15803d' }]}>
                      {turnaroundAllList.length} {t('completed_label', 'Completed')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  {t('recent_completed_subtitle', 'Real-time arrival telemetry of buses that finished assigned routes and safely returned to depot yard.')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={styles.btnHeaderDownload}
                  onPress={async () => {
                    const listToExport = filteredRecentCompleted && filteredRecentCompleted.length > 0 ? filteredRecentCompleted : turnaroundAllList;
                    if (!listToExport || listToExport.length === 0) {
                      Alert.alert(t('no_records_title', 'No Records'), t('no_completed_buses_export', 'No completed buses available to export.'));
                      return;
                    }
                    const headers = [
                      'BM Number',
                      'Registration Number',
                      'Depot',
                      'Route Code',
                      'Route Name',
                      'Driver Name',
                      'Completion / Arrival Time',
                      'Battery SoC (%)',
                      'Status',
                      'Turnaround Bay / Yard Location',
                    ];
                    const rows = listToExport.map((b) => [
                      b.bm || b.bmNumber || '',
                      b.regNo || b.reg || '',
                      b.depot ? `Depot ${b.depot}` : (adminDepotFilter !== 'all' ? `Depot ${adminDepotFilter}` : 'Depot 1'),
                      b.route || b.routeCode || '',
                      b.routeName || '',
                      b.driver || b.driverName || 'Depot Pilot',
                      b.completedTime || b.arrivalTime || b.time || '',
                      b.soc !== undefined ? `${b.soc}%` : '',
                      b.status || 'Route Completed',
                      b.bay || b.location || 'Arrival Bay',
                    ]);
                    const dateStr = new Date().toISOString().slice(0, 10);
                    const depotTag = recentCompletedDepot === 'all' ? 'all_depots' : `depot_${recentCompletedDepot}`;
                    await exportCsvFile(`recently_completed_buses_${depotTag}_${dateStr}.csv`, [headers, ...rows]);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnHeaderDownloadText}>{t('btn_download_csv', '📥 Download CSV')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRecentCompletedFullscreen((prev) => !prev)}
                  style={styles.modalFullscreenToggleBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Toggle Fullscreen Mode"
                >
                  <Text style={styles.modalFullscreenToggleText}>
                    {recentCompletedFullscreen ? '🗗' : '⛶'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRecentCompletedModalOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary Breakdown Bar */}
            <View style={styles.lockedStatsSummaryBar}>
              <View style={styles.lockedStatItem}>
                <Text style={[styles.lockedStatNumber, { color: '#15803d' }]}>{turnaroundAllList.length}</Text>
                <Text style={styles.lockedStatLabel}>Total Returns</Text>
              </View>
              <View style={styles.lockedStatDivider} />
              <View style={styles.lockedStatItem}>
                <Text style={[styles.lockedStatNumber, { color: '#0f766e' }]}>
                  {turnaroundDepot1List.length}
                </Text>
                <Text style={styles.lockedStatLabel}>Depot 1</Text>
              </View>
              <View style={styles.lockedStatDivider} />
              <View style={styles.lockedStatItem}>
                <Text style={[styles.lockedStatNumber, { color: '#7c3aed' }]}>
                  {turnaroundDepot2List.length}
                </Text>
                <Text style={styles.lockedStatLabel}>Depot 2</Text>
              </View>
            </View>

            {/* Depot Filter Tabs */}
            <View style={styles.filterPillsRow}>
              {[
                { id: 'all', label: `All Depots (${turnaroundAllList.length})` },
                { id: '1', label: `Depot 1 (${turnaroundDepot1List.length})` },
                { id: '2', label: `Depot 2 (${turnaroundDepot2List.length})` },
              ].map((tab) => {
                const isActive = recentCompletedDepot === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.catFilterPill, isActive && styles.catFilterPillActive]}
                    onPress={() => setRecentCompletedDepot(tab.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catFilterPillText, isActive && styles.catFilterPillTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search Box */}
            <View style={[styles.modalSearchRow, { marginBottom: 8 }]}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search BM, reg, route, driver..."
                placeholderTextColor="#94a3b8"
                value={recentCompletedSearch}
                onChangeText={setRecentCompletedSearch}
                autoCorrect={false}
              />
              {recentCompletedSearch.length > 0 && (
                <TouchableOpacity onPress={() => setRecentCompletedSearch('')} style={styles.modalClearSearch}>
                  <Text style={styles.modalClearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Sorting Strip */}
            <View style={styles.sortStripRow}>
              <Text style={styles.sortStripTitle}>Sort:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
                {[
                  { id: 'time-desc', label: '🕒 Latest First' },
                  { id: 'time-asc', label: '⏱️ Earliest First' },
                  { id: 'bm-asc', label: '🔤 BM A-Z' },
                ].map((s) => {
                  const isActive = recentCompletedSortBy === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.sortPill, isActive && styles.sortPillActive]}
                      onPress={() => setRecentCompletedSortBy(s.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* List */}
            <ScrollView
              style={recentCompletedFullscreen ? { flex: 1 } : { maxHeight: 360 }}
              contentContainerStyle={{ paddingBottom: 28 }}
              showsVerticalScrollIndicator={true}
            >
              {filteredRecentCompleted.length === 0 ? (
                <View style={styles.emptyLockedBox}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>🏁</Text>
                  <Text style={styles.emptyLockedTitle}>No Route Completions Found</Text>
                  <Text style={styles.emptyLockedSub}>
                    {completedRoutesLog.length === 0
                      ? 'No buses have completed their assigned routes yet today.'
                      : 'No returned buses match your search or depot filter.'}
                  </Text>
                </View>
              ) : (
                filteredRecentCompleted.map((item, idx) => {
                  const busDepot = item.depot || '1';
                  const matchedBus = buses.find((b) => b.bmNumber === item.bm);
                  const busSoc = matchedBus ? matchedBus.soc : null;

                  return (
                    <View key={item.id || idx} style={styles.completedNotificationCard}>
                      <View style={styles.rowBetween}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                          <Text style={styles.completedCardBm}>🚌 {item.bm}</Text>
                          <Text style={styles.completedCardReg}>({item.reg})</Text>
                        </View>
                        <View style={[styles.depotBadgePill, busDepot === '2' ? styles.depotBadgePill2 : styles.depotBadgePill1]}>
                          <Text style={[styles.depotBadgePillText, busDepot === '2' ? { color: '#6d28d9' } : { color: '#0f766e' }]}>
                            Depot {busDepot}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.completedRouteRow}>
                        <Text style={styles.completedCardRoute}>📍 {item.route || 'Scheduled Route'}</Text>
                        {item.schedule ? (
                          <View style={styles.completedSchedulePill}>
                            <Text style={styles.completedSchedulePillText}>{item.schedule}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.completedCardBadgesRow}>
                        <View style={styles.completedBadgeReturned}>
                          <Text style={styles.completedBadgeReturnedText}>✓ RETURNED / IN YARD</Text>
                        </View>
                        <View style={styles.completedBadgeCooldown}>
                          <Text style={styles.completedBadgeCooldownText}>⏱ Turnaround Cooldown</Text>
                        </View>
                        {busSoc !== null && (
                          <View style={styles.completedBadgeSoc}>
                            <Text style={styles.completedBadgeSocText}>🔋 {busSoc}%</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.completedMetaRow}>
                        <Text style={styles.completedCardDriver}>👤 {item.driver || 'Assigned Driver'}</Text>
                        <Text style={styles.completedCardTime}>🕒 {item.completedAt || 'Recently'}</Text>
                      </View>

                      {item.remarks ? (
                        <Text style={styles.completedRemarksText}>
                          <Text style={{ fontWeight: '700', color: '#475569' }}>Note: </Text>
                          {item.remarks}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Modal Footer with prominent Close button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalBtnCloseBottom}
                onPress={() => setRecentCompletedModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCloseBottomText}>✕ Close Notifications Feed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL: DATASET TARGET DEPOT SELECTION MODAL ── */}
      <Modal
        visible={datasetDepotModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDatasetDepotModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdropDimmed}
          activeOpacity={1}
          onPress={() => setDatasetDepotModalOpen(false)}
        >
          <View
            style={[styles.plusOptionsSheet, { maxWidth: 440, padding: 20 }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bfdbfe' }}>
                  <Text style={{ fontSize: 20 }}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                    {t('target_depot_for_dataset', 'Target Depot for Dataset')}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748b' }}>
                    {t('select_target_depot_prompt', 'Which depot should this dataset be added to?')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setDatasetDepotModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12.5, color: '#475569', marginBottom: 12, lineHeight: 18 }}>
              Please select the operating depot for this dataset spreadsheet or CSV file (e.g. schedules, Form 4 consolidation, or battery allocation data):
            </Text>

            {/* List of Available Depots */}
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {depotsList.map((d) => {
                const dId = String(d.id);
                const isSelected = String(datasetTargetDepot) === dId;
                const dName = d.name || `Depot ${dId}${d.location ? ' - ' + d.location : ''}`;
                const depotBusCount = buses.filter((b) => String(b.depot || '1').replace(/^DEPOT\s*/i, '').trim() === dId).length;
                return (
                  <TouchableOpacity
                    key={dId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8
                    }}
                    onPress={() => handleSelectDepotForDataset(dId, dName)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 20 }}>🏢</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: isSelected ? '#1e40af' : '#1e293b' }}>
                          {dName}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>
                          Depot ID: {dId} • {depotBusCount} Active Fleet Buses
                        </Text>
                      </View>
                    </View>
                    <View style={{
                      backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                      borderWidth: 1,
                      borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 5
                    }}>
                      <Text style={{ color: isSelected ? '#ffffff' : '#2563eb', fontSize: 11.5, fontWeight: '800' }}>
                        {isSelected ? '✓ Selected' : 'Choose ➔'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* All Depots / System Wide Option */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: datasetTargetDepot === 'all' ? '#eff6ff' : '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: datasetTargetDepot === 'all' ? '#2563eb' : '#e2e8f0',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8
                }}
                onPress={() => handleSelectDepotForDataset('all', 'All Depots (System Master)')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 20 }}>🌐</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: datasetTargetDepot === 'all' ? '#1e40af' : '#1e293b' }}>
                      All Depots (System Master)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>
                      Apply dataset globally across all {depotsList.length} depots
                    </Text>
                  </View>
                </View>
                <View style={{
                  backgroundColor: datasetTargetDepot === 'all' ? '#2563eb' : '#ffffff',
                  borderWidth: 1,
                  borderColor: datasetTargetDepot === 'all' ? '#2563eb' : '#cbd5e1',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 5
                }}>
                  <Text style={{ color: datasetTargetDepot === 'all' ? '#ffffff' : '#2563eb', fontSize: 11.5, fontWeight: '800' }}>
                    {datasetTargetDepot === 'all' ? '✓ Selected' : 'Choose ➔'}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={{ marginTop: 10, paddingVertical: 10, alignItems: 'center' }}
              onPress={() => setDatasetDepotModalOpen(false)}
            >
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL 0: QUICK FLEET & ROUTE ACTIONS CHOOSER (+ BUTTON) ── */}
      <Modal
        visible={plusOptionsModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPlusOptionsModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdropDimmed}
          activeOpacity={1}
          onPress={() => setPlusOptionsModalOpen(false)}
        >
          <View
            style={styles.plusOptionsSheet}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={styles.plusOptionsHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.plusOptionsEyebrow}>{t('fleet_operations', 'FLEET OPERATIONS')}</Text>
                <Text style={styles.plusOptionsTitle}>➕ {t('management_actions', 'Management Actions')}</Text>
                <Text style={styles.plusOptionsSubtitle}>
                  {t('select_management_action', 'Select an administrative management operation to proceed')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPlusOptionsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Option 1: Add / Delete Depots */}
            <TouchableOpacity
              style={styles.plusOptionCardDepot}
              onPress={() => {
                setPlusOptionsModalOpen(false);
                setDepotsTab('add');
                setDepotAddMode('depot');
                setAddDeleteDepotsFullscreen(true);
                setAddDeleteDepotsModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.plusOptionIconBoxDepot}>
                <Text style={styles.plusOptionIcon}>🏢</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={styles.plusOptionTitle}>1. {t('add_delete_depots', 'Add / Delete Depots')}</Text>
                  <View style={styles.plusOptionTagDepot}>
                    <Text style={styles.plusOptionTagTextDepot}>{t('depots_label', 'Depots')}</Text>
                  </View>
                </View>
                <Text style={styles.plusOptionDesc}>
                  {t('depots_mgmt_desc', 'Register new operating depots or decommission/delete depots with audit tracking.')}
                </Text>
              </View>
              <Text style={styles.plusOptionArrow}>➔</Text>
            </TouchableOpacity>

            {/* Option 2: Add / Delete Routes */}
            <TouchableOpacity
              style={styles.plusOptionCardRoute}
              onPress={() => {
                setPlusOptionsModalOpen(false);
                setRoutesTab('add');
                setAddDeleteRoutesFullscreen(true);
                setAddDeleteRoutesModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.plusOptionIconBoxRoute}>
                <Text style={styles.plusOptionIcon}>🛣️</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={styles.plusOptionTitle}>2. {t('add_delete_routes', 'Add / Delete Routes')}</Text>
                  <View style={styles.plusOptionTagRoute}>
                    <Text style={styles.plusOptionTagTextRoute}>{t('routes_label', 'Routes')}</Text>
                  </View>
                </View>
                <Text style={styles.plusOptionDesc}>
                  {t('routes_mgmt_desc', 'Select depot from dropdown first, then add routes or decommission routes for that depot.')}
                </Text>
              </View>
              <Text style={styles.plusOptionArrow}>➔</Text>
            </TouchableOpacity>

            {/* Option 3: Add / Delete Buses */}
            <TouchableOpacity
              style={styles.plusOptionCardBus}
              onPress={() => {
                setPlusOptionsModalOpen(false);
                setAddDeleteTab('add');
                setAddDeleteFullscreen(true);
                setAddDeleteModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.plusOptionIconBoxBus}>
                <Text style={styles.plusOptionIcon}>🚌</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={styles.plusOptionTitle}>3. {t('add_delete_buses', 'Add / Delete Buses')}</Text>
                  <View style={styles.plusOptionTagBus}>
                    <Text style={styles.plusOptionTagTextBus}>{t('fleet_label', 'Fleet')}</Text>
                  </View>
                </View>
                <Text style={styles.plusOptionDesc}>
                  {t('add_delete_buses_desc', 'Induct new electric buses into active service (BM number, registration, depot) or withdraw buses from the fleet.')}
                </Text>
              </View>
              <Text style={styles.plusOptionArrow}>➔</Text>
            </TouchableOpacity>

            {/* Option 4: Add / Delete Bus Drivers */}
            <TouchableOpacity
              style={styles.plusOptionCardDriver}
              onPress={() => {
                setPlusOptionsModalOpen(false);
                setDriversTab('add');
                setAddDeleteDriversFullscreen(true);
                setAddDeleteDriversModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.plusOptionIconBoxDriver}>
                <Text style={styles.plusOptionIcon}>👨‍✈️</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={styles.plusOptionTitle}>4. {t('add_delete_drivers', 'Add / Delete Bus Drivers')}</Text>
                  <View style={styles.plusOptionTagDriver}>
                    <Text style={styles.plusOptionTagTextDriver}>{t('drivers_label', 'Drivers')}</Text>
                  </View>
                </View>
                <Text style={styles.plusOptionDesc}>
                  {t('drivers_mgmt_desc', 'Manage driver rosters by depot, induct certified EV drivers, or withdraw drivers with reason tracking.')}
                </Text>
              </View>
              <Text style={styles.plusOptionArrow}>➔</Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.plusOptionBtnCancel}
              onPress={() => setPlusOptionsModalOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.plusOptionBtnCancelText}>{t('btn_cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL 3: ADD / DELETE BUSES MODAL (FULL SCREEN FLEET MANAGEMENT) ── */}
      <Modal
        visible={addDeleteModalOpen}
        transparent={!addDeleteFullscreen}
        animationType="slide"
        onRequestClose={() => setAddDeleteModalOpen(false)}
        presentationStyle={addDeleteFullscreen ? 'fullScreen' : 'overFullScreen'}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={addDeleteFullscreen ? styles.modalBackdropFullScreen : styles.modalBackdrop}>
          <View style={addDeleteFullscreen ? styles.modalCardFullScreen : [styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalEyebrow, { color: '#4f46e5' }]}>{t('fleet_management', 'FLEET MANAGEMENT')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.modalTitle}>{t('add_delete_buses', '🚌 Add / Delete Buses')}</Text>
                  <View style={styles.newlyAddedBadge}>
                    <Text style={styles.newlyAddedBadgeText}>
                      {auditLogs.filter((a) => a.action === 'ADDED').length} {t('newly_added', 'Newly Added')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  {t('add_delete_buses_subtitle', 'Add new electric buses to the fleet or withdraw/delete buses from available service with mandatory reason tracking.')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setAddDeleteFullscreen((prev) => !prev)}
                  style={styles.modalFullscreenToggleBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Toggle Fullscreen Mode"
                >
                  <Text style={styles.modalFullscreenToggleText}>
                    {addDeleteFullscreen ? '🗗' : '⛶'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddDeleteModalOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Exact 3 Tabs from admin.html */}
            <View style={styles.addDelTabs}>
              <TouchableOpacity
                style={[styles.addDelTab, addDeleteTab === 'delete' && styles.addDelTabActive]}
                onPress={() => setAddDeleteTab('delete')}
              >
                <Text style={[styles.addDelTabText, addDeleteTab === 'delete' && styles.addDelTabTextActive]}>
                  {t('tab_delete_bus', '🗑️ Delete Bus')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, addDeleteTab === 'add' && styles.addDelTabActive]}
                onPress={() => {
                  setAddDeleteTab('add');
                  setAddDeleteFullscreen(true);
                }}
              >
                <Text style={[styles.addDelTabText, addDeleteTab === 'add' && styles.addDelTabTextActive]}>
                  {t('tab_add_bus', '➕ Add Bus')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, addDeleteTab === 'audit' && styles.addDelTabActive]}
                onPress={() => setAddDeleteTab('audit')}
              >
                <Text style={[styles.addDelTabText, addDeleteTab === 'audit' && styles.addDelTabTextActive]}>
                  {t('tab_fleet_audit_log', '📋 Fleet Audit Log')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={addDeleteFullscreen ? { flex: 1 } : { maxHeight: 460 }}
              contentContainerStyle={{ paddingBottom: 28 }}
              showsVerticalScrollIndicator={true}
            >
              {/* ── TAB 1: DELETE BUS (Remove from Fleet) ── */}
              {addDeleteTab === 'delete' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.deleteWarningBanner}>
                    <Text style={styles.deleteWarningText}>
                      <Text style={{ fontWeight: '800' }}>⚠️ {t('warning', 'Warning')}: </Text>
                      {t('del_bus_warn', 'Deleting a bus removes it from the available fleet across all scheduling, departure, charging, and cleaning operations.')}
                    </Text>
                  </View>

                  <Text style={styles.modalFieldLabel}>{t('search_filter_active_buses', 'Search & Filter Active Buses')}</Text>
                  <View style={[styles.modalSearchRow, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder={t('placeholder_filter_bus', 'Filter bus number or reg (e.g. BM001 or 4144)...')}
                      placeholderTextColor="#94a3b8"
                      value={delSearchQuery}
                      onChangeText={setDelSearchQuery}
                      autoCapitalize="characters"
                    />
                    {delSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setDelSearchQuery('')} style={styles.modalClearSearch}>
                        <Text style={styles.modalClearSearchText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.modalFieldLabel}>
                    {t('select_existing_active_bus', 'Select Existing Active Bus')} <Text style={{ color: '#ef4444' }}>*</Text>
                    {selectedDelBms.length > 0 ? ` (${selectedDelBms.length} Selected)` : (delSelectedBm ? ` (${t('selected_badge', 'Selected')}: ${delSelectedBm})` : ` (${filteredDelBuses.length} ${t('active_status', 'Active')})`)}
                  </Text>
                  
                  {/* Multi-Select Action Bar for Buses */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#e0e7ff', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                      onPress={() => setSelectedDelBms(filteredDelBuses.map((b) => b.bmNumber))}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4338ca' }}>
                        ✓ Select All ({filteredDelBuses.length})
                      </Text>
                    </TouchableOpacity>
                    {selectedDelBms.length > 0 && (
                      <TouchableOpacity
                        style={{ backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                        onPress={() => { setSelectedDelBms([]); setDelSelectedBm(''); }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
                          ✕ Clear Selection
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={styles.busSelectorBox} nestedScrollEnabled>
                    {filteredDelBuses.length === 0 ? (
                      <View style={{ padding: 14, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '700' }}>
                          No active bus matches "{delSearchQuery}".
                        </Text>
                      </View>
                    ) : (
                      filteredDelBuses.map((bus) => {
                        const isSelected = selectedDelBms.includes(bus.bmNumber) || delSelectedBm.trim().toUpperCase() === bus.bmNumber.toUpperCase();
                        return (
                          <TouchableOpacity
                            key={bus.bmNumber}
                            style={[
                              styles.delBusOption,
                              isSelected && styles.delBusOptionActive,
                            ]}
                            onPress={() => {
                              if (selectedDelBms.includes(bus.bmNumber)) {
                                setSelectedDelBms((prev) => prev.filter((x) => x !== bus.bmNumber));
                              } else {
                                setSelectedDelBms((prev) => [...prev, bus.bmNumber]);
                                handleSelectDelBus(bus.bmNumber);
                              }
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Text style={{ fontSize: 16, fontWeight: '800', color: isSelected ? '#dc2626' : '#94a3b8', marginRight: 8 }}>
                                {isSelected ? '☑' : '☐'}
                              </Text>
                              <Text style={[styles.delBusOptionText, isSelected && { color: '#dc2626', fontWeight: '800' }]}>
                              🚌 {bus.bmNumber} — {bus.regNo || `KA51AH${bus.bmNumber.replace(/\D/g, '').padStart(4, '0')}`} (Depot {bus.depot || '1'})
                            </Text>
                            </View>
                            {isSelected && (
                              <Text style={{ color: '#dc2626', fontWeight: '800' }}>{t('selected_badge', '✓ Selected')}</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  <Text style={styles.modalFieldLabel}>
                    {t('bus_number_label', 'Bus Number')} (e.g. BM001) <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. BM001"
                    placeholderTextColor="#94a3b8"
                    value={delSelectedBm}
                    onChangeText={(text) => {
                      setDelSelectedBm(text);
                      const clean = text.trim().toUpperCase();
                      const matched = buses.find((b) => String(b.bmNumber).trim().toUpperCase() === clean);
                      if (matched) {
                        setDelReg(matched.regNo || `KA51AH${clean.replace(/\D/g, '').padStart(4, '0')}`);
                        const resolvedDepot = String(matched.depot || '1').replace(/^DEPOT\s*/i, '').trim();
                        setDelDepot(resolvedDepot);
                      }
                    }}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>{t('bus_reg_no_label', 'Bus Registration No.')} (e.g. KA51AH4144) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. KA51AH4144"
                    placeholderTextColor="#94a3b8"
                    value={delReg}
                    onChangeText={setDelReg}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>{t('operating_depot_label', 'Operating Depot')} <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  
                  {/* Search box for selecting operating depot */}
                  <View style={[styles.modalSearchRow, { marginBottom: 8 }]}>
                    <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder={t('search_depot_del_bus_ph', 'Search depot by name or ID (e.g. Peenya, 1)...')}
                      placeholderTextColor="#94a3b8"
                      value={delBusDepotSearchQuery}
                      onChangeText={(val) => {
                        setDelBusDepotSearchQuery(val);
                        if (!delDepotDropdownOpen) setDelDepotDropdownOpen(true);
                      }}
                    />
                    {delBusDepotSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setDelBusDepotSearchQuery('')} style={styles.modalClearSearch}>
                        <Text style={styles.modalClearSearchText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.modalDropdownBtn,
                      delDepotDropdownOpen && styles.modalDropdownBtnActive,
                      !delDepot && { borderColor: '#f87171', backgroundColor: '#fef2f2' }
                    ]}
                    onPress={() => setDelDepotDropdownOpen((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalDropdownBtnText, !delDepot && { color: '#dc2626', fontWeight: '700' }]}>
                      {delDepot
                        ? `🏢 ${depotsList.find((d) => String(d.id) === String(delDepot))?.name || `Depot ${delDepot}`}`
                        : `⚠️ ${t('select_depot_required', 'Select Operating Depot (Required) *')}`}
                    </Text>
                    <Text style={{ fontSize: 12, color: delDepot ? '#64748b' : '#dc2626', fontWeight: '800' }}>
                      {delDepotDropdownOpen ? '▲ Close' : '▼ Open Dropdown'}
                    </Text>
                  </TouchableOpacity>

                  {!delDepot && (
                    <Text style={{ color: '#dc2626', fontSize: 11.5, fontWeight: '700', marginTop: 3, marginBottom: 6 }}>
                      ⚠️ {t('depot_must_be_selected_del_bus', 'Operating depot must be selected before deleting a bus.')}
                    </Text>
                  )}

                  {delDepotDropdownOpen && (
                    <ScrollView style={[styles.modalDropdownMenu, { maxHeight: 180 }]} nestedScrollEnabled>
                      {(() => {
                        const filteredDepots = depotsList.filter((d) => {
                          if (!delBusDepotSearchQuery.trim()) return true;
                          const q = delBusDepotSearchQuery.trim().toLowerCase();
                          return (
                            String(d.id).toLowerCase().includes(q) ||
                            String(d.name || '').toLowerCase().includes(q) ||
                            String(d.location || '').toLowerCase().includes(q)
                          );
                        });

                        if (filteredDepots.length === 0) {
                          return (
                            <View style={{ padding: 12 }}>
                              <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                                No depots matching "{delBusDepotSearchQuery}".
                              </Text>
                            </View>
                          );
                        }

                        return filteredDepots.map((d) => {
                          const dNum = String(d.id);
                          const isSelected = delDepot === dNum;
                          return (
                            <TouchableOpacity
                              key={dNum}
                              style={[styles.modalDropdownItem, isSelected && styles.modalDropdownItemActive]}
                              onPress={() => {
                                setDelDepot(dNum);
                                setDelDepotDropdownOpen(false);
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.modalDropdownItemText, isSelected && styles.modalDropdownItemTextActive]}>
                                  🏢 {d.name || `Depot ${dNum}`} (ID: {d.id})
                                </Text>
                                {d.location && (
                                  <Text style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                                    📍 {d.location}
                                  </Text>
                                )}
                              </View>
                              {isSelected && <Text style={{ color: '#2563eb', fontWeight: '800' }}>✓ Selected</Text>}
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </ScrollView>
                  )}

                  <Text style={styles.modalFieldLabel}>{t('reason_category_label', 'Reason Category')} <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={styles.reasonWrap}>
                    {[
                      { cat: 'Major Breakdown / Motor Defect', key: 'reason_motor_defect', fallback: 'Major Breakdown / Motor Defect' },
                      { cat: 'Battery Pack Degradation / Cell Failure', key: 'reason_battery_degradation', fallback: 'Battery Pack Degradation / Cell Failure' },
                      { cat: 'Severe Accident Damage', key: 'reason_accident_damage', fallback: 'Severe Accident Damage' },
                      { cat: 'Periodic Heavy Maintenance / Overhaul', key: 'reason_heavy_maintenance', fallback: 'Periodic Heavy Maintenance / Overhaul' },
                      { cat: 'Transferred to Depot 18', key: 'reason_transferred_depot_18', fallback: 'Transferred to Depot 18' },
                      { cat: 'Transferred to Central Workshop', key: 'reason_transferred_central_workshop', fallback: 'Transferred to Central Workshop' },
                      { cat: 'Decommissioned from BMTC Service', key: 'reason_decommissioned_bmtc', fallback: 'Decommissioned from BMTC Service' },
                      { cat: 'Other', key: 'reason_other', fallback: 'Other' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.cat}
                        style={[styles.reasonOption, delReasonSelect === item.cat && styles.reasonOptionActive]}
                        onPress={() => setDelReasonSelect(item.cat)}
                      >
                        <Text style={[styles.reasonOptionText, delReasonSelect === item.cat && styles.reasonOptionTextActive]}>
                          {delReasonSelect === item.cat ? '● ' : '○ '} {t(item.key, item.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalFieldLabel}>{t('detailed_reason_del_label', 'Detailed Reason for Deleting Bus')} <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                    placeholder={t('placeholder_explain_del', 'Explain why this bus is being removed from the fleet...')}
                    placeholderTextColor="#94a3b8"
                    value={delReasonDetail}
                    onChangeText={setDelReasonDetail}
                    multiline
                  />

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>{t('btn_cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitDel} onPress={handleSubmitDelete}>
                      <Text style={styles.btnSubmitDelText}>
                        {selectedDelBms.length > 1
                          ? `🗑️ Delete ${selectedDelBms.length} Selected Buses from Fleet`
                          : t('btn_delete_bus_fleet', '🗑️ Delete Bus from Available Fleet')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── TAB 2: ADD BUS (New Induction) ── */}
              {addDeleteTab === 'add' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.addInfoBanner}>
                    <Text style={styles.addInfoText}>
                      <Text style={{ fontWeight: '800' }}>✨ {t('note_label', 'Note')}: </Text>
                      {t('add_bus_note', 'Adding a new bus will register it in the available fleet and automatically mark it with a distinct ✨ Newly Added Bus badge across all system dashboards.')}
                    </Text>
                  </View>

                  <Text style={styles.modalFieldLabel}>{t('bus_number_label', 'Bus Number')} (e.g. BM001 or BM305) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. BM305"
                    placeholderTextColor="#94a3b8"
                    value={addBm}
                    onChangeText={setAddBm}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>{t('bus_reg_no_label', 'Bus Registration No.')} (e.g. KA51AH4144) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. KA51AH4144"
                    placeholderTextColor="#94a3b8"
                    value={addReg}
                    onChangeText={setAddReg}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>{t('operating_depot_label', 'Operating Depot')} <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  
                  {/* Search box for selecting operating depot */}
                  <View style={[styles.modalSearchRow, { marginBottom: 8 }]}>
                    <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder={t('search_depot_for_bus_ph', 'Search depot by name or ID (e.g. Chandra Layout, Peenya, 1)...')}
                      placeholderTextColor="#94a3b8"
                      value={addBusDepotSearchQuery}
                      onChangeText={(val) => {
                        setAddBusDepotSearchQuery(val);
                        if (!addDepotDropdownOpen) setAddDepotDropdownOpen(true);
                      }}
                    />
                    {addBusDepotSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setAddBusDepotSearchQuery('')} style={styles.modalClearSearch}>
                        <Text style={styles.modalClearSearchText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Drop-down menu for operating depot */}
                  <TouchableOpacity
                    style={[
                      styles.modalDropdownBtn,
                      addDepotDropdownOpen && styles.modalDropdownBtnActive,
                      !addDepot && { borderColor: '#f87171', backgroundColor: '#fef2f2' }
                    ]}
                    onPress={() => setAddDepotDropdownOpen((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalDropdownBtnText, !addDepot && { color: '#dc2626', fontWeight: '700' }]}>
                      {addDepot
                        ? `🏢 ${depotsList.find((d) => String(d.id) === String(addDepot))?.name || `Depot ${addDepot}`}`
                        : `⚠️ ${t('select_depot_required', 'Select Operating Depot (Required) *')}`}
                    </Text>
                    <Text style={{ fontSize: 12, color: addDepot ? '#64748b' : '#dc2626', fontWeight: '800' }}>
                      {addDepotDropdownOpen ? '▲ Close' : '▼ Open Dropdown'}
                    </Text>
                  </TouchableOpacity>

                  {!addDepot && (
                    <Text style={{ color: '#dc2626', fontSize: 11.5, fontWeight: '700', marginTop: 3, marginBottom: 6 }}>
                      ⚠️ {t('depot_must_be_selected_bus', 'Operating depot must be selected before adding a bus.')}
                    </Text>
                  )}

                  {addDepotDropdownOpen && (
                    <ScrollView style={[styles.modalDropdownMenu, { maxHeight: 180 }]} nestedScrollEnabled>
                      {(() => {
                        const filteredDepots = depotsList.filter((d) => {
                          if (!addBusDepotSearchQuery.trim()) return true;
                          const q = addBusDepotSearchQuery.trim().toLowerCase();
                          return (
                            String(d.id).toLowerCase().includes(q) ||
                            String(d.name || '').toLowerCase().includes(q) ||
                            String(d.location || '').toLowerCase().includes(q)
                          );
                        });

                        if (filteredDepots.length === 0) {
                          return (
                            <View style={{ padding: 12 }}>
                              <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                                No depots matching "{addBusDepotSearchQuery}".
                              </Text>
                            </View>
                          );
                        }

                        return filteredDepots.map((d) => {
                          const dNum = String(d.id);
                          const isSelected = addDepot === dNum;
                          return (
                            <TouchableOpacity
                              key={dNum}
                              style={[styles.modalDropdownItem, isSelected && styles.modalDropdownItemActive]}
                              onPress={() => {
                                setAddDepot(dNum);
                                setAddDepotDropdownOpen(false);
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.modalDropdownItemText, isSelected && styles.modalDropdownItemTextActive]}>
                                  🏢 {d.name || `Depot ${dNum}`} (ID: {d.id})
                                </Text>
                                {d.location && (
                                  <Text style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                                    📍 {d.location}
                                  </Text>
                                )}
                              </View>
                              {isSelected && <Text style={{ color: '#2563eb', fontWeight: '800' }}>✓ Selected</Text>}
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </ScrollView>
                  )}

                  <Text style={styles.modalFieldLabel}>{t('fleet_range_category', 'Fleet Range Category')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {[
                      { cat: 'A', label: 'Category A — High Range (>150 km)' },
                      { cat: 'B', label: 'Category B — Standard Range (100–150 km)' },
                      { cat: 'C', label: 'Category C — Short Range (<100 km)' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.cat}
                        style={[styles.modalCatBtn, addCat === item.cat && styles.modalCatBtnActive]}
                        onPress={() => setAddCat(item.cat)}
                      >
                        <Text style={[styles.modalCatBtnText, addCat === item.cat && styles.modalCatBtnTextActive]}>
                          Cat {item.cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalFieldLabel}>{t('initial_battery_soc', 'Initial Battery SoC (%)')} <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="100"
                    placeholderTextColor="#94a3b8"
                    value={addSoc}
                    onChangeText={setAddSoc}
                    keyboardType="number-pad"
                  />

                  <Text style={styles.modalFieldLabel}>{t('reason_category_label', 'Reason Category')} <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={styles.reasonWrap}>
                    {[
                      { cat: 'New Electric Bus Induction (Ashok Leyland EiV12)', key: 'reason_induction_eiv12', fallback: 'New Electric Bus Induction (Ashok Leyland EiV12)' },
                      { cat: 'Fleet Expansion (Depot 32)', key: 'reason_fleet_expansion', fallback: 'Fleet Expansion (Depot 32)' },
                      { cat: 'Re-inducted after Major Overhaul', key: 'reason_reinducted_overhaul', fallback: 'Re-inducted after Major Overhaul' },
                      { cat: 'Transferred from Depot 18', key: 'reason_transferred_depot_18', fallback: 'Transferred from Depot 18' },
                      { cat: 'Replacement for Decommissioned Vehicle', key: 'reason_replacement_decommissioned', fallback: 'Replacement for Decommissioned Vehicle' },
                      { cat: 'Other', key: 'reason_other', fallback: 'Other' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.cat}
                        style={[styles.reasonOption, addReasonSelect === item.cat && styles.reasonOptionActive]}
                        onPress={() => setAddReasonSelect(item.cat)}
                      >
                        <Text style={[styles.reasonOptionText, addReasonSelect === item.cat && styles.reasonOptionTextActive]}>
                          {addReasonSelect === item.cat ? '● ' : '○ '} {t(item.key, item.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalFieldLabel}>{t('detailed_reason_add_label', 'Detailed Reason for Adding Bus')} <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                    placeholder={t('placeholder_explain_add', 'Explain why this bus is being added to the fleet...')}
                    placeholderTextColor="#94a3b8"
                    value={addReasonDetail}
                    onChangeText={setAddReasonDetail}
                    multiline
                  />

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>{t('btn_cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitAdd} onPress={handleSubmitAdd}>
                      <Text style={styles.btnSubmitAddText}>{t('btn_confirm_add_bus', '➕ Confirm & Add Bus to Fleet')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── TAB 3: FLEET AUDIT LOG & CHANGES ── */}
              {addDeleteTab === 'audit' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.auditLogHeaderStack}>
                    <Text style={styles.auditLogTitle}>{t('fleet_audit_trail_title', '📋 Fleet Modification Audit Trail')}</Text>
                    <Text style={styles.auditLogSub}>
                      {t('fleet_audit_trail_sub', 'Showing recorded inductions and decommissioning events synced with website.')}
                    </Text>
                    <View style={styles.sectionActionsRow}>
                      <TouchableOpacity
                        style={styles.btnHeaderDownload}
                        onPress={async () => {
                          if (!auditLogs || auditLogs.length === 0) {
                            Alert.alert('No Records', 'No fleet audit trail entries to export.');
                            return;
                          }
                          const headers = [
                            'Audit Action',
                            'Depot',
                            'BM Number',
                            'Registration Number',
                            'Bus Model',
                            'Battery SoC (%)',
                            'Timestamp',
                            'Details / Remarks',
                          ];
                          const rows = auditLogs.map((entry) => [
                            entry.action || 'ACTION',
                            entry.depot ? `Depot ${entry.depot}` : 'Depot 1',
                            entry.bmNumber || '',
                            entry.regNo || '',
                            entry.model || 'ELECTRIC BUS AC EiV12',
                            entry.soc !== undefined ? `${entry.soc}%` : '',
                            entry.timestamp || '',
                            entry.note || '',
                          ]);
                          const dateStr = new Date().toISOString().slice(0, 10);
                          await exportCsvFile(`fleet_audit_log_history_${dateStr}.csv`, [headers, ...rows]);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.btnHeaderDownloadText}>{t('btn_download_csv', '📥 Download CSV')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Dropdown Menu to Select Action to be Audited for Fleet */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.modalFieldLabel}>{t('filter_action_label', 'Filter Action to be Audited')}</Text>
                    <TouchableOpacity
                      style={[styles.modalDropdownBtn, fleetAuditActionDropdownOpen && styles.modalDropdownBtnActive]}
                      onPress={() => setFleetAuditActionDropdownOpen((prev) => !prev)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalDropdownBtnText}>
                        {fleetAuditActionFilter === 'all' && `🌐 ${t('all_actions', 'All Actions')} (${auditLogs.length})`}
                        {fleetAuditActionFilter === 'ADDED' && `➕ ${t('badge_inducted', 'Inducted Buses')} (${auditLogs.filter((a) => a.action === 'ADDED').length})`}
                        {fleetAuditActionFilter === 'DELETED' && `🗑️ ${t('badge_removed', 'Removed Buses')} (${auditLogs.filter((a) => a.action === 'DELETED').length})`}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>
                        {fleetAuditActionDropdownOpen ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {fleetAuditActionDropdownOpen && (
                      <ScrollView style={styles.modalDropdownMenu} nestedScrollEnabled>
                        {[
                          { id: 'all', label: `🌐 ${t('all_actions', 'All Actions')} (${auditLogs.length})` },
                          { id: 'ADDED', label: `➕ ${t('badge_inducted', 'Inducted Buses')} (${auditLogs.filter((a) => a.action === 'ADDED').length})` },
                          { id: 'DELETED', label: `🗑️ ${t('badge_removed', 'Removed Buses')} (${auditLogs.filter((a) => a.action === 'DELETED').length})` },
                        ].map((opt) => {
                          const isSelected = fleetAuditActionFilter === opt.id;
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[styles.modalDropdownItem, isSelected && styles.modalDropdownItemActive]}
                              onPress={() => {
                                setFleetAuditActionFilter(opt.id);
                                setFleetAuditActionDropdownOpen(false);
                              }}
                            >
                              <Text style={[styles.modalDropdownItemText, isSelected && styles.modalDropdownItemTextActive]}>
                                {opt.label}
                              </Text>
                              {isSelected && <Text style={{ color: '#2563eb', fontWeight: '800' }}>✓</Text>}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {auditLogs
                    .filter((entry) => fleetAuditActionFilter === 'all' || entry.action === fleetAuditActionFilter)
                    .map((entry) => {
                    const isAdded = entry.action === 'ADDED';
                    return (
                      <View key={entry.id} style={styles.auditCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.auditPill, isAdded ? styles.auditPillAdd : styles.auditPillDel]}>
                              <Text style={[styles.auditPillText, isAdded ? { color: '#166534' } : { color: '#991b1b' }]}>
                                {isAdded ? t('badge_inducted', '➕ INDUCTED') : t('badge_removed', '🗑️ REMOVED')}
                              </Text>
                            </View>
                            <Text style={styles.auditBm}>🚌 {entry.bm}</Text>
                            <Text style={styles.auditReg}>({entry.reg})</Text>
                          </View>
                          <Text style={styles.auditDepotText}>Depot {entry.depot}</Text>
                        </View>

                        <Text style={styles.auditReason}>{entry.reasonCategory}</Text>
                        {entry.detail ? <Text style={styles.auditDetail}>{entry.detail}</Text> : null}

                        <View style={styles.auditFooterRow}>
                          <Text style={styles.auditTimestamp}>🕒 {entry.timestamp}</Text>
                          <Text style={styles.auditUser}>👤 {entry.user}</Text>
                        </View>

                        {!isAdded && (
                          <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <TouchableOpacity
                              style={styles.restoreBusBtn}
                              onPress={() => {
                                Alert.alert(
                                  'Restore Bus to Active Fleet',
                                  `Restore Bus ${entry.bm} (${entry.reg || 'Active'}) back into available fleet?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: '🔄 Restore Bus',
                                      onPress: async () => {
                                        await restoreBusToFleet(entry.bm);
                                        Alert.alert('✅ Bus Restored', `Bus ${entry.bm} restored to active fleet successfully!`);
                                        setAuditLogs((prev) => prev.filter((a) => a.bm !== entry.bm || a.action !== 'DELETED'));
                                      },
                                    },
                                  ]
                                );
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.restoreBusBtnText}>{t('btn_restore_bus', '🔄 Restore Bus to Fleet')}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

            {/* ── MODAL 3B: ADD / DELETE DEPOTS MODAL (DEPOTS ONLY) ── */}
      <Modal
        visible={addDeleteDepotsModalOpen}
        transparent={!addDeleteDepotsFullscreen}
        animationType="slide"
        onRequestClose={() => setAddDeleteDepotsModalOpen(false)}
        presentationStyle={addDeleteDepotsFullscreen ? 'fullScreen' : 'overFullScreen'}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={addDeleteDepotsFullscreen ? styles.modalBackdropFullScreen : styles.modalBackdrop}>
          <View style={addDeleteDepotsFullscreen ? styles.modalCardFullScreen : [styles.modalCard, { maxHeight: '90%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalEyebrow, { color: '#0d9488' }]}>{t('depot_mgmt_title', 'DEPOT INFRASTRUCTURE MANAGEMENT')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.modalTitle}>{t('add_delete_depots', '🏢 Add / Delete Depots')}</Text>
                  <View style={styles.depotCountHeaderBadge}>
                    <Text style={styles.depotCountHeaderBadgeText}>
                      {depotsList.length} {t('depots_registered', 'Depots Active')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  {t('depots_mgmt_desc', 'Register new operating depots or decommission/delete depots from the fleet network.')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setAddDeleteDepotsFullscreen((prev) => !prev)}
                  style={styles.modalFullscreenToggleBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Toggle Fullscreen Mode"
                >
                  <Text style={styles.modalFullscreenToggleText}>
                    {addDeleteDepotsFullscreen ? '🗗' : '⛶'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddDeleteDepotsModalOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3 Tabs */}
            <View style={styles.addDelTabs}>
              <TouchableOpacity
                style={[styles.addDelTab, depotsTab === 'add' && styles.addDelTabActive]}
                onPress={() => setDepotsTab('add')}
              >
                <Text style={[styles.addDelTabText, depotsTab === 'add' && styles.addDelTabTextActive]}>
                  {t('tab_create_depot', '➕ Create Depot')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, depotsTab === 'delete' && styles.addDelTabActive]}
                onPress={() => setDepotsTab('delete')}
              >
                <Text style={[styles.addDelTabText, depotsTab === 'delete' && styles.addDelTabTextActive]}>
                  {t('tab_delete_depot', '🗑️ Delete Depot')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, depotsTab === 'directory' && styles.addDelTabActive]}
                onPress={() => setDepotsTab('directory')}
              >
                <Text style={[styles.addDelTabText, depotsTab === 'directory' && styles.addDelTabTextActive]}>
                  {t('tab_depot_audit_log', '📋 Depot Audit Log')} ({depotAuditLogs.filter(a => a.action && a.action.includes('DEPOT')).length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Scroll */}
            <ScrollView
              style={addDeleteDepotsFullscreen ? { flex: 1 } : { maxHeight: 520 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* TAB 1: CREATE NEW DEPOT */}
              {depotsTab === 'add' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.depotInfoBanner}>
                    <Text style={styles.depotInfoText}>
                      <Text style={{ fontWeight: '800' }}>🏢 {t('create_new_depot', 'Create New Depot')}: </Text>
                      {t('create_depot_banner', 'Register a new operating facility/depot with its identification code, name, and geographic location.')}
                    </Text>
                  </View>

                  <Text style={styles.modalFieldLabel}>
                    {t('depot_number_id', 'Depot Number / ID')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_depot_id', 'e.g. 3, 4, or EC-3')}
                    placeholderTextColor="#94a3b8"
                    value={newDepotId}
                    onChangeText={setNewDepotId}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>
                    {t('depot_name_field', 'Depot Name')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_depot_name', 'e.g. Depot 3 — Electronic City')}
                    placeholderTextColor="#94a3b8"
                    value={newDepotName}
                    onChangeText={setNewDepotName}
                  />

                  <Text style={styles.modalFieldLabel}>{t('depot_location_field', 'Depot Location / Zone')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_depot_location', 'e.g. Electronic City Phase 1, Bangalore')}
                    placeholderTextColor="#94a3b8"
                    value={newDepotLocation}
                    onChangeText={setNewDepotLocation}
                  />

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteDepotsModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>{t('btn_cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitAddDepot} onPress={handleCreateNewDepot}>
                      <Text style={styles.btnSubmitAddDepotText}>{t('btn_create_depot', '🏢 Create Depot')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 2: DELETE DEPOT */}
              {depotsTab === 'delete' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.delWarnBanner}>
                    <Text style={styles.delWarnText}>
                      <Text style={{ fontWeight: '800' }}>⚠️ {t('warning', 'Warning')}: </Text>
                      {t('depot_del_warn', 'Deleting a depot will permanently remove it from the system and unassign all associated routes.')}
                    </Text>
                  </View>

                  <Text style={styles.modalFieldLabel}>
                    {t('select_depot_to_delete', 'Select Depot to Delete')} <Text style={{ color: '#ef4444' }}>*</Text>
                    {selectedDepotsToDelete.length > 0 ? ` (${selectedDepotsToDelete.length} Selected)` : ''}
                  </Text>

                  {/* Real-time Depot Search Box (Search by ID or Depot Name) */}
                  <View style={[styles.modalSearchRow, { marginBottom: 10 }]}>
                    <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder={t('search_depot_del_ph', 'Search depot by ID or name (e.g. Peenya, 1, 2)...')}
                      placeholderTextColor="#94a3b8"
                      value={delDepotSearchQuery}
                      onChangeText={setDelDepotSearchQuery}
                      autoCapitalize="none"
                    />
                    {delDepotSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setDelDepotSearchQuery('')} style={styles.modalClearSearch}>
                        <Text style={styles.modalClearSearchText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {(() => {
                    const filteredDepotsToDelete = depotsList.filter((d) => {
                      if (!delDepotSearchQuery.trim()) return true;
                      const q = delDepotSearchQuery.trim().toLowerCase();
                      return (
                        String(d.id).toLowerCase().includes(q) ||
                        String(d.name || '').toLowerCase().includes(q) ||
                        String(d.location || '').toLowerCase().includes(q)
                      );
                    });

                    return (
                      <>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                          <TouchableOpacity
                            style={{ backgroundColor: '#fee2e2', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                            onPress={() => setSelectedDepotsToDelete(filteredDepotsToDelete.map((d) => String(d.id)))}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c' }}>
                              ✓ Select All {delDepotSearchQuery.trim() ? `Filtered (${filteredDepotsToDelete.length})` : `Depots (${depotsList.length})`}
                            </Text>
                          </TouchableOpacity>
                          {selectedDepotsToDelete.length > 0 && (
                            <TouchableOpacity
                              style={{ backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                              onPress={() => { setSelectedDepotsToDelete([]); setSelectedDepotToDelete(''); }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
                                ✕ Clear Selection
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {filteredDepotsToDelete.length === 0 ? (
                          <View style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 12 }}>
                            <Text style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                              {delDepotSearchQuery.trim()
                                ? `ℹ️ No depots found matching "${delDepotSearchQuery}".`
                                : t('no_depots_available', 'ℹ️ No operating depots available in the system. Create a new depot in the Add tab.')}
                            </Text>
                          </View>
                        ) : (
                          <ScrollView style={[styles.busSelectorBox, { maxHeight: 180 }]} nestedScrollEnabled>
                            {filteredDepotsToDelete.map((d) => {
                              const dId = String(d.id);
                              const isSelected = selectedDepotsToDelete.includes(dId) || selectedDepotToDelete === dId;
                              return (
                                <TouchableOpacity
                                  key={d.id}
                                  style={[styles.delBusOption, isSelected && styles.delBusOptionActive]}
                                  onPress={() => {
                                    if (selectedDepotsToDelete.includes(dId)) {
                                      setSelectedDepotsToDelete((prev) => prev.filter((x) => x !== dId));
                                    } else {
                                      setSelectedDepotsToDelete((prev) => [...prev, dId]);
                                      setSelectedDepotToDelete(dId);
                                    }
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: isSelected ? '#dc2626' : '#94a3b8', marginRight: 8 }}>
                                      {isSelected ? '☑' : '☐'}
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.delBusOptionText, isSelected && { color: '#dc2626', fontWeight: '800' }]}>
                                        🏢 {d.name} (ID: {d.id})
                                      </Text>
                                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                        📍 {d.location} • {d.routes?.length || 0} {t('routes_attached', 'Routes Attached')}
                                      </Text>
                                    </View>
                                  </View>
                                  {isSelected && (
                                    <Text style={{ color: '#dc2626', fontWeight: '800', marginLeft: 8 }}>{t('selected_badge', '✓ Selected')}</Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </>
                    );
                  })()}

                  <Text style={styles.modalFieldLabel}>
                    {t('decommission_reason_label', 'Decommission Reason')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {[
                      { id: 'Depot Consolidation', labelKey: 'reason_depot_consolidation', fallback: 'Depot Consolidation' },
                      { id: 'Temporary Facility Closed', labelKey: 'reason_facility_closed', fallback: 'Temporary Facility Closed' },
                      { id: 'Merged with Central Yard', labelKey: 'reason_merged_yard', fallback: 'Merged with Central Yard' },
                      { id: 'Other', labelKey: 'reason_other', fallback: 'Other' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.modalCatBtn, delDepotReason === item.id && styles.modalCatBtnActive]}
                        onPress={() => setDelDepotReason(item.id)}
                      >
                        <Text style={[styles.modalCatBtnText, delDepotReason === item.id && styles.modalCatBtnTextActive]}>
                          {t(item.labelKey, item.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {delDepotReason === 'Other' && (
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 12 }]}
                      placeholder={t('placeholder_custom_reason', 'Specify custom deletion reason...')}
                      placeholderTextColor="#94a3b8"
                      value={delDepotCustomReason}
                      onChangeText={setDelDepotCustomReason}
                    />
                  )}

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteDepotsModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>{t('btn_cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitDel} onPress={handleDeleteDepot}>
                      <Text style={styles.btnSubmitDelText}>
                        {selectedDepotsToDelete.length > 1
                          ? `🗑️ Delete ${selectedDepotsToDelete.length} Selected Depots`
                          : t('btn_delete_depot', '🗑️ Delete Depot')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 3: DEPOT AUDIT LOG */}
              {depotsTab === 'directory' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.auditLogHeaderStack}>
                    <Text style={styles.auditLogTitle}>{t('depot_audit_log_title', '📋 Operating Depot Audit Log')}</Text>
                    <Text style={styles.auditLogSub}>
                      {t('depot_audit_log_sub', 'Tracking newly created and decommissioned operating depots.')}
                    </Text>
                  </View>
                  {(() => {
                    const depotLogs = depotAuditLogs.filter(a => a.action && a.action.includes('DEPOT'));
                    if (depotLogs.length === 0) {
                      return (
                        <View style={{ backgroundColor: '#f8fafc', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' }}>
                          <Text style={{ fontSize: 24, marginBottom: 8 }}>🏢</Text>
                          <Text style={{ fontSize: 13.5, color: '#475569', fontWeight: '700', textAlign: 'center' }}>
                            {t('no_depot_records', 'No depot creation or deletion events recorded yet.')}
                          </Text>
                        </View>
                      );
                    }
                    return depotLogs.map((entry) => {
                      const isCreate = entry.action === 'DEPOT_CREATED';
                      return (
                        <View key={entry.id} style={styles.auditCard}>
                          <View style={styles.rowBetween}>
                            <View style={[styles.auditPill, { backgroundColor: isCreate ? '#f0fdf4' : '#fef2f2' }]}>
                              <Text style={[styles.auditPillText, { color: isCreate ? '#166534' : '#991b1b', fontWeight: '800' }]}>
                                {isCreate ? '🏢 DEPOT CREATED' : '🗑️ DEPOT DELETED'}
                              </Text>
                            </View>
                            <Text style={styles.auditTimestamp}>🕒 {entry.time || 'Recorded'}</Text>
                          </View>
                          <Text style={[styles.auditReason, { fontSize: 14, color: '#0f172a', fontWeight: '800', marginTop: 6 }]}>
                            🏢 {entry.fullName || entry.code}
                          </Text>
                          {entry.reason ? (
                            <View style={{ backgroundColor: '#fff1f2', padding: 8, borderRadius: 6, marginTop: 6 }}>
                              <Text style={{ fontSize: 11.5, color: '#991b1b', fontWeight: '600' }}>
                                ⚠️ Reason: {entry.reason}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    });
                  })()}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 3C: ADD / DELETE ROUTES MODAL (OPERATING DEPOT DROPDOWN FIRST) ── */}
      <Modal
        visible={addDeleteRoutesModalOpen}
        transparent={!addDeleteRoutesFullscreen}
        animationType="slide"
        onRequestClose={() => setAddDeleteRoutesModalOpen(false)}
        presentationStyle={addDeleteRoutesFullscreen ? 'fullScreen' : 'overFullScreen'}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={addDeleteRoutesFullscreen ? styles.modalBackdropFullScreen : styles.modalBackdrop}>
          <View style={addDeleteRoutesFullscreen ? styles.modalCardFullScreen : [styles.modalCard, { maxHeight: '90%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalEyebrow, { color: '#059669' }]}>{t('routes_network_title', 'ROUTE NETWORK MANAGEMENT')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.modalTitle}>{t('add_delete_routes', '🛣️ Add / Delete Routes')}</Text>
                  <View style={[styles.depotCountHeaderBadge, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.depotCountHeaderBadgeText, { color: '#166534' }]}>
                      {allAvailableRoutes.length} {t('routes_active', 'Routes Active')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  {t('routes_mgmt_desc', 'Select depot from dropdown first, then add routes or decommission routes for that depot.')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setAddDeleteRoutesFullscreen((prev) => !prev)}
                  style={styles.modalFullscreenToggleBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Toggle Fullscreen Mode"
                >
                  <Text style={styles.modalFullscreenToggleText}>
                    {addDeleteRoutesFullscreen ? '🗗' : '⛶'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddDeleteRoutesModalOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── MANDATORY STEP 1: OPERATING DEPOT DROPDOWN MENU FIRST ── */}
            <View style={styles.routesDepotFilterBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.routesDepotFilterLabel}>
                  🏢 {t('step1_select_depot_routes', 'Step 1: Select Operating Depot for Route Management')}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>
                  {routesSelectedDepot === 'all'
                    ? `${allAvailableRoutes.length} routes in all depots`
                    : `${allAvailableRoutes.filter((r) => String(r.depotId) === String(routesSelectedDepot)).length} routes in this depot`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.routesDepotDropdownBtn}
                onPress={() => setRoutesDepotPickerOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={[styles.routesDepotDropdownBtnText, (!routesSelectedDepot || routesSelectedDepot === 'all') && { color: '#dc2626', fontWeight: '800' }]}>
                  {routesSelectedDepot && routesSelectedDepot !== 'all'
                    ? `🏢 ${depotsList.find((d) => String(d.id) === String(routesSelectedDepot))?.name || `Depot ${routesSelectedDepot}`}`
                    : `⚠️ ${t('select_depot_required', 'Select Operating Depot (Required) *')}`}
                </Text>
                <Text style={{ fontSize: 13, color: routesSelectedDepot && routesSelectedDepot !== 'all' ? '#15803d' : '#dc2626', fontWeight: '800' }}>
                  {routesDepotPickerOpen ? '▲ Close' : '▼ Select Depot'}
                </Text>
              </TouchableOpacity>

              {routesDepotPickerOpen && (
                <ScrollView style={styles.routesDepotDropdownList} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[styles.routesDepotDropdownItem, routesSelectedDepot === 'all' && styles.routesDepotDropdownItemActive]}
                    onPress={() => {
                      setRoutesSelectedDepot('all');
                      setRoutesDepotPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.routesDepotDropdownItemText, routesSelectedDepot === 'all' && styles.routesDepotDropdownItemTextActive]}>
                      🌐 {t('all_operating_depots', 'All Operating Depots')} ({depotsList.length})
                    </Text>
                    {routesSelectedDepot === 'all' && <Text style={{ color: '#15803d', fontWeight: '800' }}>✓</Text>}
                  </TouchableOpacity>
                  {depotsList.map((d) => {
                    const dId = String(d.id);
                    const isSelected = routesSelectedDepot === dId;
                    const rCount = allAvailableRoutes.filter((r) => String(r.depotId) === dId).length;
                    return (
                      <TouchableOpacity
                        key={dId}
                        style={[styles.routesDepotDropdownItem, isSelected && styles.routesDepotDropdownItemActive]}
                        onPress={() => {
                          setRoutesSelectedDepot(dId);
                          setDepotTargetDepot(dId);
                          setRoutesDepotPickerOpen(false);
                        }}
                      >
                        <Text style={[styles.routesDepotDropdownItemText, isSelected && styles.routesDepotDropdownItemTextActive]}>
                          🏢 {d.name} ({rCount} active routes)
                        </Text>
                        {isSelected && <Text style={{ color: '#15803d', fontWeight: '800' }}>✓ Selected</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* 3 Tabs */}
            <View style={styles.addDelTabs}>
              <TouchableOpacity
                style={[styles.addDelTab, routesTab === 'add' && styles.addDelTabActive]}
                onPress={() => setRoutesTab('add')}
              >
                <Text style={[styles.addDelTabText, routesTab === 'add' && styles.addDelTabTextActive]}>
                  {t('tab_register_route', '➕ Add Route for Depot')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, routesTab === 'delete' && styles.addDelTabActive]}
                onPress={() => setRoutesTab('delete')}
              >
                <Text style={[styles.addDelTabText, routesTab === 'delete' && styles.addDelTabTextActive]}>
                  {t('tab_decommission_route', '🗑️ Decommission Route')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, routesTab === 'directory' && styles.addDelTabActive]}
                onPress={() => setRoutesTab('directory')}
              >
                <Text style={[styles.addDelTabText, routesTab === 'directory' && styles.addDelTabTextActive]}>
                  {t('tab_routes_audit', '📋 Routes Audit Log')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Scroll */}
            <ScrollView
              style={addDeleteRoutesFullscreen ? { flex: 1 } : { maxHeight: 520 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* TAB 1: ADD ROUTE TO SELECTED DEPOT */}
              {routesTab === 'add' && (
                <View style={styles.tabContentBox}>
                  {(!routesSelectedDepot || routesSelectedDepot === 'all') && (
                    <View style={{ backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <Text style={{ color: '#b91c1c', fontSize: 12.5, fontWeight: '800' }}>
                        ⚠️ Operating Depot Required: Please select an operating depot in Step 1 above before adding a route. The action cannot proceed without selecting a depot.
                      </Text>
                    </View>
                  )}
                  <View style={styles.depotInfoBanner}>
                    <Text style={styles.depotInfoText}>
                      <Text style={{ fontWeight: '800' }}>🛣️ {t('register_route_for', 'Register Route for')}: </Text>
                      {routesSelectedDepot === 'all'
                        ? 'Select target depot below or pick a specific depot from the dropdown above.'
                        : (depotsList.find((d) => String(d.id) === String(routesSelectedDepot))?.name || `Depot ${routesSelectedDepot}`)}
                    </Text>
                  </View>

                  {/* Target Depot Selector if 'all' was selected in header */}
                  {routesSelectedDepot === 'all' && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.modalFieldLabel}>
                        {t('target_depot_label', 'Target Depot for this Route')} <Text style={{ color: '#ef4444' }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={[styles.modalDropdownBtn, routeDepotDropdownOpen && styles.modalDropdownBtnActive]}
                        onPress={() => setRouteDepotDropdownOpen((prev) => !prev)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.modalDropdownBtnText, !depotTargetDepot && { color: '#94a3b8' }]}>
                          {depotsList.find((d) => String(d.id) === String(depotTargetDepot))?.name || (depotTargetDepot ? `Depot ${depotTargetDepot}` : t('select_depot', 'Select Depot'))}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          {routeDepotDropdownOpen ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>
                      {routeDepotDropdownOpen && (
                        <ScrollView style={styles.modalDropdownMenu} nestedScrollEnabled>
                          {depotsList.map((d) => (
                            <TouchableOpacity
                              key={d.id}
                              style={[styles.modalDropdownItem, String(depotTargetDepot) === String(d.id) && styles.modalDropdownItemActive]}
                              onPress={() => {
                                setDepotTargetDepot(String(d.id));
                                setRouteDepotDropdownOpen(false);
                              }}
                            >
                              <Text style={styles.modalDropdownItemText}>🏢 {d.name}</Text>
                              {String(depotTargetDepot) === String(d.id) && <Text style={{ color: '#2563eb', fontWeight: '800' }}>✓</Text>}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* Route [Full Name] */}
                  <Text style={styles.modalFieldLabel}>
                    {t('route_full_name_label', 'Route [Full Name]')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_route_full_name', 'e.g. Kempegowda Bus Station ➔ Electronic City Wipro Gate')}
                    placeholderTextColor="#94a3b8"
                    value={depotRouteFullName}
                    onChangeText={setDepotRouteFullName}
                  />

                  {/* Route [Short Name] */}
                  <Text style={styles.modalFieldLabel}>
                    {t('route_short_name_label', 'Route [Short Name] / Code')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_route_short_name', 'e.g. 356CW or KBS-3A')}
                    placeholderTextColor="#94a3b8"
                    value={depotRouteShortName}
                    onChangeText={setDepotRouteShortName}
                    autoCapitalize="characters"
                  />

                  {/* Route Starting Point (Origin) */}
                  <Text style={styles.modalFieldLabel}>
                    {t('route_origin_label', 'Route Starting Point (Origin)')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_route_origin', 'e.g. Kempegowda Bus Station (Majestic)')}
                    placeholderTextColor="#94a3b8"
                    value={depotRouteOrigin}
                    onChangeText={setDepotRouteOrigin}
                  />

                  {/* Route Destination Name */}
                  <Text style={styles.modalFieldLabel}>
                    {t('route_destination_label', 'Route Destination Name')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_route_destination', 'e.g. Electronic City Wipro Gate')}
                    placeholderTextColor="#94a3b8"
                    value={depotRouteDestination}
                    onChangeText={setDepotRouteDestination}
                  />

                  {/* Total Distance of the Route */}
                  <Text style={styles.modalFieldLabel}>
                    {t('route_distance_label', 'Total Distance of the Route (km)')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_route_distance', 'e.g. 28.5')}
                    placeholderTextColor="#94a3b8"
                    value={depotRouteDistance}
                    onChangeText={setDepotRouteDistance}
                    keyboardType="numeric"
                  />

                  {/* Shift Selection */}
                  <Text style={styles.modalFieldLabel}>{t('route_shift_type_label', 'Route Shift Type')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {[
                      { id: 'General Shift', labelKey: 'shift_general', fallback: 'General Shift' },
                      { id: 'Morning Shift', labelKey: 'shift_morning', fallback: 'Morning Shift' },
                      { id: 'Night Halt', labelKey: 'shift_night', fallback: 'Night Halt' },
                    ].map((sh) => (
                      <TouchableOpacity
                        key={sh.id}
                        style={[styles.modalShiftBtn, depotRouteShift === sh.id && styles.modalShiftBtnActive]}
                        onPress={() => setDepotRouteShift(sh.id)}
                      >
                        <Text style={[styles.modalShiftBtnText, depotRouteShift === sh.id && styles.modalShiftBtnTextActive]}>
                          {t(sh.labelKey, sh.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Route Complexity Selection */}
                  <Text style={styles.modalFieldLabel}>{t('route_complexity_label', 'Route Complexity (Difficulty & EV Class)')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                      { cat: 'Simple', labelKey: 'complexity_simple', fallback: 'Simple' },
                      { cat: 'Standard', labelKey: 'complexity_standard', fallback: 'Standard' },
                      { cat: 'Moderate', labelKey: 'complexity_moderate', fallback: 'Moderate' },
                      { cat: 'Complex', labelKey: 'complexity_complex', fallback: 'Complex (Cat A)' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.cat}
                        style={[styles.modalCatBtn, depotRouteCategory === item.cat && styles.modalCatBtnActive]}
                        onPress={() => setDepotRouteCategory(item.cat)}
                      >
                        <Text style={[styles.modalCatBtnText, depotRouteCategory === item.cat && styles.modalCatBtnTextActive]}>
                          {t(item.labelKey, item.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Time Complexity Selection */}
                  <Text style={styles.modalFieldLabel}>{t('time_complexity_label', 'Time Complexity Tier')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                      { tc: 'Normal', labelKey: 'time_tier_normal', fallback: 'Normal (Off-Peak)' },
                      { tc: 'Peak', labelKey: 'time_tier_peak', fallback: 'Peak (+15%)' },
                      { tc: 'Extreme Peak', labelKey: 'time_tier_extreme', fallback: 'Extreme Peak (+30%)' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.tc}
                        style={[styles.modalCatBtn, depotRouteTimeComplexity === item.tc && styles.modalCatBtnActive]}
                        onPress={() => setDepotRouteTimeComplexity(item.tc)}
                      >
                        <Text style={[styles.modalCatBtnText, depotRouteTimeComplexity === item.tc && styles.modalCatBtnTextActive]}>
                          {t(item.labelKey, item.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Timetable Departures */}
                  <Text style={styles.modalFieldLabel}>{t('scheduled_departures_label', 'Scheduled Departure Times (Comma Separated)')}</Text>
                  <TextInput
                    style={[styles.modalInput, { marginBottom: 16 }]}
                    placeholder={t('placeholder_departures', 'e.g. 06:30 AM, 08:00 AM, 01:10 PM, 03:00 PM, 06:45 PM')}
                    placeholderTextColor="#94a3b8"
                    value={depotRouteTimetables}
                    onChangeText={setDepotRouteTimetables}
                  />

                  {/* Action Buttons */}
                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteRoutesModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>{t('btn_cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnSubmitAddDepot}
                      onPress={() => {
                        if (routesSelectedDepot !== 'all') {
                          setDepotTargetDepot(routesSelectedDepot);
                        }
                        handleAddRouteToDepot();
                      }}
                    >
                      <Text style={styles.btnSubmitAddDepotText}>{t('btn_register_route', '➕ Register Route to Depot')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 2: DECOMMISSION ROUTE (FILTERED BY SELECTED DEPOT) */}
              {routesTab === 'delete' && (
                <View style={styles.tabContentBox}>
                  {(!routesSelectedDepot || routesSelectedDepot === 'all') && (
                    <View style={{ backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                      <Text style={{ color: '#b91c1c', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>
                        ⚠️ Operating Depot Selection Required
                      </Text>
                      <Text style={{ color: '#7f1d1d', fontSize: 12 }}>
                        Please select an operating depot in Step 1 above to view and decommission its assigned routes. The action cannot proceed without selecting a depot.
                      </Text>
                    </View>
                  )}
                  <View style={styles.delWarnBanner}>
                    <Text style={styles.delWarnText}>
                      <Text style={{ fontWeight: '800' }}>⚠️ {t('warning', 'Warning')}: </Text>
                      {t('route_del_warn', 'Decommissioning a route will withdraw it from active schedules and prevent further bus allocations on this route.')}
                    </Text>
                  </View>

                  <Text style={styles.modalFieldLabel}>
                    {t('search_filter_routes', 'Search & Filter Routes')}
                    {routesSelectedDepot !== 'all' ? ` for Depot ${routesSelectedDepot}` : ''}
                  </Text>
                  <View style={[styles.modalSearchRow, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder={t('placeholder_filter_routes', 'Filter by route code or location...')}
                      placeholderTextColor="#94a3b8"
                      value={delRouteSearchQuery}
                      onChangeText={setDelRouteSearchQuery}
                      autoCapitalize="characters"
                    />
                    {delRouteSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setDelRouteSearchQuery('')} style={styles.modalClearSearch}>
                        <Text style={styles.modalClearSearchText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Filtered Routes by Selected Depot & Search */}
                  {(() => {
                    const depotFiltered = allAvailableRoutes.filter((r) => {
                      if (routesSelectedDepot !== 'all' && String(r.depotId) !== String(routesSelectedDepot)) {
                        return false;
                      }
                      if (!delRouteSearchQuery.trim()) return true;
                      const q = delRouteSearchQuery.trim().toLowerCase();
                      return (
                        (r.code && r.code.toLowerCase().includes(q)) ||
                        (r.name && r.name.toLowerCase().includes(q)) ||
                        (r.origin && r.origin.toLowerCase().includes(q)) ||
                        (r.destination && r.destination.toLowerCase().includes(q))
                      );
                    });

                    return (
                      <View>
                        <Text style={styles.modalFieldLabel}>
                          {t('select_route_to_decommission', 'Select Route to Decommission')} <Text style={{ color: '#ef4444' }}>*</Text>
                          {selectedRoutesToDelete.length > 0 ? ` (${selectedRoutesToDelete.length} Selected)` : ''}
                        </Text>

                        {/* Multi-Select Action Bar */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                          <TouchableOpacity
                            style={{ backgroundColor: '#fee2e2', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                            onPress={() => setSelectedRoutesToDelete(depotFiltered.map((r) => r.code))}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c' }}>
                              ✓ Select All Filtered ({depotFiltered.length})
                            </Text>
                          </TouchableOpacity>
                          {selectedRoutesToDelete.length > 0 && (
                            <TouchableOpacity
                              style={{ backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                              onPress={() => { setSelectedRoutesToDelete([]); setDelRouteSelectedCode(''); }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
                                ✕ Clear Selection
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {depotFiltered.length === 0 ? (
                          <View style={{ backgroundColor: '#f8fafc', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                              No routes found for the selected depot and search query.
                            </Text>
                          </View>
                        ) : (
                          <ScrollView style={styles.busSelectorBox} nestedScrollEnabled>
                            {depotFiltered.map((r) => {
                              const isSelected = selectedRoutesToDelete.includes(r.code) || delRouteSelectedCode === r.code;
                              return (
                                <TouchableOpacity
                                  key={r.code}
                                  style={[styles.delBusOption, isSelected && styles.delBusOptionActive]}
                                  onPress={() => {
                                    if (selectedRoutesToDelete.includes(r.code)) {
                                      setSelectedRoutesToDelete((prev) => prev.filter((x) => x !== r.code));
                                    } else {
                                      setSelectedRoutesToDelete((prev) => [...prev, r.code]);
                                      setDelRouteSelectedCode(r.code);
                                    }
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: isSelected ? '#dc2626' : '#94a3b8', marginRight: 8 }}>
                                      {isSelected ? '☑' : '☐'}
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.delBusOptionText, isSelected && { color: '#dc2626', fontWeight: '800' }]}>
                                        🛣️ [{r.code}] {r.fullName || r.name}
                                      </Text>
                                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                        {r.origin && r.destination ? `${r.origin} ➔ ${r.destination}` : r.name} • {r.distance} km • {r.depotName || (r.depotId === '2' ? 'Depot 2' : 'Depot 1')}
                                      </Text>
                                    </View>
                                  </View>
                                  {isSelected && (
                                    <Text style={{ color: '#dc2626', fontWeight: '800', marginLeft: 8 }}>{t('selected_badge', '✓ Selected')}</Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    );
                  })()}

                  <Text style={styles.modalFieldLabel}>
                    {t('decommission_reason_label', 'Decommission Reason')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {[
                      { id: 'Route Realignment', labelKey: 'reason_route_realignment', fallback: 'Route Realignment' },
                      { id: 'Route Cancelled by BMTC', labelKey: 'reason_route_cancelled', fallback: 'Route Cancelled by BMTC' },
                      { id: 'Merged into Adjacent Depot', labelKey: 'reason_merged_depot', fallback: 'Merged into Adjacent Depot' },
                      { id: 'Other', labelKey: 'reason_other', fallback: 'Other' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.modalCatBtn, delRouteReason === item.id && styles.modalCatBtnActive]}
                        onPress={() => setDelRouteReason(item.id)}
                      >
                        <Text style={[styles.modalCatBtnText, delRouteReason === item.id && styles.modalCatBtnTextActive]}>
                          {t(item.labelKey, item.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {delRouteReason === 'Other' && (
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 12 }]}
                      placeholder={t('placeholder_custom_reason', 'Specify custom deletion reason...')}
                      placeholderTextColor="#94a3b8"
                      value={delRouteCustomReason}
                      onChangeText={setDelRouteCustomReason}
                    />
                  )}

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteRoutesModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>{t('btn_cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitDel} onPress={handleDeleteRouteFromDepot}>
                      <Text style={styles.btnSubmitDelText}>
                        {selectedRoutesToDelete.length > 1
                          ? `🛣️ Decommission ${selectedRoutesToDelete.length} Selected Routes`
                          : t('btn_decommission_route', '🗑️ Decommission Route')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 3: ROUTES AUDIT LOG */}
              {routesTab === 'directory' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.auditLogHeaderStack}>
                    <Text style={styles.auditLogTitle}>{t('routes_audit_log_title', '📋 Route Modification Audit Log')}</Text>
                    <Text style={styles.auditLogSub}>
                      {t('routes_audit_log_sub', 'Tracking newly registered and decommissioned bus routes.')}
                    </Text>
                  </View>

                  {/* Route logs */}
                  {(() => {
                    const routeLogs = depotAuditLogs.filter(a => a.action === 'ADDED' || a.action === 'DELETED');
                    if (routeLogs.length === 0) {
                      return (
                        <View style={{ backgroundColor: '#f8fafc', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' }}>
                          <Text style={{ fontSize: 24, marginBottom: 8 }}>🛣️</Text>
                          <Text style={{ fontSize: 13.5, color: '#475569', fontWeight: '700', textAlign: 'center' }}>
                            {t('no_route_audit_records', 'No route registrations or deletions recorded yet.')}
                          </Text>
                        </View>
                      );
                    }
                    return routeLogs.map((entry) => {
                      const isAdd = entry.action === 'ADDED';
                      return (
                        <View key={entry.id} style={styles.auditCard}>
                          <View style={styles.rowBetween}>
                            <View style={[styles.auditPill, { backgroundColor: isAdd ? '#eff6ff' : '#fff7ed' }]}>
                              <Text style={[styles.auditPillText, { color: isAdd ? '#1d4ed8' : '#c2410c', fontWeight: '800' }]}>
                                {isAdd ? '🛣️ ROUTE ADDED' : '🗑️ ROUTE DELETED'}
                              </Text>
                            </View>
                            <Text style={styles.auditTimestamp}>🕒 {entry.time || 'Recorded'}</Text>
                          </View>
                          <Text style={[styles.auditReason, { fontSize: 14, color: '#0f172a', fontWeight: '800', marginTop: 6 }]}>
                            [{entry.code}] {entry.fullName || entry.code}
                          </Text>
                          {(entry.origin || entry.destination) && (
                            <Text style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                              📍 {entry.origin} ➔ 🏁 {entry.destination} {entry.distance ? `• 📏 ${entry.distance} km` : ''}
                            </Text>
                          )}
                          {entry.reason ? (
                            <View style={{ backgroundColor: '#fff1f2', padding: 8, borderRadius: 6, marginTop: 6 }}>
                              <Text style={{ fontSize: 11.5, color: '#991b1b', fontWeight: '600' }}>
                                ⚠️ Reason: {entry.reason}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    });
                  })()}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 3D: ADD / DELETE BUS DRIVERS MODAL ── */}
      <Modal
        visible={addDeleteDriversModalOpen}
        transparent={!addDeleteDriversFullscreen}
        animationType="slide"
        onRequestClose={() => setAddDeleteDriversModalOpen(false)}
        presentationStyle={addDeleteDriversFullscreen ? 'fullScreen' : 'overFullScreen'}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={addDeleteDriversFullscreen ? styles.modalBackdropFullScreen : styles.modalBackdrop}>
          <View style={addDeleteDriversFullscreen ? styles.modalCardFullScreen : [styles.modalCard, { maxHeight: '90%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalEyebrow, { color: '#2563eb' }]}>{t('drivers_roster_title', 'DRIVER WORKFORCE ROSTER')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.modalTitle}>{t('add_delete_drivers', '👨‍✈️ Add / Delete Bus Drivers')}</Text>
                  <View style={[styles.depotCountHeaderBadge, { backgroundColor: '#dbeafe' }]}>
                    <Text style={[styles.depotCountHeaderBadgeText, { color: '#1d4ed8' }]}>
                      {driversList.length} {t('drivers_active', 'Drivers Active')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  {t('drivers_mgmt_desc', 'Manage driver rosters by depot, induct certified EV drivers, or withdraw drivers with reason tracking.')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setAddDeleteDriversFullscreen((prev) => !prev)}
                  style={styles.modalFullscreenToggleBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Toggle Fullscreen Mode"
                >
                  <Text style={styles.modalFullscreenToggleText}>
                    {addDeleteDriversFullscreen ? '🗗' : '⛶'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddDeleteDriversModalOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Depot Selector Filter */}
            <View style={styles.driversDepotFilterBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.driversDepotFilterLabel}>
                  🏢 {t('filter_drivers_by_depot', 'Filter Drivers by Operating Depot')}:
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e40af' }}>
                  {driversSelectedDepot === 'all'
                    ? `${driversList.length} drivers total`
                    : `${driversList.filter((dr) => String(dr.depot) === String(driversSelectedDepot)).length} drivers in this depot`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.driversDepotDropdownBtn}
                onPress={() => setDriversDepotPickerOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={[styles.driversDepotDropdownBtnText, (!driversSelectedDepot || driversSelectedDepot === 'all') && { color: '#dc2626', fontWeight: '800' }]}>
                  {driversSelectedDepot && driversSelectedDepot !== 'all'
                    ? `🏢 ${depotsList.find((d) => String(d.id) === String(driversSelectedDepot))?.name || `Depot ${driversSelectedDepot}`}`
                    : `⚠️ ${t('select_depot_required', 'Select Operating Depot (Required) *')}`}
                </Text>
                <Text style={{ fontSize: 13, color: driversSelectedDepot && driversSelectedDepot !== 'all' ? '#1d4ed8' : '#dc2626', fontWeight: '800' }}>
                  {driversDepotPickerOpen ? '▲ Close' : '▼ Select Depot'}
                </Text>
              </TouchableOpacity>

              {driversDepotPickerOpen && (
                <ScrollView style={styles.driversDepotDropdownList} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[styles.driversDepotDropdownItem, driversSelectedDepot === 'all' && styles.driversDepotDropdownItemActive]}
                    onPress={() => {
                      setDriversSelectedDepot('all');
                      setDriversDepotPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.driversDepotDropdownItemText, driversSelectedDepot === 'all' && styles.driversDepotDropdownItemTextActive]}>
                      🌐 All Operating Depots ({driversList.length} Drivers)
                    </Text>
                    {driversSelectedDepot === 'all' && <Text style={{ color: '#1d4ed8', fontWeight: '800' }}>✓</Text>}
                  </TouchableOpacity>
                  {depotsList.map((d) => {
                    const dId = String(d.id);
                    const isSelected = driversSelectedDepot === dId;
                    const drCount = driversList.filter((dr) => String(dr.depot) === dId).length;
                    return (
                      <TouchableOpacity
                        key={dId}
                        style={[styles.driversDepotDropdownItem, isSelected && styles.driversDepotDropdownItemActive]}
                        onPress={() => {
                          setDriversSelectedDepot(dId);
                          setNewDriverDepot(dId);
                          setDriversDepotPickerOpen(false);
                        }}
                      >
                        <Text style={[styles.driversDepotDropdownItemText, isSelected && styles.driversDepotDropdownItemTextActive]}>
                          🏢 {d.name} ({drCount} Drivers)
                        </Text>
                        {isSelected && <Text style={{ color: '#1d4ed8', fontWeight: '800' }}>✓ Selected</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* 3 Tabs */}
            <View style={styles.addDelTabs}>
              <TouchableOpacity
                style={[styles.addDelTab, driversTab === 'add' && styles.addDelTabActive]}
                onPress={() => setDriversTab('add')}
              >
                <Text style={[styles.addDelTabText, driversTab === 'add' && styles.addDelTabTextActive]}>
                  {t('tab_induct_driver', '➕ Induct Driver')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, driversTab === 'delete' && styles.addDelTabActive]}
                onPress={() => setDriversTab('delete')}
              >
                <Text style={[styles.addDelTabText, driversTab === 'delete' && styles.addDelTabTextActive]}>
                  {t('tab_withdraw_driver', '🗑️ Withdraw Driver')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, driversTab === 'directory' && styles.addDelTabActive]}
                onPress={() => setDriversTab('directory')}
              >
                <Text style={[styles.addDelTabText, driversTab === 'directory' && styles.addDelTabTextActive]}>
                  {t('tab_driver_roster', '📋 Driver Roster & Audit')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Scroll */}
            <ScrollView
              style={addDeleteDriversFullscreen ? { flex: 1 } : { maxHeight: 520 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* TAB 1: INDUCT DRIVER */}
              {driversTab === 'add' && (
                <View style={styles.tabContentBox}>
                  {(!driversSelectedDepot || driversSelectedDepot === 'all') && (
                    <View style={{ backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <Text style={{ color: '#b91c1c', fontSize: 12.5, fontWeight: '800' }}>
                        ⚠️ Operating Depot Required: Please select an operating depot from the dropdown above before inducting a driver. The action cannot proceed without selecting a depot.
                      </Text>
                    </View>
                  )}
                  <View style={styles.depotInfoBanner}>
                    <Text style={styles.depotInfoText}>
                      <Text style={{ fontWeight: '800' }}>👨‍✈️ {t('induct_driver_banner', 'Induct Electric Bus Driver')}: </Text>
                      {t('induct_driver_desc', 'Enter driver full name, BMTC employee ID, depot assignment, shift schedule, and EV certification level.')}
                    </Text>
                  </View>

                  {/* Driver Name */}
                  <Text style={styles.modalFieldLabel}>
                    {t('driver_name_label', 'Driver Full Name')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_driver_name', 'e.g. Ramesh Kumar')}
                    placeholderTextColor="#94a3b8"
                    value={newDriverName}
                    onChangeText={setNewDriverName}
                  />

                  {/* Employee ID */}
                  <Text style={styles.modalFieldLabel}>
                    {t('driver_emp_id_label', 'BMTC Employee ID / Badge No.')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('placeholder_driver_id', 'e.g. BMTC-4109 or DRV-109')}
                    placeholderTextColor="#94a3b8"
                    value={newDriverId}
                    onChangeText={setNewDriverId}
                    autoCapitalize="characters"
                  />

                  {/* Operating Depot */}
                  <Text style={styles.modalFieldLabel}>
                    {t('operating_depot_label', 'Operating Depot Assignment')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {depotsList.map((d) => {
                      const isSelected = String(newDriverDepot) === String(d.id);
                      return (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.modalCatBtn, isSelected && styles.modalCatBtnActive]}
                          onPress={() => setNewDriverDepot(String(d.id))}
                        >
                          <Text style={[styles.modalCatBtnText, isSelected && styles.modalCatBtnTextActive]}>
                            🏢 {d.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Shift Selection */}
                  <Text style={styles.modalFieldLabel}>{t('shift_assignment_label', 'Shift Assignment')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {[
                      { id: 'General Shift', labelKey: 'shift_general', fallback: 'General Shift' },
                      { id: 'Morning Shift', labelKey: 'shift_morning', fallback: 'Morning Shift' },
                      { id: 'Night Halt', labelKey: 'shift_night', fallback: 'Night Halt' },
                    ].map((sh) => (
                      <TouchableOpacity
                        key={sh.id}
                        style={[styles.modalShiftBtn, newDriverShift === sh.id && styles.modalShiftBtnActive]}
                        onPress={() => setNewDriverShift(sh.id)}
                      >
                        <Text style={[styles.modalShiftBtnText, newDriverShift === sh.id && styles.modalShiftBtnTextActive]}>
                          {t(sh.labelKey, sh.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* EV Driver Category */}
                  <Text style={styles.modalFieldLabel}>{t('ev_driver_category_label', 'EV Certification Category')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {[
                      { cat: 'A', label: 'Grade A (Master EV)' },
                      { cat: 'B', label: 'Grade B (Certified)' },
                      { cat: 'C', label: 'Grade C (Trainee)' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.cat}
                        style={[styles.modalCatBtn, newDriverCategory === item.cat && styles.modalCatBtnActive]}
                        onPress={() => setNewDriverCategory(item.cat)}
                      >
                        <Text style={[styles.modalCatBtnText, newDriverCategory === item.cat && styles.modalCatBtnTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Contact Phone */}
                  <Text style={styles.modalFieldLabel}>{t('contact_phone_label', 'Contact Phone Number')}</Text>
                  <TextInput
                    style={[styles.modalInput, { marginBottom: 16 }]}
                    placeholder={t('placeholder_phone', '+91 98450 XXXXX')}
                    placeholderTextColor="#94a3b8"
                    value={newDriverPhone}
                    onChangeText={setNewDriverPhone}
                    keyboardType="phone-pad"
                  />

                  {/* Action Buttons */}
                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteDriversModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>{t('btn_cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitAddDepot} onPress={handleAddDriver}>
                      <Text style={styles.btnSubmitAddDepotText}>{t('btn_induct_driver', '➕ Induct Driver into Depot')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 2: WITHDRAW / DECOMMISSION DRIVER */}
              {driversTab === 'delete' && (
                <View style={styles.tabContentBox}>
                  {(!driversSelectedDepot || driversSelectedDepot === 'all') && (
                    <View style={{ backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                      <Text style={{ color: '#b91c1c', fontSize: 13, fontWeight: '800', marginBottom: 4 }}>
                        ⚠️ Operating Depot Selection Required
                      </Text>
                      <Text style={{ color: '#7f1d1d', fontSize: 12 }}>
                        Please select an operating depot from the dropdown above to view and withdraw drivers for that specific depot. The action cannot proceed without selecting a depot.
                      </Text>
                    </View>
                  )}
                  <View style={styles.delWarnBanner}>
                    <Text style={styles.delWarnText}>
                      <Text style={{ fontWeight: '800' }}>⚠️ {t('warning', 'Warning')}: </Text>
                      {t('driver_del_warn', 'Withdrawing a driver removes them from active duty scheduling and unassigns them from current routes.')}
                    </Text>
                  </View>

                  <Text style={styles.modalFieldLabel}>{t('search_filter_drivers', 'Search & Filter Drivers')}</Text>
                  <View style={[styles.modalSearchRow, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder={t('placeholder_filter_drivers', 'Filter by name or employee ID...')}
                      placeholderTextColor="#94a3b8"
                      value={delDriverSearchQuery}
                      onChangeText={setDelDriverSearchQuery}
                    />
                    {delDriverSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setDelDriverSearchQuery('')} style={styles.modalClearSearch}>
                        <Text style={styles.modalClearSearchText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Filtered Drivers */}
                  {(() => {
                    const filtered = driversList.filter((dr) => {
                      if (driversSelectedDepot !== 'all' && String(dr.depot) !== String(driversSelectedDepot)) {
                        return false;
                      }
                      if (!delDriverSearchQuery.trim()) return true;
                      const q = delDriverSearchQuery.trim().toLowerCase();
                      return (
                        (dr.name && dr.name.toLowerCase().includes(q)) ||
                        (dr.id && dr.id.toLowerCase().includes(q)) ||
                        (dr.phone && dr.phone.toLowerCase().includes(q))
                      );
                    });

                    return (
                      <View>
                        <Text style={styles.modalFieldLabel}>
                          {t('select_drivers_to_withdraw', 'Select Driver(s) to Withdraw')} <Text style={{ color: '#ef4444' }}>*</Text>
                          {selectedDriversToDelete.length > 0 ? ` (${selectedDriversToDelete.length} Selected)` : ''}
                        </Text>

                        {/* Multi-Select Action Bar */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                          <TouchableOpacity
                            style={{ backgroundColor: '#fee2e2', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                            onPress={() => setSelectedDriversToDelete(filtered.map((dr) => dr.id))}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c' }}>
                              ✓ Select All Filtered ({filtered.length})
                            </Text>
                          </TouchableOpacity>
                          {selectedDriversToDelete.length > 0 && (
                            <TouchableOpacity
                              style={{ backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 }}
                              onPress={() => setSelectedDriversToDelete([])}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
                                ✕ Clear Selection
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {filtered.length === 0 ? (
                          <View style={{ backgroundColor: '#f8fafc', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                              No active drivers found for the selected depot.
                            </Text>
                          </View>
                        ) : (
                          <ScrollView style={styles.busSelectorBox} nestedScrollEnabled>
                            {filtered.map((dr) => {
                              const isSelected = selectedDriversToDelete.includes(dr.id);
                              return (
                                <TouchableOpacity
                                  key={dr.id}
                                  style={[styles.delBusOption, isSelected && styles.delBusOptionActive]}
                                  onPress={() => {
                                    if (selectedDriversToDelete.includes(dr.id)) {
                                      setSelectedDriversToDelete((prev) => prev.filter((x) => x !== dr.id));
                                    } else {
                                      setSelectedDriversToDelete((prev) => [...prev, dr.id]);
                                    }
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: isSelected ? '#dc2626' : '#94a3b8', marginRight: 8 }}>
                                      {isSelected ? '☑' : '☐'}
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.delBusOptionText, isSelected && { color: '#dc2626', fontWeight: '800' }]}>
                                        👨‍✈️ {dr.name} ({dr.id})
                                      </Text>
                                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                        Depot {dr.depot} • {dr.shift} • Cat {dr.category || 'B'} • {dr.phone || 'N/A'}
                                      </Text>
                                    </View>
                                  </View>
                                  {isSelected && (
                                    <Text style={{ color: '#dc2626', fontWeight: '800', marginLeft: 8 }}>{t('selected_badge', '✓ Selected')}</Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    );
                  })()}

                  <Text style={styles.modalFieldLabel}>
                    {t('withdrawal_reason_label', 'Withdrawal / Decommission Reason')} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {[
                      { id: 'Transferred to another depot', labelKey: 'reason_drv_transfer', fallback: 'Transferred to another depot' },
                      { id: 'Retirement / Superannuation', labelKey: 'reason_drv_retire', fallback: 'Retirement / Superannuation' },
                      { id: 'Voluntary Resignation', labelKey: 'reason_drv_resign', fallback: 'Voluntary Resignation' },
                      { id: 'Medical / Extended Leave', labelKey: 'reason_drv_medical', fallback: 'Medical Leave' },
                      { id: 'Other', labelKey: 'reason_other', fallback: 'Other' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.modalCatBtn, delDriverReason === item.id && styles.modalCatBtnActive]}
                        onPress={() => setDelDriverReason(item.id)}
                      >
                        <Text style={[styles.modalCatBtnText, delDriverReason === item.id && styles.modalCatBtnTextActive]}>
                          {t(item.labelKey, item.fallback)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {delDriverReason === 'Other' && (
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 12 }]}
                      placeholder={t('placeholder_custom_reason', 'Specify custom deletion reason...')}
                      placeholderTextColor="#94a3b8"
                      value={delDriverCustomReason}
                      onChangeText={setDelDriverCustomReason}
                    />
                  )}

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteDriversModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>{t('btn_cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitDel} onPress={handleDeleteDrivers}>
                      <Text style={styles.btnSubmitDelText}>
                        {selectedDriversToDelete.length > 1
                          ? `👨‍✈️ Withdraw ${selectedDriversToDelete.length} Selected Drivers`
                          : t('btn_withdraw_driver', '🗑️ Withdraw Driver')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 3: DRIVER ROSTER & AUDIT LOG */}
              {driversTab === 'directory' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.auditLogHeaderStack}>
                    <Text style={styles.auditLogTitle}>{t('driver_roster_dir_title', '📋 Driver Roster & Decommission History')}</Text>
                    <Text style={styles.auditLogSub}>
                      {t('driver_roster_dir_sub', 'Active driver assignments and historical withdrawal audit logs.')}
                    </Text>
                    <View style={styles.sectionActionsRow}>
                      <TouchableOpacity
                        style={styles.btnHeaderDownload}
                        onPress={async () => {
                          if (!driversList || driversList.length === 0) {
                            Alert.alert('No Records', 'No active drivers to export.');
                            return;
                          }
                          const headers = ['Employee ID', 'Name', 'Depot', 'Shift', 'Category', 'Phone', 'Status'];
                          const rows = driversList.map((dr) => [
                            dr.id || '',
                            dr.name || '',
                            dr.depot || '',
                            dr.shift || '',
                            dr.category || '',
                            dr.phone || '',
                            dr.status || 'Active',
                          ]);
                          const dateStr = new Date().toISOString().slice(0, 10);
                          await exportCsvFile(`bmtc_drivers_roster_${dateStr}.csv`, [headers, ...rows]);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.btnHeaderDownloadText}>{t('btn_download_csv', '📥 Download CSV')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Active Driver Cards */}
                  <Text style={[styles.modalFieldLabel, { marginTop: 12, marginBottom: 8 }]}>
                    Active Drivers ({driversSelectedDepot === 'all' ? driversList.length : driversList.filter((dr) => String(dr.depot) === String(driversSelectedDepot)).length})
                  </Text>
                  {driversList
                    .filter((dr) => driversSelectedDepot === 'all' || String(dr.depot) === String(driversSelectedDepot))
                    .map((dr) => (
                      <View key={dr.id} style={styles.driverCard}>
                        <View style={styles.driverCardHeader}>
                          <Text style={styles.driverCardName}>👨‍✈️ {dr.name}</Text>
                          <View style={[styles.auditPill, { backgroundColor: '#f0fdf4' }]}>
                            <Text style={[styles.auditPillText, { color: '#166534', fontWeight: '800' }]}>Active</Text>
                          </View>
                        </View>
                        <View style={styles.driverCardBody}>
                          <View style={styles.driverCardPill}>
                            <Text style={styles.driverCardPillText}>ID: {dr.id}</Text>
                          </View>
                          <View style={styles.driverCardPill}>
                            <Text style={styles.driverCardPillText}>Depot: {dr.depot}</Text>
                          </View>
                          <View style={styles.driverCardPill}>
                            <Text style={styles.driverCardPillText}>{dr.shift}</Text>
                          </View>
                          <View style={styles.driverCardPill}>
                            <Text style={styles.driverCardPillText}>Cat {dr.category || 'B'}</Text>
                          </View>
                          {dr.phone ? (
                            <View style={styles.driverCardPill}>
                              <Text style={styles.driverCardPillText}>📞 {dr.phone}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ))}

                  {/* Audit Logs section */}
                  {driverAuditLogs.length > 0 && (
                    <View style={{ marginTop: 18 }}>
                      <Text style={[styles.modalFieldLabel, { marginBottom: 8 }]}>
                        Historical Driver Audit Logs ({driverAuditLogs.length})
                      </Text>
                      {driverAuditLogs.map((log) => (
                        <View key={log.id} style={styles.auditCard}>
                          <View style={styles.rowBetween}>
                            <View style={[styles.auditPill, { backgroundColor: log.action === 'ADDED' ? '#eff6ff' : '#fef2f2' }]}>
                              <Text style={[styles.auditPillText, { color: log.action === 'ADDED' ? '#1d4ed8' : '#991b1b', fontWeight: '800' }]}>
                                {log.action === 'ADDED' ? '➕ DRIVER INDUCTED' : '🗑️ DRIVER WITHDRAWN'}
                              </Text>
                            </View>
                            <Text style={styles.auditTimestamp}>🕒 {log.time || 'Recorded'}</Text>
                          </View>
                          <Text style={[styles.auditReason, { fontSize: 13.5, color: '#0f172a', fontWeight: '800', marginTop: 4 }]}>
                            👨‍✈️ {log.name} ({log.id}) • Depot {log.depot}
                          </Text>
                          {log.reason ? (
                            <View style={{ backgroundColor: '#fff1f2', padding: 8, borderRadius: 6, marginTop: 4 }}>
                              <Text style={{ fontSize: 11.5, color: '#991b1b', fontWeight: '600' }}>
                                ⚠️ Reason: {log.reason}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

{/* ── MODAL: SCHEDULE OVERVIEW - SELECT DEPOT PICKER ── */}
      <Modal
        visible={scheduleDepotPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleDepotPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: '#4f46e5' }]}>FLEET DEPOT SELECTOR</Text>
                <Text style={styles.modalTitle}>🏢 Select Operating Depot</Text>
                <Text style={styles.modalSubtitle}>
                  Select a depot to filter routes and schedule overview
                </Text>
              </View>
              <TouchableOpacity onPress={() => setScheduleDepotPickerOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {/* Option: All Operating Depots */}
              <TouchableOpacity
                style={[
                  styles.schedulePickerItem,
                  scheduleSelectedDepot === 'all' && styles.schedulePickerItemActive,
                ]}
                onPress={() => handleSelectScheduleDepot('all')}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.schedulePickerTitle, scheduleSelectedDepot === 'all' && { color: '#2563eb' }]}>
                    🌐 All Operating Depots
                  </Text>
                  <Text style={styles.schedulePickerSub}>
                    {depotsList.length} Operating Facilities • {allAvailableRoutes.length} Total Routes
                  </Text>
                </View>
                {scheduleSelectedDepot === 'all' && (
                  <Text style={styles.schedulePickerCheck}>✓</Text>
                )}
              </TouchableOpacity>

              {/* Each Depot Option */}
              {filteredDepotsForDropdown.map((d) => {
                const isSelected = String(d.id) === String(scheduleSelectedDepot);
                const dRoutesCount = allAvailableRoutes.filter((r) => String(r.depotId) === String(d.id)).length;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.schedulePickerItem, isSelected && styles.schedulePickerItemActive]}
                    onPress={() => handleSelectScheduleDepot(d.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.schedulePickerTitle, isSelected && { color: '#2563eb' }]}>
                        🏢 {d.name}
                      </Text>
                      <Text style={styles.schedulePickerSub}>
                        📍 {d.location || d.name} • {dRoutesCount} Routes Assigned
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.schedulePickerCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: SCHEDULE OVERVIEW - SELECT ROUTE PICKER ── */}
      <Modal
        visible={scheduleRoutePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleRoutePickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '82%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: '#0284c7' }]}>ROUTE DISPATCH SELECTOR</Text>
                <Text style={styles.modalTitle}>🛣️ Select Bus Route</Text>
                <Text style={styles.modalSubtitle}>
                  {scheduleSelectedDepot === 'all'
                    ? `Showing all routes (${filteredRoutesForDropdown.length} available)`
                    : `Filtered for Depot ${scheduleSelectedDepot} (${filteredRoutesForDropdown.length} available)`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setScheduleRoutePickerOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {filteredRoutesForDropdown.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                    No routes match the current filter or search criteria for Depot {scheduleSelectedDepot}.
                  </Text>
                </View>
              ) : (
                filteredRoutesForDropdown.map((r) => {
                  const isSelected = r.id === selectedRoute?.id || (r.code === selectedRoute?.code && String(r.depotId) === String(selectedRoute?.depotId));
                  return (
                    <TouchableOpacity
                      key={r.id || `${r.depotId}_${r.code}`}
                      style={[styles.schedulePickerItem, isSelected && styles.schedulePickerItemActive]}
                      onPress={() => handleSelectScheduleRoute(r)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.schedulePickerTitle, isSelected && { color: '#0284c7' }]}>
                          🚌 [{r.code}] {r.fullName || r.name}
                        </Text>
                        <Text style={styles.schedulePickerSub}>
                          📍 {r.origin && r.destination ? `${r.origin} ➔ ${r.destination} • ` : ''}{r.distance} km • {r.depotName || ('Depot ' + r.depotId)} • Cat {r.requiredCat || 'B'} ({r.category || 'Standard'})
                        </Text>
                      </View>
                      {isSelected && <Text style={styles.schedulePickerCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: SCHEDULE OVERVIEW - SELECT DEPARTURE TIME PICKER ── */}
      <Modal
        visible={scheduleTimePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setScheduleTimePickerOpen(false);
          setShowAddDepartureTimeInput(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '82%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: '#0284c7' }]}>TIMETABLE DEPARTURE SELECTOR</Text>
                <Text style={styles.modalTitle}>🕒 Scheduled Departure Time</Text>
                <Text style={styles.modalSubtitle}>
                  Route {selectedRoute?.code || '—'} ({selectedRoute?.origin || ''} ➔ {selectedRoute?.destination || ''}) • {selectedRoute?.depotName || ('Depot ' + (selectedRoute?.depotId || '1'))}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setScheduleTimePickerOpen(false);
                  setShowAddDepartureTimeInput(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Add New Departure Time Input */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                  {showAddDepartureTimeInput ? '➕ Add New Departure Time to Route Dataset:' : 'Available Dataset Departure Times:'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddDepartureTimeInput(!showAddDepartureTimeInput)}
                  style={{ paddingVertical: 2, paddingHorizontal: 6 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>
                    {showAddDepartureTimeInput ? 'Hide' : '+ Add Time'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showAddDepartureTimeInput && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4, marginBottom: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      backgroundColor: '#ffffff',
                      color: '#0f172a'
                    }}
                    placeholder="e.g. 11:45 AM or 04:30 PM"
                    placeholderTextColor="#94a3b8"
                    value={newDepartureTimeInput}
                    onChangeText={setNewDepartureTimeInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#0284c7',
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onPress={() => {
                      const clean = newDepartureTimeInput.trim();
                      if (!clean) {
                        Alert.alert('Empty Input', 'Please enter a departure time (e.g. 11:45 AM).');
                        return;
                      }
                      if (!selectedRoute?.code) {
                        Alert.alert('No Route Selected', 'Please select a route first.');
                        return;
                      }
                      addDepartureTimeToRoute(selectedRoute.code, selectedRoute.depotId, clean);
                      if (api && typeof api.updateRoutesDataset === 'function') {
                        api.updateRoutesDataset({
                          action: 'add_departure_time',
                          routeCode: selectedRoute.code,
                          depotId: selectedRoute.depotId,
                          departureTime: clean
                        }).catch(() => {});
                      }
                      setScheduledTime(clean);
                      setNewDepartureTimeInput('');
                      setShowAddDepartureTimeInput(false);
                      setDatasetVersionTick(v => v + 1);
                      Alert.alert(
                        'Departure Time Added',
                        `Departure time ${clean} has been successfully saved to Route ${selectedRoute.code} in the Master Dataset.`
                      );
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {(!selectedRoute?.timetables || selectedRoute.timetables.length === 0) ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                    No departure timetables configured for this route. Tap "+ Add Time" above to add one.
                  </Text>
                </View>
              ) : (
                selectedRoute.timetables.map((t) => {
                  const isSelected = String(t).trim().toUpperCase() === String(scheduledTime).trim().toUpperCase();
                  const timeInfo = getTimeCategory(t);
                  const isPeak = timeInfo && timeInfo.isPeak;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.schedulePickerItem, isSelected && styles.schedulePickerItemActive]}
                      onPress={() => {
                        setScheduledTime(t);
                        setScheduleTimePickerOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={[styles.schedulePickerTitle, isSelected && { color: '#0284c7' }]}>
                            🕒 {t}
                          </Text>
                          <Text style={styles.schedulePickerSub}>
                            {timeInfo?.timeSlot || 'Scheduled Timetable'} • Route {selectedRoute.code}
                          </Text>
                        </View>
                        <View style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: isPeak ? '#fef2f2' : '#f0fdf4',
                          borderWidth: 1,
                          borderColor: isPeak ? '#fca5a5' : '#86efac'
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isPeak ? '#dc2626' : '#16a34a' }}>
                            {isPeak ? 'PEAK' : 'OFF-PEAK'}
                          </Text>
                        </View>
                      </View>
                      {isSelected && <Text style={[styles.schedulePickerCheck, { marginLeft: 8 }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: ROUTE ALLOCATED BUSES DIRECTORY MODAL (Exact Match with admin.html lines 2800-2845) ── */}
      <Modal
        visible={routeAllocatedModalOpen}
        transparent={!routeAllocatedFullscreen}
        animationType="slide"
        onRequestClose={() => setRouteAllocatedModalOpen(false)}
        presentationStyle={routeAllocatedFullscreen ? 'fullScreen' : 'overFullScreen'}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={routeAllocatedFullscreen ? styles.modalBackdropFullScreen : styles.modalBackdrop}>
          <View style={routeAllocatedFullscreen ? styles.modalCardFullScreen : [styles.modalCard, { maxHeight: '88%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalEyebrow, { color: '#0284c7' }]}>ROUTE FLEET ALLOCATION DIRECTORY</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  <Text style={styles.modalTitle}>🚌 Route Allocated Buses</Text>
                  <View style={styles.modalRouteBadge}>
                    <Text style={styles.modalRouteBadgeText}>Route {routeAllocatedModalRoute}</Text>
                  </View>
                  <View style={styles.modalCountBadge}>
                    <Text style={styles.modalCountBadgeText}>
                      {routeAllocatedDuties.length} {routeAllocatedDuties.length === 1 ? 'Bus' : 'Buses'} Allocated
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  All vehicles currently allocated to Route {routeAllocatedModalRoute} across all shifts and departure times (independent of departure time).
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setRouteAllocatedFullscreen((prev) => !prev)}
                  style={styles.modalFullscreenToggleBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Toggle Fullscreen Mode"
                >
                  <Text style={styles.modalFullscreenToggleText}>
                    {routeAllocatedFullscreen ? '🗗' : '⛶'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRouteAllocatedModalOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Route Switcher & Search Bar */}
            <View style={styles.modalControlsBar}>
              <Text style={styles.modalControlLabel}>Select Route:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {allAvailableRoutes.map((r) => {
                  const isSel = r.code === routeAllocatedModalRoute;
                  const count = (allocatedDuties || []).filter((d) => {
                    const rCode = String(d.routeCode || d.busNumber || d.routeId || '').toUpperCase().replace(/^ROUTE\s*/i, '');
                    return rCode === r.code.toUpperCase();
                  }).length;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.modalRoutePill, isSel && styles.modalRoutePillActive]}
                      onPress={() => {
                        setRouteAllocatedModalRoute(r.code);
                        setRouteAllocatedSearch('');
                      }}
                    >
                      <Text style={[styles.modalRoutePillText, isSel && styles.modalRoutePillTextActive]}>
                        {r.code} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Search Filter */}
              <View style={styles.modalSearchRow}>
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Filter by BM, Reg, Shift, Driver..."
                  placeholderTextColor="#94a3b8"
                  value={routeAllocatedSearch}
                  onChangeText={setRouteAllocatedSearch}
                />
                {routeAllocatedSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setRouteAllocatedSearch('')} style={styles.modalClearSearch}>
                    <Text style={styles.modalClearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* List of Allocated Buses on this Route */}
            <ScrollView
              style={routeAllocatedFullscreen ? { flex: 1 } : { maxHeight: 450 }}
              contentContainerStyle={styles.modalScrollBody}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {filteredRouteAllocatedDuties.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <Text style={styles.modalEmptyIcon}>🚌</Text>
                  <Text style={styles.modalEmptyTitle}>No Buses Allocated to Route {routeAllocatedModalRoute}</Text>
                  <Text style={styles.modalEmptySub}>
                    {routeAllocatedSearch.trim()
                      ? 'No allocated vehicles match your search filter.'
                      : 'No vehicles have been scheduled for this route yet. Allocate buses from the Scheduling console.'}
                  </Text>
                </View>
              ) : (
                filteredRouteAllocatedDuties.map((duty, idx) => (
                  <View key={duty.id || `${duty.bm}_${idx}`} style={styles.routeAllocatedCard}>
                    <View style={styles.rowBetween}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.routeAllocBm}>🚌 {duty.bm || duty.bmNumber}</Text>
                        <Text style={styles.routeAllocReg}>({duty.regNo || duty.reg || '—'})</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.depotPillBadge, String(duty.depot || '1') === '2' ? styles.depotPillBadge2 : styles.depotPillBadge1]}>
                          <Text style={[styles.depotPillText, String(duty.depot || '1') === '2' ? styles.depotPillText2 : styles.depotPillText1]}>
                            Depot {duty.depot || '1'}
                          </Text>
                        </View>
                        <View style={[styles.catBadge, (duty.busCategory || 'A') === 'A' ? styles.catBadgeA : styles.catBadgeB]}>
                          <Text style={styles.catBadgeText}>Cat {duty.busCategory || 'A'}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.routeAllocGrid}>
                      <View style={styles.routeAllocCell}>
                        <Text style={styles.routeAllocLbl}>Shift</Text>
                        <Text style={styles.routeAllocVal}>{duty.shift || 'General Shift'}</Text>
                      </View>
                      <View style={styles.routeAllocCell}>
                        <Text style={styles.routeAllocLbl}>Scheduled Departure</Text>
                        <Text style={[styles.routeAllocVal, { color: '#0369a1' }]}>🕒 {duty.departureTime || '—'}</Text>
                      </View>
                      <View style={styles.routeAllocCell}>
                        <Text style={styles.routeAllocLbl}>Battery SoC</Text>
                        <Text style={[styles.routeAllocVal, { color: '#16a34a' }]}>⚡ {duty.soc || 85}%</Text>
                      </View>
                      <View style={styles.routeAllocCell}>
                        <Text style={styles.routeAllocLbl}>Estimated Required SoC</Text>
                        <Text style={[styles.routeAllocVal, { color: '#b45309', fontWeight: '800' }]}>
                          🎯 ~{(() => {
                            const rCode = String(duty.routeCode || duty.busNumber || routeAllocatedModalRoute || '').toUpperCase().replace(/^ROUTE\s*/i, '');
                            const rData = ALL_ROUTES_DATA.find((r) => r.code === rCode || r.id === rCode);
                            return getRequiredOperatingSoc(duty, rData);
                          })()}% SoC
                        </Text>
                      </View>
                      <View style={[styles.routeAllocCell, { width: '100%', marginTop: 4 }]}>
                        <Text style={styles.routeAllocLbl}>Assigned Driver</Text>
                        <Text style={styles.routeAllocVal}>👤 {duty.driver || 'Driver Assigned'}</Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <BatteryBar soc={duty.soc || 85} showText={false} />
                    </View>

                    <View style={styles.routeAllocFooter}>
                      <View style={styles.dutyPillActive}>
                        <Text style={styles.dutyPillActiveText}>🟣 Allocated on Route (Active Duty)</Text>
                      </View>
                      <Text style={styles.routeAllocDutyMode}>Single Charge Compliant</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterHint}>
                💡 Independent of departure time — displays all buses allocated for this specific route.
              </Text>
              <TouchableOpacity
                style={styles.modalBtnCloseBottom}
                onPress={() => setRouteAllocatedModalOpen(false)}
              >
                <Text style={styles.modalBtnCloseBottomText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 5: BUS DUTY TASKS & INFORMATION MODAL (Exact match to website i symbol tasks modal) ── */}
      <Modal
        visible={bmDetailsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBmDetailsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.modalTitle}>🚌 Bus Details: {selectedBmDuty?.bm}</Text>
                  <View style={[styles.depotPillBadge, selectedBmDuty?.depotNum === '2' ? styles.depotPillBadge2 : styles.depotPillBadge1]}>
                    <Text style={[styles.depotPillText, selectedBmDuty?.depotNum === '2' ? styles.depotPillText2 : styles.depotPillText1]}>
                      Depot {selectedBmDuty?.depotNum}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSub}>
                  {selectedBmDuty?.regNo} • {selectedBmDuty?.model}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBmDetailsModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Route & Duty Banner */}
              <View style={styles.dutyModalBanner}>
                <View style={styles.rowBetween}>
                  <Text style={styles.dutyModalRouteCode}>Route {selectedBmDuty?.routeCode}</Text>
                  <Text style={styles.dutyModalScheduleId}>Schedule: {selectedBmDuty?.scheduleId}</Text>
                </View>
                <Text style={styles.dutyModalRouteName}>{selectedBmDuty?.routeName}</Text>
                <View style={styles.dutyModalBadgesRow}>
                  <View style={styles.dutyBadge}>
                    <Text style={styles.dutyBadgeText}>⚡ ALLOCATED DUTY</Text>
                  </View>
                  <View style={styles.shiftBadge}>
                    <Text style={styles.shiftBadgeText}>Shift: {selectedBmDuty?.shift}</Text>
                  </View>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>🕒 {selectedBmDuty?.scheduledTime}</Text>
                  </View>
                </View>
              </View>

              {/* Feasibility Alert */}
              <View style={styles.dutyFeasibilityAlert}>
                <Text style={styles.dutyFeasibilityAlertTitle}>✅ Duty Sequence Allocated & Ready for Dispatch</Text>
                <Text style={styles.dutyFeasibilityAlertText}>
                  Bus Number <Text style={{ fontWeight: '800' }}>{selectedBmDuty?.bm}</Text> holds <Text style={{ fontWeight: '800' }}>{selectedBmDuty?.soc}% SoC (~{selectedBmDuty?.fullDutyKm} km Single Charge Range)</Text> for sequential passenger duty trips & layover breaks assigned to Route {selectedBmDuty?.routeCode} starting from depot to final pull-in.
                </Text>
              </View>

              {/* Telemetry Metrics Grid */}
              <Text style={styles.dutySectionHeading}>Operational & Battery Telemetry</Text>
              <View style={styles.dutyMetricsGrid}>
                <View style={styles.dutyMetricCard}>
                  <Text style={styles.dutyMetricLabel}>Live Battery SOC</Text>
                  <Text style={[styles.dutyMetricVal, { color: '#059669' }]}>{selectedBmDuty?.soc}%</Text>
                  <View style={{ marginTop: 6, width: '100%' }}>
                    <BatteryBar soc={selectedBmDuty?.soc || 80} showText={false} />
                  </View>
                </View>
                <View style={styles.dutyMetricCard}>
                  <Text style={styles.dutyMetricLabel}>Usable Single Charge Range</Text>
                  <Text style={[styles.dutyMetricVal, { color: '#0284c7' }]}>~{selectedBmDuty?.fullDutyKm} km</Text>
                  <Text style={styles.dutyMetricSub}>Single Charge (No mid-route plug)</Text>
                </View>
                <View style={styles.dutyMetricCard}>
                  <Text style={styles.dutyMetricLabel}>Route Distance</Text>
                  <Text style={styles.dutyMetricVal}>{selectedBmDuty?.routeDist} km</Text>
                  <Text style={styles.dutyMetricSub}>Fixed GTFS Route</Text>
                </View>
                <View style={styles.dutyMetricCard}>
                  <Text style={styles.dutyMetricLabel}>Energy Reserve Margin</Text>
                  <Text style={[styles.dutyMetricVal, { color: '#16a34a' }]}>+{selectedBmDuty?.surplus}% SoC</Text>
                  <Text style={styles.dutyMetricSub}>Threshold: {selectedBmDuty?.reqSoc}% min required</Text>
                </View>
                <View style={styles.dutyMetricCard}>
                  <Text style={styles.dutyMetricLabel}>Assigned Driver</Text>
                  <Text style={styles.dutyMetricVal}>{selectedBmDuty?.driver}</Text>
                  <Text style={styles.dutyMetricSub}>ID: {selectedBmDuty?.driverId} • Verified Ready</Text>
                </View>
                <View style={styles.dutyMetricCard}>
                  <Text style={styles.dutyMetricLabel}>Dispatch Mode</Text>
                  <Text style={[styles.dutyMetricVal, { color: '#0f766e', fontSize: 13 }]}>Single Charge Operation</Text>
                  <Text style={styles.dutyMetricSub}>Optimal Energy Efficiency</Text>
                </View>
              </View>

              {/* Why this Bus was Selected */}
              <Text style={styles.dutySectionHeading}>Why this Bus was Selected (Rule Engine)</Text>
              <View style={styles.whySelectedCard}>
                <View style={styles.whyItem}>
                  <Text style={styles.whyBullet}>•</Text>
                  <Text style={styles.whyText}><Text style={styles.whyStrong}>Vehicle & Route: </Text>{selectedBmDuty?.reasons?.vehicleRoute}</Text>
                </View>
                <View style={styles.whyItem}>
                  <Text style={styles.whyBullet}>•</Text>
                  <Text style={styles.whyText}><Text style={styles.whyStrong}>Energy & Battery Feasibility: </Text>{selectedBmDuty?.reasons?.energy}</Text>
                </View>
                <View style={styles.whyItem}>
                  <Text style={styles.whyBullet}>•</Text>
                  <Text style={styles.whyText}><Text style={styles.whyStrong}>Category & Dispatch Rule: </Text>{selectedBmDuty?.reasons?.category}</Text>
                </View>
                <View style={styles.whyItem}>
                  <Text style={styles.whyBullet}>•</Text>
                  <Text style={styles.whyText}><Text style={styles.whyStrong}>Dispatch Selection: </Text>{selectedBmDuty?.reasons?.dispatch}</Text>
                </View>
              </View>

              {/* Sequential Assigned Duty Trips Table */}
              <Text style={styles.dutySectionHeading}>Assigned Sequential Trips & Timetable</Text>
              <View style={styles.dutyTasksList}>
                {selectedBmDuty?.tasks?.map((task) => (
                  <View key={task.taskNumber} style={styles.taskItemCard}>
                    <View style={styles.taskItemTop}>
                      <View style={[styles.taskTypeBadge, { backgroundColor: task.badgeBg }]}>
                        <Text style={[styles.taskTypeBadgeText, { color: task.badgeColor }]}>
                          Trip #{task.taskNumber}: {task.taskType}
                        </Text>
                      </View>
                      <Text style={styles.taskTimeText}>🕒 {task.departureTime} ➔ {task.arrivalTime}</Text>
                    </View>
                    <View style={styles.taskRouteRow}>
                      <Text style={styles.taskRouteText} numberOfLines={1}>
                        📍 {task.fromStop} ➔ {task.toStop}
                      </Text>
                      <Text style={styles.taskDistText}>{task.distanceKm} km</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalBtnCloseBottom}
                onPress={() => setBmDetailsModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCloseBottomText}>Close Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── PHOTO-MATCHING BOTTOM NAVIGATION BAR ── */}
      <View style={styles.adminBottomNav}>
        {/* 1. Home */}
        <TouchableOpacity style={styles.adminNavTab} onPress={() => navigateToAdminTab('HOME')} activeOpacity={0.8}>
          <View style={[styles.adminNavIconWrap, activeAdminTab === 'HOME' && styles.adminNavIconActive]}>
            <HomeNavIcon color={activeAdminTab === 'HOME' ? '#4361ee' : '#94a3b8'} size={21} active={activeAdminTab === 'HOME'} />
          </View>
          <Text style={[styles.adminNavLabel, activeAdminTab === 'HOME' && styles.adminNavLabelActive]}>{t('nav_home', 'Home')}</Text>
        </TouchableOpacity>

        {/* 2. Schedule */}
        <TouchableOpacity style={styles.adminNavTab} onPress={() => navigateToAdminTab('SCHEDULE')} activeOpacity={0.8}>
          <View style={[styles.adminNavIconWrap, activeAdminTab === 'SCHEDULE' && styles.adminNavIconActive]}>
            <CalendarIcon color={activeAdminTab === 'SCHEDULE' ? '#4361ee' : '#94a3b8'} size={20} />
          </View>
          <Text style={[styles.adminNavLabel, activeAdminTab === 'SCHEDULE' && styles.adminNavLabelActive]}>{t('nav_schedule', 'Schedule')}</Text>
        </TouchableOpacity>

        {/* 3. Center FAB (+) */}
        <TouchableOpacity
          style={styles.adminNavFab}
          onPress={() => {
            setPlusOptionsModalOpen(true);
          }}
          activeOpacity={0.85}
          accessibilityLabel="Add or Delete Options"
        >
          <Text style={styles.adminNavFabIcon}>+</Text>
        </TouchableOpacity>

        {/* 4. Total fleet */}
        <TouchableOpacity style={styles.adminNavTab} onPress={() => navigateToAdminTab('TOTAL_FLEET')} activeOpacity={0.8}>
          <View style={[styles.adminNavIconWrap, activeAdminTab === 'TOTAL_FLEET' && styles.adminNavIconActive]}>
            <BusFrontIcon color={activeAdminTab === 'TOTAL_FLEET' ? '#4361ee' : '#94a3b8'} size={20} />
          </View>
          <Text style={[styles.adminNavLabel, activeAdminTab === 'TOTAL_FLEET' && styles.adminNavLabelActive]}>{t('nav_total_fleet', 'Total fleet')}</Text>
        </TouchableOpacity>

        {/* 5. Profile */}
        <TouchableOpacity style={styles.adminNavTab} onPress={() => navigateToAdminTab('PROFILE')} activeOpacity={0.8}>
          <View style={[styles.adminNavIconWrap, activeAdminTab === 'PROFILE' && styles.adminNavIconActive]}>
            <UserNavIcon color={activeAdminTab === 'PROFILE' ? '#4361ee' : '#94a3b8'} size={20} active={activeAdminTab === 'PROFILE'} />
          </View>
          <Text style={[styles.adminNavLabel, activeAdminTab === 'PROFILE' && styles.adminNavLabelActive]}>{t('nav_profile', 'Profile')}</Text>
        </TouchableOpacity>
      </View>

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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  topbarLeft: {
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0891b2',
    letterSpacing: 0.8,
  },
  topbarTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  topbarSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  actionPillLocked: {
    backgroundColor: '#fff1f2',
    borderColor: '#fca5a5',
  },
  actionPillAddDelete: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  actionPillTotal: {
    backgroundColor: '#f0fdfa',
    borderColor: '#5eead4',
  },
  actionPillLang: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  actionPillIconWrapLocked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffe4e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillIconWrapAddDelete: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillIconWrapTotal: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillIcon: {
    fontSize: 12.5,
  },
  actionPillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.2,
  },
  actionPillTextLocked: {
    color: '#9f1239',
  },
  actionPillTextAddDelete: {
    color: '#1d4ed8',
  },
  actionPillTextTotal: {
    color: '#0f766e',
  },
  actionPillTextLang: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  lockedBadgePill: {
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  lockedBadgePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  addDeleteBadgePill: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 1,
  },
  addDeleteBadgePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  totalBadgePill: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f766e',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 1,
  },
  totalBadgePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    shadowColor: '#dc2626',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  signOutIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutIcon: {
    fontSize: 11,
  },
  signOutText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#b91c1c',
    letterSpacing: 0.2,
  },
  contentWrap: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Panel */
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#4361ee',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  panelNote: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '750',
    color: '#334155',
    marginBottom: 6,
  },
  routeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  routeChipActive: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  routeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  routeChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeChipD2: {
    borderColor: '#ddd6fe',
    backgroundColor: '#ffffff',
  },
  fixedTimetableBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  fixedTimetableBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  depotPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  depotPillBadge1: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  depotPillBadge2: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  depotPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  depotPillText1: {
    color: '#0f766e',
  },
  depotPillText2: {
    color: '#6d28d9',
  },
  breakdownBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  breakdownBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  depotFilterTabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    marginTop: 6,
  },
  depotTabBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  depotTabBtnActive: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  depotTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  depotTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  candidateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginVertical: 10,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  candidateBm: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  candidateReg: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  catBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  catBadgeA: {
    backgroundColor: '#dcfce7',
  },
  catBadgeB: {
    backgroundColor: '#eff6ff',
  },
  candidateRuleNotice: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
    padding: 10,
    marginTop: 8,
  },
  candidateRuleNoticeText: {
    fontSize: 11.5,
    color: '#92400e',
    fontWeight: '700',
    lineHeight: 16,
  },
  candidateCardEmpty: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginVertical: 10,
    alignItems: 'center',
  },
  candidateEmptyText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  rulesList: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginVertical: 10,
    gap: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  ruleLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    minWidth: 120,
    flexShrink: 0,
  },
  ruleVal: {
    fontSize: 13,
    fontWeight: '750',
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  adminMonitoringNotice: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  adminMonitoringNoticeText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '700',
    lineHeight: 16,
  },
  btnHeaderDownload: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    shadowColor: '#10b981',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  btnHeaderDownloadText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  sectionHeaderStack: {
    marginBottom: 8,
  },
  sectionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  auditLogHeaderStack: {
    marginBottom: 10,
  },
  adminKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  adminKpiBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  adminKpiBoxClickable: {
    backgroundColor: '#f0fdf4',
    borderColor: '#a7f3d0',
  },
  kpiClickableTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    width: '100%',
  },
  kpiViewFleetPill: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiViewFleetPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  kpiClickableHint: {
    fontSize: 9.5,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  // ── Schedule Overview: 1 Search Box & 2 Dropdowns ──
  scheduleSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginTop: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleSearchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  scheduleSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  scheduleClearSearchBtn: {
    padding: 4,
    marginLeft: 6,
  },
  scheduleClearSearchText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '800',
  },
  scheduleDropdownsContainer: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 14,
  },
  scheduleDropdownCol: {
    width: '100%',
  },
  scheduleDropdownLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 5,
  },
  scheduleDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  scheduleDropdownBtnDisabled: {
    opacity: 0.6,
    backgroundColor: '#f1f5f9',
  },
  scheduleDropdownBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  scheduleDropdownCaret: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  schedulePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  schedulePickerItemActive: {
    backgroundColor: '#eff6ff',
  },
  schedulePickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  schedulePickerSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  schedulePickerCheck: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '800',
    marginLeft: 8,
  },
  routeDepotBlock: {
    marginBottom: 8,
  },
  routeDepotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  routeDepotGroupTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
  },
  modalRouteBadge: {
    backgroundColor: '#e0f2fe',
    borderColor: '#93c5fd',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalRouteBadgeText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '800',
  },
  modalCountBadge: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalCountBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '800',
  },
  modalControlsBar: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalControlLabel: {
    fontSize: 11.5,
    fontWeight: '750',
    color: '#475569',
  },
  modalRoutePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  modalRoutePillActive: {
    borderColor: '#4361ee',
    backgroundColor: '#4361ee',
  },
  modalRoutePillText: {
    fontSize: 12,
    fontWeight: '750',
    color: '#334155',
  },
  modalRoutePillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginTop: 4,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12.5,
    color: '#0f172a',
  },
  modalClearSearch: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  modalClearSearchText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
  modalScrollBody: {
    padding: 16,
    gap: 10,
  },
  modalEmptyBox: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  modalEmptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  modalEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalEmptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 280,
  },
  routeAllocatedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#08755f',
    padding: 12,
    marginBottom: 8,
  },
  routeAllocBm: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  routeAllocReg: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  routeAllocGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  routeAllocCell: {
    minWidth: '45%',
    flex: 1,
  },
  routeAllocLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  routeAllocVal: {
    fontSize: 12.5,
    fontWeight: '750',
    color: '#1e293b',
    marginTop: 1,
  },
  routeAllocFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexWrap: 'wrap',
    gap: 4,
  },
  dutyPillActive: {
    backgroundColor: '#f3e8ff',
    borderColor: '#d8b4fe',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dutyPillActiveText: {
    color: '#7e22ce',
    fontSize: 10.5,
    fontWeight: '800',
  },
  routeAllocDutyMode: {
    fontSize: 10.5,
    color: '#16a34a',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  modalFooterHint: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  modalBtnCloseBottom: {
    backgroundColor: '#4361ee',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalBtnCloseBottomText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  adminKpiVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2,
  },
  adminKpiLbl: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  candidateMeta: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  candidateReadyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  btnCommit: {
    backgroundColor: '#4361ee',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  btnCommitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Fleet Nav Grid (4 Category Buttons) */
  fleetNavGrid: {
    gap: 8,
    marginBottom: 14,
  },
  fleetNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  navBtnAllocated: {
    borderColor: '#86efac',
  },
  navBtnAllocatedActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
  },
  navBtnNotAllocated: {
    borderColor: '#fca5a5',
  },
  navBtnNotAllocatedActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
  },
  navBtnAvailable: {
    borderColor: '#c4b5fd',
  },
  navBtnAvailableActive: {
    backgroundColor: '#faf5ff',
    borderColor: '#7c3aed',
  },
  navBtnTotal: {
    borderColor: '#99f6e4',
    backgroundColor: '#ffffff',
  },
  navBtnTotalActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
    shadowColor: '#0d9488',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  navBtnMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtnIcon: {
    fontSize: 18,
  },
  navBtnMeta: {},
  navBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  textAllocatedActive: {
    color: '#16a34a',
  },
  textNotAllocatedActive: {
    color: '#dc2626',
  },
  textAvailableActive: {
    color: '#7c3aed',
  },
  textTotalActive: {
    color: '#0f766e',
  },
  navBtnDesc: {
    fontSize: 10,
    color: '#64748b',
  },
  navPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  navPillAllocated: {
    backgroundColor: '#dcfce7',
  },
  navPillNotAllocated: {
    backgroundColor: '#fee2e2',
  },
  navPillAvailable: {
    backgroundColor: '#ede9fe',
  },
  navPillTotal: {
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  navPillActive: {
    transform: [{ scale: 1.05 }],
  },
  navPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },

  /* Section Content */
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeadingTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  btnResetAll: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  btnResetAllText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991b1b',
  },
  sectionNote: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  clearSearch: {
    fontSize: 14,
    color: '#94a3b8',
    paddingHorizontal: 6,
  },
  emptyCard: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },

  /* Allocated Card */
  allocatedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  allocatedCardTop: {
    marginBottom: 6,
  },
  allocatedRouteCode: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#047857',
  },
  allocatedBmBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  allocatedBmText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#047857',
  },
  allocatedRegText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  allocatedRouteName: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },
  dutyBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
  },
  dutyBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
  },
  dutyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  shiftBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#bbf7d0',
  },
  shiftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  timeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#fde68a',
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  tripBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#bfdbfe',
  },
  tripBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  dutyDriver: {
    fontSize: 11.5,
    color: '#64748b',
    marginVertical: 2,
  },
  dutySoc: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f766e',
  },
  deallocateBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  deallocateBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#dc2626',
  },

  /* Not Allocated Card */
  notAllocCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  notAllocBm: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  notAllocReg: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  notAllocSoc: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#c2410c',
  },
  rejectBadgeRow: {
    marginVertical: 4,
  },
  rejectBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  rejectBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  rangeSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
  },

  /* Available Card */
  accountingBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  accountingTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
  },
  accountingPill: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accountingEqual: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  accountingPlus: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  accountingPipe: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
    marginHorizontal: 2,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  catFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  catFilterPillActive: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  catFilterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  catFilterPillTextActive: {
    color: '#ffffff',
  },
  availCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  availBm: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  availReg: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  availSoc: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4361ee',
  },
  availRange: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },
  availReadyTag: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16a34a',
  },

  /* Total Card */
  totalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#4361ee',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  totalBm: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalReg: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  totalSoc: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  totalStatus: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  totalRange: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdropFullScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    padding: 0,
    margin: 0,
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
  modalCardFullScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  modalFullscreenToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modalFullscreenToggleText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '700',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
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
    fontWeight: '700',
    color: '#64748b',
  },
  lockedModalCountBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  lockedModalCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
  },
  newlyAddedBadge: {
    backgroundColor: '#edf2fe',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  newlyAddedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4361ee',
  },
  emptyLockedBox: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyLockedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyLockedSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  lockedBusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lockedBusBm: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991b1b',
  },
  lockedBusReg: {
    fontSize: 12,
    color: '#7f1d1d',
    fontWeight: '600',
  },
  depotBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  depotBadgePill1: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  depotBadgePill2: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  depotBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lockedBayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeChg: {
    backgroundColor: '#e0f2fe',
  },
  typeBadgeCln: {
    backgroundColor: '#fef3c7',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bayText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  lockedReasonText: {
    fontSize: 12.5,
    color: '#7f1d1d',
    marginBottom: 6,
  },
  lockedFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  lockedTimeText: {
    fontSize: 11.5,
    color: '#64748b',
  },
  isolatedBadge: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  isolatedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991b1b',
  },

  /* Add / Delete Tabs & Forms */
  addDelTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 4,
  },
  addDelTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  addDelTabActive: {
    backgroundColor: '#4361ee',
  },
  addDelTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  addDelTabTextActive: {
    color: '#ffffff',
  },
  tabContentBox: {
    paddingVertical: 4,
  },
  deleteWarningBanner: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  deleteWarningText: {
    fontSize: 12.5,
    color: '#9f1239',
    lineHeight: 18,
  },
  addInfoBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  addInfoText: {
    fontSize: 12.5,
    color: '#1e40af',
    lineHeight: 18,
  },
  modalFieldLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  busSelectorBox: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  delBusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  delBusOptionActive: {
    backgroundColor: '#fef2f2',
  },
  delBusOptionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0f172a',
    marginBottom: 10,
  },
  depotSelectBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  depotSelectBtnActive: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  depotSelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  depotSelectBtnTextActive: {
    color: '#ffffff',
  },
  modalCatBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalCatBtnActive: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  modalCatBtnText: {
    fontSize: 12,
    fontWeight: '750',
    color: '#475569',
  },
  modalCatBtnTextActive: {
    color: '#ffffff',
  },
  reasonWrap: {
    gap: 6,
    marginBottom: 10,
  },
  reasonOption: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  reasonOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#4361ee',
  },
  reasonOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  reasonOptionTextActive: {
    color: '#4361ee',
    fontWeight: '800',
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingBottom: 6,
  },
  btnModalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  btnModalCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },
  btnSubmitAdd: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  btnSubmitAddText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnSubmitDel: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  btnSubmitDelText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Audit Log Tab */
  auditLogTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  auditLogSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  auditCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  auditPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  auditPillAdd: {
    backgroundColor: '#dcfce7',
  },
  auditPillDel: {
    backgroundColor: '#fee2e2',
  },
  auditPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  auditBm: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  auditReg: {
    fontSize: 11.5,
    color: '#64748b',
  },
  auditDepotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4361ee',
  },
  auditReason: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
  },
  auditDetail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  auditFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  auditTimestamp: {
    fontSize: 11,
    color: '#94a3b8',
  },
  auditUser: {
    fontSize: 11,
    color: '#94a3b8',
  },

  /* Lang item */
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  langItemActive: {
    backgroundColor: '#edf2fe',
  },
  langName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  langCheck: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4361ee',
  },

  /* ── ADMIN HOME DASHBOARD STYLES (User-Friendly Hub matching LoginScreen aesthetic) ── */
  adminHomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  homeHeroHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  homeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  homeBrandBadge: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0284c7',
    letterSpacing: 0.8,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  homeRoleBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803d',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    letterSpacing: 0.4,
  },
  homeSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
  },
  homeSyncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  homeSyncText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  homeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  homeSub: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  homeDepotSection: {
    marginBottom: 14,
  },
  homeSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  homeDepotGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  homeDepotPill: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  homeDepotPillActive: {
    borderColor: '#0284c7',
    backgroundColor: '#eff6ff',
  },
  homeDepotPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  homeDepotPillTextActive: {
    color: '#0284c7',
    fontWeight: '800',
  },
  homeQuickNavSection: {
    marginBottom: 14,
  },
  homeQuickNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  homeQuickBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  homeQuickBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  homeTilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  homeQuickTile: {
    width: '48.5%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  homeTileScheduling: {
    backgroundColor: '#ede9fe',
    borderColor: '#ddd6fe',
  },
  homeTileAllocated: {
    backgroundColor: '#d1fae5',
    borderColor: '#a7f3d0',
  },
  homeTileNotAllocated: {
    backgroundColor: '#ffe4e6',
    borderColor: '#fecdd3',
  },
  homeTileTotal: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
  },
  homeTileLocked: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  homeTileAddDelete: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  homeTileEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  homeTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  homeTileTitleScheduling: { color: '#6d28d9' },
  homeTileTitleAllocated: { color: '#065f46' },
  homeTileTitleNotAllocated: { color: '#9f1239' },
  homeTileTitleTotal: { color: '#0369a1' },
  homeTileTitleLocked: { color: '#9f1239' },
  homeTileTitleAddDelete: { color: '#1d4ed8' },
  homeTileSub: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  homeTileSubScheduling: { color: '#7c3aed' },
  homeTileSubAllocated: { color: '#047857' },
  homeTileSubNotAllocated: { color: '#be123c' },
  homeTileSubTotal: { color: '#0284c7' },
  homeTileSubLocked: { color: '#e11d48' },
  homeTileSubAddDelete: { color: '#2563eb' },
  homeKpiStrip: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  homeKpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8,
    alignItems: 'center',
  },
  homeKpiCardTotal: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
  },
  homeKpiCardLocked: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  homeKpiVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  homeKpiLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1,
  },
  homeSignOutBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  homeSignOutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  adminAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarIcon: {
    fontSize: 16,
  },
  homeAdminUser: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  homeAdminRole: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  homeSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#dc2626',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  homeSignOutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
  },

  /* Allocated BM Badge Button (Clickable to open duty details modal) */
  allocatedBmBadgeBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* ── BUS DUTY TASKS & DETAILS MODAL STYLES (Matching website i symbol modal) ── */
  dutyModalBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  dutyModalRouteCode: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  dutyModalScheduleId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dutyModalRouteName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
    marginBottom: 10,
  },
  dutyModalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dutyFeasibilityAlert: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  dutyFeasibilityAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  dutyFeasibilityAlertText: {
    fontSize: 12,
    color: '#14532d',
    lineHeight: 18,
  },
  dutySectionHeading: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.3,
    marginBottom: 10,
    marginTop: 4,
  },
  dutyMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dutyMetricCard: {
    width: '48.5%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  dutyMetricLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  dutyMetricVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  dutyMetricSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  whySelectedCard: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  whyItem: {
    flexDirection: 'row',
    gap: 6,
  },
  whyBullet: {
    fontSize: 13,
    color: '#a16207',
    fontWeight: '900',
  },
  whyText: {
    fontSize: 12,
    color: '#713f12',
    lineHeight: 17,
    flex: 1,
  },
  whyStrong: {
    fontWeight: '800',
    color: '#854d0e',
  },
  dutyTasksList: {
    gap: 8,
    marginBottom: 14,
  },
  taskItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  taskItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  taskTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  taskTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  taskRouteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskRouteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  taskDistText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284c7',
  },

  // ── BOTTOM NAVIGATION BAR STYLES ──
  adminBottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  adminNavTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  adminNavIconWrap: {
    width: 40,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  adminNavIconActive: {
    backgroundColor: '#edf2fe',
  },
  adminNavEmoji: {
    fontSize: 20,
  },
  adminNavLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  adminNavLabelActive: {
    color: '#4361ee',
    fontWeight: '800',
  },
  adminNavFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4361ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  adminNavFabIcon: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: '900',
    lineHeight: 28,
  },

  // ── PROFILE TAB STYLES ──
  profileTabContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    marginBottom: 14,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4361ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profileAvatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  profileRoleBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  profileRoleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  profileDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: '60%',
    textAlign: 'right',
  },
  profileSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 5,
  },
  profileSessionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16a34a',
  },
  profileSessionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  profileLangItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileLangItemActive: {
    backgroundColor: '#edf2fe',
    borderColor: '#4361ee',
  },
  profileLangText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  profileLangTextActive: {
    color: '#4361ee',
    fontWeight: '800',
  },
  profileLangCheck: {
    fontSize: 16,
    color: '#4361ee',
    fontWeight: '900',
  },
  profileSignOutBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  profileSignOutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 0.5,
  },

  // ── PHOTO-MATCHING DASHBOARD & DONUT STYLES ──
  homeContainer: {
    paddingHorizontal: 0,
    paddingTop: 6,
    paddingBottom: 24,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4361ee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerTitles: {
    flex: 1,
    marginLeft: 12,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4361ee',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerBellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
  },
  bellRedDot: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 10,
  },
  bellNumberBadge: {
    position: 'absolute',
    top: -4,
    right: -5,
    backgroundColor: '#dc2626',
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    zIndex: 11,
  },
  bellNumberBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
  },
  homeDepotSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  homeDepotSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  depotPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  depotPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  depotPillActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  depotPillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  depotPillLabelActive: {
    color: '#1e3a8a',
    fontWeight: '800',
  },
  fleetSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  fleetSummaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutBaseRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 12,
    borderColor: '#ede9fe',
  },
  donutHalfRight: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 58,
    height: 116,
    overflow: 'hidden',
  },
  donutCircleRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 12,
    borderColor: 'transparent',
    borderTopColor: '#10b981',
    borderRightColor: '#10b981',
  },
  donutHalfLeft: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 58,
    height: 116,
    overflow: 'hidden',
  },
  donutCircleLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 12,
    borderColor: 'transparent',
    borderTopColor: '#10b981',
    borderRightColor: '#10b981',
  },
  donutCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotalNum: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  donutTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: -2,
  },
  donutPctPill: {
    marginTop: 2,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
  },
  donutPctText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#047857',
  },
  fleetSummaryLegend: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  liveSystemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  liveSystemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveSystemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  legendLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1e293b',
  },
  legendValGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  legendPctText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  fleetSummaryDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  fleetSummaryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availDepartureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availDepartureBolt: {
    fontSize: 16,
    color: '#4f46e5',
  },
  availDepartureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  availDepartureVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4338ca',
  },
  operationsHubSection: {
    marginBottom: 16,
  },
  operationsHubTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 12,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  hubTile: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 124,
  },
  hubTileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  hubTileTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  hubTileSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  subScreenHeader: {
    marginBottom: 10,
  },
  subScreenBackBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subScreenBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4361ee',
  },
  subScreenHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 2,
  },
  subScreenBackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 4,
  },
  subScreenBackIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4361ee',
  },
  subScreenBackLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  subScreenHeaderTitles: {
    flex: 1,
    marginHorizontal: 10,
  },
  subScreenHeaderMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  subScreenHeaderSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  subScreenCountPill: {
    backgroundColor: '#edf2fe',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  subScreenCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4361ee',
  },
  subScreenBadgePill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  subScreenBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  /* ── Universal Sort Strip & Card Details Styles ── */
  sortStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sortStripTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sortPillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sortPillActive: {
    backgroundColor: '#4361ee',
    borderColor: '#4361ee',
  },
  sortPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  sortPillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  /* Card Details Hint Pill */
  cardDetailsHintPill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardDetailsHintText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4361ee',
  },
  allocatedTapHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4361ee',
  },

  /* Total Fleet Stats Bar */
  totalFleetStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  totalStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  totalStatNum: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalStatLbl: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  totalStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },

  /* ── Header Row & SoC Layout Fixes (Prevent Out of Frame) ── */
  cardHeaderRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  cardHeaderLeftWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginRight: 8,
  },
  socBadgePill: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  /* ── Locked Buses Breakdown Summary Bar ── */
  lockedStatsSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  lockedStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  lockedStatNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  lockedStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  lockedStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#cbd5e1',
  },

  /* ── Recently Completed Route Notification Cards ── */
  completedNotificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  completedCardBm: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  completedCardReg: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  completedRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
    gap: 6,
  },
  completedCardRoute: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
  },
  completedSchedulePill: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  completedSchedulePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  completedCardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  completedBadgeReturned: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  completedBadgeReturnedText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: 0.3,
  },
  completedBadgeCooldown: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  completedBadgeCooldownText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#b45309',
  },
  completedBadgeSoc: {
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  completedBadgeSocText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  completedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  completedCardDriver: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  completedCardTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  completedRemarksText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  /* ── Add / Delete Bus Action Button in Total Fleet ── */
  btnAddDelHeader: {
    backgroundColor: '#4361ee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnAddDelHeaderText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* ── Restore Bus Button in Fleet Audit Log ── */
  restoreBusBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restoreBusBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563eb',
  },

  /* ── 1-Month Newly Added Bus Badge on Cards ── */
  cardNewlyAddedBadge: {
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'center',
  },
  cardNewlyAddedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3730a3',
  },

  /* ── MODAL 0: Plus Options Sheet Styles ── */
  modalBackdropDimmed: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  plusOptionsSheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  plusOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  plusOptionsEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#4f46e5',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  plusOptionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  plusOptionsSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  plusOptionCardDepot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  plusOptionIconBoxDepot: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOptionTagDepot: {
    backgroundColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plusOptionTagTextDepot: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#166534',
  },
  plusOptionCardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderWidth: 1.5,
    borderColor: '#5eead4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  plusOptionIconBoxRoute: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOptionTagRoute: {
    backgroundColor: '#99f6e4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plusOptionTagTextRoute: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0f766e',
  },
  plusOptionCardBus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1.5,
    borderColor: '#a5b4fc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  plusOptionIconBoxBus: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOptionTagBus: {
    backgroundColor: '#c7d2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plusOptionTagTextBus: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#3730a3',
  },
  plusOptionCardDriver: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  plusOptionIconBoxDriver: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOptionTagDriver: {
    backgroundColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plusOptionTagTextDriver: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400e',
  },
  plusOptionIcon: {
    fontSize: 22,
  },
  plusOptionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  plusOptionDesc: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginTop: 2,
  },
  plusOptionArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
    paddingLeft: 8,
  },
  plusOptionBtnCancel: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  plusOptionBtnCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },

  /* ── MODAL 3B: Depots & Corridors Styles ── */
  depotCountHeaderBadge: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  depotCountHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f766e',
  },
  depotInfoBanner: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  depotInfoText: {
    fontSize: 12,
    color: '#065f46',
    lineHeight: 17,
  },
  modalShiftBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  modalShiftBtnActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  modalShiftBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  modalShiftBtnTextActive: {
    color: '#ffffff',
  },
  btnSubmitAddDepot: {
    flex: 1,
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitAddDepotText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  directorySummaryPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  directorySummaryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  corridorCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  corridorCodeBadge: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  corridorCodeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  corridorDepotLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  corridorDistBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  corridorDistBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f766e',
  },
  corridorFullNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  corridorPathText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  corridorMetaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  corridorMetaText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },

  // ── Modal 3B Mode Switchers & Depot Creation ──
  depotSubModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 10,
  },
  depotSubModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depotSubModeBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  depotSubModeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  depotSubModeBtnTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },

  // ── Route Selection Dropdown Menu ──
  routeDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  routeDropdownBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  routeDropdownChevron: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d9488',
    marginLeft: 8,
  },
  routeDropdownMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  routeDropdownSearch: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 8,
  },
  routeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  routeDropdownItemActive: {
    backgroundColor: '#f0fdfa',
  },
  routeDropdownItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  routeCodePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  routeCodePillActive: {
    backgroundColor: '#ccfbf1',
    borderColor: '#5eead4',
  },
  routeCodePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  routeCodePillTextActive: {
    color: '#0f766e',
  },
  routeDropdownCheckBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeDropdownCheckBadgeActive: {
    backgroundColor: '#0d9488',
  },
  routeDropdownCheckBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  routeDropdownCheckBadgeTextActive: {
    color: '#ffffff',
  },

  // ── Selected Route Chips ──
  selectedRouteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#5eead4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  selectedRouteChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f766e',
  },
  selectedRouteChipRemove: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRouteChipRemoveText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },

  // ── Auto-gen Banner ──
  autoGenBanner: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1.5,
    borderColor: '#99f6e4',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  autoGenBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f766e',
    marginBottom: 4,
  },
  autoGenBannerDesc: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 8,
  },
  autoGenBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  autoGenBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#5eead4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  autoGenBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0f766e',
  },

  // ── Profile Tab Depot Credentials Directory ──
  btnAddDepotProfilePill: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  btnAddDepotProfilePillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileDepotBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  profileDepotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 10,
  },
  profileDepotNameText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  profileDepotDefaultBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  profileDepotDefaultBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  profileDepotCustomBadge: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  profileDepotCustomBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f766e',
  },
  profileDepotLocText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  profileDepotRoutesText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
  },
  btnDeleteDepotProfile: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnDeleteDepotProfileText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#dc2626',
  },
  profileCredsGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  profileCredCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  profileCredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  profileCredOpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileCredQuickOpenBtn: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  profileCredQuickOpenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  profileCredRoleText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  profileCredPageText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  profileCredDetailsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 8,
    gap: 2,
  },
  profileCredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileCredKey: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  profileCredVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  profileCredCopyBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileCredCopyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },

  // ── Profile Credentials CSV Row Styles ──
  profileCredentialsRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  profileCredentialsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  profileCredentialsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  profileCredentialsRowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  profileCredentialsRowSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  profileCredentialsActionPill: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  profileCredentialsActionPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  profileDepotsQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileDepotsQuickCountText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  profileManageDepotsLink: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  profileManageDepotsLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3b82f6',
  },
  delDepotPreviewCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  delDepotPreviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#be123c',
    marginBottom: 6,
  },
  delDepotPreviewItem: {
    fontSize: 11.5,
    color: '#9f1239',
    marginBottom: 3,
    fontWeight: '600',
  },
  modalDropdownBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalDropdownBtnActive: {
    borderColor: '#4361ee',
    backgroundColor: '#ffffff',
  },
  modalDropdownBtnText: {
    fontSize: 13.5,
    color: '#0f172a',
    fontWeight: '700',
  },
  modalDropdownMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    marginBottom: 12,
    maxHeight: 180,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  modalDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalDropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  modalDropdownItemText: {
    fontSize: 13.5,
    color: '#1e293b',
    fontWeight: '600',
  },
  modalDropdownItemTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  profileDatasetUploadBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  profileDatasetActionPill: {
    backgroundColor: '#0284c7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  profileDatasetActionPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  profileDatasetApplyBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  // ── Routes & Drivers Modal Specific Styles ──
  routesDepotFilterBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  routesDepotFilterLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 6,
  },
  routesDepotDropdownBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routesDepotDropdownBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  routesDepotDropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 180,
  },
  routesDepotDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0fdf4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routesDepotDropdownItemActive: {
    backgroundColor: '#dcfce7',
  },
  routesDepotDropdownItemText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#166534',
  },
  routesDepotDropdownItemTextActive: {
    fontWeight: '800',
    color: '#15803d',
  },

  // Drivers Filter Box
  driversDepotFilterBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  driversDepotFilterLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: 6,
  },
  driversDepotDropdownBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driversDepotDropdownBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  driversDepotDropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 180,
  },
  driversDepotDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driversDepotDropdownItemActive: {
    backgroundColor: '#dbeafe',
  },
  driversDepotDropdownItemText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  driversDepotDropdownItemTextActive: {
    fontWeight: '800',
    color: '#1d4ed8',
  },

  // Driver Card in Roster
  driverCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  driverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  driverCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  driverCardEmpId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  driverCardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  driverCardPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  driverCardPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  profileDatasetApplyBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
