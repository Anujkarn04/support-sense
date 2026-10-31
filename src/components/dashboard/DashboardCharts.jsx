import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFrame, { ChartTooltip } from "../common/ChartFrame.jsx";
import { QueryBoundary } from "../common/states.jsx";
import { useEscalations, useResponseTime, useRiskDistribution, useSentiment } from "../../hooks/useDashboard.js";
import { LEVEL_META } from "../../utils/riskUtils.js";
import { shortDate } from "../../utils/formatters.js";

const AXIS = { axisLine: { stroke: "var(--line)" }, tickLine: false };
const SERIES_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

export function SentimentOverTime() {
  const [group, setGroup] = useState("none");
  const query = useSentiment(group);
  return (
    <div>
      <div className="mb-2 flex gap-1" role="group" aria-label="Group sentiment by">
        {[
          ["none", "All customers"],
          ["team", "By team"],
        ].map(([k, label]) => (
          <button key={k} className={`btn !px-2.5 !py-1 text-xs ${group === k ? "btn-primary" : "btn-quiet"}`} onClick={() => setGroup(k)} aria-pressed={group === k}>
            {label}
          </button>
        ))}
      </div>
      <QueryBoundary query={query}>
        {({ series }) => {
          const rows = series[0].points.map((p, i) => {
            const row = { date: p.date };
            series.forEach((s) => (row[`s${s.key}`] = s.points[i].value));
            return row;
          });
          const has = rows.some((r) => series.some((s) => r[`s${s.key}`] != null));
          return (
            <ChartFrame
              title="Customer negativity over time"
              note="Average negativity of customer messages per day. Higher means more negative."
              height={240}
              empty={has ? null : "No customer messages in the last 14 days"}
              legend={series.map((s, i) => ({ label: s.name, color: SERIES_COLORS[i] }))}
              columns={[{ key: "date", label: "Day", format: shortDate }, ...series.map((s) => ({ key: `s${s.key}`, label: s.name, format: (v) => (v == null ? "no messages" : Math.round(v * 100)) }))]}
              rows={rows}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} interval={1} {...AXIS} />
                  <YAxis
                    domain={[(min) => Math.max(0, Math.floor((min - 0.05) * 10) / 10), (max) => Math.min(1, Math.ceil((max + 0.05) * 10) / 10)]}
                    tickFormatter={(v) => Math.round(v * 100)}
                    width={34}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine y={0.5} stroke="var(--faint)" strokeDasharray="4 4" />
                  <Tooltip content={<ChartTooltip labelFormat={shortDate} valueFormat={(v) => Math.round(v * 100)} />} cursor={{ stroke: "var(--faint)" }} />
                  {series.map((s, i) => (
                    <Line
                      key={s.key}
                      dataKey={`s${s.key}`}
                      name={s.name}
                      stroke={SERIES_COLORS[i]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: SERIES_COLORS[i], stroke: "var(--surface)", strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

export function EscalationsByDay({ basis }) {
  const query = useEscalations(basis);
  return (
    <QueryBoundary query={query}>
      {({ by_time }) => {
        const rows = by_time.map((d) => ({ date: d.date, resolved: d.closed - d.escalated, escalated: d.escalated, closed: d.closed }));
        const has = rows.some((r) => r.closed > 0);
        return (
          <ChartFrame
            title="Closed conversations per day"
            note={basis === "reported" ? "As reported by agents" : "Using validated outcomes only"}
            height={240}
            empty={has ? null : "No closed conversations in the last 14 days"}
            legend={[
              { label: "Resolved", color: "var(--series-1)" },
              { label: "Escalated", color: "var(--series-2)" },
            ]}
            columns={[
              { key: "date", label: "Day", format: shortDate },
              { key: "closed", label: "Closed" },
              { key: "resolved", label: "Resolved" },
              { key: "escalated", label: "Escalated" },
            ]}
            rows={rows}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} interval={1} {...AXIS} />
                <YAxis allowDecimals={false} width={28} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip labelFormat={shortDate} />} cursor={{ fill: "var(--sunken)" }} />
                <Bar dataKey="resolved" name="Resolved" stackId="a" fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} />
                <Bar dataKey="escalated" name="Escalated" stackId="a" fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        );
      }}
    </QueryBoundary>
  );
}

export function EscalationByCategory({ basis }) {
  const query = useEscalations(basis);
  return (
    <QueryBoundary query={query}>
      {({ by_category }) => {
        const rows = by_category.map((c) => ({ name: c.name, rate: c.closed ? c.escalated / c.closed : 0, label: `${c.escalated} of ${c.closed}`, escalated: c.escalated, closed: c.closed }));
        const has = rows.some((r) => r.closed > 0);
        return (
          <ChartFrame
            title="Escalation rate by category"
            note="Share of closed conversations that escalated"
            height={240}
            empty={has ? null : "No closed conversations yet"}
            columns={[
              { key: "name", label: "Category" },
              { key: "closed", label: "Closed" },
              { key: "escalated", label: "Escalated" },
              { key: "rate", label: "Rate", format: (v) => `${Math.round(v * 100)}%` },
            ]}
            rows={rows}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 70, bottom: 4, left: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} {...AXIS} />
                <YAxis type="category" dataKey="name" width={112} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip valueFormat={(v) => `${Math.round(v * 100)}%`} />} cursor={{ fill: "var(--sunken)" }} />
                <Bar dataKey="rate" name="Escalation rate" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                  <LabelList dataKey="label" position="right" fill="var(--muted)" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        );
      }}
    </QueryBoundary>
  );
}

export function RiskDistribution() {
  const query = useRiskDistribution();
  return (
    <QueryBoundary query={query}>
      {({ levels, unscored }) => {
        const rows = [
          ...levels.map((l) => ({ name: LEVEL_META[l.level].label, count: l.count, color: LEVEL_META[l.level].color })),
          { name: "Not scored yet", count: unscored, color: "var(--faint)" },
        ];
        return (
          <ChartFrame
            title="Open conversations by risk"
            note="Scored once, at the fifth message"
            height={240}
            columns={[
              { key: "name", label: "Risk" },
              { key: "count", label: "Open conversations" },
            ]}
            rows={rows}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...AXIS} />
                <YAxis type="category" dataKey="name" width={104} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--sunken)" }} />
                <Bar dataKey="count" name="Open conversations" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                  {rows.map((r) => (
                    <Cell key={r.name} fill={r.color} />
                  ))}
                  <LabelList dataKey="count" position="right" fill="var(--ink)" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        );
      }}
    </QueryBoundary>
  );
}

export function ResponseTimeChart() {
  const query = useResponseTime();
  return (
    <QueryBoundary query={query}>
      {({ points }) => {
        const rows = points.map((p) => ({ date: p.date, minutes: p.avg_s == null ? null : Math.round(p.avg_s / 60) }));
        const has = rows.some((r) => r.minutes != null);
        return (
          <ChartFrame
            title="Average agent reply time"
            note="Minutes between a message and the agent's reply"
            height={240}
            empty={has ? null : "No agent replies in the last 14 days"}
            columns={[
              { key: "date", label: "Day", format: shortDate },
              { key: "minutes", label: "Minutes", format: (v) => (v == null ? "no replies" : v) },
            ]}
            rows={rows}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} interval={1} {...AXIS} />
                <YAxis width={34} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip labelFormat={shortDate} valueFormat={(v) => `${v} min`} />} cursor={{ stroke: "var(--faint)" }} />
                <Line dataKey="minutes" name="Reply time" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 1.5 }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        );
      }}
    </QueryBoundary>
  );
}
