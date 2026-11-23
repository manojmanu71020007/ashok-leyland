/**
 * Ashok Leyland Fleet Management System
 * Master Route & Schedule Dataset / Database Service
 * 
 * Centralized, synchronized repository for:
 *  - Depot 1, Depot 2, and all dynamically registered depots.
 *  - All route definitions, distances, origins, destinations, and full duty profiles.
 *  - Route Complexity (Simple, Standard, Moderate, Complex) with real-time editing & persistence.
 *  - Timetables & Time Complexity (Extreme Peak, Peak, Normal) with real-time editing & persistence.
 *  - Master timetable schedule duties for intelligent EV dispatch allocation.
 */

import { api } from '../api/client.js';

const DATASET_STORAGE_KEY = 'depot_app_master_route_dataset';
const DATASET_DELETED_DEPOTS_KEY = 'depot_app_dataset_deleted_depots';

// ── Default Base Master Dataset (Depot 1 & Depot 2) ──
const INITIAL_MASTER_DATASET = {
  version: '4.0',
  name: 'Ashok Leyland EV Fleet - Master Route & Schedule Database',
  lastUpdated: new Date().toISOString(),
  depots: [
    {
      id: '1',
      number: '1',
      name: 'Depot 1 (Chandapura)',
      shortName: 'Depot 1',
      location: 'Chandapura (BMT-32)',
      isDefault: true,
      routes: ['356Z', '360K', '600F', 'KBS3A'],
    },
    {
      id: '2',
      number: '2',
      name: 'Depot 2 (Attibele / Hoskote)',
      shortName: 'Depot 2',
      location: 'Attibele / Hoskote',
      isDefault: true,
      routes: ['361C', '399C', '328H', '500DC', 'KBS3F'],
    },
  ],
  routes: [
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
        "fullDutyKm": 126.28,
        "actualKm": 126.28,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 64,
        "timeComplexity": "Normal",
        "timetables": [
            "07:15 AM",
            "08:30 AM",
            "01:10 PM",
            "01:45 PM",
            "02:00 PM",
            "02:25 PM",
            "02:35 PM"
        ],
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
                "singleChargeReqKm": 126.28
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
                "singleChargeReqKm": 126.28
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
                "singleChargeReqKm": 126.28
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
                "singleChargeReqKm": 126.28
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
                "singleChargeReqKm": 126.28
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
                "singleChargeReqKm": 126.28
            }
        ],
        "revenueKm": 112.0,
        "corridorDistance": 11.2,
        "singleChargeReqKm": 126.28
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
        "distance": 143.2,
        "fullDutyKm": 180.18,
        "actualKm": 180.18,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 82,
        "timeComplexity": "Peak",
        "timetables": [
            "07:00 AM",
            "08:15 AM",
            "09:55 AM",
            "10:00 AM",
            "12:05 PM",
            "01:10 PM",
            "02:05 PM",
            "02:15 PM",
            "02:25 PM",
            "02:35 PM",
            "02:45 PM",
            "06:30 PM"
        ],
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
                "singleChargeReqKm": 180.18
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
                "singleChargeReqKm": 180.18
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
                "singleChargeReqKm": 180.18
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
                "singleChargeReqKm": 180.18
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
                "singleChargeReqKm": 180.18
            }
        ],
        "revenueKm": 143.2,
        "corridorDistance": 35.8,
        "singleChargeReqKm": 180.18
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
        "fullDutyKm": 157.96,
        "actualKm": 157.96,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 57,
        "timeComplexity": "Peak",
        "timetables": [
            "06:05 AM",
            "07:25 AM",
            "09:35 AM",
            "11:20 AM",
            "12:30 PM",
            "12:40 PM",
            "12:50 PM",
            "01:00 PM",
            "01:10 PM",
            "01:15 PM",
            "01:25 PM",
            "01:35 PM",
            "01:45 PM",
            "02:05 PM",
            "02:35 PM",
            "03:45 PM"
        ],
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
                "singleChargeReqKm": 157.96
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
                "singleChargeReqKm": 157.96
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
                "singleChargeReqKm": 157.96
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
                "singleChargeReqKm": 157.96
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
                "singleChargeReqKm": 157.96
            }
        ],
        "revenueKm": 86.4,
        "corridorDistance": 28.8,
        "singleChargeReqKm": 157.96
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
        "fullDutyKm": 127.49,
        "actualKm": 127.49,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 81,
        "timeComplexity": "Moderate",
        "timetables": [
            "06:35 AM",
            "07:10 AM",
            "09:00 AM",
            "10:10 AM",
            "12:15 PM",
            "01:10 PM",
            "01:35 PM",
            "02:05 PM",
            "02:35 PM",
            "03:05 PM"
        ],
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
                "singleChargeReqKm": 127.49
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
                "singleChargeReqKm": 127.49
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
                "singleChargeReqKm": 127.49
            }
        ],
        "revenueKm": 140.8,
        "corridorDistance": 35.2,
        "singleChargeReqKm": 127.49
    },
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
        "fullDutyKm": 141.79,
        "actualKm": 141.79,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 74,
        "timeComplexity": "Peak",
        "timetables": [
            "01:10 PM",
            "01:30 PM",
            "01:50 PM",
            "02:10 PM",
            "02:30 PM",
            "02:50 PM",
            "03:10 PM",
            "03:30 PM",
            "03:50 PM"
        ],
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
                "singleChargeReqKm": 141.79
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
                "singleChargeReqKm": 141.79
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
                "singleChargeReqKm": 141.79
            }
        ],
        "revenueKm": 253.8,
        "corridorDistance": 38.0,
        "singleChargeReqKm": 141.79
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
        "fullDutyKm": 146.03,
        "actualKm": 146.03,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 82,
        "timeComplexity": "Peak",
        "timetables": [
            "01:15 PM",
            "02:00 PM",
            "02:40 PM",
            "03:35 PM"
        ],
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
                "singleChargeReqKm": 146.03
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
                "singleChargeReqKm": 146.03
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
                "singleChargeReqKm": 146.03
            }
        ],
        "revenueKm": 143.0,
        "corridorDistance": 34.5,
        "singleChargeReqKm": 146.03
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
        "fullDutyKm": 159.5,
        "actualKm": 159.5,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 78,
        "timeComplexity": "Peak",
        "timetables": [
            "01:00 PM",
            "01:10 PM",
            "01:20 PM",
            "01:30 PM",
            "01:45 PM",
            "01:50 PM",
            "02:00 PM",
            "02:10 PM",
            "02:15 PM",
            "02:30 PM",
            "02:45 PM",
            "03:00 PM"
        ],
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
                "singleChargeReqKm": 159.5
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
                "singleChargeReqKm": 159.5
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
                "singleChargeReqKm": 159.5
            }
        ],
        "revenueKm": 269.4,
        "corridorDistance": 40.0,
        "singleChargeReqKm": 159.5
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
        "fullDutyKm": 188.54,
        "actualKm": 188.54,
        "chargingOcc": 1,
        "noChargingOcc": 1,
        "splitDuty": true,
        "singleChargeReqKm": 188.54,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 50,
        "timeComplexity": "Peak",
        "timetables": [
            "07:45 AM",
            "08:00 AM",
            "08:15 AM",
            "08:30 AM",
            "10:55 AM",
            "11:10 AM",
            "11:25 AM",
            "11:40 AM",
            "01:10 PM",
            "02:15 PM",
            "03:45 PM"
        ],
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
                "singleChargeReqKm": 188.54,
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
                "singleChargeReqKm": 188.54,
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
                "singleChargeReqKm": 188.54,
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
                "singleChargeReqKm": 188.54,
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
                "singleChargeReqKm": 188.54,
                "chargingOcc": 1,
                "noChargingOcc": 1,
                "splitDuty": true
            }
        ],
        "revenueKm": 86.1,
        "corridorDistance": 49.1
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
        "fullDutyKm": 209.88,
        "actualKm": 209.88,
        "routeComplexity": "Standard",
        "category": "Standard",
        "requiredCat": "B",
        "drainSoc": 74,
        "timeComplexity": "Normal",
        "timetables": [
            "07:15 AM",
            "08:45 AM",
            "09:45 AM",
            "10:05 AM",
            "10:10 AM",
            "10:20 AM",
            "01:10 PM",
            "01:50 PM",
            "02:10 PM",
            "02:30 PM",
            "03:45 PM"
        ],
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
                "singleChargeReqKm": 209.88
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
                "singleChargeReqKm": 209.88
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
                "singleChargeReqKm": 209.88
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
                "singleChargeReqKm": 209.88
            }
        ],
        "revenueKm": 128.4,
        "corridorDistance": 35.2,
        "singleChargeReqKm": 209.88
    }
],
  timeComplexityConfig: {
    EXTREME_PEAK: {
      key: 'EXTREME_PEAK',
      label: 'Extreme Peak',
      description: '07:00-10:00 & 16:00-20:00 (Heavy traffic congestion, maximum passenger loading)',
      hours: ['07:00-10:00', '16:00-20:00'],
      drainMultiplier: 1.30,
      requiredBusCat: 'A',
    },
    PEAK: {
      key: 'PEAK',
      label: 'Peak',
      description: '10:00-16:00 & 20:00-23:00 (Moderate-to-high urban transit flow)',
      hours: ['10:00-16:00', '20:00-23:00'],
      drainMultiplier: 1.15,
      requiredBusCat: 'A',
    },
    NORMAL: {
      key: 'NORMAL',
      label: 'Normal (Off-Peak)',
      description: '05:00-07:00 & 23:00-05:00 (Free flowing corridor operation)',
      hours: ['05:00-07:00', '23:00-05:00'],
      drainMultiplier: 1.00,
      requiredBusCat: 'B',
    },
  },
};

