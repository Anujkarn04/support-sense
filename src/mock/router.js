// Demo implementation of the REST contract. MOCK ONLY.
// Every handler returns the same JSON shapes the real FastAPI backend must return
// (see API_CONTRACT.md), including role-based scoping: customers never get ML fields.
import { CHECKPOINT, OFFLINE_REFERENCE, TREND_CFG, computeFeatures, round, trendOf } from "./engine.js";
import {
  HttpError, activeConfig, addMessage, closeConversation, createConversation, getState, persist, publish, updateAlert, validateOutcome,
} from "./store.js";
import {
  alertView, byId, canSee, conversationSummary, internalMessage, latestPrediction, messagesOf, predictionView, publicMessage, userRef,
} from "./views.js";

const DAY = 86400000;
const day = (t) => new Date(t).toISOString().slice(0, 10);
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const isInternal = (u) => u.role !== "customer";
const isSup = (u) => u.role === "supervisor" || u.role === "admin";

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw new HttpError(403, "You don't have access to this.");
}

function userView(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, team_id: u.team_id };
}

function lastDays(n) {
  const out = [];
  const today = new Date(day(Date.now()) + "T00:00:00Z").getTime();
  for (let i = n - 1; i >= 0; i--) out.push(day(today - i * DAY));
  return out;
}

function agentDelays(s) {
  // [{t, delay_s, conv}] for every agent message that follows another message
  const out = [];
  s.conversations.forEach((c) => {
    const msgs = messagesOf(s, c.id);
    msgs.forEach((m, i) => {
      if (m.sender_type === "agent" && i > 0) {
        const d = (new Date(m.created_at) - new Date(msgs[i - 1].created_at)) / 1000;
        if (d >= 0) out.push({ t: new Date(m.created_at).getTime(), delay_s: d, conv: c });
      }
    });
  });
  return out;
}

function validatedRows(s) {
  // Conversations with an "ok" prediction AND a validated outcome.
  const rows = [];
  s.outcomes.forEach((o) => {
    if (!o.validated) return;
    const pred = latestPrediction(s, o.conversation_id);
    if (!pred || pred.status !== "ok") return;
    rows.push({ score: pred.risk_score, truth: o.validated_outcome === "ESCALATED", conv_id: o.conversation_id });
  });
  return rows;
}

// ------------------------------------------------------------------ route table
const routes = [];
const on = (method, pattern, handler, opts = {}) => routes.push({ method, re: new RegExp(`^${pattern}$`), handler, public: !!opts.public });

on("GET", "/health", () => ({
  status: "ok", db: "mock",
  ml: { status: "ok", is_mock: true, sentiment_model_version: "mock-sentiment-v1", escalation_model_version: "mock-escalation-v1", checkpoint_messages: CHECKPOINT },
}), { public: true });

on("POST", "/auth/login", ({ s, body }) => {
  const u = s.users.find((x) => x.email.toLowerCase() === String(body.email || "").trim().toLowerCase());
  // Demo mode accepts any non-empty password. The real backend checks a bcrypt hash.
  if (!u || !body.password) throw new HttpError(401, "Email or password is incorrect.");
  return { access_token: `mock.${u.id}`, token_type: "bearer", expires_in: 3600, user: userView(u) };
}, { public: true });

on("POST", "/auth/register", ({ s, body }) => {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!name) throw new HttpError(422, "Enter your name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(422, "Enter a valid email address.");
  if (String(body.password || "").length < 8) throw new HttpError(422, "Use a password of at least 8 characters.");
  if (s.users.some((u) => u.email === email)) throw new HttpError(409, "An account with this email already exists.");
  const u = { id: Math.max(...s.users.map((x) => x.id)) + 1, name, email, role: "customer", team_id: null };
  s.users.push(u);
  persist();
  return { access_token: `mock.${u.id}`, token_type: "bearer", expires_in: 3600, user: userView(u) };
}, { public: true });

on("GET", "/auth/me", ({ user }) => userView(user));

