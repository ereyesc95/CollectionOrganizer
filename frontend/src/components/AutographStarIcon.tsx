interface Props {
  className?: string;
}

/** Theme-colored star for signed albums on cover cards. */
export default function AutographStarIcon({ className }: Props) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  );
}
