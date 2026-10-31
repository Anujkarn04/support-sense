import { get } from "./api.js";
export const summary = () => get("/dashboard/summary");
export const sentiment = (group_by) => get("/dashboard/sentiment", { group_by });
export const escalations = (basis) => get("/dashboard/escalations", { basis });
export const riskDistribution = () => get("/dashboard/risk-distribution");
export const responseTime = () => get("/dashboard/response-time");
export const agents = () => get("/dashboard/agents");
export const teams = () => get("/dashboard/teams");