on("GET", "/config/risk", ({ s }) => {
  const c = activeConfig(s);
  return {
    checkpoint_messages: CHECKPOINT,
    bands: { medium_min: c.medium_min, high_min: c.high_min, critical_min: c.critical_min, alert_min: c.alert_min },
    trend: TREND_CFG,
    categories: s.categories,
    teams: s.teams.map((t) => ({ id: t.id, name: t.name })),
    ml: { is_mock: true, sentiment_model_version: "mock-sentiment-v1", escalation_model_version: "mock-escalation-v1" },
    escalation_definition:
      "Demo text, not the real guideline: Escalated means the customer asked for a manager, threatened to stop using the service, or the case was handed to senior staff. The ML team's written definition replaces this.",
  };
});

on("GET", "/config/alert-thresholds", ({ s, user }) => {
  requireRole(user, "supervisor", "admin");
  return { current: activeConfig(s), history: [...s.thresholdConfigs].reverse() };
});

on("POST", "/config/alert-thresholds", ({ s, user, body }) => {
  requireRole(user, "admin");
  const v = ["medium_min", "high_min", "critical_min", "alert_min"].map((k) => Number(body[k]));
  if (v.some((x) => !Number.isFinite(x) || x < 0 || x > 1)) throw new HttpError(422, "Every threshold must be between 0 and 1.");
  if (!(v[0] <= v[1] && v[1] <= v[2])) throw new HttpError(422, "Bands must rise: medium, then high, then critical.");
  const cfg = {
    id: Math.max(...s.thresholdConfigs.map((c) => c.id)) + 1,
    medium_min: v[0], high_min: v[1], critical_min: v[2], alert_min: v[3],
    effective_from: new Date().toISOString(), set_by: user.id,
  };
  s.thresholdConfigs.push(cfg);
  persist();
  return cfg;
});

// ---- conversations
on("GET", "/conversations", ({ s, user, query }) => {
  let list = s.conversations.filter((c) => canSee(user, c));
  if (query.status) list = list.filter((c) => c.status === query.status);
  if (query.team_id) list = list.filter((c) => c.team_id === Number(query.team_id));
  if (query.agent_id) list = list.filter((c) => c.agent_id === Number(query.agent_id));
  if (isInternal(user)) {
    if (query.risk_level) list = list.filter((c) => latestPrediction(s, c.id)?.risk_level === query.risk_level);
    if (query.has_alert === "true") list = list.filter((c) => s.alerts.some((a) => a.conversation_id === c.id && !a.resolved_at));
  }
  const items = list.map((c) => conversationSummary(s, c, isInternal(user)));
  items.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
  return { items, total: items.length };
});

on("POST", "/conversations", ({ s, user, body }) => {
  const { conversation, events } = createConversation(s, user, body);
  publish(events);
  const msg = messagesOf(s, conversation.id)[0];
  return { conversation: conversationSummary(s, conversation, false), message: publicMessage(msg) };
});

on("GET", "/conversations/(\\d+)", ({ s, user, m }) => {
  const conv = byId(s.conversations, Number(m[1]));
  if (!conv || !canSee(user, conv)) throw new HttpError(404, "Conversation not found.");
  if (!isInternal(user)) return conversationSummary(s, conv, false);
  const msgs = messagesOf(s, conv.id);
  const features = computeFeatures(msgs);
  return {
    ...conversationSummary(s, conv, true),
    features: { ...features, trend: trendOf(features, TREND_CFG) },
    alerts: s.alerts.filter((a) => a.conversation_id === conv.id).map((a) => alertView(s, a)),
    outcome: s.outcomes.find((o) => o.conversation_id === conv.id) || null,
  };
});

