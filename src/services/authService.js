import { get, post } from "./api.js";
export const login = (email, password) => post("/auth/login", { email, password });
export const register = (payload) => post("/auth/register", payload);
export const me = () => get("/auth/me");
export const health = () => get("/health");
