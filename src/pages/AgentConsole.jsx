import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/common/PageHeader.jsx";
import QueueItem from "../components/chat/QueueItem.jsx";
import ConversationWorkspace from "../components/chat/ConversationWorkspace.jsx";
import { EmptyState, ErrorState, Spinner } from "../components/common/states.jsx";
import { useConversations } from "../hooks/useChat.js";
import { attentionRank } from "../utils/riskUtils.js";

export default function AgentConsole() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState("open");
  const list = useConversations({});
  const selected = Number(params.get("c")) || null;

  const all = list.data?.items || [];
  const items = (tab === "open" ? all.filter((c) => c.status === "OPEN").sort((a, b) => attentionRank(b) - attentionRank(a)) : all.filter((c) => c.status !== "OPEN")).slice(0, 60);

  return (
    <>
      <PageHeader title="My queue">Conversations assigned to you, most urgent first. Each line shows how negative the customer has sounded, message by message.</PageHeader>
      <div className="mx-5 mb-6 grid overflow-hidden rounded-panel border border-line md:mx-8 lg:grid-cols-[330px_1fr]" style={{ background: "var(--surface)" }}>
        <div className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="flex gap-1 border-b border-line p-2" role="tablist" aria-label="Queue">
            {[
              ["open", "Open"],
              ["closed", "Closed"],
            ].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={`btn !px-3 !py-1 text-sm ${tab === k ? "btn-primary" : "btn-quiet"}`} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {list.isLoading ? <Spinner /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : items.length === 0 ? <EmptyState title={tab === "open" ? "Queue is clear" : "Nothing closed yet"}>New conversations appear here as customers write in.</EmptyState> : items.map((c) => <QueueItem key={c.id} c={c} selected={selected === c.id} to={`/agent?c=${c.id}`} />)}
          </div>
        </div>
        <div className="min-w-0">{selected ? <ConversationWorkspace id={selected} /> : <EmptyState title="Select a conversation">Pick one from your queue to read it and see how its risk is building.</EmptyState>}</div>
      </div>
    </>
  );
}
