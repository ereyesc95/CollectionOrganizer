export default function AppIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="app-icon"
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="url(#ss-grad)" />
      <circle cx="16" cy="16" r="9" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
      <circle cx="16" cy="16" r="3" fill="#fff" />
      <path
        d="M16 7v2M16 23v2M7 16h2M23 16h2"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <rect x="6" y="5" width="8" height="11" rx="1" fill="#fff" opacity="0.25" />
      <rect x="18" y="16" width="8" height="11" rx="1" fill="#fff" opacity="0.25" />
      <defs>
        <linearGradient id="ss-grad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#7c6cf0" />
          <stop offset="1" stopColor="#5b4fd4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
