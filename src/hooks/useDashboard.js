import { useQuery } from "@tanstack/react-query";
import * as dash from "../services/dashboardService.js";
import * as analytics from "../services/analyticsService.js";

const q = (key, fn, extra = {}) => useQuery({ queryKey: key, queryFn: fn, ...extra });

export const useSummary = () => q(["dashboard", "summary"], dash.summary);
export const useSentiment = (groupBy) => q(["dashboard", "sentiment", groupBy], () => dash.sentiment(groupBy));
export const useEscalations = (basis) => q(["dashboard", "escalations", basis], () => dash.escalations(basis));
export const useRiskDistribution = () => q(["dashboard", "risk"], dash.riskDistribution);
export const useResponseTime = () => q(["dashboard", "response"], dash.responseTime);
export const useAgents = () => q(["dashboard", "agents"], dash.agents);
export const useTeams = () => q(["dashboard", "teams"], dash.teams);
export const useTrajectory = (id) => q(["trajectory", id], () => analytics.trajectory(id), { enabled: Boolean(id) });
export const useThresholdSimulation = () => q(["analytics", "threshold"], analytics.thresholdSimulation);
export const useAlertEffectiveness = () => q(["analytics", "alerts"], analytics.alertEffectiveness);
