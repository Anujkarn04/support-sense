import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext.jsx";
import { IS_MOCK } from "../services/api.js";
import { Logo } from "../components/common/Layout.jsx";

const DEMO = [
  { email: "maya@demo.test", label: "Customer", name: "Maya Rao" },
  { email: "ravi@demo.test", label: "Agent", name: "Ravi Menon" },
  { email: "priya@demo.test", label: "Supervisor", name: "Priya Nair" },
  { email: "anuj@demo.test", label: "Admin", name: "Anuj Admin" },
];

/** The login page opens with the thing the product is about: a conversation turning sour, and the point where it gets scored. */
function Trajectory() {
  const pts = [0.28, 0.34, 0.52, 0.66, 0.81];
  const W = 420;
  const H = 190;
  const x = (i) => 30 + (i * (W - 70)) / 4;
  const y = (v) => 14 + (1 - v) * (H - 44);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" role="img" aria-label="Example of customer negativity rising across five messages, with a risk score calculated at the fifth">
      <line x1="30" x2={W - 20} y1={y(0.5)} y2={y(0.5)} stroke="var(--line)" strokeDasharray="4 4" />
      <line x1={x(4)} x2={x(4)} y1="8" y2={H - 28} stroke="var(--ink)" strokeWidth="1.5" />
      <polyline points={pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="5" fill="var(--ink)" stroke="var(--paper)" strokeWidth="2.5" />
      ))}
      <circle cx={x(4)} cy={y(pts[4])} r="9" fill="none" stroke="var(--risk-critical)" strokeWidth="2.5" />
      {pts.map((_, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">
          {i + 1}
        </text>
      ))}
      <text x={x(4) - 10} y="20" textAnchor="end" fontSize="12" fill="var(--ink)">
        Risk scored at message 5
      </text>
    </svg>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e, creds) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(creds?.email ?? email, creds?.password ?? password);
      nav(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-center gap-8 px-8 py-12 lg:px-16">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-display text-xl">SupportSense</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl leading-tight">Spot the conversations that are heading for escalation.</h1>
          <p className="mt-3 max-w-md text-muted">Customer sentiment updates with every message. A risk score arrives at the fifth, so a supervisor can step in while there is still time.</p>
        </div>
        <Trajectory />
      </section>

      <section className="flex items-center justify-center border-line px-6 py-12 lg:border-l" style={{ background: "var(--surface)" }}>
        <div className="w-full max-w-sm">
          <h2 className="text-2xl">Sign in</h2>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm">Email</label>
              <input id="email" className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm">Password</label>
              <input id="password" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p role="alert" className="text-sm">{error}</p>}
            <button className="btn btn-primary w-full" disabled={busy}>Sign in</button>
          </form>
          <p className="mt-4 text-sm text-muted">
            New customer? <Link className="underline underline-offset-2" to="/register">Create an account</Link>
          </p>

          {IS_MOCK && (
            <div className="mt-8 border-t border-line pt-5">
              <p className="mb-1 font-medium">Try the demo</p>
              <p className="mb-3 text-sm text-muted">Demo mode runs entirely in your browser. Pick a role to sign in without a password.</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button key={d.email} className="btn btn-quiet flex-col !items-start !gap-0 text-left" disabled={busy} onClick={() => submit(null, { email: d.email, password: "demo" })}>
                    <span>{d.label}</span>
                    <span className="text-xs font-normal text-muted">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
