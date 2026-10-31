import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/common/PageHeader.jsx";
import RiskBadge from "../components/ml/RiskBadge.jsx";
import { EmptyState, ErrorState, Spinner } from "../components/common/states.jsx";
import { useRiskConfig } from "../hooks/useRiskConfig.js";
import { listOutcomes, validateOutcome } from "../services/alertService.js";
import { dateTime } from "../utils/formatters.js";

const label = (o) => (o === "ESCALATED" ? "Escalated" : "Resolved");

function ValidateForm({ o, definition, onDone }) {
  const qc = useQueryClient();
  const [choice, setChoice] = useState(o.reported_outcome);
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: () => validateOutcome(o.id, choice, note),
    onSuccess: () => {
      ["outcomes", "dashboard", "analytics", "alerts", "conversation"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onDone();
    },
  });
  return (
    <div className="space-y-3 border-t border-line px-5 py-4" style={{ background: "var(--sunken)" }}>
      <p className="text-sm"><span className="font-medium">What counts as escalated.</span> {definition || "No written definition has been provided yet. Ask the ML team for the labelling guideline so your validation matches the training labels."}</p>
      <fieldset className="flex gap-6">
        <legend className="mb-1 text-sm font-medium">How did this conversation actually end?</legend>
        {["RESOLVED", "ESCALATED"].map((v) => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <input type="radio" name={`v-${o.id}`} checked={choice === v} onChange={() => setChoice(v)} />
            {label(v)}
          </label>
        ))}
      </fieldset>
      {choice !== o.reported_outcome && <p className="text-sm">This differs from the agent's report ({label(o.reported_outcome)}). Add a note explaining why.</p>}
      <div>
        <label htmlFor={`n-${o.id}`} className="mb-1 block text-sm">Note (optional)</label>
        <input id={`n-${o.id}`} className="field max-w-xl" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </div>
      {m.isError && <p role="alert" className="text-sm">{m.error.message}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={m.isPending} onClick={() => m.mutate()}>Validate outcome</button>
        <button className="btn btn-quiet" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

export default function Outcomes() {
  const [tab, setTab] = useState("pending");
  const [open, setOpen] = useState(null);
  const cfg = useRiskConfig();
  const q = useQuery({ queryKey: ["outcomes", tab], queryFn: () => listOutcomes({ validated: tab === "pending" ? "false" : "true" }) });
  return (
    <>
      <PageHeader title="Outcomes">Only outcomes a supervisor has confirmed are used to measure alerts and to retrain the model. A prediction is never treated as the answer.</PageHeader>
      <div className="mx-5 mb-3 flex gap-1 md:mx-8" role="tablist" aria-label="Outcome status">
        {[["pending", "Needs validation"], ["done", "Validated"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`btn !px-3 !py-1.5 text-sm ${tab === k ? "btn-primary" : "btn-quiet"}`} onClick={() => { setTab(k); setOpen(null); }}>{l}</button>
        ))}
      </div>
      <div className="mx-5 mb-8 overflow-hidden rounded-panel border border-line md:mx-8" style={{ background: "var(--surface)" }}>
        {q.isLoading ? <Spinner /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data.items.length === 0 ? <EmptyState title={tab === "pending" ? "Nothing to validate" : "No validated outcomes yet"}>{tab === "pending" ? "Closed conversations appear here for review." : "Validate closed conversations to build the evidence for tuning alerts."}</EmptyState> : (
          <ul>
            {q.data.items.map((o) => (
              <li key={o.id} className="border-t border-line first:border-t-0">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
                  <div className="min-w-[11rem] flex-1">
                    <Link className="font-medium underline-offset-2 hover:underline" to={`/conversations/${o.conversation_id}`}>{o.conversation.customer?.name}</Link>
                    <p className="text-sm text-muted">{o.conversation.category}, agent {o.conversation.agent?.name}</p>
                  </div>
                  <div className="w-36 text-sm">
                    <p className="text-muted">Agent reported</p>
                    <p>{label(o.reported_outcome)}</p>
                  </div>
                  {tab === "done" && <div className="w-36 text-sm"><p className="text-muted">Validated</p><p>{label(o.validated_outcome)}</p></div>}
                  <div className="w-32 text-sm">
                    <p className="text-muted">Risk at message 5</p>
                    {o.risk_level ? <RiskBadge level={o.risk_level} score={o.risk_score} /> : <span>Not scored</span>}
                  </div>
                  <div className="w-24 text-sm"><p className="text-muted">Alert</p><p>{o.alert_fired ? "Raised" : "None"}</p></div>
                  <span className="w-32 text-sm text-muted">{dateTime(o.reported_at)}</span>
                  {tab === "pending" && <button className="btn btn-quiet !px-3 !py-1 text-sm" onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}>Review</button>}
                </div>
                {open === o.id && <ValidateForm o={o} definition={cfg.data?.escalation_definition} onDone={() => setOpen(null)} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