let masterDataset = JSON.parse(JSON.stringify(INITIAL_MASTER_DATASET));
let deletedDepotIds = new Set();
const datasetListeners = new Set();

// ── Load from LocalStorage (Web) ──
try {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
    const savedDeleted = localStorage.getItem(DATASET_DELETED_DEPOTS_KEY);
    if (savedDeleted) {
      const arr = JSON.parse(savedDeleted);
      if (Array.isArray(arr)) {
        deletedDepotIds = new Set(arr.map(String));
      }
    }
    const savedData = localStorage.getItem(DATASET_STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed && Array.isArray(parsed.depots) && Array.isArray(parsed.routes)) {
        const coreCodes = ['356Z', '360K', '600F', 'KBS3A', '361C', '399C', '328H', '500DC', 'KBS3F'];
        const hasLegacy = parsed.version !== '4.0' || (parsed.routes || []).some((r) => 
          (r.name && (r.name.includes('Hebbal') || r.name.includes('Whitefield') || r.name.includes('Tin Factory') || r.name.includes('Direct Express') || r.name.includes('Chandapura ➔') || r.name.includes('Attibele ➔') || r.name.includes('Kempegowda')))
        );
        if (hasLegacy) {
          const customRoutes = (parsed.routes || []).filter((r) => !coreCodes.includes(String(r.code).toUpperCase().trim()));
          masterDataset = {
            ...INITIAL_MASTER_DATASET,
            version: '4.0',
            depots: parsed.depots ? parsed.depots.filter((d) => !deletedDepotIds.has(String(d.id))) : INITIAL_MASTER_DATASET.depots,
            routes: [...INITIAL_MASTER_DATASET.routes, ...customRoutes].filter((r) => !deletedDepotIds.has(String(r.depotId))),
          };
          localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(masterDataset));
        } else {
          masterDataset = {
            ...INITIAL_MASTER_DATASET,
            ...parsed,
            depots: parsed.depots.filter((d) => !deletedDepotIds.has(String(d.id))),
            routes: parsed.routes.filter((r) => !deletedDepotIds.has(String(r.depotId))),
          };
        }
      }
    }
  }
} catch (e) {
  console.warn('Failed to load local master route dataset:', e);
}

