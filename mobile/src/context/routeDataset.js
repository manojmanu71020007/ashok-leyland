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
const DATASET_DELETED_ROUTES_KEY = 'depot_app_dataset_deleted_routes';

// ── Default Base Master Dataset (Depot 1 & Depot 2) ──
const INITIAL_MASTER_DATASET = {
  "version": "5.1",
  "name": "Ashok Leyland EV Fleet - Master Route & Schedule Database",
  "lastUpdated": "2026-11-14T15:18:00.000Z",
  "depots": [
    {
      "id": "1",
      "number": "1",
      "name": "Depot 1 (Chandapura)",
      "shortName": "Depot 1",
      "location": "Chandapura (BMT-32)",
      "isDefault": true,
      "routes": [
        "356Z",
        "360K",
        "600F",
        "KBS3A"
      ]
    },
    {
      "id": "2",
      "number": "2",
      "name": "Depot 2 (Attibele / Hoskote)",
      "shortName": "Depot 2",
      "location": "Attibele / Hoskote",
      "isDefault": true,
      "routes": [
        "361C",
        "399C",
        "328H",
        "500DC",
        "KBS3F"
      ]
    }
  ],
  "routes": [
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
      "distance": 114.8,
      "fullDutyKm": 126.28,
      "actualKm": 126.28,
      "routeComplexity": "Standard",
      "category": "Standard",
      "requiredCat": "B",
      "drainSoc": 64,
      "timeComplexity": "Normal",
      "timetables": [
        "06:00 AM",
        "06:15 AM",
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
          "scheduleId": "356Z/7",
          "subRoute": "356Z/7",
          "departureTime": "06:00 AM",
          "outTime": "06:00 AM",
          "inTime": "01:00 PM",
          "totalGroupDistance": 114.8,
          "distance": 114.8,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 12,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 1.4,
              "dep": "06:00 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "06:10 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "06:45 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "07:20 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "08:20 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "09:00 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "09:45 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "10:30 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "11:10 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "11:45 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "12:20 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 1.4,
              "dep": "12:05 PM"
            }
          ]
        },
        {
          "scheduleId": "356Z/6",
          "subRoute": "356Z/6",
          "departureTime": "06:15 AM",
          "outTime": "06:15 AM",
          "inTime": "01:15 PM",
          "totalGroupDistance": 114.8,
          "distance": 114.8,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 12,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 1.4,
              "dep": "06:15 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "06:25 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "07:00 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "08:00 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "08:40 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "09:25 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "10:10 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "10:50 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "11:25 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "12:00 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "12:35 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 1.4,
              "dep": "01:10 PM"
            }
          ]
        },
        {
          "scheduleId": "356Z/7",
          "subRoute": "356Z/7",
          "departureTime": "01:45 PM",
          "outTime": "01:45 PM",
          "inTime": "09:35 PM",
          "totalGroupDistance": 137.2,
          "distance": 137.2,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 14,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 1.4,
              "dep": "01:45 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "01:50 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "02:25 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "03:00 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "03:35 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "04:10 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "05:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "05:45 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "06:25 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "07:05 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "07:45 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "08:20 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "08:55 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 1.4,
              "dep": "09:30 PM"
            }
          ]
        },
        {
          "scheduleId": "356Z/6",
          "subRoute": "356Z/6",
          "departureTime": "02:00 PM",
          "outTime": "02:00 PM",
          "inTime": "09:40 PM",
          "totalGroupDistance": 137.2,
          "distance": 137.2,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 14,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 1.4,
              "dep": "02:00 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "02:05 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "02:40 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "03:15 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "03:50 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "04:40 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "05:15 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "05:55 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "06:35 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "07:15 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "07:50 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "08:25 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "09:00 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 1.4,
              "dep": "09:35 PM"
            }
          ]
        },
        {
          "scheduleId": "356Z/3",
          "subRoute": "356Z/3",
          "departureTime": "02:25 PM",
          "outTime": "02:25 PM",
          "inTime": "12:10 PM",
          "totalGroupDistance": 252.0,
          "distance": 252.0,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 26,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 1.4,
              "dep": "02:25 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "02:35 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "03:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "03:45 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "04:50 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "05:30 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "06:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "06:50 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "07:30 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "08:05 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "08:45 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "09:20 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "09:55 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 1.4,
              "dep": "10:25 PM"
            },
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 1.4,
              "dep": "05:15 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "05:20 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "05:55 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "06:30 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "07:00 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "08:15 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "08:55 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "09:35 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "10:15 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "10:55 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "11:35 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 1.4,
              "dep": "12:05 PM"
            }
          ]
        },
        {
          "scheduleId": "356Z/8",
          "subRoute": "356Z/8",
          "departureTime": "02:35 PM",
          "outTime": "02:35 PM",
          "inTime": "12:20 PM",
          "totalGroupDistance": 252.0,
          "distance": 252.0,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 26,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 1.4,
              "dep": "02:35 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "02:45 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "03:20 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "03:55 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "05:00 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "05:40 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "06:20 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "07:00 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "07:40 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "08:15 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "08:55 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "09:30 PM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "10:05 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 1.4,
              "dep": "10:35 PM"
            },
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 1.4,
              "dep": "05:35 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "05:40 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "06:15 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "06:50 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "07:30 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "08:30 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "09:05 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "09:45 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "10:25 AM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.2,
              "dep": "11:05 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.2,
              "dep": "11:45 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 1.4,
              "dep": "12:15 PM"
            }
          ]
        }
      ],
      "revenueKm": 112.0,
      "corridorDistance": 11.2,
      "singleChargeReqKm": 126.28,
      "defaultSubRoute": "356Z/7",
      "totalGroupDistance": 114.8
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
      "distance": 133.6,
      "fullDutyKm": 180.18,
      "actualKm": 180.18,
      "routeComplexity": "Standard",
      "category": "Standard",
      "requiredCat": "B",
      "drainSoc": 82,
      "timeComplexity": "Peak",
      "timetables": [
        "06:00 AM",
        "06:10 AM",
        "06:20 AM",
        "06:30 AM",
        "06:40 AM",
        "06:55 AM",
        "07:05 AM",
        "07:15 AM",
        "07:25 AM",
        "07:35 AM",
        "07:45 AM",
        "07:55 AM",
        "08:05 AM",
        "02:05 PM",
        "02:15 PM",
        "02:25 PM",
        "02:35 PM",
        "02:45 PM"
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
          "scheduleId": "360K/3",
          "subRoute": "360K/3",
          "departureTime": "06:00 AM",
          "outTime": "06:00 AM",
          "inTime": "01:20 PM",
          "totalGroupDistance": 133.6,
          "distance": 133.6,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "06:00 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "07:15 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "09:45 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "11:50 AM"
            }
          ]
        },
        {
          "scheduleId": "360K/4",
          "subRoute": "360K/4",
          "departureTime": "06:10 AM",
          "outTime": "06:10 AM",
          "inTime": "01:30 PM",
          "totalGroupDistance": 133.6,
          "distance": 133.6,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "06:10 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "07:25 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "09:55 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "12:00 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/15",
          "subRoute": "360K/15",
          "departureTime": "06:20 AM",
          "outTime": "06:20 AM",
          "inTime": "01:40 PM",
          "totalGroupDistance": 133.6,
          "distance": 133.6,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "06:20 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "07:35 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "10:05 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "12:10 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/30",
          "subRoute": "360K/30",
          "departureTime": "06:30 AM",
          "outTime": "06:30 AM",
          "inTime": "01:50 PM",
          "totalGroupDistance": 133.6,
          "distance": 133.6,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "06:30 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "07:45 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "10:15 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "12:20 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/38",
          "subRoute": "360K/38",
          "departureTime": "06:40 AM",
          "outTime": "06:40 AM",
          "inTime": "02:00 PM",
          "totalGroupDistance": 133.6,
          "distance": 133.6,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "06:40 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "07:55 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "10:25 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "12:30 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/11",
          "subRoute": "360K/11",
          "departureTime": "06:55 AM",
          "outTime": "06:55 AM",
          "inTime": "05:40 PM",
          "totalGroupDistance": 163.8,
          "distance": 163.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "06:55 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "07:30 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "09:30 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "10:30 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "12:35 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "03:05 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:10 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/12",
          "subRoute": "360K/12",
          "departureTime": "07:05 AM",
          "outTime": "07:05 AM",
          "inTime": "05:50 PM",
          "totalGroupDistance": 163.8,
          "distance": 163.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:05 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "07:35 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "09:50 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "10:40 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "12:45 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "03:15 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:20 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/5",
          "subRoute": "360K/5",
          "departureTime": "07:15 AM",
          "outTime": "07:15 AM",
          "inTime": "06:00 PM",
          "totalGroupDistance": 163.8,
          "distance": 163.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:15 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "07:50 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "09:50 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "10:50 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "12:55 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "03:25 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:30 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/10",
          "subRoute": "360K/10",
          "departureTime": "07:25 AM",
          "outTime": "07:25 AM",
          "inTime": "06:10 PM",
          "totalGroupDistance": 163.8,
          "distance": 163.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:25 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "08:00 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:00 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "11:00 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "01:05 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "03:35 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:40 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/20",
          "subRoute": "360K/20",
          "departureTime": "07:35 AM",
          "outTime": "07:35 AM",
          "inTime": "06:20 PM",
          "totalGroupDistance": 163.8,
          "distance": 163.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:35 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "08:10 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:10 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "11:10 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "01:15 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "03:45 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:50 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/26",
          "subRoute": "360K/26",
          "departureTime": "07:45 AM",
          "outTime": "07:45 AM",
          "inTime": "06:30 PM",
          "totalGroupDistance": 163.8,
          "distance": 163.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:45 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "08:20 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:20 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "11:20 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "01:25 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "03:55 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "06:00 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/33",
          "subRoute": "360K/33",
          "departureTime": "07:55 AM",
          "outTime": "07:55 AM",
          "inTime": "06:40 PM",
          "totalGroupDistance": 163.8,
          "distance": 163.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:55 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "08:30 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:30 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "11:30 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "01:35 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "04:05 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "06:10 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/34",
          "subRoute": "360K/34",
          "departureTime": "08:05 AM",
          "outTime": "08:05 AM",
          "inTime": "06:50 PM",
          "totalGroupDistance": 163.8,
          "distance": 163.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "08:05 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "08:40 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:40 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "11:40 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.8,
              "dep": "01:45 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.8,
              "dep": "04:15 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "04:15 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/3",
          "subRoute": "360K/3",
          "departureTime": "02:05 PM",
          "outTime": "02:05 PM",
          "inTime": "09:20 PM",
          "totalGroupDistance": 120.0,
          "distance": 120.0,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "02:05 PM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "03:45 PM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "05:55 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "07:40 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/4",
          "subRoute": "360K/4",
          "departureTime": "02:15 PM",
          "outTime": "02:15 PM",
          "inTime": "09:30 PM",
          "totalGroupDistance": 120.0,
          "distance": 120.0,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "02:15 PM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "03:55 PM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "06:05 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "07:50 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/15",
          "subRoute": "360K/15",
          "departureTime": "02:25 PM",
          "outTime": "02:25 PM",
          "inTime": "09:40 PM",
          "totalGroupDistance": 120.0,
          "distance": 120.0,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "02:25 PM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "04:00 PM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "06:15 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "07:55 PM"
            }
          ]
        },
        {
          "scheduleId": "360K/30",
          "subRoute": "360K/30",
          "departureTime": "02:35 PM",
          "outTime": "02:35 PM",
          "inTime": "09:50 PM",
          "totalGroupDistance": 120.0,
          "distance": 120.0,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "02:35 PM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "04:10 PM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "06:25 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "08:05 PM"
            }
          ]
        },
        {
          "scheduleId": "360k/38",
          "subRoute": "360k/38",
          "departureTime": "02:45 PM",
          "outTime": "02:45 PM",
          "inTime": "10:00 PM",
          "totalGroupDistance": 120.0,
          "distance": 120.0,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 4,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "02:45 PM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "04:25 PM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "06:35 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "08:20 PM"
            }
          ]
        }
      ],
      "revenueKm": 71.6,
      "corridorDistance": 35.8,
      "singleChargeReqKm": 180.18,
      "defaultSubRoute": "360K/3",
      "totalGroupDistance": 133.6
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
      "distance": 119.2,
      "fullDutyKm": 157.96,
      "actualKm": 157.96,
      "routeComplexity": "Standard",
      "category": "Standard",
      "requiredCat": "B",
      "drainSoc": 57,
      "timeComplexity": "Peak",
      "timetables": [
        "06:05 AM",
        "06:15 AM",
        "06:25 AM",
        "07:25 AM",
        "07:35 AM",
        "07:45 AM",
        "07:55 AM",
        "08:05 AM",
        "08:15 AM",
        "08:25 AM",
        "08:35 AM",
        "08:45 AM",
        "08:55 AM",
        "12:30 PM",
        "12:40 PM",
        "12:50 PM",
        "01:00 PM",
        "01:10 PM",
        "01:15 PM",
        "01:25 PM",
        "01:35 PM",
        "01:45 PM",
        "01:55 PM",
        "02:05 PM",
        "02:15 PM",
        "02:15 PM",
        "02:25 PM",
        "02:30 PM",
        "02:35 PM",
        "02:40 PM",
        "02:45 PM",
        "02:55 PM",
        "03:35 PM",
        "03:45 PM",
        "03:55 PM",
        "04:05 PM",
        "04:15 PM",
        "04:25 PM"
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
          "scheduleId": "600F/80",
          "subRoute": "600F/80",
          "departureTime": "06:05 AM",
          "outTime": "06:05 AM",
          "inTime": "01:35 PM",
          "totalGroupDistance": 119.2,
          "distance": 119.2,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 5,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "06:05 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "07:25 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "09:35 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "11:20 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "01:05 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/53",
          "subRoute": "600F/53",
          "departureTime": "06:15 AM",
          "outTime": "06:15 AM",
          "inTime": "01:45 PM",
          "totalGroupDistance": 119.2,
          "distance": 119.2,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 5,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "06:15 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "07:35 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "09:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "11:30 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "01:15 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/66",
          "subRoute": "600F/66",
          "departureTime": "06:25 AM",
          "outTime": "06:25 AM",
          "inTime": "01:55 PM",
          "totalGroupDistance": 119.2,
          "distance": 119.2,
          "shift": "Shift A",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 5,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "06:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "07:45 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "09:55 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "11:40 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "01:25 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/21",
          "subRoute": "600F/21",
          "departureTime": "07:25 AM",
          "outTime": "07:25 AM",
          "inTime": "06:10 PM",
          "totalGroupDistance": 143.6,
          "distance": 143.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "07:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:55 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "11:05 AM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "12:50 PM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "02:15 PM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "02:50 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "04:45 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/16",
          "subRoute": "600F/16",
          "departureTime": "07:35 AM",
          "outTime": "07:35 AM",
          "inTime": "06:20 PM",
          "totalGroupDistance": 143.6,
          "distance": 143.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "07:35 AM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "09:05 AM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "10:30 AM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "11:15 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "01:00 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "02:45 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "04:55 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/17",
          "subRoute": "600F/17",
          "departureTime": "07:45 AM",
          "outTime": "07:45 AM",
          "inTime": "06:30 PM",
          "totalGroupDistance": 143.6,
          "distance": 143.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "07:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "09:15 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "11:25 AM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "01:10 PM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "02:35 PM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "03:10 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "05:05 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/26",
          "subRoute": "600F/26",
          "departureTime": "07:55 AM",
          "outTime": "07:55 AM",
          "inTime": "06:40 PM",
          "totalGroupDistance": 143.6,
          "distance": 143.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "07:55 AM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "09:25 AM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "10:50 AM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "11:35 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "01:20 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:05 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "05:15 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/27",
          "subRoute": "600F/27",
          "departureTime": "08:05 AM",
          "outTime": "08:05 AM",
          "inTime": "06:50 PM",
          "totalGroupDistance": 143.6,
          "distance": 143.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "08:05 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "09:35 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "11:45 AM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "01:30 PM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "02:55 PM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "03:30 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "05:25 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/3",
          "subRoute": "600F/3",
          "departureTime": "08:15 AM",
          "outTime": "08:15 AM",
          "inTime": "07:00 PM",
          "totalGroupDistance": 143.6,
          "distance": 143.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "08:15 AM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "09:45 AM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "11:10 AM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "11:55 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "01:40 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:25 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "05:35 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/31",
          "subRoute": "600F/31",
          "departureTime": "08:25 AM",
          "outTime": "08:25 AM",
          "inTime": "07:10 PM",
          "totalGroupDistance": 151.6,
          "distance": 151.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "08:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.5,
              "dep": "09:55 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "12:05 PM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 28.8,
              "dep": "01:50 PM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "03:15 PM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "03:50 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "05:45 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/42",
          "subRoute": "600F/42",
          "departureTime": "08:35 AM",
          "outTime": "08:35 AM",
          "inTime": "07:20 PM",
          "totalGroupDistance": 373.6,
          "distance": 373.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "08:35 AM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "10:05 AM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "11:30 AM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "12:15 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 258.8,
              "dep": "02:00 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:45 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.54,
              "dep": "05:55 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/43",
          "subRoute": "600F/43",
          "departureTime": "08:45 AM",
          "outTime": "08:45 AM",
          "inTime": "07:30 PM",
          "totalGroupDistance": 143.6,
          "distance": 143.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "08:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "10:15 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "12:25 PM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "02:10 PM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "03:35 PM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "04:10 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "06:05 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/45",
          "subRoute": "600F/45",
          "departureTime": "08:55 AM",
          "outTime": "08:55 AM",
          "inTime": "07:40 PM",
          "totalGroupDistance": 143.6,
          "distance": 143.6,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "08:55 AM"
            },
            {
              "from": "BSK",
              "to": "CPR",
              "km": 20.5,
              "dep": "10:25 AM"
            },
            {
              "from": "BREAK",
              "to": "BREAK",
              "km": 0.0,
              "dep": "11:50 AM"
            },
            {
              "from": "CPR",
              "to": "BSK",
              "km": 20.5,
              "dep": "12:35 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "02:20 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "04:05 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "06:15 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/91",
          "subRoute": "600F/91",
          "departureTime": "12:30 PM",
          "outTime": "12:30 PM",
          "inTime": "10:45 AM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "12:30 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "01:05 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "02:50 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "05:00 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "06:45 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:00 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:05 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:30 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:30 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:15 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/92",
          "subRoute": "600F/92",
          "departureTime": "12:40 PM",
          "outTime": "12:40 PM",
          "inTime": "10:55 AM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "12:40 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "01:50 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "03:00 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "05:10 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "06:55 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:10 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:15 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:40 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:40 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:25 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/93",
          "subRoute": "600F/93",
          "departureTime": "12:50 PM",
          "outTime": "12:50 PM",
          "inTime": "11:05 AM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "12:50 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "01:25 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "03:10 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "05:20 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "07:05 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:20 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:25 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:50 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:50 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:35 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/94",
          "subRoute": "600F/94",
          "departureTime": "01:00 PM",
          "outTime": "01:00 PM",
          "inTime": "11:15 AM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:00 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "01:35 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "03:20 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "05:30 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "07:15 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:30 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:35 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "07:00 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "09:00 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:45 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/95",
          "subRoute": "600F/95",
          "departureTime": "01:10 PM",
          "outTime": "01:10 PM",
          "inTime": "11:25 AM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:10 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "01:45 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "03:30 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "05:40 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "07:25 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:40 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:45 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "07:10 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "09:10 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:55 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/52",
          "subRoute": "600F/52",
          "departureTime": "01:15 PM",
          "outTime": "01:15 PM",
          "inTime": "11:45 AM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:15 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "01:50 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "03:35 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "05:45 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "07:30 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:15 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:35 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "07:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "09:30 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:15 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/57",
          "subRoute": "600F/57",
          "departureTime": "01:25 PM",
          "outTime": "01:25 PM",
          "inTime": "11:55 AM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:25 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "02:00 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "03:45 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "05:55 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "07:40 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:45 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "07:55 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "09:40 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:25 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/49",
          "subRoute": "600F/49",
          "departureTime": "01:35 PM",
          "outTime": "01:35 PM",
          "inTime": "12:05 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:35 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "02:10 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "03:55 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:05 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "07:50 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:35 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:55 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:05 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "09:50 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:35 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/51",
          "subRoute": "600F/51",
          "departureTime": "01:45 PM",
          "outTime": "01:45 PM",
          "inTime": "12:15 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:45 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "02:20 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "04:05 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:15 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:00 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:05 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:15 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "10:00 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:45 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/5",
          "subRoute": "600F/5",
          "departureTime": "01:55 PM",
          "outTime": "01:55 PM",
          "inTime": "12:25 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:55 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "02:30 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "04:15 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:25 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:10 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "04:55 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:15 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "10:10 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:55 AM"
            }
          ]
        },
        {
          "scheduleId": "600F/6",
          "subRoute": "600F/6",
          "departureTime": "02:05 PM",
          "outTime": "02:05 PM",
          "inTime": "12:35 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:05 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "02:40 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "04:25 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:35 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:20 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "05:05 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:25 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:35 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "10:20 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:05 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/80",
          "subRoute": "600F/80",
          "departureTime": "02:15 PM",
          "outTime": "02:15 PM",
          "inTime": "09:30 PM",
          "totalGroupDistance": 119.2,
          "distance": 119.2,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 5,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:15 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "02:50 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "04:35 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:30 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:15 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/72",
          "subRoute": "600F/72",
          "departureTime": "02:15 PM",
          "outTime": "02:15 PM",
          "inTime": "12:45 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:15 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "02:50 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "04:35 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:45 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:30 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "05:15 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:35 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "10:30 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:15 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/8",
          "subRoute": "600F/8",
          "departureTime": "02:25 PM",
          "outTime": "02:25 PM",
          "inTime": "12:55 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:25 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:00 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "04:45 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:55 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:40 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "05:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:45 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:55 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "10:40 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:25 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/53",
          "subRoute": "600F/53",
          "departureTime": "02:30 PM",
          "outTime": "02:30 PM",
          "inTime": "09:45 PM",
          "totalGroupDistance": 119.2,
          "distance": 119.2,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 5,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:30 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:05 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "04:50 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:45 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:30 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/74",
          "subRoute": "600F/74",
          "departureTime": "02:35 PM",
          "outTime": "02:35 PM",
          "inTime": "01:05 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:35 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:10 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "04:55 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "07:05 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:50 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "05:35 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:55 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "09:05 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "10:50 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:35 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/66",
          "subRoute": "600F/66",
          "departureTime": "02:40 PM",
          "outTime": "02:40 PM",
          "inTime": "09:45 PM",
          "totalGroupDistance": 119.2,
          "distance": 119.2,
          "shift": "Shift B",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 5,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:40 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:15 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:00 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "06:55 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "08:35 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/75",
          "subRoute": "600F/75",
          "departureTime": "02:45 PM",
          "outTime": "02:45 PM",
          "inTime": "01:15 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:45 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:20 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:05 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "07:15 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "09:00 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "05:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "07:05 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "09:15 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "11:00 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:45 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/79",
          "subRoute": "600F/79",
          "departureTime": "02:55 PM",
          "outTime": "02:55 PM",
          "inTime": "01:25 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:55 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "03:30 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:15 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "07:25 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "09:10 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "05:55 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "07:15 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "09:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "11:10 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:55 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/67",
          "subRoute": "600F/67",
          "departureTime": "03:35 PM",
          "outTime": "03:35 PM",
          "inTime": "02:05 PM",
          "totalGroupDistance": 215.9,
          "distance": 215.9,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 9,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "03:35 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "04:10 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "05:55 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:05 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "09:50 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "07:55 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "10:05 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "11:50 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "01:35 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/68",
          "subRoute": "600F/68",
          "departureTime": "03:45 PM",
          "outTime": "03:45 PM",
          "inTime": "02:15 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "03:45 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "04:20 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:05 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:15 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "10:00 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "06:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:05 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "10:15 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "12:00 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "01:45 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/69",
          "subRoute": "600F/69",
          "departureTime": "03:55 PM",
          "outTime": "03:55 PM",
          "inTime": "02:25 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "03:55 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "04:30 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:15 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:25 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "10:10 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "06:55 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:15 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "10:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "12:10 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "01:55 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/78",
          "subRoute": "600F/78",
          "departureTime": "04:05 PM",
          "outTime": "04:05 PM",
          "inTime": "02:35 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "04:05 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "04:40 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:25 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:35 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "10:20 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "07:05 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:25 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "10:35 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "12:20 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "02:05 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/81",
          "subRoute": "600F/81",
          "departureTime": "04:15 PM",
          "outTime": "04:15 PM",
          "inTime": "02:45 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "04:15 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "04:50 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:35 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:45 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "10:30 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "07:15 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:35 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "10:45 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "12:30 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "02:15 PM"
            }
          ]
        },
        {
          "scheduleId": "600F/32",
          "subRoute": "600F/32",
          "departureTime": "04:25 PM",
          "outTime": "04:25 PM",
          "inTime": "02:55 PM",
          "totalGroupDistance": 238.4,
          "distance": 238.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "04:25 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "04:55 PM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "06:45 PM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "08:55 PM"
            },
            {
              "from": "BSK",
              "to": "BMT-32",
              "km": 22.5,
              "dep": "10:40 PM"
            },
            {
              "from": "BMT-32",
              "to": "BSK",
              "km": 22.5,
              "dep": "07:25 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "08:45 AM"
            },
            {
              "from": "ATB",
              "to": "BSK",
              "km": 28.8,
              "dep": "10:55 AM"
            },
            {
              "from": "BSK",
              "to": "ATB",
              "km": 28.8,
              "dep": "12:40 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "02:25 PM"
            }
          ]
        }
      ],
      "revenueKm": 86.4,
      "corridorDistance": 28.8,
      "singleChargeReqKm": 157.96,
      "defaultSubRoute": "600F/80",
      "totalGroupDistance": 119.2
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
      "distance": 161.4,
      "fullDutyKm": 127.49,
      "actualKm": 127.49,
      "routeComplexity": "Standard",
      "category": "Standard",
      "requiredCat": "B",
      "drainSoc": 81,
      "timeComplexity": "Moderate",
      "timetables": [
        "06:35 AM",
        "06:45 AM",
        "06:55 AM",
        "07:05 AM",
        "07:15 AM",
        "07:25 AM",
        "07:35 AM",
        "07:45 AM",
        "08:15 AM",
        "08:45 AM",
        "08:55 AM",
        "01:35 PM",
        "01:45 PM",
        "01:55 PM",
        "02:05 PM",
        "02:15 PM",
        "02:25 PM",
        "02:35 PM",
        "02:45 PM",
        "02:55 PM",
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
          "subRoute": "KBS3A/32",
          "departureTime": "06:35 AM",
          "outTime": "06:35 AM",
          "inTime": "05:20 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "06:35 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:10 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "09:10 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "10:10 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "12:15 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "02:45 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "04:50 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/34",
          "subRoute": "KBS3A/34",
          "departureTime": "06:45 AM",
          "outTime": "06:45 AM",
          "inTime": "04:55 PM",
          "totalGroupDistance": 151.1,
          "distance": 151.1,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "ATB",
          "legsCount": 6,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "06:45 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:20 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "09:20 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "10:20 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "12:25 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "02:55 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/35",
          "subRoute": "KBS3A/35",
          "departureTime": "06:55 AM",
          "outTime": "06:55 AM",
          "inTime": "05:40 PM",
          "totalGroupDistance": 171.7,
          "distance": 171.7,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:00 PM"
            },
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "06:55 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:30 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "09:30 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "10:30 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "12:35 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:05 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:10 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/36",
          "subRoute": "KBS3A/36",
          "departureTime": "07:05 AM",
          "outTime": "07:05 AM",
          "inTime": "05:50 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:05 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:40 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "09:40 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "10:40 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "12:45 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:15 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:20 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/40",
          "subRoute": "KBS3A/40",
          "departureTime": "07:15 AM",
          "outTime": "07:15 AM",
          "inTime": "06:00 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:15 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:50 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "09:50 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "10:50 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "12:55 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:25 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:30 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/43",
          "subRoute": "KBS3A/43",
          "departureTime": "07:25 AM",
          "outTime": "07:25 AM",
          "inTime": "06:10 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:25 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:00 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:00 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "11:00 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "01:05 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:35 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:40 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/46",
          "subRoute": "KBS3A/46",
          "departureTime": "07:35 AM",
          "outTime": "07:35 AM",
          "inTime": "06:20 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:35 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:10 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:10 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "11:10 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "01:15 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:45 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "05:50 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/61",
          "subRoute": "KBS3A/61",
          "departureTime": "07:45 AM",
          "outTime": "07:45 AM",
          "inTime": "04:25 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "07:45 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:20 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:20 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "11:20 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "01:25 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:55 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "03:55 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/73",
          "subRoute": "KBS3A/73",
          "departureTime": "08:15 AM",
          "outTime": "08:15 AM",
          "inTime": "07:00 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "08:15 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:50 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:50 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "11:50 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "01:55 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:25 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "06:30 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/66",
          "subRoute": "KBS3A/66",
          "departureTime": "08:45 AM",
          "outTime": "08:45 AM",
          "inTime": "07:30 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "08:45 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "09:20 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "11:20 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "12:20 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "02:25 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:55 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "07:00 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/25",
          "subRoute": "KBS3A/25",
          "departureTime": "08:55 AM",
          "outTime": "08:55 AM",
          "inTime": "07:40 PM",
          "totalGroupDistance": 161.4,
          "distance": 161.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "08:55 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "09:30 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "11:30 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "12:30 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "02:35 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "05:05 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "07:10 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/2",
          "subRoute": "KBS3A/2",
          "departureTime": "01:35 PM",
          "outTime": "01:35 PM",
          "inTime": "10:35 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:35 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "02:10 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:15 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:45 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:45 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "05:30 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "08:00 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:05 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/20",
          "subRoute": "KBS3A/20",
          "departureTime": "01:45 PM",
          "outTime": "01:45 PM",
          "inTime": "10:45 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:45 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "02:20 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:25 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:55 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:55 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "05:40 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "08:10 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:15 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/23",
          "subRoute": "KBS3A/23",
          "departureTime": "01:55 PM",
          "outTime": "01:55 PM",
          "inTime": "10:55 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:55 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "02:30 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:35 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:05 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:05 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "05:50 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "08:20 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:25 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/26",
          "subRoute": "KBS3A/26",
          "departureTime": "02:05 PM",
          "outTime": "02:05 PM",
          "inTime": "11:05 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:05 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "02:40 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:04 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:15 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:15 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:00 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "08:30 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:35 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/8",
          "subRoute": "KBS3A/8",
          "departureTime": "02:15 PM",
          "outTime": "02:15 PM",
          "inTime": "11:15 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:15 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "02:50 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:55 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:25 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:25 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:10 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "08:40 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:45 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/9",
          "subRoute": "KBS3A/9",
          "departureTime": "02:25 PM",
          "outTime": "02:25 PM",
          "inTime": "11:25 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:25 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "03:00 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "05:05 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:35 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:35 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:20 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "08:50 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:55 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/77",
          "subRoute": "KBS3A/77",
          "departureTime": "02:35 PM",
          "outTime": "02:35 PM",
          "inTime": "11:35 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:35 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "03:10 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "05:15 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:45 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:45 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:30 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "09:00 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:05 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/78",
          "subRoute": "KBS3A/78",
          "departureTime": "02:45 PM",
          "outTime": "02:45 PM",
          "inTime": "11:45 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:45 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "03:20 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "05:25 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:55 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:55 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:40 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "09:10 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:15 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/79",
          "subRoute": "KBS3A/79",
          "departureTime": "02:55 PM",
          "outTime": "02:55 PM",
          "inTime": "11:55 AM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:55 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "03:30 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "05:35 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:05 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "05:05 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:50 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "09:20 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:35 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3A/80",
          "subRoute": "KBS3A/80",
          "departureTime": "03:05 PM",
          "outTime": "03:05 PM",
          "inTime": "12:05 PM",
          "totalGroupDistance": 231.8,
          "distance": 231.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "03:05 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "03:40 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "05:45 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:15 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "05:15 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:00 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "09:30 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:35 AM"
            }
          ]
        }
      ],
      "revenueKm": 140.8,
      "corridorDistance": 35.2,
      "singleChargeReqKm": 127.49,
      "defaultSubRoute": "KBS3A/32",
      "totalGroupDistance": 161.4
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
      "distance": 257.8,
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
          "subRoute": "361C/1",
          "departureTime": "01:10 PM",
          "outTime": "01:10 PM",
          "inTime": "11:40 AM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "01:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "01:20 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "01:55 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "04:35 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "07:15 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "04:00 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "06:10 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "08:50 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "11:05 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "11:35 AM"
            }
          ]
        },
        {
          "scheduleId": "361C/2",
          "subRoute": "361C/2",
          "departureTime": "01:30 PM",
          "outTime": "01:30 PM",
          "inTime": "12:00 PM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "01:30 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "01:40 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "02:15 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "04:55 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "07:35 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "04:20 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "06:30 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "09:10 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "11:25 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "11:55 AM"
            }
          ]
        },
        {
          "scheduleId": "361C/3",
          "subRoute": "361C/3",
          "departureTime": "01:50 PM",
          "outTime": "01:50 PM",
          "inTime": "12:20 PM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "01:50 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "02:00 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "02:35 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "05:15 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "07:55 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "04:40 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "06:50 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "09:30 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "11:45 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "12:15 PM"
            }
          ]
        },
        {
          "scheduleId": "361C/4",
          "subRoute": "361C/4",
          "departureTime": "02:10 PM",
          "outTime": "02:10 PM",
          "inTime": "12:40 PM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "02:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "02:20 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "02:55 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "05:35 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "08:15 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "05:00 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "07:10 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "09:50 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "12:05 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "12:35 PM"
            }
          ]
        },
        {
          "scheduleId": "361C/11",
          "subRoute": "361C/11",
          "departureTime": "02:30 PM",
          "outTime": "02:30 PM",
          "inTime": "01:00 PM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "02:30 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "02:40 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "03:15 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "05:55 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "08:35 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "05:20 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "07:30 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "10:10 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "12:25 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "12:55 PM"
            }
          ]
        },
        {
          "scheduleId": "361C/6",
          "subRoute": "361C/6",
          "departureTime": "02:50 PM",
          "outTime": "02:50 PM",
          "inTime": "01:20 PM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "02:50 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "03:00 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "03:35 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "06:15 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "08:55 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "05:40 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "07:50 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "10:30 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "12:45 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "01:15 PM"
            }
          ]
        },
        {
          "scheduleId": "361C/7",
          "subRoute": "361C/7",
          "departureTime": "03:10 PM",
          "outTime": "03:10 PM",
          "inTime": "01:40 PM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "03:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "03:20 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "03:55 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "06:35 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "09:15 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "06:00 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "08:10 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "10:50 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "01:05 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "01:35 PM"
            }
          ]
        },
        {
          "scheduleId": "361C/8",
          "subRoute": "361C/8",
          "departureTime": "03:30 PM",
          "outTime": "03:30 PM",
          "inTime": "02:00 PM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "03:30 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "03:40 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "04:15 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "06:45 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "09:35 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "06:20 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "08:30 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "11:10 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "01:25 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "01:55 PM"
            }
          ]
        },
        {
          "scheduleId": "361C/9",
          "subRoute": "361C/9",
          "departureTime": "03:50 PM",
          "outTime": "03:50 PM",
          "inTime": "02:20 PM",
          "totalGroupDistance": 257.8,
          "distance": 257.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "03:50 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "04:00 PM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "04:35 PM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "07:00 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "09:55 PM"
            },
            {
              "from": "KBS",
              "to": "ANK",
              "km": 39.5,
              "dep": "06:40 AM"
            },
            {
              "from": "ANK",
              "to": "KMT",
              "km": 38.0,
              "dep": "09:00 AM"
            },
            {
              "from": "KMT",
              "to": "ANK",
              "km": 38.0,
              "dep": "11:30 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "01:45 PM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "02:15 PM"
            }
          ]
        }
      ],
      "revenueKm": 253.8,
      "corridorDistance": 38.0,
      "singleChargeReqKm": 141.79,
      "defaultSubRoute": "361C/1",
      "totalGroupDistance": 257.8
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
      "distance": 283.8,
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
          "subRoute": "399C/3",
          "departureTime": "01:15 PM",
          "outTime": "01:15 PM",
          "inTime": "11:10 AM",
          "totalGroupDistance": 283.8,
          "distance": 283.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CTP",
              "km": 30.5,
              "dep": "01:15 PM"
            },
            {
              "from": "CTP",
              "to": "ANK",
              "km": 34.5,
              "dep": "03:00 PM"
            },
            {
              "from": "ANK",
              "to": "CTP",
              "km": 34.5,
              "dep": "05:00 PM"
            },
            {
              "from": "CTP",
              "to": "HSK",
              "km": 42.4,
              "dep": "06:35 PM"
            },
            {
              "from": "HSK",
              "to": "CTP",
              "km": 42.4,
              "dep": "05:00 AM"
            },
            {
              "from": "CTP",
              "to": "ANK",
              "km": 34.5,
              "dep": "06:25 AM"
            },
            {
              "from": "ANK",
              "to": "CTP",
              "km": 34.5,
              "dep": "08:00 AM"
            },
            {
              "from": "CTP",
              "to": "BMT-32",
              "km": 30.5,
              "dep": "09:30 AM"
            }
          ]
        },
        {
          "scheduleId": "399C/4",
          "subRoute": "399C/4",
          "departureTime": "02:00 PM",
          "outTime": "02:00 PM",
          "inTime": "12:25 PM",
          "totalGroupDistance": 283.8,
          "distance": 283.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CTP",
              "km": 30.5,
              "dep": "02:00 PM"
            },
            {
              "from": "CTP",
              "to": "ANK",
              "km": 34.5,
              "dep": "03:45 PM"
            },
            {
              "from": "ANK",
              "to": "CTP",
              "km": 34.5,
              "dep": "05:30 PM"
            },
            {
              "from": "CTP",
              "to": "HSK",
              "km": 42.4,
              "dep": "07:05 PM"
            },
            {
              "from": "HSK",
              "to": "CTP",
              "km": 42.4,
              "dep": "05:45 AM"
            },
            {
              "from": "CTP",
              "to": "ANK",
              "km": 34.5,
              "dep": "07:10 AM"
            },
            {
              "from": "ANK",
              "to": "CTP",
              "km": 34.5,
              "dep": "09:10 AM"
            },
            {
              "from": "CTP",
              "to": "BMT-32",
              "km": 30.5,
              "dep": "10:45 AM"
            }
          ]
        },
        {
          "scheduleId": "399C/5",
          "subRoute": "399C/5",
          "departureTime": "02:40 PM",
          "outTime": "02:40 PM",
          "inTime": "01:15 PM",
          "totalGroupDistance": 265.5,
          "distance": 265.5,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CTP",
              "km": 30.5,
              "dep": "02:40 PM"
            },
            {
              "from": "CTP",
              "to": "ANK",
              "km": 34.5,
              "dep": "05:10 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "06:45 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "09:15 PM"
            },
            {
              "from": "BMT-32",
              "to": "CTP",
              "km": 30.5,
              "dep": "06:45 AM"
            },
            {
              "from": "CTP",
              "to": "ANK",
              "km": 34.5,
              "dep": "08:15 AM"
            },
            {
              "from": "ANK",
              "to": "CTP",
              "km": 34.5,
              "dep": "10:15 AM"
            },
            {
              "from": "CTP",
              "to": "BMT-32",
              "km": 30.5,
              "dep": "11:45 AM"
            }
          ]
        },
        {
          "scheduleId": "399C/6",
          "subRoute": "399C/6",
          "departureTime": "03:35 PM",
          "outTime": "03:35 PM",
          "inTime": "01:45 PM",
          "totalGroupDistance": 265.5,
          "distance": 265.5,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 8,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CTP",
              "km": 30.5,
              "dep": "03:35 PM"
            },
            {
              "from": "CTP",
              "to": "ANK",
              "km": 34.5,
              "dep": "05:45 PM"
            },
            {
              "from": "ANK",
              "to": "KBS",
              "km": 39.5,
              "dep": "07:20 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "09:50 PM"
            },
            {
              "from": "BMT-32",
              "to": "CTP",
              "km": 30.5,
              "dep": "06:50 AM"
            },
            {
              "from": "CTP",
              "to": "ANK",
              "km": 34.5,
              "dep": "08:45 AM"
            },
            {
              "from": "ANK",
              "to": "CTP",
              "km": 34.5,
              "dep": "10:45 AM"
            },
            {
              "from": "CTP",
              "to": "BMT-32",
              "km": 30.5,
              "dep": "12:20 PM"
            }
          ]
        }
      ],
      "revenueKm": 143.0,
      "corridorDistance": 34.5,
      "singleChargeReqKm": 146.03,
      "defaultSubRoute": "399C/3",
      "totalGroupDistance": 283.8
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
      "distance": 290.0,
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
        "01:20 PM",
        "01:30 PM",
        "01:45 PM",
        "01:50 PM",
        "02:00 PM",
        "02:00 PM",
        "02:10 PM",
        "02:15 PM",
        "02:30 PM",
        "02:45 PM",
        "03:00 PM",
        "03:10 PM",
        "03:20 PM",
        "03:30 PM",
        "03:40 PM",
        "03:50 PM",
        "04:00 PM"
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
          "scheduleId": "328H/2",
          "subRoute": "328H/2",
          "departureTime": "01:00 PM",
          "outTime": "01:00 PM",
          "inTime": "10:45 AM",
          "totalGroupDistance": 290.0,
          "distance": 290.0,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 11,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:00 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "01:30 PM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "03:15 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:15 PM"
            },
            {
              "from": "ATB",
              "to": "DMSC",
              "km": 14.7,
              "dep": "06:05 PM"
            },
            {
              "from": "DMSC",
              "to": "ATB",
              "km": 14.7,
              "dep": "06:55 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "08:05 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:30 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "05:55 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "08:20 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:15 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/1",
          "subRoute": "328H/1",
          "departureTime": "01:10 PM",
          "outTime": "01:10 PM",
          "inTime": "08:45 PM",
          "totalGroupDistance": 291.4,
          "distance": 291.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "HSK",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "01:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "01:20 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "01:55 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:50 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:00 PM"
            },
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "01:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "01:20 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "01:55 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:50 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:00 PM"
            }
          ]
        },
        {
          "scheduleId": "328H/3",
          "subRoute": "328H/3",
          "departureTime": "01:20 PM",
          "outTime": "01:20 PM",
          "inTime": "10:40 AM",
          "totalGroupDistance": 291.4,
          "distance": 291.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "01:20 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "01:30 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "02:05 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:00 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:10 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:10 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "05:35 AM"
            },
            {
              "from": "HSK",
              "to": "ANK",
              "km": 52.3,
              "dep": "07:10 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "10:00 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "10:35 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/6",
          "subRoute": "328H/6",
          "departureTime": "01:20 PM",
          "outTime": "01:20 PM",
          "inTime": "11:25 AM",
          "totalGroupDistance": 290.0,
          "distance": 290.0,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 11,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:20 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "01:50 PM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "03:35 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:35 PM"
            },
            {
              "from": "ATB",
              "to": "DMSC",
              "km": 14.7,
              "dep": "06:25 PM"
            },
            {
              "from": "DMSC",
              "to": "ATB",
              "km": 14.7,
              "dep": "07:15 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "08:25 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:10 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:45 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "09:00 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:55 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/9",
          "subRoute": "328H/9",
          "departureTime": "01:30 PM",
          "outTime": "01:30 PM",
          "inTime": "10:40 AM",
          "totalGroupDistance": 289.4,
          "distance": 289.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "CPR",
          "legsCount": 9,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "01:30 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "01:40 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "02:15 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:10 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:20 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:20 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "05:45 AM"
            },
            {
              "from": "HSK",
              "to": "ANK",
              "km": 52.3,
              "dep": "07:20 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "10:10 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/10",
          "subRoute": "328H/10",
          "departureTime": "01:45 PM",
          "outTime": "01:45 PM",
          "inTime": "11:30 AM",
          "totalGroupDistance": 300.6,
          "distance": 300.6,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 12,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "01:45 PM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "02:20 PM"
            },
            {
              "from": "KGD",
              "to": "ATB",
              "km": 30.0,
              "dep": "03:55 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "05:30 PM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "07:15 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "08:05 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "04:15 AM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "05:25 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "06:00 AM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "07:25 AM"
            },
            {
              "from": "KDG",
              "to": "ATB",
              "km": 30.0,
              "dep": "09:30 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:20 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/12",
          "subRoute": "328H/12",
          "departureTime": "01:50 PM",
          "outTime": "01:50 PM",
          "inTime": "11:10 AM",
          "totalGroupDistance": 291.4,
          "distance": 291.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "01:50 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "02:00 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "02:35 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:30 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:40 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:40 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:10 AM"
            },
            {
              "from": "HSK",
              "to": "ANK",
              "km": 52.3,
              "dep": "07:40 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "10:30 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "11:05 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/13",
          "subRoute": "328H/13",
          "departureTime": "02:00 PM",
          "outTime": "02:00 PM",
          "inTime": "12:00 PM",
          "totalGroupDistance": 298.8,
          "distance": 298.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 11,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:00 PM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "02:35 PM"
            },
            {
              "from": "KGD",
              "to": "ATB",
              "km": 30.0,
              "dep": "04:10 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "05:45 PM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "07:30 PM"
            },
            {
              "from": "HSK",
              "to": "KBS",
              "km": 29.1,
              "dep": "08:05 PM"
            },
            {
              "from": "KBS",
              "to": "HSK",
              "km": 29.1,
              "dep": "04:55 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "06:15 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:40 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "09:45 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:35 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/14",
          "subRoute": "328H/14",
          "departureTime": "02:00 PM",
          "outTime": "02:00 PM",
          "inTime": "11:20 AM",
          "totalGroupDistance": 291.4,
          "distance": 291.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "02:00 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "02:10 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "02:45 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:40 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:50 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "04:50 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:15 AM"
            },
            {
              "from": "HSK",
              "to": "ANK",
              "km": 52.3,
              "dep": "07:50 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "10:40 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "11:15 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/19",
          "subRoute": "328H/19",
          "departureTime": "02:10 PM",
          "outTime": "02:10 PM",
          "inTime": "11:30 AM",
          "totalGroupDistance": 291.4,
          "distance": 291.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "02:10 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "02:20 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "02:55 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:50 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "08:00 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:00 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:25 AM"
            },
            {
              "from": "HSK",
              "to": "ANK",
              "km": 52.3,
              "dep": "08:00 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "10:50 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "11:25 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/16",
          "subRoute": "328H/16",
          "departureTime": "02:15 PM",
          "outTime": "02:15 PM",
          "inTime": "12:00 PM",
          "totalGroupDistance": 300.6,
          "distance": 300.6,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 12,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:15 PM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "02:50 PM"
            },
            {
              "from": "KGD",
              "to": "ATB",
              "km": 30.0,
              "dep": "04:25 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:00 PM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "07:45 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "08:35 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "04:30 AM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "05:50 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "06:30 AM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "07:55 AM"
            },
            {
              "from": "KDG",
              "to": "ATB",
              "km": 30.0,
              "dep": "10:00 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "11:35 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/20",
          "subRoute": "328H/20",
          "departureTime": "02:30 PM",
          "outTime": "02:30 PM",
          "inTime": "12:30 PM",
          "totalGroupDistance": 298.8,
          "distance": 298.8,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 11,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:30 PM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "03:05 PM"
            },
            {
              "from": "KGD",
              "to": "ATB",
              "km": 30.0,
              "dep": "04:40 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:15 PM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "08:00 PM"
            },
            {
              "from": "HSK",
              "to": "KBS",
              "km": 29.1,
              "dep": "08:30 PM"
            },
            {
              "from": "KBS",
              "to": "HSK",
              "km": 29.1,
              "dep": "05:15 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "06:45 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "08:10 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "10:15 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:05 PM"
            }
          ]
        },
        {
          "scheduleId": "328H/23",
          "subRoute": "328H/23",
          "departureTime": "02:45 PM",
          "outTime": "02:45 PM",
          "inTime": "12:30 PM",
          "totalGroupDistance": 300.6,
          "distance": 300.6,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 12,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "02:45 PM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "03:20 PM"
            },
            {
              "from": "KGD",
              "to": "ATB",
              "km": 30.0,
              "dep": "04:55 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:30 PM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "09:15 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "09:15 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "05:00 AM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "06:20 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "07:00 AM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "08:25 AM"
            },
            {
              "from": "KDG",
              "to": "ATB",
              "km": 30.0,
              "dep": "10:30 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:05 PM"
            }
          ]
        },
        {
          "scheduleId": "328H/22",
          "subRoute": "328H/22",
          "departureTime": "03:00 PM",
          "outTime": "03:00 PM",
          "inTime": "12:45 PM",
          "totalGroupDistance": 300.6,
          "distance": 300.6,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 12,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "03:00 PM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "03:35 PM"
            },
            {
              "from": "KGD",
              "to": "ATB",
              "km": 30.0,
              "dep": "05:10 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:45 PM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "08:30 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "09:30 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "05:15 AM"
            },
            {
              "from": "CHarging",
              "to": "Charging",
              "km": 0.0,
              "dep": "06:35 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "07:15 AM"
            },
            {
              "from": "ATB",
              "to": "KDG",
              "km": 30.0,
              "dep": "08:40 AM"
            },
            {
              "from": "KDG",
              "to": "ATB",
              "km": 30.0,
              "dep": "10:45 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:20 PM"
            }
          ]
        },
        {
          "scheduleId": "328H/8",
          "subRoute": "328H/8",
          "departureTime": "03:10 PM",
          "outTime": "03:10 PM",
          "inTime": "01:10 PM",
          "totalGroupDistance": 290.0,
          "distance": 290.0,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 11,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "03:10 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "03:45 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "06:00 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "08:15 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:40 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:05 AM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "08:40 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "09:25 AM"
            },
            {
              "from": "ATB",
              "to": "DMSC",
              "km": 14.7,
              "dep": "11:10 AM"
            },
            {
              "from": "DMSC",
              "to": "ATB",
              "km": 14.7,
              "dep": "11:55 AM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "12:40 PM"
            }
          ]
        },
        {
          "scheduleId": "328H/21",
          "subRoute": "328H/21",
          "departureTime": "03:20 PM",
          "outTime": "03:20 PM",
          "inTime": "11:50 AM",
          "totalGroupDistance": 291.4,
          "distance": 291.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "03:20 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "03:30 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "04:05 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "07:00 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "09:10 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:20 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "06:50 AM"
            },
            {
              "from": "HSK",
              "to": "ANK",
              "km": 52.3,
              "dep": "08:25 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "11:15 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "11:45 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/7",
          "subRoute": "328H/7",
          "departureTime": "03:30 PM",
          "outTime": "03:30 PM",
          "inTime": "01:30 PM",
          "totalGroupDistance": 290.0,
          "distance": 290.0,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 11,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "03:30 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "04:05 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "06:20 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "08:35 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:55 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:15 AM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "09:00 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "09:50 AM"
            },
            {
              "from": "ATB",
              "to": "DMSC",
              "km": 14.7,
              "dep": "11:30 AM"
            },
            {
              "from": "DMSC",
              "to": "ATB",
              "km": 14.7,
              "dep": "12:15 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "01:00 PM"
            }
          ]
        },
        {
          "scheduleId": "328H/28",
          "subRoute": "328H/28",
          "departureTime": "03:40 PM",
          "outTime": "03:40 PM",
          "inTime": "12:00 PM",
          "totalGroupDistance": 291.4,
          "distance": 291.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "03:40 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "03:50 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "04:25 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "07:20 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "09:30 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:30 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:00 AM"
            },
            {
              "from": "HSK",
              "to": "ANK",
              "km": 52.3,
              "dep": "08:35 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "11:25 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "11:55 AM"
            }
          ]
        },
        {
          "scheduleId": "328H/4",
          "subRoute": "328H/4",
          "departureTime": "03:50 PM",
          "outTime": "03:50 PM",
          "inTime": "01:50 PM",
          "totalGroupDistance": 290.0,
          "distance": 290.0,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 11,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "03:50 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "04:25 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "06:40 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "08:55 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "06:20 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:45 AM"
            },
            {
              "from": "Charging",
              "to": "Charging",
              "km": 0.0,
              "dep": "09:20 AM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "10:05 AM"
            },
            {
              "from": "ATB",
              "to": "DMSC",
              "km": 14.7,
              "dep": "11:50 AM"
            },
            {
              "from": "DMSC",
              "to": "ATB",
              "km": 14.7,
              "dep": "12:35 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "01:20 PM"
            }
          ]
        },
        {
          "scheduleId": "328H/25",
          "subRoute": "328H/25",
          "departureTime": "04:00 PM",
          "outTime": "04:00 PM",
          "inTime": "12:20 PM",
          "totalGroupDistance": 291.4,
          "distance": 291.4,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 10,
          "legs": [
            {
              "from": "BMT-32",
              "to": "CPR",
              "km": 2.0,
              "dep": "04:00 PM"
            },
            {
              "from": "CPR",
              "to": "ANK",
              "km": 11.4,
              "dep": "04:10 PM"
            },
            {
              "from": "ANK",
              "to": "HSK",
              "km": 52.3,
              "dep": "04:45 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "07:40 PM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "09:50 PM"
            },
            {
              "from": "HSK",
              "to": "ATB",
              "km": 40.0,
              "dep": "05:50 AM"
            },
            {
              "from": "ATB",
              "to": "HSK",
              "km": 40.0,
              "dep": "07:20 AM"
            },
            {
              "from": "HSK",
              "to": "ANK",
              "km": 52.3,
              "dep": "08:55 AM"
            },
            {
              "from": "ANK",
              "to": "CPR",
              "km": 11.4,
              "dep": "11:45 AM"
            },
            {
              "from": "CPR",
              "to": "BMT-32",
              "km": 2.0,
              "dep": "12:15 PM"
            }
          ]
        }
      ],
      "revenueKm": 269.4,
      "corridorDistance": 40.0,
      "singleChargeReqKm": 159.5,
      "defaultSubRoute": "328H/2",
      "totalGroupDistance": 290.0
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
      "distance": 171.4,
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
        "08:30 AM"
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
          "subRoute": "500DC/12",
          "departureTime": "07:45 AM",
          "outTime": "07:45 AM",
          "inTime": "07:00 PM",
          "totalGroupDistance": 171.4,
          "distance": 171.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "HBL",
              "km": 48.9,
              "dep": "07:45 AM"
            },
            {
              "from": "HBL",
              "to": "CSB",
              "km": 30.6,
              "dep": "10:55 AM"
            },
            {
              "from": "CSB",
              "to": "TNF",
              "km": 18.5,
              "dep": "12:40 PM"
            },
            {
              "from": "TNF",
              "to": "CSB",
              "km": 18.5,
              "dep": "01:45 PM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "02:45 PM"
            },
            {
              "from": "CSB",
              "to": "TNF",
              "km": 18.5,
              "dep": "04:00 PM"
            },
            {
              "from": "TNF",
              "to": "BMT-32",
              "km": 36.4,
              "dep": "05:15 PM"
            }
          ]
        },
        {
          "scheduleId": "500DC/13",
          "subRoute": "500DC/13",
          "departureTime": "08:00 AM",
          "outTime": "08:00 AM",
          "inTime": "07:15 PM",
          "totalGroupDistance": 171.4,
          "distance": 171.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "HBL",
              "km": 48.9,
              "dep": "08:00 AM"
            },
            {
              "from": "HBL",
              "to": "CSB",
              "km": 30.6,
              "dep": "11:10 AM"
            },
            {
              "from": "CSB",
              "to": "TNF",
              "km": 18.5,
              "dep": "12:55 PM"
            },
            {
              "from": "TNF",
              "to": "CSB",
              "km": 18.5,
              "dep": "02:00 PM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "03:00 PM"
            },
            {
              "from": "CSB",
              "to": "TNF",
              "km": 18.5,
              "dep": "04:15 PM"
            },
            {
              "from": "TNF",
              "to": "BMT-32",
              "km": 36.4,
              "dep": "05:30 PM"
            }
          ]
        },
        {
          "scheduleId": "500DC/14",
          "subRoute": "500DC/14",
          "departureTime": "08:15 AM",
          "outTime": "08:15 AM",
          "inTime": "07:30 PM",
          "totalGroupDistance": 171.4,
          "distance": 171.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "HBL",
              "km": 48.9,
              "dep": "08:15 AM"
            },
            {
              "from": "HBL",
              "to": "CSB",
              "km": 30.6,
              "dep": "11:25 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "01:05 PM"
            },
            {
              "from": "CSB",
              "to": "TNF",
              "km": 18.5,
              "dep": "02:20 PM"
            },
            {
              "from": "TNF",
              "to": "CSB",
              "km": 18.5,
              "dep": "03:25 PM"
            },
            {
              "from": "CSB",
              "to": "TNF",
              "km": 18.5,
              "dep": "04:30 PM"
            },
            {
              "from": "TNF",
              "to": "BMT-32",
              "km": 36.4,
              "dep": "05:45 PM"
            }
          ]
        },
        {
          "scheduleId": "500DC/15",
          "subRoute": "500DC/15",
          "departureTime": "08:30 AM",
          "outTime": "08:30 AM",
          "inTime": "07:45 PM",
          "totalGroupDistance": 171.4,
          "distance": 171.4,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "HBL",
              "km": 48.9,
              "dep": "08:30 AM"
            },
            {
              "from": "HBL",
              "to": "CSB",
              "km": 30.6,
              "dep": "11:40 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "01:20 PM"
            },
            {
              "from": "CSB",
              "to": "TNF",
              "km": 18.5,
              "dep": "02:35 PM"
            },
            {
              "from": "TNF",
              "to": "CSB",
              "km": 18.5,
              "dep": "03:40 PM"
            },
            {
              "from": "CSB",
              "to": "TNF",
              "km": 18.5,
              "dep": "04:45 PM"
            },
            {
              "from": "TNF",
              "to": "BMT-32",
              "km": 36.4,
              "dep": "06:00 PM"
            }
          ]
        }
      ],
      "revenueKm": 86.1,
      "corridorDistance": 49.1,
      "defaultSubRoute": "500DC/12",
      "totalGroupDistance": 171.4
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
      "distance": 203.2,
      "fullDutyKm": 209.88,
      "actualKm": 209.88,
      "routeComplexity": "Standard",
      "category": "Standard",
      "requiredCat": "B",
      "drainSoc": 74,
      "timeComplexity": "Normal",
      "timetables": [
        "07:30 AM",
        "07:50 AM",
        "08:10 AM",
        "08:30 AM",
        "08:50 AM",
        "09:10 AM",
        "01:50 PM",
        "02:10 PM",
        "03:45 PM",
        "04:00 PM"
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
          "scheduleId": "KBS3F/7",
          "subRoute": "KBS3F/7",
          "departureTime": "07:30 AM",
          "outTime": "07:30 AM",
          "inTime": "06:30 PM",
          "totalGroupDistance": 203.2,
          "distance": 203.2,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.2,
              "dep": "07:30 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "09:10 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "11:00 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "12:40 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "01:40 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "03:25 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.2,
              "dep": "05:10 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/8",
          "subRoute": "KBS3F/8",
          "departureTime": "07:50 AM",
          "outTime": "07:50 AM",
          "inTime": "06:50 PM",
          "totalGroupDistance": 190.8,
          "distance": 190.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.2,
              "dep": "07:50 AM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "09:25 AM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "11:25 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "12:45 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "01:50 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "03:35 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.2,
              "dep": "05:20 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/11",
          "subRoute": "KBS3F/11",
          "departureTime": "08:10 AM",
          "outTime": "08:10 AM",
          "inTime": "07:10 PM",
          "totalGroupDistance": 190.8,
          "distance": 190.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.2,
              "dep": "08:10 AM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "09:45 AM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "11:45 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "01:05 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "02:10 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "03:55 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.2,
              "dep": "05:40 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/12",
          "subRoute": "KBS3F/12",
          "departureTime": "08:30 AM",
          "outTime": "08:30 AM",
          "inTime": "07:30 PM",
          "totalGroupDistance": 190.8,
          "distance": 190.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.2,
              "dep": "08:30 AM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "10:05 AM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "12:05 PM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "01:25 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "02:30 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "04:15 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.2,
              "dep": "06:00 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/13",
          "subRoute": "KBS3F/13",
          "departureTime": "08:50 AM",
          "outTime": "08:50 AM",
          "inTime": "07:50 PM",
          "totalGroupDistance": 190.8,
          "distance": 190.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.2,
              "dep": "08:50 AM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "10:25 AM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "12:50 PM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "02:10 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "02:50 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "04:35 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.2,
              "dep": "06:20 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/14",
          "subRoute": "KBS3F/14",
          "departureTime": "09:10 AM",
          "outTime": "09:10 AM",
          "inTime": "08:10 PM",
          "totalGroupDistance": 190.8,
          "distance": 190.8,
          "shift": "General",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 7,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.2,
              "dep": "09:10 AM"
            },
            {
              "from": "CHARGING",
              "to": "CHARGING",
              "km": 0.0,
              "dep": "10:40 AM"
            },
            {
              "from": "KBS",
              "to": "CPR",
              "km": 29.0,
              "dep": "11:40 AM"
            },
            {
              "from": "CPR",
              "to": "KBS",
              "km": 29.0,
              "dep": "01:10 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:10 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "04:55 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.2,
              "dep": "06:40 PM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/16",
          "subRoute": "KBS3F/16",
          "departureTime": "01:50 PM",
          "outTime": "01:50 PM",
          "inTime": "11:40 AM",
          "totalGroupDistance": 279.3,
          "distance": 279.3,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 9,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "01:50 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:30 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "05:40 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "07:40 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "09:25 PM"
            },
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "04:45 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "06:10 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:20 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "10:05 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/15",
          "subRoute": "KBS3F/15",
          "departureTime": "02:10 PM",
          "outTime": "02:10 PM",
          "inTime": "12:00 PM",
          "totalGroupDistance": 279.3,
          "distance": 279.3,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 9,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "02:10 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "03:50 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "06:00 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "07:55 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "09:40 PM"
            },
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "05:10 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "06:35 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:45 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "10:30 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/17",
          "subRoute": "KBS3F/17",
          "departureTime": "03:45 PM",
          "outTime": "03:45 PM",
          "inTime": "12:50 PM",
          "totalGroupDistance": 279.3,
          "distance": 279.3,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 9,
          "legs": [
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "03:45 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "04:45 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "07:05 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "08:50 PM"
            },
            {
              "from": "ATB",
              "to": "BMT-32",
              "km": 10.3,
              "dep": "10:25 PM"
            },
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "05:55 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "07:20 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "09:30 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "11:15 AM"
            }
          ]
        },
        {
          "scheduleId": "KBS3F/18",
          "subRoute": "KBS3F/18",
          "departureTime": "04:00 PM",
          "outTime": "04:00 PM",
          "inTime": "01:05 PM",
          "totalGroupDistance": 279.3,
          "distance": 279.3,
          "shift": "Night Hault",
          "origin": "BMT-32",
          "destination": "BMT-32",
          "legsCount": 9,
          "legs": [
            {
              "from": "BMT-32",
              "to": "ATB",
              "km": 10.3,
              "dep": "04:00 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "05:00 PM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "07:15 PM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "08:55 PM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "10:35 PM"
            },
            {
              "from": "BMT-32",
              "to": "KBS",
              "km": 31.0,
              "dep": "06:10 AM"
            },
            {
              "from": "KBS",
              "to": "ATB",
              "km": 35.2,
              "dep": "07:35 AM"
            },
            {
              "from": "ATB",
              "to": "KBS",
              "km": 35.2,
              "dep": "09:45 AM"
            },
            {
              "from": "KBS",
              "to": "BMT-32",
              "km": 31.0,
              "dep": "11:30 AM"
            }
          ]
        }
      ],
      "revenueKm": 128.4,
      "corridorDistance": 35.2,
      "singleChargeReqKm": 209.88,
      "defaultSubRoute": "KBS3F/7",
      "totalGroupDistance": 203.2
    }
  ],
  "timeComplexityConfig": {
    "EXTREME_PEAK": {
      "key": "EXTREME_PEAK",
      "label": "Extreme Peak",
      "description": "07:00-10:00 & 16:00-20:00 (Heavy traffic congestion, maximum passenger loading)",
      "hours": [
        "07:00-10:00",
        "16:00-20:00"
      ],
      "drainMultiplier": 1.3,
      "requiredBusCat": "A"
    },
    "PEAK": {
      "key": "PEAK",
      "label": "Peak",
      "description": "10:00-16:00 & 20:00-23:00 (Moderate-to-high urban transit flow)",
      "hours": [
        "10:00-16:00",
        "20:00-23:00"
      ],
      "drainMultiplier": 1.15,
      "requiredBusCat": "A"
    },
    "NORMAL": {
      "key": "NORMAL",
      "label": "Normal (Off-Peak)",
      "description": "05:00-07:00 & 23:00-05:00 (Free flowing corridor operation)",
      "hours": [
        "05:00-07:00",
        "23:00-05:00"
      ],
      "drainMultiplier": 1.0,
      "requiredBusCat": "B"
    }
  }
};

