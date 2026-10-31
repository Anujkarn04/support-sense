import { NavLink, Outlet } from "react-router-dom";
import { Activity, BarChart3, Bell, Cpu, FileCheck2, Inbox, LayoutDashboard, LogOut, MessagesSquare, Moon, Settings as Cog, Sun, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../realtime/RealtimeProvider.jsx";
import MockBanner from "../ml/MockBanner.jsx";
import ToastHost from "./ToastHost.jsx";

const NAV = {
  customer: [{ to: "/chat", label: "My conversations", icon: MessagesSquare }],
  agent: [{ to: "/agent", label: "My queue", icon: Inbox }],
  supervisor: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/conversations", label: "Conversations", icon: Users },
    { to: "/alerts", label: "Alerts", icon: Bell },
    { to: "/outcomes", label: "Outcomes", icon: FileCheck2 },
    { to: "/analytics/thresholds", label: "Alert tuning", icon: BarChart3 },
    { to: "/models", label: "Models", icon: Cpu },
  ],
};
NAV.admin = [...NAV.supervisor, { to: "/settings", label: "Settings", icon: Cog }];

const STATUS = {
  live: "Live",
  mock: "Live in this browser",
  connecting: "Reconnecting",
  offline: "Offline",
};

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("supportsense.theme");
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
    try {
      if (theme) localStorage.setItem("supportsense.theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const isDark = theme ? theme === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return [isDark, () => setTheme(isDark ? "light" : "dark")];
}

export function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--ink)" />
      <path d="M5 19 L11 19 L14 10 L18 24 L21 15 L27 15" fill="none" stroke="var(--paper)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { status } = useRealtime();
  const [dark, toggleTheme] = useTheme();
  const items = NAV[user.role] || [];

  return (
    <div className="flex min-h-full flex-col">
      <MockBanner />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex shrink-0 flex-col border-b border-line md:w-[232px] md:border-b-0 md:border-r" style={{ background: "var(--surface)" }}>
          <div className="flex items-center gap-2.5 px-4 py-3 md:py-5">
            <Logo />
            <span className="font-display text-lg">SupportSense</span>
          </div>
          <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2.5 rounded-panel px-3 py-2 text-sm ${isActive ? "font-medium" : "text-muted hover:text-ink"}`
                }
                style={({ isActive }) => (isActive ? { background: "var(--sunken)", color: "var(--ink)" } : undefined)}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden space-y-3 border-t border-line p-4 md:block">
            <p className="flex items-center gap-2 text-sm text-muted">
              <Activity size={14} aria-hidden="true" />
              {STATUS[status]}
            </p>
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-sm capitalize text-muted">{user.role}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-quiet flex-1 !px-2 !py-1.5 text-xs" onClick={toggleTheme} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
                {dark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
                {dark ? "Light" : "Dark"}
              </button>
              <button className="btn btn-quiet flex-1 !px-2 !py-1.5 text-xs" onClick={logout}>
                <LogOut size={14} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  );
}

/** Mobile gets sign-out inside the page header too, since the rail footer is hidden. */
export function MobileAccountBar() {
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-2 text-sm md:hidden">
      <span>{user.name}</span>
      <button className="btn btn-quiet !px-2 !py-1 text-xs" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
