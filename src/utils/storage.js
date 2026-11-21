import porticosData from '../data/porticosSantiago.json';

const CONFIG_KEY = 'tag_control_user_config_v1';
const TRIPS_KEY = 'tag_control_trips_v1';

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

function buildSeedTrips() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  // Keep seed trips inside the current calendar month so monthly spend is accurate
  const day1 = Math.max(1, d - 4);
  const day2 = Math.max(1, d - 1);

  const costanera = porticosData.rutas.find((r) => r.id === 'costanera-norte');
  const central = porticosData.rutas.find((r) => r.id === 'autopista-central');

  const buildFromRoute = (route, horario, startDate, tripId, count) => {
    const selected = route.porticos.slice(0, count);
    let cursor = new Date(startDate);
    let total = 0;
    let totalKm = 0;
    let totalMin = 0;

    const crossings = selected.map((p) => {
      cursor = new Date(cursor.getTime() + p.duracionMin * 60 * 1000);
      const costo = p.tarifas[horario];
      total += costo;
      totalKm += p.distanciaKm;
      totalMin += p.duracionMin;
      return {
        ...p,
        costo,
        crossedAt: cursor.toISOString(),
      };
    });

    return {
      id: tripId,
      routeId: route.id,
      routeName: route.nombre,
      horario,
      mode: 'simulation',
      startedAt: startDate.toISOString(),
      endedAt: cursor.toISOString(),
      totalCost: total,
      totalDistanceKm: Number(totalKm.toFixed(1)),
      durationMin: totalMin,
      porticos: crossings,
    };
  };

  const trip1Start = new Date(y, m, day1, 8, 12);
  const trip2Start = new Date(y, m, day2, 18, 5);

  return [
    buildFromRoute(central, 'punta', trip2Start, 'seed-trip-2', 4),
    buildFromRoute(costanera, 'punta', trip1Start, 'seed-trip-1', 5),
  ];
}

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
    if (!raw) {
      const seeded = buildSeedTrips();
      localStorage.setItem(TRIPS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  } catch {
    return buildSeedTrips();
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
