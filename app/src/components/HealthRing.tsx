export function HealthRing({ ratio }: { ratio: number | null }) {
  const pct = ratio == null ? 0 : Math.max(0, Math.min(3, ratio)) / 3;
  const color = ratio == null ? "var(--mut)" : ratio < 1 ? "var(--bad)" : ratio < 1.4 ? "var(--warn)" : "var(--ok)";
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle
        cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="44" textAnchor="middle" className="mono" fontSize="12" fill="var(--fg)">
        {ratio == null ? "—" : `${ratio.toFixed(2)}×`}
      </text>
    </svg>
  );
}