function persistDataset() {
  try {
    masterDataset.lastUpdated = new Date().toISOString();
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(masterDataset));
      localStorage.setItem(DATASET_DELETED_DEPOTS_KEY, JSON.stringify(Array.from(deletedDepotIds)));
    }
  } catch (e) {
    console.warn('Failed to persist master route dataset:', e);
  }
}

function notifyListeners() {
  datasetListeners.forEach((cb) => {
    try {
      cb(masterDataset);
    } catch (e) {
      console.warn('Dataset listener error:', e);
    }
  });
}

function syncToServer(actionPayload) {
  try {
    if (typeof api !== 'undefined' && api && typeof api.post === 'function') {
      api.post('/api/dataset/routes', {
        ...actionPayload,
        dataset: masterDataset,
        deletedDepotIds: Array.from(deletedDepotIds),
      }).catch(() => {});
    }
  } catch (_) {}
}

// ── Exported API Methods ──

export function subscribeDatasetChanges(callback) {
  if (typeof callback === 'function') {
    datasetListeners.add(callback);
    return () => datasetListeners.delete(callback);
  }
  return () => {};
}

export function getMasterDataset() {
  return masterDataset;
}

export function getDepotsFromDataset() {
  return masterDataset.depots || [];
}

export function getRoutesForDepotFromDataset(depotId) {
  const dId = String(depotId || '1').trim().replace(/^DEPOT\s*/i, '');
  return (masterDataset.routes || []).filter((r) => String(r.depotId).trim() === dId);
}

