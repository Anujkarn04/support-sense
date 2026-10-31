import { FlaskConical } from "lucide-react";
import { useRiskConfig } from "../../hooks/useRiskConfig.js";

/** Shown whenever the numbers are simulated. Never present mock output as real. */
export default function MockBanner() {
  const { data } = useRiskConfig();
  if (!data?.ml?.is_mock) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 px-4 py-1.5 text-center text-sm" style={{ background: "var(--ink)", color: "var(--paper)" }}>
      <FlaskConical size={15} aria-hidden="true" />
      <span>Demo mode. Every score and conversation here is simulated in your browser. None of it comes from the trained model.</span>
    </div>
  );
}
