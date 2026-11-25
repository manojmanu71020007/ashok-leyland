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
  computeRouteEstimatedSoc,
  STATIC_BUS_CATEGORIES,
  STATIC_BUS_RANGES,
  getBusCategory,
  getBusRegNo,
  getBusDepot,
} from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageModal, { LanguagePickerPill } from '../components/LanguageModal';
import { getDepotDisplayName, getRoutesForDepot, getRouteDefinition, subscribeDepotChanges } from '../context/accounts';
import { getRouteFromDataset, subscribeDatasetChanges } from '../context/routeDataset';
import BatteryBar from '../components/BatteryBar';
import { exportCsvFile } from '../utils/exportCsv';
import { api } from '../api/client';

// ── DEPOT 1 ROUTES (Exact Match with Website scheduling.html) ──
const DEPOT_1_ROUTES = [
  {
    "code": "356Z",
    "depotId": "1",
    "name": "CPR \u2794 ANK (356Z)",
    "fullName": "CPR \u2794 ANK (356Z)",
    "shortName": "356Z",
    "origin": "CPR",
    "destination": "ANK",
    "via": "",
    "depotBase": "BMT-32",
    "distance": 112.0,
    "revenueKm": 112.0,
    "corridorDistance": 11.2,
    "fullDutyKm": 126.28,
    "actualKm": 126.28,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 24,
    "timeComplexity": "Normal",
    "timetables": [["06:00 AM", "06:15 AM", "01:45 PM", "02:00 PM", "02:25 PM", "02:35 PM"]],
    "timeComplexitySlots": {
      "07:15 AM": "Extreme Peak",
      "08:30 AM": "Extreme Peak",
      "01:10 PM": "Peak",
      "01:45 PM": "Peak",
      "02:00 PM": "Peak",
      "02:25 PM": "Peak",
      "02:35 PM": "Peak"
    },
    "schedules": [
      {
        "scheduleId": "356Z/1",
        "shift": "General Shift",
        "outTime": "07:15:00",
        "inTime": "15:15:00",
        "fixBm": "BM238",
        "swapBm": "BM278",
        "category": "Standard",
        "actualKm": 126.28,
        "singleChargeReqKm": 45
      },
      {
        "scheduleId": "356Z/2",
        "shift": "General Shift",
        "outTime": "08:30:00",
        "inTime": "16:30:00",
        "fixBm": "BM217",
        "swapBm": "BM256",
        "category": "Standard",
        "actualKm": 126.28,
        "singleChargeReqKm": 45
      },
      {
        "scheduleId": "356Z/3",
        "shift": "Shift B",
        "outTime": "13:10:00",
        "inTime": "21:10:00",
        "fixBm": "BM256",
        "swapBm": "BM205",
        "category": "Standard",
        "actualKm": 126.28,
        "singleChargeReqKm": 45
      },
      {
        "scheduleId": "356Z/4",
        "shift": "Shift B",
        "outTime": "14:20:00",
        "inTime": "22:20:00",
        "fixBm": "BM217",
        "swapBm": "BM238",
        "category": "Standard",
        "actualKm": 126.28,
        "singleChargeReqKm": 45
      },
      {
        "scheduleId": "356Z/6",
        "shift": "Shift B",
        "outTime": "14:00:00",
        "inTime": "21:40:00",
        "fixBm": "BM218",
        "swapBm": "BM303",
        "category": "Standard",
        "actualKm": 126.28,
        "singleChargeReqKm": 45
      },
      {
        "scheduleId": "356Z/7",
        "shift": "Shift B",
        "outTime": "13:45:00",
        "inTime": "21:35:00",
        "fixBm": "BM238",
        "swapBm": "BM278",
        "category": "Standard",
        "actualKm": 126.28,
        "singleChargeReqKm": 45
      }
    ]
  },
  {
    "code": "360K",
    "depotId": "1",
    "name": "ATB \u2794 KBS (360K)",
    "fullName": "ATB \u2794 KBS (360K)",
    "shortName": "360K",
    "origin": "ATB",
    "destination": "KBS",
    "via": "",
    "depotBase": "BMT-32",
    "distance": 71.6,
    "revenueKm": 71.6,
    "corridorDistance": 35.8,
    "fullDutyKm": 180.18,
    "actualKm": 180.18,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 28,
    "timeComplexity": "Peak",
    "timetables": [["06:00 AM", "06:10 AM", "06:20 AM", "06:30 AM", "06:40 AM", "06:55 AM", "07:05 AM", "07:15 AM", "07:25 AM", "07:35 AM", "07:45 AM", "07:55 AM", "08:05 AM", "02:05 PM", "02:15 PM", "02:25 PM", "02:35 PM", "02:45 PM"]],
    "timeComplexitySlots": {
      "07:00 AM": "Extreme Peak",
      "08:15 AM": "Extreme Peak",
      "09:55 AM": "Extreme Peak",
      "10:00 AM": "Peak",
      "12:05 PM": "Peak",
      "01:10 PM": "Peak",
      "02:05 PM": "Peak",
      "02:15 PM": "Peak",
      "02:25 PM": "Peak",
      "02:35 PM": "Peak",
      "02:45 PM": "Peak",
      "06:30 PM": "Extreme Peak"
    },
    "schedules": [
      {
        "scheduleId": "360K/10",
        "shift": "General Shift",
        "outTime": "07:00:00",
        "inTime": "15:00:00",
        "fixBm": "BM291",
        "swapBm": "BM264",
        "category": "Standard",
        "actualKm": 180.18,
        "singleChargeReqKm": 55
      },
      {
        "scheduleId": "360K/11",
        "shift": "General Shift",
        "outTime": "08:15:00",
        "inTime": "16:15:00",
        "fixBm": "BM205",
        "swapBm": "BM056",
        "category": "Standard",
        "actualKm": 180.18,
        "singleChargeReqKm": 55
      },
      {
        "scheduleId": "360K/12",
        "shift": "General Shift",
        "outTime": "09:55:00",
        "inTime": "17:55:00",
        "fixBm": "BM292",
        "swapBm": "BM198",
        "category": "Standard",
        "actualKm": 180.18,
        "singleChargeReqKm": 55
      },
      {
        "scheduleId": "360K/20",
        "shift": "General Shift",
        "outTime": "10:00:00",
        "inTime": "18:00:00",
        "fixBm": "BM199",
        "swapBm": "BM005",
        "category": "Standard",
        "actualKm": 180.18,
        "singleChargeReqKm": 55
      },
      {
        "scheduleId": "360K/5",
        "shift": "Night Halt",
        "outTime": "18:30:00",
        "inTime": "06:30:00",
        "fixBm": "BM282",
        "swapBm": "BM080",
        "category": "Standard",
        "actualKm": 180.18,
        "singleChargeReqKm": 55
      }
    ]
  },
  {
    "code": "600F",
    "depotId": "1",
    "name": "BSK \u2794 ATB (600F)",
    "fullName": "BSK \u2794 ATB (600F)",
    "shortName": "600F",
    "origin": "BSK",
    "destination": "ATB",
    "via": "CPR",
    "depotBase": "BMT-32",
    "distance": 86.4,
    "revenueKm": 86.4,
    "corridorDistance": 28.8,
    "fullDutyKm": 157.96,
    "actualKm": 157.96,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 25,
    "timeComplexity": "Peak",
    "timetables": [["06:05 AM", "06:15 AM", "06:25 AM", "07:25 AM", "07:35 AM", "07:45 AM", "07:55 AM", "08:05 AM", "08:15 AM", "08:25 AM", "08:35 AM", "08:45 AM", "08:55 AM", "12:30 PM", "12:40 PM", "12:50 PM", "01:00 PM", "01:10 PM", "01:15 PM", "01:25 PM", "01:35 PM", "01:45 PM", "01:55 PM", "02:05 PM", "02:15 PM", "02:15 PM", "02:25 PM", "02:30 PM", "02:35 PM", "02:40 PM", "02:45 PM", "02:55 PM", "03:35 PM", "03:45 PM", "03:55 PM", "04:05 PM", "04:15 PM", "04:25 PM"]],
    "timeComplexitySlots": {
      "06:05 AM": "Normal",
      "07:25 AM": "Extreme Peak",
      "09:35 AM": "Extreme Peak",
      "11:20 AM": "Peak",
      "12:30 PM": "Peak",
      "12:40 PM": "Peak",
      "12:50 PM": "Peak",
      "01:00 PM": "Peak",
      "01:10 PM": "Peak",
      "01:15 PM": "Peak",
      "01:25 PM": "Peak",
      "01:35 PM": "Peak",
      "01:45 PM": "Peak",
      "02:05 PM": "Peak",
      "02:35 PM": "Peak",
      "03:45 PM": "Peak"
    },
    "schedules": [
      {
        "scheduleId": "600F/16",
        "shift": "General Shift",
        "outTime": "06:05:00",
        "inTime": "14:05:00",
        "fixBm": "BM228",
        "swapBm": "BM009",
        "category": "Standard",
        "actualKm": 157.96,
        "singleChargeReqKm": 100.6
      },
      {
        "scheduleId": "600F/17",
        "shift": "General Shift",
        "outTime": "07:25:00",
        "inTime": "15:25:00",
        "fixBm": "BM057",
        "swapBm": "BM216",
        "category": "Standard",
        "actualKm": 157.96,
        "singleChargeReqKm": 100.6
      },
      {
        "scheduleId": "600F/21",
        "shift": "General Shift",
        "outTime": "09:35:00",
        "inTime": "17:35:00",
        "fixBm": "BM101",
        "swapBm": "BM218",
        "category": "Standard",
        "actualKm": 157.96,
        "singleChargeReqKm": 100.6
      },
      {
        "scheduleId": "600F/26",
        "shift": "General Shift",
        "outTime": "12:30:00",
        "inTime": "20:30:00",
        "fixBm": "BM009",
        "swapBm": "BM228",
        "category": "Standard",
        "actualKm": 157.96,
        "singleChargeReqKm": 100.6
      },
      {
        "scheduleId": "600F/3",
        "shift": "General Shift",
        "outTime": "13:10:00",
        "inTime": "21:10:00",
        "fixBm": "BM216",
        "swapBm": "BM057",
        "category": "Standard",
        "actualKm": 157.96,
        "singleChargeReqKm": 100.6
      }
    ]
  },
  {
    "code": "KBS3A",
    "depotId": "1",
    "name": "ATB \u2794 KBS (KBS3A)",
    "fullName": "ATB \u2794 KBS (KBS3A)",
    "shortName": "KBS3A",
    "origin": "ATB",
    "destination": "KBS",
    "via": "",
    "depotBase": "BMT-32",
    "distance": 140.8,
    "revenueKm": 140.8,
    "corridorDistance": 35.2,
    "fullDutyKm": 127.49,
    "actualKm": 127.49,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 26,
    "timeComplexity": "Moderate",
    "timetables": [["06:35 AM", "06:45 AM", "06:55 AM", "07:05 AM", "07:15 AM", "07:25 AM", "07:35 AM", "07:45 AM", "08:15 AM", "08:45 AM", "08:55 AM", "01:35 PM", "01:45 PM", "01:55 PM", "02:05 PM", "02:15 PM", "02:25 PM", "02:35 PM", "02:45 PM", "02:55 PM", "03:05 PM"]],
    "timeComplexitySlots": {
      "06:35 AM": "Normal",
      "07:10 AM": "Extreme Peak",
      "09:00 AM": "Extreme Peak",
      "10:10 AM": "Peak",
      "12:15 PM": "Peak",
      "01:10 PM": "Peak",
      "01:35 PM": "Peak",
      "02:05 PM": "Peak",
      "02:35 PM": "Peak",
      "03:05 PM": "Peak"
    },
    "schedules": [
      {
        "scheduleId": "KBS3A/32",
        "shift": "General Shift",
        "outTime": "06:35:00",
        "inTime": "17:20:00",
        "fixBm": "BM233",
        "swapBm": "BM292",
        "category": "Standard",
        "actualKm": 127.49,
        "singleChargeReqKm": 45.5
      },
      {
        "scheduleId": "KBS3A/34",
        "shift": "General Shift",
        "outTime": "06:45:00",
        "inTime": "17:30:00",
        "fixBm": "BM292",
        "swapBm": "BM233",
        "category": "Standard",
        "actualKm": 127.49,
        "singleChargeReqKm": 45.5
      },
      {
        "scheduleId": "KBS3A/2",
        "shift": "Night Halt",
        "outTime": "13:35:00",
        "inTime": "20:45:00",
        "fixBm": "BM222",
        "swapBm": "BM233",
        "category": "Standard",
        "actualKm": 127.49,
        "singleChargeReqKm": 45.5
      }
    ]
  }
];