export function getRouteFromDataset(routeCode, depotId) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = depotId ? String(depotId).trim().replace(/^DEPOT\s*/i, '') : null;
  return (masterDataset.routes || []).find((r) => {
    const rCode = String(r.code || r.id || '').toUpperCase().trim();
    const isAlias = Array.isArray(r.aliases) && r.aliases.some((a) => String(a).toUpperCase().trim() === cleanCode);
    const matchCode = (rCode === cleanCode) || isAlias || (cleanCode === 'KBES3F' && rCode === 'KBS3F') || (cleanCode === 'KBS3F' && rCode === 'KBES3F');
    if (!matchCode) return false;
    if (dId) return String(r.depotId).trim() === dId;
    return true;
  }) || null;
}

/**
 * Adds a new depot to the Master Dataset
 */
export function addDepotToDataset({ id, name, location, routes = [] }) {
  const cleanId = String(id || '').trim().replace(/^DEPOT\s*/i, '');
  if (!cleanId) throw new Error('Depot ID is required');

  deletedDepotIds.delete(cleanId);

  const existingIdx = masterDataset.depots.findIndex((d) => String(d.id) === cleanId);
  const depotObj = {
    id: cleanId,
    number: cleanId,
    name: name || `Depot ${cleanId}`,
    shortName: `Depot ${cleanId}`,
    location: location || `Depot ${cleanId} Terminal`,
    routes: Array.isArray(routes) ? routes : [],
    isDefault: false,
  };

  if (existingIdx >= 0) {
    masterDataset.depots[existingIdx] = { ...masterDataset.depots[existingIdx], ...depotObj };
  } else {
    masterDataset.depots.push(depotObj);
  }

  persistDataset();
  notifyListeners();
  syncToServer({ action: 'add_depot', depot: depotObj });
  return depotObj;
}

/**
 * Permanently deletes a depot and cascades to remove all its routes & schedules from the Master Dataset
 */
export function deleteDepotFromDataset(depotId) {
  const cleanId = String(depotId || '').trim().replace(/^DEPOT\s*/i, '');
  if (!cleanId) return;

  deletedDepotIds.add(cleanId);

  masterDataset.depots = masterDataset.depots.filter((d) => String(d.id) !== cleanId);
  masterDataset.routes = masterDataset.routes.filter((r) => String(r.depotId) !== cleanId);

  persistDataset();
  notifyListeners();
  syncToServer({ action: 'delete_depot', depotId: cleanId });
}

/**
 * Adds a new route to a depot in the Master Dataset with full route, timetable, complexity, and schedule metadata
 */
