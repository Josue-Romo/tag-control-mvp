import { useState } from 'react';
import {
  CalendarClock,
  Car,
  Check,
  Clock,
  Info,
  Route,
  Wallet,
} from 'lucide-react';
import {
  formatCLP,
  formatDistance,
  formatDuration,
  formatShortDate,
  formatTime,
  getBudgetStatus,
} from '../utils/format';
import PorticoIcon from './PorticoIcon';
import AlertCaptureCard from './AlertCaptureCard';

export default function TripSummaryScreen({
  trip,
  monthlySpentAfter,
  monthlyBudget,
  profile,
  isFromHistory = false,
  hasSubscribedAlerts = false,
  onDone,
  onViewHistory,
  onAlertSaved,
}) {
  const [showPostDonePrompt, setShowPostDonePrompt] = useState(false);

  const budgetStatus = getBudgetStatus(monthlySpentAfter, monthlyBudget);
  const remainingAfter = monthlyBudget - monthlySpentAfter;
  const previousSpent = Math.max(0, monthlySpentAfter - trip.totalCost);

  const dateRangeLabel = `${formatShortDate(trip.startedAt)} · ${formatTime(
    trip.startedAt
  )} – ${formatTime(trip.endedAt)}`;

  const handlePrimaryDone = () => {
    if (!isFromHistory && !hasSubscribedAlerts && !showPostDonePrompt) {
      setShowPostDonePrompt(true);
      return;
    }
    onDone();
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F8FAFC] pb-7 relative">
      {/* Subtle dark header matching mockup */}
      <header className="bg-gradient-to-b from-[#0F172A] via-[#17233A] to-[#1E293B] text-white px-5 pt-9 pb-16 text-center relative">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#1E7E53] ring-8 ring-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-950/40 mb-3.5">
          <Check className="w-7 h-7 stroke-[3]" />
        </div>
        <h1 className="text-[24px] font-extrabold tracking-tight leading-tight">
          ¡Viaje finalizado!
        </h1>
        <p className="text-[13.5px] text-slate-300 mt-1">
          Aquí tienes el resumen de tu viaje.
        </p>
      </header>

      <main className="px-4 -mt-10 space-y-4 flex-1 relative z-10">
        {/* Main overlapping white card divided in 2 */}
        <section className="bg-white rounded-[24px] p-5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/5">
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            {/* Left: Car icon + Total del viaje in large green */}
            <div className="pr-3">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#1E7E53] flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold">Total del viaje</span>
              </div>
              <p className="text-[30px] font-extrabold text-[#1E7E53] tracking-tight tabular-nums leading-none mt-1">
                {formatCLP(trip.totalCost)}
              </p>
            </div>

            {/* Right: Portico icon + Pórticos in bold */}
            <div className="pl-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <PorticoIcon className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold">Pórticos</span>
              </div>
              <p className="text-[30px] font-extrabold text-slate-900 tracking-tight tabular-nums leading-none mt-1">
                {trip.porticos.length}
              </p>
            </div>
          </div>
        </section>

        {/* Row of 3 metric mini-cards */}
        <section className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 shadow-2xs ring-1 ring-slate-900/5">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10.5px] font-semibold truncate">Duración</span>
            </div>
            <p className="text-[13px] font-bold text-slate-900 tabular-nums leading-snug">
              {formatDuration(trip.durationMin)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-2xs ring-1 ring-slate-900/5">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <Route className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10.5px] font-semibold truncate">Distancia</span>
            </div>
            <p className="text-[13px] font-bold text-slate-900 tabular-nums leading-snug">
              {formatDistance(trip.totalDistanceKm)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-2xs ring-1 ring-slate-900/5">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10.5px] font-semibold truncate">
                Fecha y hora
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-900 leading-tight">
              {dateRangeLabel}
            </p>
          </div>
        </section>

        {/* Impacto en tu Presupuesto Mensual */}
        <section className="bg-white rounded-[22px] p-4 shadow-2xs ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-50 text-[#1E7E53] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </span>
              <h2 className="text-[13.5px] font-extrabold text-slate-900">
                Impacto en tu Presupuesto Mensual
              </h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${budgetStatus.badgeClass}`}
            >
              {budgetStatus.percent}%
            </span>
          </div>

          <div className="flex items-baseline justify-between text-xs text-slate-500 mb-2">
            <span>
              Acumulado mes:{' '}
              <strong className="text-slate-900 text-sm tabular-nums">
                {formatCLP(monthlySpentAfter)}
              </strong>
            </span>
            <span className="text-[#1E7E53] font-bold tabular-nums">
              +{formatCLP(trip.totalCost)} hoy
            </span>
          </div>

          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${budgetStatus.barClass}`}
              style={{ width: `${Math.max(4, budgetStatus.clampedPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11.5px] mt-2">
            <span className="text-slate-400 tabular-nums">
              Antes: {formatCLP(previousSpent)} · Meta: {formatCLP(monthlyBudget)}
            </span>
            <span
              className={`font-bold tabular-nums ${
                remainingAfter < 0 ? 'text-red-600' : 'text-slate-800'
              }`}
            >
              {remainingAfter >= 0
                ? `Te quedan ${formatCLP(remainingAfter)}`
                : `Excedido ${formatCLP(Math.abs(remainingAfter))}`}
            </span>
          </div>
        </section>

        {/* Detalle de pórticos (Vertical Timeline) */}
        <section className="bg-white rounded-[22px] p-4 shadow-2xs ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-extrabold text-slate-900">
              Detalle de pórticos
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              {trip.routeName}
            </span>
          </div>

          <ol className="relative">
            {trip.porticos.map((p, index) => {
              const isLast = index === trip.porticos.length - 1;
              return (
                <li
                  key={`${p.id}-${index}`}
                  className={`relative flex items-start justify-between gap-3 ${
                    isLast ? '' : 'pb-5'
                  }`}
                >
                  {/* Vertical connector line */}
                  {!isLast && (
                    <span
                      className="absolute left-[13px] top-7 bottom-0 w-[2px] bg-emerald-100"
                      aria-hidden="true"
                    />
                  )}

                  {/* Left: numbered green circle + text */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="relative z-10 w-7 h-7 rounded-full bg-[#1E7E53] text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-xs">
                      {index + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                          {formatTime(p.crossedAt)}
                        </span>
                      </div>
                      <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                        {p.nombre}
                      </p>
                      <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">
                        {p.autopista} · {p.sentido}
                      </p>
                    </div>
                  </div>

                  {/* Right: aligned CLP amount */}
                  <span className="text-[14px] font-extrabold text-slate-900 tabular-nums shrink-0 pt-4">
                    {formatCLP(p.costo)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Soft blue informational disclaimer box */}
        <div className="rounded-2xl bg-sky-50/90 border border-sky-200/80 p-3.5 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-sky-900/90 leading-relaxed">
            Los valores mostrados son estimaciones basadas en las tarifas
            vigentes al momento del paso por cada pórtico. Por favor, valídalos
            en tu facturación oficial de TAG.
          </p>
        </div>

        {/* Optional discreet alert signup block revealed after tapping Listo */}
        {showPostDonePrompt && (
          <div className="space-y-2.5 animate-notification-in">
            <AlertCaptureCard
              profile={profile}
              budget={monthlyBudget}
              monthlySpent={monthlySpentAfter}
              source="post_trip_done"
              onSaved={(lead) => {
                if (onAlertSaved) onAlertSaved(lead);
              }}
              compact
            />
            <button
              type="button"
              onClick={onDone}
              className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Ahora no, volver al inicio
            </button>
          </div>
        )}

        {/* Bottom action buttons */}
        {!showPostDonePrompt && (
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handlePrimaryDone}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#1E7E53] hover:bg-[#15803D] active:scale-[0.99] text-white font-bold text-[15px] shadow-md shadow-emerald-900/15 transition cursor-pointer"
            >
              Listo
            </button>
            <button
              type="button"
              onClick={onViewHistory}
              className="w-full py-3.5 px-5 rounded-2xl bg-slate-200/85 hover:bg-slate-200 active:scale-[0.99] text-slate-800 font-bold text-[14px] transition cursor-pointer"
            >
              Ver historial de viajes
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