on("PATCH", "/conversations/(\\d+)", ({ s, user, m, body }) => {
  requireRole(user, "supervisor", "admin");
  const conv = byId(s.conversations, Number(m[1]));
  if (!conv) throw new HttpError(404, "Conversation not found.");
  const agent = byId(s.users, Number(body.agent_id));
  if (!agent || agent.role !== "agent") throw new HttpError(422, "Choose an agent.");
  conv.agent_id = agent.id;
  conv.team_id = agent.team_id;
  publish([{ type: "CONVERSATION_UPDATED", conversation_id: conv.id, internal: conversationSummary(s, conv, true), public: conversationSummary(s, conv, false) }]);
  return conversationSummary(s, conv, true);
});

on("GET", "/conversations/(\\d+)/messages", ({ s, user, m, query }) => {
  const conv = byId(s.conversations, Number(m[1]));
  if (!conv || !canSee(user, conv)) throw new HttpError(404, "Conversation not found.");
  const after = Number(query.after_seq || 0);
  const shape = isInternal(user) ? internalMessage : publicMessage;
  return { items: messagesOf(s, conv.id).filter((x) => x.seq > after).map(shape) };
});

on("POST", "/conversations/(\\d+)/messages", ({ s, user, m, body }) => {
  const { message, events } = addMessage(s, Number(m[1]), user, body.text);
  publish(events);
  return isInternal(user) ? internalMessage(message) : publicMessage(message);
});

on("GET", "/conversations/(\\d+)/predictions", ({ s, user, m }) => {
  requireRole(user, "agent", "supervisor", "admin");
  const conv = byId(s.conversations, Number(m[1]));
  if (!conv || !canSee(user, conv)) throw new HttpError(404, "Conversation not found.");
  return { items: s.predictions.filter((p) => p.conversation_id === conv.id).map(predictionView) };
});

on("POST", "/conversations/(\\d+)/close", ({ s, user, m, body }) => {
  const { outcome, events } = closeConversation(s, Number(m[1]), user, body.outcome, body.note);
  publish(events);
  return outcome;
});

// ---- alerts
on("GET", "/alerts", ({ s, user, query }) => {
  requireRole(user, "agent", "supervisor", "admin");
  let list = s.alerts.filter((a) => {
    const c = byId(s.conversations, a.conversation_id);
    return c && canSee(user, c);
  });
  if (query.acknowledged === "false") list = list.filter((a) => !a.acknowledged_at);
  if (query.acknowledged === "true") list = list.filter((a) => a.acknowledged_at);
  if (query.resolved === "false") list = list.filter((a) => !a.resolved_at);
  if (query.resolved === "true") list = list.filter((a) => a.resolved_at);
  if (query.severity) list = list.filter((a) => a.severity === query.severity);
  const items = list.map((a) => alertView(s, a)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { items, total: items.length };
});

on("PATCH", "/alerts/(\\d+)", ({ s, user, m, body }) => {
  const { alert, events } = updateAlert(s, Number(m[1]), user, body.action);
  publish(events);
  return alertView(s, alert);
});

// ---- outcomes
on("GET", "/outcomes", ({ s, user, query }) => {
  requireRole(user, "supervisor", "admin");
  let list = s.outcomes;
  if (query.validated === "false") list = list.filter((o) => !o.validated);
  if (query.validated === "true") list = list.filter((o) => o.validated);
  const items = list
    .map((o) => {
      const conv = byId(s.conversations, o.conversation_id);
      const pred = latestPrediction(s, o.conversation_id);
      return {
        ...o,
        conversation: { id: conv.id, category: conv.category, customer: userRef(s, conv.customer_id), agent: userRef(s, conv.agent_id), message_count: conv.message_count },
        risk_score: pred && pred.status === "ok" ? pred.risk_score : null,
        risk_level: pred && pred.status === "ok" ? pred.risk_level : null,
        alert_fired: s.alerts.some((a) => a.conversation_id === conv.id),
        reported_by_name: byId(s.users, o.reported_by)?.name,
      };
    })
    .sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at));
  return { items, total: items.length };
});

on("POST", "/outcomes/(\\d+)/validate", ({ s, user, m, body }) => {
  const { outcome, events } = validateOutcome(s, Number(m[1]), user, body.validated_outcome, body.note);
  publish(events);
  return outcome;
});

