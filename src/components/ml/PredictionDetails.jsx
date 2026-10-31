import { dateTime } from "../../utils/formatters.js";

/** "About this prediction": model version, the model's own caveats, and the reasons if provided. */
export default function PredictionDetails({ prediction }) {
  if (!prediction) return null;
  const rows = [
    ["Model", prediction.model_version],
    ["Scored", `${dateTime(prediction.predicted_at)} using the first ${prediction.checkpoint_messages} messages`],
    ["Predicts", prediction.label_interpretation],
    ["Model's own alert line", prediction.ml_threshold != null ? `${Math.round(prediction.ml_threshold * 100)}` : null],
  ].filter(([, v]) => v != null);
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {prediction.warnings?.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-muted">
          {prediction.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <p className="text-muted">The risk score is not a calibrated probability. Use it to rank conversations, not to quote a chance.</p>
    </div>
  );
}
