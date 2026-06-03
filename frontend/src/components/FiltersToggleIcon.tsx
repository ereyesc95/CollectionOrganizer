/** Sliders icon — toggle filter sidebar. */
export default function FiltersToggleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="filters-toggle-icon"
      aria-hidden
    >
      <path d="M5 4v16M12 4v16M19 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="5" cy="9" r="2.25" fill="currentColor" />
      <circle cx="12" cy="15" r="2.25" fill="currentColor" />
      <circle cx="19" cy="7" r="2.25" fill="currentColor" />
    </svg>
  );
}
