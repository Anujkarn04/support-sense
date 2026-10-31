// One live connection per signed-in user. Events patch the TanStack Query cache,
// so every screen updates without its own polling or loading code.
//  - mock mode: subscribes to the demo backend's event bus (works across browser tabs)
//  - real mode: WebSocket, first frame is {type:"auth", token}, reconnects with backoff
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import { IS_MOCK, getToken } from "../services/api.js";

const RealtimeContext = createContext({ status: "offline", toasts: [], dismiss: () => {} });
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState("offline");
  const [toasts, setToasts] = useState([]);
  const seen = useRef(new Set());

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const handle = useCallback(
    (env) => {
      if (!env || seen.current.has(env.event_id)) return;
      seen.current.add(env.event_id);
      if (seen.current.size > 500) seen.current = new Set([...seen.current].slice(-200));

      const id = env.conversation_id;
      const d = env.data;

      switch (env.type) {
        case "NEW_MESSAGE":
          qc.setQueryData(["messages", id], (old) => {
            if (!old) return old;
            return old.some((m) => m.id === d.id) ? old : [...old, d].sort((a, b) => a.seq - b.seq);
          });
          break;
        case "SENTIMENT_UPDATED":
          qc.setQueryData(["messages", id], (old) =>
            old ? old.map((m) => (m.id === d.message_id ? { ...m, ...d, id: m.id } : m)) : old,
          );
          break;
        case "SENTIMENT_TRAJECTORY_UPDATED":
          qc.invalidateQueries({ queryKey: ["trajectory", id] });
          break;
        case "RISK_UPDATED":
          qc.setQueryData(["conversation", id], (old) => (old ? { ...old, prediction: d } : old));
          qc.invalidateQueries({ queryKey: ["predictions", id] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          break;
        case "NEW_ALERT":
          qc.invalidateQueries({ queryKey: ["alerts"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          setToasts((t) => [
            ...t.slice(-2),
            { id: env.event_id, conversationId: id, severity: d.severity, text: d.reason, who: d.conversation?.customer?.name },
          ]);
          setTimeout(() => dismiss(env.event_id), 9000);
          break;
        case "ALERT_UPDATED":
          qc.invalidateQueries({ queryKey: ["alerts"] });
          qc.invalidateQueries({ queryKey: ["conversation", id] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["analytics"] });
          break;
        case "OUTCOME_UPDATED":
          qc.invalidateQueries({ queryKey: ["outcomes"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["analytics"] });
          qc.invalidateQueries({ queryKey: ["conversation", id] });
          break;
        case "CONVERSATION_UPDATED":
          qc.invalidateQueries({ queryKey: ["conversations"] });
          if (id) qc.invalidateQueries({ queryKey: ["conversation", id] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          break;
        default:
          break;
      }
    },
    [qc, dismiss],
  );

  // ---- mock transport
  useEffect(() => {
    if (!IS_MOCK || !user) return;
    let unsub = () => {};
    let alive = true;
    import("../mock/store.js").then((store) => {
      if (!alive) return;
      setStatus("mock");
      unsub = store.subscribe((ev) => handle(store.envelopeFor(user, ev)));
    });
    return () => {
      alive = false;
      unsub();
      setStatus("offline");
    };
  }, [user, handle]);

  // ---- real transport
  useEffect(() => {
    if (IS_MOCK || !user) return;
    let ws;
    let stopped = false;
    let attempt = 0;
    let timer;

    const connect = () => {
      setStatus("connecting");
      ws = new WebSocket(WS_URL);
      ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token: getToken() }));
      ws.onmessage = (e) => {
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.type === "auth_ok") {
          const reconnected = attempt > 0;
          attempt = 0;
          setStatus("live");
          if (reconnected) qc.invalidateQueries(); // missed events are not replayed: refetch
          return;
        }
        handle(msg);
      };
      ws.onclose = () => {
        if (stopped) return;
        setStatus("connecting");
        attempt += 1;
        timer = setTimeout(connect, Math.min(15000, 500 * 2 ** attempt));
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      if (ws) ws.close();
      setStatus("offline");
    };
  }, [user, handle, qc]);

  const value = useMemo(() => ({ status, toasts, dismiss }), [status, toasts, dismiss]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
