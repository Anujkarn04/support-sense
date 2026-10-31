import { get, patch, post } from "./api.js";
export const listAlerts = (filters) => get("/alerts", filters);
export const updateAlert = (id, action) => patch(`/alerts/${id}`, { action });
export const listOutcomes = (filters) => get("/outcomes", filters);
export const validateOutcome = (id, validated_outcome, note) => post(`/outcomes/${id}/validate`, { validated_outcome, note });
