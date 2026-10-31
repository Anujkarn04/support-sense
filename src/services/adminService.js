import { get, post, request } from "./api.js";
export const riskConfig = () => get("/config/risk");
export const alertThresholds = () => get("/config/alert-thresholds");
export const saveAlertThresholds = (payload) => post("/config/alert-thresholds", payload);
export const models = () => get("/models");
export const users = () => get("/admin/users");
export const exportTraining = () => get("/admin/export/training");
export { request };
