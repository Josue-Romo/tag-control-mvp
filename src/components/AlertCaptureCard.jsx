import { useState } from 'react';
import { BellRing, CheckCircle2, ArrowRight } from 'lucide-react';
import { saveAlertLead } from '../utils/analytics';

export default function AlertCaptureCard({
  profile,
  budget,
  monthlySpent,
  source = 'history',
  onSaved,
  compact = false,
}) {
  const [contact, setContact] = useState('');
  const [patente, setPatente] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedContact = contact.trim();
    if (!cleanedContact || cleanedContact.length < 5) {
      setError('Ingresa un correo electrónico o número de WhatsApp válido.');
      return;
    }
    setError('');
    const lead = saveAlertLead({
      contact: cleanedContact,
      patente,
      profile,
      budget,
      monthlySpent,
      source,
    });
    setSubmitted(true);
    if (onSaved) onSaved(lead);
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1E7E53] text-white flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-950">
            ¡Listo! Quedaste inscrito para alertas semanales
          </p>
          <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
            Te avisaremos en <span className="font-semibold">{contact}</span>{' '}
            antes del cierre mensual para que no tengas sorpresas en tu cuenta TAG.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs ${
        compact ? 'p-3.5' : 'p-4'
      }`}
    >
      <div className="flex items-start gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1E7E53] flex items-center justify-center shrink-0">
          <BellRing className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-900 leading-snug">
            ¿Quieres recibir alertas semanales de tu acumulado antes del cierre?
          </p>
          <p className="text-[11.5px] text-slate-500 mt-0.5">
            Opcional · Te enviamos un resumen claro por correo o WhatsApp.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="space-y-2">
          <input
            type="text"
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              if (error) setError('');
            }}
            placeholder="Email o WhatsApp (+56 9...)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E7E53]/30 focus:border-[#1E7E53] focus:bg-white transition"
          />
          <input
            type="text"
            value={patente}
            onChange={(e) => setPatente(e.target.value.toUpperCase())}
            placeholder="Patente (opcional · ej. RJKD-42)"
            maxLength={9}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs uppercase text-slate-900 placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[#1E7E53]/30 focus:border-[#1E7E53] focus:bg-white transition"
          />
        </div>

        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-semibold py-2.5 px-3 transition cursor-pointer"
        >
          Activar alerta semanal gratis
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
