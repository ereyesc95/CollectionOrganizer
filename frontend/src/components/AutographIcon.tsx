interface Props {
  className?: string;
}

/** Pen / signature mark for signed albums on cover cards. */
export default function AutographIcon({ className }: Props) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 17c3.5-5 7.5-5.5 11-2.5s6 3.5 7 0" />
      <path d="M15 4l4 4-7 7-4 1 1-4 7-7z" />
    </svg>
  );
}
