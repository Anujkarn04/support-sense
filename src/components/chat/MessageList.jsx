import { useEffect, useRef } from "react";
import { clock } from "../../utils/formatters.js";
import SentimentBadge from "../ml/SentimentBadge.jsx";

function Bubble({ m, mine, showSentiment }) {
  return (
    <li className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        className="max-w-[min(34rem,85%)] whitespace-pre-wrap break-words rounded-panel px-3.5 py-2 text-[15px]"
        style={mine ? { background: "var(--action)", color: "var(--action-ink)" } : { background: "var(--sunken)", color: "var(--ink)" }}
      >
        {m.text}
      </div>
      <div className="mt-1 flex items-center gap-3 px-1 text-xs text-muted">
        <span>{clock(m.created_at)}</span>
        {showSentiment && m.sender_type === "customer" && <SentimentBadge sentiment={m.sentiment} negativeProbability={m.negative_probability} />}
      </div>
    </li>
  );
}

/**
 * mineRole: whose messages sit on the right. Customers see their own on the right;
 * agents see their own on the right. Sentiment tags are shown only when `showSentiment`.
 */
export default function MessageList({ messages, mineRole, showSentiment }) {
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  if (!messages.length) return <p className="p-6 text-center text-sm text-muted">No messages yet.</p>;
  return (
    <ul className="flex flex-col gap-3 p-4" aria-label="Messages" aria-live="polite">
      {messages.map((m) => (
        <Bubble key={m.id} m={m} mine={m.sender_type === mineRole} showSentiment={showSentiment} />
      ))}
      <li ref={end} aria-hidden="true" />
    </ul>
  );
}
