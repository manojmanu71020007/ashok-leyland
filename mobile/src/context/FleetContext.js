function mergeHistoryLists(serverList, localList) {
  if (!Array.isArray(serverList)) return Array.isArray(localList) ? localList : [];
  if (!Array.isArray(localList)) return serverList;
  const map = new Map();
  serverList.forEach((item) => {
    if (!item) return;
    const key = String(item.id || (item.bm + '_' + (item.unlockTime || item.completedAt || item.startTime || item.completedTs || '')));
    map.set(key, item);
  });
  const extraLocal = [];
  localList.forEach((item) => {
    if (!item) return;
    const key = String(item.id || (item.bm + '_' + (item.unlockTime || item.completedAt || item.startTime || item.completedTs || '')));
    if (!map.has(key)) {
      map.set(key, item);
      extraLocal.push(item);
    }
  });
  return [...extraLocal, ...serverList];
}

import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { INITIAL_FLEET } from './initialFleet';
import staticCats from './staticBusCategories.json';
import staticRanges from './staticBusRanges.json';
import staticBusRegs from './staticBusRegs.json';

const FleetContext = createContext();

const INITIAL_CHARGING_HISTORY = [
  {
    id: 'charg_init_1',
    bm: 'BM238',
    reg: 'KA51AH2411',
    depot: '2',
    processType: 'Depot Fast Plug-in Charging',
    startTime: '04:15 PM, 21 Oct 2026',
    unlockTime: '05:00 PM, 21 Oct 2026',
    duration: '45 mins',
    startSoc: '20%',
    finalSoc: '92%',
    delta: 72,
    chargerBay: 'Bay #1',
    chargingStatus: 'Completed',
    status: 'Completed',
    clearanceState: '✅ High Range Fleet Category A (Single Charge Ready)',
    remarks: 'Full fast charge completed normally. BMS cleared.',
    fullDutyKm: 116,
  },
  {
    id: 'charg_init_2',
    bm: 'BM005',
    reg: 'KA51AH0005',
    depot: '1',
    processType: 'Depot Fast Plug-in Charging',
    startTime: '03:10 PM, 21 Oct 2026',
    unlockTime: '04:05 PM, 21 Oct 2026',
    duration: '55 mins',
    startSoc: '35%',
    finalSoc: '95%',
    delta: 60,
    chargerBay: 'Bay #2',
    chargingStatus: 'Completed',
    status: 'Completed',
    clearanceState: '✅ High Range Fleet Category A (Single Charge Ready)',
    remarks: 'Routine charge cycle. Cell balance verified.',
    fullDutyKm: 121,
  },
  {
    id: 'charg_init_3',
    bm: 'BM012',
    reg: 'KA51AH0012',
    depot: '1',
    processType: 'Depot Fast Plug-in Charging',
    startTime: '02:00 PM, 21 Oct 2026',
    unlockTime: '02:45 PM, 21 Oct 2026',
    duration: '45 mins',
    startSoc: '40%',
    finalSoc: '85%',
    delta: 45,
    chargerBay: 'Bay #3',
    chargingStatus: 'Completed',
    status: 'Completed',
    clearanceState: '✅ Feasible for Dispatch',
    remarks: 'Opportunity charging between morning and evening shifts.',
    fullDutyKm: 107,
  },
  {
    id: 'charg_init_4',
    bm: 'BM219',
    reg: 'KA51AH2380',
    depot: '2',
    processType: 'Depot Fast Plug-in Charging',
    startTime: '01:15 PM, 21 Oct 2026',
    unlockTime: '01:50 PM, 21 Oct 2026',
    duration: '35 mins',
    startSoc: '25%',
    finalSoc: '78%',
    delta: 53,
    chargerBay: 'Bay #1',
    chargingStatus: 'Partial',
    status: 'Partial',
    clearanceState: '✅ Feasible for Dispatch',
    remarks: 'Partial top-up requested for mid-day corridor assignment.',
    fullDutyKm: 97,
  },
  {
    id: 'charg_init_5',
    bm: 'BM033',
    reg: 'KA51AH0033',
    depot: '1',
    processType: 'Depot Fast Plug-in Charging',
    startTime: '11:30 AM, 21 Oct 2026',
    unlockTime: '12:25 PM, 21 Oct 2026',
    duration: '55 mins',
    startSoc: '18%',
    finalSoc: '90%',
    delta: 72,
    chargerBay: 'Bay #4',
    chargingStatus: 'Completed',
    status: 'Completed',
    clearanceState: '✅ High Range Fleet Category A (Single Charge Ready)',
    remarks: 'Fast charging completed. No faults found.',
    fullDutyKm: 114,
  },
];

const INITIAL_CLEANING_HISTORY = [
  {
    id: 'clean_init_1',
    bm: 'BM153',
    reg: 'KA51AH4643',
    depot: '1',
    processType: 'Interior & Exterior Bus Cleaning',
    startTime: '04:00 PM, 21 Oct 2026',
    unlockTime: '04:35 PM, 21 Oct 2026',
    duration: '35 mins',
    interiorClean: true,
    exteriorClean: true,
    status: 'Completed',
    remarks: 'Deep interior sanitization and exterior pressure wash completed.',
    bay: 'Cleaning Lane #1',
  },
  {
    id: 'clean_init_2',
    bm: 'BM240',
    reg: 'KA51AH2413',
    depot: '2',
    processType: 'Interior & Exterior Bus Cleaning',
    startTime: '03:15 PM, 21 Oct 2026',
    unlockTime: '03:45 PM, 21 Oct 2026',
    duration: '30 mins',
    interiorClean: true,
    exteriorClean: true,
    status: 'Completed',
    remarks: 'Routine floor wash and windshield cleaning.',
    bay: 'Cleaning Lane #2',
  },
  {
    id: 'clean_init_3',
    bm: 'BM002',
    reg: 'KA51AH0002',
    depot: '1',
    processType: 'Interior & Exterior Bus Cleaning',
    startTime: '02:10 PM, 21 Oct 2026',
    unlockTime: '02:40 PM, 21 Oct 2026',
    duration: '30 mins',
    interiorClean: true,
    exteriorClean: true,
    status: 'Completed',
    remarks: 'Post-route cleaning and disinfection.',
    bay: 'Cleaning Lane #1',
  },
  {
    id: 'clean_init_4',
    bm: 'BM255',
    reg: 'KA51AH2432',
    depot: '2',
    processType: 'Interior & Exterior Bus Cleaning',
    startTime: '01:00 PM, 21 Oct 2026',
    unlockTime: '01:35 PM, 21 Oct 2026',
    duration: '35 mins',
    interiorClean: true,
    exteriorClean: true,
    status: 'Completed',
    remarks: 'Seats wiped and exterior cleaned.',
    bay: 'Cleaning Lane #1',
  },
  {
    id: 'clean_init_5',
    bm: 'BM068',
    reg: 'KA51AH0068',
    depot: '1',
    processType: 'Interior & Exterior Bus Cleaning',
    startTime: '11:45 AM, 21 Oct 2026',
    unlockTime: '12:15 PM, 21 Oct 2026',
    duration: '30 mins',
    interiorClean: true,
    exteriorClean: true,
    status: 'Completed',
    remarks: 'Complete sanitization routine passed.',
    bay: 'Cleaning Lane #2',
  },
];

