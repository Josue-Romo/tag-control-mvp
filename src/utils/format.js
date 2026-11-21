/**
 * Format CLP currency in Chilean style: $1.250, $60.000
 */
export function formatCLP(amount) {
  const numeric = Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : 0;
  const formatted = Math.abs(numeric)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return numeric < 0 ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Format duration in minutes to "44 min" or "1h 42 min"
 */
export function formatDuration(totalMinutes) {
  const mins = Math.max(1, Math.round(Number(totalMinutes) || 0));
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem} min`;
}

/**
 * Format distance in km using Chilean decimal comma (e.g., "28,0 km" or "125 km")
 */
export function formatDistance(km) {
  const val = Number(km) || 0;
  if (Number.isInteger(val)) {
    return `${val} km`;
  }
  return `${val.toFixed(1).replace('.', ',')} km`;
}

/**
 * Format clock time HH:MM
 */
export function formatTime(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format compact Chilean date like "Sáb 21 nov 2026"
 */
export function formatShortDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const weekday = d.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
  const day = d.getDate();
  const month = d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
  const year = d.getFullYear();
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capWeekday} ${day} ${month} ${year}`;
}

/**
 * Compute Haversine distance in meters between two GPS coordinates
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate monthly budget status semantics:
 * Verde < 75%, Ámbar 75-90%, Rojo > 90%
 */
export function getBudgetStatus(spent, budget) {
  const safeBudget = Math.max(1, Number(budget) || 60000);
  const ratio = spent / safeBudget;
  const percent = Math.round(ratio * 100);

  if (ratio > 0.9) {
    return {
      level: 'danger',
      label: ratio >= 1 ? 'Presupuesto superado' : 'Cerca del límite',
      percent,
      clampedPercent: Math.min(100, percent),
      barClass: 'bg-red-500',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      textClass: 'text-red-600',
    };
  }

  if (ratio >= 0.75) {
    return {
      level: 'warning',
      label: 'Atención a tu tope',
      percent,
      clampedPercent: Math.min(100, percent),
      barClass: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      textClass: 'text-amber-600',
    };
  }

  return {
    level: 'safe',
    label: 'Bajo control',
    percent,
    clampedPercent: Math.min(100, percent),
    barClass: 'bg-[#1E7E53]',
    badgeClass: 'bg-emerald-50 text-[#15803D] border-emerald-200',
    textClass: 'text-[#1E7E53]',
  };
}

/**
 * Project month-end spend based on current calendar day of the month
 */
export function calculateMonthProjection(spent, now = new Date()) {
  const dayOfMonth = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = Math.round((spent / dayOfMonth) * daysInMonth);
  return {
    projected,
    dayOfMonth,
    daysInMonth,
    daysRemaining: Math.max(0, daysInMonth - dayOfMonth),
  };
}

/**
 * Determine Santiago highway tariff block from current system time:
 * 'fuera_punta' | 'punta' | 'saturacion'
 */
export function detectCurrentHorario(now = new Date()) {
  const day = now.getDay(); // 0 = Sun, 6 = Sat
  const minutes = now.getHours() * 60 + now.getMinutes();

  const isWeekday = day >= 1 && day <= 5;
  if (isWeekday) {
    // Saturación (peak congestion windows on Santiago urban highways)
    if (
      (minutes >= 7 * 60 + 30 && minutes < 9 * 60) ||
      (minutes >= 18 * 60 && minutes < 19 * 60 + 30)
    ) {
      return 'saturacion';
    }
    // Hora Punta
    if (
      (minutes >= 7 * 60 && minutes < 10 * 60) ||
      (minutes >= 17 * 60 && minutes < 20 * 60 + 30)
    ) {
      return 'punta';
    }
    return 'fuera_punta';
  }

  // Sunday evening return peak
  if (day === 0 && minutes >= 18 * 60 && minutes < 21 * 60) {
    return 'punta';
  }

  return 'fuera_punta';
}
