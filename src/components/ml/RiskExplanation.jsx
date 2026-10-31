/** Renders only the reasons the ML layer returns. Shows nothing when there are none. */
export default function RiskExplanation({ reasons }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 font-medium">Why this score</h4>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
