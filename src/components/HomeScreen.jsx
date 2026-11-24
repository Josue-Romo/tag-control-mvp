import { useState } from 'react';
import {
  Car,
  ChevronDown,
  Clock,
  FlaskConical,
  History,
  Navigation,
  Play,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import porticosData from '../data/porticosSantiago.json';
import {
  calculateMonthProjection,
  detectCurrentHorario,
  formatCLP,
  formatDistance,
  formatDuration,
  formatTime,
  getBudgetStatus,
} from '../utils/format';
import { DRIVER_PROFILES } from '../utils/storage';
import PorticoIcon from './PorticoIcon';

export default function HomeScreen({
  config,
  monthlySpent,
  tripsCount,
  selectedRouteId,
  selectedHorario,
  onSelectRoute,
  onSelectHorario,
  onStartAutoGps,
  onStartSimulation,
  onOpenSettings,
  onOpenHistory,
}) {
  const [simExpanded, setSimExpanded] = useState(false);

  const status = getBudgetStatus(monthlySpent, config.monthlyBudget);
  const remaining = config.monthlyBudget - monthlySpent;
  const projection = calculateMonthProjection(monthlySpent);
  const profileObj =
    DRIVER_PROFILES.find((p) => p.id === config.profile) || DRIVER_PROFILES[0];

  const now = new Date();
  const currentHorarioId = detectCurrentHorario(now);
  const currentHorarioObj =
    porticosData.horarios.find((h) => h.id === currentHorarioId) ||
    porticosData.horarios[0];

  const selectedRoute =
    porticosData.rutas.find((r) => r.id === selectedRouteId) ||
    porticosData.rutas[0];

  const estimatedTripCost = selectedRoute.porticos.reduce(
    (sum, p) => sum + (p.tarifas[selectedHorario] || 0),
    0
  );

  const totalNetworkPorticos = porticosData.rutas.reduce(
    (sum, r) => sum + r.porticos.length,
    0
  );

  const monthName = now.toLocaleDateString('es-CL', { month: 'long' });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="flex flex-col min-h-full pb-7">
      {/* Top App Header */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between gap-2 bg-[#F8FAFC] sticky top-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1E7E53] to-[#15803D] text-white flex items-center justify-center shadow-sm shadow-emerald-900/20 shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[17px] font-extrabold text-slate-900 tracking-tight leading-none">
              TAG Control
            </h1>
            <p className="text-[11.5px] font-medium text-slate-500 mt-1 truncate">
              Tu viaje, tu gasto, siempre claro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenHistory}
            className="relative h-9 px-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer"
            title="Ver historial de viajes"
          >
            <History className="w-4 h-4 text-slate-600" />
            <span>Viajes</span>
            {tripsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 tabular-nums">
                {tripsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center justify-center transition cursor-pointer"
            aria-label="Editar presupuesto mensual"
            title="Configurar presupuesto"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="px-4 space-y-4 flex-1">
        {/* Monthly Accumulated Card */}
        <section className="bg-white rounded-[24px] p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500">
              Gasto Acumulado del Mes · {monthLabel}
            </span>
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
            >
              {profileObj.shortLabel}
            </button>
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-1">
            <p className="text-[36px] font-extrabold text-slate-900 tracking-tight tabular-nums leading-none">
              {formatCLP(monthlySpent)}
            </p>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${status.badgeClass}`}
            >
              {status.percent}% · {status.label}
            </span>
          </div>

          {/* Progress bar toward budget goal */}
          <div className="mt-4">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${status.barClass}`}
                style={{
                  width: `${
                    monthlySpent === 0 ? 0 : Math.max(4, status.clampedPercent)
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11.5px] mt-2">
              <span className="text-slate-500 font-medium">
                Meta mensual:{' '}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="font-bold text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-[#1E7E53] cursor-pointer tabular-nums"
                >
                  {formatCLP(config.monthlyBudget)}
                </button>
              </span>
              <span
                className={`font-bold tabular-nums ${
                  remaining < 0 ? 'text-red-600' : 'text-slate-700'
                }`}
              >
                {remaining >= 0
                  ? `Disponible: ${formatCLP(remaining)}`
                  : `Excedido: ${formatCLP(Math.abs(remaining))}`}
              </span>
            </div>
          </div>

          {/* Month-end projection strip */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 leading-tight">
                  Proyección de cierre de mes
                </p>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {monthlySpent === 0
                    ? 'Inicia tu primer viaje para proyectar tu mes'
                    : `Día ${projection.dayOfMonth} de ${projection.daysInMonth}`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-sm font-extrabold tabular-nums ${
                  monthlySpent === 0
                    ? 'text-slate-700'
                    : projection.projected > config.monthlyBudget
                    ? 'text-amber-600'
                    : 'text-[#1E7E53]'
                }`}
              >
                {formatCLP(monthlySpent === 0 ? 0 : projection.projected)}
              </p>
              {monthlySpent > 0 && (
                <p className="text-[10.5px] text-slate-400">
                  {projection.projected > config.monthlyBudget
                    ? 'Sobre tu meta'
                    : 'Dentro de tu meta'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* PRIMARY HERO ACTION: Automatic Real GPS Tracking */}
        <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1E7E53] via-[#1B764D] to-[#15803D] p-5 text-white shadow-[0_16px_36px_-14px_rgba(21,128,61,0.55)]">
          {/* Subtle decorative radial glow */}
          <div
            className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-bold tracking-wide text-emerald-50">
                <Sparkles className="w-3.5 h-3.5" />
                Modo real · 100% automático
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-100/95 tabular-nums">
                <Clock className="w-3 h-3" />
                {formatTime(now)} · {currentHorarioObj.shortLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={onStartAutoGps}
              className="w-full py-4 px-4 rounded-2xl bg-white hover:bg-emerald-50 active:scale-[0.99] text-[#15803D] font-extrabold text-[15.5px] shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2.5 transition cursor-pointer"
            >
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#1E7E53] flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 fill-current" />
              </span>
              <span>Iniciar seguimiento automático (GPS)</span>
            </button>

            <p className="text-[12.5px] text-emerald-50/95 leading-relaxed mt-3 text-center">
              Detecta automáticamente tus pórticos, autopistas y tarifa horaria
              mientras conduces, sin configuración manual.
            </p>
            <p className="text-[11px] font-semibold text-emerald-100/85 mt-2 text-center tabular-nums">
              Red RM activa · {totalNetworkPorticos} pórticos en ambos sentidos
            </p>
          </div>
        </section>

        {/* SECONDARY DISCREET BLOCK: Simulation / Demo Mode */}
        <section className="bg-white/90 rounded-[22px] border border-slate-200/90 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setSimExpanded((open) => !open)}
            className="w-full p-4 flex items-start justify-between gap-3 text-left hover:bg-slate-50/70 transition cursor-pointer"
            aria-expanded={simExpanded}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[13.5px] font-bold text-slate-800 leading-snug">
                    Simular trayecto de prueba (sin moverse)
                  </h2>
                </div>
                <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">
                  Úsalo para probar cómo calcula tu gasto desde casa o en la demo.
                </p>
              </div>
            </div>

            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-1">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  simExpanded ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          {simExpanded && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4">
              {/* Route selector */}
              <div className="space-y-2 pt-2">
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Ruta de prueba (Santiago)
                </label>
                <div className="space-y-2">
                  {porticosData.rutas.map((ruta) => {
                    const isSelected = ruta.id === selectedRoute.id;
                    const routeCost = ruta.porticos.reduce(
                      (acc, p) => acc + (p.tarifas[selectedHorario] || 0),
                      0
                    );
                    return (
                      <button
                        key={ruta.id}
                        type="button"
                        onClick={() => onSelectRoute(ruta.id)}
                        className={`w-full text-left rounded-2xl p-3 border transition cursor-pointer ${
                          isSelected
                            ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-800'
                            : 'border-slate-200/90 bg-white hover:border-slate-300'
                        }`}
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
                            <span className="block text-[13px] font-extrabold text-[#1E7E53] tabular-nums">
                              {formatCLP(routeCost)}
                            </span>
                            <span className="text-[10px] text-slate-400">est.</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 mt-1.5 text-[10.5px] font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <PorticoIcon className="w-3 h-3 text-slate-400" />
                            {ruta.porticos.length} pórticos
                          </span>
                          <span>·</span>
                          <span>{formatDistance(ruta.distanciaTotalKm)}</span>
                          <span>·</span>
                          <span>{formatDuration(ruta.duracionEstimadaMin)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule block selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Bloque horario simulado
                  </label>
                  <span className="text-[10.5px] text-slate-400">
                    {
                      porticosData.horarios.find((h) => h.id === selectedHorario)
                        ?.rango
                    }
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl">
                  {porticosData.horarios.map((h) => {
                    const active = selectedHorario === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => onSelectHorario(h.id)}
                        className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {h.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Simulation CTA */}
              <button
                type="button"
                onClick={onStartSimulation}
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white font-bold text-[13.5px] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  Iniciar simulación en vivo
                </span>
                <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-xl tabular-nums">
                  Est. {formatCLP(estimatedTripCost)}
                </span>
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
