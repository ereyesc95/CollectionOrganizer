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
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
      <path
        d="M16 7v2M16 23v2M7 16h2M23 16h2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <rect x="6" y="5" width="8" height="11" rx="1" fill="currentColor" opacity="0.25" />
      <rect x="18" y="16" width="8" height="11" rx="1" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

/** SVG favicon (no background) for browser tab — matches AppIcon. */
export function faviconHref(theme: "dark" | "light"): string {
  const stroke = theme === "dark" ? "#e8eaef" : "#1a1d26";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="9" stroke="${stroke}" stroke-width="1.5" opacity="0.9"/>
  <circle cx="16" cy="16" r="3" fill="${stroke}"/>
  <path d="M16 7v2M16 23v2M7 16h2M23 16h2" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
  <rect x="6" y="5" width="8" height="11" rx="1" fill="${stroke}" opacity="0.25"/>
  <rect x="18" y="16" width="8" height="11" rx="1" fill="${stroke}" opacity="0.25"/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
