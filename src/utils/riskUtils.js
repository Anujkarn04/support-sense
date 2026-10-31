// Risk levels are decided by the backend from configurable bands (GET /config/risk).
// The frontend never compares a score to a number; it only maps a level to a look.
import { Circle, Diamond, Octagon, Triangle } from "lucide-react";

export const LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const LEVEL_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

export const LEVEL_META = {
  LOW: { label: "Low", color: "var(--risk-low)", Icon: Circle },
  MEDIUM: { label: "Medium", color: "var(--risk-medium)", Icon: Triangle },
  HIGH: { label: "High", color: "var(--risk-high)", Icon: Diamond },
  CRITICAL: { label: "Critical", color: "var(--risk-critical)", Icon: Octagon },
};

export const isElevated = (level) => level === "HIGH" || level === "CRITICAL";

/** Sort key for "who needs attention first": open alert, then level, then score. */
export function attentionRank(c) {
  const p = c.prediction && c.prediction.status === "ok" ? c.prediction : null;
  const unacked = c.open_alert && !c.open_alert.acknowledged_at ? 1 : 0;
  return unacked * 10 + (p ? LEVEL_ORDER[p.risk_level] * 1 + p.risk_score * 0.5 : -1);
}

export const TREND_LABEL = {
  declining: "Getting more negative",
  stable: "Steady",
  improving: "Getting less negative",
  insufficient: "Not enough messages yet",
};
