export default function ExperimentalBadge({ children = "Experimental" }) {
  return (
    <span
      className="inline-flex items-center rounded border border-line px-1.5 py-0.5 text-xs text-muted"
      title="Trained on a small, selectively labelled set of conversations. Not validated for production use."
    >
      {children}
    </span>
  );
}
