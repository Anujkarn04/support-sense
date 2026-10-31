import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useConversation, useMessages, useSendMessage } from "../../hooks/useChat.js";
import { useAgents, useTrajectory } from "../../hooks/useDashboard.js";
import { useRiskConfig } from "../../hooks/useRiskConfig.js";
import { closeConversation, reassignConversation } from "../../services/chatService.js";
import { ErrorState, Spinner } from "../common/states.jsx";
import MessageList from "./MessageList.jsx";
import Composer from "./Composer.jsx";
import RiskBadge from "../ml/RiskBadge.jsx";
import SentimentBadge from "../ml/SentimentBadge.jsx";
import CheckpointProgress from "../ml/CheckpointProgress.jsx";
import ExperimentalBadge from "../ml/ExperimentalBadge.jsx";
import PredictionDetails from "../ml/PredictionDetails.jsx";
import RiskExplanation from "../ml/RiskExplanation.jsx";
import SentimentTrajectoryChart from "../dashboard/SentimentTrajectoryChart.jsx";
import { AlertActions } from "../alerts/AlertCard.jsx";
import { dateTime, score100 } from "../../utils/formatters.js";
import { TREND_LABEL } from "../../utils/riskUtils.js";

function Section({ title, children }) {
  return (
    <section className="border-t border-line px-4 py-4 first:border-t-0">
      {title && <h3 className="mb-2 font-display text-base">{title}</h3>}
      {children}
    </section>
  );
}

function RiskSection({ conv, checkpoint }) {
  const p = conv.prediction;
  return (
    <Section title="Escalation risk">
      {p && p.status === "ok" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge level={p.risk_level} score={p.risk_score} className="text-lg" />
            <ExperimentalBadge />
          </div>
          <p className="text-sm text-muted">
            Risk score {score100(p.risk_score)} out of 100, calculated once from the first {p.checkpoint_messages} messages. It estimates how the conversation will end, not when it will turn.
          </p>
          <RiskExplanation reasons={p.reasons} />
        </div>
      ) : p && p.status === "unavailable" ? (
        <p className="text-sm">Risk couldn't be calculated for this conversation. {p.error}</p>
      ) : (
        <div className="space-y-1">
          <CheckpointProgress seen={conv.checkpoint.seen} needed={checkpoint} />
          <p className="text-sm text-muted">Sentiment updates with every message. The risk score appears once {checkpoint} messages have been sent.</p>
        </div>
      )}
    </Section>
  );
}

