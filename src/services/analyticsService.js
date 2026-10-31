import { get } from "./api.js";
export const trajectory = (conversationId) => get(`/analytics/sentiment-trajectory/${conversationId}`);
export const thresholdSimulation = () => get("/analytics/threshold-simulation");
export const alertEffectiveness = () => get("/analytics/alert-effectiveness");
