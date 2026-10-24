import React, { useState, useMemo, useRef } from 'react';
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
  getBusDepot,
} from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BatteryBar from '../components/BatteryBar';
import { exportCsvFile, downloadExcelReport, downloadPdfReport } from '../utils/exportCsv';
import { getSequentialTasksForDuty } from '../utils/detailedScheduleTrips';
import { api } from '../api/client';

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
  { id: '356Z', code: '356Z', name: 'Chandapura ➔ Anekal (356Z)', distance: 28.7, fullDutyKm: 55.0, category: 'Standard', requiredCat: 'C', drainSoc: 24, timetables: ['07:15 AM', '08:30 AM', '01:10 PM', '02:20 PM', '07:40 PM'], shift: 'General Shift' },
  { id: '360K', code: '360K', name: 'Chandapura ➔ Kempegowda Bus Station (360K)', distance: 36.2, fullDutyKm: 78.4, category: 'Standard', requiredCat: 'B', drainSoc: 28, timetables: ['07:00 AM', '08:15 AM', '01:10 PM', '02:00 PM', '06:30 PM'], shift: 'General Shift' },
  { id: '600F', code: '600F', name: 'Bommasandra Depot 32 ➔ Basavanagudi (600F)', distance: 27.8, fullDutyKm: 62.0, category: 'Standard', requiredCat: 'B', drainSoc: 25, timetables: ['06:45 AM', '08:00 AM', '01:10 PM', '02:30 PM', '07:15 PM'], shift: 'General Shift' },
  { id: 'KBS3A', code: 'KBS3A', name: 'Chandapura ➔ Kempegowda Bus Station (KBS3A)', distance: 35.8, fullDutyKm: 72.0, category: 'Moderate', requiredCat: 'B', drainSoc: 26, timetables: ['07:00 AM', '08:30 AM', '01:10 PM', '02:15 PM', '06:00 PM'], shift: 'General Shift' },
];

const DEPOT_2_ROUTES_DATA = [
  { id: '361C', code: '361C', name: 'Attibele ➔ Kempegowda Bus Station (361C)', distance: 38.5, fullDutyKm: 108.0, category: 'Complex', requiredCat: 'A', drainSoc: 36, timetables: ['07:30 AM', '09:00 AM', '01:10 PM', '03:00 PM', '05:50 AM'], shift: 'Night Halt' },
  { id: '399C', code: '399C', name: 'Hosakote ➔ Electronic City (399C)', distance: 34.0, fullDutyKm: 85.0, category: 'Complex', requiredCat: 'A', drainSoc: 32, timetables: ['07:45 AM', '09:15 AM', '01:10 PM', '03:30 PM'], shift: 'General Shift' },
  { id: '328H', code: '328H', name: 'Hoskote ➔ Kempegowda Bus Station (328H)', distance: 32.5, fullDutyKm: 95.0, category: 'Moderate', requiredCat: 'B', drainSoc: 30, timetables: ['01:10 PM', '01:45 PM', '01:50 PM', '07:00 AM', '10:30 AM'], shift: 'Night Halt' },
  { id: '500DC', code: '500DC', name: 'Attibele ➔ Whitefield (500DC)', distance: 31.0, fullDutyKm: 101.1, category: 'Standard', requiredCat: 'A', drainSoc: 32, timetables: ['07:45 AM', '08:00 AM', '08:15 AM', '08:30 AM', '01:10 PM'], shift: 'General Shift' },
  { id: 'KBS3F', code: 'KBS3F', name: 'Attibele ➔ Kempegowda Bus Station (KBS3F)', distance: 39.2, fullDutyKm: 76.0, category: 'Standard', requiredCat: 'B', drainSoc: 22, timetables: ['05:45 AM', '07:15 AM', '08:45 AM', '01:10 PM', '02:30 PM'], shift: 'General shift' },
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

  // Form 4 Single Charge Operation Transit Standard:
  // Operating stretch for corridor duty schedules is capped at 65 km (matching admin.html exactly)
  let targetKm = 65;
  if (routeObj) {
    const fullDist = Number(duty?.fullDutyKm || routeObj.fullDutyKm || (routeObj.distance * (duty?.tripCount || 4)) || 65);
    targetKm = Math.min(65, fullDist > 30 ? 65 : (routeObj.distance || 28.7));
  } else if (duty && (duty.routeDist || duty.distance)) {
    const d = Number(duty.routeDist || duty.distance);
    targetKm = Math.min(65, d > 30 ? 65 : d);
  }
  return getRequiredSingleChargeSoc(targetKm, duty, bm, depTime);
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

const BellIcon = ({ color = '#1e293b', size = 20, hasBadge = true }) => (
  <View style={{ width: size + 4, height: size + 4, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.72, height: size * 0.7, borderTopLeftRadius: size * 0.36, borderTopRightRadius: size * 0.36, borderWidth: 1.8, borderColor: color }} />
    <View style={{ width: size * 0.95, height: 2, borderRadius: 1, backgroundColor: color, marginTop: -0.5 }} />
    <View style={{ width: 3, height: 2, borderBottomLeftRadius: 1.5, borderBottomRightRadius: 1.5, backgroundColor: color, marginTop: 1 }} />
    {hasBadge && (
      <View style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: '#ffffff' }} />
    )}
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

