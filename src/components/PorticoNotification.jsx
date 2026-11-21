import { Car, X } from 'lucide-react';
import { formatCLP } from '../utils/format';

export default function PorticoNotification({
  notification,
  onDismiss,
  lockScreenStyle = false,
}) {
  if (!notification) return null;

  const { portico, cost, tripTotal, monthlyTotal } = notification;

  return (
    <div
      className={`pointer-events-none ${
        lockScreenStyle
          ? 'relative z-20 w-full px-4'
          : 'absolute inset-x-0 top-3 z-50 px-3'
      }`}
      role="status"
      aria-live="assertive"
    >
      <div
        key={notification.key}
        className="pointer-events-auto animate-notification-in bg-white/97 backdrop-blur-xl rounded-[24px] shadow-[0_18px_42px_-10px_rgba(15,23,42,0.32)] ring-1 ring-slate-900/8 p-4"
      >
        {/* Header: Green car icon + TAG Control · Pórtico registrado · ahora */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-[#1E7E53] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Car className="w-3.5 h-3.5" />
            </span>
            <p className="text-[11px] font-medium text-slate-500 truncate">
              <span className="font-semibold text-slate-800">TAG Control</span>
              {' · Pórtico registrado · ahora'}
            </p>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 -mr-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bold Title & Highway Subtitle */}
        <div className="mb-3">
          <h3 className="text-[16px] font-bold text-slate-900 leading-snug tracking-tight">
            ¡Acabas de pasar un pórtico!
          </h3>
          <p className="text-[12.5px] text-slate-500 leading-snug mt-0.5">
            {portico.autopista} · {portico.nombre} – {portico.sentido}
          </p>
        </div>

        {/* Two-column financial breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          {/* Left column: Cost of this portico */}
          <div className="flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500 leading-tight">
              Costo de este pórtico
            </span>
            <span className="text-[24px] font-extrabold text-[#1E7E53] tracking-tight tabular-nums leading-none mt-1.5">
              {formatCLP(cost)}
            </span>
          </div>

          {/* Right column: Trip accumulated + discreet monthly badge */}
          <div className="flex flex-col justify-between border-l border-slate-100 pl-3">
            <span className="text-[11px] font-medium text-slate-500 leading-tight">
              Llevas gastado en este viaje
            </span>
            <span className="text-[20px] font-bold text-slate-900 tracking-tight tabular-nums leading-none mt-1.5">
              {formatCLP(tripTotal)}
            </span>
            <span className="inline-flex items-center self-start mt-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10.5px] font-semibold tabular-nums">
              Mes: {formatCLP(monthlyTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