// ---- dashboard
on("GET", "/dashboard/summary", ({ s, user }) => {
  requireRole(user, "supervisor", "admin");
  const open = s.conversations.filter((c) => c.status === "OPEN");
  const lvl = (c) => {
    const p = latestPrediction(s, c.id);
    return p && p.status === "ok" ? p.risk_level : null;
  };
  const closed = s.outcomes;
  const validated = s.outcomes.filter((o) => o.validated);
  const delays = agentDelays(s).filter((d) => d.t > Date.now() - 14 * DAY);
  return {
    active: open.length,
    high_risk: open.filter((c) => ["HIGH", "CRITICAL"].includes(lvl(c))).length,
    critical: open.filter((c) => lvl(c) === "CRITICAL").length,
    pending_alerts: s.alerts.filter((a) => !a.acknowledged_at).length,
    unvalidated_outcomes: s.outcomes.filter((o) => !o.validated).length,
    escalation_rate: {
      reported: closed.length ? round(closed.filter((o) => o.reported_outcome === "ESCALATED").length / closed.length) : null,
      validated: validated.length ? round(validated.filter((o) => o.validated_outcome === "ESCALATED").length / validated.length) : null,
      reported_n: closed.length,
      validated_n: validated.length,
    },
    avg_response_s: delays.length ? Math.round(avg(delays.map((d) => d.delay_s))) : null,
  };
});

on("GET", "/dashboard/sentiment", ({ s, user, query }) => {
  requireRole(user, "supervisor", "admin");
  const days = lastDays(Number(query.days || 14));
  const groupBy = query.group_by === "team" ? "team" : "none";
  const custMsgs = s.messages.filter((m) => m.sender_type === "customer");
  const keyOf = (m) => (groupBy === "team" ? byId(s.conversations, m.conversation_id).team_id : "all");
  const keys = groupBy === "team" ? s.teams.map((t) => ({ key: t.id, name: t.name })) : [{ key: "all", name: "All customers" }];
  const series = keys.map(({ key, name }) => ({
    key, name,
    points: days.map((d) => {
      const vals = custMsgs.filter((m) => day(m.created_at) === d && keyOf(m) === key).map((m) => m.negative_probability);
      return { date: d, value: vals.length ? round(avg(vals)) : null, n: vals.length };
    }),
  }));
  return { series };
});

on("GET", "/dashboard/escalations", ({ s, user, query }) => {
  requireRole(user, "supervisor", "admin");
  const basis = query.basis === "reported" ? "reported" : "validated";
  const rows = s.outcomes
    .filter((o) => (basis === "reported" ? true : o.validated))
    .map((o) => {
      const conv = byId(s.conversations, o.conversation_id);
      return { conv, esc: (basis === "reported" ? o.reported_outcome : o.validated_outcome) === "ESCALATED", at: conv.ended_at };
    });
  const days = lastDays(Number(query.days || 14));
  const by_time = days.map((d) => {
    const r = rows.filter((x) => day(x.at) === d);
    return { date: d, escalated: r.filter((x) => x.esc).length, closed: r.length };
  });
  const by_category = s.categories.map((name) => {
    const r = rows.filter((x) => x.conv.category === name);
    return { name, escalated: r.filter((x) => x.esc).length, closed: r.length };
  });
  return { basis, by_time, by_category };
});

on("GET", "/dashboard/risk-distribution", ({ s, user }) => {
  requireRole(user, "supervisor", "admin");
  const open = s.conversations.filter((c) => c.status === "OPEN");
  const levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => ({
    level,
    count: open.filter((c) => {
      const p = latestPrediction(s, c.id);
      return p && p.status === "ok" && p.risk_level === level;
    }).length,
  }));
  const unscored = open.filter((c) => !latestPrediction(s, c.id)).length;
  return { levels, unscored };
});

