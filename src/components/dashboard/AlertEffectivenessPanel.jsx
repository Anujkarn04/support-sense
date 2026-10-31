import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFrame, { ChartTooltip } from "../common/ChartFrame.jsx";
import { duration, percent, shortDate } from "../../utils/formatters.js";

/** Are alerts useful, and are people reacting to them? Derived from alerts joined with validated outcomes. */
export default function AlertEffectivenessPanel({ data }) {
  const rows = data.series.map((d) => ({
    date: d.date,
    confirmed: d.true_positive,
    notEscalated: d.false_positive,
    awaiting: Math.max(0, d.alerts - d.true_positive - d.false_positive),
    alerts: d.alerts,
  }));
  const has = rows.some((r) => r.alerts > 0);
  const figures = [
    ["Alerts raised", data.total_alerts],
    ["Waiting for acknowledgement", data.unacknowledged],
    ["Average time to acknowledge", duration(data.avg_time_to_ack_s)],
    ["Average time to resolve", duration(data.avg_time_to_resolve_s)],
    ["Alerts that were followed by an escalation", data.precision == null ? "none yet" : `${percent(data.precision)} of ${data.matched_n}`],
  ];
  return (
    <div className="space-y-5">
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
        {figures.map(([k, v]) => (
          <div key={k}>
            <dd className="font-display text-2xl">{v}</dd>
            <dt className="text-sm text-muted">{k}</dt>
          </div>
        ))}
      </dl>
      <ChartFrame
        title="Alerts per day and how they turned out"
        note="Only conversations with a validated outcome count as confirmed or not escalated"
        height={230}
        empty={has ? null : "No alerts in the last 14 days"}
        legend={[
          { label: "Followed by an escalation", color: "var(--series-1)" },
          { label: "Not escalated", color: "var(--series-2)" },
          { label: "Outcome not validated yet", color: "var(--faint)" },
        ]}
        columns={[
          { key: "date", label: "Day", format: shortDate },
          { key: "alerts", label: "Alerts" },
          { key: "confirmed", label: "Followed by an escalation" },
          { key: "notEscalated", label: "Not escalated" },
          { key: "awaiting", label: "Not validated yet" },
        ]}
        rows={rows}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} interval={1} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
            <YAxis allowDecimals={false} width={28} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip labelFormat={shortDate} />} cursor={{ fill: "var(--sunken)" }} />
            <Bar dataKey="confirmed" name="Followed by an escalation" stackId="a" fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} />
            <Bar dataKey="notEscalated" name="Not escalated" stackId="a" fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} />
            <Bar dataKey="awaiting" name="Not validated yet" stackId="a" fill="var(--faint)" stroke="var(--surface)" strokeWidth={2} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
