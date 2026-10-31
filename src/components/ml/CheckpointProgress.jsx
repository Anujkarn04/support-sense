/** Before message 5 there is no risk score yet. Say so instead of showing a fake number. */
export default function CheckpointProgress({ seen, needed = 5, compact = false }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted" role="img" aria-label={`Collecting messages for risk scoring: ${seen} of ${needed}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: needed }, (_, i) => (
          <span key={i} className="h-1.5 w-3.5 rounded-sm" style={{ background: i < seen ? "var(--ink)" : "var(--line)" }} />
        ))}
      </span>
      {!compact && <span className="text-sm">Collecting {seen} of {needed} messages</span>}
      {compact && <span className="text-xs">{seen}/{needed}</span>}
    </span>
  );
}
