// In-browser demo database + domain events. MOCK ONLY.
// State is kept in localStorage so a second browser tab sees the same data, and
// events are relayed with BroadcastChannel so tabs update live, like the real WebSocket.
import {
  CHECKPOINT, DEFAULT_BANDS, MOCK_WARNINGS, classify, computeFeatures, mockRisk, mockSentiment, round, slopeOf, trendOf, TREND_CFG,
} from "./engine.js";
import {
  byId, conversationSummary, internalMessage, latestPrediction, messagesOf, predictionView, publicMessage, alertView, canSee,
} from "./views.js";
import { buildSeed } from "./seed.js";

// Passed to the seed builder so seed.js does not import this file (no import cycle).
const actions = () => ({ createConversation, addMessage, closeConversation, validateOutcome, updateAlert });

const KEY = "supportsense-mock-state-v1";
export class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

let state = null;

export function getState() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = JSON.parse(raw);
      return state;
    }
  } catch {
    /* storage unavailable: fall through to a fresh seed kept in memory */
  }
  state = buildSeed(actions());
  persist();
  return state;
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* in-memory only */
  }
}

export function reloadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    /* keep current */
  }
}

export function resetDemo() {
  state = buildSeed(actions());
  persist();
  publish([{ type: "CONVERSATION_UPDATED", conversation_id: null, internal: { reset: true }, public: { reset: true } }]);
}

// ------------------------------------------------------------------ bus
const listeners = new Set();
let channel = null;
try {
  channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("supportsense-mock") : null;
} catch {
  channel = null;
}
if (channel) {
  channel.onmessage = (e) => {
    reloadFromStorage();
    dispatch(e.data);
  };
}

let eventSeq = 0;
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function dispatch(events) {
  events.forEach((ev) => listeners.forEach((fn) => fn(ev)));
}
export function publish(events) {
  const stamped = events.map((e) => ({ ...e, event_id: `${Date.now()}-${++eventSeq}`, ts: new Date().toISOString() }));
  persist();
  if (channel) channel.postMessage(stamped);
  dispatch(stamped);
}

/** Turn a raw event into the envelope this user is allowed to see, or null. */
export function envelopeFor(user, ev) {
  const s = getState();
  const conv = ev.conversation_id ? byId(s.conversations, ev.conversation_id) : null;
  if (conv && !canSee(user, conv)) return null;
  const internal = user.role !== "customer";
  const data = internal ? ev.internal : ev.public;
  if (data == null) return null;
  return { event_id: ev.event_id, type: ev.type, conversation_id: ev.conversation_id, ts: ev.ts, data };
}

// ------------------------------------------------------------------ config
export function activeConfig(s = getState()) {
  return s.thresholdConfigs[s.thresholdConfigs.length - 1];
}
const nextId = (s, k) => ++s.seq[k];
const iso = (t) => new Date(t).toISOString();

// ------------------------------------------------------------------ domain actions
export function createConversation(s, user, { category, initial_message }, at) {
  if (user.role !== "customer") throw new HttpError(403, "Only customers can start a conversation.");
  const text = String(initial_message || "").trim();
  if (!text) throw new HttpError(422, "Write your first message to start a conversation.");
  const cat = s.categories.includes(category) ? category : "Other";
  const team = s.teams.find((t) => t.categories.includes(cat)) || s.teams[0];
  const agents = s.users.filter((u) => u.role === "agent" && u.team_id === team.id);
  const load = (a) => s.conversations.filter((c) => c.agent_id === a.id && c.status === "OPEN").length;
  agents.sort((a, b) => load(a) - load(b));
  const now = at ? new Date(at).getTime() : Date.now();
  const conv = {
    id: nextId(s, "conversation"),
    customer_id: user.id,
    agent_id: agents[0] ? agents[0].id : null,
    team_id: team.id,
    category: cat,
    status: "OPEN",
    message_count: 0,
    started_at: iso(now),
    ended_at: null,
    actual_outcome: null,
    outcome_at: null,
  };
  s.conversations.push(conv);
  const res = addMessage(s, conv.id, user, text, at);
  return { conversation: conv, events: res.events };
}