// ── PHOTO-MATCHING CIRCULAR DONUT CHART ──
const DonutChart = ({ total = 123, allocated = 6 }) => {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeAllocated = Math.min(safeTotal, Math.max(0, Number(allocated) || 0));
  const ratio = safeTotal > 0 ? safeAllocated / safeTotal : 0;
  const theta = Math.min(360, Math.max(0, ratio * 360));

  // Native iOS / Android / Web math
  const firstHalfAngle = Math.min(180, theta);
  const secondHalfAngle = Math.max(0, theta - 180);
  const firstRotate = -225 + firstHalfAngle;
  const secondRotate = -225 + secondHalfAngle;

  if (Platform.OS === 'web') {
    const size = 120;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - ratio);

    return (
      <View style={styles.donutWrapper}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#ede9fe"
            strokeWidth={strokeWidth}
            fill="none"
          />
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

  return (
    <View style={styles.donutWrapper}>
      {/* 1. Base Lavender Ring */}
      <View style={styles.donutBaseRing} />

      {/* 2. Allocated Arc: Right half (0° to 180°) */}
      <View style={styles.donutHalfRight}>
        <View
          style={[
            styles.donutCircleRight,
            { transform: [{ rotate: `${firstRotate}deg` }] },
          ]}
        />
      </View>

      {/* 3. Allocated Arc: Left half (180° to 360°) */}
      {theta > 180 && (
        <View style={styles.donutHalfLeft}>
          <View
            style={[
              styles.donutCircleLeft,
              { transform: [{ rotate: `${secondRotate}deg` }] },
            ]}
          />
        </View>
      )}

      {/* 4. Center Metrics matching photo */}
      <View style={styles.donutCenterContent}>
        <Text style={styles.donutTotalNum}>{safeTotal}</Text>
        <Text style={styles.donutTotalLabel}>Total fleet</Text>
      </View>
    </View>
  );
};

// ── UNIFIED SUBSCREEN HEADER BAR ──
const SubScreenHeader = ({ title, subtitle, onBack, badge, count }) => (
  <View style={styles.subScreenHeaderBar}>
    <TouchableOpacity
      style={styles.subScreenBackPill}
      onPress={onBack}
      activeOpacity={0.75}
    >
      <Text style={styles.subScreenBackIcon}>←</Text>
      <Text style={styles.subScreenBackLabel}>Home</Text>
    </TouchableOpacity>

    <View style={styles.subScreenHeaderTitles}>
      <Text style={styles.subScreenHeaderMainTitle} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.subScreenHeaderSubTitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>

    {count !== undefined && count !== null ? (
      <View style={styles.subScreenCountPill}>
        <Text style={styles.subScreenCountText}>{count}</Text>
      </View>
    ) : badge ? (
      <View style={styles.subScreenBadgePill}>
        <Text style={styles.subScreenBadgeText}>{badge}</Text>
      </View>
    ) : (
      <View style={{ width: 36 }} />
    )}
  </View>
);

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
    deleteBusFromFleet,
    restoreBusToFleet,
    localAddedBuses,
    localDeletedBuses,
    unlockBus,
    unlockAllBuses,
  } = useFleet();
  const { user, selectedDepot, logout } = useAuth();

  // Admin Workspace is the enterprise view of the ENTIRE fleet (both Depot 1 and Depot 2)
  const buses = (allBuses && allBuses.length > 0) ? allBuses : contextBuses;

  // Enterprise Depot Filter: 'all' | '1' | '2' (Allows full enterprise view of both Depot 1 and Depot 2)
  const [adminDepotFilter, setAdminDepotFilter] = useState('all');

  // Current language synced via LanguageContext
  const { currentLang, setLanguage: setCurrentLang } = useLanguage();
  const t = I18N[currentLang] || I18N.en;

  // Modals state
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [addDeleteModalOpen, setAddDeleteModalOpen] = useState(false);
  const [routeAllocatedModalOpen, setRouteAllocatedModalOpen] = useState(false);
  const [routeAllocatedModalRoute, setRouteAllocatedModalRoute] = useState(ALL_ROUTES_DATA[0].code);
  const [routeAllocatedSearch, setRouteAllocatedSearch] = useState('');

  // Notifications Modal State: Recently Route Completed Buses
  const [recentCompletedModalOpen, setRecentCompletedModalOpen] = useState(false);
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

  // Open BM Details Modal
  const handleOpenBmDutyDetails = (duty) => {
    const details = generateBusDutyDetails(duty);
    setSelectedBmDuty(details);
    setBmDetailsModalOpen(true);
  };

  // Scroll smoothly down to Total Buses near Not-Allocated Buses
  const handleScrollToTotalBuses = () => {
    setActiveAdminTab('TOTAL_FLEET');
  };

  // Schedule Requirement State (Supports routes from BOTH Depot 1 and Depot 2)
  const [selectedRoute, setSelectedRoute] = useState(ALL_ROUTES_DATA[0]);
  const [scheduledTime, setScheduledTime] = useState(ALL_ROUTES_DATA[0].timetables[0]);

  // Detected operating depot for the selected route
  const selectedRouteDepot = DEPOT_2_ROUTES_DATA.some((r) => r.id === selectedRoute.id) ? '2' : '1';
  const routeDrivers = DEPOT_DRIVERS[selectedRouteDepot] || DEPOT_DRIVERS['1'];
  const [selectedDriver, setSelectedDriver] = useState(routeDrivers[0]);

  // Sync driver when route changes
  React.useEffect(() => {
    const drivers = DEPOT_DRIVERS[selectedRouteDepot] || DEPOT_DRIVERS['1'];
    setSelectedDriver(drivers[0]);
  }, [selectedRouteDepot]);

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
  const [addDepot, setAddDepot] = useState('1');
  const [addReasonSelect, setAddReasonSelect] = useState('New Electric Bus Induction (Ashok Leyland EiV12)');
  const [addReasonDetail, setAddReasonDetail] = useState('');

  const [delSearchQuery, setDelSearchQuery] = useState('');
  const [delSelectedBm, setDelSelectedBm] = useState('');
  const [delReg, setDelReg] = useState('');
  const [delDepot, setDelDepot] = useState('1');
  const [delReasonSelect, setDelReasonSelect] = useState('Major Breakdown / Motor Defect');
  const [delReasonDetail, setDelReasonDetail] = useState('');

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

  // Current View based on selected adminDepotFilter ('all' | '1' | '2')
  const viewBuses = adminDepotFilter === 'all' ? buses : adminDepotFilter === '1' ? d1Buses : d2Buses;
  const viewAllocatedDuties = adminDepotFilter === 'all' ? allAllocatedDuties : adminDepotFilter === '1' ? d1AllocatedDuties : d2AllocatedDuties;
  const viewAvailableBuses = adminDepotFilter === 'all' ? allAvailableBuses : adminDepotFilter === '1' ? d1AvailableBuses : d2AvailableBuses;
  const viewNotAllocatedBuses = adminDepotFilter === 'all' ? allNotAllocatedBuses : adminDepotFilter === '1' ? d1NotAllocatedBuses : d2NotAllocatedBuses;

  // ── Candidate Bus Evaluation (Exact Match to website Matrix Status & Peak Rules) ──
  const timeCatInfo = getTimeCategory(scheduledTime);
  const isPeak = timeCatInfo.isPeak;
  const complexity = getRouteComplexity(selectedRoute.distance);
  const matrixStatus = getMatrixStatus(complexity, isPeak);

  // Available buses from the route's assigned depot
  const routeDepotBuses = buses.filter((b) => String(b.depot || '1') === selectedRouteDepot);
  const routeReadyBuses = routeDepotBuses.filter(isBusAvailableForScheduling);
  const candidatePool = routeReadyBuses.length > 0 ? routeReadyBuses : routeDepotBuses;

  const candidateBus = useMemo(() => {
    let sorted = [];
    if (matrixStatus === 'A') {
      // STRICT PEAK / COMPLEX RULE: ONLY Category A buses are eligible!
      const catABuses = candidatePool.filter((b) => b.busCategory === 'A').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      if (catABuses.length > 0) {
        sorted = catABuses;
      } else {
        sorted = candidatePool.slice().sort((a, b) => (b.soc || 0) - (a.soc || 0));
      }
    } else if (matrixStatus === 'A/B') {
      // NORMAL OFF-PEAK: Category B prioritized first, then Category A
      const catBBuses = candidatePool.filter((b) => b.busCategory === 'B').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      const catABuses = candidatePool.filter((b) => b.busCategory === 'A').sort((a, b) => (b.soc || 0) - (a.soc || 0));
      sorted = [...catBBuses, ...catABuses];
    } else {
      // NORMAL OFF-PEAK SIMPLE: Category C, then B, then A
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

  // Total buses available in the operating depot for this route (Exact match to admin.html bus-total)
  const routeTotalAvailableCount = candidatePool.length;

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
  const timeKey = timeCatInfo.category || (isPeak ? 'PEAK' : 'NORMAL');
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
      if (adminDepotFilter === 'all') return true;
      const bDepot = String(b.depot || (buses.find((x) => x.bmNumber === b.bm)?.depot) || '1');
      return bDepot === adminDepotFilter;
    });
  }, [lockedBuses, adminDepotFilter, buses]);

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
      return !isBusLockedInService(bm);
    });
  }, [completedRoutesLog, buses, lockedBuses]);

  const turnaroundDepot1List = useMemo(() => {
    return turnaroundAllList.filter((item) => {
      const bm = String(item.bm || item.bmNumber || '').toUpperCase().trim();
      const bDepot = String(item.depot || (buses.find((x) => x.bmNumber === bm)?.depot) || '1');
      return bDepot === '1';
    });
  }, [turnaroundAllList, buses]);

  const turnaroundDepot2List = useMemo(() => {
    return turnaroundAllList.filter((item) => {
      const bm = String(item.bm || item.bmNumber || '').toUpperCase().trim();
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
      if (lockedDepotFilter === 'all') return true;
      const bDepot = String(b.depot || (buses.find((x) => x.bmNumber === b.bm)?.depot) || '1');
      return bDepot === lockedDepotFilter;
    });
  }, [lockedBuses, lockedDepotFilter, buses]);

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
      return b.bmNumber.toLowerCase().includes(q) || (b.regNo && b.regNo.toLowerCase().includes(q));
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
      const resolvedDepot = String(bus.depot || '').includes('2') ? '2' : '1';
      setDelDepot(resolvedDepot);
    }
  };

  const handleSubmitAdd = async () => {
    if (!addBm.trim()) {
      Alert.alert('Bus Number Required', 'Please enter a Bus Number (e.g. BM001 or BM305).');
      return;
    }
    if (!addReg.trim()) {
      Alert.alert('Registration Required', 'Please enter the Bus Registration Number (e.g. KA51AH4144).');
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
    const targetBm = delSelectedBm.trim().toUpperCase();
    if (!targetBm) {
      Alert.alert('Selection Required', 'Please enter or select an active bus to delete.');
      return;
    }
    const targetBus = buses.find((b) => b.bmNumber === targetBm);
    const targetReg = delReg.trim().toUpperCase() || (targetBus && targetBus.regNo) || `KA51AH${targetBm.replace(/\D/g, '').padStart(4, '0')}`;
    const reasonVal = delReasonDetail.trim() || delReasonSelect || 'Fleet Maintenance Off-road';
    const targetDepot = String(delDepot || (targetBus && targetBus.depot) || '1');

    Alert.alert(
      '⚠️ Confirm Fleet Deletion',
      `Delete Bus ${targetBm} (${targetReg}) from available fleet?\n\nReason: ${reasonVal}\nDepot: Depot ${targetDepot}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🗑 Confirm Delete',
          style: 'destructive',
          onPress: async () => {
            const delPayload = {
              bm: targetBm,
              busNumber: targetBm,
              regNo: targetReg,
              regNumber: targetReg,
              depot: targetDepot,
              reason: reasonVal,
              reasonVal,
              make: 'Ashok Leyland',
              model: 'ELECTRIC BUS AC EiV12',
            };
            await deleteBusFromFleet(targetBm, delPayload);

            const newAuditEntry = {
              id: 'audit_' + Date.now(),
              action: 'DELETED',
              bm: targetBm,
              reg: targetReg,
              depot: targetDepot,
              reasonCategory: delReasonSelect,
              detail: reasonVal,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', 22 Oct 2026',
              user: user?.email || 'admin@bmtc.gov.in',
            };
            setAuditLogs((prev) => [newAuditEntry, ...prev]);

            Alert.alert(
              '🗑️ Bus Deleted',
              `Bus ${targetBm} (${targetReg}) has been deleted from the available fleet.\n\nReason recorded: ${reasonVal}`
            );
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
                <Text style={styles.headerEyebrow}>DEPOT OPERATIONS</Text>
                <Text style={styles.headerMainTitle}>Admin Workspace</Text>
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
                  onPress={() => setRecentCompletedModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <BellIcon color="#1e293b" size={20} hasBadge={turnaroundAllList.length > 0} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Depot Filter Pills matching photo */}
            <View style={styles.depotPillBar}>
              {[
                { id: 'all', label: `All fleet · ${buses.length}` },
                { id: '1', label: `Depot 1 · ${d1Buses.length}` },
                { id: '2', label: `Depot 2 · ${d2Buses.length}` },
              ].map((item) => {
                const isActive = adminDepotFilter === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.depotPill, isActive && styles.depotPillActive]}
                    onPress={() => {
                      setAdminDepotFilter(item.id);
                      setLockedDepotFilter(item.id);
                      setRecentCompletedDepot(item.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.depotPillLabel, isActive && styles.depotPillLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Donut Chart Summary Card matching photo */}
            <View style={styles.fleetSummaryCard}>
              <View style={styles.fleetSummaryTopRow}>
                {/* Left: Donut Chart with bold 124 & Total fleet */}
                <DonutChart total={viewBuses.length} allocated={viewAllocatedDuties.length} />

                {/* Right: Legend with Live system, Allocated, Not allocated */}
                <View style={styles.fleetSummaryLegend}>
                  <View style={styles.liveSystemBadge}>
                    <View style={styles.liveSystemDot} />
                    <Text style={styles.liveSystemText}>Live system</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.legendRow}
                    onPress={() => setActiveAdminTab('ALLOCATED')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.legendLabelWrap}>
                      <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.legendLabel}>Allocated</Text>
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
                    onPress={() => setActiveAdminTab('NOT_ALLOCATED')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.legendLabelWrap}>
                      <View style={[styles.legendDot, { backgroundColor: '#a5b4fc' }]} />
                      <Text style={styles.legendLabel}>Not allocated</Text>
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
                onPress={() => setActiveAdminTab('AVAILABLE_DEPARTURE')}
                activeOpacity={0.7}
              >
                <View style={styles.availDepartureLeft}>
                  <Text style={styles.availDepartureBolt}>⚡</Text>
                  <Text style={styles.availDepartureLabel}>Available for scheduling</Text>
                </View>
                <Text style={styles.availDepartureVal}>{viewAvailableBuses.length}</Text>
              </TouchableOpacity>
            </View>

            {/* Fleet Reconciliation Equation Bar (admin.html parity: Total = Available + On Route + Locked) */}
            <View style={styles.accountingBar}>
              <Text style={styles.accountingTitle}>📊 Fleet Breakdown:</Text>
              <Text style={styles.accountingPill}>Total: {viewBuses.length}</Text>
              <Text style={styles.accountingEqual}>=</Text>
              <TouchableOpacity onPress={() => setActiveAdminTab('AVAILABLE_DEPARTURE')}>
                <Text style={[styles.accountingPill, { backgroundColor: '#f5f3ff', color: '#5b21b6' }]}>⚡ Avail: {viewAvailableBuses.length}</Text>
              </TouchableOpacity>
              <Text style={styles.accountingPlus}>+</Text>
              <TouchableOpacity onPress={() => setActiveAdminTab('ALLOCATED')}>
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
              <Text style={styles.operationsHubTitle}>OPERATIONS HUB</Text>

              <View style={styles.hubGrid}>
                {/* Tile 1: Available for departure */}
                <TouchableOpacity
                  style={styles.hubTile}
                  onPress={() => setActiveAdminTab('AVAILABLE_DEPARTURE')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hubTileIconBox, { backgroundColor: '#ede9fe' }]}>
                    <CalendarIcon color="#4f46e5" size={22} />
                  </View>
                  <Text style={styles.hubTileTitle}>Available for scheduling</Text>
                  <Text style={styles.hubTileSub}>{viewAvailableBuses.length} ready to schedule</Text>
                </TouchableOpacity>

                {/* Tile 2: Allocated buses */}
                <TouchableOpacity
                  style={styles.hubTile}
                  onPress={() => setActiveAdminTab('ALLOCATED')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hubTileIconBox, { backgroundColor: '#dcfce7' }]}>
                    <CheckCircleIcon color="#10b981" size={24} />
                  </View>
                  <Text style={styles.hubTileTitle}>Allocated buses</Text>
                  <Text style={styles.hubTileSub}>{viewAllocatedDuties.length} on active route</Text>
                </TouchableOpacity>

                {/* Tile 3: Not allocated */}
                <TouchableOpacity
                  style={styles.hubTile}
                  onPress={() => setActiveAdminTab('NOT_ALLOCATED')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hubTileIconBox, { backgroundColor: '#dbeafe' }]}>
                    <BusFrontIcon color="#2563eb" size={22} />
                  </View>
                  <Text style={styles.hubTileTitle}>Not allocated</Text>
                  <Text style={styles.hubTileSub}>{viewNotAllocatedBuses.length} in yard reserve</Text>
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
          <SubScreenHeader
            title="Schedule Overview"
            subtitle="Route candidate evaluation & dispatch readiness"
            onBack={() => setActiveAdminTab('HOME')}
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
            Select a route from Depot 1 or Depot 2. Allocation rules enforce Peak/Extreme Peak Category A vehicles.
          </Text>

          {/* Depot 1 Routes */}
          <View style={styles.routeDepotBlock}>
            <View style={styles.routeDepotTitleRow}>
              <Text style={styles.routeDepotGroupTitle}>🏢 Depot 1 Routes (Chandapura)</Text>
              <View style={styles.depotPillBadge1}>
                <Text style={styles.depotPillText1}>{DEPOT_1_ROUTES_DATA.length} Routes</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {DEPOT_1_ROUTES_DATA.map((r) => {
                const isSelected = r.id === selectedRoute.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.routeChip, isSelected && styles.routeChipActive]}
                    onPress={() => {
                      setSelectedRoute(r);
                      setScheduledTime(r.timetables[0]);
                    }}
                  >
                    <Text style={[styles.routeChipText, isSelected && styles.routeChipTextActive]}>
                      {r.code} ({r.distance} km)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Depot 2 Routes */}
          <View style={styles.routeDepotBlock}>
            <View style={styles.routeDepotTitleRow}>
              <Text style={styles.routeDepotGroupTitle}>🏢 Depot 2 Routes (Hoskote / Attibele)</Text>
              <View style={styles.depotPillBadge2}>
                <Text style={styles.depotPillText2}>{DEPOT_2_ROUTES_DATA.length} Routes</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {DEPOT_2_ROUTES_DATA.map((r) => {
                const isSelected = r.id === selectedRoute.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.routeChip, isSelected && styles.routeChipActive, !isSelected && styles.routeChipD2]}
                    onPress={() => {
                      setSelectedRoute(r);
                      setScheduledTime(r.timetables[0]);
                    }}
                  >
                    <Text style={[styles.routeChipText, isSelected && styles.routeChipTextActive]}>
                      {r.code} ({r.distance} km)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Allocation Result KPIs (Total buses of selected route & Allocated buses, matching admin.html) */}
          <View style={styles.adminKpiGrid}>
            <View style={styles.adminKpiBox}>
              <Text style={styles.adminKpiVal}>{routeTotalAvailableCount}</Text>
              <Text style={styles.adminKpiLbl}>Total buses ({selectedRoute.code})</Text>
            </View>

            {/* Clickable Allocated Buses KPI -> Opens Route Allocated Buses Modal */}
            <TouchableOpacity
              style={[styles.adminKpiBox, styles.adminKpiBoxClickable]}
              onPress={() => {
                setRouteAllocatedModalRoute(selectedRoute.code);
                setRouteAllocatedSearch('');
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
              <Text style={[styles.adminKpiVal, { color: '#0284c7' }]}>{candidateBus ? `${fullDutyDistance} km` : '—'}</Text>
              <Text style={styles.adminKpiLbl}>Full Duty Distance</Text>
            </View>
          </View>

          {/* Transparent Rules Breakdown (Matching admin.html) */}
          <View style={styles.rulesList}>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Full Duty Distance</Text>
              <Text style={styles.ruleVal}>{candidateBus ? `${fullDutyDistance} km` : '—'}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Operation Mode</Text>
              <Text style={[styles.ruleVal, { color: '#15803d', fontWeight: '800' }]}>Single Charge Operation</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Total distance</Text>
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
            <SubScreenHeader
              title="Allocated Buses"
              subtitle="Active dispatches on scheduled corridors"
              onBack={() => setActiveAdminTab('HOME')}
              count={viewAllocatedDuties.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.sectionHeaderStack}>
                <Text style={[styles.sectionHeadingTitle, { color: '#08755f' }]}>
                  ✅ Allocated Buses ({viewAllocatedDuties.length})
                </Text>
                <View style={[styles.sectionActionsRow, { flexWrap: 'wrap', gap: 6 }]}>
                  <TouchableOpacity
                    style={[styles.btnHeaderDownload, { backgroundColor: '#0f766e' }]}
                    onPress={downloadExcelReport}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnHeaderDownloadText}>📊 Excel (.xlsx)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnHeaderDownload, { backgroundColor: '#be123c' }]}
                    onPress={downloadPdfReport}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnHeaderDownloadText}>📄 PDF Report</Text>
                  </TouchableOpacity>
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
                  <Text style={styles.btnHeaderDownloadText}>📥 Download CSV</Text>
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
            <SubScreenHeader
              title="Not-Allocated Buses"
              subtitle="Yard reserve, charging & maintenance isolation"
              onBack={() => setActiveAdminTab('HOME')}
              count={viewNotAllocatedBuses.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeadingTitle, { color: '#a94b15' }]}>
                  ⛔ Not-Allocated Buses ({viewNotAllocatedBuses.length})
                </Text>
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
            <SubScreenHeader
              title="Available for Scheduling"
              subtitle="Ready fleet strictly compliant for duty scheduling"
              onBack={() => setActiveAdminTab('HOME')}
              count={viewAvailableBuses.length}
            />
            <View style={styles.sectionContent}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeadingTitle, { color: '#6d28d9' }]}>
                  ⚡ Available Buses for Scheduling ({viewAvailableBuses.length})
                </Text>
              </View>
              <Text style={styles.sectionNote}>
                Ready fleet ({adminDepotFilter === 'all' ? 'Depot 1 & Depot 2' : 'Depot ' + adminDepotFilter}). Cleaning and charging protocols strictly excluded.
              </Text>

              {/* Fleet Accounting Bar (admin.html parity: Total = Available + On Route + Locked) */}
              <View style={styles.accountingBar}>
                <Text style={styles.accountingTitle}>📊 Fleet Breakdown:</Text>
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
            <SubScreenHeader
              title="Total Fleet"
              subtitle="Depot 1 & Depot 2 complete vehicle directory"
              onBack={() => setActiveAdminTab('HOME')}
              count={viewBuses.length}
            />

            {/* Depot filter switcher tabs for Total Fleet */}
            <View style={styles.depotFilterTabBar}>
              <TouchableOpacity
                style={[styles.depotTabBtn, adminDepotFilter === 'all' && styles.depotTabBtnActive]}
                onPress={() => {
                  setAdminDepotFilter('all');
                  setLockedDepotFilter('all');
                  setRecentCompletedDepot('all');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.depotTabBtnText, adminDepotFilter === 'all' && styles.depotTabBtnTextActive]}>
                  🌐 All Fleet ({buses.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.depotTabBtn, adminDepotFilter === '1' && styles.depotTabBtnActive]}
                onPress={() => {
                  setAdminDepotFilter('1');
                  setLockedDepotFilter('1');
                  setRecentCompletedDepot('1');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.depotTabBtnText, adminDepotFilter === '1' && styles.depotTabBtnTextActive]}>
                  🏢 Depot 1 ({d1Buses.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.depotTabBtn, adminDepotFilter === '2' && styles.depotTabBtnActive]}
                onPress={() => {
                  setAdminDepotFilter('2');
                  setLockedDepotFilter('2');
                  setRecentCompletedDepot('2');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.depotTabBtnText, adminDepotFilter === '2' && styles.depotTabBtnTextActive]}>
                  🏢 Depot 2 ({d2Buses.length})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.sectionHeaderStack}>
                <Text style={[styles.sectionHeadingTitle, { color: '#0f766e' }]}>
                  🚌 Total Buses ({viewBuses.length})
                </Text>
                <View style={styles.sectionActionsRow}>
                  <View style={styles.breakdownBadge}>
                    <Text style={styles.breakdownBadgeText}>D1: {d1Buses.length} | D2: {d2Buses.length}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.btnAddDelHeader}
                    onPress={() => setAddDeleteModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnAddDelHeaderText}>➕ Add / Delete</Text>
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
                    <Text style={styles.btnHeaderDownloadText}>📥 Export CSV</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.sectionNote}>
                Complete fleet ({adminDepotFilter === 'all' ? 'Depot 1 & Depot 2' : 'Depot ' + adminDepotFilter}) with real-time status and telemetry.
              </Text>

              {/* Fleet Accounting Bar (Available, On Route, Locked counts matching user request) */}
              <View style={styles.totalFleetStatsBar}>
                <View style={styles.totalStatBox}>
                  <Text style={styles.totalStatNum}>{viewBuses.length}</Text>
                  <Text style={styles.totalStatLbl}>Total Fleet</Text>
                </View>
                <View style={styles.totalStatDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatNum, { color: '#16a34a' }]}>{totalFleetAvailableCount}</Text>
                  <Text style={styles.totalStatLbl}>Available</Text>
                </View>
                <View style={styles.totalStatDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatNum, { color: '#7c3aed' }]}>{totalFleetOnRouteCount}</Text>
                  <Text style={styles.totalStatLbl}>On Route</Text>
                </View>
                <View style={styles.totalStatDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatNum, { color: '#dc2626' }]}>{totalFleetLockedCount}</Text>
                  <Text style={styles.totalStatLbl}>Locked</Text>
                </View>
              </View>

              {/* Status Filters with Real-Time Counts */}
              <View style={styles.filterPillsRow}>
                {[
                  { key: 'all', label: `All (${viewBuses.length})` },
                  { key: 'available', label: `🟢 Available (${totalFleetAvailableCount})` },
                  { key: 'allocated', label: `🟣 On Route (${totalFleetOnRouteCount})` },
                  { key: 'locked', label: `🔒 Locked (${totalFleetLockedCount})` },
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

              {/* Search */}
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search all ${viewBuses.length} buses (${adminDepotFilter === 'all' ? 'Depot 1 & 2' : 'Depot ' + adminDepotFilter})...`}
                  placeholderTextColor="#94a3b8"
                  value={totalSearch}
                  onChangeText={setTotalSearch}
                />
              </View>

              {filteredTotalList.map((bus) => {
                const isAlloc = allAllocatedDuties.some((d) => d.bm === bus.bmNumber);
                const statusColor = isAlloc ? '#6d28d9' : bus.status === 'Available' ? '#15803d' : '#b45309';
                return (
                  <View key={bus.bmNumber} style={styles.totalCard}>
                    <View style={styles.cardHeaderRowTop}>
                      <View style={styles.cardHeaderLeftWrap}>
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
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── PROFILE TAB ── */}
        {activeAdminTab === 'PROFILE' && (
          <View style={styles.profileTabContainer}>
            <SubScreenHeader
              title="Admin Profile"
              subtitle="Master credentials & system preferences"
              onBack={() => setActiveAdminTab('HOME')}
              badge="Active"
            />
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatarCircle}>
                <Text style={styles.profileAvatarText}>AD</Text>
              </View>
              <Text style={styles.profileName}>{user?.email?.split('@')[0]?.toUpperCase() || 'ADMIN'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'admin@bmtc.gov.in'}</Text>
              <View style={styles.profileRoleBadge}>
                <Text style={styles.profileRoleBadgeText}>👑 Fleet Administrator</Text>
              </View>
            </View>

            {/* Login Details Card */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>🔐 Login Details</Text>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Email</Text>
                <Text style={styles.profileDetailValue}>{user?.email || 'admin@bmtc.gov.in'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Role</Text>
                <Text style={styles.profileDetailValue}>Master Fleet Administrator</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Depot Access</Text>
                <Text style={styles.profileDetailValue}>Depot 1 & Depot 2 (Enterprise)</Text>
              </View>
              <View style={[styles.profileDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.profileDetailLabel}>Session</Text>
                <View style={styles.profileSessionBadge}>
                  <View style={styles.profileSessionDot} />
                  <Text style={styles.profileSessionText}>Active</Text>
                </View>
              </View>
            </View>

            {/* Sign Out Card */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>⚙️ Account Actions</Text>
              <TouchableOpacity
                style={styles.profileSignOutBtn}
                onPress={() => {
                  Alert.alert('Sign Out', 'Sign out of the Admin Workspace?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.profileSignOutBtnText}>🚪  Sign Out</Text>
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
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Unlock All Buses',
                      'Are you sure you want to unlock all currently locked buses and return them to Available fleet?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Unlock All',
                          style: 'destructive',
                          onPress: async () => {
                            await unlockAllBuses();
                            Alert.alert('Success', 'All buses unlocked successfully!');
                          },
                        },
                      ]
                    );
                  }}
                  style={{
                    backgroundColor: '#fee2e2',
                    borderColor: '#fca5a5',
                    borderWidth: 1,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 12 }}>🔓 Unlock All</Text>
                </TouchableOpacity>
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
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#fee2e2',
                          borderColor: '#fca5a5',
                          borderWidth: 1,
                          paddingVertical: 5,
                          paddingHorizontal: 12,
                          borderRadius: 6,
                          alignSelf: 'flex-start',
                          marginTop: 6,
                        }}
                        onPress={() => {
                          const targetBm = item.bm || item.bmNumber;
                          Alert.alert(
                            `Unlock Bus ${targetBm}`,
                            `Unlock bus ${targetBm} and return it to Available fleet?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Unlock',
                                onPress: async () => {
                                  await unlockBus(targetBm);
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 11 }}>🔓 Unlock Bus</Text>
                      </TouchableOpacity>
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

      {/* ── MODAL 2B: RECENTLY COMPLETED BUSES NOTIFICATIONS MODAL ── */}
      <Modal
        visible={recentCompletedModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRecentCompletedModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: '#4361ee' }]}>ROUTE ARRIVAL & DISPATCH LOG</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.modalTitle}>🔔 Recently Completed Buses</Text>
                  <View style={[styles.lockedModalCountBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                    <Text style={[styles.lockedModalCountText, { color: '#15803d' }]}>
                      {turnaroundAllList.length} Completed
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  Real-time arrival telemetry of buses that finished assigned routes and safely returned to depot yard.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRecentCompletedModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
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
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
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
        </View>
      </Modal>

      {/* ── MODAL 3: ADD / DELETE BUSES MODAL (Exact 3-Tab Match with admin.html lines 2700-2870) ── */}
      <Modal visible={addDeleteModalOpen} transparent animationType="slide" onRequestClose={() => setAddDeleteModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: '#4f46e5' }]}>FLEET MANAGEMENT</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.modalTitle}>🚌 Add / Delete Buses</Text>
                  <View style={styles.newlyAddedBadge}>
                    <Text style={styles.newlyAddedBadgeText}>
                      {auditLogs.filter((a) => a.action === 'ADDED').length} Newly Added
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  Add new electric buses to the fleet or withdraw/delete buses from available service with mandatory reason tracking.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddDeleteModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Exact 3 Tabs from admin.html */}
            <View style={styles.addDelTabs}>
              <TouchableOpacity
                style={[styles.addDelTab, addDeleteTab === 'delete' && styles.addDelTabActive]}
                onPress={() => setAddDeleteTab('delete')}
              >
                <Text style={[styles.addDelTabText, addDeleteTab === 'delete' && styles.addDelTabTextActive]}>
                  🗑️ Delete Bus
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, addDeleteTab === 'add' && styles.addDelTabActive]}
                onPress={() => setAddDeleteTab('add')}
              >
                <Text style={[styles.addDelTabText, addDeleteTab === 'add' && styles.addDelTabTextActive]}>
                  ➕ Add Bus
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addDelTab, addDeleteTab === 'audit' && styles.addDelTabActive]}
                onPress={() => setAddDeleteTab('audit')}
              >
                <Text style={[styles.addDelTabText, addDeleteTab === 'audit' && styles.addDelTabTextActive]}>
                  📋 Fleet Audit Log
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {/* ── TAB 1: DELETE BUS (Remove from Fleet) ── */}
              {addDeleteTab === 'delete' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.deleteWarningBanner}>
                    <Text style={styles.deleteWarningText}>
                      <Text style={{ fontWeight: '800' }}>⚠️ Important: </Text>
                      Deleting a bus removes it from the available fleet across all scheduling, departure, charging, and cleaning operations.
                    </Text>
                  </View>

                  <Text style={styles.modalFieldLabel}>Search & Filter Active Buses</Text>
                  <View style={[styles.modalSearchRow, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Filter bus number or reg (e.g. BM001 or 4144)..."
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
                    Select Existing Active Bus <Text style={{ color: '#ef4444' }}>*</Text>
                    {delSelectedBm ? ` (Selected: ${delSelectedBm})` : ` (${filteredDelBuses.length} Active)`}
                  </Text>
                  <ScrollView style={styles.busSelectorBox} nestedScrollEnabled>
                    {filteredDelBuses.length === 0 ? (
                      <View style={{ padding: 14, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '700' }}>
                          No active bus matches "{delSearchQuery}".
                        </Text>
                      </View>
                    ) : (
                      filteredDelBuses.map((bus) => {
                        const isSelected = delSelectedBm.trim().toUpperCase() === bus.bmNumber.toUpperCase();
                        return (
                          <TouchableOpacity
                            key={bus.bmNumber}
                            style={[
                              styles.delBusOption,
                              isSelected && styles.delBusOptionActive,
                            ]}
                            onPress={() => handleSelectDelBus(bus.bmNumber)}
                          >
                            <Text style={[styles.delBusOptionText, isSelected && { color: '#dc2626', fontWeight: '800' }]}>
                              🚌 {bus.bmNumber} — {bus.regNo || `KA51AH${bus.bmNumber.replace(/\D/g, '').padStart(4, '0')}`} (Depot {bus.depot || '1'})
                            </Text>
                            {isSelected && (
                              <Text style={{ color: '#dc2626', fontWeight: '800' }}>✓ Selected</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  <Text style={styles.modalFieldLabel}>
                    Bus Number (e.g. BM001) <Text style={{ color: '#ef4444' }}>*</Text>
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
                        const resolvedDepot = String(matched.depot || '').includes('2') ? '2' : '1';
                        setDelDepot(resolvedDepot);
                      }
                    }}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>Bus Registration No. (e.g. KA51AH4144) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. KA51AH4144"
                    placeholderTextColor="#94a3b8"
                    value={delReg}
                    onChangeText={setDelReg}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>Operating Depot <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {[
                      { num: '1', label: 'Depot 1 — Chandapura (BMT-32)' },
                      { num: '2', label: 'Depot 2 — Central Depot' },
                    ].map((d) => (
                      <TouchableOpacity
                        key={d.num}
                        style={[styles.depotSelectBtn, delDepot === d.num && styles.depotSelectBtnActive]}
                        onPress={() => setDelDepot(d.num)}
                      >
                        <Text style={[styles.depotSelectBtnText, delDepot === d.num && styles.depotSelectBtnTextActive]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalFieldLabel}>Reason Category <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={styles.reasonWrap}>
                    {[
                      'Major Breakdown / Motor Defect',
                      'Battery Pack Degradation / Cell Failure',
                      'Severe Accident Damage',
                      'Periodic Heavy Maintenance / Overhaul',
                      'Transferred to Depot 18',
                      'Transferred to Central Workshop',
                      'Decommissioned from BMTC Service',
                      'Other',
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.reasonOption, delReasonSelect === cat && styles.reasonOptionActive]}
                        onPress={() => setDelReasonSelect(cat)}
                      >
                        <Text style={[styles.reasonOptionText, delReasonSelect === cat && styles.reasonOptionTextActive]}>
                          {delReasonSelect === cat ? '● ' : '○ '} {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalFieldLabel}>Detailed Reason for Deleting Bus <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                    placeholder="Explain why this bus is being removed from the fleet..."
                    placeholderTextColor="#94a3b8"
                    value={delReasonDetail}
                    onChangeText={setDelReasonDetail}
                    multiline
                  />

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitDel} onPress={handleSubmitDelete}>
                      <Text style={styles.btnSubmitDelText}>🗑️ Delete Bus from Available Fleet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── TAB 2: ADD BUS (New Induction) ── */}
              {addDeleteTab === 'add' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.addInfoBanner}>
                    <Text style={styles.addInfoText}>
                      <Text style={{ fontWeight: '800' }}>✨ Note: </Text>
                      Adding a new bus will register it in the available fleet and automatically mark it with a distinct ✨ Newly Added Bus badge across all system dashboards.
                    </Text>
                  </View>

                  <Text style={styles.modalFieldLabel}>Bus Number (e.g. BM001 or BM305) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. BM305"
                    placeholderTextColor="#94a3b8"
                    value={addBm}
                    onChangeText={setAddBm}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>Bus Registration No. (e.g. KA51AH4144) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. KA51AH4144"
                    placeholderTextColor="#94a3b8"
                    value={addReg}
                    onChangeText={setAddReg}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.modalFieldLabel}>Operating Depot <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    {[
                      { num: '1', label: 'Depot 1 — Chandapura' },
                      { num: '2', label: 'Depot 2 — Central Depot' },
                    ].map((d) => (
                      <TouchableOpacity
                        key={d.num}
                        style={[styles.depotSelectBtn, addDepot === d.num && styles.depotSelectBtnActive]}
                        onPress={() => setAddDepot(d.num)}
                      >
                        <Text style={[styles.depotSelectBtnText, addDepot === d.num && styles.depotSelectBtnTextActive]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalFieldLabel}>Fleet Range Category</Text>
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

                  <Text style={styles.modalFieldLabel}>Initial Battery SoC (%) <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="100"
                    placeholderTextColor="#94a3b8"
                    value={addSoc}
                    onChangeText={setAddSoc}
                    keyboardType="number-pad"
                  />

                  <Text style={styles.modalFieldLabel}>Reason Category <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <View style={styles.reasonWrap}>
                    {[
                      'New Electric Bus Induction (Ashok Leyland EiV12)',
                      'Fleet Expansion (Depot 32)',
                      'Re-inducted after Major Overhaul',
                      'Transferred from Depot 18',
                      'Replacement for Decommissioned Vehicle',
                      'Other',
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.reasonOption, addReasonSelect === cat && styles.reasonOptionActive]}
                        onPress={() => setAddReasonSelect(cat)}
                      >
                        <Text style={[styles.reasonOptionText, addReasonSelect === cat && styles.reasonOptionTextActive]}>
                          {addReasonSelect === cat ? '● ' : '○ '} {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalFieldLabel}>Detailed Reason for Adding Bus <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput
                    style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                    placeholder="Explain why this bus is being added to the fleet..."
                    placeholderTextColor="#94a3b8"
                    value={addReasonDetail}
                    onChangeText={setAddReasonDetail}
                    multiline
                  />

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity style={styles.btnModalCancel} onPress={() => setAddDeleteModalOpen(false)}>
                      <Text style={styles.btnModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmitAdd} onPress={handleSubmitAdd}>
                      <Text style={styles.btnSubmitAddText}>➕ Confirm & Add Bus to Fleet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── TAB 3: FLEET AUDIT LOG & CHANGES ── */}
              {addDeleteTab === 'audit' && (
                <View style={styles.tabContentBox}>
                  <View style={styles.auditLogHeaderStack}>
                    <Text style={styles.auditLogTitle}>📋 Fleet Modification Audit Trail</Text>
                    <Text style={styles.auditLogSub}>
                      Showing recorded inductions and decommissioning events synced with website.
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
                        <Text style={styles.btnHeaderDownloadText}>📥 Download CSV</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {auditLogs.map((entry) => {
                    const isAdded = entry.action === 'ADDED';
                    return (
                      <View key={entry.id} style={styles.auditCard}>
                        <View style={styles.rowBetween}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.auditPill, isAdded ? styles.auditPillAdd : styles.auditPillDel]}>
                              <Text style={[styles.auditPillText, isAdded ? { color: '#166534' } : { color: '#991b1b' }]}>
                                {isAdded ? '➕ INDUCTED' : '🗑️ REMOVED'}
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
                              <Text style={styles.restoreBusBtnText}>🔄 Restore Bus to Fleet</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Modal Footer with prominent Close button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalBtnCloseBottom}
                onPress={() => setAddDeleteModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCloseBottomText}>✕ Close Fleet Management</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: ROUTE ALLOCATED BUSES DIRECTORY MODAL (Exact Match with admin.html lines 2800-2845) ── */}
      <Modal
        visible={routeAllocatedModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRouteAllocatedModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '88%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
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
              <TouchableOpacity onPress={() => setRouteAllocatedModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Route Switcher & Search Bar */}
            <View style={styles.modalControlsBar}>
              <Text style={styles.modalControlLabel}>Select Route:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {ALL_ROUTES_DATA.map((r) => {
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
            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
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
        </View>
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
                  <Text style={styles.dutyMetricSub}>Fixed GTFS Corridor</Text>
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
        <TouchableOpacity style={styles.adminNavTab} onPress={() => setActiveAdminTab('HOME')} activeOpacity={0.8}>
          <View style={[styles.adminNavIconWrap, activeAdminTab === 'HOME' && styles.adminNavIconActive]}>
            <HomeNavIcon color={activeAdminTab === 'HOME' ? '#4361ee' : '#94a3b8'} size={21} active={activeAdminTab === 'HOME'} />
          </View>
          <Text style={[styles.adminNavLabel, activeAdminTab === 'HOME' && styles.adminNavLabelActive]}>Home</Text>
        </TouchableOpacity>

        {/* 2. Schedule */}
        <TouchableOpacity style={styles.adminNavTab} onPress={() => setActiveAdminTab('SCHEDULE')} activeOpacity={0.8}>
          <View style={[styles.adminNavIconWrap, activeAdminTab === 'SCHEDULE' && styles.adminNavIconActive]}>
            <CalendarIcon color={activeAdminTab === 'SCHEDULE' ? '#4361ee' : '#94a3b8'} size={20} />
          </View>
          <Text style={[styles.adminNavLabel, activeAdminTab === 'SCHEDULE' && styles.adminNavLabelActive]}>Schedule</Text>
        </TouchableOpacity>

        {/* 3. Center FAB (+) */}
        <TouchableOpacity style={styles.adminNavFab} onPress={() => setAddDeleteModalOpen(true)} activeOpacity={0.85}>
          <Text style={styles.adminNavFabIcon}>+</Text>
        </TouchableOpacity>

        {/* 4. Total fleet */}
        <TouchableOpacity style={styles.adminNavTab} onPress={() => setActiveAdminTab('TOTAL_FLEET')} activeOpacity={0.8}>
          <View style={[styles.adminNavIconWrap, activeAdminTab === 'TOTAL_FLEET' && styles.adminNavIconActive]}>
            <BusFrontIcon color={activeAdminTab === 'TOTAL_FLEET' ? '#4361ee' : '#94a3b8'} size={20} />
          </View>
          <Text style={[styles.adminNavLabel, activeAdminTab === 'TOTAL_FLEET' && styles.adminNavLabelActive]}>Total fleet</Text>
        </TouchableOpacity>

        {/* 5. Profile */}
        <TouchableOpacity style={styles.adminNavTab} onPress={() => setActiveAdminTab('PROFILE')} activeOpacity={0.8}>
          <View style={[styles.adminNavIconWrap, activeAdminTab === 'PROFILE' && styles.adminNavIconActive]}>
            <UserNavIcon color={activeAdminTab === 'PROFILE' ? '#4361ee' : '#94a3b8'} size={20} active={activeAdminTab === 'PROFILE'} />
          </View>
          <Text style={[styles.adminNavLabel, activeAdminTab === 'PROFILE' && styles.adminNavLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

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
    fontSize: 22,
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


});