let masterDataset = JSON.parse(JSON.stringify(INITIAL_MASTER_DATASET));
let deletedDepotIds = new Set();
let deletedRouteKeys = new Set();
const datasetListeners = new Set();

function makeRouteKey(depotId, routeCode) {
  const dId = String(depotId || '1').trim().replace(/^DEPOT\s*/i, '');
  const code = String(routeCode || '').toUpperCase().trim();
  return dId && code ? `${dId}_${code}` : '';
}

function normalizeTimeCategoryOption(val) {
  const raw = String(val || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes('extreme')) return 'Extreme Peak';
  if (raw.includes('peak')) return 'Peak';
  if (raw.includes('norm')) return 'Normal';
  return null;
}

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
    const savedDelRoutes = localStorage.getItem(DATASET_DELETED_ROUTES_KEY);
    if (savedDelRoutes) {
      const arrR = JSON.parse(savedDelRoutes);
      if (Array.isArray(arrR)) {
        deletedRouteKeys = new Set(arrR.map((x) => String(x || '').toUpperCase().trim()).filter(Boolean));
      }
    }
    const savedData = localStorage.getItem(DATASET_STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (Array.isArray(parsed?.deletedRoutes)) {
        parsed.deletedRoutes.forEach((k) => {
          const ck = String(k || '').toUpperCase().trim();
          if (ck) deletedRouteKeys.add(ck);
        });
      }
      if (parsed && Array.isArray(parsed.depots) && Array.isArray(parsed.routes)) {
        const coreCodes = ['356Z', '360K', '600F', 'KBS3A', '361C', '399C', '328H', '500DC', 'KBS3F'];
        const hasLegacy = parseFloat(parsed.version || '0') < 5.1 || (parsed.routes || []).some((r) => 
          (r.name && (r.name.includes('Hebbal') || r.name.includes('Whitefield') || r.name.includes('Tin Factory') || r.name.includes('Direct Express') || r.name.includes('Chandapura ➔') || r.name.includes('Attibele ➔') || r.name.includes('Kempegowda')))
        );
        if (hasLegacy) {
          const customRoutes = (parsed.routes || []).filter((r) => !coreCodes.includes(String(r.code).toUpperCase().trim()));
          masterDataset = {
            ...INITIAL_MASTER_DATASET,
            version: '5.1',
            depots: parsed.depots ? parsed.depots.filter((d) => !deletedDepotIds.has(String(d.id))) : INITIAL_MASTER_DATASET.depots,
            routes: [...INITIAL_MASTER_DATASET.routes, ...customRoutes].filter((r) => !deletedDepotIds.has(String(r.depotId)) && !deletedRouteKeys.has(makeRouteKey(r.depotId, r.code || r.id))),
          };
          localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(masterDataset));
        } else {
          masterDataset = {
            ...INITIAL_MASTER_DATASET,
            ...parsed,
            depots: parsed.depots
              .filter((d) => !deletedDepotIds.has(String(d.id)))
              .map((d) => ({
                ...d,
                routes: Array.isArray(d.routes) ? d.routes.filter((rc) => !deletedRouteKeys.has(makeRouteKey(d.id, rc))) : [],
              })),
            routes: parsed.routes.filter((r) => !deletedDepotIds.has(String(r.depotId)) && !deletedRouteKeys.has(makeRouteKey(r.depotId, r.code || r.id))),
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
    masterDataset.deletedRoutes = Array.from(deletedRouteKeys);
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(masterDataset));
      localStorage.setItem(DATASET_DELETED_DEPOTS_KEY, JSON.stringify(Array.from(deletedDepotIds)));
      localStorage.setItem(DATASET_DELETED_ROUTES_KEY, JSON.stringify(Array.from(deletedRouteKeys)));
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
      const hasMutationAction = Boolean(actionPayload && actionPayload.action && actionPayload.action !== 'sync');
      const bodyPayload = {
        ...actionPayload,
        deletedDepotIds: Array.from(deletedDepotIds),
        deletedRoutes: Array.from(deletedRouteKeys),
      };
      if (!hasMutationAction) {
        bodyPayload.dataset = masterDataset;
      }
      return api.post('/api/dataset/routes', bodyPayload).catch((err) => ({ ok: false, error: err?.message || 'Network error' }));
    }
  } catch (_) {}
  return Promise.resolve({ ok: false, error: 'API unavailable' });
}

