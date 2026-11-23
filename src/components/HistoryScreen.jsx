import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Navigation,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import {
  formatCLP,
  formatDistance,
  formatDuration,
  formatShortDate,
  formatTime,
  getBudgetStatus,
} from '../utils/format';
import { getSavedAlertLeads, getTrackedEvents } from '../utils/analytics';
import {
  downloadGpsDebugLog,
  loadGpsDebugLog,
} from '../utils/gpsDebugLog';
import AlertCaptureCard from './AlertCaptureCard';
import PorticoIcon from './PorticoIcon';

const HORARIO_LABELS = {
  fuera_punta: 'Fuera de Punta',
  punta: 'Hora Punta',
  saturacion: 'Saturación',
};

export default function HistoryScreen({
  trips,
  monthlySpent,
  config,
  onBack,
  onSelectTrip,
  onAlertSaved,
  onResetDemo,
}) {
  const [showMetricsDrawer, setShowMetricsDrawer] = useState(false);
  const status = getBudgetStatus(monthlySpent, config.monthlyBudget);
  const events = getTrackedEvents();
  const leads = getSavedAlertLeads();
  const gpsLogs = loadGpsDebugLog();

  const handleExportValidationData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      config,
      monthlySpent,
      tripsCount: trips.length,
      leads,
      events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tag-control-p2-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F8FAFC] pb-8">
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center justify-between gap-2 bg-[#F8FAFC] sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-3 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Inicio
        </button>
        <h1 className="text-[15px] font-extrabold text-slate-900">
          Historial de viajes
        </h1>
        <div className="w-16 text-right text-xs font-semibold text-slate-400 tabular-nums">
          {trips.length} {trips.length === 1 ? 'viaje' : 'viajes'}
        </div>
      </header>

      <main className="px-4 space-y-4 flex-1">
        {/* Compact monthly overview */}
        <section className="bg-white rounded-[22px] p-4 shadow-2xs ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Acumulado del mes
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${status.badgeClass}`}
            >
              {status.percent}% del presupuesto
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatCLP(monthlySpent)}
            </p>
            <p className="text-xs text-slate-500 tabular-nums">
              Meta: {formatCLP(config.monthlyBudget)}
            </p>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full rounded-full ${status.barClass}`}
              style={{
                width: `${
                  monthlySpent === 0 ? 0 : Math.max(4, status.clampedPercent)
                }%`,
              }}
            />
          </div>
        </section>

        {/* Trips list */}
        <section className="space-y-2.5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Viajes registrados
          </h2>

          {trips.length === 0 ? (
            <div className="bg-white rounded-[22px] p-6 text-center shadow-2xs ring-1 ring-slate-900/5 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-[#1E7E53] flex items-center justify-center">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  Aún no tienes viajes registrados
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Vuelve al inicio para activar el{' '}
                  <strong className="text-slate-700">seguimiento automático (GPS)</strong>{' '}
                  mientras conduces o prueba una{' '}
                  <strong className="text-slate-700">simulación de trayecto</strong>{' '}
                  desde casa.
                </p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1E7E53] hover:bg-[#15803D] text-white text-xs font-bold px-4 py-2.5 shadow-xs transition cursor-pointer"
              >
                Ir a iniciar mi primer viaje
              </button>
            </div>
          ) : (
            trips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                onClick={() => onSelectTrip(trip)}
                className="w-full text-left bg-white hover:bg-slate-50/70 rounded-2xl p-4 shadow-2xs ring-1 ring-slate-900/5 transition flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {formatShortDate(trip.startedAt)} · {formatTime(trip.startedAt)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {HORARIO_LABELS[trip.horario] || 'Hora Punta'}
                    </span>
                  </div>
                  <p className="text-[13.5px] font-bold text-slate-900 truncate mt-1">
                    {trip.routeName}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <PorticoIcon className="w-3 h-3 text-[#1E7E53]" />
                      {trip.porticos.length} pórticos
                    </span>
                    <span>·</span>
                    <span>{formatDistance(trip.totalDistanceKm)}</span>
                    <span>·</span>
                    <span>{formatDuration(trip.durationMin)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[15px] font-extrabold text-[#1E7E53] tabular-nums">
                    {formatCLP(trip.totalCost)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))
          )}
        </section>

        {/* Discreet P2 Validation Alert Signup Block */}
        <section className="pt-1">
          <AlertCaptureCard
            profile={config.profile}
            budget={config.monthlyBudget}
            monthlySpent={monthlySpent}
            source="history_screen"
            onSaved={onAlertSaved}
          />
        </section>

        {/* Discreet P2 Field Test Diagnostics */}
        <section className="pt-2 space-y-2">
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => downloadGpsDebugLog(gpsLogs)}
              disabled={gpsLogs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 disabled:opacity-45 text-slate-600 text-[11px] font-semibold shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#1E7E53]" />
              Descargar Log GPS (JSON)
              {gpsLogs.length > 0 && (
                <span className="text-slate-400 tabular-nums">
                  ({gpsLogs.length})
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMetricsDrawer((v) => !v)}
            className="w-full py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            Métricas de validación P2 ({events.length} eventos · {leads.length} registros)
          </button>

          {showMetricsDrawer && (
            <div className="mt-2 bg-slate-900 text-slate-200 rounded-2xl p-3.5 text-[11px] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">
                  Analytics localStorage (P2)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportValidationData}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Exportar JSON
                  </button>
                  <button
                    type="button"
                    onClick={onResetDemo}
                    className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-300">
                {events.slice(-8).reverse().map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-2 border-b border-white/5 pb-1"
                  >
                    <span className="text-emerald-300 truncate">{ev.event}</span>
                    <span className="text-slate-400 shrink-0">
                      {formatTime(ev.timestamp)}
                    </span>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-slate-500">Sin eventos registrados aún.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
