import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/common/PageHeader.jsx";
import AlertCard from "../components/alerts/AlertCard.jsx";
import { EmptyState, ErrorState, Spinner } from "../components/common/states.jsx";
import { listAlerts } from "../services/alertService.js";

const TABS = [
  { key: "waiting", label: "Waiting", filter: { acknowledged: "false" }, empty: "No alerts are waiting. New ones appear here the moment a conversation crosses the alert line." },
  { key: "acknowledged", label: "Acknowledged", filter: { acknowledged: "true", resolved: "false" }, empty: "Nothing is being worked on right now." },
  { key: "resolved", label: "Resolved", filter: { resolved: "true" }, empty: "No resolved alerts yet." },
];

export default function Alerts() {
  const [tab, setTab] = useState("waiting");
  const t = TABS.find((x) => x.key === tab);
  const q = useQuery({ queryKey: ["alerts", tab], queryFn: () => listAlerts(t.filter) });
  return (
    <>
      <PageHeader title="Alerts">Raised when a conversation's risk score reaches the alert line. Acknowledge it so the team knows someone has it.</PageHeader>
      <div className="mx-5 mb-3 flex gap-1 md:mx-8" role="tablist" aria-label="Alert status">
        {TABS.map((x) => (
          <button key={x.key} role="tab" aria-selected={tab === x.key} className={`btn !px-3 !py-1.5 text-sm ${tab === x.key ? "btn-primary" : "btn-quiet"}`} onClick={() => setTab(x.key)}>{x.label}</button>
        ))}
      </div>
      <div className="mx-5 mb-8 rounded-panel border border-line md:mx-8" style={{ background: "var(--surface)" }}>
        {q.isLoading ? <Spinner /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data.items.length === 0 ? <EmptyState title="All clear">{t.empty}</EmptyState> : <ul>{q.data.items.map((a) => <AlertCard key={a.id} alert={a} />)}</ul>}
      </div>
    </>
  );
}
