import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck } from "lucide-react";
import RiskBadge from "../ml/RiskBadge.jsx";
import { updateAlert } from "../../services/alertService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { dateTime, timeAgo } from "../../utils/formatters.js";

export function useAlertAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }) => updateAlert(id, action),
    onSuccess: () => {
      ["alerts", "dashboard", "conversation", "conversations", "analytics"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function AlertActions({ alert, compact }) {
  const { user } = useAuth();
  const act = useAlertAction();
  if (user.role !== "supervisor" && user.role !== "admin") return null;
  if (alert.resolved_at) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!alert.acknowledged_at && (
        <button className={`btn btn-primary ${compact ? "!px-2.5 !py-1 text-xs" : ""}`} disabled={act.isPending} onClick={() => act.mutate({ id: alert.id, action: "acknowledge" })}>
          <Check size={15} aria-hidden="true" />
          Acknowledge
        </button>
      )}
      <button className={`btn btn-quiet ${compact ? "!px-2.5 !py-1 text-xs" : ""}`} disabled={act.isPending} onClick={() => act.mutate({ id: alert.id, action: "resolve" })}>
        <CheckCheck size={15} aria-hidden="true" />
        Resolve
      </button>
      {act.isError && <span className="text-sm" role="alert">{act.error.message}</span>}
    </div>
  );
}

export default function AlertCard({ alert }) {
  const c = alert.conversation;
  const state = alert.resolved_at ? `Resolved ${timeAgo(alert.resolved_at)}` : alert.acknowledged_at ? `Acknowledged ${timeAgo(alert.acknowledged_at)}` : "Waiting for acknowledgement";
  return (
    <li className="border-t border-line px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
            <RiskBadge level={alert.severity} score={alert.risk_score} />
            <span>{c?.customer?.name}</span>
            <span className="font-normal text-muted">{c?.category}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{alert.reason}</p>
          <p className="mt-1 text-sm text-muted">
            Raised {dateTime(alert.created_at)}, agent {c?.agent?.name || "unassigned"}. {state}.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <AlertActions alert={alert} compact />
          <Link className="text-sm underline underline-offset-2" to={`/conversations/${alert.conversation_id}`}>
            Open conversation
          </Link>
        </div>
      </div>
    </li>
  );
}
