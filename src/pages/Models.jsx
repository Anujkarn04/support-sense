import PageHeader from "../components/common/PageHeader.jsx";
import ExperimentalBadge from "../components/ml/ExperimentalBadge.jsx";
import { EmptyState, QueryBoundary } from "../components/common/states.jsx";
import { useQuery } from "@tanstack/react-query";
import { models } from "../services/adminService.js";
import { percent } from "../utils/formatters.js";

const METRICS = [
  ["accuracy", "Accuracy"],
  ["precision", "Precision"],
  ["recall", "Recall"],
  ["f1", "F1"],
  ["roc_auc", "ROC AUC"],
];

export default function Models() {
  const q = useQuery({ queryKey: ["models"], queryFn: models });
  return (
    <>
      <PageHeader title="Models">The models behind sentiment and risk. Figures are read from the saved model file, not written by hand.</PageHeader>
      <div className="mx-5 mb-8 space-y-4 md:mx-8">
        <QueryBoundary query={q}>
          {({ items }) =>
            items.length === 0 ? <EmptyState title="No models registered">Register a model artifact on the backend to see it here.</EmptyState> : items.map((m) => (
              <section key={m.id} className="rounded-panel border border-line p-5" style={{ background: "var(--surface)" }}>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl capitalize">{m.kind} model</h2>
                  <span className="rounded border border-line px-2 py-0.5 text-sm capitalize">{m.status}</span>
                  {m.is_mock ? <span className="rounded border border-line px-2 py-0.5 text-sm">Simulated</span> : <ExperimentalBadge />}
                </div>
                <p className="mt-1 text-muted">{m.version}</p>
                {m.note && <p className="mt-2 max-w-3xl text-sm">{m.note}</p>}
                {m.metrics ? (
                  <>
                    <p className="mt-4 text-sm text-muted">Exploratory cross-validation on {m.training_rows} labelled conversations. This is not a production evaluation.</p>
                    <dl className="mt-2 grid gap-4 sm:grid-cols-5">
                      {METRICS.map(([k, l]) => m.metrics[k] != null && (
                        <div key={k}>
                          <dd className="font-display text-2xl">{percent(m.metrics[k])}</dd>
                          <dt className="text-sm text-muted">{l}</dt>
                        </div>
                      ))}
                    </dl>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted">No evaluation figures are available for this model.</p>
                )}
              </section>
            ))
          }
        </QueryBoundary>
      </div>
    </>
  );
}
