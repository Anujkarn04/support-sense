import { LEVEL_META } from "../../utils/riskUtils.js";
import { score100 } from "../../utils/formatters.js";

/** Level shape + word + score. Colour is never the only signal. */
export default function RiskBadge({ level, score, className = "" }) {
  const meta = LEVEL_META[level];
  if (!meta) return null;
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-medium ${className}`}
      title="Risk score from the experimental model, 0 to 100. It ranks conversations; it is not a probability."
    >
      <Icon size={14} color={meta.color} fill={meta.color} aria-hidden="true" />
      <span>{meta.label}</span>
      {score != null && <span className="font-normal text-muted">{score100(score)}</span>}
    </span>
  );
}