export function addRouteToDataset(depotId, routeData) {
  const dId = String(depotId || '1').trim().replace(/^DEPOT\s*/i, '');
  const cleanCode = String(routeData.code || routeData.shortName || routeData.id || '').toUpperCase().trim();
  if (!cleanCode) throw new Error('Route code is required');

  const dist = Number(routeData.distance) || 25.0;
  const orig = String(routeData.origin || `Depot ${dId} Terminal`).trim();
  const dest = String(routeData.destination || 'Central Terminal').trim();
  const fName = String(routeData.fullName || routeData.name || `${orig} ➔ ${dest} (${cleanCode})`).trim();

  // Auto-evaluate route complexity if not explicitly provided
  let routeComp = routeData.routeComplexity || routeData.complexity;
  if (!routeComp) {
    if (dist > 35) routeComp = 'Complex';
    else if (dist >= 30) routeComp = 'Moderate';
    else if (dist < 25) routeComp = 'Simple';
    else routeComp = 'Standard';
  }

  // Auto-evaluate required bus category based on route complexity
  const reqCat = routeData.requiredCat || (routeComp === 'Complex' ? 'A' : (routeComp === 'Moderate' ? 'B' : 'B'));

  const timetables = Array.isArray(routeData.timetables) && routeData.timetables.length > 0
    ? routeData.timetables
    : ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'];

  const timeComplexity = routeData.timeComplexity || 'Normal';

  // Build time complexity slots
  const timeComplexitySlots = { ...(routeData.timeComplexitySlots || {}) };
  timetables.forEach((t) => {
    if (!timeComplexitySlots[t]) {
      const hour = parseInt(t.split(':')[0], 10);
      const isPm = /pm/i.test(t);
      const h24 = isPm && hour < 12 ? hour + 12 : (!isPm && hour === 12 ? 0 : hour);
      if ((h24 >= 7 && h24 < 10) || (h24 >= 16 && h24 < 20)) {
        timeComplexitySlots[t] = 'Extreme Peak';
      } else if ((h24 >= 10 && h24 < 16) || (h24 >= 20 && h24 < 23)) {
        timeComplexitySlots[t] = 'Peak';
      } else {
        timeComplexitySlots[t] = 'Normal';
      }
    }
  });

  // Generate simulated schedule duties for this route
  const schedules = timetables.map((t, idx) => ({
    scheduleId: `${cleanCode}/${idx + 1}`,
    shift: idx < 2 ? 'General Shift' : (idx < 4 ? 'Shift B' : 'Night Halt'),
    outTime: t,
    inTime: '15:15:00',
    category: routeComp,
    singleChargeReqKm: Math.round(dist * 1.5),
  }));

  const routeObj = {
    code: cleanCode,
    id: cleanCode,
    depotId: dId,
    name: `${orig} ➔ ${dest} (${cleanCode})`,
    fullName: fName,
    shortName: routeData.shortName || cleanCode,
    origin: orig,
    destination: dest,
    distance: dist,
    fullDutyKm: routeData.fullDutyKm || parseFloat((dist * 2).toFixed(1)),
    routeComplexity: routeComp,
    category: routeComp,
    requiredCat: reqCat,
    drainSoc: routeData.drainSoc || Math.min(95, Math.max(12, Math.round(dist * 0.85))),
    timeComplexity: timeComplexity,
    timetables: timetables,
    timeComplexitySlots: timeComplexitySlots,
    schedules: schedules,
  };

  // 1. Update routes array
  const existingRouteIdx = masterDataset.routes.findIndex(
    (r) => String(r.code).toUpperCase().trim() === cleanCode && String(r.depotId).trim() === dId
  );
  if (existingRouteIdx >= 0) {
    masterDataset.routes[existingRouteIdx] = routeObj;
  } else {
    masterDataset.routes.push(routeObj);
  }

  // 2. Update depot's routes array
  const depotIdx = masterDataset.depots.findIndex((d) => String(d.id).trim() === dId);
  if (depotIdx >= 0) {
    if (!masterDataset.depots[depotIdx].routes.includes(cleanCode)) {
      masterDataset.depots[depotIdx].routes.push(cleanCode);
    }
  }

  persistDataset();
  notifyListeners();
  syncToServer({ action: 'add_route', depotId: dId, route: routeObj });
  return routeObj;
}

/**
 * Permanently removes a route and its schedules from a depot in the Master Dataset
 */
export function deleteRouteFromDataset(depotId, routeCode) {
  const dId = String(depotId || '1').trim().replace(/^DEPOT\s*/i, '');
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  if (!cleanCode) return;

  masterDataset.routes = masterDataset.routes.filter(
    (r) => !(String(r.code).toUpperCase().trim() === cleanCode && String(r.depotId).trim() === dId)
  );

  const depotIdx = masterDataset.depots.findIndex((d) => String(d.id).trim() === dId);
  if (depotIdx >= 0) {
    masterDataset.depots[depotIdx].routes = masterDataset.depots[depotIdx].routes.filter(
      (code) => String(code).toUpperCase().trim() !== cleanCode
    );
  }

  persistDataset();
  notifyListeners();
  syncToServer({ action: 'delete_route', depotId: dId, routeCode: cleanCode });
}

