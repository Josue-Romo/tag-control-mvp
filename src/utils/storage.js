const CONFIG_KEY = 'tag_control_user_config_v1';
const TRIPS_KEY = 'tag_control_trips_v1';
const LEGACY_SEED_IDS = new Set(['seed-trip-1', 'seed-trip-2']);

export const DRIVER_PROFILES = [
  {
    id: 'particular',
    label: 'Conductor Particular',
    shortLabel: 'Particular',
    description: 'Traslados diarios al trabajo, casa y trámites',
    suggestedBudget: 60000,
  },
  {
    id: 'conductor_app',
    label: 'Conductor App',
    shortLabel: 'Conductor App',
    description: 'Uber, Cabify, DiDi o transporte de pasajeros',
    suggestedBudget: 200000,
  },
  {
    id: 'comercial',
    label: 'Reparto / Comercial',
    shortLabel: 'Comercial',
    description: 'Rutas intensivas y despachos en la RM',
    suggestedBudget: 150000,
  },
];

export const DEFAULT_CONFIG = {
  monthlyBudget: 60000,
  profile: 'particular',
  onboardingCompleted: false,
  soundEnabled: true,
};

export function loadUserConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveUserConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

export function loadTrips() {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Strip any legacy demo seed trips if present from older builds
    const cleaned = parsed.filter((trip) => !LEGACY_SEED_IDS.has(trip?.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(TRIPS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveTrips(trips) {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  } catch {
    // Ignore storage errors
  }
}

export function getCurrentMonthSpent(trips, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  return trips.reduce((acc, trip) => {
    const dt = new Date(trip.endedAt || trip.startedAt);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      return acc + (Number(trip.totalCost) || 0);
    }
    return acc;
  }, 0);
}
