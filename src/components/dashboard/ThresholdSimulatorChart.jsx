import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFrame, { ChartTooltip } from "../common/ChartFrame.jsx";

const SERIES = [
  { key: "precision", name: "Precision", color: "var(--series-1)" },
  { key: "recall", name: "Recall", color: "var(--series-2)" },
  { key: "f1", name: "F1", color: "var(--series-3)" },
];
const pct = (v) => (v == null ? "none" : `${Math.round(v * 100)}%`);

/** Precision, recall and F1 as the alert line moves (Gap #6). Computed from validated outcomes only. */
export default function ThresholdSimulatorChart({ sim, showOffline }) {
  const rows = sim.points.map((p) => ({ ...p, t: p.threshold }));
  const offline = sim.offline_reference?.points.map((p) => ({ ...p, t: p.threshold })) || [];
  const last = rows.length - 1;

  const legend = SERIES.map((s) => ({ label: s.name, color: s.color }));
  if (showOffline) legend.push({ label: "Dashed: offline cross-validation", color: "var(--muted)", dashed: true });

  return (
    <ChartFrame
      title="What each alert line would have caught"
      note={`Based on ${sim.n} conversations with a validated outcome, ${sim.positives} of them escalated`}
      height={300}
      legend={legend}
      columns={[
        { key: "t", label: "Alert line", format: (v) => Math.round(v * 100) },
        { key: "alerts", label: "Alerts raised" },
        { key: "tp", label: "Escalations caught" },
        { key: "fn", label: "Escalations missed" },
        { key: "fp", label: "False alarms" },
        { key: "precision", label: "Precision", format: pct },
        { key: "recall", label: "Recall", format: pct },
        { key: "f1", label: "F1", format: pct },
      ]}
      rows={rows}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 64, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={[0.3, 0.9]}
            ticks={[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]}
            tickFormatter={(v) => Math.round(v * 100)}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
          />
          <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={44} axisLine={false} tickLine={false} />
          <ReferenceLine
            x={sim.current_threshold}
            stroke="var(--ink)"
            strokeWidth={1.5}
            label={{ value: `Current line ${Math.round(sim.current_threshold * 100)}`, position: "insideTopRight", fill: "var(--ink)", fontSize: 11 }}
          />
          <Tooltip
            content={<ChartTooltip labelFormat={(v) => `Alert line ${Math.round(v * 100)}`} valueFormat={(v) => pct(v)} />}
            cursor={{ stroke: "var(--faint)" }}
          />
          {showOffline &&
            SERIES.map((s) => (
              <Line
                key={`off-${s.key}`}
                data={offline}
                dataKey={s.key}
                name={`${s.name} (offline)`}
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeOpacity={0.6}
                dot={false}
                isAnimationActive={false}
                legendType="none"
              />
            ))}
          {SERIES.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, stroke: "var(--surface)", strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
              connectNulls={false}
              label={(p) =>
                p.index === last && p.value != null ? (
                  <text key={`l-${s.key}`} x={p.x + 8} y={p.y + 4} fill="var(--ink)" fontSize="12">
                    {s.name}
                  </text>
                ) : null
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
