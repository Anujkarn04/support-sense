import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RotateCcw } from "lucide-react";
import PageHeader from "../components/common/PageHeader.jsx";
import { QueryBoundary } from "../components/common/states.jsx";
import { exportTraining, alertThresholds, saveAlertThresholds, users } from "../services/adminService.js";
import { IS_MOCK } from "../services/api.js";
import { dateTime } from "../utils/formatters.js";

const FIELDS = [
  ["medium_min", "Medium risk starts at"],
  ["high_min", "High risk starts at"],
  ["critical_min", "Critical risk starts at"],
  ["alert_min", "Raise an alert at"],
];

function Thresholds() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["config", "thresholds"], queryFn: alertThresholds });
  const [vals, setVals] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (q.data) setVals(Object.fromEntries(FIELDS.map(([k]) => [k, Math.round(q.data.current[k] * 100)])));
  }, [q.data]);
  const m = useMutation({
    mutationFn: () => saveAlertThresholds(Object.fromEntries(FIELDS.map(([k]) => [k, Number(vals[k]) / 100]))),
    onSuccess: () => {
      setSaved(true);
      ["config", "dashboard", "analytics"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
  return (
    <QueryBoundary query={q}>
      {(d) =>
        vals && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(false);
              m.mutate();
            }}
          >
            <p className="max-w-2xl text-sm text-muted">Scores run from 0 to 100. These lines decide the risk label and when an alert is raised. Saving adds a new version, so past alerts keep the line that was active when they fired. Changes apply to conversations scored from now on.</p>
            <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
              {FIELDS.map(([k, l]) => (
                <div key={k}>
                  <label htmlFor={k} className="mb-1 block text-sm">{l}</label>
                  <input id={k} type="number" min="0" max="100" step="1" className="field" value={vals[k]} onChange={(e) => { setSaved(false); setVals({ ...vals, [k]: e.target.value }); }} />
                </div>
              ))}
            </div>
            {m.isError && <p role="alert" className="text-sm">{m.error.message}</p>}
            {saved && <p role="status" className="text-sm">Saved. New conversations use these lines.</p>}
            <button className="btn btn-primary" disabled={m.isPending}>Save alert lines</button>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">Version history ({d.history.length})</summary>
              <ul className="mt-2 space-y-1">
                {d.history.map((h) => (
                  <li key={h.id}>{dateTime(h.effective_from)}: medium {Math.round(h.medium_min * 100)}, high {Math.round(h.high_min * 100)}, critical {Math.round(h.critical_min * 100)}, alert {Math.round(h.alert_min * 100)}</li>
                ))}
              </ul>
            </details>
          </form>
        )
      }
    </QueryBoundary>
  );
}

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/x-ndjson" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const qc = useQueryClient();
  const u = useQuery({ queryKey: ["admin", "users"], queryFn: users });
  const exp = useMutation({
    mutationFn: exportTraining,
    onSuccess: (r) => download(r.filename, r.text),
  });
  const reset = async () => {
    const store = await import("../mock/store.js");
    store.resetDemo();
    qc.clear();
    window.location.assign("/login");
  };
  return (
    <>
      <PageHeader title="Settings">Alert lines, people, and training data.</PageHeader>
      <div className="mx-5 mb-10 space-y-12 md:mx-8">
        <section>
          <h2 className="mb-3 text-xl">Alert lines</h2>
          <Thresholds />
        </section>
        <section>
          <h2 className="mb-2 text-xl">Training data</h2>
          <p className="mb-3 max-w-2xl text-sm text-muted">Exports conversations whose outcome a supervisor has confirmed: the first five messages and the confirmed label, one per line. Predictions are never used as labels.</p>
          <button className="btn btn-quiet" onClick={() => exp.mutate()} disabled={exp.isPending}>
            <Download size={16} aria-hidden="true" />
            Download training export
          </button>
          {exp.isSuccess && <p role="status" className="mt-2 text-sm">Exported {exp.data.count} conversations.</p>}
          {exp.isError && <p role="alert" className="mt-2 text-sm">{exp.error.message}</p>}
        </section>
        <section>
          <h2 className="mb-3 text-xl">People</h2>
          <QueryBoundary query={u}>
            {({ items }) => (
              <div className="overflow-x-auto rounded-panel border border-line" style={{ background: "var(--surface)" }}>
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead style={{ background: "var(--sunken)" }}>
                    <tr>{["Name", "Email", "Role", "Team"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id} className="table-row">
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2">{p.email}</td>
                        <td className="px-3 py-2 capitalize">{p.role}</td>
                        <td className="px-3 py-2">{p.team || "none"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </QueryBoundary>
        </section>
        {IS_MOCK && (
          <section>
            <h2 className="mb-2 text-xl">Demo data</h2>
            <p className="mb-3 max-w-2xl text-sm text-muted">Demo data lives in this browser. Reset it to return to the original set of conversations.</p>
            <button className="btn btn-quiet" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Reset demo data
            </button>
          </section>
        )}
      </div>
    </>
  );
}
