export default function PorticoIcon({ className = 'w-5 h-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7h18" />
      <path d="M5 7v13" />
      <path d="M19 7v13" />
      <rect x="8.5" y="4" width="7" height="5" rx="1.2" />
      <path d="M10.5 13h3" />
      <path d="M9 17h6" />
    </svg>
  );
}
