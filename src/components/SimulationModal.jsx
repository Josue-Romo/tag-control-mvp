import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Clock,
  FlaskConical,
  Play,
  X,
} from 'lucide-react';
import porticosData from '../data/porticosSantiago.json';
import {
  formatCLP,
  formatDistance,
  formatDuration,
} from '../utils/format';
import PorticoIcon from './PorticoIcon';

export default function SimulationModal({
  selectedRouteId,
  selectedHorario,
  onSelectRoute,
  onSelectHorario,
  onStartSimulation,
  onClose,
}) {
  const selectedRoute = useMemo(
    () =>
      porticosData.rutas.find((r) => r.id === selectedRouteId) ||
      porticosData.rutas[0],
    [selectedRouteId]
  );

  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(
    Math.max(0, selectedRoute.porticos.length - 1)
  );

  // Reset entrance/exit indices whenever the user switches directional route
  useEffect(() => {
    setStartIndex(0);
    setEndIndex(Math.max(0, selectedRoute.porticos.length - 1));
  }, [selectedRoute.id, selectedRoute.porticos.length]);

  const safeStart = Math.min(startIndex, selectedRoute.porticos.length - 1);
  const safeEnd = Math.max(
    safeStart,
    Math.min(endIndex, selectedRoute.porticos.length - 1)
  );

  const slicedPorticos = useMemo(
    () => selectedRoute.porticos.slice(safeStart, safeEnd + 1),
    [selectedRoute.porticos, safeStart, safeEnd]
  );

  const sliceMetrics = useMemo(() => {
    const cost = slicedPorticos.reduce(
      (sum, p) => sum + (p.tarifas[selectedHorario] || 0),
      0
    );
    const km = Number(
      slicedPorticos.reduce((sum, p) => sum + (p.distanciaKm || 0), 0).toFixed(1)
    );
    const min = slicedPorticos.reduce(
      (sum, p) => sum + (p.duracionMin || 0),
      0
    );
    return { cost, km, min };
  }, [slicedPorticos, selectedHorario]);

  const activeHorarioObj =
    porticosData.horarios.find((h) => h.id === selectedHorario) ||
    porticosData.horarios[1];

  const handleStartChange = (e) => {
    const nextStart = Number(e.target.value);
    setStartIndex(nextStart);
    if (nextStart > endIndex) {
      setEndIndex(nextStart);
    }
  };

  const handleEndChange = (e) => {
    const nextEnd = Number(e.target.value);
    setEndIndex(Math.max(safeStart, nextEnd));
  };

  const handleLaunch = () => {
    const isFullRoute =
      safeStart === 0 && safeEnd === selectedRoute.porticos.length - 1;
    const firstCode = slicedPorticos[0]?.codigo;
    const lastCode = slicedPorticos[slicedPorticos.length - 1]?.codigo;

    const customRoute = {
      ...selectedRoute,
      nombre: isFullRoute
        ? selectedRoute.nombre
        : `${selectedRoute.nombreCorto} · ${firstCode} → ${lastCode}`,
      distanciaTotalKm: sliceMetrics.km,
      duracionEstimadaMin: sliceMetrics.min,
      porticos: slicedPorticos,
    };

    onStartSimulation(customRoute);
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-2.5 sm:p-3">
      <div className="w-full bg-white rounded-[28px] shadow-2xl overflow-hidden animate-notification-in max-h-[92%] flex flex-col">
        {/* Sticky Top Header with Schedule Selector always visible without scroll */}
        <div className="shrink-0 bg-slate-900 text-white px-4 pt-4 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/15 text-emerald-300 flex items-center justify-center shrink-0">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-extrabold leading-tight">
                  Simular trayecto de prueba
                </h2>
                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                  Elige horario, autopista y tu tramo habitual
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition cursor-pointer"
              aria-label="Cerrar simulador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Schedule Block Selector in Modal Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                Bloque horario
              </span>
              <span className="text-slate-400">{activeHorarioObj.rango}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-white/10 p-1 rounded-xl">
              {porticosData.horarios.map((h) => {
                const active = selectedHorario === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onSelectHorario(h.id)}
                    className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {h.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Route List + Inline Sub-stretch Dropdowns */}
        <div className="flex-1 overflow-y-auto phone-scroll p-4 space-y-2.5 bg-[#F8FAFC]">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Autopista y sentido ({porticosData.rutas.length} ejes)
            </span>
            <span className="text-[10.5px] font-medium text-slate-400">
              Tarifas 2026
            </span>
          </div>

          <div className="space-y-2">
            {porticosData.rutas.map((ruta) => {
              const isSelected = ruta.id === selectedRoute.id;
              const fullRouteCost = ruta.porticos.reduce(
                (acc, p) => acc + (p.tarifas[selectedHorario] || 0),
                0
              );

              return (
                <div
                  key={ruta.id}
                  className={`rounded-2xl border transition overflow-hidden ${
                    isSelected
                      ? 'border-[#1E7E53] bg-white ring-1 ring-[#1E7E53] shadow-xs'
                      : 'border-slate-200/90 bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectRoute(ruta.id)}
                    className="w-full text-left p-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 leading-snug">
                          {ruta.nombre}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {ruta.descripcion}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-[13.5px] font-extrabold text-[#1E7E53] tabular-nums">
                          {formatCLP(isSelected ? sliceMetrics.cost : fullRouteCost)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isSelected &&
                          (safeStart > 0 || safeEnd < ruta.porticos.length - 1)
                            ? 'tramo'
                            : 'ruta comp.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[10.5px] font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <PorticoIcon className="w-3 h-3 text-slate-400" />
                        {isSelected ? slicedPorticos.length : ruta.porticos.length}{' '}
                        {(isSelected ? slicedPorticos.length : ruta.porticos.length) ===
                        1
                          ? 'pórtico'
                          : 'pórticos'}
                      </span>
                      <span>·</span>
                      <span>
                        {formatDistance(
                          isSelected ? sliceMetrics.km : ruta.distanciaTotalKm
                        )}
                      </span>
                      <span>·</span>
                      <span>
                        {formatDuration(
                          isSelected
                            ? sliceMetrics.min
                            : ruta.duracionEstimadaMin
                        )}
                      </span>
                    </div>
                  </button>

                  {/* Sub-stretch selector (Entrance -> Exit portico) */}
                  {isSelected && (
                    <div className="px-3 pb-3 pt-2.5 border-t border-emerald-100 bg-emerald-50/45 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#15803D] flex items-center gap-1">
                          Tramo habitual
                          <ArrowRight className="w-3 h-3" />
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-500 tabular-nums">
                          {slicedPorticos.length} de {ruta.porticos.length}{' '}
                          pórticos
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label
                            htmlFor="sim-start-portico"
                            className="block text-[10.5px] font-semibold text-slate-600 mb-1"
                          >
                            Pórtico de entrada
                          </label>
                          <select
                            id="sim-start-portico"
                            value={safeStart}
                            onChange={handleStartChange}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11.5px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E7E53]/30 focus:border-[#1E7E53] truncate"
                          >
                            {ruta.porticos.map((p, idx) => (
                              <option key={p.id} value={idx}>
                                {idx + 1}. [{p.codigo}] {p.nombre.replace(/^Pórtico\s+/i, '')} (
                                {formatCLP(p.tarifas[selectedHorario] || 0)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="sim-end-portico"
                            className="block text-[10.5px] font-semibold text-slate-600 mb-1"
                          >
                            Pórtico de salida
                          </label>
                          <select
                            id="sim-end-portico"
                            value={safeEnd}
                            onChange={handleEndChange}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11.5px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E7E53]/30 focus:border-[#1E7E53] truncate"
                          >
                            {ruta.porticos.map((p, idx) => (
                              <option
                                key={p.id}
                                value={idx}
                                disabled={idx < safeStart}
                              >
                                {idx + 1}. [{p.codigo}] {p.nombre.replace(/^Pórtico\s+/i, '')} (
                                {formatCLP(p.tarifas[selectedHorario] || 0)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="shrink-0 bg-white border-t border-slate-200/80 px-4 pt-3 pb-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 truncate">
              {selectedRoute.nombreCorto}
            </span>
            <span className="tabular-nums shrink-0 ml-2">
              {slicedPorticos.length}{' '}
              {slicedPorticos.length === 1 ? 'pórtico' : 'pórticos'} ·{' '}
              {formatDistance(sliceMetrics.km)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-[13.5px] flex items-center justify-between transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4 fill-current text-emerald-400" />
              Iniciar simulación en vivo
            </span>
            <span className="text-[12px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-xl tabular-nums">
              {formatCLP(sliceMetrics.cost)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
