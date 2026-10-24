// Helper utility to load detailed sequential GTFS tasks for mobile app matching the website exactly
import detailedTripsData from '../data/detailed_schedule_trips.json';

export const getSequentialTasksForDuty = (duty) => {
  if (!duty) return [];

  const rawRoute = String(duty.routeCode || duty.busNumber || duty.route || '500DC').trim().toUpperCase();
  const rawScheduleId = String(duty.scheduleId || '').trim().toUpperCase();
  const depotNum = String(duty.depot || '1');
  const origin = duty.origin || 'Silk Board';
  const destination = duty.destination || 'Kadugodi';
  const scheduledTime = duty.departureTime || '08:15 AM';
  const routeDist = Number(duty.distance || 28.7);
  const depotTransitKm = 8.5;

  let matchedSchedule = null;

  // 1. Match by exact schedule ID (e.g. 500DC/12, 356Z/7)
  if (rawScheduleId && detailedTripsData[rawScheduleId]) {
    matchedSchedule = detailedTripsData[rawScheduleId];
  }

  // 2. Match by route prefix (e.g. 500DC/ -> 500DC/12)
  if (!matchedSchedule && rawRoute) {
    const matchingKey = Object.keys(detailedTripsData).find(
      (k) => k.toUpperCase().startsWith(rawRoute + '/') || k.toUpperCase() === rawRoute
    );
    if (matchingKey) {
      matchedSchedule = detailedTripsData[matchingKey];
    }
  }

  // 3. If matched in detailed GTFS dataset, map all trips with styling
  if (matchedSchedule && Array.isArray(matchedSchedule.tasks) && matchedSchedule.tasks.length > 0) {
    return matchedSchedule.tasks.map((t, idx) => {
      const type = String(t.taskType || '').toLowerCase();
      let badgeColor = '#16a34a';
      let badgeBg = '#dcfce7';

      if (type.includes('pull-out') || type.includes('pull-in') || type.includes('dead')) {
        badgeColor = '#0284c7';
        badgeBg = '#e0f2fe';
      } else if (type.includes('break') || type.includes('rest') || type.includes('layover')) {
        badgeColor = '#d97706';
        badgeBg = '#fef3c7';
      } else if (type.includes('return')) {
        badgeColor = '#7c3aed';
        badgeBg = '#ede9fe';
      }

      return {
        taskNumber: t.taskNumber || (idx + 1),
        taskType: t.taskType || (idx === 0 ? 'Depot Pull-Out Trip' : (idx === matchedSchedule.tasks.length - 1 ? 'Depot Pull-In Trip' : 'Passenger Service Trip')),
        tripId: t.tripId || `TRIP-${rawRoute}-${idx + 1}`,
        fromStop: t.fromStop || (idx === 0 ? `DPT-${depotNum === '2' ? '41' : '32'} Depot` : origin),
        toStop: t.toStop || (idx === matchedSchedule.tasks.length - 1 ? `DPT-${depotNum === '2' ? '41' : '32'} Depot` : destination),
        departureTime: t.departureTime || scheduledTime,
        arrivalTime: t.arrivalTime || '09:00',
        distanceKm: Number.isFinite(Number(t.distanceKm)) ? Number(t.distanceKm) : (type.includes('pull') ? depotTransitKm : routeDist),
        notes: t.notes || `${t.fromStop} ➔ ${t.toStop}`,
        badgeColor,
        badgeBg,
      };
    });
  }

  // 4. Default structured sequence if not found in dataset
  return [
    {
      taskNumber: 1,
      taskType: 'Depot Pull-Out Trip',
      fromStop: `DPT-${depotNum === '2' ? '41' : '32'} Depot`,
      toStop: origin,
      departureTime: '06:30',
      arrivalTime: '07:15',
      distanceKm: depotTransitKm,
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
    },
    {
      taskNumber: 2,
      taskType: 'Passenger Service Trip',
      fromStop: origin,
      toStop: destination,
      departureTime: scheduledTime,
      arrivalTime: '09:00',
      distanceKm: routeDist,
      badgeColor: '#16a34a',
      badgeBg: '#dcfce7',
    },
    {
      taskNumber: 3,
      taskType: 'Layover / Rest Break',
      fromStop: destination,
      toStop: destination,
      departureTime: '09:00',
      arrivalTime: '09:30',
      distanceKm: 0.0,
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
    },
    {
      taskNumber: 4,
      taskType: 'Return Passenger Trip',
      fromStop: destination,
      toStop: origin,
      departureTime: '09:30',
      arrivalTime: '11:15',
      distanceKm: routeDist,
      badgeColor: '#7c3aed',
      badgeBg: '#ede9fe',
    },
    {
      taskNumber: 5,
      taskType: 'Layover / Rest Break',
      fromStop: origin,
      toStop: origin,
      departureTime: '11:15',
      arrivalTime: '11:45',
      distanceKm: 0.0,
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
    },
    {
      taskNumber: 6,
      taskType: 'Passenger Service Trip',
      fromStop: origin,
      toStop: destination,
      departureTime: '11:45',
      arrivalTime: '13:15',
      distanceKm: routeDist,
      badgeColor: '#16a34a',
      badgeBg: '#dcfce7',
    },
    {
      taskNumber: 7,
      taskType: 'Return Passenger Trip',
      fromStop: destination,
      toStop: origin,
      departureTime: '13:30',
      arrivalTime: '15:00',
      distanceKm: routeDist,
      badgeColor: '#7c3aed',
      badgeBg: '#ede9fe',
    },
    {
      taskNumber: 8,
      taskType: 'Depot Pull-In Trip',
      fromStop: origin,
      toStop: `DPT-${depotNum === '2' ? '41' : '32'} Depot`,
      departureTime: '15:15',
      arrivalTime: '16:00',
      distanceKm: depotTransitKm,
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
    },
  ];
};
