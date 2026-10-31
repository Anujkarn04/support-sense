import { useState } from "react";
import { Send } from "lucide-react";

export default function Composer({ onSend, sending, error, placeholder = "Write a message" }) {
  const [text, setText] = useState("");
  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    try {
      await onSend(t);
      setText("");
    } catch {
      /* the error is shown below; keep the draft */
    }
  };
  return (
    <div className="border-t border-line p-3">
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor="composer">
          Message
        </label>
        <textarea
          id="composer"
          className="field max-h-40 min-h-[42px] resize-none"
          rows={1}
          value={text}
          placeholder={placeholder}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button className="btn btn-primary" onClick={submit} disabled={!text.trim() || sending}>
          <Send size={16} aria-hidden="true" />
          Send
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
