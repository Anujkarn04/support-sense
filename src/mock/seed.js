// Demo data. MOCK ONLY. History is generated through the same code path as live chat
// (A = the store's actions), so demo predictions, alerts and outcomes are consistent.
import { DEFAULT_BANDS, prng } from "./engine.js";

const DAY = 86400000;
const MIN = 60000;
const iso = (t) => new Date(t).toISOString();

export const DEMO_ACCOUNTS = [
  { email: "maya@demo.test", role: "customer", name: "Maya Rao" },
  { email: "ravi@demo.test", role: "agent", name: "Ravi Menon" },
  { email: "priya@demo.test", role: "supervisor", name: "Priya Nair" },
  { email: "anuj@demo.test", role: "admin", name: "Anuj Admin" },
];

const POOLS = {
  calm: {
    c: [
      "Hi, I can't find my invoice for last month.",
      "Thanks, I found it. Could you also resend the receipt?",
      "Great, that works. Thank you!",
      "Perfect, appreciate the help.",
      "That's all I needed, thanks!",
      "Brilliant, all sorted.",
      "Thanks again.",
    ],
    a: [
      "Hello! Happy to help. Can you share your account email?",
      "You'll find invoices under Billing, then History.",
      "Sent just now. Anything else?",
      "Glad to help.",
      "Have a great day.",
      "Anytime.",
    ],
    cGap: [1, 8], aGap: [1, 6],
  },
  mixed: {
    c: [
      "The app crashed during checkout and charged me twice.",
      "OK, I sent the screenshot. Still waiting.",
      "Thanks, the refund arrived but it took too long.",
      "It works now, but I'm disappointed with the delay.",
      "Fine, resolved. Please fix the checkout bug.",
      "Thanks.",
      "Appreciate it.",
    ],
    a: [
      "Sorry about that. Can you send a screenshot of the charge?",
      "Thanks, we're checking with payments now.",
      "We've issued the refund.",
      "Understood, we'll pass this to the engineers.",
      "Thanks for your patience.",
      "Is there anything else?",
    ],
    cGap: [3, 25], aGap: [8, 60],
  },
  angry: {
    c: [
      "My order arrived broken and I'm really frustrated.",
      "This is the second time. Terrible service, nobody has helped me.",
      "Still nothing. I want a refund or I will cancel everything.",
      "This is unacceptable. Get me a manager.",
      "Worst experience ever. I'm done with you.",
      "Useless. Still waiting and nothing happened.",
      "I will tell everyone to avoid you.",
    ],
    a: [
      "Sorry to hear that. Can you share your order number?",
      "We apologise. We're looking into it.",
      "We understand your frustration.",
      "Escalating this to a senior colleague.",
      "I'm sorry about this.",
      "We're working on it.",
    ],
    cGap: [4, 30], aGap: [25, 190],
  },
};

function between(r, [lo, hi]) {
  return (lo + r() * (hi - lo)) * MIN;
}

