import {
  Car,
  Clock,
  History,
  MapPin,
  Navigation,
  Play,
  Radio,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import porticosData from '../data/porticosSantiago.json';
import {
  calculateMonthProjection,
  formatCLP,
  formatDistance,
  formatDuration,
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
  tripMode,
  onSelectRoute,
  onSelectHorario,
  onSelectMode,
  onStartTrip,
  onOpenSettings,
  onOpenHistory,
}) {
  const status = getBudgetStatus(monthlySpent, config.monthlyBudget);
  const remaining = config.monthlyBudget - monthlySpent;
  const projection = calculateMonthProjection(monthlySpent);
  const profileObj =
    DRIVER_PROFILES.find((p) => p.id === config.profile) || DRIVER_PROFILES[0];

  const selectedRoute =
    porticosData.rutas.find((r) => r.id === selectedRouteId) ||
    porticosData.rutas[0];

  const estimatedTripCost = selectedRoute.porticos.reduce(
    (sum, p) => sum + (p.tarifas[selectedHorario] || 0),
    0
  );

  const monthName = new Date().toLocaleDateString('es-CL', { month: 'long' });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="flex flex-col min-h-full pb-6">
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
                style={{ width: `${Math.max(4, status.clampedPercent)}%` }}
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
                <p className="text-[11px] text-slate-400">
                  Día {projection.dayOfMonth} de {projection.daysInMonth}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-sm font-extrabold tabular-nums ${
                  projection.projected > config.monthlyBudget
                    ? 'text-amber-600'
                    : 'text-[#1E7E53]'
                }`}
              >
                {formatCLP(projection.projected)}
              </p>
              <p className="text-[10.5px] text-slate-400">
                {projection.projected > config.monthlyBudget
                  ? 'Sobre tu meta'
                  : 'Dentro de tu meta'}
              </p>
            </div>
          </div>
        </section>

        {/* Trip Setup Card */}
        <section className="bg-white rounded-[24px] p-5 shadow-sm ring-1 ring-slate-900/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-slate-900">
                Iniciar nuevo trayecto
              </h2>
              <p className="text-xs text-slate-500">
                Autopistas urbanas de Santiago
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E7E53] bg-emerald-50 px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3" />
              RM
            </span>
          </div>

          {/* Route selector (3 real Santiago routes) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ruta de Santiago
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
                    className={`w-full text-left rounded-2xl p-3.5 border transition cursor-pointer ${
                      isSelected
                        ? 'border-[#1E7E53] bg-emerald-50/45 ring-1 ring-[#1E7E53]'
                        : 'border-slate-200/90 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                          {ruta.nombre}
                        </p>
                        <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">
                          {ruta.descripcion}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-sm font-extrabold text-[#1E7E53] tabular-nums">
                          {formatCLP(routeCost)}
                        </span>
                        <span className="text-[10px] text-slate-400">est.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <PorticoIcon className="w-3.5 h-3.5 text-slate-400" />
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Bloque horario
              </label>
              <span className="text-[11px] text-slate-400">
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
                    className={`py-2 px-1.5 rounded-xl text-[11.5px] font-bold transition cursor-pointer ${
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

          {/* Tracking mode toggle: Simulation vs Real GPS */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Modo de detección de pórticos
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectMode('simulation')}
                className={`rounded-2xl p-3 border text-left transition cursor-pointer ${
                  tripMode === 'simulation'
                    ? 'border-[#1E7E53] bg-emerald-50/50 ring-1 ring-[#1E7E53]'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Radio
                    className={`w-4 h-4 ${
                      tripMode === 'simulation'
                        ? 'text-[#1E7E53]'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Simulación en Vivo
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-snug">
                  Cruza pórticos cada 3.5 seg. Ideal para pruebas rápidas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('gps')}
                className={`rounded-2xl p-3 border text-left transition cursor-pointer ${
                  tripMode === 'gps'
                    ? 'border-[#1E7E53] bg-emerald-50/50 ring-1 ring-[#1E7E53]'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Navigation
                    className={`w-4 h-4 ${
                      tripMode === 'gps' ? 'text-[#1E7E53]' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Modo GPS Real
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-snug">
                  Usa geolocalización real al entrar al radio del pórtico.
                </p>
              </button>
            </div>
          </div>

          {/* Primary Start CTA */}
          <button
            type="button"
            onClick={onStartTrip}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#1E7E53] to-[#15803D] hover:brightness-105 active:scale-[0.99] text-white font-bold text-[15px] shadow-lg shadow-emerald-900/20 flex items-center justify-between transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4 fill-current" />
              Iniciar viaje
            </span>
            <span className="text-xs font-semibold bg-white/18 px-2.5 py-1 rounded-xl tabular-nums">
              Est. {formatCLP(estimatedTripCost)}
            </span>
          </button>
        </section>
      </main>
    </div>
  );
}