export function getDeletedRouteKeys() {
  return Array.from(deletedRouteKeys);
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
 * Inspects whether adding (routeCode, shift, timings) to a depot is a new route,
 * a valid sub-route addition (different shift & different timings), or a duplicate.
 */
export function analyzeRouteSubAddition(routeCode, depotId, shift, rawTimetables) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = String(depotId || '1').trim().replace(/^DEPOT\s*/i, '');
  const chosenShift = String(shift || 'General Shift').trim();

  const rawList = Array.isArray(rawTimetables)
    ? rawTimetables
    : String(rawTimetables || '').split(',').map((s) => s.trim()).filter(Boolean);
  const parsedIncoming = [];
  const seenIncomingH24 = new Set();
  rawList.forEach((tStr) => {
    const p = normalizeTimeEntry(tStr);
    const key = p ? p.h24Str : tStr.toLowerCase();
    if (!key || seenIncomingH24.has(key)) return;
    seenIncomingH24.add(key);
    parsedIncoming.push({
      raw: tStr,
      ampmStr: p ? p.ampmStr : tStr,
      outTime24: p ? p.outTime24 : tStr,
      h24Str: key,
      tier: p ? p.tier : 'Normal',
    });
  });

  const existingInDepot = getRouteFromDataset(cleanCode, dId);
  if (!existingInDepot) {
    return {
      existsInSameDepot: false,
      existingRoute: null,
      existingShifts: [],
      existingTimetables: [],
      parsedIncoming,
      newEntries: parsedIncoming,
      duplicateTimings: [],
      hasSameShift: false,
      nextSubIndexStart: 1,
    };
  }

  const existingTimetables = Array.isArray(existingInDepot.timetables)
    ? existingInDepot.timetables.flat().filter(Boolean)
    : [];
  const existingSchedules = Array.isArray(existingInDepot.schedules)
    ? existingInDepot.schedules
    : [];

  const existingH24Set = new Set();
  existingTimetables.forEach((t) => {
    const p = normalizeTimeEntry(t);
    existingH24Set.add(p ? p.h24Str : String(t).trim().toLowerCase());
  });
  existingSchedules.forEach((s) => {
    const rawT = s?.departureTime || s?.outTime;
    if (!rawT) return;
    const p = normalizeTimeEntry(rawT);
    existingH24Set.add(p ? p.h24Str : String(rawT).trim().toLowerCase());
  });

  const shiftSet = new Set();
  if (existingInDepot.shift) shiftSet.add(String(existingInDepot.shift).trim());
  if (Array.isArray(existingInDepot.shifts)) {
    existingInDepot.shifts.forEach((sh) => { if (sh) shiftSet.add(String(sh).trim()); });
  }
  existingSchedules.forEach((s) => { if (s?.shift) shiftSet.add(String(s.shift).trim()); });
  const existingShifts = Array.from(shiftSet);

  const hasSameShift = existingShifts.some((sh) => sh.toLowerCase() === chosenShift.toLowerCase());
  const newEntries = parsedIncoming.filter((item) => !existingH24Set.has(item.h24Str));
  const duplicateTimings = parsedIncoming.filter((item) => existingH24Set.has(item.h24Str));

  let maxSubIdx = existingSchedules.length;
  existingSchedules.forEach((s) => {
    const sid = String(s?.subRoute || s?.scheduleId || '');
    const m = sid.match(/\/(\d+)\s*$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxSubIdx) maxSubIdx = n;
    }
  });

  return {
    existsInSameDepot: true,
    existingRoute: existingInDepot,
    existingShifts,
    existingTimetables,
    parsedIncoming,
    newEntries,
    duplicateTimings,
    hasSameShift,
    nextSubIndexStart: maxSubIdx + 1,
  };
}

