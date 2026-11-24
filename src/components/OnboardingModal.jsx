import { useState } from 'react';
import { Car, Check, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { DRIVER_PROFILES } from '../utils/storage';
import { formatCLP } from '../utils/format';

const QUICK_BUDGETS = [30000, 40000, 60000, 100000, 150000, 200000, 280000];
const MIN_BUDGET = 5000;

export default function OnboardingModal({
  config,
  isInitial,
  onSave,
  onClose,
}) {
  const [profile, setProfile] = useState(config.profile || 'particular');
  const [budgetRaw, setBudgetRaw] = useState(
    String(config.monthlyBudget || 60000)
  );

  const parsedBudget = budgetRaw === '' ? null : parseInt(budgetRaw, 10);
  const formattedInputValue =
    parsedBudget === null ? '' : parsedBudget.toLocaleString('es-CL');

  const handleProfilePick = (p) => {
    setProfile(p.id);
    setBudgetRaw(String(p.suggestedBudget));
  };

  const handleBudgetChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 7);
    setBudgetRaw(digits);
  };

  const handleBudgetBlur = () => {
    if (budgetRaw === '' || parseInt(budgetRaw, 10) < MIN_BUDGET) {
      setBudgetRaw(String(MIN_BUDGET));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (budgetRaw === '') return;
    const finalBudget = Math.max(MIN_BUDGET, parsedBudget || MIN_BUDGET);
    onSave({
      ...config,
      profile,
      monthlyBudget: finalBudget,
      onboardingCompleted: true,
    });
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
      <div className="w-full bg-white rounded-[28px] shadow-2xl overflow-hidden animate-notification-in max-h-[92%] flex flex-col">
        {/* Top banner */}
        <div className="bg-gradient-to-br from-[#1E7E53] to-[#15803D] px-5 pt-5 pb-6 text-white relative">
          {!isInitial && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
              aria-label="Cerrar configuración"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              {isInitial ? (
                <Car className="w-5 h-5" />
              ) : (
                <SlidersHorizontal className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
                TAG Control · Santiago
              </p>
              <h2 className="text-lg font-extrabold leading-tight">
                {isInitial ? 'Configura tu meta mensual' : 'Editar presupuesto TAG'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-50/90 leading-relaxed">
            Define cuánto quieres gastar al mes en autopistas. Te avisaremos en cada pórtico para mantener el control.
          </p>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-5 overflow-y-auto phone-scroll"
        >
          {/* Profile selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              1. Tu perfil de conducción
            </label>
            <div className="space-y-2">
              {DRIVER_PROFILES.map((item) => {
                const selected = profile === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProfilePick(item)}
                    className={`w-full text-left rounded-2xl p-3 border transition flex items-center justify-between gap-3 cursor-pointer ${
                      selected
                        ? 'border-[#1E7E53] bg-emerald-50/60 ring-1 ring-[#1E7E53]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {item.label}
                      </p>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-xs font-bold text-[#1E7E53] tabular-nums">
                        {formatCLP(item.suggestedBudget)}
                      </span>
                      <span className="text-[10px] text-slate-400">sugerido/mes</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Budget input */}
          <div>
            <label
              htmlFor="monthly-budget-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2"
            >
              2. Presupuesto mensual de TAG (CLP)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-extrabold text-slate-400">
                $
              </span>
              <input
                id="monthly-budget-input"
                type="text"
                inputMode="numeric"
                placeholder="Ej. 30.000"
                value={formattedInputValue}
                onChange={handleBudgetChange}
                onBlur={handleBudgetBlur}
                className="w-full rounded-2xl border-2 border-slate-200 focus:border-[#1E7E53] focus:outline-none pl-9 pr-14 py-3 text-2xl font-extrabold text-slate-900 placeholder:text-slate-300 tabular-nums transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                CLP
              </span>
            </div>

            {parsedBudget !== null && parsedBudget < MIN_BUDGET && (
              <p className="text-[11px] text-amber-600 font-medium mt-1.5">
                Al confirmar se ajustará al mínimo de {formatCLP(MIN_BUDGET)}.
              </p>
            )}

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {QUICK_BUDGETS.map((preset) => {
                const active = parsedBudget === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBudgetRaw(String(preset))}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums border transition cursor-pointer ${
                      active
                        ? 'bg-[#1E7E53] text-white border-[#1E7E53]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {formatCLP(preset)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-xl p-2.5">
            <ShieldCheck className="w-4 h-4 text-[#1E7E53] shrink-0" />
            <span>
              Puedes cambiar tu meta mensual en cualquier momento desde la pantalla principal.
            </span>
          </div>

          <button
            type="submit"
            disabled={budgetRaw === ''}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#1E7E53] hover:bg-[#15803D] disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isInitial ? 'Comenzar con TAG Control' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