export function addMessage(s, convId, user, text, at) {
  const conv = byId(s.conversations, convId);
  if (!conv || !canSee(user, conv)) throw new HttpError(404, "Conversation not found.");
  if (user.role !== "customer" && user.role !== "agent") throw new HttpError(403, "Supervisors and admins can't post in conversations.");
  if (conv.status !== "OPEN") throw new HttpError(409, "This conversation is closed.");
  const clean = String(text || "").trim();
  if (!clean) throw new HttpError(422, "Message can't be empty.");
  if (clean.length > 2000) throw new HttpError(422, "Message is too long (2000 characters max).");

  const existing = messagesOf(s, convId);
  const last = existing[existing.length - 1];
  const wanted = at ? new Date(at).getTime() : Date.now();
  // Server-assigned, strictly increasing: the ML picks "the first five" by timestamp.
  const t = last ? Math.max(wanted, new Date(last.created_at).getTime() + 1) : wanted;

  const sent = mockSentiment(clean);
  const message = {
    id: nextId(s, "message"),
    conversation_id: convId,
    seq: conv.message_count + 1,
    sender_type: user.role === "customer" ? "customer" : "agent",
    sender_id: user.id,
    text: clean,
    created_at: iso(t),
    sentiment: sent.sentiment,
    negative_probability: sent.negative_probability,
    positive_probability: sent.positive_probability,
    sentiment_model_version: sent.model_version,
  };
  s.messages.push(message);
  conv.message_count = message.seq;

  const all = [...existing, message];
  const features = computeFeatures(all);
  const custProbs = all.filter((m) => m.sender_type === "customer").map((m) => m.negative_probability);
  const events = [
    { type: "NEW_MESSAGE", conversation_id: convId, internal: internalMessage(message), public: publicMessage(message) },
    {
      type: "SENTIMENT_UPDATED", conversation_id: convId, public: null,
      internal: {
        message_id: message.id, sentiment: message.sentiment,
        negative_probability: message.negative_probability, positive_probability: message.positive_probability,
      },
    },
    {
      type: "SENTIMENT_TRAJECTORY_UPDATED", conversation_id: convId, public: null,
      internal: {
        slope: features.sentiment_slope, volatility: features.sentiment_volatility,
        trend: trendOf(features, TREND_CFG), customer_message_count: features.customer_message_count,
        series_tail: custProbs.slice(-12),
      },
    },
  ];

  if (message.seq === CHECKPOINT && !latestPrediction(s, convId)) {
    const cfg = activeConfig(s);
    const first5 = all.slice(0, CHECKPOINT);
    const score = mockRisk(first5);
    const pred = {
      id: nextId(s, "prediction"),
      conversation_id: convId,
      model_version: "mock-escalation-v1",
      checkpoint_messages: CHECKPOINT,
      status: "ok",
      risk_score: score,
      risk_level: classify(score, cfg),
      ml_threshold: 0.5,
      alert_recommended: score >= 0.5,
      label_interpretation: "eventual escalation outcome",
      reasons: [],
      warnings: MOCK_WARNINGS,
      error: null,
      is_mock: true,
      predicted_at: iso(t),
    };
    s.predictions.push(pred);
    events.push({ type: "RISK_UPDATED", conversation_id: convId, internal: predictionView(pred), public: null });
    if (score >= cfg.alert_min) {
      const alert = {
        id: nextId(s, "alert"),
        conversation_id: convId,
        prediction_id: pred.id,
        severity: pred.risk_level === "CRITICAL" ? "CRITICAL" : "HIGH",
        reason: `Risk score ${Math.round(score * 100)} at message ${CHECKPOINT}, alert threshold ${Math.round(cfg.alert_min * 100)}`,
        threshold_used: cfg.alert_min,
        created_at: iso(t),
        acknowledged_at: null, acknowledged_by: null, resolved_at: null, resolved_by: null, outcome_match: null,
      };
      s.alerts.push(alert);
      events.push({ type: "NEW_ALERT", conversation_id: convId, internal: alertView(s, alert), public: null });
    }
  }

  events.push({
    type: "CONVERSATION_UPDATED", conversation_id: convId,
    internal: conversationSummary(s, conv, true), public: conversationSummary(s, conv, false),
  });
  return { message, events };
}

