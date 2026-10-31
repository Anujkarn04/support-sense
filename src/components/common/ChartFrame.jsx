import { useState } from "react";
import { Table2, BarChart3 } from "lucide-react";

/**
 * Wraps every chart: title, legend (>=2 series), and a table view so the data
 * is never available only through colour.
 */
export default function ChartFrame({ title, note, legend, columns, rows, height = 240, children, empty }) {
  const [view, setView] = useState("chart");
  const hasRows = rows && rows.length > 0;
  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg">{title}</h3>
          {note && <p className="text-sm text-muted">{note}</p>}
        </div>
        {columns && (
          <button
            className="btn btn-quiet shrink-0 !px-2.5 !py-1 text-xs"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            aria-pressed={view === "table"}
          >
            {view === "chart" ? <Table2 size={14} aria-hidden="true" /> : <BarChart3 size={14} aria-hidden="true" />}
            {view === "chart" ? "View as table" : "View as chart"}
          </button>
        )}
      </div>

      {legend && legend.length > 1 && view === "chart" && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <svg width="16" height="8" aria-hidden="true">
                {l.dashed ? (
                  <line x1="0" x2="16" y1="4" y2="4" stroke={l.color} strokeWidth="2" strokeDasharray="4 3" />
                ) : (
                  <rect width="16" height="8" rx="2" fill={l.color} />
                )}
              </svg>
              {l.label}
            </li>
          ))}
        </ul>
      )}

      {empty ? (
        <div className="flex items-center justify-center rounded-panel border border-dashed border-line text-sm text-muted" style={{ height }}>
          {empty}
        </div>
      ) : view === "chart" ? (
        <div style={{ height }}>{children}</div>
      ) : (
        <div className="max-h-[320px] overflow-auto rounded-panel border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0" style={{ background: "var(--sunken)" }}>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-1.5 font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasRows &&
                rows.map((r, i) => (
                  <tr key={i} className="table-row">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-1.5">
                        {c.format ? c.format(r[c.key], r) : r[c.key] ?? "none"}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Shared tooltip look for Recharts. */
export function ChartTooltip({ active, payload, label, labelFormat, valueFormat }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-panel border border-line px-3 py-2 text-sm" style={{ background: "var(--surface)" }}>
      <p className="mb-1 font-medium">{labelFormat ? labelFormat(label) : label}</p>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <p key={p.dataKey} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color || p.stroke }} aria-hidden="true" />
            <span className="text-muted">{p.name}</span>
            <span>{valueFormat ? valueFormat(p.value, p) : p.value}</span>
          </p>
        ))}
    </div>
  );
}
