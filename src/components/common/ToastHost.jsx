import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useRealtime } from "../../realtime/RealtimeProvider.jsx";
import RiskBadge from "../ml/RiskBadge.jsx";

export default function ToastHost() {
  const { toasts, dismiss } = useRealtime();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} className="panel arrive pointer-events-auto flex items-start gap-3 p-3" role="alert" style={{ boxShadow: "0 6px 24px rgba(0,0,0,.14)" }}>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium">
              <RiskBadge level={t.severity} /> New alert{t.who ? `: ${t.who}` : ""}
            </p>
            <p className="mt-0.5 text-sm text-muted">{t.text}</p>
            <Link to={`/conversations/${t.conversationId}`} className="mt-1 inline-block text-sm font-medium underline underline-offset-2" onClick={() => dismiss(t.id)}>
              Open conversation
            </Link>
          </div>
          <button className="rounded p-1 text-muted hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Dismiss alert">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