export const DEFAULT_DEPOT_MAP = {"BM001":"1","BM002":"1","BM003":"1","BM004":"1","BM005":"1","BM010":"1","BM012":"1","BM019":"1","BM020":"1","BM024":"1","BM032":"1","BM033":"1","BM038":"1","BM052":"2","BM054":"1","BM056":"1","BM057":"1","BM058":"1","BM062":"1","BM068":"1","BM075":"1","BM080":"1","BM081":"1","BM082":"1","BM086":"1","BM088":"1","BM107":"1","BM116":"1","BM119":"1","BM124":"1","BM151":"1","BM152":"1","BM153":"1","BM157":"1","BM174":"1","BM183":"1","BM185":"1","BM187":"1","BM191":"1","BM193":"1","BM197":"1","BM198":"1","BM199":"1","BM200":"1","BM201":"1","BM202":"1","BM203":"1","BM204":"1","BM205":"1","BM206":"1","BM207":"1","BM208":"1","BM209":"1","BM210":"1","BM212":"1","BM213":"1","BM214":"1","BM215":"1","BM216":"1","BM217":"1","BM218":"1","BM219":"2","BM220":"2","BM221":"2","BM222":"2","BM223":"2","BM224":"2","BM225":"2","BM227":"2","BM238":"2","BM239":"2","BM240":"2","BM245":"2","BM248":"2","BM249":"2","BM250":"2","BM253":"2","BM255":"2","BM256":"2","BM257":"2","BM258":"2","BM259":"2","BM260":"2","BM261":"2","BM263":"2","BM264":"2","BM265":"2","BM267":"2","BM268":"2","BM269":"2","BM271":"2","BM272":"2","BM273":"2","BM274":"2","BM275":"2","BM276":"2","BM277":"2","BM278":"2","BM279":"1","BM280":"2","BM281":"2","BM282":"2","BM283":"2","BM284":"2","BM285":"2","BM286":"2","BM287":"2","BM288":"2","BM289":"2","BM290":"2","BM291":"2","BM292":"2","BM293":"2","BM294":"2","BM295":"2","BM296":"2","BM297":"2","BM298":"2","BM299":"2","BM300":"2","BM303":"1","BM304":"2"};

export const getBusDepot = (bm, depotAssignments = {}) => {
  const clean = String(bm || '').toUpperCase().trim();
  if (depotAssignments && depotAssignments[clean]) return String(depotAssignments[clean]);
  if (DEFAULT_DEPOT_MAP[clean]) return DEFAULT_DEPOT_MAP[clean];
  const num = parseInt(clean.replace(/\D/g, ''), 10);
  return num >= 200 ? '2' : '1';
};

// Check if a bus is newly inducted within the last 1 month (30 days)
export const isBusNewlyAdded = (bus, addedBusesMap = null) => {
  if (!bus) return false;
  const bmClean = (typeof bus === 'string' ? bus : (bus.bmNumber || bus.bm || bus.id || '')).toUpperCase().trim();
  if (addedBusesMap && addedBusesMap[bmClean]) {
    const entry = addedBusesMap[bmClean];
    const addedTime = entry.addedAt ? new Date(entry.addedAt).getTime() : (entry.timestamp ? Number(entry.timestamp) : null);
    if (addedTime && !isNaN(addedTime)) {
      return (Date.now() - addedTime) < (30 * 24 * 60 * 60 * 1000);
    }
    return true;
  }
  if (typeof bus === 'object') {
    const addedTime = bus.addedAt ? new Date(bus.addedAt).getTime() : (bus.timestamp ? Number(bus.timestamp) : null);
    if (addedTime && !isNaN(addedTime)) {
      // Retain "Newly Added" badge for exactly 1 month (30 days)
      return (Date.now() - addedTime) < (30 * 24 * 60 * 60 * 1000);
    }
    if (bus.isNewlyAdded) return true;
  }
  return false;
};