/**
 * Updates Route Complexity (Simple, Standard, Moderate, Complex) for any route across any depot
 */
export function updateRouteComplexityInDataset(routeCode, depotId, newComplexity) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = depotId ? String(depotId).trim().replace(/^DEPOT\s*/i, '') : null;
  const validComp = ['Simple', 'Standard', 'Moderate', 'Complex'].find(
    (c) => c.toLowerCase() === String(newComplexity).toLowerCase().trim()
  ) || 'Standard';

  let found = false;
  masterDataset.routes.forEach((r) => {
    const matchCode = String(r.code || r.id).toUpperCase().trim() === cleanCode;
    const matchDepot = dId ? String(r.depotId).trim() === dId : true;
    if (matchCode && matchDepot) {
      r.routeComplexity = validComp;
      r.category = validComp;
      if (validComp === 'Complex') r.requiredCat = 'A';
      else if (validComp === 'Moderate') r.requiredCat = 'B';
      found = true;
    }
  });

  if (found) {
    persistDataset();
    notifyListeners();
    syncToServer({ action: 'update_route_complexity', routeCode: cleanCode, depotId: dId, routeComplexity: validComp });
  }
  return found;
}

/**
 * Updates Time Complexity (Normal, Peak, Extreme Peak) for a route or specific timetable slot
 */
export function updateTimeComplexityInDataset(routeCode, depotId, newTimeComplexity, timeSlot = null) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = depotId ? String(depotId).trim().replace(/^DEPOT\s*/i, '') : null;
  const validTime = ['Normal', 'Peak', 'Extreme Peak'].find(
    (tc) => tc.toLowerCase() === String(newTimeComplexity).toLowerCase().trim()
  ) || 'Normal';

  let found = false;
  masterDataset.routes.forEach((r) => {
    const matchCode = String(r.code || r.id).toUpperCase().trim() === cleanCode;
    const matchDepot = dId ? String(r.depotId).trim() === dId : true;
    if (matchCode && matchDepot) {
      if (timeSlot) {
        if (!r.timeComplexitySlots) r.timeComplexitySlots = {};
        r.timeComplexitySlots[timeSlot] = validTime;
      } else {
        r.timeComplexity = validTime;
      }
      found = true;
    }
  });

  if (found) {
    persistDataset();
    notifyListeners();
    syncToServer({ action: 'update_time_complexity', routeCode: cleanCode, depotId: dId, timeComplexity: validTime, timeSlot });
  }
  return found;
}

/**
 * Updates Route Timetables list for a route
 */
export function updateRouteTimetablesInDataset(routeCode, depotId, timetables) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = depotId ? String(depotId).trim().replace(/^DEPOT\s*/i, '') : null;
  if (!Array.isArray(timetables) || timetables.length === 0) return false;

  let found = false;
  masterDataset.routes.forEach((r) => {
    const matchCode = String(r.code || r.id).toUpperCase().trim() === cleanCode;
    const matchDepot = dId ? String(r.depotId).trim() === dId : true;
    if (matchCode && matchDepot) {
      r.timetables = timetables;
      found = true;
    }
  });

  if (found) {
    persistDataset();
    notifyListeners();
    syncToServer({ action: 'update_timetables', routeCode: cleanCode, depotId: dId, timetables });
  }
  return found;
}

/**
 * Adds a new departure time to an existing route's timetables and syncs to dataset
 */