export function buildSeed(A) {
  const now = Date.now();
  const r = prng(20261030);

  const s = {
    version: 1,
    users: [
      { id: 1, name: "Maya Rao", email: "maya@demo.test", role: "customer", team_id: null },
      { id: 2, name: "Dev Khanna", email: "dev@demo.test", role: "customer", team_id: null },
      { id: 3, name: "Sana Iyer", email: "sana@demo.test", role: "customer", team_id: null },
      { id: 4, name: "Rohan Das", email: "rohan@demo.test", role: "customer", team_id: null },
      { id: 5, name: "Ravi Menon", email: "ravi@demo.test", role: "agent", team_id: 1 },
      { id: 6, name: "Neha Joshi", email: "neha@demo.test", role: "agent", team_id: 1 },
      { id: 7, name: "Arjun Bose", email: "arjun@demo.test", role: "agent", team_id: 2 },
      { id: 8, name: "Isha Kapoor", email: "isha@demo.test", role: "agent", team_id: 2 },
      { id: 9, name: "Priya Nair", email: "priya@demo.test", role: "supervisor", team_id: null },
      { id: 10, name: "Anuj Admin", email: "anuj@demo.test", role: "admin", team_id: null },
    ],
    teams: [
      { id: 1, name: "Billing and account", categories: ["Billing", "Account"] },
      { id: 2, name: "Technical and delivery", categories: ["Technical issue", "Delivery", "Other"] },
    ],
    categories: ["Billing", "Account", "Technical issue", "Delivery", "Other"],
    conversations: [],
    messages: [],
    predictions: [],
    alerts: [],
    outcomes: [],
    thresholdConfigs: [{ id: 1, ...DEFAULT_BANDS, effective_from: iso(now - 30 * DAY), set_by: 10 }],
    models: [
      {
        id: 1, kind: "sentiment", version: "mock-sentiment-v1", status: "active", training_rows: null, metrics: null,
        note: "Keyword heuristic running in your browser. Not a trained model.", is_mock: true,
      },
      {
        id: 2, kind: "escalation", version: "mock-escalation-v1", status: "active", training_rows: null, metrics: null,
        note: "Heuristic score from sentiment, trend and reply delay. Not a trained model.", is_mock: true,
      },
    ],
    seq: { conversation: 0, message: 0, prediction: 0, alert: 0, outcome: 0 },
  };

  const U = (id) => s.users.find((u) => u.id === id);
  const customers = [1, 2, 3, 4];

  // ---------------------------------------------------------------- history
  const HISTORY = 72;
  for (let i = 0; i < HISTORY; i++) {
    const days = 1 + Math.floor(r() * 14);
    let t = now - days * DAY - (18 - 8 * r()) * 3600000 + r() * 3600000;
    const mood = r() < 0.42 ? "calm" : r() < 0.55 ? "mixed" : "angry";
    const pool = POOLS[mood];
    const customer = U(customers[Math.floor(r() * customers.length)]);
    const category = s.categories[Math.floor(r() * s.categories.length)];
    const total = 5 + Math.floor(r() * 4);

    const { conversation: conv } = A.createConversation(s, customer, { category, initial_message: pool.c[0] }, iso(t));
    let ci = 1;
    let ai = 0;
    for (let k = 1; k < total; k++) {
      const isAgent = k % 2 === 1;
      t += between(r, isAgent ? pool.aGap : pool.cGap);
      if (isAgent) {
        A.addMessage(s, conv.id, U(conv.agent_id), pool.a[ai++ % pool.a.length], iso(t));
      } else {
        // real conversations are rarely one pure mood: mix some messages in
        const mixIn = (mood === "angry" && r() < 0.4) || (mood === "calm" && r() < 0.15);
        const src = mixIn ? POOLS.mixed.c : pool.c;
        A.addMessage(s, conv.id, customer, src[ci++ % src.length], iso(t));
      }
    }

    const pred = s.predictions.find((p) => p.conversation_id === conv.id);
    const score = pred ? pred.risk_score : 0.2;
    const pEsc = Math.min(0.92, Math.max(0.08, 0.1 + 0.75 * score));
    const truth = r() < pEsc ? "ESCALATED" : "RESOLVED";
    const reported = r() < 0.9 ? truth : truth === "ESCALATED" ? "RESOLVED" : "ESCALATED";

    t += (5 + r() * 55) * MIN;
    const closeAt = Math.min(t, now - 30 * MIN);
    const closer = U(conv.agent_id);
    const { outcome } = A.closeConversation(s, conv.id, closer, reported, "", iso(closeAt));

    // alerts for this conversation were handled by a supervisor
    s.alerts
      .filter((a) => a.conversation_id === conv.id)
      .forEach((a) => {
        const ack = new Date(a.created_at).getTime() + (2 + r() * 38) * MIN;
        const res = ack + (10 + r() * 110) * MIN;
        A.updateAlert(s, a.id, U(9), "acknowledge", iso(Math.min(ack, now)));
        A.updateAlert(s, a.id, U(9), "resolve", iso(Math.min(res, now)));
      });

    const validate = (days >= 3 && r() < 0.97) || (days < 3 && r() < 0.4);
    if (validate) {
      const vAt = Math.min(closeAt + (1 + r() * 20) * 3600000, now - 5 * MIN);
      A.validateOutcome(s, outcome.id, U(9), truth, "", iso(vAt));
    }
  }

  // ---------------------------------------------------------------- live conversations
  // [who, text, minutes since previous message]
  function live({ customerId, agentId, category, lastAgoMin, script }) {
    const customer = U(customerId);
    const total = script.reduce((sum, row) => sum + row[2], 0);
    let t = now - (total + lastAgoMin) * MIN;
    const first = script[0];
    const { conversation: conv } = A.createConversation(s, customer, { category, initial_message: first[1] }, iso(t));
    conv.agent_id = agentId;
    conv.team_id = U(agentId).team_id;
    script.slice(1).forEach(([who, text, gap]) => {
      t += gap * MIN;
      A.addMessage(s, conv.id, who === "c" ? customer : U(agentId), text, iso(t));
    });
    return conv;
  }

  // 1. just started
  live({
    customerId: 1, agentId: 5, category: "Billing", lastAgoMin: 6,
    script: [
      ["c", "Hi, I can't find my invoice for last month.", 0],
      ["a", "Hello! Happy to help. Can you share your account email?", 2],
    ],
  });
  // 2. four messages in, heated: the next message reaches the checkpoint
  live({
    customerId: 2, agentId: 5, category: "Billing", lastAgoMin: 3,
    script: [
      ["c", "I was charged twice for the same order and I'm really frustrated.", 0],
      ["a", "Sorry to hear that. Can you share your order number?", 14],
      ["c", "I already sent it twice. This is the second time and nobody has helped me.", 6],
      ["a", "We're looking into it now.", 55],
    ],
  });
  // 3. high risk, alert waiting for a supervisor
  live({
    customerId: 3, agentId: 5, category: "Account", lastAgoMin: 12,
    script: [
      ["c", "My account was locked and I'm furious. This is unacceptable.", 0],
      ["a", "Sorry about that. Let me check what happened.", 40],
      ["c", "Still nothing. I want a refund or I will cancel everything.", 9],
      ["a", "We understand your frustration.", 95],
      ["c", "Worst service ever. Get me a manager.", 7],
      ["a", "I've asked a senior colleague to join.", 30],
    ],
  });
  // 4. critical, already acknowledged
  live({
    customerId: 4, agentId: 6, category: "Billing", lastAgoMin: 25,
    script: [
      ["c", "Terrible. My card was charged and the order never arrived. I'm furious.", 0],
      ["a", "Sorry to hear that. Can you share the order number?", 70],
      ["c", "This is the third time. Useless support. I will cancel and tell everyone to avoid you.", 8],
      ["a", "We apologise. We're looking into it.", 150],
      ["c", "Still nothing. Worst experience ever. I'm done, give me a refund now.", 6],
      ["a", "I'm sorry about this.", 120],
      ["c", "Unacceptable. I'm disgusted. Cancel it all.", 5],
    ],
  });
  // 5. calm, five messages: low risk
  live({
    customerId: 1, agentId: 5, category: "Account", lastAgoMin: 40,
    script: [
      ["c", "Hi, how do I reset my password?", 0],
      ["a", "Hello! Go to Settings, then Account, then Reset password.", 2],
      ["c", "Great, that worked, thank you!", 3],
      ["a", "Glad to help. Anything else?", 1],
      ["c", "No, that's all. Perfect, thanks.", 2],
    ],
  });
  // 6. mixed: medium risk
  live({
    customerId: 2, agentId: 6, category: "Billing", lastAgoMin: 55,
    script: [
      ["c", "The app crashed during checkout and charged me twice.", 0],
      ["a", "Sorry about that. Can you send a screenshot of the charge?", 20],
      ["c", "OK, I sent the screenshot. Still waiting.", 12],
      ["a", "Thanks, we're checking with payments now.", 45],
      ["c", "Thanks, the refund arrived but it took too long.", 30],
    ],
  });
  // 7. technical team, two messages
  live({
    customerId: 3, agentId: 7, category: "Technical issue", lastAgoMin: 2,
    script: [
      ["c", "The export button on the reports page does nothing when I click it.", 0],
      ["a", "Thanks for flagging. Which browser are you using?", 4],
    ],
  });
  // 8. delivery, angry, alert open and acknowledged soon
  live({
    customerId: 4, agentId: 8, category: "Delivery", lastAgoMin: 18,
    script: [
      ["c", "My parcel is late again and nobody replies. This is ridiculous.", 0],
      ["a", "Sorry about the delay. Let me track it.", 85],
      ["c", "Still nothing. I'm tired of waiting and I want a refund.", 10],
      ["a", "The courier says tomorrow.", 120],
      ["c", "Still late. I will cancel if this is not fixed.", 8],
    ],
  });

  return s;
}
