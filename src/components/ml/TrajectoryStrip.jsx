import { useId } from "react";

/**
 * The signature element: how negative the customer has sounded, message by message.
 * Tiny, ink-coloured, with a dashed line at 0.5 (where the model flips to "negative").
 */
export default function TrajectoryStrip({ values = [], width = 96, height = 26 }) {
  const id = useId();
  const pad = 3;
  if (!values.length) return <span className="text-faint" aria-label="No customer messages yet">no data</span>;
  const x = (i) => (values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1));
  const y = (v) => pad + (1 - v) * (height - pad * 2);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const first = Math.round(values[0] * 100);
  const last = Math.round(values[values.length - 1] * 100);
  const label =
    values.length === 1
      ? `Customer negativity ${last} out of 100 on the first message`
      : `Customer negativity went from ${first} to ${last} out of 100 across ${values.length} messages`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={id} className="shrink-0">
      <title id={id}>{label}</title>
      <line x1="0" x2={width} y1={y(0.5)} y2={y(0.5)} stroke="var(--line)" strokeDasharray="3 3" />
      {values.length > 1 && <polyline points={pts} fill="none" stroke="var(--ink)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />}
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.8" fill="var(--ink)" stroke="var(--surface)" strokeWidth="1.5" />
    </svg>
  );
}