const DEPOT_2_ROUTES = [
  {
    "code": "361C",
    "depotId": "2",
    "name": "ANK \u2794 KMT (361C)",
    "fullName": "ANK \u2794 KMT (361C)",
    "shortName": "361C",
    "origin": "ANK",
    "destination": "KMT",
    "via": "",
    "depotBase": "BMT-32",
    "distance": 253.8,
    "revenueKm": 253.8,
    "corridorDistance": 38.0,
    "fullDutyKm": 141.79,
    "actualKm": 141.79,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 28,
    "timeComplexity": "Peak",
    "timetables": [["01:10 PM", "01:30 PM", "01:50 PM", "02:10 PM", "02:30 PM", "02:50 PM", "03:10 PM", "03:30 PM", "03:50 PM"]],
    "timeComplexitySlots": {
      "01:10 PM": "Peak",
      "01:30 PM": "Peak",
      "01:50 PM": "Peak",
      "02:10 PM": "Peak",
      "02:30 PM": "Peak",
      "02:50 PM": "Peak",
      "03:10 PM": "Peak",
      "03:30 PM": "Peak",
      "03:50 PM": "Peak"
    },
    "schedules": [
      {
        "scheduleId": "361C/1",
        "shift": "Night Halt",
        "outTime": "13:10:00",
        "inTime": "12:00:00",
        "fixBm": "BM288",
        "swapBm": "BM101",
        "category": "Standard",
        "actualKm": 141.79,
        "singleChargeReqKm": 65
      },
      {
        "scheduleId": "361C/6",
        "shift": "Night Halt",
        "outTime": "14:50:00",
        "inTime": "13:20:00",
        "fixBm": "BM101",
        "swapBm": "BM288",
        "category": "Standard",
        "actualKm": 141.79,
        "singleChargeReqKm": 65
      },
      {
        "scheduleId": "361C/11",
        "shift": "Night Halt",
        "outTime": "14:30:00",
        "inTime": "13:00:00",
        "fixBm": "BM288",
        "swapBm": "BM101",
        "category": "Standard",
        "actualKm": 141.79,
        "singleChargeReqKm": 65
      }
    ]
  },
  {
    "code": "399C",
    "depotId": "2",
    "name": "CTP \u2794 ANK (399C)",
    "fullName": "CTP \u2794 ANK (399C)",
    "shortName": "399C",
    "origin": "CTP",
    "destination": "ANK",
    "via": "",
    "depotBase": "BMT-32",
    "distance": 143.0,
    "revenueKm": 143.0,
    "corridorDistance": 34.5,
    "fullDutyKm": 146.03,
    "actualKm": 146.03,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 26,
    "timeComplexity": "Peak",
    "timetables": [["01:15 PM", "02:00 PM", "02:40 PM", "03:35 PM"]],
    "timeComplexitySlots": {
      "01:15 PM": "Peak",
      "02:00 PM": "Peak",
      "02:40 PM": "Peak",
      "03:35 PM": "Peak"
    },
    "schedules": [
      {
        "scheduleId": "399C/3",
        "shift": "Night Halt",
        "outTime": "13:15:00",
        "inTime": "11:10:00",
        "fixBm": "BM198",
        "swapBm": "BM291",
        "category": "Standard",
        "actualKm": 146.03,
        "singleChargeReqKm": 65
      },
      {
        "scheduleId": "399C/4",
        "shift": "Night Halt",
        "outTime": "14:00:00",
        "inTime": "12:25:00",
        "fixBm": "BM291",
        "swapBm": "BM198",
        "category": "Standard",
        "actualKm": 146.03,
        "singleChargeReqKm": 65
      },
      {
        "scheduleId": "399C/5",
        "shift": "Night Halt",
        "outTime": "14:40:00",
        "inTime": "13:15:00",
        "fixBm": "BM198",
        "swapBm": "BM291",
        "category": "Standard",
        "actualKm": 146.03,
        "singleChargeReqKm": 65
      }
    ]
  },
  {
    "code": "328H",
    "depotId": "2",
    "name": "ATB \u2794 HSK (328H)",
    "fullName": "ATB \u2794 HSK (328H)",
    "shortName": "328H",
    "origin": "ATB",
    "destination": "HSK",
    "via": "",
    "depotBase": "BMT-32",
    "distance": 269.4,
    "revenueKm": 269.4,
    "corridorDistance": 40.0,
    "fullDutyKm": 159.5,
    "actualKm": 159.5,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 30,
    "timeComplexity": "Peak",
    "timetables": [["01:00 PM", "01:10 PM", "01:20 PM", "01:20 PM", "01:30 PM", "01:45 PM", "01:50 PM", "02:00 PM", "02:00 PM", "02:10 PM", "02:15 PM", "02:30 PM", "02:45 PM", "03:00 PM", "03:10 PM", "03:20 PM", "03:30 PM", "03:40 PM", "03:50 PM", "04:00 PM"]],
    "timeComplexitySlots": {
      "01:00 PM": "Peak",
      "01:10 PM": "Peak",
      "01:20 PM": "Peak",
      "01:30 PM": "Peak",
      "01:45 PM": "Peak",
      "01:50 PM": "Peak",
      "02:00 PM": "Peak",
      "02:10 PM": "Peak",
      "02:15 PM": "Peak",
      "02:30 PM": "Peak",
      "02:45 PM": "Peak",
      "03:00 PM": "Peak"
    },
    "schedules": [
      {
        "scheduleId": "328H/1",
        "shift": "Night Halt",
        "outTime": "13:10:00",
        "inTime": "20:45:00",
        "fixBm": "BM279",
        "swapBm": "BM294",
        "category": "Standard",
        "actualKm": 159.5,
        "singleChargeReqKm": 60
      },
      {
        "scheduleId": "328H/2",
        "shift": "Night Halt",
        "outTime": "13:00:00",
        "inTime": "10:45:00",
        "fixBm": "BM294",
        "swapBm": "BM279",
        "category": "Standard",
        "actualKm": 159.5,
        "singleChargeReqKm": 60
      },
      {
        "scheduleId": "328H/10",
        "shift": "Night Halt",
        "outTime": "13:45:00",
        "inTime": "11:30:00",
        "fixBm": "BM279",
        "swapBm": "BM294",
        "category": "Standard",
        "actualKm": 159.5,
        "singleChargeReqKm": 60
      }
    ]
  },
  {
    "code": "500DC",
    "depotId": "2",
    "name": "HBL \u2794 TNF (500DC)",
    "fullName": "HBL \u2794 TNF (500DC)",
    "shortName": "500DC",
    "origin": "HBL",
    "destination": "TNF",
    "via": "CSB",
    "depotBase": "BMT-32",
    "distance": 86.1,
    "revenueKm": 86.1,
    "corridorDistance": 49.1,
    "fullDutyKm": 188.54,
    "actualKm": 188.54,
    "chargingOcc": 1,
    "noChargingOcc": 1,
    "splitDuty": true,
    "singleChargeReqKm": 91.9,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 28,
    "timeComplexity": "Peak",
    "timetables": [["07:45 AM", "08:00 AM", "08:15 AM", "08:30 AM"]],
    "timeComplexitySlots": {
      "07:45 AM": "Extreme Peak",
      "08:00 AM": "Extreme Peak",
      "08:15 AM": "Extreme Peak",
      "08:30 AM": "Extreme Peak",
      "10:55 AM": "Peak",
      "11:10 AM": "Peak",
      "11:25 AM": "Peak",
      "11:40 AM": "Peak",
      "01:10 PM": "Peak",
      "02:15 PM": "Peak",
      "03:45 PM": "Peak"
    },
    "schedules": [
      {
        "scheduleId": "500DC/12",
        "shift": "General Shift",
        "outTime": "07:45:00",
        "inTime": "14:45:00",
        "fixBm": "BM240",
        "swapBm": "BM255",
        "category": "Standard",
        "actualKm": 188.54,
        "singleChargeReqKm": 116.5,
        "chargingOcc": 1,
        "noChargingOcc": 1,
        "splitDuty": true
      },
      {
        "scheduleId": "500DC/13",
        "shift": "General Shift",
        "outTime": "08:00:00",
        "inTime": "15:00:00",
        "fixBm": "BM255",
        "swapBm": "BM274",
        "category": "Standard",
        "actualKm": 188.54,
        "singleChargeReqKm": 116.5,
        "chargingOcc": 1,
        "noChargingOcc": 1,
        "splitDuty": true
      },
      {
        "scheduleId": "500DC/14",
        "shift": "General Shift",
        "outTime": "08:15:00",
        "inTime": "15:15:00",
        "fixBm": "BM274",
        "swapBm": "BM240",
        "category": "Standard",
        "actualKm": 188.54,
        "singleChargeReqKm": 91.9,
        "chargingOcc": 1,
        "noChargingOcc": 1,
        "splitDuty": true
      },
      {
        "scheduleId": "500DC/15",
        "shift": "General Shift",
        "outTime": "08:30:00",
        "inTime": "15:30:00",
        "fixBm": "BM240",
        "swapBm": "BM274",
        "category": "Standard",
        "actualKm": 188.54,
        "singleChargeReqKm": 91.9,
        "chargingOcc": 1,
        "noChargingOcc": 1,
        "splitDuty": true
      },
      {
        "scheduleId": "500DC/1",
        "shift": "Shift B",
        "outTime": "13:10:00",
        "inTime": "21:10:00",
        "fixBm": "BM255",
        "swapBm": "BM240",
        "category": "Standard",
        "actualKm": 188.54,
        "singleChargeReqKm": 91.9,
        "chargingOcc": 1,
        "noChargingOcc": 1,
        "splitDuty": true
      }
    ]
  },
  {
    "code": "KBS3F",
    "depotId": "2",
    "name": "ATB \u2794 KBS (KBS3F)",
    "fullName": "ATB \u2794 KBS (KBS3F)",
    "shortName": "KBS3F",
    "aliases": [
      "KBES3F",
      "KBS-3F",
      "KBES-3F"
    ],
    "origin": "ATB",
    "destination": "KBS",
    "via": "",
    "depotBase": "BMT-32",
    "distance": 128.4,
    "revenueKm": 128.4,
    "corridorDistance": 35.2,
    "fullDutyKm": 209.88,
    "actualKm": 209.88,
    "routeComplexity": "Standard",
    "category": "Standard",
    "requiredCat": "B",
    "drainSoc": 22,
    "timeComplexity": "Normal",
    "timetables": [["07:30 AM", "07:50 AM", "08:10 AM", "08:30 AM", "08:50 AM", "09:10 AM", "01:50 PM", "02:10 PM", "03:45 PM", "04:00 PM"]],
    "timeComplexitySlots": {
      "07:15 AM": "Extreme Peak",
      "08:45 AM": "Extreme Peak",
      "09:45 AM": "Extreme Peak",
      "10:05 AM": "Peak",
      "10:10 AM": "Peak",
      "10:20 AM": "Peak",
      "01:10 PM": "Peak",
      "01:50 PM": "Peak",
      "02:10 PM": "Peak",
      "02:30 PM": "Peak",
      "03:45 PM": "Peak"
    },
    "schedules": [
      {
        "scheduleId": "KBS3F/11",
        "shift": "General Shift",
        "outTime": "07:15:00",
        "inTime": "15:15:00",
        "fixBm": "BM293",
        "swapBm": "BM250",
        "category": "Standard",
        "actualKm": 209.88,
        "singleChargeReqKm": 35
      },
      {
        "scheduleId": "KBS3F/12",
        "shift": "General Shift",
        "outTime": "08:45:00",
        "inTime": "16:45:00",
        "fixBm": "BM250",
        "swapBm": "BM275",
        "category": "Standard",
        "actualKm": 209.88,
        "singleChargeReqKm": 35
      },
      {
        "scheduleId": "KBS3F/13",
        "shift": "General Shift",
        "outTime": "09:45:00",
        "inTime": "17:45:00",
        "fixBm": "BM293",
        "swapBm": "BM082",
        "category": "Standard",
        "actualKm": 209.88,
        "singleChargeReqKm": 35
      },
      {
        "scheduleId": "KBS3F/14",
        "shift": "General Shift",
        "outTime": "10:05:00",
        "inTime": "18:05:00",
        "fixBm": "BM275",
        "swapBm": "BM293",
        "category": "Standard",
        "actualKm": 209.88,
        "singleChargeReqKm": 35
      }
    ]
  }
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
  {
    "scheduleId": "356Z/7",
    "route": "356Z",
    "shift": "Shift A",
    "outTime": "06:00 AM",
    "departureTime": "06:00 AM",
    "inTime": "01:00 PM",
    "totalGroupDistance": 114.8,
    "distance": 114.8,
    "actualKm": 114.8,
    "singleChargeReqKm": 114.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "356Z/6",
    "route": "356Z",
    "shift": "Shift A",
    "outTime": "06:15 AM",
    "departureTime": "06:15 AM",
    "inTime": "01:15 PM",
    "totalGroupDistance": 114.8,
    "distance": 114.8,
    "actualKm": 114.8,
    "singleChargeReqKm": 114.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "356Z/7",
    "route": "356Z",
    "shift": "Shift B",
    "outTime": "01:45 PM",
    "departureTime": "01:45 PM",
    "inTime": "09:35 PM",
    "totalGroupDistance": 137.2,
    "distance": 137.2,
    "actualKm": 137.2,
    "singleChargeReqKm": 137.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "356Z/6",
    "route": "356Z",
    "shift": "Shift B",
    "outTime": "02:00 PM",
    "departureTime": "02:00 PM",
    "inTime": "09:40 PM",
    "totalGroupDistance": 137.2,
    "distance": 137.2,
    "actualKm": 137.2,
    "singleChargeReqKm": 137.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "356Z/3",
    "route": "356Z",
    "shift": "Night Hault",
    "outTime": "02:25 PM",
    "departureTime": "02:25 PM",
    "inTime": "12:10 PM",
    "totalGroupDistance": 252.0,
    "distance": 252.0,
    "actualKm": 252.0,
    "singleChargeReqKm": 252.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "356Z/8",
    "route": "356Z",
    "shift": "Night Hault",
    "outTime": "02:35 PM",
    "departureTime": "02:35 PM",
    "inTime": "12:20 PM",
    "totalGroupDistance": 252.0,
    "distance": 252.0,
    "actualKm": 252.0,
    "singleChargeReqKm": 252.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/3",
    "route": "360K",
    "shift": "Shift A",
    "outTime": "06:00 AM",
    "departureTime": "06:00 AM",
    "inTime": "01:20 PM",
    "totalGroupDistance": 133.6,
    "distance": 133.6,
    "actualKm": 133.6,
    "singleChargeReqKm": 133.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/4",
    "route": "360K",
    "shift": "Shift A",
    "outTime": "06:10 AM",
    "departureTime": "06:10 AM",
    "inTime": "01:30 PM",
    "totalGroupDistance": 133.6,
    "distance": 133.6,
    "actualKm": 133.6,
    "singleChargeReqKm": 133.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/15",
    "route": "360K",
    "shift": "Shift A",
    "outTime": "06:20 AM",
    "departureTime": "06:20 AM",
    "inTime": "01:40 PM",
    "totalGroupDistance": 133.6,
    "distance": 133.6,
    "actualKm": 133.6,
    "singleChargeReqKm": 133.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/30",
    "route": "360K",
    "shift": "Shift A",
    "outTime": "06:30 AM",
    "departureTime": "06:30 AM",
    "inTime": "01:50 PM",
    "totalGroupDistance": 133.6,
    "distance": 133.6,
    "actualKm": 133.6,
    "singleChargeReqKm": 133.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/38",
    "route": "360K",
    "shift": "Shift A",
    "outTime": "06:40 AM",
    "departureTime": "06:40 AM",
    "inTime": "02:00 PM",
    "totalGroupDistance": 133.6,
    "distance": 133.6,
    "actualKm": 133.6,
    "singleChargeReqKm": 133.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/11",
    "route": "360K",
    "shift": "General",
    "outTime": "06:55 AM",
    "departureTime": "06:55 AM",
    "inTime": "05:40 PM",
    "totalGroupDistance": 163.8,
    "distance": 163.8,
    "actualKm": 163.8,
    "singleChargeReqKm": 163.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/12",
    "route": "360K",
    "shift": "General",
    "outTime": "07:05 AM",
    "departureTime": "07:05 AM",
    "inTime": "05:50 PM",
    "totalGroupDistance": 163.8,
    "distance": 163.8,
    "actualKm": 163.8,
    "singleChargeReqKm": 163.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/5",
    "route": "360K",
    "shift": "General",
    "outTime": "07:15 AM",
    "departureTime": "07:15 AM",
    "inTime": "06:00 PM",
    "totalGroupDistance": 163.8,
    "distance": 163.8,
    "actualKm": 163.8,
    "singleChargeReqKm": 163.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/10",
    "route": "360K",
    "shift": "General",
    "outTime": "07:25 AM",
    "departureTime": "07:25 AM",
    "inTime": "06:10 PM",
    "totalGroupDistance": 163.8,
    "distance": 163.8,
    "actualKm": 163.8,
    "singleChargeReqKm": 163.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/20",
    "route": "360K",
    "shift": "General",
    "outTime": "07:35 AM",
    "departureTime": "07:35 AM",
    "inTime": "06:20 PM",
    "totalGroupDistance": 163.8,
    "distance": 163.8,
    "actualKm": 163.8,
    "singleChargeReqKm": 163.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/26",
    "route": "360K",
    "shift": "General",
    "outTime": "07:45 AM",
    "departureTime": "07:45 AM",
    "inTime": "06:30 PM",
    "totalGroupDistance": 163.8,
    "distance": 163.8,
    "actualKm": 163.8,
    "singleChargeReqKm": 163.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/33",
    "route": "360K",
    "shift": "General",
    "outTime": "07:55 AM",
    "departureTime": "07:55 AM",
    "inTime": "06:40 PM",
    "totalGroupDistance": 163.8,
    "distance": 163.8,
    "actualKm": 163.8,
    "singleChargeReqKm": 163.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/34",
    "route": "360K",
    "shift": "General",
    "outTime": "08:05 AM",
    "departureTime": "08:05 AM",
    "inTime": "06:50 PM",
    "totalGroupDistance": 163.8,
    "distance": 163.8,
    "actualKm": 163.8,
    "singleChargeReqKm": 163.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/3",
    "route": "360K",
    "shift": "Shift B",
    "outTime": "02:05 PM",
    "departureTime": "02:05 PM",
    "inTime": "09:20 PM",
    "totalGroupDistance": 120.0,
    "distance": 120.0,
    "actualKm": 120.0,
    "singleChargeReqKm": 120.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/4",
    "route": "360K",
    "shift": "Shift B",
    "outTime": "02:15 PM",
    "departureTime": "02:15 PM",
    "inTime": "09:30 PM",
    "totalGroupDistance": 120.0,
    "distance": 120.0,
    "actualKm": 120.0,
    "singleChargeReqKm": 120.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/15",
    "route": "360K",
    "shift": "Shift B",
    "outTime": "02:25 PM",
    "departureTime": "02:25 PM",
    "inTime": "09:40 PM",
    "totalGroupDistance": 120.0,
    "distance": 120.0,
    "actualKm": 120.0,
    "singleChargeReqKm": 120.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360K/30",
    "route": "360K",
    "shift": "Shift B",
    "outTime": "02:35 PM",
    "departureTime": "02:35 PM",
    "inTime": "09:50 PM",
    "totalGroupDistance": 120.0,
    "distance": 120.0,
    "actualKm": 120.0,
    "singleChargeReqKm": 120.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "360k/38",
    "route": "360K",
    "shift": "Shift B",
    "outTime": "02:45 PM",
    "departureTime": "02:45 PM",
    "inTime": "10:00 PM",
    "totalGroupDistance": 120.0,
    "distance": 120.0,
    "actualKm": 120.0,
    "singleChargeReqKm": 120.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/80",
    "route": "600F",
    "shift": "Shift A",
    "outTime": "06:05 AM",
    "departureTime": "06:05 AM",
    "inTime": "01:35 PM",
    "totalGroupDistance": 119.2,
    "distance": 119.2,
    "actualKm": 119.2,
    "singleChargeReqKm": 119.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/53",
    "route": "600F",
    "shift": "Shift A",
    "outTime": "06:15 AM",
    "departureTime": "06:15 AM",
    "inTime": "01:45 PM",
    "totalGroupDistance": 119.2,
    "distance": 119.2,
    "actualKm": 119.2,
    "singleChargeReqKm": 119.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/66",
    "route": "600F",
    "shift": "Shift A",
    "outTime": "06:25 AM",
    "departureTime": "06:25 AM",
    "inTime": "01:55 PM",
    "totalGroupDistance": 119.2,
    "distance": 119.2,
    "actualKm": 119.2,
    "singleChargeReqKm": 119.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/21",
    "route": "600F",
    "shift": "General",
    "outTime": "07:25 AM",
    "departureTime": "07:25 AM",
    "inTime": "06:10 PM",
    "totalGroupDistance": 143.6,
    "distance": 143.6,
    "actualKm": 143.6,
    "singleChargeReqKm": 143.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/16",
    "route": "600F",
    "shift": "General",
    "outTime": "07:35 AM",
    "departureTime": "07:35 AM",
    "inTime": "06:20 PM",
    "totalGroupDistance": 143.6,
    "distance": 143.6,
    "actualKm": 143.6,
    "singleChargeReqKm": 143.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/17",
    "route": "600F",
    "shift": "General",
    "outTime": "07:45 AM",
    "departureTime": "07:45 AM",
    "inTime": "06:30 PM",
    "totalGroupDistance": 143.6,
    "distance": 143.6,
    "actualKm": 143.6,
    "singleChargeReqKm": 143.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/26",
    "route": "600F",
    "shift": "General",
    "outTime": "07:55 AM",
    "departureTime": "07:55 AM",
    "inTime": "06:40 PM",
    "totalGroupDistance": 143.6,
    "distance": 143.6,
    "actualKm": 143.6,
    "singleChargeReqKm": 143.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/27",
    "route": "600F",
    "shift": "General",
    "outTime": "08:05 AM",
    "departureTime": "08:05 AM",
    "inTime": "06:50 PM",
    "totalGroupDistance": 143.6,
    "distance": 143.6,
    "actualKm": 143.6,
    "singleChargeReqKm": 143.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/3",
    "route": "600F",
    "shift": "General",
    "outTime": "08:15 AM",
    "departureTime": "08:15 AM",
    "inTime": "07:00 PM",
    "totalGroupDistance": 143.6,
    "distance": 143.6,
    "actualKm": 143.6,
    "singleChargeReqKm": 143.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/31",
    "route": "600F",
    "shift": "General",
    "outTime": "08:25 AM",
    "departureTime": "08:25 AM",
    "inTime": "07:10 PM",
    "totalGroupDistance": 151.6,
    "distance": 151.6,
    "actualKm": 151.6,
    "singleChargeReqKm": 151.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/42",
    "route": "600F",
    "shift": "General",
    "outTime": "08:35 AM",
    "departureTime": "08:35 AM",
    "inTime": "07:20 PM",
    "totalGroupDistance": 373.6,
    "distance": 373.6,
    "actualKm": 373.6,
    "singleChargeReqKm": 373.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/43",
    "route": "600F",
    "shift": "General",
    "outTime": "08:45 AM",
    "departureTime": "08:45 AM",
    "inTime": "07:30 PM",
    "totalGroupDistance": 143.6,
    "distance": 143.6,
    "actualKm": 143.6,
    "singleChargeReqKm": 143.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/45",
    "route": "600F",
    "shift": "General",
    "outTime": "08:55 AM",
    "departureTime": "08:55 AM",
    "inTime": "07:40 PM",
    "totalGroupDistance": 143.6,
    "distance": 143.6,
    "actualKm": 143.6,
    "singleChargeReqKm": 143.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/91",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "12:30 PM",
    "departureTime": "12:30 PM",
    "inTime": "10:45 AM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/92",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "12:40 PM",
    "departureTime": "12:40 PM",
    "inTime": "10:55 AM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/93",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "12:50 PM",
    "departureTime": "12:50 PM",
    "inTime": "11:05 AM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/94",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "01:00 PM",
    "departureTime": "01:00 PM",
    "inTime": "11:15 AM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/95",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "01:10 PM",
    "departureTime": "01:10 PM",
    "inTime": "11:25 AM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/52",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "01:15 PM",
    "departureTime": "01:15 PM",
    "inTime": "11:45 AM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/57",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "01:25 PM",
    "departureTime": "01:25 PM",
    "inTime": "11:55 AM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/49",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "01:35 PM",
    "departureTime": "01:35 PM",
    "inTime": "12:05 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/51",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "01:45 PM",
    "departureTime": "01:45 PM",
    "inTime": "12:15 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/5",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "01:55 PM",
    "departureTime": "01:55 PM",
    "inTime": "12:25 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/6",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "02:05 PM",
    "departureTime": "02:05 PM",
    "inTime": "12:35 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/80",
    "route": "600F",
    "shift": "Shift B",
    "outTime": "02:15 PM",
    "departureTime": "02:15 PM",
    "inTime": "09:30 PM",
    "totalGroupDistance": 119.2,
    "distance": 119.2,
    "actualKm": 119.2,
    "singleChargeReqKm": 119.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/72",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "02:15 PM",
    "departureTime": "02:15 PM",
    "inTime": "12:45 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/8",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "02:25 PM",
    "departureTime": "02:25 PM",
    "inTime": "12:55 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/53",
    "route": "600F",
    "shift": "Shift B",
    "outTime": "02:30 PM",
    "departureTime": "02:30 PM",
    "inTime": "09:45 PM",
    "totalGroupDistance": 119.2,
    "distance": 119.2,
    "actualKm": 119.2,
    "singleChargeReqKm": 119.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/74",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "02:35 PM",
    "departureTime": "02:35 PM",
    "inTime": "01:05 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/66",
    "route": "600F",
    "shift": "Shift B",
    "outTime": "02:40 PM",
    "departureTime": "02:40 PM",
    "inTime": "09:45 PM",
    "totalGroupDistance": 119.2,
    "distance": 119.2,
    "actualKm": 119.2,
    "singleChargeReqKm": 119.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/75",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "02:45 PM",
    "departureTime": "02:45 PM",
    "inTime": "01:15 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/79",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "02:55 PM",
    "departureTime": "02:55 PM",
    "inTime": "01:25 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/67",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "03:35 PM",
    "departureTime": "03:35 PM",
    "inTime": "02:05 PM",
    "totalGroupDistance": 215.9,
    "distance": 215.9,
    "actualKm": 215.9,
    "singleChargeReqKm": 215.9,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/68",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "03:45 PM",
    "departureTime": "03:45 PM",
    "inTime": "02:15 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/69",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "03:55 PM",
    "departureTime": "03:55 PM",
    "inTime": "02:25 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/78",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "04:05 PM",
    "departureTime": "04:05 PM",
    "inTime": "02:35 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/81",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "04:15 PM",
    "departureTime": "04:15 PM",
    "inTime": "02:45 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "600F/32",
    "route": "600F",
    "shift": "Night Hault",
    "outTime": "04:25 PM",
    "departureTime": "04:25 PM",
    "inTime": "02:55 PM",
    "totalGroupDistance": 238.4,
    "distance": 238.4,
    "actualKm": 238.4,
    "singleChargeReqKm": 238.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/32",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "06:35 AM",
    "departureTime": "06:35 AM",
    "inTime": "05:20 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/34",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "06:45 AM",
    "departureTime": "06:45 AM",
    "inTime": "04:55 PM",
    "totalGroupDistance": 151.1,
    "distance": 151.1,
    "actualKm": 151.1,
    "singleChargeReqKm": 151.1,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/35",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "06:55 AM",
    "departureTime": "06:55 AM",
    "inTime": "05:40 PM",
    "totalGroupDistance": 171.7,
    "distance": 171.7,
    "actualKm": 171.7,
    "singleChargeReqKm": 171.7,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/36",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "07:05 AM",
    "departureTime": "07:05 AM",
    "inTime": "05:50 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/40",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "07:15 AM",
    "departureTime": "07:15 AM",
    "inTime": "06:00 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/43",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "07:25 AM",
    "departureTime": "07:25 AM",
    "inTime": "06:10 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/46",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "07:35 AM",
    "departureTime": "07:35 AM",
    "inTime": "06:20 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/61",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "07:45 AM",
    "departureTime": "07:45 AM",
    "inTime": "04:25 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/73",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "08:15 AM",
    "departureTime": "08:15 AM",
    "inTime": "07:00 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/66",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "08:45 AM",
    "departureTime": "08:45 AM",
    "inTime": "07:30 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/25",
    "route": "KBS3A",
    "shift": "General",
    "outTime": "08:55 AM",
    "departureTime": "08:55 AM",
    "inTime": "07:40 PM",
    "totalGroupDistance": 161.4,
    "distance": 161.4,
    "actualKm": 161.4,
    "singleChargeReqKm": 161.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/2",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "01:35 PM",
    "departureTime": "01:35 PM",
    "inTime": "10:35 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/20",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "01:45 PM",
    "departureTime": "01:45 PM",
    "inTime": "10:45 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/23",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "01:55 PM",
    "departureTime": "01:55 PM",
    "inTime": "10:55 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/26",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "02:05 PM",
    "departureTime": "02:05 PM",
    "inTime": "11:05 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/8",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "02:15 PM",
    "departureTime": "02:15 PM",
    "inTime": "11:15 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/9",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "02:25 PM",
    "departureTime": "02:25 PM",
    "inTime": "11:25 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/77",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "02:35 PM",
    "departureTime": "02:35 PM",
    "inTime": "11:35 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/78",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "02:45 PM",
    "departureTime": "02:45 PM",
    "inTime": "11:45 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/79",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "02:55 PM",
    "departureTime": "02:55 PM",
    "inTime": "11:55 AM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3A/80",
    "route": "KBS3A",
    "shift": "Night Hault",
    "outTime": "03:05 PM",
    "departureTime": "03:05 PM",
    "inTime": "12:05 PM",
    "totalGroupDistance": 231.8,
    "distance": 231.8,
    "actualKm": 231.8,
    "singleChargeReqKm": 231.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/1",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "01:10 PM",
    "departureTime": "01:10 PM",
    "inTime": "11:40 AM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/2",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "01:30 PM",
    "departureTime": "01:30 PM",
    "inTime": "12:00 PM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/3",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "01:50 PM",
    "departureTime": "01:50 PM",
    "inTime": "12:20 PM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/4",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "02:10 PM",
    "departureTime": "02:10 PM",
    "inTime": "12:40 PM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/11",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "02:30 PM",
    "departureTime": "02:30 PM",
    "inTime": "01:00 PM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/6",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "02:50 PM",
    "departureTime": "02:50 PM",
    "inTime": "01:20 PM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/7",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "03:10 PM",
    "departureTime": "03:10 PM",
    "inTime": "01:40 PM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/8",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "03:30 PM",
    "departureTime": "03:30 PM",
    "inTime": "02:00 PM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "361C/9",
    "route": "361C",
    "shift": "Night Hault",
    "outTime": "03:50 PM",
    "departureTime": "03:50 PM",
    "inTime": "02:20 PM",
    "totalGroupDistance": 257.8,
    "distance": 257.8,
    "actualKm": 257.8,
    "singleChargeReqKm": 257.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "399C/3",
    "route": "399C",
    "shift": "Night Hault",
    "outTime": "01:15 PM",
    "departureTime": "01:15 PM",
    "inTime": "11:10 AM",
    "totalGroupDistance": 283.8,
    "distance": 283.8,
    "actualKm": 283.8,
    "singleChargeReqKm": 283.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "399C/4",
    "route": "399C",
    "shift": "Night Hault",
    "outTime": "02:00 PM",
    "departureTime": "02:00 PM",
    "inTime": "12:25 PM",
    "totalGroupDistance": 283.8,
    "distance": 283.8,
    "actualKm": 283.8,
    "singleChargeReqKm": 283.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "399C/5",
    "route": "399C",
    "shift": "Night Hault",
    "outTime": "02:40 PM",
    "departureTime": "02:40 PM",
    "inTime": "01:15 PM",
    "totalGroupDistance": 265.5,
    "distance": 265.5,
    "actualKm": 265.5,
    "singleChargeReqKm": 265.5,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "399C/6",
    "route": "399C",
    "shift": "Night Hault",
    "outTime": "03:35 PM",
    "departureTime": "03:35 PM",
    "inTime": "01:45 PM",
    "totalGroupDistance": 265.5,
    "distance": 265.5,
    "actualKm": 265.5,
    "singleChargeReqKm": 265.5,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/2",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "01:00 PM",
    "departureTime": "01:00 PM",
    "inTime": "10:45 AM",
    "totalGroupDistance": 290.0,
    "distance": 290.0,
    "actualKm": 290.0,
    "singleChargeReqKm": 290.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/1",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "01:10 PM",
    "departureTime": "01:10 PM",
    "inTime": "08:45 PM",
    "totalGroupDistance": 291.4,
    "distance": 291.4,
    "actualKm": 291.4,
    "singleChargeReqKm": 291.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/3",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "01:20 PM",
    "departureTime": "01:20 PM",
    "inTime": "10:40 AM",
    "totalGroupDistance": 291.4,
    "distance": 291.4,
    "actualKm": 291.4,
    "singleChargeReqKm": 291.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/6",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "01:20 PM",
    "departureTime": "01:20 PM",
    "inTime": "11:25 AM",
    "totalGroupDistance": 290.0,
    "distance": 290.0,
    "actualKm": 290.0,
    "singleChargeReqKm": 290.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/9",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "01:30 PM",
    "departureTime": "01:30 PM",
    "inTime": "10:40 AM",
    "totalGroupDistance": 289.4,
    "distance": 289.4,
    "actualKm": 289.4,
    "singleChargeReqKm": 289.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/10",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "01:45 PM",
    "departureTime": "01:45 PM",
    "inTime": "11:30 AM",
    "totalGroupDistance": 300.6,
    "distance": 300.6,
    "actualKm": 300.6,
    "singleChargeReqKm": 300.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/12",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "01:50 PM",
    "departureTime": "01:50 PM",
    "inTime": "11:10 AM",
    "totalGroupDistance": 291.4,
    "distance": 291.4,
    "actualKm": 291.4,
    "singleChargeReqKm": 291.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/13",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "02:00 PM",
    "departureTime": "02:00 PM",
    "inTime": "12:00 PM",
    "totalGroupDistance": 298.8,
    "distance": 298.8,
    "actualKm": 298.8,
    "singleChargeReqKm": 298.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/14",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "02:00 PM",
    "departureTime": "02:00 PM",
    "inTime": "11:20 AM",
    "totalGroupDistance": 291.4,
    "distance": 291.4,
    "actualKm": 291.4,
    "singleChargeReqKm": 291.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/19",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "02:10 PM",
    "departureTime": "02:10 PM",
    "inTime": "11:30 AM",
    "totalGroupDistance": 291.4,
    "distance": 291.4,
    "actualKm": 291.4,
    "singleChargeReqKm": 291.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/16",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "02:15 PM",
    "departureTime": "02:15 PM",
    "inTime": "12:00 PM",
    "totalGroupDistance": 300.6,
    "distance": 300.6,
    "actualKm": 300.6,
    "singleChargeReqKm": 300.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/20",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "02:30 PM",
    "departureTime": "02:30 PM",
    "inTime": "12:30 PM",
    "totalGroupDistance": 298.8,
    "distance": 298.8,
    "actualKm": 298.8,
    "singleChargeReqKm": 298.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/23",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "02:45 PM",
    "departureTime": "02:45 PM",
    "inTime": "12:30 PM",
    "totalGroupDistance": 300.6,
    "distance": 300.6,
    "actualKm": 300.6,
    "singleChargeReqKm": 300.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/22",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "03:00 PM",
    "departureTime": "03:00 PM",
    "inTime": "12:45 PM",
    "totalGroupDistance": 300.6,
    "distance": 300.6,
    "actualKm": 300.6,
    "singleChargeReqKm": 300.6,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/8",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "03:10 PM",
    "departureTime": "03:10 PM",
    "inTime": "01:10 PM",
    "totalGroupDistance": 290.0,
    "distance": 290.0,
    "actualKm": 290.0,
    "singleChargeReqKm": 290.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/21",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "03:20 PM",
    "departureTime": "03:20 PM",
    "inTime": "11:50 AM",
    "totalGroupDistance": 291.4,
    "distance": 291.4,
    "actualKm": 291.4,
    "singleChargeReqKm": 291.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/7",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "03:30 PM",
    "departureTime": "03:30 PM",
    "inTime": "01:30 PM",
    "totalGroupDistance": 290.0,
    "distance": 290.0,
    "actualKm": 290.0,
    "singleChargeReqKm": 290.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/28",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "03:40 PM",
    "departureTime": "03:40 PM",
    "inTime": "12:00 PM",
    "totalGroupDistance": 291.4,
    "distance": 291.4,
    "actualKm": 291.4,
    "singleChargeReqKm": 291.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/4",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "03:50 PM",
    "departureTime": "03:50 PM",
    "inTime": "01:50 PM",
    "totalGroupDistance": 290.0,
    "distance": 290.0,
    "actualKm": 290.0,
    "singleChargeReqKm": 290.0,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "328H/25",
    "route": "328H",
    "shift": "Night Hault",
    "outTime": "04:00 PM",
    "departureTime": "04:00 PM",
    "inTime": "12:20 PM",
    "totalGroupDistance": 291.4,
    "distance": 291.4,
    "actualKm": 291.4,
    "singleChargeReqKm": 291.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "500DC/12",
    "route": "500DC",
    "shift": "General",
    "outTime": "07:45 AM",
    "departureTime": "07:45 AM",
    "inTime": "07:00 PM",
    "totalGroupDistance": 171.4,
    "distance": 171.4,
    "actualKm": 171.4,
    "singleChargeReqKm": 171.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "500DC/13",
    "route": "500DC",
    "shift": "General",
    "outTime": "08:00 AM",
    "departureTime": "08:00 AM",
    "inTime": "07:15 PM",
    "totalGroupDistance": 171.4,
    "distance": 171.4,
    "actualKm": 171.4,
    "singleChargeReqKm": 171.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "500DC/14",
    "route": "500DC",
    "shift": "General",
    "outTime": "08:15 AM",
    "departureTime": "08:15 AM",
    "inTime": "07:30 PM",
    "totalGroupDistance": 171.4,
    "distance": 171.4,
    "actualKm": 171.4,
    "singleChargeReqKm": 171.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "500DC/15",
    "route": "500DC",
    "shift": "General",
    "outTime": "08:30 AM",
    "departureTime": "08:30 AM",
    "inTime": "07:45 PM",
    "totalGroupDistance": 171.4,
    "distance": 171.4,
    "actualKm": 171.4,
    "singleChargeReqKm": 171.4,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/7",
    "route": "KBS3F",
    "shift": "General",
    "outTime": "07:30 AM",
    "departureTime": "07:30 AM",
    "inTime": "06:30 PM",
    "totalGroupDistance": 203.2,
    "distance": 203.2,
    "actualKm": 203.2,
    "singleChargeReqKm": 203.2,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/8",
    "route": "KBS3F",
    "shift": "General",
    "outTime": "07:50 AM",
    "departureTime": "07:50 AM",
    "inTime": "06:50 PM",
    "totalGroupDistance": 190.8,
    "distance": 190.8,
    "actualKm": 190.8,
    "singleChargeReqKm": 190.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/11",
    "route": "KBS3F",
    "shift": "General",
    "outTime": "08:10 AM",
    "departureTime": "08:10 AM",
    "inTime": "07:10 PM",
    "totalGroupDistance": 190.8,
    "distance": 190.8,
    "actualKm": 190.8,
    "singleChargeReqKm": 190.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/12",
    "route": "KBS3F",
    "shift": "General",
    "outTime": "08:30 AM",
    "departureTime": "08:30 AM",
    "inTime": "07:30 PM",
    "totalGroupDistance": 190.8,
    "distance": 190.8,
    "actualKm": 190.8,
    "singleChargeReqKm": 190.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/13",
    "route": "KBS3F",
    "shift": "General",
    "outTime": "08:50 AM",
    "departureTime": "08:50 AM",
    "inTime": "07:50 PM",
    "totalGroupDistance": 190.8,
    "distance": 190.8,
    "actualKm": 190.8,
    "singleChargeReqKm": 190.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/14",
    "route": "KBS3F",
    "shift": "General",
    "outTime": "09:10 AM",
    "departureTime": "09:10 AM",
    "inTime": "08:10 PM",
    "totalGroupDistance": 190.8,
    "distance": 190.8,
    "actualKm": 190.8,
    "singleChargeReqKm": 190.8,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/16",
    "route": "KBS3F",
    "shift": "Night Hault",
    "outTime": "01:50 PM",
    "departureTime": "01:50 PM",
    "inTime": "11:40 AM",
    "totalGroupDistance": 279.3,
    "distance": 279.3,
    "actualKm": 279.3,
    "singleChargeReqKm": 279.3,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/15",
    "route": "KBS3F",
    "shift": "Night Hault",
    "outTime": "02:10 PM",
    "departureTime": "02:10 PM",
    "inTime": "12:00 PM",
    "totalGroupDistance": 279.3,
    "distance": 279.3,
    "actualKm": 279.3,
    "singleChargeReqKm": 279.3,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/17",
    "route": "KBS3F",
    "shift": "Night Hault",
    "outTime": "03:45 PM",
    "departureTime": "03:45 PM",
    "inTime": "12:50 PM",
    "totalGroupDistance": 279.3,
    "distance": 279.3,
    "actualKm": 279.3,
    "singleChargeReqKm": 279.3,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  },
  {
    "scheduleId": "KBS3F/18",
    "route": "KBS3F",
    "shift": "Night Hault",
    "outTime": "04:00 PM",
    "departureTime": "04:00 PM",
    "inTime": "01:05 PM",
    "totalGroupDistance": 279.3,
    "distance": 279.3,
    "actualKm": 279.3,
    "singleChargeReqKm": 279.3,
    "category": "Standard",
    "routeComplexity": "Standard",
    "origin": "BMT-32",
    "destination": "BMT-32"
  }
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
  'KBES3F': ['BM293', 'BM250', 'BM275', 'BM082'],
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

const formatDualTime = (tStr) => {
  if (!tStr) return '';
  const s = String(tStr).trim();
  const isAmPm = /am|pm/i.test(s);
  if (isAmPm) {
    const parts = s.split(' ');
    const [hStr, mStr] = parts[0].split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const isPm = /pm/i.test(parts[1]);
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    const h24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return `${s} (${h24})`;
  } else if (s.includes(':')) {
    const [hStr, mStr] = s.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const t12 = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    return `${t12} (${s.substring(0, 5)})`;
  }
  return s;
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

const BellIcon = ({ color = '#1e293b', size = 20 }) => (
  <View style={{ width: size + 4, height: size + 4, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.72, height: size * 0.7, borderTopLeftRadius: size * 0.36, borderTopRightRadius: size * 0.36, borderWidth: 1.8, borderColor: color }} />
    <View style={{ width: size * 0.95, height: 2, borderRadius: 1, backgroundColor: color, marginTop: -0.5 }} />
    <View style={{ width: 3, height: 2, borderBottomLeftRadius: 1.5, borderBottomRightRadius: 1.5, backgroundColor: color, marginTop: 1 }} />
  </View>
);

const NON_SINGLE_CHARGE_ROUTES = ['500DC', 'KBS3F', 'KBS3A', '328H', '360K', '361C', '399C'];

function cleanRouteCode(rStr) {
  if (!rStr) return '';
  const s = String(rStr).trim().toUpperCase();
  for (const code of NON_SINGLE_CHARGE_ROUTES) {
    if (s.includes(code)) return code;
  }
  const match = s.match(/\b([A-Z0-9]+[A-Z0-9\/-]*)\b/);
  return match ? match[1] : s;
}

function isNonSingleChargeRoute(rStr) {
  if (!rStr) return false;
  const s = String(rStr).trim().toUpperCase();
  return NON_SINGLE_CHARGE_ROUTES.some((code) => s.includes(code));
}

export default function SchedulingScreen() {
  const {
    buses,
    allBuses,
    lockedBuses = [],
    allocatedDuties = [],
    allocateBusToRoute,
    pendingDeletions = { buses: {}, routes: {}, depots: {} },
    isTargetPendingDeletion,
  } = useFleet();
  const { selectedDepot, logout, returnToLogin } = useAuth();
  const { t } = useLanguage();

  const [datasetTick, setDatasetTick] = useState(0);
  useEffect(() => {
    const bumpTick = () => setDatasetTick((v) => v + 1);
    const unsubDataset = subscribeDatasetChanges(bumpTick);
    const unsubDepot = subscribeDepotChanges(bumpTick);
    return () => {
      unsubDataset();
      unsubDepot();
    };
  }, []);

  const depotNum = String(selectedDepot || '1');
  const depotLabel = getDepotDisplayName(depotNum);

  const depotNameClean = useMemo(() => {
    const name = String(depotLabel || `Depot ${depotNum}`).trim();
    if (depotNum === '3' || name.toLowerCase().includes('peenya')) return 'Peenya Depot';
    if (depotNum === '2') return 'Attibele Depot';
    if (depotNum === '1') return 'Chandra Layout Depot';
    return name.toLowerCase().includes('depot') ? name : `${name} Depot`;
  }, [depotLabel, depotNum]);

  const assignedRouteCodes = getRoutesForDepot(depotNum);
  const ALL_BASE_ROUTES = [...DEPOT_1_ROUTES, ...DEPOT_2_ROUTES];

  const resolveDepotRoute = useCallback((code) => {
    let clean = String(code || '').toUpperCase().trim();
    if (clean === 'KBES3F') clean = 'KBS3F';

    // 1. Check Master Route & Schedule Dataset first
    const ds = getRouteFromDataset(clean, depotNum);
    if (ds) {
      const dsTimes = Array.isArray(ds.timetables) ? ds.timetables.flat().filter(Boolean) : ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'];
      return {
        id: clean,
        code: clean,
        name: ds.name || `${ds.origin || depotLabel} ➔ ${ds.destination || 'Terminal'} (${clean})`,
        fullName: ds.fullName || ds.name || `Route ${clean}`,
        shortName: ds.shortName || clean,
        origin: ds.origin || `${depotLabel} Terminal`,
        destination: ds.destination || 'Central Terminal',
        via: (ds.via && ds.via !== '') ? ds.via : '',
        timetables: dsTimes,
        distance: Number(ds.distance) || 25.0,
        revenueKm: Number(ds.revenueKm || ds.distance) || 25.0,
        corridorDistance: Number(ds.corridorDistance || ds.distance) || 25.0,
        fullDutyKm: Number(ds.fullDutyKm) || (Number(ds.distance) || 25.0),
        actualKm: Number(ds.actualKm || ds.fullDutyKm) || (Number(ds.distance) || 25.0),
        chargingOcc: Number(ds.chargingOcc || 0),
        noChargingOcc: Number(ds.noChargingOcc || 0),
        splitDuty: Boolean(ds.splitDuty || ds.chargingOcc > 0 || ds.noChargingOcc > 0),
        singleChargeReqKm: ds.singleChargeReqKm,
        duration: ds.duration || '50 mins',
        energyEst: ds.energyEst || `${Math.round((Number(ds.distance) || 25.0) * 1.25)} kWh`,
        shift: ds.shift || 'General Shift',
        category: ds.category || ds.routeComplexity || 'Standard',
        routeComplexity: ds.category || ds.routeComplexity || 'Standard',
        requiredCat: ds.requiredCat || (ds.routeComplexity === 'Complex' ? 'A' : 'B'),
        drainSoc: ds.drainSoc || Math.min(95, Math.max(10, Math.round((Number(ds.distance) || 25.0) * 0.85))),
        timeComplexity: ds.timeComplexity || 'Normal',
        timeComplexitySlots: ds.timeComplexitySlots || {},
        schedules: ds.schedules || [],
      };
    }

    const found = ALL_BASE_ROUTES.find((r) => r.code === clean || r.id === clean);
    if (found) {
      return {
        ...found,
        timetables: Array.isArray(found.timetables) ? found.timetables.flat().filter(Boolean) : ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'],
      };
    }

    const dyn = getRouteDefinition(clean);
    if (dyn) {
      return {
        id: clean,
        code: clean,
        name: dyn.fullName || dyn.name || `Route ${clean}`,
        fullName: dyn.fullName || dyn.name || `Route ${clean}`,
        shortName: dyn.shortName || clean,
        origin: dyn.origin || `${depotLabel} Terminal`,
        destination: dyn.destination || 'Central Terminal',
        via: (dyn.via && dyn.via !== '') ? dyn.via : '',
        timetables: Array.isArray(dyn.timetables) ? dyn.timetables.flat().filter(Boolean) : ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'],
        distance: Number(dyn.distance) || 25.0,
        fullDutyKm: Number(dyn.fullDutyKm) || (Number(dyn.distance) || 25.0),
        actualKm: Number(dyn.actualKm || dyn.fullDutyKm) || (Number(dyn.distance) || 25.0),
        chargingOcc: Number(dyn.chargingOcc || 0),
        noChargingOcc: Number(dyn.noChargingOcc || 0),
        splitDuty: Boolean(dyn.splitDuty || dyn.chargingOcc > 0 || dyn.noChargingOcc > 0),
        singleChargeReqKm: dyn.singleChargeReqKm,
        duration: dyn.duration || '50 mins',
        energyEst: dyn.energyEst || `${Math.round((Number(dyn.distance) || 25.0) * 1.25)} kWh`,
        shift: dyn.shift || 'General Shift',
        category: dyn.category || 'Standard',
        requiredCat: dyn.requiredCat || 'B',
        drainSoc: dyn.drainSoc || Math.min(95, Math.max(10, Math.round((Number(dyn.distance) || 25.0) * 0.85))),
      };
    }

    return {
      id: clean,
      code: clean,
      name: `Route ${clean}`,
      fullName: `Route ${clean}`,
      shortName: clean,
      origin: `${depotLabel} Terminal`,
      destination: 'Central Terminal',
      via: '',
      timetables: ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'],
      distance: 25.0,
      fullDutyKm: 25.0,
      duration: '50 mins',
      energyEst: '30 kWh',
      shift: 'General Shift',
      category: 'Standard',
      requiredCat: 'B',
      drainSoc: 24,
    };
  }, [depotNum, depotLabel, ALL_BASE_ROUTES, datasetTick]);

  const matchedRoutes = useMemo(() => assignedRouteCodes.map(resolveDepotRoute), [assignedRouteCodes, resolveDepotRoute, datasetTick]);
  const availableRoutes = (depotNum === '1' && matchedRoutes.length === 0)
    ? DEPOT_1_ROUTES
    : (depotNum === '2' && matchedRoutes.length === 0)
      ? DEPOT_2_ROUTES
      : matchedRoutes;
  const availableDrivers = DEPOT_DRIVERS[depotNum] || DEPOT_DRIVERS['1'];

  // Scheduling states (Safe empty state when newly created depot has no routes or buses assigned yet)
  const [selectedRoute, setSelectedRoute] = useState(availableRoutes[0] || null);
  const [scheduledTime, setScheduledTime] = useState(availableRoutes[0]?.timetables?.[0] || '');

  // Keep active selectedRoute and scheduledTime in sync when Master Route Dataset updates departure times or deletes routes
  useEffect(() => {
    if (availableRoutes.length === 0) {
      if (selectedRoute !== null) setSelectedRoute(null);
      if (scheduledTime !== '') setScheduledTime('');
      return;
    }
    if (!selectedRoute) {
      setSelectedRoute(availableRoutes[0]);
      setScheduledTime(availableRoutes[0]?.timetables?.[0] || '');
      return;
    }
    const updated = availableRoutes.find((r) => (r.code || r.id) === (selectedRoute.code || selectedRoute.id));
    if (!updated) {
      setSelectedRoute(availableRoutes[0]);
      setScheduledTime(availableRoutes[0]?.timetables?.[0] || '');
      return;
    }
    const updatedTimes = Array.isArray(updated.timetables) ? updated.timetables : [];
    const curTimes = Array.isArray(selectedRoute.timetables) ? selectedRoute.timetables : [];
    if (
      JSON.stringify(updatedTimes) !== JSON.stringify(curTimes) ||
      JSON.stringify(updated.schedules) !== JSON.stringify(selectedRoute.schedules) ||
      JSON.stringify(updated.timeComplexitySlots || {}) !== JSON.stringify(selectedRoute.timeComplexitySlots || {})
    ) {
      setSelectedRoute(updated);
      if (scheduledTime && !updatedTimes.includes(scheduledTime)) {
        setScheduledTime(updatedTimes[0] || '');
      }
    }
  }, [availableRoutes, datasetTick]);
  const [selectedDriver, setSelectedDriver] = useState(availableDrivers[0]);
  const [driverNameInput, setDriverNameInput] = useState(availableDrivers[0].name);
  const [driverError, setDriverError] = useState('');
  const [selectedCandidateBm, setSelectedCandidateBm] = useState(null);
  const [langModalOpen, setLangModalOpen] = useState(false);

  // ── Relay Alerts State & 5-minute Recurring Pop-up Alert ──
  const [pendingRelayRoutes, setPendingRelayRoutes] = useState({});
  const [relayModalOpen, setRelayModalOpen] = useState(false);
  const [relayPopupOpen, setRelayPopupOpen] = useState(false);
  const [activePopupItem, setActivePopupItem] = useState(null);
  const lastPopupTimeRef = React.useRef(0);

  const pendingRelayCount = Object.keys(pendingRelayRoutes).length;

  const fetchAndSyncRelays = useCallback(async () => {
    try {
      let serverPending = {};
      const res = await api.get('/api/pending-relay-routes').catch(() => null);
      if (res && res.data && res.data.pendingRelayRoutes) {
        serverPending = res.data.pendingRelayRoutes;
      }

      const curDepot = String(depotNum || '1').trim();

      // Only consider pending relays that were actively recorded on route completion for this depot
      // and ignore routes or depots that are pending deletion (paused)
      const pdDepots = (pendingDeletions && pendingDeletions.depots) || {};
      const pdRoutes = (pendingDeletions && pendingDeletions.routes) || {};
      const filtered = {};
      if (serverPending && typeof serverPending === 'object' && !pdDepots[curDepot]) {
        for (const [rCode, info] of Object.entries(serverPending)) {
          if (!info) continue;
          const infoDepot = String(info.depot || '').trim();
          if (infoDepot && curDepot && infoDepot.toLowerCase() !== curDepot.toLowerCase()) {
            continue;
          }
          const rClean = cleanRouteCode(rCode);
          if (pdRoutes[`${curDepot}_${rClean}`] || Object.values(pdRoutes).some((pr) => pr && cleanRouteCode(pr.code) === rClean && (!pr.depotId || String(pr.depotId).trim() === curDepot))) {
            continue;
          }

          const firstBus = String(info.firstBus || '').toUpperCase().trim();
          const hasSecondBus = (allocatedDuties || []).some((d) => {
            const dRoute = cleanRouteCode(d.routeCode || d.route || '');
            const dDep = String(d.depot || '').trim();
            const dBm = String(d.bm || d.bmNumber || d.busId || '').toUpperCase().trim();
            return dRoute === rCode && (!dDep || dDep.toLowerCase() === curDepot.toLowerCase()) && dBm && dBm !== firstBus;
          });

          if (!hasSecondBus) {
            filtered[rCode] = info;
          }
        }
      }

      setPendingRelayRoutes(filtered);

      // Check 5-minute recurring popup condition
      const items = Object.values(filtered);
      if (items.length > 0) {
        const now = Date.now();
        if (lastPopupTimeRef.current === 0 || (now - lastPopupTimeRef.current >= 5 * 60 * 1000)) {
          setActivePopupItem(items[0]);
          setRelayPopupOpen(true);
        }
      } else {
        setRelayPopupOpen(false);
      }
    } catch (_) {}
  }, [allocatedDuties, depotNum]);

  useEffect(() => {
    fetchAndSyncRelays();
    const interval = setInterval(fetchAndSyncRelays, 10000);
    return () => clearInterval(interval);
  }, [fetchAndSyncRelays]);

  const selectRelayRouteAndAllocate = (rCode, targetDepot) => {
    setRelayModalOpen(false);
    setRelayPopupOpen(false);
    lastPopupTimeRef.current = Date.now();

    const check = isTargetPendingDeletion ? isTargetPendingDeletion({ depotId: targetDepot || depotNum, routeCode: rCode }) : { pending: false };
    if (check.pending) {
      Alert.alert(
        '⛔ Route Scheduled for Deletion',
        check.message || `This route (${rCode}) is going to be deleted, so no bus can be allocated for this route.`
      );
      return;
    }

    const matched = availableRoutes.find((r) => cleanRouteCode(r.code || r.id) === rCode);
    if (matched) {
      setSelectedRoute(matched);
      setScheduledTime(matched.timetables?.[0] || '08:00 AM');
      setSelectedCandidateBm(null);
    }
  };

  const resolveRelay = async (rCode, newAllocatedBm) => {
    const cleanR = cleanRouteCode(rCode);
    setPendingRelayRoutes((prev) => {
      const copy = { ...prev };
      delete copy[cleanR];
      return copy;
    });
    setRelayPopupOpen(false);
    try {
      await api.post('/api/resolve-relay-route', { route: cleanR, newBm: newAllocatedBm }).catch(() => {});
    } catch (_) {}
  };

  // Sync route and driver when depot changes
  React.useEffect(() => {
    const codes = getRoutesForDepot(depotNum);
    const matched = codes.map(resolveDepotRoute);
    const routesForDepot = (depotNum === '1' && matched.length === 0)
      ? DEPOT_1_ROUTES
      : (depotNum === '2' && matched.length === 0)
        ? DEPOT_2_ROUTES
        : matched;

    if (routesForDepot.length > 0) {
      const isCurrentInDepot = routesForDepot.some((r) => r.id === selectedRoute?.id);
      if (!isCurrentInDepot || !selectedRoute) {
        setSelectedRoute(routesForDepot[0]);
        setScheduledTime(routesForDepot[0].timetables?.[0] || '08:00 AM');
        setSelectedCandidateBm(null);
      }
    } else {
      setSelectedRoute(null);
      setScheduledTime('');
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
    const depTimeClean = (scheduledTime || '').trim();
    const depMin = parseTimeToMinutes(depTimeClean);

    // 1. Check selectedRoute.schedules first (BMTC Form 4 Schedules from BMT-32)
    const schedulesList = (selectedRoute?.schedules && selectedRoute.schedules.length > 0)
      ? selectedRoute.schedules
      : DEFAULT_DATASET_SCHEDULES.filter((s) => String(s.route || '').toUpperCase().trim() === routeCode);

    let found = schedulesList.find((s) => {
      const sDep = (s.departureTime || s.outTime || '').trim();
      return sDep.toLowerCase() === depTimeClean.toLowerCase() ||
             (depTimeClean && sDep.toLowerCase().startsWith(depTimeClean.toLowerCase())) ||
             (sDep && depTimeClean.toLowerCase().startsWith(sDep.toLowerCase()));
    });

    if (!found && schedulesList.length > 0) {
      found = schedulesList.slice().sort((a, b) => {
        const diffA = Math.abs(parseTimeToMinutes(a.departureTime || a.outTime || '12:00') - depMin);
        const diffB = Math.abs(parseTimeToMinutes(b.departureTime || b.outTime || '12:00') - depMin);
        return diffA - diffB;
      })[0];
    }
    return found || null;
  }, [selectedRoute, scheduledTime]);

  // 2. Route Complexity & Time Category Matrix evaluation (Exact match to website scheduling.html)
  const complexity = getRouteComplexity(selectedRoute, matchedSched, scheduledTime);
  const timeCatInfo = getTimeCategory(scheduledTime, selectedRoute);
  const isPeak = Boolean(timeCatInfo && timeCatInfo.isPeak);
  const matrixStatus = getMatrixStatus(complexity, timeCatInfo);

  // Split Duty evaluation directly from matched schedule and route dataset
  const isSplitDuty = Boolean(
    (matchedSched && (matchedSched.splitDuty || matchedSched.chargingOcc > 0 || matchedSched.noChargingOcc > 0)) ||
    (selectedRoute && (selectedRoute.splitDuty || selectedRoute.chargingOcc > 0 || selectedRoute.noChargingOcc > 0))
  );
  const routeEstimatedSoc = useMemo(() => {
    if (!selectedRoute) return 0;
    return computeRouteEstimatedSoc(selectedRoute, matchedSched, scheduledTime || selectedRoute?.timetables?.[0]);
  }, [selectedRoute, matchedSched, scheduledTime]);
  const chargingOccCount = (
    matchedSched?.chargingOcc ||
    matchedSched?.noChargingOcc ||
    selectedRoute?.chargingOcc ||
    selectedRoute?.noChargingOcc ||
    1
  );

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

    const selectedRouteCodeClean = String(selectedRoute?.code || selectedRoute?.id || '').toUpperCase().trim();
    const pdCheck = isTargetPendingDeletion
      ? isTargetPendingDeletion({ depotId: depotNum, routeCode: selectedRouteCodeClean, bm: key })
      : { pending: false };
    if (pdCheck.pending) {
      return { feasible: false, bm: key, reason: pdCheck.message || `Pending deletion pause active for ${pdCheck.type || 'target'}.` };
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
    const actualKmVal = Number(matchedSched?.totalGroupDistance || matchedSched?.distance || selectedRoute?.actualKm || selectedRoute?.fullDutyKm || 188.54);
    const constantMinReqSoc = getRequiredSingleChargeSoc(routeDist, matchedSched, key, timeCatInfo || depTimeShort, actualKmVal, selectedRoute);
    const minAllowedSoc = constantMinReqSoc - 2;
    if (liveSoc < minAllowedSoc) {
      return { feasible: false, bm: key, liveSoc, reqSoc: constantMinReqSoc, reason: `Bus ${key} battery at ${liveSoc}% does not match minimum required SoC (${constantMinReqSoc}%).` };
    }

    const drainDetails = getBusDrainRatePerKm(key, timeCatInfo || depTimeShort, selectedRoute);
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
    // Standard and Moderate routes: Category C is strictly disallowed under ALL conditions
    if ((isModerate || isStandard) && page4Category === 'C') {
      return { feasible: false, bm: key, reason: `Standard/Moderate route strictly disallows Category C buses in all conditions. Bus ${key} is Category C.` };
    }
    // Simple route during Peak: Category B is Primary, Category C is 1st Fallback, Category A is 2nd Fallback (all A, B, C are eligible)

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
  }, [resolvedAll, pool, depotNum, lockedBuses, allocatedDuties, matchedSched, timeCatInfo, complexity, pendingDeletions, isTargetPendingDeletion]);

  // 4. Candidate Buses Generation & Mandatory Assignment (Exact 1:1 match with scheduling.html getRouteCandidateBuses)
  const candidateBuses = useMemo(() => {
    if (!selectedRoute || availableRoutes.length === 0) {
      return [];
    }
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

    // 0. Depot fleet buses stationed at this active depot (including newly added buses)
    depotBuses.forEach((b) => {
      const bm = String(b.bmNumber || b.bm || b.id || '').toUpperCase().trim();
      if (bm) {
        addCand(bm, b.isNewlyAdded ? '✨ Inducted Fleet Bus' : 'Depot Fleet Bus');
      }
    });

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
        // Standard / Moderate routes: only A and B, never C
        searchPasses = isPeak ? [aKeys, bKeys] : [bKeys, aKeys];
      } else if (matrixStatus === 'B/C/A' || (complexity.toLowerCase() === 'simple' && isPeak)) {
        // Simple route + Peak: B Primary, C 1st Fallback, A 2nd Fallback
        searchPasses = [bKeys, cKeys, aKeys];
      } else {
        // Simple route + Normal: C Primary, B 1st Fallback, A 2nd Fallback
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

    // 5b. Fallback for newly added depots or routes: ensure stationed fleet buses can be allocated
    if (candidates.length === 0 && depotBuses.length > 0) {
      depotBuses.forEach((b) => {
        const bm = String(b.bmNumber || b.bm || b.id || '').toUpperCase().trim();
        if (!bm || seenBms.has(bm)) return;
        const isLocked = Boolean(b.isLocked || lockedBuses.some((lb) => String(lb.bm || lb.bmNumber || '').toUpperCase().trim() === bm));
        const isAllocated = Boolean(allocatedDuties.some((d) => String(d.bm || d.bmNumber || d.busId || '').toUpperCase().trim() === bm));
        if (isLocked || b.isCharging || b.isCleaning || isAllocated) return;

        seenBms.add(bm);
        const liveSoc = Number(b.soc ?? 85);
        const busCat = b.busCategory || b.category || 'B';
        const operatingKm = routeDist;
        const energyNeeded = Math.round(operatingKm * 1.25);
        const projectedArrivalSoc = Math.max(0, Math.round(liveSoc - (operatingKm / 1.42)));
        const bufferSoc = Math.max(0, projectedArrivalSoc - 10);
        candidates.push({
          ...b,
          bmNumber: bm,
          bm: bm,
          regNo: b.regNo || getBusRegNo(bm),
          role: b.isNewlyAdded ? '✨ Inducted Fleet Bus' : 'Depot Fleet Bus',
          shift: targetShift,
          liveSoc,
          soc: liveSoc,
          busCategory: busCat,
          category: busCat,
          constantMinReqSoc: Math.max(20, Math.round(routeDist * 0.8)),
          reqSoc: Math.max(20, Math.round(routeDist * 0.8)),
          fullDutyKm: Math.round(Math.max(0, liveSoc - 10) * 1.42),
          actualRangeKm: Math.round(liveSoc * 1.42),
          energyNeeded,
          projectedArrivalSoc,
          bufferSoc,
          departureTime: depTimeClean,
          routeCode: routeCode,
        });
      });
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
        catPriority = isPeak ? { A: 0, B: 1, C: 2 } : { B: 0, A: 1, C: 2 };
      } else if (matrixStatus === 'B/C/A' || (complexity.toLowerCase() === 'simple' && isPeak)) {
        // Simple route + Peak: Category B Primary, Category C 1st Fallback, Category A 2nd Fallback
        catPriority = { B: 0, C: 1, A: 2 };
      } else if (matrixStatus === 'A/B/C' || matrixStatus === 'C/B/A') {
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
      if (isPeak) {
        const aBuses = recommendedPool.filter((c) => c.busCategory === 'A');
        if (aBuses.length > 0) {
          lockedCand = aBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0];
        } else {
          const bBuses = recommendedPool.filter((c) => c.busCategory === 'B');
          lockedCand = bBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0] || recommendedPool[0];
        }
      } else {
        const bBuses = recommendedPool.filter((c) => c.busCategory === 'B');
        if (bBuses.length > 0) {
          lockedCand = bBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0];
        } else {
          const aBuses = recommendedPool.filter((c) => c.busCategory === 'A');
          lockedCand = aBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0] || recommendedPool[0];
        }
      }
    } else if (matrixStatus === 'B/C/A' || (complexity.toLowerCase() === 'simple' && isPeak)) {
      // Simple + Peak: Category B is Primary, Category C is 1st Fallback, Category A is 2nd Fallback
      const bBuses = recommendedPool.filter((c) => c.busCategory === 'B');
      const cBuses = recommendedPool.filter((c) => c.busCategory === 'C');
      const aBuses = recommendedPool.filter((c) => c.busCategory === 'A');
      if (bBuses.length > 0) {
        lockedCand = bBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0];
      } else if (cBuses.length > 0) {
        lockedCand = cBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0];
      } else {
        lockedCand = aBuses.slice().sort((a, b) => (b.liveSoc ?? 0) - (a.liveSoc ?? 0))[0] || recommendedPool[0];
      }
    } else if (matrixStatus === 'A/B/C' || matrixStatus === 'C/B/A') {
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
    standard: { NORMAL: ['B', 'A'], PEAK: ['A', 'B'], EXTREME_PEAK: ['A'] },
    simple: { NORMAL: ['C', 'B', 'A'], PEAK: ['B', 'C', 'A'], EXTREME_PEAK: ['A'] },
    moderate: { NORMAL: ['B', 'A'], PEAK: ['A', 'B'], EXTREME_PEAK: ['A'] },
    complex: { NORMAL: ['A'], PEAK: ['A'], EXTREME_PEAK: ['A'] },
  };
  const timeKey = timeCatInfo.key || (isPeak ? 'PEAK' : 'NORMAL');
  const allowedCategories = (allowedMatrix[complexity.toLowerCase()] || allowedMatrix.standard)[timeKey] || ['A'];
  const isExtremePeak = (timeCatInfo.key === 'EXTREME_PEAK');
  const requiresCatA = complexity.toLowerCase() === 'complex' || isExtremePeak;
  const isMatrixCompliant = activeCandidate
    ? (requiresCatA ? activeCandidate.busCategory === 'A' : allowedCategories.includes(activeCandidate.busCategory || 'B'))
    : false;
  const catDisplay = requiresCatA ? 'A' : allowedCategories.join('/');

  const selectedRouteCodeClean = String(selectedRoute?.code || selectedRoute?.id || '').toUpperCase().trim();
  const depotPauseInfo = isTargetPendingDeletion ? isTargetPendingDeletion({ depotId: depotNum }) : { pending: false };
  const routePauseInfo = isTargetPendingDeletion
    ? isTargetPendingDeletion({ depotId: depotNum, routeCode: selectedRouteCodeClean })
    : { pending: false };
  const isAllocationPaused = Boolean(depotPauseInfo.pending || routePauseInfo.pending);
  const allocationPauseMessage = depotPauseInfo.pending
    ? depotPauseInfo.message
    : routePauseInfo.pending
      ? `This route (${selectedRouteCodeClean}) is going to be deleted, so no bus can be allocated for this route.`
      : '';

  // Change route
  const handleSelectRoute = (r) => {
    setSelectedRoute(r);
    setScheduledTime((r.timetables && r.timetables[0]) || '08:00 AM');
    setSelectedCandidateBm(null);
    setRoutePickerOpen(false);

    const rCode = String(r?.code || r?.id || '').toUpperCase().trim();
    const check = isTargetPendingDeletion ? isTargetPendingDeletion({ depotId: depotNum, routeCode: rCode }) : { pending: false };
    if (check.pending) {
      Alert.alert(
        '⛔ Route Scheduled for Deletion',
        check.message || `This route (${rCode}) is going to be deleted, so no bus can be allocated for this route.`
      );
    }
  };

  // Commit Allocation
  const handleCommitAllocation = () => {
    if (isAllocationPaused) {
      Alert.alert(
        '⛔ Allocation Paused — Pending Deletion',
        allocationPauseMessage || `This route (${selectedRouteCodeClean}) is going to be deleted, so no bus can be allocated for this route.`
      );
      return;
    }

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

    // ── GUARD: A driver should NOT be allocated when he is already assigned to some other route ──
    const cleanDriver = trimmedDriver.toLowerCase().replace(/[^a-z0-9]/g, '');
    const conflictDuty = (allocatedDuties || []).find((d) => {
      const dDriver = String(d.driver || d.driverName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!dDriver || !cleanDriver) return false;
      const isSame = dDriver === cleanDriver || dDriver.includes(cleanDriver) || cleanDriver.includes(dDriver);
      if (!isSame) return false;

      const dRoute = String(d.routeCode || d.busNumber || d.routeId || '').trim();
      const curRoute = String(selectedRoute?.code || selectedRoute?.id || '').trim();
      const dBm = String(d.bm || d.bmNumber || '').toUpperCase().trim();
      const curBm = String(activeCandidate?.bmNumber || '').toUpperCase().trim();

      // Conflicting if assigned to another route OR different bus
      return (dRoute && curRoute && dRoute.toUpperCase() !== curRoute.toUpperCase()) || (dBm && curBm && dBm !== curBm);
    });

    if (conflictDuty) {
      const cRoute = conflictDuty.routeCode || conflictDuty.busNumber || conflictDuty.routeName || 'another route';
      const cBus = conflictDuty.bm || conflictDuty.bmNumber || 'Bus';
      const cTime = conflictDuty.departureTime ? ` at ${conflictDuty.departureTime}` : '';
      Alert.alert(
        '⚠️ Driver Already Assigned',
        `Driver "${trimmedDriver}" is already assigned to Route ${cRoute} on Bus ${cBus}${cTime}!\n\nA driver cannot be allocated when already assigned to some other route. Please choose an available driver.`
      );
      return;
    }

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
          onPress: async () => {
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
              scheduleId: matchedSched?.scheduleId || `${selectedRoute.code}/1`,
              shift: matchedSched?.shift || selectedRoute.shift,
              soc: activeCandidate.soc,
              reqSoc: routeEstimatedSoc || activeCandidate.constantMinReqSoc || activeCandidate.reqSoc,
              fullDutyKm: activeCandidate.fullDutyKm || 108,
              routeDist: selectedRoute.distance,
              routeFullDutyKm: Number(selectedRoute.fullDutyKm || selectedRoute.actualKm || selectedRoute.distance),
              tripCount: 8,
              busCategory: activeCandidate.busCategory || 'A',
              driver: finalDriverName,
              depot: depotNum,
              allocatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', 21 Oct 2026',
              status: 'Allocated',
            };

            const allocRes = await allocateBusToRoute(duty);
            if (allocRes && !allocRes.ok) {
              Alert.alert(
                '⛔ Allocation Blocked',
                allocRes.error || `This route (${selectedRoute.code}) is going to be deleted, so no bus can be allocated for this route.`
              );
              return;
            }

            // Resolve relay if this fulfills a pending second bus requirement
            const cleanR = cleanRouteCode(selectedRoute.code || selectedRoute.id || '');
            if (pendingRelayRoutes && pendingRelayRoutes[cleanR]) {
              const p = pendingRelayRoutes[cleanR];
              if (String(activeCandidate.bmNumber).toUpperCase() !== String(p.firstBus).toUpperCase()) {
                resolveRelay(cleanR, activeCandidate.bmNumber);
              }
            }

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
          <Text style={styles.eyebrow}>{depotNameClean.toUpperCase()}</Text>
          <Text style={styles.topbarTitle}>{t('smart_allocation_title', 'Bus Scheduling & Dispatch')}</Text>
          <Text style={styles.topbarSub}>{depotNameClean}</Text>
        </View>
        <View style={styles.topbarActions}>
          <TouchableOpacity
            style={styles.headerBellBtn}
            onPress={() => setRelayModalOpen(true)}
            activeOpacity={0.8}
            accessibilityLabel="Relay Alerts"
          >
            <BellIcon color="#1e293b" size={20} />
            {pendingRelayCount > 0 && (
              <>
                <View style={styles.bellRedDot} pointerEvents="none" />
                <View style={styles.bellNumberBadge} pointerEvents="none">
                  <Text style={styles.bellNumberBadgeText}>
                    {pendingRelayCount > 99 ? '99+' : pendingRelayCount}
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>
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
        {availableRoutes.length === 0 ? (
          <View style={[styles.panel, { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 }]}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>ℹ️</Text>
            <Text style={[styles.panelTitle, { textAlign: 'center', marginBottom: 8 }]}>
              No Routes or Buses Assigned Yet
            </Text>
            <Text style={[styles.panelNote, { textAlign: 'center', marginBottom: 20, maxWidth: 460 }]}>
              {depotLabel} (Depot {depotNum}) has been initialized with dedicated operational wings, but does not contain any assigned routes or stationed buses yet.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Assigned Routes: 0</Text>
              </View>
              <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Stationed Fleet: 0</Text>
              </View>
              <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Active Duties: 0</Text>
              </View>
            </View>

            <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 16, width: '100%', maxWidth: 480 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e40af', marginBottom: 6 }}>
                👉 To assign routes and fleet to this depot:
              </Text>
              <Text style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 18 }}>
                1. Sign in to Admin Workspace with CDM001 credentials.
                {'\n'}2. Open "Add / Delete Depots & Routes".
                {'\n'}3. Register routes or assign fleet vehicles to Depot {depotNum}.
                {'\n'}Once updated from the admin page, the new routes and buses will immediately show here.
              </Text>
            </View>
          </View>
        ) : (
          <>
            {isAllocationPaused && (
              <View style={{ backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#991b1b', marginBottom: 4 }}>
                  ⏸️ Scheduling Paused — Pending Deletion
                </Text>
                <Text style={{ fontSize: 12.5, color: '#7f1d1d', lineHeight: 18, fontWeight: '600' }}>
                  {allocationPauseMessage}
                </Text>
              </View>
            )}
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
              🚌 {selectedRoute.code} {matchedSched?.scheduleId ? `(${matchedSched.scheduleId})` : ''} — {selectedRoute.name || selectedRoute.code}
            </Text>
            <Text style={styles.caret}>▼</Text>
          </TouchableOpacity>

          {/* 2. {t('label_departure_time', 'Scheduled Departure Time')} */}
          <Text style={styles.fieldLabel}>
            {t('label_scheduled_departure_time', 'Scheduled Departure Time')} <Text style={{ color: '#dc2626' }}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.selectBox}
            onPress={() => setTimePickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectBoxText}>
              🕒 {formatDualTime(scheduledTime || (selectedRoute.timetables && selectedRoute.timetables[0])) || 'Choose a departure time'}
              {matchedSched?.scheduleId ? ` [${matchedSched.scheduleId}${matchedSched.shift ? ` • ${matchedSched.shift}` : ''}]` : ''}
            </Text>
            <Text style={styles.caret}>▼</Text>
          </TouchableOpacity>

          {/* 4. Schedule distance */}
          <Text style={styles.fieldLabel}>{t('schedule_distance', 'Total Route Distance (km)')}</Text>
          <View style={styles.readonlyInput}>
            <Text style={[styles.readonlyInputText, { fontWeight: '700', color: '#0284c7' }]}>
              {matchedSched?.totalGroupDistance || matchedSched?.distance || selectedRoute.distance} km
            </Text>
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
              <View style={styles.candidateHeaderTopRow}>
                <View style={styles.candidateTitleWrap}>
                  <Text style={styles.candidateTitleIcon}>🚌</Text>
                  <Text style={styles.candidateTitle}>{t('candidate_buses_ready', 'Candidate Buses For This Route & Time')}</Text>
                </View>
                <View style={styles.candidateCountBadge}>
                  <Text style={styles.candidateCountBadgeText}>
                    {candidateBuses.length} Candidates Ready
                  </Text>
                </View>
              </View>
              <Text style={styles.candidateSub}>
                Select one of the {candidateBuses.length} eligible candidate buses for this departure
              </Text>
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
            style={[
              styles.btnAllocate,
              isManualOverride && styles.btnAllocateOverride,
              isAllocationPaused && { backgroundColor: '#991b1b', opacity: 0.9 },
            ]}
            onPress={handleCommitAllocation}
            activeOpacity={0.85}
          >
            <Text style={styles.btnAllocateText}>
              {isAllocationPaused
                ? '⛔ Allocation Paused (Route / Depot Pending Deletion)'
                : (isManualOverride ? '⚠️ Allocate Bus (Manual Over-ride)' : '⚡ Allocate Bus')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── PANEL 2: ALLOCATION RESULT & RULES ── */}
        {activeCandidate ? (
          <View style={[styles.panel, isManualOverride && styles.panelOverride]}>
            <View style={styles.panelHeaderWithAction}>
              <View style={{ flex: 1, minWidth: 160 }}>
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

            {/* Dedicated full-width Callout Box safely wrapping within the mobile frame */}
            <View style={[styles.allocCalloutBox, isManualOverride && styles.allocCalloutBoxOverride]}>
              <Text style={styles.allocCalloutIcon}>{isManualOverride ? '⚠️' : '⭐'}</Text>
              <Text style={[styles.allocCalloutText, isManualOverride && styles.allocCalloutTextOverride]}>
                {isManualOverride
                  ? `Operator Override Active: Bus ${activeCandidate.bmNumber} (Category ${activeCandidate.busCategory || 'A'}, ${activeCandidate.soc}% SoC) was chosen by the operator instead of mandatory recommendation Bus ${mandatoryCandidate?.bmNumber} (${mandatoryCandidate?.soc}% SoC under Matrix Status ${matrixStatus}). This bus can be allocated with driver.`
                  : `Mandatory Allocation: Bus ${activeCandidate.bmNumber} is recommended under Matrix Status ${matrixStatus} rules (Category ${activeCandidate.busCategory || 'A'}, ${activeCandidate.soc}% SoC). You may choose any alternate candidate bus above to allocate as an operator override.`}
              </Text>
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
                <Text style={styles.kpiVal}>{matchedSched?.totalGroupDistance || matchedSched?.distance || selectedRoute.distance} km</Text>
                <Text style={styles.kpiLbl}>{t('route_distance', 'Total Route Distance')}</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={[styles.kpiVal, { color: '#b45309' }]}>
                  {routeEstimatedSoc || activeCandidate.constantMinReqSoc || activeCandidate.reqSoc || 75}%
                </Text>
                <Text style={styles.kpiLbl}>{t('estimated_soc', 'Estimated SoC')}</Text>
              </View>
            </View>

            {/* Transparent Rules Breakdown */}
            <View style={styles.rulesList}>
              {matchedSched?.scheduleId ? (
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleLabel}>Sub-Route (Schedule)</Text>
                  <Text style={[styles.ruleVal, { color: '#0369a1', fontWeight: '800' }]}>
                    {matchedSched.scheduleId} ({matchedSched.shift || 'General Shift'}) — Dep {matchedSched.departureTime || scheduledTime}
                  </Text>
                </View>
              ) : null}
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>Corridor Route</Text>
                <Text style={styles.ruleVal}>
                  {selectedRoute.origin || 'HBL'} ➔ {selectedRoute.destination || 'TNF'} ({selectedRoute.corridorDistance || selectedRoute.distance} km)
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('operation_mode', 'Operation Mode')}</Text>
                <Text style={[styles.ruleVal, { color: isSplitDuty ? '#0284c7' : '#15803d', fontWeight: '800' }]}>
                  {isSplitDuty
                    ? `⚡ ${t('split_duty', 'Split Duty')} (${chargingOccCount} Mid-Duty Charge Scheduled)`
                    : t('single_charge_operation', 'Single Charge Operation')}
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('total_distance', 'Total distance')}</Text>
                <Text style={[styles.ruleVal, { color: '#0284c7', fontWeight: '800' }]}>{matchedSched?.totalGroupDistance || matchedSched?.distance || selectedRoute.distance} km</Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('route_category', 'Route category')}</Text>
                <Text style={styles.ruleVal}>
                  {(complexity === 'moderate' || complexity === 'standard') ? 'STANDARD / MODERATE' : complexity.toUpperCase()}
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleLabel}>{t('time_category', 'Time category')}</Text>
                <Text style={[styles.ruleVal, { color: timeCatInfo?.isPeak ? '#b45309' : '#0369a1', fontWeight: '800' }]}>
                  🕒 {timeCatInfo?.label || 'Normal'}
                </Text>
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
                <Text style={[styles.ruleVal, isManualOverride ? { color: '#d97706', fontWeight: '800' } : { color: '#15803d', fontWeight: '800' }]}>
                  {isManualOverride ? `⚠️ ${t('manual_override', 'Manual Override')}` : `✅ ${t('timetable_scheduled', 'Timetable Scheduled')}`}
                </Text>
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
          </>
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
              {availableRoutes.map((r) => {
                const rPendCheck = isTargetPendingDeletion
                  ? isTargetPendingDeletion({ depotId: depotNum, routeCode: r.code || r.id })
                  : { pending: false };
                return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickerItem, r.id === selectedRoute?.id && styles.pickerItemActive]}
                  onPress={() => handleSelectRoute(r)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.pickerItemTitle}>{r.code} — {r.fullName || r.name}</Text>
                      {rPendCheck.pending && (
                        <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#b91c1c' }}>⏳ PAUSED (Pending Deletion)</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.pickerItemSub}>
                      GTFS Distance: {r.distance} km • Category {r.requiredCat} ({r.category})
                    </Text>
                  </View>
                  {r.id === selectedRoute?.id && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
                );
              })}
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
            <ScrollView style={{ maxHeight: 380 }}>
              {(selectedRoute?.timetables || []).map((t) => {
                const routeCode = String(selectedRoute?.code || selectedRoute?.id || '').toUpperCase().trim();
                const schedulesList = (selectedRoute?.schedules && selectedRoute.schedules.length > 0)
                  ? selectedRoute.schedules
                  : DEFAULT_DATASET_SCHEDULES.filter((s) => String(s.route || '').toUpperCase().trim() === routeCode);
                const sched = schedulesList.find((s) => (s.departureTime || s.outTime || '').trim().toLowerCase() === String(t).trim().toLowerCase()) ||
                              schedulesList.find((s) => (s.departureTime || s.outTime || '').startsWith(String(t).substring(0, 5)));
                const slotTimeCat = getTimeCategory(t, selectedRoute, sched);
                const slotBadgeBg = slotTimeCat?.key === 'EXTREME_PEAK' ? '#fef2f2' : (slotTimeCat?.key === 'PEAK' ? '#fef3c7' : '#ecfdf5');
                const slotBadgeBorder = slotTimeCat?.key === 'EXTREME_PEAK' ? '#fca5a5' : (slotTimeCat?.key === 'PEAK' ? '#fde68a' : '#a7f3d0');
                const slotBadgeText = slotTimeCat?.key === 'EXTREME_PEAK' ? '#b91c1c' : (slotTimeCat?.key === 'PEAK' ? '#b45309' : '#047857');
                const slotShortLabel = slotTimeCat?.key === 'EXTREME_PEAK' ? 'Extreme Peak' : (slotTimeCat?.key === 'PEAK' ? 'Peak' : 'Normal');
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pickerItem, t === scheduledTime && styles.pickerItemActive]}
                    onPress={() => {
                      setScheduledTime(t);
                      setTimePickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingVertical: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={styles.pickerItemTitle}>🕒 {formatDualTime(t)}</Text>
                        <View style={{ backgroundColor: slotBadgeBg, borderWidth: 1, borderColor: slotBadgeBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: slotBadgeText }}>{slotShortLabel}</Text>
                        </View>
                      </View>
                      {sched ? (
                        <Text style={{ fontSize: 11.5, color: '#0284c7', fontWeight: '700', marginTop: 2 }}>
                          Sub-Route: {sched.scheduleId} ({sched.totalGroupDistance || sched.distance} km • {sched.shift})
                        </Text>
                      ) : null}
                    </View>
                    {t === scheduledTime && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
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
                const drvNorm = drv.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const assignedDuty = (allocatedDuties || []).find((d) => {
                  const dDriver = String(d.driver || d.driverName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  return dDriver && drvNorm && (dDriver === drvNorm || dDriver.includes(drvNorm) || drvNorm.includes(dDriver));
                });
                return (
                  <TouchableOpacity
                    key={drv.id}
                    style={[
                      styles.pickerItem,
                      isSelected && styles.pickerItemActive,
                      assignedDuty && { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }
                    ]}
                    onPress={() => {
                      if (assignedDuty) {
                        Alert.alert(
                          '⚠️ Driver Unavailable',
                          `Driver "${drv.name}" is already assigned to Route ${assignedDuty.routeCode || assignedDuty.busNumber} on Bus ${assignedDuty.bm || assignedDuty.bmNumber}.\n\nA driver cannot be allocated when already assigned to some other route. Please choose an available driver.`
                        );
                        return;
                      }
                      setSelectedDriver(drv);
                      setDriverNameInput(drv.name);
                      setDriverError('');
                      setDriverPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemTitle, assignedDuty && { color: '#991b1b' }]}>👤 {drv.name}</Text>
                      {assignedDuty && (
                        <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '700', marginTop: 2 }}>
                          ⚠️ Assigned to Route {assignedDuty.routeCode || assignedDuty.busNumber}
                        </Text>
                      )}
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

      {/* ── MODAL: RELAY ALERTS (BELL ICON DRAWER) ── */}
      <Modal visible={relayModalOpen} transparent animationType="fade" onRequestClose={() => setRelayModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 540 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>🔔</Text>
                <View>
                  <Text style={styles.modalHeaderTitle}>Pending Second Bus Allocations</Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>Routes requiring relay bus (NOT Single Charge Operation)</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setRelayModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420, padding: 14 }}>
              {Object.keys(pendingRelayRoutes).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>All Routes Fully Serviced</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>No routes are currently pending a second bus relay allocation.</Text>
                </View>
              ) : (
                Object.values(pendingRelayRoutes).map((item) => (
                  <View key={item.route} style={styles.relayCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#991b1b' }}>🚨 Route {item.route}</Text>
                      <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#991b1b' }}>NOT SINGLE CHARGE</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17, marginBottom: 8 }}>
                      <Text style={{ fontWeight: '700' }}>1st Bus Completed:</Text> {item.firstBus} {item.reg ? `(${item.reg})` : ''} at {item.completedAt}.{'\n'}
                      This route requires mandatory opportunity charging or exceeds single-charge range. A second bus from <Text style={{ fontWeight: '700' }}>Depot {item.depot}</Text> must be allocated to complete the schedule.
                    </Text>
                    <TouchableOpacity
                      style={styles.relayAllocateBtn}
                      onPress={() => selectRelayRouteAndAllocate(item.route, item.depot)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '800' }}>🚌 Allocate 2nd Bus Now</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: 5-MINUTE RECURRING POP-UP ALERT ── */}
      <Modal visible={relayPopupOpen} transparent animationType="fade" onRequestClose={() => { setRelayPopupOpen(false); lastPopupTimeRef.current = Date.now(); }}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 500, borderTopWidth: 6, borderTopColor: '#ef4444' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>🚨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#991b1b' }}>Action Required: Second Bus Allocation</Text>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#dc2626' }}>NOT SINGLE CHARGE OPERATION</Text>
              </View>
            </View>

            {activePopupItem && (
              <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>
                  Route {activePopupItem.route} in Depot {activePopupItem.depot} needs an immediate second bus!
                </Text>
                <Text style={{ fontSize: 11.5, color: '#991b1b', lineHeight: 16 }}>
                  • 1st Bus Completed: {activePopupItem.firstBus} ({activePopupItem.reg || 'KA51'}) at {activePopupItem.completedAt}{'\n'}
                  • Reason: Non-Single Charge Operation (Mandatory Mid-route Charging / Long Corridor){'\n'}
                  • Action: Allocate another available bus from Depot {activePopupItem.depot} to complete the schedule.
                </Text>
              </View>
            )}

            <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, color: '#b45309', fontWeight: '600' }}>
                ⏱️ This reminder will repeat <Text style={{ fontWeight: '800' }}>every 5 minutes</Text> until another bus from this depot is allocated to complete the schedule.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f1f5f9' }}
                onPress={() => {
                  setRelayPopupOpen(false);
                  lastPopupTimeRef.current = Date.now();
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569' }}>⏱️ Remind in 5 Mins</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#0284c7' }}
                onPress={() => {
                  if (activePopupItem) {
                    selectRelayRouteAndAllocate(activePopupItem.route, activePopupItem.depot);
                  }
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#ffffff' }}>🚌 Allocate 2nd Bus Now</Text>
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
  headerBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
    marginRight: 2,
  },
  bellRedDot: {
    position: 'absolute',
    top: 3,
    left: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 10,
  },
  bellNumberBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
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
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
  },
  relayCard: {
    backgroundColor: '#fff5f5',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  relayAllocateBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    outlineStyle: 'none',
    outlineWidth: 0,
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
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  candidateHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  candidateTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 180,
  },
  candidateTitleIcon: {
    fontSize: 22,
  },
  candidateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    flexWrap: 'wrap',
  },
  candidateSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 16,
  },
  candidateCountBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  candidateCountBadgeText: {
    fontSize: 11.5,
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
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    boxSizing: 'border-box',
    marginTop: 4,
    marginBottom: 14,
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
    flexWrap: 'wrap',
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
