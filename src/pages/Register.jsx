import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext.jsx";
import { Logo } from "../components/common/Layout.jsx";

export default function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await register(form);
      nav(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-lg">SupportSense</span>
        </div>
        <h1 className="text-2xl">Create a customer account</h1>
        <p className="mt-1 text-sm text-muted">Agents and supervisors are added by an admin.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm">Name</label>
            <input id="name" className="field" value={form.name} onChange={set("name")} autoComplete="name" required />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm">Email</label>
            <input id="email" type="email" className="field" value={form.email} onChange={set("email")} autoComplete="email" required />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm">Password</label>
            <input id="password" type="password" className="field" value={form.password} onChange={set("password")} autoComplete="new-password" minLength={8} required />
            <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
          </div>
          {error && <p role="alert" className="text-sm">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>Create account</button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Already have an account? <Link className="underline underline-offset-2" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