export function closeConversation(s, convId, user, outcome, note, at) {
  const conv = byId(s.conversations, convId);
  if (!conv || !canSee(user, conv)) throw new HttpError(404, "Conversation not found.");
  if (user.role === "customer") throw new HttpError(403, "Only agents and supervisors can close a conversation.");
  if (conv.status !== "OPEN") throw new HttpError(409, "This conversation is already closed.");
  if (outcome !== "RESOLVED" && outcome !== "ESCALATED") throw new HttpError(422, "Choose Resolved or Escalated.");
  const t = at ? new Date(at).getTime() : Date.now();
  conv.status = outcome;
  conv.ended_at = iso(t);
  const rec = {
    id: nextId(s, "outcome"), conversation_id: convId, reported_outcome: outcome, reported_by: user.id,
    reported_at: iso(t), note: note || "", validated: false, validated_outcome: null, validated_by: null,
    validated_at: null, validation_note: "",
  };
  s.outcomes.push(rec);
  return {
    outcome: rec,
    events: [
      { type: "OUTCOME_UPDATED", conversation_id: convId, internal: rec, public: null },
      { type: "CONVERSATION_UPDATED", conversation_id: convId, internal: conversationSummary(s, conv, true), public: conversationSummary(s, conv, false) },
    ],
  };
}

export function validateOutcome(s, outcomeId, user, validated_outcome, note, at) {
  if (user.role !== "supervisor" && user.role !== "admin") throw new HttpError(403, "Only supervisors and admins can validate outcomes.");
  const rec = byId(s.outcomes, outcomeId);
  if (!rec) throw new HttpError(404, "Outcome not found.");
  if (rec.validated) throw new HttpError(409, "This outcome is already validated.");
  if (validated_outcome !== "RESOLVED" && validated_outcome !== "ESCALATED") throw new HttpError(422, "Choose Resolved or Escalated.");
  const t = at ? new Date(at).getTime() : Date.now();
  rec.validated = true;
  rec.validated_outcome = validated_outcome;
  rec.validated_by = user.id;
  rec.validated_at = iso(t);
  rec.validation_note = note || "";
  const conv = byId(s.conversations, rec.conversation_id);
  conv.actual_outcome = validated_outcome; // set ONLY here, never from a prediction
  conv.outcome_at = iso(t);
  s.alerts
    .filter((a) => a.conversation_id === conv.id)
    .forEach((a) => {
      a.outcome_match = validated_outcome === "ESCALATED";
    });
  return {
    outcome: rec,
    events: [
      { type: "OUTCOME_UPDATED", conversation_id: conv.id, internal: rec, public: null },
      ...s.alerts
        .filter((a) => a.conversation_id === conv.id)
        .map((a) => ({ type: "ALERT_UPDATED", conversation_id: conv.id, internal: alertView(s, a), public: null })),
    ],
  };
}

export function updateAlert(s, alertId, user, action, at) {
  if (user.role !== "supervisor" && user.role !== "admin") throw new HttpError(403, "Only supervisors and admins can update alerts.");
  const a = byId(s.alerts, alertId);
  if (!a) throw new HttpError(404, "Alert not found.");
  const t = iso(at ? new Date(at).getTime() : Date.now());
  if (action === "acknowledge") {
    if (a.acknowledged_at) throw new HttpError(409, "Already acknowledged.");
    a.acknowledged_at = t;
    a.acknowledged_by = user.id;
  } else if (action === "resolve") {
    if (a.resolved_at) throw new HttpError(409, "Already resolved.");
    if (!a.acknowledged_at) {
      a.acknowledged_at = t;
      a.acknowledged_by = user.id;
    }
    a.resolved_at = t;
    a.resolved_by = user.id;
  } else {
    throw new HttpError(422, "Unknown action.");
  }
  const conv = byId(s.conversations, a.conversation_id);
  return {
    alert: a,
    events: [
      { type: "ALERT_UPDATED", conversation_id: a.conversation_id, internal: alertView(s, a), public: null },
      { type: "CONVERSATION_UPDATED", conversation_id: a.conversation_id, internal: conversationSummary(s, conv, true), public: conversationSummary(s, conv, false) },
    ],
  };
}

export { round, slopeOf };