on("GET", "/dashboard/response-time", ({ s, user, query }) => {
  requireRole(user, "supervisor", "admin");
  const days = lastDays(Number(query.days || 14));
  const all = agentDelays(s);
  return {
    points: days.map((d) => {
      const v = all.filter((x) => day(x.t) === d).map((x) => x.delay_s);
      return { date: d, avg_s: v.length ? Math.round(avg(v)) : null, n: v.length };
    }),
  };
});

function groupStats(s, convs) {
  const ids = new Set(convs.map((c) => c.id));
  const open = convs.filter((c) => c.status === "OPEN");
  const lvl = (c) => latestPrediction(s, c.id)?.risk_level;
  const val = s.outcomes.filter((o) => o.validated && ids.has(o.conversation_id));
  const neg = s.messages.filter((m) => m.sender_type === "customer" && ids.has(m.conversation_id)).map((m) => m.negative_probability);
  return {
    open: open.length,
    high_risk: open.filter((c) => ["HIGH", "CRITICAL"].includes(lvl(c))).length,
    closed: convs.length - open.length,
    escalation_rate: val.length ? round(val.filter((o) => o.validated_outcome === "ESCALATED").length / val.length) : null,
    validated_n: val.length,
    avg_negative: neg.length ? round(avg(neg)) : null,
  };
}

on("GET", "/dashboard/agents", ({ s, user }) => {
  requireRole(user, "supervisor", "admin");
  return {
    items: s.users.filter((u) => u.role === "agent").map((a) => ({
      id: a.id, name: a.name, team: byId(s.teams, a.team_id)?.name,
      ...groupStats(s, s.conversations.filter((c) => c.agent_id === a.id)),
    })),
  };
});

on("GET", "/dashboard/teams", ({ s, user }) => {
  requireRole(user, "supervisor", "admin");
  return { items: s.teams.map((t) => ({ id: t.id, name: t.name, ...groupStats(s, s.conversations.filter((c) => c.team_id === t.id)) })) };
});

// ---- analytics
on("GET", "/analytics/sentiment-trajectory/(\\d+)", ({ s, user, m }) => {
  requireRole(user, "agent", "supervisor", "admin");
  const conv = byId(s.conversations, Number(m[1]));
  if (!conv || !canSee(user, conv)) throw new HttpError(404, "Conversation not found.");
  const msgs = messagesOf(s, conv.id);
  const features = computeFeatures(msgs);
  let ci = 0;
  const points = [];
  const agent_replies = [];
  msgs.forEach((x) => {
    if (x.sender_type === "customer") {
      ci += 1;
      points.push({ customer_index: ci, message_seq: x.seq, negative_probability: x.negative_probability, created_at: x.created_at });
    } else {
      agent_replies.push({ message_seq: x.seq, after_customer_index: ci, created_at: x.created_at });
    }
  });
  const pred = latestPrediction(s, conv.id);
  return {
    conversation_id: conv.id,
    points,
    agent_replies,
    checkpoint_seq: pred ? CHECKPOINT : null,
    checkpoint_customer_index: pred ? msgs.slice(0, CHECKPOINT).filter((x) => x.sender_type === "customer").length : null,
    slope: features.sentiment_slope,
    volatility: features.sentiment_volatility,
    trend: trendOf(features, TREND_CFG),
    customer_message_count: features.customer_message_count,
  };
});

on("GET", "/analytics/threshold-simulation", ({ s, user }) => {
  requireRole(user, "supervisor", "admin");
  const rows = validatedRows(s);
  const MIN = 30;
  const current = activeConfig(s).alert_min;
  const base = { n: rows.length, positives: rows.filter((r) => r.truth).length, min_required: MIN, current_threshold: current, offline_reference: OFFLINE_REFERENCE };
  if (rows.length < MIN) return { status: "insufficient_data", points: [], ...base };
  const points = [];
  for (let t = 0.3; t <= 0.9001; t += 0.05) {
    const th = round(t, 2);
    const tp = rows.filter((r) => r.score >= th && r.truth).length;
    const fp = rows.filter((r) => r.score >= th && !r.truth).length;
    const fn = rows.filter((r) => r.score < th && r.truth).length;
    const precision = tp + fp ? tp / (tp + fp) : null;
    const recall = tp + fn ? tp / (tp + fn) : null;
    const f1 = precision != null && recall != null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
    points.push({
      threshold: th, tp, fp, fn, alerts: tp + fp,
      precision: precision == null ? null : round(precision), recall: recall == null ? null : round(recall), f1: f1 == null ? null : round(f1),
    });
  }
  return { status: "ok", points, ...base };
});