export const timeToMinutes = (tStr) => {
  if (!tStr) return 720;
  const isAmPm = /am|pm/i.test(tStr);
  if (isAmPm) {
    const parts = tStr.trim().split(/\s+/);
    const timeParts = (parts[0] || '12:00').split(':').map(Number);
    let h = timeParts[0] || 0;
    const m = timeParts[1] || 0;
    const mod = (parts[1] || '').toUpperCase();
    if (mod === 'PM' && h < 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const p = tStr.split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
};

export const STATIC_BUS_CATEGORIES = {
  "BM221":"C","BM304":"C","BM088":"C","BM057":"C","BM224":"C","BM218":"C","BM296":"C","BM082":"C","BM012":"C","BM225":"C",
  "BM260":"C","BM288":"C","BM005":"C","BM185":"C","BM032":"C","BM068":"C","BM004":"C","BM024":"C","BM261":"C","BM227":"C",
  "BM002":"C","BM119":"C","BM208":"C","BM204":"C","BM038":"C","BM001":"C","BM010":"C","BM298":"C","BM238":"B","BM003":"B",
  "BM265":"B","BM283":"B","BM086":"B","BM081":"B","BM285":"B","BM116":"B","BM257":"B","BM205":"B","BM183":"B","BM062":"B",
  "BM259":"B","BM075":"B","BM212":"B","BM213":"B","BM245":"B","BM289":"B","BM271":"B","BM207":"B","BM200":"B","BM290":"B",
  "BM210":"B","BM157":"B","BM300":"B","BM199":"B","BM191":"B","BM058":"B","BM278":"B","BM292":"B","BM202":"B","BM220":"B",
  "BM267":"B","BM217":"B","BM174":"B","BM020":"B","BM153":"B","BM277":"B","BM291":"B","BM151":"B","BM295":"B","BM033":"B",
  "BM124":"B","BM275":"B","BM216":"B","BM052":"B","BM054":"B","BM215":"B","BM219":"B","BM198":"B","BM222":"B","BM269":"B",
  "BM187":"B","BM019":"A","BM201":"A","BM206":"A","BM294":"A","BM287":"A","BM107":"A","BM209":"A","BM080":"A","BM268":"A",
  "BM240":"A","BM255":"A","BM276":"A","BM303":"A","BM152":"A","BM281":"A","BM274":"A","BM253":"A","BM263":"A","BM279":"A",
  "BM249":"A","BM286":"A","BM193":"A","BM056":"A","BM297":"A","BM214":"A","BM250":"A","BM197":"A","BM284":"A","BM258":"A",
  "BM280":"A","BM203":"A","BM272":"A","BM256":"A","BM282":"A","BM248":"A","BM293":"A","BM299":"A","BM264":"A","BM223":"A",
  "BM239":"A","BM273":"A"
};

export const getBusCategory = (bm) => {
  const key = String(bm || '').toUpperCase().trim();
  if (STATIC_BUS_CATEGORIES[key]) return STATIC_BUS_CATEGORIES[key];
  return 'B';
};

export const STATIC_BUS_RANGES = {
  "BM221":62.0,"BM304":69.8,"BM088":70.1,"BM057":80.1,"BM224":84.4,"BM218":87.2,"BM296":91.9,"BM082":92.5,"BM012":92.9,"BM225":93.2,
  "BM260":95.0,"BM288":97.2,"BM005":98.5,"BM185":99.6,"BM032":100.2,"BM068":100.3,"BM004":103.2,"BM024":103.9,"BM261":104.3,"BM227":104.8,
  "BM002":105.3,"BM119":105.5,"BM208":106.1,"BM204":106.1,"BM038":106.7,"BM001":106.9,"BM010":107.7,"BM298":107.7,"BM238":107.9,"BM003":108.7,
  "BM265":109.4,"BM283":109.5,"BM086":109.5,"BM081":109.8,"BM285":109.9,"BM116":110.0,"BM257":110.5,"BM205":110.7,"BM183":110.8,"BM062":111.9,
  "BM259":112.2,"BM075":112.2,"BM212":112.6,"BM213":113.2,"BM245":114.1,"BM289":114.1,"BM271":114.3,"BM207":114.8,"BM200":114.8,"BM290":115.1,
  "BM210":115.4,"BM157":115.8,"BM300":115.8,"BM199":115.9,"BM191":116.1,"BM058":116.4,"BM278":116.5,"BM292":116.6,"BM202":116.8,"BM220":116.9,
  "BM267":117.0,"BM217":117.2,"BM174":117.4,"BM020":117.8,"BM153":117.8,"BM277":117.9,"BM291":118.0,"BM151":118.0,"BM295":118.4,"BM033":118.8,
  "BM124":119.0,"BM275":119.0,"BM216":119.4,"BM052":119.5,"BM054":119.6,"BM215":119.7,"BM219":119.8,"BM198":119.9,"BM222":119.9,"BM269":120.0,
  "BM187":120.0,"BM019":120.0,"BM201":120.1,"BM206":120.5,"BM294":120.8,"BM287":120.8,"BM107":121.2,"BM209":121.3,"BM080":121.5,"BM268":121.8,
  "BM240":122.1,"BM255":122.3,"BM276":122.3,"BM303":122.5,"BM152":123.0,"BM281":123.0,"BM274":123.6,"BM253":123.8,"BM263":124.6,"BM279":124.7,
  "BM249":125.0,"BM286":125.2,"BM193":125.3,"BM056":125.7,"BM297":126.1,"BM214":126.4,"BM250":126.9,"BM197":127.4,"BM284":127.5,"BM258":128.5,
  "BM280":128.7,"BM203":129.2,"BM272":129.3,"BM256":130.3,"BM282":130.4,"BM248":130.5,"BM293":132.1,"BM299":134.0,"BM264":134.6,"BM223":134.6,
  "BM239":135.1,"BM273":136.3
};

export function getBusActualRangeKm(bm) {
  const key = String(bm || '').toUpperCase().trim();
  if (STATIC_BUS_RANGES[key]) return STATIC_BUS_RANGES[key];
  const cat = getBusCategory(key);
  if (cat === 'A') return 130.0;
  if (cat === 'C') return 80.0;
  return 110.0;
}

export function getTimeCategory(timeStr) {
  const depMin = timeToMinutes(timeStr || '12:00');
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

export function getTimeCategoryDrainMultiplier(timeCategoryOrStr) {
  let key = 'NORMAL';
  if (timeCategoryOrStr && typeof timeCategoryOrStr === 'object' && timeCategoryOrStr.key) {
    key = timeCategoryOrStr.key;
  } else if (typeof timeCategoryOrStr === 'string') {
    const upper = timeCategoryOrStr.toUpperCase().trim();
    if (upper === 'EXTREME_PEAK' || upper === 'PEAK' || upper === 'NORMAL') {
      key = upper;
    } else {
      key = getTimeCategory(timeCategoryOrStr).key;
    }
  }
  if (key === 'EXTREME_PEAK') {
    return { multiplier: 1.30, label: 'High', timeCategory: 'Extreme Peak', pctNote: '+30% High Drain' };
  } else if (key === 'PEAK') {
    return { multiplier: 1.15, label: 'Moderate', timeCategory: 'Peak', pctNote: '+15% Moderate Drain' };
  }
  return { multiplier: 1.0, label: 'Normal', timeCategory: 'Normal', pctNote: 'Normal Baseline Drain' };
}

export function getBusDrainRatePerKm(bm, timeCategoryOrStr) {
  const busRangeKm = bm ? getBusActualRangeKm(bm) : 110.0;
  const baseDrain = 100 / busRangeKm;
  const drainInfo = getTimeCategoryDrainMultiplier(timeCategoryOrStr);
  return {
    busRangeKm,
    baseDrainPerKm: baseDrain,
    effectiveDrainPerKm: baseDrain * drainInfo.multiplier,
    drainLevel: drainInfo.label,
    drainMultiplier: drainInfo.multiplier,
    timeCategory: drainInfo.timeCategory,
    pctNote: drainInfo.pctNote,
  };
}

export function getRequiredSingleChargeSoc(distKm, schedObj, busBm, timeCategoryOrStr) {
  let targetKm = (schedObj && schedObj.singleChargeReqKm)
    ? Number(schedObj.singleChargeReqKm)
    : (Number(distKm) || 28.7);

  if (schedObj && schedObj.remarks) {
    const match = String(schedObj.remarks).match(/([0-9]+(?:\.[0-9]+)?)/);
    if (match && Number(match[1]) > 20 && Number(match[1]) < targetKm) {
      targetKm = Number(match[1]);
    }
  }
  // Standard Form 4 EV transit single continuous operating stretch cap
  if (targetKm > 65) {
    targetKm = 65;
  }

  const depTime = timeCategoryOrStr || (schedObj && (schedObj.outTime || schedObj.cum_time || schedObj.departureTime));
  const drainInfo = getBusDrainRatePerKm(busBm, depTime);
  const baseSoc = targetKm * drainInfo.effectiveDrainPerKm;
  const reservePct = 15;
  return Math.min(100, Math.round(baseSoc + reservePct));
}

export function getRouteComplexity(distKm) {
  const d = Number(distKm || 0);
  if (d > 35) return 'complex';
  if (d >= 30) return 'moderate';
  if (d < 25) return 'simple';
  return 'standard';
}

export function getMatrixStatus(complexity, isPeak) {
  if (isPeak || complexity === 'complex') {
    return 'A';
  }
  if (complexity === 'simple') {
    return 'A/B/C';
  }
  return 'A/B';
}

export const INITIAL_LOCKED_BUSES = [];

export const INITIAL_ALLOCATED_DUTIES = [];

export const INITIAL_COMPLETED_ROUTES = [
  {
    id: 'rc_init_1',
    bm: 'BM001',
    reg: 'KA51AH4144',
    route: 'Route 356Z (Chandapura ⇔ Anekal)',
    schedule: 'SCH-01',
    scheduledTime: '05:35 AM',
    completedAt: '06:30 AM, 21 Oct 2026',
    dateStr: '2026-10-21',
    depot: '1',
    driver: 'Ramesh Gowda',
    status: 'Returned / Completed',
  },
  {
    id: 'rc_init_2',
    bm: 'BM062',
    reg: 'KA51AH2434',
    route: 'Route G-2 (Depot-1 ⇔ Electronic City)',
    schedule: 'SCH-04',
    scheduledTime: '04:20 AM',
    completedAt: '05:25 AM, 21 Oct 2026',
    dateStr: '2026-10-21',
    depot: '2',
    driver: 'Suresh Kumar',
    status: 'Returned / Completed',
  },
  {
    id: 'rc_init_3',
    bm: 'BM005',
    reg: 'KA51AH2423',
    route: 'Route 600F (Attibele ⇔ Chandapura)',
    schedule: 'SCH-08',
    scheduledTime: '03:05 AM',
    completedAt: '04:15 AM, 21 Oct 2026',
    dateStr: '2026-10-21',
    depot: '2',
    driver: 'Venkatesh M',
    status: 'Returned / Completed',
  },
  {
    id: 'rc_init_4',
    bm: 'BM012',
    reg: 'KA51AH3012',
    route: 'Route 360K (Chandapura ⇔ KBS)',
    schedule: 'SCH-12',
    scheduledTime: '01:40 AM',
    completedAt: '02:50 AM, 21 Oct 2026',
    dateStr: '2026-10-21',
    depot: '1',
    driver: 'Anand Rao',
    status: 'Returned / Completed',
  },
  {
    id: 'rc_init_5',
    bm: 'BM075',
    reg: 'KA51AH4075',
    route: 'Route 356P (Chandapura ⇔ Attibele)',
    schedule: 'SCH-15',
    scheduledTime: '12:20 AM',
    completedAt: '01:30 AM, 21 Oct 2026',
    dateStr: '2026-10-21',
    depot: '1',
    driver: 'Manjunath B',
    status: 'Returned / Completed',
  },
  {
    id: 'rc_init_6',
    bm: 'BM088',
    reg: 'KA51AH4088',
    route: 'Route 290E (Attibele ⇔ Hebbal)',
    schedule: 'SCH-03',
    scheduledTime: '11:00 PM',
    completedAt: '12:10 AM, 21 Oct 2026',
    dateStr: '2026-10-21',
    depot: '2',
    driver: 'Praveen K',
    status: 'Returned / Completed',
  },
];

// Helper to seed INITIAL_FLEET as fully available with 0ms delay
const getSeedFleet = () => {
  return INITIAL_FLEET.map((bus) => ({
    ...bus,
    isAllocated: false,
    isLocked: false,
    isCharging: false,
    isCleaning: false,
    status: 'Available',
    assignedRoute: null,
  }));
};

export const FleetProvider = ({ children }) => {
  const { selectedDepot } = useAuth();
  // Pre-seeded with local fleet snapshot so buses are immediately available with 0ms delay
  const [buses, setBuses] = useState(getSeedFleet());
  const [lockedBuses, setLockedBuses] = useState(INITIAL_LOCKED_BUSES);
  const [allocatedDuties, setAllocatedDuties] = useState(INITIAL_ALLOCATED_DUTIES);
  const [completedRoutesLog, setCompletedRoutesLog] = useState(INITIAL_COMPLETED_ROUTES);
  const [chargingHistory, setChargingHistory] = useState(INITIAL_CHARGING_HISTORY);
  const [cleaningHistory, setCleaningHistory] = useState(INITIAL_CLEANING_HISTORY);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Local additions and deletions to guarantee immediate 0ms UI feedback and offline persistence across poll intervals
  const [localAddedBuses, setLocalAddedBuses] = useState({});
  const [localDeletedBuses, setLocalDeletedBuses] = useState({});
  const localAddedBusesRef = useRef(localAddedBuses);
  localAddedBusesRef.current = localAddedBuses;
  const localDeletedBusesRef = useRef(localDeletedBuses);
  localDeletedBusesRef.current = localDeletedBuses;
  const servicingStatusRef = useRef({});

  // Parse and normalize the busState dictionary returned by server.js
  const processBusState = useCallback((rawState) => {
    if (!rawState || typeof rawState !== 'object') return [];

    const depotAssignments = rawState._depotAssignments || {};
    const manualSocs = rawState._manualSoc || {};
    const servicingStatus = rawState._servicingStatus || rawState.servicingStatus || {};
    servicingStatusRef.current = servicingStatus;
    const addedBusesMap = rawState._addedBuses || {};
    
    // Robust parsing of arrays or objects from backend JSON
    let lockedBusesList = [];
    if (Array.isArray(rawState._lockedBuses)) {
      lockedBusesList = rawState._lockedBuses;
    } else if (rawState._lockedBuses && typeof rawState._lockedBuses === 'object') {
      lockedBusesList = Object.values(rawState._lockedBuses).filter(Boolean);
    }

    // Always normalize depot for each locked bus so BM209 is properly mapped to Depot 2
    const normalizedLocked = (lockedBusesList || []).map((lb) => {
      const bmClean = String(lb.bm || lb.bmNumber || '').toUpperCase().trim();
      const resolvedDepot = getBusDepot(bmClean, depotAssignments);
      return {
        ...lb,
        bm: bmClean,
        bmNumber: bmClean,
        depot: resolvedDepot,
      };
    });

    // Gather all turnaround buses requiring charging or cleaning and absorb into Locked buses
    const lockedBmMap = new Map();
    normalizedLocked.forEach((lb) => {
      const bmClean = String(lb.bm || lb.bmNumber || '').toUpperCase().trim();
      if (bmClean) lockedBmMap.set(bmClean, lb);
    });

    // Synthesize turnaround locks from servicingStatus so no post-route bus can slip through as unlocked
    Object.keys(servicingStatus).forEach((bmKey) => {
      const bmClean = String(bmKey).toUpperCase().trim();
      const serv = servicingStatus[bmKey];
      if (!serv || typeof serv !== 'object') return;

      const needsChg = Boolean(serv.needsCharging || (serv.routeCompleted && !serv.chargingCompleted) || serv.status === 'turnaround_charging');
      const needsCln = Boolean(serv.needsCleaning || (serv.routeCompleted && !serv.cleaningCompleted) || serv.status === 'turnaround_cleaning');
      const isTurnaroundRequired = Boolean(serv.routeCompleted || needsChg || (needsCln && !serv.cleaningCompleted));

      if (isTurnaroundRequired) {
        const existingLock = lockedBmMap.get(bmClean);
        const chgDone = Boolean(serv.chargingCompleted && !needsChg);
        const clnDone = Boolean(serv.cleaningCompleted && !needsCln);
        const page = needsChg ? 'charging' : 'cleaning';
        const reason = needsChg
          ? 'Turnaround (Fast Charging Required First Before Cleaning & Scheduling)'
          : 'Turnaround (Cleaning & Wash Required Before Scheduling)';

        lockedBmMap.set(bmClean, {
          ...(existingLock || {}),
          bm: bmClean,
          bmNumber: bmClean,
          reg: existingLock?.reg || staticBusRegs[bmClean] || `KA51AH${bmClean.replace(/\D/g, '').padStart(4, '0')}`,
          depot: getBusDepot(bmClean, depotAssignments),
          page: existingLock?.page || page,
          reason: existingLock?.reason || reason,
          isTurnaround: true,
          needsCharging: needsChg,
          chargingCompleted: chgDone,
          needsCleaning: needsCln,
          cleaningCompleted: clnDone,
          startTime: existingLock?.startTime || serv.routeCompletedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          startTimestamp: existingLock?.startTimestamp || serv.routeCompletedTs || Date.now(),
        });
      }
    });

    const fullNormalizedLocked = Array.from(lockedBmMap.values());

    let allocatedDutiesList = [];
    if (Array.isArray(rawState._allocatedDuties)) {
      allocatedDutiesList = rawState._allocatedDuties;
    } else if (rawState._allocatedDuties && typeof rawState._allocatedDuties === 'object') {
      allocatedDutiesList = Object.values(rawState._allocatedDuties).filter(Boolean);
    }

    const normalizedDuties = (allocatedDutiesList || []).map((d) => {
      const bmClean = String(d.bm || d.bmNumber || '').toUpperCase().trim();
      const resolvedDepot = d.depot ? String(d.depot) : getBusDepot(bmClean, depotAssignments);
      return {
        ...d,
        bm: bmClean,
        bmNumber: bmClean,
        depot: resolvedDepot,
      };
    });
    setAllocatedDuties(normalizedDuties);

    const busList = [];

    // Filter valid bus keys (e.g., BM001 ... BM100+)
    Object.keys(rawState).forEach((key) => {
      if (key.startsWith('_') || !key.startsWith('BM')) return;

      const item = rawState[key];
      if (!item || typeof item !== 'object') return;
      if (item.isDeleted || item.deleted) return; // Skip deleted buses

      const bm = String(item.bmNumber || item.uniqueId || key).toUpperCase();
      const depot = getBusDepot(bm, depotAssignments);

      const addedMeta = addedBusesMap[bm] || addedBusesMap[key];
      const isNewlyAdded = Boolean(
        item.isNewlyAdded ||
        addedMeta ||
        (localAddedBusesRef.current && localAddedBusesRef.current[bm])
      );
      const addedAt = item.addedAt || addedMeta?.addedAt || addedMeta?.timestamp || item.timestamp || (isNewlyAdded ? new Date().toISOString() : null);
      
      // Calculate current SoC
      const soc = manualSocs[bm] !== undefined ? Number(manualSocs[bm]) : Number(item.soc || 80);

      // 1. Lock / Servicing detection (Charging, Cleaning, or Turnaround)
      const rawServicing = servicingStatus[bm];
      const servicing = (typeof rawServicing === 'object' && rawServicing !== null)
        ? rawServicing
        : (typeof rawServicing === 'string' ? { status: rawServicing } : {});

      const lockedEntry = fullNormalizedLocked.find(
        (l) => String(l.bm || l.bmNumber || '').toUpperCase() === bm
      );

      const chgStatus = String(item.chargingStatus || item.status || '').toLowerCase();
      const isCharging = (lockedEntry && (lockedEntry.page === 'charging' || lockedEntry.reason?.toLowerCase().includes('charg') || lockedEntry.isCharging)) || servicing.status === 'charging' || chgStatus.includes('in progress') || chgStatus === 'charging';
      const isCleaning = (lockedEntry && (lockedEntry.page === 'cleaning' || lockedEntry.reason?.toLowerCase().includes('clean') || lockedEntry.isCleaning)) || servicing.status === 'cleaning' || chgStatus.includes('clean');
      const isNeedsServicing = Boolean(servicing.status === 'needs_servicing' || servicing.routeCompleted);
      const isTurnaroundLocked = Boolean((lockedEntry && lockedEntry.isTurnaround) || isNeedsServicing || (servicing.routeCompleted && (!servicing.chargingCompleted || !servicing.cleaningCompleted)));
      const isLocked = Boolean(lockedEntry || isTurnaroundLocked || isCharging || isCleaning);
      const needsCharging = Boolean(servicing.needsCharging || (servicing.routeCompleted && !servicing.chargingCompleted) || isCharging || (lockedEntry && (lockedEntry.page === 'charging' || lockedEntry.needsCharging)));
      const chargingCompleted = Boolean(servicing.chargingCompleted && !needsCharging);
      const needsCleaning = Boolean(servicing.needsCleaning || (servicing.routeCompleted && !servicing.cleaningCompleted) || isCleaning || (lockedEntry && (lockedEntry.page === 'cleaning' || lockedEntry.needsCleaning)));
      const cleaningCompleted = Boolean(servicing.cleaningCompleted && !needsCleaning);

      // 2. Real Allocation Detection: check against allocatedDutiesList (NOT default routes)
      const allocatedDuty = (allocatedDutiesList || []).find(
        (d) => String(d.bm || d.bmNumber || d.busId || '').toUpperCase() === bm
      );
      const isAllocated = Boolean(allocatedDuty && !isLocked);

      // 3. Operational Status: Strictly 3 states (Available, Allocated, or Locked)
      let status = 'Available';
      if (isCharging) {
        status = 'Charging';
      } else if (isCleaning) {
        status = 'Cleaning';
      } else if (isTurnaroundLocked) {
        status = 'Turnaround (Locked)';
      } else if (isAllocated) {
        status = 'Allocated';
      } else if (isLocked) {
        status = 'Locked';
      } else {
        status = 'Available';
      }

      busList.push({
        id: bm,
        bmNumber: bm,
        regNo: item.regNo || addedMeta?.regNo || staticBusRegs[bm] || `KA51AH${bm.replace(/\D/g, '').padStart(4, '0')}`,
        busCategory: staticCats[bm] || addedMeta?.busCategory || addedMeta?.category || (item.busCategory || 'B').toUpperCase(),
        actualRangeKm: staticRanges[bm] || item.actualRangeKm || 110,
        soc: Math.max(0, Math.min(100, soc)),
        depot: depot,
        isLocked,
        isCharging,
        isCleaning,
        isTurnaround: isTurnaroundLocked,
        isNeedsServicing,
        needsCharging,
        chargingCompleted,
        needsCleaning,
        cleaningCompleted,
        isAllocated,
        allocatedDuty: allocatedDuty || null,
        assignedRoute: allocatedDuty ? (allocatedDuty.routeCode || allocatedDuty.route || 'Duty') : null,
        fullDutyDistanceKm: item.fullDutyDistanceKm || 120,
        status: status,
        isNewlyAdded: isNewlyAdded,
        addedAt: addedAt,
        timestamp: item.timestamp || addedMeta?.timestamp || (addedAt ? new Date(addedAt).getTime() : null),
        notes: item.notes || item.reason || addedMeta?.reason || '',
        reason: item.reason || addedMeta?.reason || '',
        model: item.model || addedMeta?.model || 'ELECTRIC BUS AC EiV12',
        make: item.make || addedMeta?.make || 'Ashok Leyland',
      });
    });

    // Update locked buses state
    setLockedBuses(fullNormalizedLocked);
    return busList.sort((a, b) => a.bmNumber.localeCompare(b.bmNumber, undefined, { numeric: true }));
  }, []);

  const fetchFleet = useCallback(async () => {
    try {
      const [resBusState, resSync] = await Promise.all([
        api.getBusState(),
        api.checkHealth(), // hits /api/sync-state
      ]);

      let addedBusesObj = {};
      let deletedBusesObj = {};

      if (resSync.ok && resSync.data) {
        addedBusesObj = resSync.data.addedBuses || {};
        deletedBusesObj = resSync.data.deletedBuses || {};

        if (Object.keys(addedBusesObj).length > 0) {
          setLocalAddedBuses((prev) => ({ ...addedBusesObj, ...prev }));
        }
        if (Object.keys(deletedBusesObj).length > 0) {
          setLocalDeletedBuses((prev) => ({ ...deletedBusesObj, ...prev }));
        }
        if (Array.isArray(resSync.data.allocatedDuties)) {
          const rawDuties = resSync.data.allocatedDuties;
          const normalized = rawDuties.map((d) => {
            const bmClean = String(d.bm || d.bmNumber || '').toUpperCase().trim();
            const resolvedDepot = (d.depot === '1' || d.depot === '2')
              ? String(d.depot)
              : getBusDepot(bmClean, resSync.data.depotAssignments || {});
            return {
              ...d,
              bm: bmClean,
              bmNumber: bmClean,
              depot: resolvedDepot,
            };
          });
          setAllocatedDuties(normalized);
        }
        if (Array.isArray(resSync.data.lockedBuses)) {
          setLockedBuses(resSync.data.lockedBuses);
        }
        if (Array.isArray(resSync.data.chargingHistory)) {
          setChargingHistory((prev) => mergeHistoryLists(resSync.data.chargingHistory, prev));
        }
        if (Array.isArray(resSync.data.cleaningHistory)) {
          setCleaningHistory((prev) => mergeHistoryLists(resSync.data.cleaningHistory, prev));
        }
        if (Array.isArray(resSync.data.completedRoutesLog)) {
          setCompletedRoutesLog((prev) => mergeHistoryLists(resSync.data.completedRoutesLog, prev));
        }
      }

      if (resBusState.ok && resBusState.data?.state) {
        let parsed = processBusState(resBusState.data.state);

        // Merge server additions/deletions with local additions/deletions to prevent race conditions & wipeouts
        const combinedAdded = { ...addedBusesObj, ...(localAddedBusesRef.current || {}) };
        const combinedDeleted = { ...deletedBusesObj, ...(localDeletedBusesRef.current || {}) };

        // Filter out deleted buses
        const deletedKeys = new Set(Object.keys(combinedDeleted).map((k) => k.toUpperCase()));
        parsed = parsed.filter((b) => !deletedKeys.has(b.bmNumber.toUpperCase()));

        // Ensure newly inducted buses from sync state + local additions are flagged with isNewlyAdded
        Object.keys(combinedAdded).forEach((bm) => {
          const item = combinedAdded[bm];
          const cleanKey = bm.toUpperCase();
          if (deletedKeys.has(cleanKey)) return;
          const existing = parsed.find((b) => b.bmNumber.toUpperCase() === cleanKey);
          if (existing) {
            existing.isNewlyAdded = true;
            existing.addedAt = existing.addedAt || item.addedAt || item.timestamp || new Date().toISOString();
            if (item.reason && !existing.reason) existing.reason = item.reason;
            if (item.model && !existing.model) existing.model = item.model;
          } else {
            parsed.unshift({
              id: cleanKey,
              bmNumber: cleanKey,
              regNo: item.regNo || item.regNumber || `KA51AH${cleanKey.replace(/\D/g, '').padStart(4, '0')}`,
              busCategory: item.category || item.busCategory || 'B',
              soc: item.soc !== undefined ? Number(item.soc) : 100,
              status: 'Available',
              isLocked: false,
              isCharging: false,
              isCleaning: false,
              isAllocated: false,
              isNewlyAdded: true,
              addedAt: item.addedAt || item.timestamp || new Date().toISOString(),
              timestamp: item.timestamp || (item.addedAt ? new Date(item.addedAt).getTime() : Date.now()),
              depot: String(item.depot || '1'),
              fullDutyKm: item.fullDutyKm || Math.round((Number(item.soc) || 100) * 1.42),
              model: item.model || 'ELECTRIC BUS AC EiV12',
              notes: item.reason || item.reasonVal || '',
              reason: item.reason || item.reasonVal || '',
            });
          }
        });

        setBuses(parsed);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(resBusState.error || 'Failed to fetch fleet state');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [processBusState]);

  useEffect(() => {
    fetchFleet();
    // Auto-poll every 5 seconds to keep data fresh and tightly synced with website
    const timer = setInterval(fetchFleet, 5000);
    return () => clearInterval(timer);
  }, [fetchFleet]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFleet();
  }, [fetchFleet]);

  // Update SoC for a bus
  const updateSoc = async (busId, newSoc) => {
    // Optimistic UI update
    setBuses((prev) =>
      prev.map((b) => (b.bmNumber === busId ? { ...b, soc: Number(newSoc) } : b))
    );
    const res = await api.updateSoc(busId, newSoc);
    if (!res.ok) {
      fetchFleet(); // Revert on failure
      throw new Error(res.error || 'Failed to save SoC to server');
    }
  };

  // Lock a bus for charging or cleaning
  const lockBus = async (busEntry) => {
    const updated = [...lockedBuses.filter((x) => x.bm !== busEntry.bm), busEntry];
    setLockedBuses(updated);

    // Optimistically update buses
    setBuses((prev) =>
      prev.map((b) => {
        if (b.bmNumber === busEntry.bm) {
          const isChg = busEntry.page === 'charging';
          const isCln = busEntry.page === 'cleaning';
          return {
            ...b,
            isLocked: true,
            isCharging: isChg,
            isCleaning: isCln,
            status: isChg ? 'Charging' : isCln ? 'Cleaning' : b.status,
          };
        }
        return b;
      })
    );

    try {
      await api.saveLockedBuses(updated);
    } catch (e) {
      console.warn('Failed to save locked buses:', e);
    }
  };

  // Unlock a bus
  const unlockBus = async (bmNumber, page) => {
    const cleanBm = String(bmNumber).toUpperCase();
    const updated = lockedBuses.filter(
      (x) =>
        !(
          String(x.bm || x.bmNumber).toUpperCase() === cleanBm &&
          (!page || String(x.page || '').toLowerCase().includes(page.toLowerCase()))
        )
    );
    setLockedBuses(updated);

    // Optimistically update bus status
    setBuses((prev) =>
      prev.map((b) => {
        if (b.bmNumber === cleanBm) {
          return {
            ...b,
            isLocked: false,
            isCharging: false,
            isCleaning: false,
            isNeedsServicing: false,
            needsCharging: false,
            needsCleaning: false,
            status: b.isAllocated ? 'Allocated' : 'Available',
          };
        }
        return b;
      })
    );

    try {
      if (api.unlockBus) {
        await api.unlockBus(cleanBm);
      }
      await api.saveLockedBuses(updated);
    } catch (e) {
      console.warn('Failed to save unlocked buses:', e);
    }
  };

  // Unlock all locked buses in the fleet
  const unlockAllBuses = async () => {
    setLockedBuses([]);
    setBuses((prev) =>
      prev.map((b) => ({
        ...b,
        isLocked: false,
        isCharging: false,
        isCleaning: false,
        isNeedsServicing: false,
        needsCharging: false,
        needsCleaning: false,
        status: b.isAllocated ? 'Allocated' : 'Available',
      }))
    );
    try {
      if (api.unlockAllBuses) {
        await api.unlockAllBuses();
      }
      await api.saveLockedBuses([]);
    } catch (e) {
      console.warn('Failed to unlock all buses:', e);
    }
  };

  // Add a newly inducted bus to the fleet (fully matching admin.html & server.js)
  const addBusToFleet = async (newBus) => {
    const cleanBm = String(newBus.bm || newBus.bmNumber || newBus.busNumber || '').toUpperCase().trim();
    const cleanReg = String(newBus.regNo || newBus.regNumber || '').toUpperCase().trim() || `KA51AH${cleanBm.replace(/\D/g, '').padStart(4, '0')}`;
    const reasonVal = String(newBus.reason || newBus.reasonVal || newBus.notes || 'New Electric Bus Induction').trim();
    const depotVal = String(newBus.depot || '1').trim();
    const catVal = String(newBus.busCategory || newBus.category || 'B').toUpperCase().trim();
    const socVal = Number.isFinite(Number(newBus.soc)) ? Math.max(10, Math.min(100, Number(newBus.soc))) : 100;

    const nowIso = new Date().toISOString();
    const nowTs = Date.now();

    const payload = {
      bm: cleanBm,
      busNumber: cleanBm,
      regNo: cleanReg,
      regNumber: cleanReg,
      reason: reasonVal,
      reasonVal,
      depot: depotVal,
      busCategory: catVal,
      category: catVal,
      soc: socVal,
      make: 'Ashok Leyland',
      model: 'ELECTRIC BUS AC EiV12',
      addedAt: nowIso,
      timestamp: nowTs,
      isNewlyAdded: true,
    };

    const newBusObj = {
      id: cleanBm,
      bmNumber: cleanBm,
      regNo: cleanReg,
      depot: depotVal,
      busCategory: catVal,
      soc: socVal,
      status: 'Available',
      isCharging: false,
      isCleaning: false,
      isAllocated: false,
      isNewlyAdded: true,
      addedAt: nowIso,
      timestamp: nowTs,
      lastCharged: 'Just Now',
      fullDutyDistanceKm: Math.round(socVal * 1.42),
      actualRangeKm: catVal === 'A' ? 155 : catVal === 'B' ? 120 : 85,
      notes: reasonVal,
      reason: reasonVal,
    };

    // 1. Immediately track locally in addedBuses map & remove from deletedBuses map
    setLocalAddedBuses((prev) => ({ ...prev, [cleanBm]: payload }));
    setLocalDeletedBuses((prev) => {
      const next = { ...prev };
      delete next[cleanBm];
      return next;
    });

    // 2. Immediately update buses state so UI updates in 0ms
    setBuses((prev) => {
      const filtered = prev.filter((b) => b.bmNumber !== cleanBm);
      return [newBusObj, ...filtered];
    });

    // 3. Sync to backend API
    try {
      const res = await api.addBusToFleet(payload);
      return res;
    } catch (err) {
      console.warn('Network error in addBusToFleet:', err);
      return { ok: false, error: err.message };
    }
  };

  // Delete/Decommission a bus from the available fleet (fully matching admin.html & server.js)
  const deleteBusFromFleet = async (bmNumber, details = {}) => {
    const cleanBm = String(bmNumber).toUpperCase().trim();
    const cleanReg = String(details.regNo || details.regNumber || details.reg || '').toUpperCase().trim();
    const reasonVal = String(details.reason || details.reasonVal || details.detail || details.reasonCategory || 'Fleet Maintenance Off-road').trim();
    const depotVal = String(details.depot || '1').trim();

    const payload = {
      bm: cleanBm,
      busNumber: cleanBm,
      regNo: cleanReg,
      regNumber: cleanReg,
      reason: reasonVal,
      reasonVal,
      depot: depotVal,
      make: 'Ashok Leyland',
      model: 'ELECTRIC BUS AC EiV12',
    };

    // 1. Immediately track in localDeletedBuses map & remove from localAddedBuses
    setLocalDeletedBuses((prev) => ({ ...prev, [cleanBm]: payload }));
    setLocalAddedBuses((prev) => {
      const next = { ...prev };
      delete next[cleanBm];
      return next;
    });

    // 2. Remove from buses state in 0ms
    setBuses((prev) => prev.filter((b) => b.bmNumber !== cleanBm));

    // 3. Remove from allocatedDuties if it was currently dispatched (matching website behavior)
    setAllocatedDuties((prev) => prev.filter((d) => String(d.bm || d.bmNumber || '').toUpperCase().trim() !== cleanBm));

    // 4. Sync to backend API
    try {
      const res = await api.deleteBusFromFleet(payload);
      return res;
    } catch (err) {
      console.warn('Network error in deleteBusFromFleet:', err);
      return { ok: false, error: err.message };
    }
  };

  // Restore a previously deleted bus to the available fleet (fully matching admin.html & server.js)
  const restoreBusToFleet = async (bmNumber) => {
    const cleanBm = String(bmNumber).toUpperCase().trim();

    // 1. Remove from local deleted buses
    setLocalDeletedBuses((prev) => {
      const next = { ...prev };
      delete next[cleanBm];
      return next;
    });

    // 2. Find bus in initial seed fleet or create restored object
    const seedBus = INITIAL_FLEET.find((b) => b.bmNumber === cleanBm);
    const restoredBus = seedBus ? { ...seedBus, isNewlyAdded: false, status: 'Available' } : {
      id: cleanBm,
      bmNumber: cleanBm,
      regNo: `KA51AH${cleanBm.replace(/\D/g, '').padStart(4, '0')}`,
      busCategory: 'B',
      soc: 100,
      status: 'Available',
      isLocked: false,
      isCharging: false,
      isCleaning: false,
      isAllocated: false,
      isNewlyAdded: false,
      depot: '1',
      fullDutyKm: 120,
    };

    setBuses((prev) => {
      if (prev.some((b) => b.bmNumber === cleanBm)) return prev;
      return [restoredBus, ...prev];
    });

    // 3. Sync to backend API
    try {
      const res = await api.restoreBusToFleet({ bm: cleanBm, busNumber: cleanBm });
      return res;
    } catch (err) {
      console.warn('Network error in restoreBusToFleet:', err);
      return { ok: false, error: err.message };
    }
  };

  // Submit charging record
  const submitChargingRecord = async (record) => {
    // 1. Add to charging history and persist to server
    setChargingHistory((prev) => {
      const updated = [record, ...prev];
      api.saveChargingHistory(updated).catch((err) => console.warn('Could not save charging history:', err));
      return updated;
    });

    const cleanBm = String(record.bm || '').toUpperCase().trim();
    const curServ = servicingStatusRef.current?.[cleanBm] || {};
    const isCleaningDone = Boolean(curServ.cleaningCompleted || !curServ.needsCleaning);

    // 2. If cleaning is still pending, transition turnaround lock to cleaning; otherwise unlock completely!
    if (!isCleaningDone) {
      const turnaroundCleaningLock = {
        bm: cleanBm,
        bmNumber: cleanBm,
        reg: record.reg || staticBusRegs[cleanBm] || `KA51AH${cleanBm.replace(/\D/g, '').padStart(4, '0')}`,
        depot: getBusDepot(cleanBm, {}),
        page: 'cleaning',
        reason: 'Turnaround (Cleaning & Wash Required Before Scheduling)',
        isTurnaround: true,
        needsCharging: false,
        chargingCompleted: true,
        needsCleaning: true,
        cleaningCompleted: false,
        startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        startTimestamp: Date.now(),
      };
      setLockedBuses((prev) => {
        const filtered = prev.filter((x) => String(x.bm || x.bmNumber).toUpperCase().trim() !== cleanBm);
        const updated = [turnaroundCleaningLock, ...filtered];
        api.saveLockedBuses(updated).catch((e) => console.warn(e));
        return updated;
      });
      setBuses((prev) =>
        prev.map((b) => {
          if (b.bmNumber === cleanBm) {
            return {
              ...b,
              isLocked: true,
              isCharging: false,
              isCleaning: false,
              isTurnaround: true,
              isNeedsServicing: true,
              needsCharging: false,
              chargingCompleted: true,
              needsCleaning: true,
              cleaningCompleted: false,
              status: 'Turnaround (Locked)',
            };
          }
          return b;
        })
      );
    } else {
      await unlockBus(cleanBm, 'charging');
    }

    // 3. Update bus state (SoC, lastChargedTime, fullDutyDistanceKm, remarks)
    try {
      await api.postChargingBusState({
        unique_id: cleanBm,
        bus: cleanBm,
        soc: Number(record.socAft),
        manual_soc: Number(record.socAft),
        confirmedSoc: Number(record.socAft),
        chargingStatus: record.chargingStatus || 'Completed',
        status: record.chargingStatus === 'Fault' ? 'Blocked' : 'On Time',
        chargerBay: record.chargerBay || 'Charging Bay',
        socBefore: Number(record.socBef),
        socAfter: Number(record.socAft),
        condition: record.chargingStatus === 'Fault' ? 'Not Good' : 'Good',
        operation: 'Single Charge Operation',
        fullDutyDistanceKm: record.fullDutyKm,
        remarks: record.remarks,
        lastChargedTime: record.timeStr,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not post charging record to /api/bus-state:', e);
    }

    // 4. Update servicing status
    try {
      const updatedServ = {
        bm: cleanBm,
        needsCharging: false,
        chargingCompleted: true,
        chargingCompletedAt: record.unlockTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        routeCompleted: !isCleaningDone,
        needsCleaning: !isCleaningDone,
        cleaningCompleted: isCleaningDone,
        status: isCleaningDone ? 'available' : 'turnaround_cleaning',
      };
      await api.updateServicingStatus(cleanBm, updatedServ);
    } catch (e) {
      console.warn('Could not post to /api/servicing-status:', e);
    }

    fetchFleet();
  };

  // Submit cleaning record
  const submitCleaningRecord = async (record) => {
    // 1. Add to cleaning history and persist to server
    setCleaningHistory((prev) => {
      const updated = [record, ...prev];
      api.saveCleaningHistory(updated).catch((err) => console.warn('Could not save cleaning history:', err));
      return updated;
    });

    const cleanBm = String(record.bm || '').toUpperCase().trim();
    // 2. Both charging and cleaning are complete! Unlock the bus!
    await unlockBus(cleanBm, 'cleaning');

    // 3. Update servicing status to fully available
    try {
      const updatedServ = {
        bm: cleanBm,
        needsCleaning: false,
        cleaningCompleted: true,
        cleaningCompletedAt: record.unlockTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        needsCharging: false,
        chargingCompleted: true,
        routeCompleted: false,
        status: 'available',
      };
      await api.updateServicingStatus(cleanBm, updatedServ);
    } catch (e) {
      console.warn('Could not post to /api/servicing-status:', e);
    }

    fetchFleet();
  };

  // Allocate a bus to a route duty
  const allocateBusToRoute = async (duty) => {
    const cleanBm = String(duty.bm || duty.bmNumber).toUpperCase();
    const resolvedDepot = (duty.depot === '1' || duty.depot === '2')
      ? String(duty.depot)
      : getBusDepot(cleanBm, {});
    const cleanDuty = {
      ...duty,
      bm: cleanBm,
      bmNumber: cleanBm,
      depot: resolvedDepot,
      allocatedAt: duty.allocatedAt || (new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', 21 Oct 2026'),
      status: 'Allocated',
    };

    setAllocatedDuties((prev) => {
      const filtered = prev.filter((d) => String(d.bm || d.bmNumber).toUpperCase() !== cleanBm);
      const updated = [cleanDuty, ...filtered];
      api.saveAllocatedDuties(updated).catch((err) => console.warn('Could not save allocated duties to backend:', err));
      return updated;
    });

    setBuses((prev) =>
      prev.map((b) => {
        if (b.bmNumber === cleanBm) {
          return {
            ...b,
            isAllocated: true,
            status: 'Allocated',
            allocatedDuty: cleanDuty,
            assignedRoute: cleanDuty.routeCode || cleanDuty.routeName,
            driver: cleanDuty.driver,
            departureTime: cleanDuty.departureTime,
          };
        }
        return b;
      })
    );
  };

  // Complete a route duty: return bus to depot yard (supports inter-depot transfers)
  const completeRoute = async (bmNumber, remarks = '', targetDepot = null) => {
    const cleanBm = String(bmNumber).toUpperCase();
    let dutyToComplete = null;

    const foundBus = buses.find((b) => b.bmNumber === cleanBm);
    const prevDepot = String((foundBus && foundBus.depot) || '1');
    const completingDepot = targetDepot ? String(targetDepot) : String(selectedDepot || prevDepot || '1');
    const isTransferred = prevDepot !== completingDepot;

    // 1. Remove from allocated duties
    setAllocatedDuties((prev) => {
      dutyToComplete = prev.find((d) => String(d.bm || d.bmNumber).toUpperCase() === cleanBm);
      const updated = prev.filter((d) => String(d.bm || d.bmNumber).toUpperCase() !== cleanBm);
      api.saveAllocatedDuties(updated).catch((err) => console.warn('Could not save allocated duties to backend:', err));
      return updated;
    });

    // 2. Transfer depot on backend if returning to different depot (or reinforce current depot)
    api.assignDepot(cleanBm, completingDepot).catch((err) => console.warn('Could not assign depot on backend:', err));

    // 3. Post-route completion: bus locked in Turnaround (1st Charging, then 2nd Cleaning)
    const turnaroundLock = {
      bm: cleanBm,
      bmNumber: cleanBm,
      reg: (dutyToComplete && dutyToComplete.regNo) || (foundBus && foundBus.regNo) || staticBusRegs[cleanBm] || `KA51AH${cleanBm.replace(/\D/g, '').padStart(4, '0')}`,
      depot: completingDepot,
      page: 'charging', // 1st step: must go for fast charging!
      reason: 'Turnaround (Fast Charging Required First Before Cleaning & Scheduling)',
      isTurnaround: true,
      needsCharging: true,
      chargingCompleted: false,
      needsCleaning: true,
      cleaningCompleted: false,
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      startTimestamp: Date.now(),
    };

    const serviceEntry = {
      bm: cleanBm,
      routeCompleted: true,
      routeCompletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      routeCompletedTs: Date.now(),
      depot: completingDepot,
      needsCharging: true,
      chargingCompleted: false,
      needsCleaning: true,
      cleaningCompleted: false,
      status: 'turnaround_charging',
    };
    servicingStatusRef.current[cleanBm] = serviceEntry;
    api.updateServicingStatus(cleanBm, serviceEntry).catch((err) => console.warn('Could not update servicing status:', err));
    api.completeRouteDuty({
      bm: cleanBm,
      depot: completingDepot,
      remarks: remarks || 'Route completed and bus locked in turnaround for charging & cleaning.',
      route: (dutyToComplete && (dutyToComplete.routeName || dutyToComplete.routeCode)) || '',
      driver: (dutyToComplete && dutyToComplete.driver) || '',
    }).catch((err) => console.warn('Atomic completeRouteDuty error:', err));

    setLockedBuses((prev) => {
      const filtered = prev.filter((l) => String(l.bm || l.bmNumber).toUpperCase().trim() !== cleanBm);
      const updated = [turnaroundLock, ...filtered];
      api.saveLockedBuses(updated).catch((err) => console.warn('Could not save locked buses:', err));
      return updated;
    });

    // 4. Record in completed routes log
    const newLogItem = {
      id: 'comp_' + Date.now(),
      bm: cleanBm,
      reg: (dutyToComplete && dutyToComplete.regNo) || (foundBus && foundBus.regNo) || staticBusRegs[cleanBm] || `KA51AH${cleanBm.replace(/\D/g, '').padStart(4, '0')}`,
      route: (dutyToComplete && (dutyToComplete.routeName || dutyToComplete.routeCode)) || 'Scheduled Route',
      scheduledTime: (dutyToComplete && dutyToComplete.departureTime) || '10:00 AM',
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', 21 Oct 2026',
      dateStr: new Date().toISOString().split('T')[0],
      depot: completingDepot,
      prevDepot: prevDepot,
      isTransferred: isTransferred,
      driver: (dutyToComplete && dutyToComplete.driver) || 'Assigned Driver',
      remarks: remarks || (isTransferred ? `Transferred from Depot ${prevDepot} to Depot ${completingDepot} on route completion.` : 'Route completed on schedule and bus returned to depot yard.'),
      status: 'Returned / Completed',
    };

    setCompletedRoutesLog((prev) => {
      const updated = [newLogItem, ...prev];
      api.saveCompletedRoutes(updated).catch((err) => console.warn('Could not save completed routes log:', err));
      return updated;
    });

    // 5. Update bus in local state: Mark locked in turnaround till both charging & cleaning are done
    setBuses((prev) =>
      prev.map((b) => {
        if (b.bmNumber === cleanBm) {
          return {
            ...b,
            depot: completingDepot,
            isAllocated: false,
            isLocked: true,
            isTurnaround: true,
            isNeedsServicing: true,
            needsCharging: true,
            chargingCompleted: false,
            needsCleaning: true,
            cleaningCompleted: false,
            status: 'Turnaround (Locked)',
            allocatedDuty: null,
            assignedRoute: null,
            driver: null,
          };
        }
        return b;
      })
    );
  };

  // Reset all allocations for a depot
  const resetAllAllocations = (depotNum) => {
    const dStr = String(depotNum);
    setAllocatedDuties((prev) => {
      const remaining = prev.filter((d) => String(d.depot || '1') !== dStr);
      api.saveAllocatedDuties(remaining).catch((err) => console.warn('Failed to reset duties:', err));
      return remaining;
    });

    setBuses((prev) =>
      prev.map((b) => {
        if (String(b.depot || '1') === dStr && b.status === 'Allocated') {
          return {
            ...b,
            isAllocated: false,
            status: 'Available',
            allocatedDuty: null,
            assignedRoute: null,
            driver: null,
          };
        }
        return b;
      })
    );
  };

  // Clear completed routes log
  const clearCompletedRoutesLog = () => {
    setCompletedRoutesLog([]);
    api.saveCompletedRoutes([]).catch((err) => console.warn('Could not clear completed routes log:', err));
  };

  // Filtered buses by currently selected depot tab (Depot 1 or Depot 2 only)
  const currentDepot = selectedDepot === '2' ? '2' : '1';
  let filteredBuses = (buses || []).filter((bus) => bus.depot === currentDepot);
  if (filteredBuses.length === 0) {
    filteredBuses = INITIAL_FLEET.filter((bus) => bus.depot === currentDepot);
  }
  const resolvedAllBuses = (buses && buses.length > 0) ? buses : INITIAL_FLEET;

  const currentDepotAllocCount = (allocatedDuties || []).filter((d) => {
    if (d.depot && (String(d.depot) === '1' || String(d.depot) === '2')) return String(d.depot) === currentDepot;
    const bmClean = String(d.bm || d.bmNumber || '').toUpperCase().trim();
    return getBusDepot(bmClean, {}) === currentDepot;
  }).length;

  // KPI Calculations
  const stats = {
    total: filteredBuses.length,
    available: filteredBuses.filter((b) => b.status === 'Available' && !b.isLocked && !b.isAllocated).length,
    allocated: filteredBuses.filter((b) => b.status === 'Allocated' || b.isAllocated).length,
    charging: filteredBuses.filter((b) => b.isCharging).length,
    cleaning: filteredBuses.filter((b) => b.isCleaning).length,
  };

  return (
    <FleetContext.Provider
      value={{
        buses: filteredBuses,
        allBuses: resolvedAllBuses,
        lockedBuses,
        allocatedDuties,
        completedRoutesLog,
        chargingHistory,
        cleaningHistory,
        stats,
        loading,
        refreshing,
        lastUpdated,
        error,
        refreshFleet: onRefresh,
        updateSoc,
        lockBus,
        unlockBus,
        unlockAllBuses,
        addBusToFleet,
        deleteBusFromFleet,
        restoreBusToFleet,
        localAddedBuses,
        localDeletedBuses,
        submitChargingRecord,
        submitCleaningRecord,
        allocateBusToRoute,
        completeRoute,
        resetAllAllocations,
        clearCompletedRoutesLog,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => useContext(FleetContext);