export function addDepartureTimeToRoute(routeCode, depotId, departureTime) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = depotId ? String(depotId).trim().replace(/^DEPOT\s*/i, '') : null;
  const cleanTime = String(departureTime || '').trim();
  if (!cleanCode || !cleanTime) return false;

  let found = false;
  masterDataset.routes.forEach((r) => {
    const matchCode = String(r.code || r.id).toUpperCase().trim() === cleanCode;
    const matchDepot = dId ? String(r.depotId).trim() === dId : true;
    if (matchCode && matchDepot) {
      if (!Array.isArray(r.timetables)) r.timetables = [];
      if (!r.timetables.includes(cleanTime)) {
        r.timetables.push(cleanTime);
        r.timetables.sort((a, b) => {
          const parseMin = (t) => {
            const m = String(t).match(/^(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            if (!m) return 0;
            let h = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            const isPm = /pm/i.test(m[3] || '');
            if (isPm && h < 12) h += 12;
            if (!isPm && h === 12) h = 0;
            return h * 60 + min;
          };
          return parseMin(a) - parseMin(b);
        });
        found = true;
      }
    }
  });

  if (found) {
    persistDataset();
    notifyListeners();
    syncToServer({ action: 'add_departure_time', routeCode: cleanCode, depotId: dId, departureTime: cleanTime });
  }
  return found;
}

/**
 * Synchronizes in-memory dataset with server data
 */
export function syncDatasetWithServer(remoteDataset, remoteDeletedIds) {
  if (!remoteDataset || typeof remoteDataset !== 'object') return;
  let changed = false;

  if (Array.isArray(remoteDeletedIds)) {
    remoteDeletedIds.forEach((id) => {
      const cId = String(id || '').trim();
      if (cId && !deletedDepotIds.has(cId)) {
        deletedDepotIds.add(cId);
        changed = true;
      }
    });
  }

  // Merge remote depots
  if (Array.isArray(remoteDataset.depots)) {
    remoteDataset.depots.forEach((rDepot) => {
      if (!rDepot || !rDepot.id || deletedDepotIds.has(String(rDepot.id))) return;
      const existingIdx = masterDataset.depots.findIndex((d) => String(d.id) === String(rDepot.id));
      if (existingIdx >= 0) {
        masterDataset.depots[existingIdx] = { ...masterDataset.depots[existingIdx], ...rDepot };
      } else {
        masterDataset.depots.push(rDepot);
        changed = true;
      }
    });
  }

  // Merge remote routes
  if (Array.isArray(remoteDataset.routes)) {
    remoteDataset.routes.forEach((rRoute) => {
      if (!rRoute || !rRoute.code || deletedDepotIds.has(String(rRoute.depotId))) return;
      const existingIdx = masterDataset.routes.findIndex(
        (r) => String(r.code).toUpperCase().trim() === String(rRoute.code).toUpperCase().trim() && String(r.depotId) === String(rRoute.depotId)
      );
      if (existingIdx >= 0) {
        masterDataset.routes[existingIdx] = { ...masterDataset.routes[existingIdx], ...rRoute };
      } else {
        masterDataset.routes.push(rRoute);
        changed = true;
      }
    });
  }

  if (changed) {
    persistDataset();
    notifyListeners();
  }
}

export function parseTimeToMinutes(t) {
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
}

export function getTimeCategory(timeStr, routeObj = null) {
  if (routeObj && typeof routeObj === 'object') {
    if (routeObj.timeComplexitySlots && timeStr && routeObj.timeComplexitySlots[timeStr]) {
      const slot = String(routeObj.timeComplexitySlots[timeStr]).toUpperCase();
      if (slot.includes('EXTREME')) {
        return { key: 'EXTREME_PEAK', label: `Extreme Peak (${timeStr})`, isPeak: true };
      }
      if (slot.includes('PEAK')) {
        return { key: 'PEAK', label: `Peak (${timeStr})`, isPeak: true };
      }
      if (slot.includes('NORM')) {
        return { key: 'NORMAL', label: `Normal (${timeStr})`, isPeak: false };
      }
    }
    if (routeObj.timeComplexity) {
      const tc = String(routeObj.timeComplexity).toUpperCase();
      if (tc.includes('EXTREME')) {
        return { key: 'EXTREME_PEAK', label: 'Extreme Peak (Route Override)', isPeak: true };
      }
      if (tc.includes('PEAK')) {
        return { key: 'PEAK', label: 'Peak (Route Override)', isPeak: true };
      }
    }
  }

  const depMin = parseTimeToMinutes(timeStr || '12:00');
  const departHours = depMin / 60;
  if (departHours >= 5 && departHours < 7) {
    return { key: 'NORMAL', label: 'Normal (05:00-07:00)', isPeak: false };
  } else if ((departHours >= 7 && departHours < 10) || (departHours >= 16 && departHours < 20)) {
    return { key: 'EXTREME_PEAK', label: 'Extreme Peak (07:00-10:00 & 16:00-20:00)', isPeak: true };
  } else if ((departHours >= 10 && departHours < 16) || (departHours >= 20 && departHours < 23)) {
    return { key: 'PEAK', label: 'Peak (10:00-16:00 & 20:00-23:00)', isPeak: true };
  }
  return { key: 'NORMAL', label: 'Normal (Off-Peak)', isPeak: false };
}

export function getRouteComplexity(distOrRoute, matchedSched, depTimeStr) {
  let routeCode = null;
  let depotId = null;
  if (distOrRoute && typeof distOrRoute === 'object') {
    routeCode = distOrRoute.code || distOrRoute.id || distOrRoute.shortName;
    depotId = distOrRoute.depot || distOrRoute.depotId;
  } else if (matchedSched && matchedSched.route) {
    routeCode = matchedSched.route;
  }
  if (routeCode) {
    const dsRoute = getRouteFromDataset(routeCode, depotId);
    if (dsRoute && (dsRoute.category || dsRoute.routeComplexity)) {
      const sc = String(dsRoute.category || dsRoute.routeComplexity).toLowerCase();
      if (sc.includes('comp')) return 'complex';
      if (sc.includes('mod')) return 'moderate';
      if (sc.includes('stand')) return 'standard';
      if (sc.includes('simp')) return 'simple';
    }
  }

  if (matchedSched && matchedSched.category) {
    const sc = String(matchedSched.category).toLowerCase();
    if (sc.includes('comp')) return 'complex';
    if (sc.includes('mod')) return 'moderate';
    if (sc.includes('stand')) return 'standard';
    if (sc.includes('simp')) return 'simple';
  }
  let routeObj = (distOrRoute && typeof distOrRoute === 'object') ? distOrRoute : null;
  let dist = (typeof distOrRoute === 'number') ? distOrRoute : (routeObj ? (routeObj.distance || routeObj.distKm) : 0);
  if (routeObj && (routeObj.category || routeObj.routeComplexity)) {
    const sc = String(routeObj.category || routeObj.routeComplexity).toLowerCase();
    if (sc.includes('comp')) return 'complex';
    if (sc.includes('mod')) return 'moderate';
    if (sc.includes('stand')) return 'standard';
    if (sc.includes('simp')) return 'simple';
  }
  const d = Number(dist || 0);
  if (d > 35) return 'complex';
  if (d >= 30) return 'moderate';
  if (d < 25) return 'simple';
  return 'standard';
}

export function getMatrixStatus(complexity, timeCatOrIsPeak) {
  const c = String(complexity || 'standard').toLowerCase();

  let timeCatKey = 'NORMAL';
  if (typeof timeCatOrIsPeak === 'object' && timeCatOrIsPeak !== null) {
    timeCatKey = timeCatOrIsPeak.key || (timeCatOrIsPeak.isPeak ? 'PEAK' : 'NORMAL');
  } else if (typeof timeCatOrIsPeak === 'string') {
    timeCatKey = timeCatOrIsPeak.toUpperCase();
  } else if (typeof timeCatOrIsPeak === 'boolean') {
    timeCatKey = timeCatOrIsPeak ? 'PEAK' : 'NORMAL';
  }

  const isExtPeak = timeCatKey === 'EXTREME_PEAK';
  const isPeakOnly = timeCatKey === 'PEAK';
  const isNormal = timeCatKey === 'NORMAL';

  if (c === 'complex') return 'A';
  if (isExtPeak) return 'A';
  // Standard and Moderate routes: Category C is strictly disallowed under ALL conditions
  if ((c === 'moderate' || c === 'standard') && isPeakOnly) return 'A/B';
  if ((c === 'moderate' || c === 'standard') && isNormal) return 'A/B';
  // Simple route + Peak: Category B is Primary, Category C is 1st Fallback, Category A is 2nd Fallback
  if (c === 'simple' && isPeakOnly) return 'B/C/A';
  // Simple route + Normal: Category C is Primary, Category B is 1st Fallback, Category A is 2nd Fallback
  if (c === 'simple' && isNormal) return 'A/B/C';

  return 'A/B';
}
