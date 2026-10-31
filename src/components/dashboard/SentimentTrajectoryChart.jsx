import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFrame, { ChartTooltip } from "../common/ChartFrame.jsx";
import { TREND_LABEL } from "../../utils/riskUtils.js";

/**
 * Customer negativity per customer message (Gap #2).
 * Solid vertical line: where the risk score was calculated.
 * Faint vertical lines: agent replies.
 */
export default function SentimentTrajectoryChart({ data, height = 220 }) {
  const rows = (data?.points || []).map((p) => ({ x: p.customer_index, value: p.negative_probability, seq: p.message_seq }));
  const n = rows.length;
  const trend = data?.trend;
  const note =
    trend && trend !== "insufficient"
      ? `${TREND_LABEL[trend]} across ${n} customer messages`
      : n > 0
        ? "Needs at least 3 customer messages to describe a trend"
        : undefined;

  return (
    <ChartFrame
      title="Customer negativity by message"
      note={note}
      height={height}
      empty={n === 0 ? "No customer messages yet" : null}
      columns={[
        { key: "x", label: "Customer message" },
        { key: "seq", label: "Position in chat" },
        { key: "value", label: "Negativity (0 to 100)", format: (v) => Math.round(v * 100) },
      ]}
      rows={rows}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[(min) => min - 0.5, (max) => max + 0.5]}
            ticks={rows.map((r) => r.x)}
            tickFormatter={(v) => `#${v}`}
            allowDecimals={false}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
          />
          <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => Math.round(v * 100)} width={34} axisLine={false} tickLine={false} />
          <ReferenceLine
            y={0.5}
            stroke="var(--faint)"
            strokeDasharray="4 4"
            label={{ value: "Model reads as negative above this line", position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }}
          />
          {(data?.agent_replies || []).map((r) => (
            <ReferenceLine key={r.message_seq} x={r.after_customer_index + 0.5} stroke="var(--line)" />
          ))}
          {data?.checkpoint_customer_index != null && (
            <ReferenceLine
              x={data.checkpoint_customer_index + 0.5}
              stroke="var(--ink)"
              strokeWidth={1.5}
              label={{ value: "Risk scored", position: "insideTopRight", fill: "var(--ink)", fontSize: 11 }}
            />
          )}
          <Tooltip
            content={<ChartTooltip labelFormat={(v) => `Customer message ${v}`} valueFormat={(v) => `${Math.round(v * 100)} out of 100`} />}
            cursor={{ stroke: "var(--faint)" }}
          />
          <Line
            dataKey="value"
            name="Negativity"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
