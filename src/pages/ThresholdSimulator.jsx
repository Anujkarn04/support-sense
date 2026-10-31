import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader.jsx";
import ThresholdSimulatorChart from "../components/dashboard/ThresholdSimulatorChart.jsx";
import AlertEffectivenessPanel from "../components/dashboard/AlertEffectivenessPanel.jsx";
import { EmptyState, ErrorState, QueryBoundary, Spinner } from "../components/common/states.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAlertEffectiveness, useThresholdSimulation } from "../hooks/useDashboard.js";
import { percent } from "../utils/formatters.js";

function Summary({ sim }) {
  const nearest = sim.points.reduce((best, p) => (Math.abs(p.threshold - sim.current_threshold) < Math.abs(best.threshold - sim.current_threshold) ? p : best), sim.points[0]);
  const exact = Math.abs(nearest.threshold - sim.current_threshold) < 0.001;
  return (
    <p className="max-w-3xl">
      {exact ? "At the current alert line" : `At ${Math.round(nearest.threshold * 100)}, the closest tested line to the current ${Math.round(sim.current_threshold * 100)}`} ({Math.round(nearest.threshold * 100)}), the system would have raised <strong>{nearest.alerts} alerts</strong> across {sim.n} validated conversations. They caught <strong>{nearest.tp} of {sim.positives}</strong> escalations and {nearest.fp} were false alarms
      {nearest.precision != null && <>, so {percent(nearest.precision)} of alerts were worth a supervisor's time</>}. {nearest.fn} escalations were missed.
    </p>
  );
}

export default function ThresholdSimulator() {
  const { user } = useAuth();
  const sim = useThresholdSimulation();
  const eff = useAlertEffectiveness();
  const [offline, setOffline] = useState(false);
  return (
    <>
      <PageHeader title="Alert tuning">See what each alert line would have caught and what it would have cost in false alarms, using conversations whose outcome a supervisor has confirmed.</PageHeader>
      <div className="mx-5 mb-8 space-y-10 md:mx-8">
        {sim.isLoading ? <Spinner /> : sim.isError ? <ErrorState error={sim.error} onRetry={() => sim.refetch()} /> : sim.data.status === "insufficient_data" ? (
          <div className="rounded-panel border border-line" style={{ background: "var(--surface)" }}>
            <EmptyState title="Not enough validated outcomes yet">
              This chart needs at least {sim.data.min_required} conversations with a confirmed outcome, and there are {sim.data.n}. <Link className="underline underline-offset-2" to="/outcomes">Validate closed conversations</Link> to unlock it. A chart drawn from fewer would be noise.
            </EmptyState>
          </div>
        ) : (
          <section className="space-y-4">
            <Summary sim={sim.data} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} />
              Compare with the ML team's offline test ({sim.data.offline_reference.label})
            </label>
            <ThresholdSimulatorChart sim={sim.data} showOffline={offline} />
            <p className="max-w-3xl text-sm text-muted">
              Precision is the share of alerts that were followed by an escalation. Recall is the share of escalations that raised an alert. Moving the line right means fewer, surer alerts and more missed escalations. {user.role === "admin" ? <><Link className="underline underline-offset-2" to="/settings">Change the alert line in Settings.</Link></> : "An admin can change the alert line in Settings."}
            </p>
          </section>
        )}
        <section>
          <h2 className="mb-4 text-xl">How alerts are being handled</h2>
          <QueryBoundary query={eff}>{(d) => <AlertEffectivenessPanel data={d} />}</QueryBoundary>
        </section>
      </div>
    </>
  );
}