on("GET", "/analytics/alert-effectiveness", ({ s, user }) => {
  requireRole(user, "supervisor", "admin");
  const acked = s.alerts.filter((a) => a.acknowledged_at);
  const resolved = s.alerts.filter((a) => a.resolved_at);
  const matched = s.alerts.filter((a) => a.outcome_match !== null);
  const days = lastDays(14);
  return {
    total_alerts: s.alerts.length,
    unacknowledged: s.alerts.filter((a) => !a.acknowledged_at).length,
    avg_time_to_ack_s: acked.length ? Math.round(avg(acked.map((a) => (new Date(a.acknowledged_at) - new Date(a.created_at)) / 1000))) : null,
    avg_time_to_resolve_s: resolved.length ? Math.round(avg(resolved.map((a) => (new Date(a.resolved_at) - new Date(a.created_at)) / 1000))) : null,
    precision: matched.length ? round(matched.filter((a) => a.outcome_match).length / matched.length) : null,
    matched_n: matched.length,
    series: days.map((d) => {
      const a = s.alerts.filter((x) => day(x.created_at) === d);
      const ack = a.filter((x) => x.acknowledged_at);
      return {
        date: d,
        alerts: a.length,
        true_positive: a.filter((x) => x.outcome_match === true).length,
        false_positive: a.filter((x) => x.outcome_match === false).length,
        avg_ack_s: ack.length ? Math.round(avg(ack.map((x) => (new Date(x.acknowledged_at) - new Date(x.created_at)) / 1000))) : null,
      };
    }),
  };
});

// ---- models and admin
on("GET", "/models", ({ s, user }) => {
  requireRole(user, "supervisor", "admin");
  return { items: s.models };
});

on("GET", "/admin/users", ({ s, user }) => {
  requireRole(user, "admin");
  return { items: s.users.map((u) => ({ ...userView(u), team: byId(s.teams, u.team_id)?.name || null })) };
});

on("GET", "/admin/export/training", ({ s, user }) => {
  requireRole(user, "admin");
  const lines = s.outcomes
    .filter((o) => o.validated)
    .map((o) =>
      JSON.stringify({
        conversation_id: o.conversation_id,
        label: o.validated_outcome === "ESCALATED" ? 1 : 0,
        messages: messagesOf(s, o.conversation_id).slice(0, CHECKPOINT).map((m) => ({ id: m.id, role: m.sender_type, created_at: m.created_at, text: m.text })),
      }),
    );
  return { filename: "training-export.jsonl", text: lines.join("\n"), count: lines.length };
});

// ------------------------------------------------------------------ dispatcher
export function mockRequest(method, path, { body, query = {}, token } = {}) {
  try {
    const s = getState();
    const route = routes.find((r) => r.method === method && r.re.test(path));
    if (!route) throw new HttpError(404, `No such endpoint: ${method} ${path}`);
    let user = null;
    if (!route.public) {
      const id = token && token.startsWith("mock.") ? Number(token.slice(5)) : null;
      user = id ? byId(s.users, id) : null;
      if (!user) throw new HttpError(401, "Your session has expired. Sign in again.");
    }
    const m = route.re.exec(path);
    return { status: 200, data: route.handler({ s, user, m, body: body || {}, query }) };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, data: { detail: e.detail } };
    // eslint-disable-next-line no-console
    console.error("Mock backend error", e);
    return { status: 500, data: { detail: "Unexpected error in the demo backend." } };
  }
}
