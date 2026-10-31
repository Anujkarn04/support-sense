// Pure logic for the in-browser demo backend. MOCK ONLY.
// Mirrors the *shape* of the real ML pipeline (binary sentiment with probabilities,
// one risk score at the 5th message). The numbers come from a keyword heuristic,
// never from the trained model, and everything it produces is flagged is_mock.

export const CHECKPOINT = 5;

export const DEFAULT_BANDS = {
  medium_min: 0.3,
  high_min: 0.5,
  critical_min: 0.7,
  alert_min: 0.5,
};

const NEG = [
  "terrible", "awful", "worst", "hate", "angry", "furious", "unacceptable", "disgrace",
  "useless", "cancel", "refund", "broken", "damaged", "never", "again", "still", "nothing",
  "waiting", "ridiculous", "frustrated", "frustrating", "disappointed", "scam", "manager",
  "complaint", "stop", "tired", "charged", "crashed", "late", "lost", "wrong", "done",
];
const POS = [
  "thanks", "thank", "great", "perfect", "helpful", "appreciate", "resolved", "works",
  "worked", "love", "happy", "excellent", "good", "glad", "sorted", "brilliant",
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000; // 0..1, deterministic
}

export function mockSentiment(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  let n = 0;
  let p = 0;
  for (const w of words) {
    if (NEG.includes(w)) n += 1;
    if (POS.includes(w)) p += 1;
  }
  const jitter = (hash(text) - 0.5) * 0.12;
  const neg = Math.min(0.96, Math.max(0.04, 0.4 + 0.14 * n - 0.16 * p + jitter));
  return {
    sentiment: neg >= 0.5 ? "negative" : "positive",
    negative_probability: round(neg),
    positive_probability: round(1 - neg),
    model_version: "mock-sentiment-v1",
  };
}

export const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

export function slopeOf(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const std = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
};

/** Live trajectory features, recomputed after every message (spec Gap #2). */
export function computeFeatures(messages) {
  const cust = messages.filter((m) => m.sender_type === "customer" && m.negative_probability != null);
  const probs = cust.map((m) => m.negative_probability);
  const delays = [];
  messages.forEach((m, i) => {
    if (m.sender_type === "agent" && i > 0) {
      const d = (new Date(m.created_at) - new Date(messages[i - 1].created_at)) / 1000;
      if (d >= 0) delays.push(d);
    }
  });
  return {
    customer_message_count: messages.filter((m) => m.sender_type === "customer").length,
    agent_message_count: messages.filter((m) => m.sender_type === "agent").length,
    negative_message_count: cust.filter((m) => m.sentiment === "negative").length,
    sentiment_mean: probs.length ? round(mean(probs)) : null,
    sentiment_latest: probs.length ? probs[probs.length - 1] : null,
    sentiment_slope: probs.length >= 2 ? round(slopeOf(probs)) : null,
    sentiment_volatility: probs.length >= 2 ? round(std(probs)) : null,
    avg_agent_response_delay_s: delays.length ? Math.round(mean(delays)) : null,
    max_agent_response_delay_s: delays.length ? Math.round(Math.max(...delays)) : null,
  };
}

/** Heuristic stand-in for the escalation model. 0..1, uncalibrated. */
export function mockRisk(firstFive) {
  const f = computeFeatures(firstFive);
  const m = f.sentiment_mean ?? 0.4;
  const s = Math.max(0, f.sentiment_slope ?? 0);
  const delay = Math.min(1, (f.avg_agent_response_delay_s ?? 0) / 7200);
  const ratio = f.customer_message_count ? f.negative_message_count / f.customer_message_count : 0;
  // Deterministic per-conversation spread, so the demo is not all-or-nothing.
  const spread = (hash(firstFive.map((x) => x.text).join("|")) - 0.5) * 0.3;
  const score = 0.04 + 0.7 * m + 1.1 * s + 0.1 * delay + 0.3 * ratio - 0.2 + spread;
  return round(Math.min(0.98, Math.max(0.01, score)));
}

export function classify(score, bands) {
  if (score >= bands.critical_min) return "CRITICAL";
  if (score >= bands.high_min) return "HIGH";
  if (score >= bands.medium_min) return "MEDIUM";
  return "LOW";
}

export function trendOf(features, trendCfg) {
  if (features.customer_message_count < trendCfg.min_customer_messages || features.sentiment_slope == null) {
    return "insufficient";
  }
  if (features.sentiment_slope >= trendCfg.declining_slope) return "declining";
  if (features.sentiment_slope <= trendCfg.improving_slope) return "improving";
  return "stable";
}

export const TREND_CFG = { declining_slope: 0.04, improving_slope: -0.04, min_customer_messages: 3 };

// Offline cross-validation figures copied from the ML developer's own report
// (ml/reports/escalation/combined_checkpoint_5_threshold_analysis.csv, n=107).
export const OFFLINE_REFERENCE = {
  label: "Offline cross-validation, 107 labelled conversations",
  points: [
    [0.3, 0.5072, 0.8537, 0.6364], [0.35, 0.5152, 0.8293, 0.6355], [0.4, 0.5, 0.7317, 0.5941],
    [0.45, 0.5385, 0.6829, 0.6022], [0.5, 0.5745, 0.6585, 0.6136], [0.55, 0.575, 0.561, 0.5679],
    [0.6, 0.625, 0.4878, 0.5479], [0.65, 0.6129, 0.4634, 0.5278], [0.7, 0.68, 0.4146, 0.5152],
  ].map(([threshold, precision, recall, f1]) => ({ threshold, precision, recall, f1 })),
};

export const MOCK_WARNINGS = [
  "MOCK: scores come from a keyword heuristic running in your browser, not from the trained model.",
  "The output predicts eventual conversation outcome, not escalation onset.",
  "Only the first five chronological messages are used.",
];

/** Small seeded PRNG so demo data is the same on every first load. */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
