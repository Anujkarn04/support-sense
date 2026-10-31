import { CircleMinus, CirclePlus } from "lucide-react";

/** Binary sentiment from the model; the percentage belongs to the label shown. */
export default function SentimentBadge({ sentiment, negativeProbability, className = "" }) {
  if (!sentiment) return <span className={`text-faint ${className}`}>Not scored</span>;
  const neg = sentiment === "negative";
  const p = neg ? negativeProbability : 1 - negativeProbability;
  const Icon = neg ? CircleMinus : CirclePlus;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <Icon size={14} aria-hidden="true" />
      <span>{neg ? "Negative" : "Positive"}</span>
      {p != null && <span className="text-muted">{Math.round(p * 100)}%</span>}
    </span>
  );
}
