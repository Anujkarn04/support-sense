// Response shaping for the demo backend. MOCK ONLY.
// Mirrors the real rule: customers get PUBLIC shapes with no ML fields at all.
import { CHECKPOINT, computeFeatures, trendOf, TREND_CFG } from "./engine.js";

export const byId = (arr, id) => arr.find((x) => x.id === id);

export function publicMessage(m) {
  return { id: m.id, seq: m.seq, sender_type: m.sender_type, text: m.text, created_at: m.created_at };
}

export function internalMessage(m) {
  return {
    ...publicMessage(m),
    sentiment: m.sentiment,
    negative_probability: m.negative_probability,
    positive_probability: m.positive_probability,
    sentiment_model_version: m.sentiment_model_version,
  };
}

export function messagesOf(state, convId) {
  return state.messages.filter((m) => m.conversation_id === convId).sort((a, b) => a.seq - b.seq);
}

export function latestPrediction(state, convId) {
  const list = state.predictions.filter((p) => p.conversation_id === convId);
  return list.length ? list[list.length - 1] : null;
}

export function predictionView(p) {
  if (!p) return null;
  return {
    id: p.id,
    conversation_id: p.conversation_id,
    status: p.status,
    model_version: p.model_version,
    checkpoint_messages: p.checkpoint_messages,
    risk_score: p.risk_score,
    risk_level: p.risk_level,
    ml_threshold: p.ml_threshold,
    alert_recommended: p.alert_recommended,
    label_interpretation: p.label_interpretation,
    reasons: p.reasons || [],
    warnings: p.warnings || [],
    error: p.error || null,
    is_mock: !!p.is_mock,
    predicted_at: p.predicted_at,
  };
}

export function alertView(state, a) {
  const conv = byId(state.conversations, a.conversation_id);
  const pred = byId(state.predictions, a.prediction_id);
  return {
    ...a,
    risk_score: pred ? pred.risk_score : null,
    conversation: conv
      ? {
          id: conv.id,
          category: conv.category,
          status: conv.status,
          customer: userRef(state, conv.customer_id),
          agent: conv.agent_id ? userRef(state, conv.agent_id) : null,
          team: byId(state.teams, conv.team_id),
        }
      : null,
  };
}

export function userRef(state, id) {
  const u = byId(state.users, id);
  return u ? { id: u.id, name: u.name } : null;
}

export function conversationSummary(state, conv, internal) {
  const msgs = messagesOf(state, conv.id);
  const last = msgs[msgs.length - 1] || null;
  const base = {
    id: conv.id,
    category: conv.category,
    status: conv.status,
    message_count: conv.message_count,
    started_at: conv.started_at,
    ended_at: conv.ended_at,
    last_message_at: last ? last.created_at : conv.started_at,
    last_message_preview: last ? last.text.slice(0, 90) : "",
    agent: conv.agent_id ? { name: byId(state.users, conv.agent_id)?.name } : null,
    team: byId(state.teams, conv.team_id),
  };
  if (!internal) return base;

  const custProbs = msgs.filter((m) => m.sender_type === "customer").map((m) => m.negative_probability);
  const features = computeFeatures(msgs);
  const pred = latestPrediction(state, conv.id);
  const openAlert = state.alerts.find((a) => a.conversation_id === conv.id && !a.resolved_at) || null;
  return {
    ...base,
    agent: conv.agent_id ? userRef(state, conv.agent_id) : null,
    customer: userRef(state, conv.customer_id),
    last_message_sender: last ? last.sender_type : null,
    sentiment_latest: custProbs.length
      ? {
          negative_probability: custProbs[custProbs.length - 1],
          sentiment: custProbs[custProbs.length - 1] >= 0.5 ? "negative" : "positive",
        }
      : null,
    trajectory: custProbs.slice(-12),
    trend: trendOf(features, TREND_CFG),
    checkpoint: { needed: CHECKPOINT, seen: Math.min(conv.message_count, CHECKPOINT), reached: conv.message_count >= CHECKPOINT },
    prediction: predictionView(pred),
    open_alert: openAlert
      ? { id: openAlert.id, severity: openAlert.severity, acknowledged_at: openAlert.acknowledged_at }
      : null,
    actual_outcome: conv.actual_outcome,
  };
}

/** Does this user's role allow seeing a given conversation? */
export function canSee(user, conv) {
  if (user.role === "supervisor" || user.role === "admin") return true;
  if (user.role === "customer") return conv.customer_id === user.id;
  if (user.role === "agent") return conv.agent_id === user.id;
  return false;
}
