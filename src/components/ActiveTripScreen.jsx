import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FastForward,
  Flag,
  Lock,
  Navigation,
  Pause,
  Play,
  Radio,
  Signal,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import porticosData from '../data/porticosSantiago.json';
import {
  formatCLP,
  formatDistance,
  formatTime,
  haversineDistanceMeters,
} from '../utils/format';
import { trackEvent } from '../utils/analytics';
import {
  downloadGpsDebugLog,
  saveGpsDebugLog,
} from '../utils/gpsDebugLog';
import PorticoIcon from './PorticoIcon';
import PorticoNotification from './PorticoNotification';

const SIMULATION_INTERVAL_MS = 3500;
const DETECTION_RADIUS_METERS = 90;
const MAX_GPS_ACCURACY_METERS = 65;
const MIN_SPEED_MPS = 3; // ~10.8 km/h
const REQUIRED_CONSECUTIVE_HITS = 2;

function playSubtleChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export default function ActiveTripScreen({
  route,
  horario,
  mode,
  monthlySpentBeforeTrip,
  monthlyBudget,
  soundEnabled,
  onToggleSound,
  onNotificationChange,
  onFinishTrip,
  onCancelTrip,
}) {
  const [crossedPorticos, setCrossedPorticos] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [lockPreview, setLockPreview] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);
  const [gpsState, setGpsState] = useState({
    status: mode === 'gps' ? 'searching' : 'inactive',
    message: 'Buscando señal GPS precisa...',
    coords: null,
    accuracy: null,
    speed: null,
    nearestMeters: null,
    nearestName: null,
  });
  const [gpsLogCount, setGpsLogCount] = useState(0);

  const tripStartRef = useRef(new Date());
  const crossedIdsRef = useRef(new Set());
  const crossedListRef = useRef([]);
  const consecutiveHitsRef = useRef(new Map());
  const gpsDebugLogRef = useRef([]);
  const finishedRef = useRef(false);

  const horarioObj = useMemo(
    () => porticosData.horarios.find((h) => h.id === horario) || porticosData.horarios[1],
    [horario]
  );

  const tripTotal = useMemo(
    () => crossedPorticos.reduce((sum, p) => sum + p.costo, 0),
    [crossedPorticos]
  );

  const tripDistanceKm = useMemo(
    () =>
      Number(
        crossedPorticos.reduce((sum, p) => sum + p.distanciaKm, 0).toFixed(1)
      ),
    [crossedPorticos]
  );

  const liveMonthlyTotal = monthlySpentBeforeTrip + tripTotal;

  const completeTrip = useCallback(
    (finalList) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onNotificationChange(null);

      const list = finalList || crossedPorticos;
      const now = new Date();

      // Build realistic timestamps when in fast simulation mode so summary timeline mirrors real highway travel
      const totalDurationMin = list.reduce((sum, p) => sum + p.duracionMin, 0);
      let timelinePorticos = list;
      let startedAt = tripStartRef.current;
      let endedAt = now;

      if (mode === 'simulation' && list.length > 0) {
        endedAt = now;
        startedAt = new Date(endedAt.getTime() - totalDurationMin * 60 * 1000);
        let cursor = new Date(startedAt);
        timelinePorticos = list.map((p) => {
          cursor = new Date(cursor.getTime() + p.duracionMin * 60 * 1000);
          return {
            ...p,
            crossedAt: cursor.toISOString(),
          };
        });
      }

      const totalCost = timelinePorticos.reduce((sum, p) => sum + p.costo, 0);
      const totalDist = Number(
        timelinePorticos.reduce((sum, p) => sum + p.distanciaKm, 0).toFixed(1)
      );

      let resolvedRouteName = route.nombre;
      if (route.id === 'auto-gps-santiago' && timelinePorticos.length > 0) {
        const uniqueHighways = [...new Set(timelinePorticos.map((p) => p.autopista))];
        resolvedRouteName =
          uniqueHighways.length === 1
            ? uniqueHighways[0]
            : `${uniqueHighways[0]} y otras`;
      }

      onFinishTrip({
        id: `trip-${Date.now()}`,
        routeId: route.id,
        routeName: resolvedRouteName,
        horario,
        mode,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        totalCost,
        totalDistanceKm: totalDist,
        durationMin:
          mode === 'simulation'
            ? Math.max(1, totalDurationMin)
            : Math.max(
                1,
                Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
              ),
        porticos: timelinePorticos,
      });
    },
    [crossedPorticos, horario, mode, onFinishTrip, onNotificationChange, route.id, route.nombre]
  );

  const registerPortico = useCallback(
    (portico) => {
      if (crossedIdsRef.current.has(portico.id) || finishedRef.current) return;
      crossedIdsRef.current.add(portico.id);

      const cost = portico.tarifas[horario] || portico.tarifas.punta;
      const crossedAt = new Date().toISOString();

      const nextList = [...crossedListRef.current, { ...portico, costo: cost, crossedAt }];
      crossedListRef.current = nextList;
      setCrossedPorticos(nextList);

      const nextTripTotal = nextList.reduce((sum, p) => sum + p.costo, 0);
      const nextMonthly = monthlySpentBeforeTrip + nextTripTotal;

      const notifPayload = {
        key: `${portico.id}-${Date.now()}`,
        portico,
        cost,
        tripTotal: nextTripTotal,
        monthlyTotal: nextMonthly,
      };

      setLatestNotification(notifPayload);
      onNotificationChange(notifPayload);

      if (soundEnabled) {
        playSubtleChime();
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }

      trackEvent('portico_crossed', {
        routeId: route.id,
        porticoId: portico.id,
        porticoName: portico.nombre,
        horario,
        mode,
        cost,
        tripTotal: nextTripTotal,
        monthlyTotal: nextMonthly,
      });
    },
    [horario, mode, monthlySpentBeforeTrip, onNotificationChange, route.id, soundEnabled]
  );

  // Simulation mode timer: crosses one portico every ~3.5 seconds
  useEffect(() => {
    if (mode !== 'simulation' || isPaused) return;

    const nextPortico = route.porticos.find(
      (p) => !crossedIdsRef.current.has(p.id)
    );

    if (!nextPortico) {
      const doneTimer = setTimeout(() => {
        completeTrip(crossedPorticos);
      }, 2800);
      return () => clearTimeout(doneTimer);
    }

    // Trigger first portico slightly faster (1.4s) so the user immediately sees the notification banner
    const delay = crossedPorticos.length === 0 ? 1400 : SIMULATION_INTERVAL_MS;
    const timer = setTimeout(() => {
      registerPortico(nextPortico);
    }, delay);

    return () => clearTimeout(timer);
  }, [
    completeTrip,
    crossedPorticos,
    isPaused,
    mode,
    registerPortico,
    route.porticos,
  ]);

  // Real GPS mode via navigator.geolocation (hardened accuracy + speed/consecutive hit filter)
  useEffect(() => {
    if (mode !== 'gps') return;

    // Reset fresh diagnostic trace for this GPS trip
    gpsDebugLogRef.current = [];
    consecutiveHitsRef.current = new Map();
    saveGpsDebugLog([]);
    setGpsLogCount(0);

    if (!('geolocation' in navigator)) {
      setGpsState({
        status: 'error',
        message: 'Tu navegador no soporta geolocalización GPS.',
        coords: null,
        accuracy: null,
        speed: null,
        nearestMeters: null,
        nearestName: null,
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const safeAccuracy =
          typeof accuracy === 'number' && Number.isFinite(accuracy)
            ? accuracy
            : null;
        const safeSpeed =
          typeof speed === 'number' && Number.isFinite(speed) && speed >= 0
            ? speed
            : null;
        const safeHeading =
          typeof heading === 'number' && Number.isFinite(heading) && heading >= 0
            ? Math.round(heading)
            : null;

        // Compute nearest uncrossed portico for telemetry and diagnostic logging
        let nearest = null;
        const distances = route.porticos.map((p) => {
          const dist = haversineDistanceMeters(latitude, longitude, p.lat, p.lng);
          if (!crossedIdsRef.current.has(p.id)) {
            if (!nearest || dist < nearest.dist) {
              nearest = { portico: p, dist };
            }
          }
          return { portico: p, dist };
        });

        let triggered = false;
        const isLowAccuracy =
          safeAccuracy === null || safeAccuracy > MAX_GPS_ACCURACY_METERS;

        if (isLowAccuracy) {
          // Ignore cell/Wi-Fi triangulation jumps (> 65m); reset consecutive counters
          consecutiveHitsRef.current.clear();

          setGpsState((prev) => ({
            ...prev,
            status: 'low_accuracy',
            message: 'Buscando señal GPS precisa...',
            accuracy: safeAccuracy !== null ? Math.round(safeAccuracy) : null,
            speed: safeSpeed,
          }));
        } else {
          // Valid high-accuracy reading (<= 65m): evaluate 90m portico radius
          const isMovingFast =
            safeSpeed !== null && safeSpeed > MIN_SPEED_MPS;
          const isStationaryAtLight =
            safeSpeed !== null && safeSpeed < 1;

          distances.forEach(({ portico: p, dist }) => {
            if (crossedIdsRef.current.has(p.id)) return;

            if (dist <= DETECTION_RADIUS_METERS) {
              const hits = (consecutiveHitsRef.current.get(p.id) || 0) + 1;
              consecutiveHitsRef.current.set(p.id, hits);

              // Trigger if moving > 3 m/s (~11 km/h), OR if >= 2 consecutive readings
              // when speed isn't reported (or moving slowly in highway traffic, not stopped)
              const confirmedCrossing =
                isMovingFast ||
                (!isStationaryAtLight && hits >= REQUIRED_CONSECUTIVE_HITS);

              if (confirmedCrossing) {
                registerPortico(p);
                consecutiveHitsRef.current.delete(p.id);
                triggered = true;
              }
            } else {
              consecutiveHitsRef.current.delete(p.id);
            }
          });

          setGpsState({
            status: 'active',
            message: `GPS preciso activo (±${Math.round(safeAccuracy)} m)`,
            coords: { lat: latitude, lng: longitude },
            accuracy: Math.round(safeAccuracy),
            speed: safeSpeed,
            nearestMeters: nearest ? Math.round(nearest.dist) : null,
            nearestName: nearest ? nearest.portico.nombre : 'Ruta completada',
          });
        }

        // Persist every GPS reading to memory + localStorage for field diagnostics
        const logEntry = {
          timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
          lat: Number(latitude.toFixed(7)),
          lng: Number(longitude.toFixed(7)),
          accuracy:
            safeAccuracy !== null ? Number(safeAccuracy.toFixed(1)) : null,
          speed: safeSpeed !== null ? Number(safeSpeed.toFixed(2)) : null,
          heading: safeHeading,
          nearestPorticoId: nearest ? nearest.portico.id : null,
          distanceMeters: nearest ? Math.round(nearest.dist) : null,
          triggered,
        };

        gpsDebugLogRef.current.push(logEntry);
        saveGpsDebugLog(gpsDebugLogRef.current);
        setGpsLogCount(gpsDebugLogRef.current.length);
      },
      (err) => {
        const msg =
          err.code === 1
            ? 'Permiso de ubicación denegado. Habilita el GPS o usa paso manual.'
            : 'Buscando señal GPS precisa...';
        setGpsState((prev) => ({
          ...prev,
          status: err.code === 1 ? 'error' : 'low_accuracy',
          message: msg,
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [mode, registerPortico, route.porticos]);

  const handleManualNext = () => {
    const next = route.porticos.find((p) => !crossedIdsRef.current.has(p.id));
    if (next) {
      registerPortico(next);
    } else {
      completeTrip(crossedPorticos);
    }
  };

  const progressPct = Math.round(
    (crossedPorticos.length / Math.max(1, route.porticos.length)) * 100
  );

  // Lock screen simulation view for field testers
  if (lockPreview) {
    const nowClock = new Date();
    const bigTime = formatTime(nowClock);
    const lockDate = nowClock.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return (
      <div className="min-h-full bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col justify-between px-1 py-6 relative">
        <div className="text-center pt-4">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-300/90 font-medium mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Vista Pantalla Bloqueada</span>
          </div>
          <p className="text-6xl font-bold tracking-tight tabular-nums leading-none">
            {bigTime}
          </p>
          <p className="text-sm text-slate-300 capitalize mt-1.5">{lockDate}</p>
        </div>

        <div className="my-6">
          {latestNotification ? (
            <PorticoNotification
              notification={latestNotification}
              lockScreenStyle
            />
          ) : (
            <div className="mx-4 rounded-2xl bg-white/10 backdrop-blur-md p-4 text-center text-xs text-slate-200">
              Esperando el próximo pórtico para mostrar la notificación en pantalla bloqueada...
            </div>
          )}
        </div>

        <div className="px-4 pb-2 space-y-2.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleManualNext}
              className="flex-1 py-3 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              Probar siguiente pórtico
            </button>
            <button
              type="button"
              onClick={() => setLockPreview(false)}
              className="flex-1 py-3 rounded-2xl bg-white text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Volver a la app
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-6 bg-[#F8FAFC]">
      {/* Dark top telemetry header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white px-5 pt-5 pb-7 rounded-b-[28px] shadow-md">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            {mode === 'simulation'
              ? isPaused
                ? 'Simulación pausada'
                : 'Simulación en vivo'
              : 'GPS Real activo'}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLockPreview(true)}
              className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Previsualizar notificación estilo Lock Screen"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Screen
            </button>
            <button
              type="button"
              onClick={onToggleSound}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
              aria-label={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        <p className="text-xs font-medium text-slate-400">{route.nombre}</p>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Gasto de este viaje
            </p>
            <p className="text-[40px] font-extrabold tracking-tight tabular-nums leading-none mt-1 text-emerald-400">
              {formatCLP(tripTotal)}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-semibold text-slate-200">
              {horarioObj.shortLabel}
            </span>
            <p className="text-[11px] text-slate-400 mt-1.5 tabular-nums">
              Mes: <strong className="text-white">{formatCLP(liveMonthlyTotal)}</strong> /{' '}
              {formatCLP(monthlyBudget)}
            </p>
          </div>
        </div>

        {/* Route progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5">
            <span className="font-semibold">
              {route.id === 'auto-gps-santiago'
                ? `${crossedPorticos.length} ${
                    crossedPorticos.length === 1
                      ? 'pórtico detectado'
                      : 'pórticos detectados'
                  } · ${route.porticos.length} monitoreados en RM`
                : `${crossedPorticos.length} de ${route.porticos.length} pórticos`}
            </span>
            <span className="tabular-nums">{formatDistance(tripDistanceKm)}</span>
          </div>
          <div className="h-2 w-full bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, progressPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main live status area */}
      <div className="px-4 -mt-3 space-y-3.5 flex-1">
        {/* Mode banner: GPS Radar or Simulation status */}
        {mode === 'gps' ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-900/5 space-y-2.5">
            <div className="flex items-start gap-3">
              <div
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  gpsState.status === 'low_accuracy' || gpsState.status === 'searching'
                    ? 'bg-amber-50 text-amber-600'
                    : gpsState.status === 'error'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-emerald-50 text-[#1E7E53]'
                }`}
              >
                <Navigation className="w-5 h-5" />
                {gpsState.status === 'active' && (
                  <span className="absolute inset-0 rounded-xl border-2 border-[#1E7E53]/40 animate-pulse-ring" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Signal
                      className={`w-3.5 h-3.5 ${
                        gpsState.status === 'low_accuracy' || gpsState.status === 'searching'
                          ? 'text-amber-500'
                          : gpsState.status === 'error'
                          ? 'text-red-500'
                          : 'text-[#1E7E53]'
                      }`}
                    />
                    {gpsState.message}
                  </p>
                  {gpsState.speed !== null && gpsState.status === 'active' && (
                    <span className="text-[10.5px] font-bold text-slate-500 tabular-nums shrink-0">
                      {Math.round(gpsState.speed * 3.6)} km/h
                    </span>
                  )}
                </div>

                {gpsState.status === 'low_accuracy' ? (
                  <p className="text-[11px] text-amber-700 mt-1 leading-snug">
                    Precisión actual baja
                    {gpsState.accuracy ? ` (±${gpsState.accuracy} m)` : ''}. Esperando señal ≤{' '}
                    {MAX_GPS_ACCURACY_METERS} m para evitar falsos cobros.
                  </p>
                ) : gpsState.nearestMeters !== null ? (
                  <p className="text-[11.5px] text-slate-500 mt-1">
                    Próximo pórtico:{' '}
                    <strong className="text-slate-800">{gpsState.nearestName}</strong> a{' '}
                    <span className="tabular-nums font-semibold">
                      {gpsState.nearestMeters >= 1000
                        ? `${(gpsState.nearestMeters / 1000).toFixed(1).replace('.', ',')} km`
                        : `${gpsState.nearestMeters} m`}
                    </span>{' '}
                    (radio {DETECTION_RADIUS_METERS} m)
                  </p>
                ) : (
                  <p className="text-[11.5px] text-slate-500 mt-1">
                    Radio de detección: {DETECTION_RADIUS_METERS} m · Precisión requerida ≤{' '}
                    {MAX_GPS_ACCURACY_METERS} m.
                  </p>
                )}
              </div>
            </div>

            {/* Discreet downloadable GPS diagnostic log button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10.5px] text-slate-400 tabular-nums">
                Diagnóstico GPS · {gpsLogCount}{' '}
                {gpsLogCount === 1 ? 'lectura' : 'lecturas'}
              </span>
              <button
                type="button"
                onClick={() => downloadGpsDebugLog(gpsDebugLogRef.current)}
                disabled={gpsLogCount === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-45 text-slate-700 text-[10.5px] font-semibold transition cursor-pointer"
              >
                <Download className="w-3 h-3" />
                Descargar Log GPS (JSON)
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-3.5 shadow-sm ring-1 ring-slate-900/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1E7E53] flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">
                  {crossedPorticos.length < route.porticos.length
                    ? 'Detectando pórticos cada 3.5 seg'
                    : '¡Último pórtico cruzado! Cerrando...'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Notificación enriquecida activa en ruta
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Seguir
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pausar
                </>
              )}
            </button>
          </div>
        )}

        {/* Live Route Porticos Checklist */}
        <div className="bg-white rounded-[22px] p-4 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {route.id === 'auto-gps-santiago'
                ? 'Pórticos detectados y cercanos'
                : 'Pórticos del trayecto'}
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              Tarifa {horarioObj.shortLabel}
            </span>
          </div>

          <div className="space-y-2.5">
            {(route.id === 'auto-gps-santiago'
              ? [
                  ...crossedPorticos,
                  ...route.porticos
                    .filter((item) => !crossedPorticos.some((c) => c.id === item.id))
                    .sort((a, b) => {
                      if (!gpsState.coords) return 0;
                      const da = haversineDistanceMeters(
                        gpsState.coords.lat,
                        gpsState.coords.lng,
                        a.lat,
                        a.lng
                      );
                      const db = haversineDistanceMeters(
                        gpsState.coords.lat,
                        gpsState.coords.lng,
                        b.lat,
                        b.lng
                      );
                      return da - db;
                    })
                    .slice(0, 4),
                ]
              : route.porticos
            ).map((p, index) => {
              const crossed = crossedPorticos.find((c) => c.id === p.id);
              const isNext =
                !crossed &&
                p.id ===
                  route.porticos.find(
                    (item) => !crossedPorticos.some((c) => c.id === item.id)
                  )?.id;
              const cost = p.tarifas[horario] || p.tarifas.punta;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl border transition ${
                    crossed
                      ? 'bg-emerald-50/60 border-emerald-200/80'
                      : isNext
                      ? 'bg-slate-50 border-slate-300/90 border-dashed'
                      : 'bg-white border-slate-100 opacity-65'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        crossed
                          ? 'bg-[#1E7E53] text-white'
                          : isNext
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {crossed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          crossed ? 'text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {p.nombre}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {p.autopista} · {p.sentido}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`block text-xs font-extrabold tabular-nums ${
                        crossed ? 'text-[#1E7E53]' : 'text-slate-500'
                      }`}
                    >
                      {formatCLP(cost)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {crossed ? formatTime(crossed.crossedAt) : isNext ? 'Siguiente' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action controls */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleManualNext}
              disabled={crossedPorticos.length >= route.porticos.length}
              className="py-3 px-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-45 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <PorticoIcon className="w-4 h-4 text-[#1E7E53]" />
              {mode === 'gps' ? 'Registrar paso manual' : 'Siguiente pórtico'}
            </button>

            <button
              type="button"
              onClick={() => completeTrip(crossedPorticos)}
              disabled={crossedPorticos.length === 0}
              className="py-3 px-3 rounded-2xl bg-[#1E7E53] hover:bg-[#15803D] disabled:opacity-45 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              Finalizar viaje
            </button>
          </div>

          <button
            type="button"
            onClick={onCancelTrip}
            className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            Cancelar viaje sin guardar
          </button>
        </div>
      </div>
    </div>
  );
}
