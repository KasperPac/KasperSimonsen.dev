export default function Arrow({ size = 12 }: { size?: number }) {
  return (
    <svg
      className="v2-arrow"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