/**
 * Adds a new route (or merges a new Shift / Sub-Route with distinct timings) into a depot in the Master Dataset
 */
export function addRouteToDataset(depotId, routeData) {
  const dId = String(depotId || '1').trim().replace(/^DEPOT\s*/i, '');
  const cleanCode = String(routeData.code || routeData.shortName || routeData.id || '').toUpperCase().trim();
  if (!cleanCode) throw new Error('Route code is required');

  const rKey = makeRouteKey(dId, cleanCode);
  if (rKey) deletedRouteKeys.delete(rKey);

  const existingRouteIdx = masterDataset.routes.findIndex(
    (r) => String(r.code).toUpperCase().trim() === cleanCode && String(r.depotId).trim() === dId
  );
  const existingRoute = existingRouteIdx >= 0 ? masterDataset.routes[existingRouteIdx] : null;

  const chosenShift = String(routeData.shift || (existingRoute && existingRoute.shift) || 'General Shift').trim();
  const dist = Number(routeData.distance) || (existingRoute ? Number(existingRoute.distance) : 25.0) || 25.0;
  const orig = String(routeData.origin || (existingRoute && existingRoute.origin) || `Depot ${dId} Terminal`).trim();
  const dest = String(routeData.destination || (existingRoute && existingRoute.destination) || 'Central Terminal').trim();
  const fName = String(routeData.fullName || routeData.name || (existingRoute && (existingRoute.fullName || existingRoute.name)) || `${orig} ➔ ${dest} (${cleanCode})`).trim();

  // Auto-evaluate route complexity if not explicitly provided
  let routeComp = routeData.routeComplexity || routeData.complexity || (existingRoute && (existingRoute.routeComplexity || existingRoute.category));
  if (!routeComp) {
    if (dist > 35) routeComp = 'Complex';
    else if (dist >= 30) routeComp = 'Moderate';
    else if (dist < 25) routeComp = 'Simple';
    else routeComp = 'Standard';
  }

  // Auto-evaluate required bus category based on route complexity
  const reqCat = routeData.requiredCat || (routeComp === 'Complex' ? 'A' : 'B');

  const rawTimetables = Array.isArray(routeData.timetables) && routeData.timetables.length > 0
    ? routeData.timetables
    : ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'];

  const timeComplexity = routeData.timeComplexity || (existingRoute && existingRoute.timeComplexity) || 'Normal';
  const fullDutyKm = routeData.fullDutyKm || (existingRoute && existingRoute.fullDutyKm) || parseFloat((dist * 2).toFixed(1));

  let routeObj;
  if (existingRoute) {
    const analysis = analyzeRouteSubAddition(cleanCode, dId, chosenShift, rawTimetables);
    const existingTimetables = Array.isArray(existingRoute.timetables) ? existingRoute.timetables.flat().filter(Boolean) : [];
    const existingSchedules = Array.isArray(existingRoute.schedules) ? [...existingRoute.schedules] : [];
    const mergedSlots = { ...(existingRoute.timeComplexitySlots || {}), ...(routeData.timeComplexitySlots || {}) };

    let nextSubIdx = analysis.nextSubIndexStart;
    const addedSubRoutes = [];
    const addedTimes = [];

    analysis.newEntries.forEach((entry) => {
      const subId = `${cleanCode}/${nextSubIdx++}`;
      const subSched = {
        scheduleId: subId,
        subRoute: subId,
        route: cleanCode,
        shift: chosenShift,
        outTime: entry.outTime24,
        departureTime: entry.ampmStr,
        inTime: routeData.inTime || '16:00:00',
        origin: orig,
        destination: dest,
        category: routeComp,
        routeComplexity: routeComp,
        timeComplexity: entry.tier,
        totalGroupDistance: fullDutyKm,
        distance: dist,
        singleChargeReqKm: Math.round(dist * 1.5),
        customSubRoute: true,
      };
      existingSchedules.push(subSched);
      addedSubRoutes.push(subSched);
      addedTimes.push(entry.ampmStr);
      if (!mergedSlots[entry.ampmStr]) mergedSlots[entry.ampmStr] = entry.tier;
    });

    const mergedTimetables = [...existingTimetables, ...addedTimes].sort((a, b) => {
      const pa = normalizeTimeEntry(a);
      const pb = normalizeTimeEntry(b);
      return (pa ? pa.minutes : parseTimeToMinutes(a)) - (pb ? pb.minutes : parseTimeToMinutes(b));
    });

    const addedH24Set = new Set(analysis.newEntries.map((e) => e.h24Str));
    const updatedDeletedTimes = Array.isArray(existingRoute._deletedTimes)
      ? existingRoute._deletedTimes.filter((dt) => {
          const dp = normalizeTimeEntry(dt);
          return dp ? !addedH24Set.has(dp.h24Str) : true;
        })
      : [];

    const allShifts = Array.from(
      new Set([...(Array.isArray(existingRoute.shifts) ? existingRoute.shifts : []), existingRoute.shift, chosenShift, ...existingSchedules.map((s) => s.shift)].filter(Boolean))
    );

    routeObj = {
      ...existingRoute,
      code: cleanCode,
      id: cleanCode,
      depotId: dId,
      name: existingRoute.name || `${orig} ➔ ${dest} (${cleanCode})`,
      fullName: existingRoute.fullName || fName,
      shortName: existingRoute.shortName || cleanCode,
      origin: existingRoute.origin || orig,
      destination: existingRoute.destination || dest,
      distance: dist,
      fullDutyKm,
      routeComplexity: routeComp,
      category: routeComp,
      requiredCat: reqCat,
      drainSoc: routeData.drainSoc || existingRoute.drainSoc || Math.min(95, Math.max(12, Math.round(dist * 0.85))),
      timeComplexity,
      shift: existingRoute.shift || chosenShift,
      shifts: allShifts,
      timetables: mergedTimetables,
      _timetablesManaged: true,
      _deletedTimes: updatedDeletedTimes,
      timeComplexitySlots: mergedSlots,
      schedules: existingSchedules,
      _mergeSubRoute: true,
    };

    masterDataset.routes[existingRouteIdx] = routeObj;
  } else {
    const normalizedEntries = rawTimetables.map((t) => {
      const p = normalizeTimeEntry(t);
      return {
        raw: String(t).trim(),
        ampmStr: p ? p.ampmStr : String(t).trim(),
        outTime24: p ? p.outTime24 : String(t).trim(),
        minutes: p ? p.minutes : parseTimeToMinutes(t),
        tier: p ? p.tier : 'Normal',
      };
    });
    normalizedEntries.sort((a, b) => a.minutes - b.minutes);
    const timetables = Array.from(new Set(normalizedEntries.map((e) => e.ampmStr)));

    const timeComplexitySlots = { ...(routeData.timeComplexitySlots || {}) };
    normalizedEntries.forEach((e) => {
      if (!timeComplexitySlots[e.ampmStr]) {
        timeComplexitySlots[e.ampmStr] = e.tier;
      }
    });

    const schedules = normalizedEntries.map((e, idx) => {
      const subId = `${cleanCode}/${idx + 1}`;
      return {
        scheduleId: subId,
        subRoute: subId,
        route: cleanCode,
        shift: chosenShift,
        outTime: e.outTime24,
        departureTime: e.ampmStr,
        inTime: '15:15:00',
        origin: orig,
        destination: dest,
        category: routeComp,
        routeComplexity: routeComp,
        timeComplexity: e.tier,
        totalGroupDistance: fullDutyKm,
        distance: dist,
        singleChargeReqKm: Math.round(dist * 1.5),
      };
    });

    routeObj = {
      code: cleanCode,
      id: cleanCode,
      depotId: dId,
      name: `${orig} ➔ ${dest} (${cleanCode})`,
      fullName: fName,
      shortName: routeData.shortName || cleanCode,
      origin: orig,
      destination: dest,
      distance: dist,
      fullDutyKm,
      routeComplexity: routeComp,
      category: routeComp,
      requiredCat: reqCat,
      drainSoc: routeData.drainSoc || Math.min(95, Math.max(12, Math.round(dist * 0.85))),
      timeComplexity,
      shift: chosenShift,
      shifts: [chosenShift],
      timetables,
      _timetablesManaged: true,
      timeComplexitySlots,
      schedules,
    };

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
  syncToServer({ action: 'add_route', depotId: dId, route: routeObj, mergeSubRoute: Boolean(existingRoute) });
  return routeObj;
}

/**
 * Permanently removes a route and its schedules from a depot in the Master Dataset
 */
export function deleteRouteFromDataset(depotId, routeCode) {
  const dId = String(depotId || '1').trim().replace(/^DEPOT\s*/i, '');
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  if (!cleanCode) return;

  const rKey = makeRouteKey(dId, cleanCode);
  if (rKey) deletedRouteKeys.add(rKey);

  masterDataset.routes = masterDataset.routes.filter(
    (r) => !(String(r.code).toUpperCase().trim() === cleanCode && String(r.depotId).trim() === dId)
  );

  const depotIdx = masterDataset.depots.findIndex((d) => String(d.id).trim() === dId);
  if (depotIdx >= 0) {
    masterDataset.depots[depotIdx].routes = (masterDataset.depots[depotIdx].routes || []).filter(
      (code) => String(code).toUpperCase().trim() !== cleanCode
    );
  }

  persistDataset();
  notifyListeners();
  syncToServer({ action: 'delete_route', depotId: dId, routeCode: cleanCode });
}

export function deleteRoutesBatchFromDataset(items) {
  if (!Array.isArray(items) || items.length === 0) return;
  const cleaned = items
    .map((item) => {
      const cleanCode = String(item?.code || item?.routeCode || item?.id || item || '').toUpperCase().trim();
      const dId = String(item?.depotId || '1').trim().replace(/^DEPOT\s*/i, '');
      return cleanCode ? { code: cleanCode, depotId: dId } : null;
    })
    .filter(Boolean);
  if (cleaned.length === 0) return;

  cleaned.forEach(({ code, depotId }) => {
    const rKey = makeRouteKey(depotId, code);
    if (rKey) deletedRouteKeys.add(rKey);
    masterDataset.routes = masterDataset.routes.filter(
      (r) => !(String(r.code || r.id).toUpperCase().trim() === code && String(r.depotId).trim() === depotId)
    );
    const depotIdx = masterDataset.depots.findIndex((d) => String(d.id).trim() === depotId);
    if (depotIdx >= 0 && Array.isArray(masterDataset.depots[depotIdx].routes)) {
      masterDataset.depots[depotIdx].routes = masterDataset.depots[depotIdx].routes.filter(
        (c) => String(c).toUpperCase().trim() !== code
      );
    }
  });

  persistDataset();
  notifyListeners();
  syncToServer({ action: 'delete_routes_batch', routes: cleaned });
}

/**
 * Requests server-checked single route deletion (defers automatically if buses are currently allocated)
 */
export async function requestDeleteRouteFromDataset(depotId, routeCode, reason = 'Decommissioned by Admin') {
  const dId = String(depotId || '1').trim().replace(/^DEPOT\s*/i, '');
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  if (!cleanCode) return { ok: false, error: 'Route code is required.' };

  const res = await syncToServer({ action: 'delete_route', depotId: dId, routeCode: cleanCode, reason });
  if (res && res.ok && res.data) {
    if (res.data.dataset) {
      syncDatasetWithServer(res.data.dataset, [], res.data.deletedRoutes || []);
    }
    const pendingRoutes = Array.isArray(res.data.pendingRoutes) ? res.data.pendingRoutes : [];
    const deletedImmediate = Array.isArray(res.data.deletedRoutesImmediate) ? res.data.deletedRoutesImmediate : [];
    const deferred = Boolean(res.data.deferred || pendingRoutes.length > 0);
    return {
      ok: true,
      deferred,
      pendingRoutes,
      deletedRoutesImmediate: deletedImmediate,
      pendingDeletions: res.data.pendingDeletions || null,
    };
  }
  return { ok: false, error: (res && res.error) || 'Failed to delete route from server.' };
}

/**
 * Requests server-checked batch route deletion (defers routes that still have active allocated buses)
 */
export async function requestDeleteRoutesBatchFromDataset(items, reason = 'Decommissioned by Admin') {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'No routes selected.' };
  const cleaned = items
    .map((item) => {
      const cleanCode = String(item?.code || item?.routeCode || item?.id || item || '').toUpperCase().trim();
      const dId = String(item?.depotId || '1').trim().replace(/^DEPOT\s*/i, '');
      return cleanCode ? { code: cleanCode, depotId: dId } : null;
    })
    .filter(Boolean);
  if (cleaned.length === 0) return { ok: false, error: 'No valid route codes provided.' };

  const res = await syncToServer({ action: 'delete_routes_batch', routes: cleaned, reason });
  if (res && res.ok && res.data) {
    if (res.data.dataset) {
      syncDatasetWithServer(res.data.dataset, [], res.data.deletedRoutes || []);
    }
    const pendingRoutes = Array.isArray(res.data.pendingRoutes) ? res.data.pendingRoutes : [];
    const deletedImmediate = Array.isArray(res.data.deletedRoutesImmediate) ? res.data.deletedRoutesImmediate : [];
    const deferred = Boolean(res.data.deferred || pendingRoutes.length > 0);
    return {
      ok: true,
      deferred,
      pendingRoutes,
      deletedRoutesImmediate: deletedImmediate,
      pendingDeletions: res.data.pendingDeletions || null,
    };
  }
  return { ok: false, error: (res && res.error) || 'Failed to delete routes on server.' };
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

function normalizeTimeEntry(t) {
  const raw = String(t || '').trim();
  if (!raw) return null;
  const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  const h24Match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  let h24 = null;
  let min = null;
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    min = parseInt(ampmMatch[2], 10);
    const mod = ampmMatch[3].toUpperCase();
    if (h < 1 || h > 12 || min < 0 || min > 59) return null;
    if (mod === 'PM' && h < 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;
    h24 = h;
  } else if (h24Match) {
    h24 = parseInt(h24Match[1], 10);
    min = parseInt(h24Match[2], 10);
    if (h24 < 0 || h24 > 23 || min < 0 || min > 59) return null;
  } else {
    return null;
  }
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const h24Str = `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  const ampmStr = `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ampm}`;
  const shift = (h24 >= 5 && h24 < 13) || (h24 === 13 && min < 30)
    ? 'General Shift'
    : (h24 >= 13 && h24 < 22) ? 'Shift B' : 'Night Halt';
  const tier = ((h24 >= 7 && h24 < 10) || (h24 >= 16 && h24 < 20))
    ? 'Extreme Peak'
    : ((h24 >= 10 && h24 < 16) || (h24 >= 20 && h24 < 23)) ? 'Peak' : 'Normal';
  return { h24Str, outTime24: `${h24Str}:00`, ampmStr, minutes: h24 * 60 + min, shift, tier };
}

/**
 * Updates Route Timetables list for a route
 */
export function updateRouteTimetablesInDataset(routeCode, depotId, timetables) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = depotId ? String(depotId).trim().replace(/^DEPOT\s*/i, '') : null;
  if (!Array.isArray(timetables)) return false;

  let found = false;
  masterDataset.routes.forEach((r) => {
    const matchCode = String(r.code || r.id).toUpperCase().trim() === cleanCode;
    const matchDepot = dId ? String(r.depotId).trim() === dId : true;
    if (matchCode && matchDepot) {
      r.timetables = timetables;
      r._timetablesManaged = true;
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
export function addDepartureTimeToRoute(routeCode, depotId, departureTime, timeCategory = null) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = depotId ? String(depotId).trim().replace(/^DEPOT\s*/i, '') : null;
  const parsed = normalizeTimeEntry(departureTime);
  const cleanTime = parsed ? parsed.ampmStr : String(departureTime || '').trim();
  if (!cleanCode || !cleanTime) return { ok: false, error: 'Route and departure time are required.' };

  const explicitTier = normalizeTimeCategoryOption(timeCategory);
  const chosenTier = explicitTier || (parsed ? parsed.tier : 'Normal');

  let found = false;
  let duplicate = false;
  masterDataset.routes.forEach((r) => {
    const matchCode = String(r.code || r.id).toUpperCase().trim() === cleanCode;
    const matchDepot = dId ? String(r.depotId).trim() === dId : true;
    if (matchCode && matchDepot) {
      const flat = Array.isArray(r.timetables) ? r.timetables.flat().filter(Boolean) : [];
      const exists = flat.some((t) => {
        const ep = normalizeTimeEntry(t);
        if (parsed && ep) return ep.h24Str === parsed.h24Str;
        return String(t).trim().toLowerCase() === cleanTime.toLowerCase();
      });
      if (exists) {
        duplicate = true;
        return;
      }
      flat.push(cleanTime);
      flat.sort((a, b) => {
        const pa = normalizeTimeEntry(a);
        const pb = normalizeTimeEntry(b);
        return (pa ? pa.minutes : parseTimeToMinutes(a)) - (pb ? pb.minutes : parseTimeToMinutes(b));
      });
      r.timetables = flat;
      r._timetablesManaged = true;
      if (Array.isArray(r._deletedTimes) && parsed) {
        r._deletedTimes = r._deletedTimes.filter((dt) => {
          const dp = normalizeTimeEntry(dt);
          return dp ? dp.h24Str !== parsed.h24Str : true;
        });
      }
      if (!r.timeComplexitySlots || typeof r.timeComplexitySlots !== 'object') r.timeComplexitySlots = {};
      r.timeComplexitySlots[cleanTime] = chosenTier;
      if (parsed) {
        if (!Array.isArray(r.schedules)) r.schedules = [];
        const hasSched = r.schedules.some((s) => {
          const sp = normalizeTimeEntry(s.departureTime || s.outTime);
          return sp && sp.h24Str === parsed.h24Str;
        });
        if (!hasSched) {
          r.schedules.push({
            scheduleId: `${cleanCode}/T-${parsed.h24Str.replace(':', '')}`,
            shift: parsed.shift,
            outTime: parsed.outTime24,
            departureTime: cleanTime,
            inTime: '16:00:00',
            category: r.routeComplexity || r.category || 'Standard',
            timeComplexity: chosenTier,
            singleChargeReqKm: r.singleChargeReqKm || Math.round((Number(r.distance) || 25) * 1.5),
          });
        }
      }
      found = true;
    }
  });

  if (duplicate) {
    return { ok: false, duplicate: true, formattedTime: cleanTime, error: `Departure time ${cleanTime} already exists for Route ${cleanCode}.` };
  }

  if (found) {
    persistDataset();
    notifyListeners();
  }
  syncToServer({ action: 'add_departure_time', routeCode: cleanCode, depotId: dId, departureTime: cleanTime, timeCategory: chosenTier });
  return { ok: true, formattedTime: cleanTime, timeCategory: chosenTier };
}

/**
 * Deletes one or more departure times from an existing route's timetables and syncs to dataset
 */
export function deleteDepartureTimeFromRoute(routeCode, depotId, departureTimes) {
  const cleanCode = String(routeCode || '').toUpperCase().trim();
  const dId = depotId ? String(depotId).trim().replace(/^DEPOT\s*/i, '') : null;
  const targets = (Array.isArray(departureTimes) ? departureTimes : [departureTimes]).filter(Boolean);
  if (!cleanCode || targets.length === 0) return { ok: false, error: 'Route and departure time(s) required.' };

  const delH24Keys = new Set();
  const delRawKeys = new Set();
  targets.forEach((dt) => {
    delRawKeys.add(String(dt).trim().toLowerCase());
    const p = normalizeTimeEntry(dt);
    if (p) delH24Keys.add(p.h24Str);
  });

  let found = false;
  masterDataset.routes.forEach((r) => {
    const matchCode = String(r.code || r.id).toUpperCase().trim() === cleanCode;
    const matchDepot = dId ? String(r.depotId).trim() === dId : true;
    if (matchCode && matchDepot) {
      const flat = Array.isArray(r.timetables) ? r.timetables.flat().filter(Boolean) : [];
      r.timetables = flat.filter((t) => {
        const tp = normalizeTimeEntry(t);
        if (tp && delH24Keys.has(tp.h24Str)) return false;
        if (delRawKeys.has(String(t).trim().toLowerCase())) return false;
        return true;
      });
      r._timetablesManaged = true;
      if (!Array.isArray(r._deletedTimes)) r._deletedTimes = [];
      delH24Keys.forEach((hk) => {
        if (!r._deletedTimes.includes(hk)) r._deletedTimes.push(hk);
      });
      if (r.timeComplexitySlots && typeof r.timeComplexitySlots === 'object') {
        Object.keys(r.timeComplexitySlots).forEach((k) => {
          const kp = normalizeTimeEntry(k);
          if ((kp && delH24Keys.has(kp.h24Str)) || delRawKeys.has(k.trim().toLowerCase())) {
            delete r.timeComplexitySlots[k];
          }
        });
      }
      if (Array.isArray(r.schedules)) {
        r.schedules = r.schedules.filter((s) => {
          const sp = normalizeTimeEntry(s.departureTime || s.outTime);
          if (sp && delH24Keys.has(sp.h24Str)) return false;
          if (delRawKeys.has(String(s.outTime || '').trim().toLowerCase())) return false;
          if (delRawKeys.has(String(s.departureTime || '').trim().toLowerCase())) return false;
          return true;
        });
      }
      found = true;
    }
  });

  if (found) {
    persistDataset();
    notifyListeners();
  }
  syncToServer({ action: 'delete_departure_time', routeCode: cleanCode, depotId: dId, departureTimes: targets });
  return { ok: true, count: targets.length };
}

/**
 * Synchronizes in-memory dataset with server data
 */
export function syncDatasetWithServer(remoteDataset, remoteDeletedIds, remoteDeletedRoutes, remoteCustomDepots) {
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

  const incomingDelRoutes = [
    ...(Array.isArray(remoteDeletedRoutes) ? remoteDeletedRoutes : []),
    ...(Array.isArray(remoteDataset.deletedRoutes) ? remoteDataset.deletedRoutes : []),
  ];
  incomingDelRoutes.forEach((rk) => {
    const ck = String(rk || '').toUpperCase().trim();
    if (ck && !deletedRouteKeys.has(ck)) {
      deletedRouteKeys.add(ck);
      changed = true;
    }
  });

  const customDepotRoutesMap = new Map();
  if (Array.isArray(remoteCustomDepots)) {
    remoteCustomDepots.forEach((cd) => {
      if (!cd || cd.id === undefined || cd.id === null) return;
      const dId = String(cd.id).trim();
      customDepotRoutesMap.set(
        dId,
        new Set((Array.isArray(cd.routes) ? cd.routes : []).map((rc) => String(rc).toUpperCase().trim()).filter(Boolean))
      );
    });
  }

  // Merge remote depots and prune deleted routes
  if (Array.isArray(remoteDataset.depots)) {
    remoteDataset.depots.forEach((rDepot) => {
      if (!rDepot || !rDepot.id || deletedDepotIds.has(String(rDepot.id))) return;
      const dId = String(rDepot.id).trim();
      const filteredRoutes = customDepotRoutesMap.has(dId)
        ? Array.from(customDepotRoutesMap.get(dId)).filter((rc) => !deletedRouteKeys.has(makeRouteKey(dId, rc)))
        : (Array.isArray(rDepot.routes) ? rDepot.routes.filter((rc) => !deletedRouteKeys.has(makeRouteKey(dId, rc))) : []);
      const cleanedDepot = { ...rDepot, routes: filteredRoutes };
      const existingIdx = masterDataset.depots.findIndex((d) => String(d.id) === dId);
      if (existingIdx >= 0) {
        const mergedDepot = { ...masterDataset.depots[existingIdx], ...cleanedDepot };
        if (JSON.stringify(masterDataset.depots[existingIdx]) !== JSON.stringify(mergedDepot)) {
          masterDataset.depots[existingIdx] = mergedDepot;
          changed = true;
        }
      } else {
        masterDataset.depots.push(cleanedDepot);
        changed = true;
      }
    });
  }

  // Reconcile remote routes authoritatively so server-deleted routes are pruned locally
  if (Array.isArray(remoteDataset.routes)) {
    const remoteRouteKeys = new Set();
    remoteDataset.routes.forEach((rRoute) => {
      if (!rRoute || !rRoute.code) return;
      const dId = String(rRoute.depotId || '1').trim();
      const cleanCode = String(rRoute.code || rRoute.id).toUpperCase().trim();
      const rKey = makeRouteKey(dId, cleanCode);
      if (deletedDepotIds.has(dId) || deletedRouteKeys.has(rKey)) return;
      if (customDepotRoutesMap.has(dId) && !customDepotRoutesMap.get(dId).has(cleanCode)) {
        deletedRouteKeys.add(rKey);
        changed = true;
        return;
      }
      remoteRouteKeys.add(rKey);
      const existingIdx = masterDataset.routes.findIndex(
        (r) => String(r.code).toUpperCase().trim() === cleanCode && String(r.depotId).trim() === dId
      );
      if (existingIdx >= 0) {
        const mergedRoute = { ...masterDataset.routes[existingIdx], ...rRoute };
        if (JSON.stringify(masterDataset.routes[existingIdx]) !== JSON.stringify(mergedRoute)) {
          masterDataset.routes[existingIdx] = mergedRoute;
          changed = true;
        }
      } else {
        masterDataset.routes.push(rRoute);
        changed = true;
      }
    });

    const remoteDepotIds = new Set(
      (Array.isArray(remoteDataset.depots) ? remoteDataset.depots : [])
        .map((d) => String(d?.id || '').trim())
        .filter(Boolean)
    );
    const beforeLen = masterDataset.routes.length;
    masterDataset.routes = masterDataset.routes.filter((r) => {
      const dId = String(r.depotId || '1').trim();
      const cleanCode = String(r.code || r.id || '').toUpperCase().trim();
      const rKey = makeRouteKey(dId, cleanCode);
      if (deletedDepotIds.has(dId) || deletedRouteKeys.has(rKey)) return false;
      if (customDepotRoutesMap.has(dId) && !customDepotRoutesMap.get(dId).has(cleanCode)) return false;
      if ((remoteDepotIds.has(dId) || customDepotRoutesMap.has(dId)) && remoteDataset.routes.length > 0 && !remoteRouteKeys.has(rKey)) {
        return false;
      }
      return true;
    });
    if (masterDataset.routes.length !== beforeLen) {
      changed = true;
    }
  } else {
    const beforeLen = masterDataset.routes.length;
    masterDataset.routes = masterDataset.routes.filter((r) => {
      const dId = String(r.depotId || '1').trim();
      const cleanCode = String(r.code || r.id || '').toUpperCase().trim();
      return !deletedDepotIds.has(dId) && !deletedRouteKeys.has(makeRouteKey(dId, cleanCode));
    });
    if (masterDataset.routes.length !== beforeLen) {
      changed = true;
    }
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
