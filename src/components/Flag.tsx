// A tiny inline American flag — renders identically on every OS, unlike the
// 🇺🇸 emoji which shows as plain "US" letters on Windows.
export default function Flag({ size = 14 }: { size?: number }) {
  const h = Math.round(size * 0.7);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 26 18"
      style={{ display: "inline-block", verticalAlign: "-2px", borderRadius: 2, flexShrink: 0 }}
      aria-label="USA"
      role="img"
    >
      <rect width="26" height="18" fill="#b22234" />
      <rect y="2" width="26" height="2" fill="#fff" />
      <rect y="6" width="26" height="2" fill="#fff" />
      <rect y="10" width="26" height="2" fill="#fff" />
      <rect y="14" width="26" height="2" fill="#fff" />
      <rect width="11" height="10" fill="#0a2342" />
      <g fill="#fff">
        <circle cx="2.2" cy="2" r="0.8" />
        <circle cx="5.5" cy="2" r="0.8" />
        <circle cx="8.8" cy="2" r="0.8" />
        <circle cx="3.8" cy="4" r="0.8" />
        <circle cx="7.1" cy="4" r="0.8" />
        <circle cx="2.2" cy="6" r="0.8" />
        <circle cx="5.5" cy="6" r="0.8" />
        <circle cx="8.8" cy="6" r="0.8" />
        <circle cx="3.8" cy="8" r="0.8" />
        <circle cx="7.1" cy="8" r="0.8" />
      </g>
    </svg>
  );
}
