import { get, patch, post } from "./api.js";
export const listConversations = (filters) => get("/conversations", filters);
export const getConversation = (id) => get(`/conversations/${id}`);
export const createConversation = (payload) => post("/conversations", payload);
export const reassignConversation = (id, agent_id) => patch(`/conversations/${id}`, { agent_id });
export const listMessages = (id, after_seq) => get(`/conversations/${id}/messages`, { after_seq });
export const sendMessage = (id, text) => post(`/conversations/${id}/messages`, { text });
export const listPredictions = (id) => get(`/conversations/${id}/predictions`);
export const closeConversation = (id, outcome, note) => post(`/conversations/${id}/close`, { outcome, note });
