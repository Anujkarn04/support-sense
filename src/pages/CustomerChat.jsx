import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import ConversationWorkspace from "../components/chat/ConversationWorkspace.jsx";
import { EmptyState } from "../components/common/states.jsx";
import { useConversations } from "../hooks/useChat.js";
import { useRiskConfig } from "../hooks/useRiskConfig.js";
import { createConversation } from "../services/chatService.js";
import { timeAgo } from "../utils/formatters.js";

function NewConversation({ onCreated }) {
  const cfg = useRiskConfig();
  const qc = useQueryClient();
  const [category, setCategory] = useState("Billing");
  const [text, setText] = useState("");
  const m = useMutation({
    mutationFn: () => createConversation({ category, initial_message: text }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      onCreated(res.conversation.id);
    },
  });
  return (
    <form
      className="mx-auto max-w-xl space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <h2 className="text-2xl">How can we help?</h2>
      <div>
        <label htmlFor="cat" className="mb-1 block text-sm">What is this about?</label>
        <select id="cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {(cfg.data?.categories || ["Billing", "Account", "Technical issue", "Delivery", "Other"]).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="first" className="mb-1 block text-sm">Tell us what happened</label>
        <textarea id="first" className="field min-h-[110px]" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} required />
      </div>
      {m.isError && <p role="alert" className="text-sm">{m.error.message}</p>}
      <button className="btn btn-primary" disabled={!text.trim() || m.isPending}>Start conversation</button>
    </form>
  );
}

export default function CustomerChat() {
  const [params, setParams] = useSearchParams();
  const list = useConversations({});
  const selected = Number(params.get("c")) || null;
  const creating = params.get("new") === "1";
  const open = (id) => setParams(id ? { c: String(id) } : { new: "1" });
  const items = list.data?.items || [];

  return (
    <>
      <PageHeader title="My conversations" actions={<button className="btn btn-primary" onClick={() => open(null)}><Plus size={16} aria-hidden="true" />New conversation</button>} />
      <div className="mx-5 mb-6 grid overflow-hidden rounded-panel border border-line md:mx-8 md:grid-cols-[280px_1fr]" style={{ background: "var(--surface)" }}>
        <nav aria-label="Your conversations" className="max-h-[70vh] overflow-y-auto border-b border-line md:border-b-0 md:border-r">
          {list.isLoading ? (
            <p className="p-4 text-muted">Loading</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted">No conversations yet.</p>
          ) : (
            items.map((c) => (
              <button key={c.id} onClick={() => open(c.id)} aria-current={selected === c.id ? "true" : undefined} className="block w-full border-b border-line px-4 py-3 text-left hover:bg-[var(--sunken)]" style={selected === c.id ? { background: "var(--sunken)" } : undefined}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-xs text-muted">{c.status === "OPEN" ? timeAgo(c.last_message_at) : "Closed"}</span>
                </span>
                <span className="block truncate text-sm text-muted">{c.last_message_preview}</span>
              </button>
            ))
          )}
        </nav>
        <div className="min-w-0">
          {creating || (!selected && items.length === 0 && !list.isLoading) ? (
            <NewConversation onCreated={(id) => open(id)} />
          ) : selected ? (
            <ConversationWorkspace id={selected} />
          ) : (
            <EmptyState title="Pick a conversation">Choose one from the list, or start a new one.</EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