function CloseSection({ conv }) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState("RESOLVED");
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: () => closeConversation(conv.id, outcome, note),
    onSuccess: () => ["conversation", "conversations", "outcomes", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
  return (
    <Section title="Close this conversation">
      <fieldset className="space-y-2">
        <legend className="sr-only">How did it end?</legend>
        {[
          ["RESOLVED", "Resolved"],
          ["ESCALATED", "Escalated"],
        ].map(([v, label]) => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <input type="radio" name={`outcome-${conv.id}`} checked={outcome === v} onChange={() => setOutcome(v)} />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="mt-3 block text-sm" htmlFor={`note-${conv.id}`}>
        Note (optional)
      </label>
      <input id={`note-${conv.id}`} className="field mt-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <button className="btn btn-primary mt-3" disabled={m.isPending} onClick={() => m.mutate()}>
        Close conversation
      </button>
      {m.isError && <p className="mt-2 text-sm" role="alert">{m.error.message}</p>}
      <p className="mt-2 text-xs text-muted">A supervisor confirms the final outcome before it is used for training.</p>
    </Section>
  );
}

function ReassignSection({ conv }) {
  const qc = useQueryClient();
  const agents = useAgents();
  const m = useMutation({
    mutationFn: (agentId) => reassignConversation(conv.id, agentId),
    onSuccess: () => ["conversation", "conversations", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
  return (
    <Section title="Assigned agent">
      <label className="sr-only" htmlFor="reassign">
        Assigned agent
      </label>
      <select id="reassign" className="field" value={conv.agent?.id || ""} onChange={(e) => m.mutate(Number(e.target.value))} disabled={m.isPending || conv.status !== "OPEN"}>
        {!conv.agent && <option value="">Unassigned</option>}
        {(agents.data?.items || []).map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.team})
          </option>
        ))}
      </select>
      {m.isError && <p className="mt-2 text-sm" role="alert">{m.error.message}</p>}
    </Section>
  );
}

function SidePanel({ conv, canClose, canReassign, isSupervisor }) {
  const cfg = useRiskConfig();
  const traj = useTraj(conv.id);
  const checkpoint = cfg.data?.checkpoint_messages ?? 5;
  const latest = conv.sentiment_latest;
  const openAlert = conv.alerts?.find((a) => !a.resolved_at);
  return (
    <div className="divide-y-0">
      <RiskSection conv={conv} checkpoint={checkpoint} />
      {openAlert && isSupervisor && (
        <Section title="Alert">
          <p className="mb-2 text-sm text-muted">{openAlert.reason}</p>
          <AlertActions alert={openAlert} />
        </Section>
      )}
      <Section title="Sentiment">
        <p className="mb-1 flex items-center gap-2">
          Latest customer message: <SentimentBadge sentiment={latest?.sentiment} negativeProbability={latest?.negative_probability} />
        </p>
        <p className="mb-3 text-sm text-muted">{TREND_LABEL[conv.trend]}</p>
        {traj.isLoading ? <Spinner /> : traj.isError ? <ErrorState error={traj.error} /> : <SentimentTrajectoryChart data={traj.data} />}
        <p className="mt-2 text-xs text-muted">The sentiment model is general-purpose and not validated on support chats, so treat single readings loosely.</p>
      </Section>
      {conv.prediction && (
        <Section>
          <details>
            <summary className="cursor-pointer font-display text-base">About this prediction</summary>
            <div className="mt-3">
              <PredictionDetails prediction={conv.prediction} />
            </div>
          </details>
        </Section>
      )}
      {canReassign && <ReassignSection conv={conv} />}
      {canClose && conv.status === "OPEN" && <CloseSection conv={conv} />}
    </div>
  );
}

const useTraj = (id) => useTrajectory(id);

/**
 * The thread plus, for internal roles, the ML panel. Customers get the thread only.
 * canPost: customers and the assigned agent. Supervisors and admins read, never post.
 */
export default function ConversationWorkspace({ id }) {
  const { user } = useAuth();
  const conv = useConversation(id);
  const messages = useMessages(id);
  const send = useSendMessage(id);
  const internal = user.role !== "customer";
  const canPost = user.role === "customer" || user.role === "agent";
  const canClose = user.role === "agent" || user.role === "supervisor" || user.role === "admin";

  if (conv.isLoading || messages.isLoading) return <Spinner label="Loading conversation" />;
  if (conv.isError) return <ErrorState error={conv.error} onRetry={() => conv.refetch()} />;
  if (messages.isError) return <ErrorState error={messages.error} onRetry={() => messages.refetch()} />;
  const c = conv.data;
  const closed = c.status !== "OPEN";

  return (
    <div className={`grid min-h-0 ${internal ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
      <div className="flex min-h-[420px] min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl">{internal ? c.customer?.name : c.category}</h2>
            <p className="text-sm text-muted">
              {internal ? `${c.category}, ` : ""}
              {c.agent ? `agent ${c.agent.name}` : "waiting for an agent"}, started {dateTime(c.started_at)}
            </p>
          </div>
          <span className="rounded border border-line px-2 py-0.5 text-sm" style={{ background: "var(--sunken)" }}>
            {c.status === "OPEN" ? "Open" : c.status === "RESOLVED" ? "Resolved" : "Escalated"}
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto" style={{ maxHeight: internal ? "calc(100vh - 220px)" : "calc(100vh - 260px)" }}>
          <MessageList messages={messages.data} mineRole={user.role === "customer" ? "customer" : "agent"} showSentiment={internal} />
        </div>
        {closed ? (
          <p className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm text-muted">
            <Lock size={15} aria-hidden="true" />
            This conversation is closed.
          </p>
        ) : canPost ? (
          <Composer onSend={(t) => send.mutateAsync(t)} sending={send.isPending} error={send.error} placeholder={user.role === "customer" ? "Write a message" : `Reply to ${c.customer?.name}`} />
        ) : (
          <p className="border-t border-line px-4 py-3 text-sm text-muted">Supervisors can read conversations but not post in them.</p>
        )}
      </div>
      {internal && (
        <aside className="min-w-0 border-t border-line lg:border-l lg:border-t-0" aria-label="Risk and sentiment" style={{ background: "var(--surface)" }}>
          <SidePanel conv={c} canClose={canClose} canReassign={user.role === "supervisor" || user.role === "admin"} isSupervisor={user.role === "supervisor" || user.role === "admin"} />
        </aside>
      )}
    </div>
  );
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="text-sm underline underline-offset-2">
      {children}
    </Link>
  );
}
