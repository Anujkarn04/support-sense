import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import RiskBadge from "../components/ml/RiskBadge.jsx";
import CheckpointProgress from "../components/ml/CheckpointProgress.jsx";
import TrajectoryStrip from "../components/ml/TrajectoryStrip.jsx";
import { EmptyState, ErrorState, Spinner } from "../components/common/states.jsx";
import { useConversations } from "../hooks/useChat.js";
import { useRiskConfig } from "../hooks/useRiskConfig.js";
import { attentionRank, LEVELS, LEVEL_META } from "../utils/riskUtils.js";
import { timeAgo } from "../utils/formatters.js";

export default function Conversations() {
  const cfg = useRiskConfig();
  const [f, setF] = useState({ status: "OPEN", risk_level: "", team_id: "", has_alert: "" });
  const q = useConversations(f);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const items = [...(q.data?.items || [])].sort((a, b) => attentionRank(b) - attentionRank(a));

  const Select = ({ id, label, value, onChange, children }) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-muted">{label}</label>
      <select id={id} className="field !w-auto min-w-[9rem]" value={value} onChange={onChange}>{children}</select>
    </div>
  );

  return (
    <>
      <PageHeader title="Conversations">Everything in flight and everything closed, ordered by how urgently it needs a person.</PageHeader>
      <div className="flex flex-wrap items-end gap-4 px-5 pb-4 md:px-8">
        <Select id="f-status" label="Status" value={f.status} onChange={set("status")}>
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ESCALATED">Escalated</option>
        </Select>
        <Select id="f-risk" label="Risk" value={f.risk_level} onChange={set("risk_level")}>
          <option value="">Any</option>
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_META[l].label}</option>)}
        </Select>
        <Select id="f-team" label="Team" value={f.team_id} onChange={set("team_id")}>
          <option value="">All teams</option>
          {(cfg.data?.teams || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select id="f-alert" label="Alerts" value={f.has_alert} onChange={set("has_alert")}>
          <option value="">Any</option>
          <option value="true">Has an open alert</option>
        </Select>
      </div>
      <div className="mx-5 mb-6 overflow-x-auto rounded-panel border border-line md:mx-8" style={{ background: "var(--surface)" }}>
        {q.isLoading ? <Spinner /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : items.length === 0 ? <EmptyState title="No conversations match">Try removing a filter.</EmptyState> : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead style={{ background: "var(--sunken)" }}>
              <tr>
                {["Customer", "Agent and team", "Sentiment trend", "Risk", "Last message", ""].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const p = c.prediction?.status === "ok" ? c.prediction : null;
                return (
                  <tr key={c.id} className="table-row align-middle hover:bg-[var(--sunken)]">
                    <td className="px-4 py-3">
                      <Link className="font-medium underline-offset-2 hover:underline" to={`/conversations/${c.id}`}>{c.customer?.name}</Link>
                      <p className="text-muted">{c.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{c.agent?.name || "Unassigned"}</p>
                      <p className="text-muted">{c.team?.name}</p>
                    </td>
                    <td className="px-4 py-3"><TrajectoryStrip values={c.trajectory} /></td>
                    <td className="px-4 py-3">
                      {c.status !== "OPEN" ? <span className="text-muted">{c.status === "RESOLVED" ? "Resolved" : "Escalated"}</span> : p ? <RiskBadge level={p.risk_level} score={p.risk_score} /> : c.prediction?.status === "unavailable" ? <span className="text-muted">Unavailable</span> : <CheckpointProgress seen={c.checkpoint.seen} needed={c.checkpoint.needed} compact />}
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="truncate text-muted">{c.last_message_preview}</p>
                      <p className="text-xs text-faint">{timeAgo(c.last_message_at)}</p>
                    </td>
                    <td className="px-4 py-3">{c.open_alert && !c.open_alert.acknowledged_at && <Bell size={16} aria-label="Alert waiting for a supervisor" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
