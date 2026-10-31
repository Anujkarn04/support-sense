import { useQuery } from "@tanstack/react-query";
import { riskConfig } from "../services/adminService.js";

/** Bands, checkpoint size, categories and the escalation definition all come from the backend. */
export function useRiskConfig() {
  return useQuery({ queryKey: ["config", "risk"], queryFn: riskConfig, staleTime: 5 * 60 * 1000 });
}
