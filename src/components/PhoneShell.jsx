export default function PhoneShell({ children, overlay }) {
  return (
    <div className="min-h-dvh w-full bg-slate-200/80 sm:py-6 sm:px-4 flex items-stretch sm:items-center justify-center">
      <div className="relative w-full sm:max-w-[430px] min-h-dvh sm:min-h-[820px] sm:max-h-[900px] bg-[#F8FAFC] sm:rounded-[38px] sm:shadow-[0_24px_70px_-15px_rgba(15,23,42,0.28)] sm:ring-1 sm:ring-slate-900/10 flex flex-col overflow-hidden">
        {/* Floating notification / modal overlay inside smartphone frame */}
        {overlay}

        {/* Scrollable screen canvas */}
        <div className="flex-1 overflow-y-auto phone-scroll flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
