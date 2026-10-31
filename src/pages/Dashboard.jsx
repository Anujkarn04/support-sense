import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader.jsx";
import RiskBadge from "../components/ml/RiskBadge.jsx";
import TrajectoryStrip from "../components/ml/TrajectoryStrip.jsx";
import { AlertActions } from "../components/alerts/AlertCard.jsx";
import { EmptyState, ErrorState, QueryBoundary, Spinner } from "../components/common/states.jsx";
import { EscalationByCategory, EscalationsByDay, ResponseTimeChart, RiskDistribution, SentimentOverTime } from "../components/dashboard/DashboardCharts.jsx";
import { useConversations } from "../hooks/useChat.js";
import { useAgents, useSummary, useTeams } from "../hooks/useDashboard.js";
import { attentionRank, isElevated } from "../utils/riskUtils.js";
import { duration, percent, timeAgo } from "../utils/formatters.js";

function Figures({ s }) {
  const items = [
    ["Open conversations", s.active],
    ["High or critical risk", s.high_risk],
    ["Alerts waiting", s.pending_alerts],
    ["Average reply time", duration(s.avg_response_s)],
    [
      "Escalation rate",
      s.escalation_rate.validated != null ? percent(s.escalation_rate.validated) : percent(s.escalation_rate.reported),
      s.escalation_rate.validated != null ? `validated, ${s.escalation_rate.validated_n} closed. ${percent(s.escalation_rate.reported)} as reported` : `as reported, ${s.escalation_rate.reported_n} closed`,
    ],
    ["Outcomes to validate", s.unvalidated_outcomes],
  ];
  return (
    <dl className="mx-5 grid grid-cols-2 gap-y-4 rounded-panel border border-line md:mx-8 md:grid-cols-3 xl:grid-cols-6" style={{ background: "var(--surface)" }}>
      {items.map(([k, v, sub], i) => (
        <div key={k} className={`px-5 py-4 ${i > 0 ? "xl:border-l xl:border-line" : ""}`}>
          <dd className="font-display text-3xl">{v}</dd>
          <dt className="text-sm text-muted">{k}</dt>
          {sub && <p className="text-xs text-faint">{sub}</p>}
        </div>
      ))}
    </dl>
  );
}

function NeedsAttention() {
  const q = useConversations({ status: "OPEN" });
  const rows = (q.data?.items || [])
    .filter((c) => (c.prediction?.status === "ok" && isElevated(c.prediction.risk_level)) || (c.open_alert && !c.open_alert.acknowledged_at))
    .sort((a, b) => attentionRank(b) - attentionRank(a))
    .slice(0, 6);
  return (
    <section className="mx-5 mb-6 md:mx-8" aria-labelledby="att">
      <h2 id="att" className="mb-2 text-xl">Needs attention now</h2>
      <div className="rounded-panel border border-line" style={{ background: "var(--surface)" }}>
        {q.isLoading ? <Spinner /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : rows.length === 0 ? <EmptyState title="Nothing needs you right now">High-risk conversations and unacknowledged alerts show up here as they appear.</EmptyState> : (
          <ul>
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-3 first:border-t-0">
                <div className="w-36 shrink-0"><RiskBadge level={c.prediction.risk_level} score={c.prediction.risk_score} /></div>
                <div className="min-w-[10rem] flex-1">
                  <Link className="font-medium underline-offset-2 hover:underline" to={`/conversations/${c.id}`}>{c.customer?.name}</Link>
                  <p className="truncate text-sm text-muted">{c.category}, agent {c.agent?.name || "unassigned"}. {c.last_message_preview}</p>
                </div>
                <TrajectoryStrip values={c.trajectory} />
                <span className="w-20 text-sm text-muted">{timeAgo(c.last_message_at)}</span>
                <div className="ml-auto">{c.open_alert ? <AlertActions alert={c.open_alert} compact /> : <Link className="btn btn-quiet !px-2.5 !py-1 text-xs" to={`/conversations/${c.id}`}>Open</Link>}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function GroupTable({ title, query, nameLabel }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 font-display text-lg">{title}</h3>
      <QueryBoundary query={query}>
        {({ items }) => (
          <div className="overflow-x-auto rounded-panel border border-line">
            <table className="w-full text-left text-sm">
              <thead style={{ background: "var(--sunken)" }}>
                <tr>{[nameLabel, "Open", "High risk", "Closed", "Escalation rate", "Average negativity"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="table-row">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.open}</td>
                    <td className="px-3 py-2">{r.high_risk}</td>
                    <td className="px-3 py-2">{r.closed}</td>
                    <td className="px-3 py-2">{r.escalation_rate == null ? "none yet" : `${percent(r.escalation_rate)} of ${r.validated_n}`}</td>
                    <td className="px-3 py-2">{r.avg_negative == null ? "none yet" : Math.round(r.avg_negative * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryBoundary>
    </section>
  );
}

export default function Dashboard() {
  const summary = useSummary();
  const agents = useAgents();
  const teams = useTeams();
  const [basis, setBasis] = useState("validated");
  return (
    <>
      <PageHeader title="Dashboard">What is happening across support right now, and how it has been trending.</PageHeader>
      <div className="pb-6">
        {summary.isLoading ? <Spinner /> : summary.isError ? <ErrorState error={summary.error} onRetry={() => summary.refetch()} /> : <Figures s={summary.data} />}
      </div>
      <NeedsAttention />
      <div className="mx-5 mb-4 flex flex-wrap items-center gap-3 md:mx-8">
        <h2 className="text-xl">Trends</h2>
        <div className="flex gap-1" role="group" aria-label="Escalation basis">
          {[
            ["validated", "Validated outcomes"],
            ["reported", "As reported by agents"],
          ].map(([k, label]) => (
            <button key={k} className={`btn !px-2.5 !py-1 text-xs ${basis === k ? "btn-primary" : "btn-quiet"}`} onClick={() => setBasis(k)} aria-pressed={basis === k}>{label}</button>
          ))}
        </div>
      </div>
      <div className="mx-5 mb-8 grid gap-x-10 gap-y-10 md:mx-8 xl:grid-cols-2">
        <SentimentOverTime />
        <EscalationsByDay basis={basis} />
        <EscalationByCategory basis={basis} />
        <RiskDistribution />
        <ResponseTimeChart />
      </div>
      <div className="mx-5 mb-10 grid gap-8 md:mx-8 xl:grid-cols-2">
        <GroupTable title="By agent" query={agents} nameLabel="Agent" />
        <GroupTable title="By team" query={teams} nameLabel="Team" />
      </div>
    </>
  );
}
