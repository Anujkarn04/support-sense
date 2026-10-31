import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import RiskBadge from "../ml/RiskBadge.jsx";
import CheckpointProgress from "../ml/CheckpointProgress.jsx";
import TrajectoryStrip from "../ml/TrajectoryStrip.jsx";
import { timeAgo } from "../../utils/formatters.js";

/** One conversation in a queue: who, how the customer has sounded, and where the risk stands. */
export default function QueueItem({ c, selected, to }) {
  const p = c.prediction && c.prediction.status === "ok" ? c.prediction : null;
  return (
    <Link
      to={to}
      aria-current={selected ? "true" : undefined}
      className="block border-b border-line px-4 py-3 hover:bg-[var(--sunken)]"
      style={selected ? { background: "var(--sunken)" } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-medium">{c.customer?.name}</span>
        <span className="shrink-0 text-xs text-muted">{timeAgo(c.last_message_at)}</span>
      </div>
      <p className="truncate text-sm text-muted">{c.category}. {c.last_message_preview}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <TrajectoryStrip values={c.trajectory} width={84} height={22} />
        <div className="flex items-center gap-2 text-sm">
          {c.open_alert && !c.open_alert.acknowledged_at && <Bell size={14} aria-label="Alert waiting for a supervisor" />}
          {p ? <RiskBadge level={p.risk_level} score={p.risk_score} /> : c.prediction?.status === "unavailable" ? <span className="text-muted">Risk unavailable</span> : <CheckpointProgress seen={c.checkpoint.seen} needed={c.checkpoint.needed} compact />}
        </div>
      </div>
    </Link>
  );
}
