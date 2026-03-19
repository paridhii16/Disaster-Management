import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";
import { fmtN } from "../utils/seir";

const COLORS = {
  S: "#4f7eff",
  E: "#f5a623",
  I: "#f05252",
  R: "#00c9a7",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(6,11,22,.97)",
        border: "1px solid rgba(80,130,255,.28)",
        borderRadius: 9,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,.5)",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 8 }}>
        Day {label}
      </div>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 3,
            color: p.color,
          }}
        >
          <span style={{ color: "var(--muted)" }}>
            {{
              S: "Susceptible",
              E: "Exposed",
              I: "Infectious",
              R: "Recovered",
            }[p.dataKey] || p.dataKey}
          </span>
          <span style={{ fontWeight: 600 }}>{fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function SEIRChart({
  series,
  population,
  diseaseLabel,
  diseaseColor,
}) {
  const peakI = useMemo(() => {
    let mx = { day: 0, I: 0 };
    series.forEach((pt) => {
      if (pt.I > mx.I) mx = pt;
    });
    return mx;
  }, [series]);

  const totalInfected = useMemo(() => {
    const last = series[series.length - 1];
    return last ? last.R + last.I : 0;
  }, [series]);

  // Sample every other day for performance if series is long
  const plotData = useMemo(
    () => series.filter((_, i) => series.length <= 120 || i % 2 === 0),
    [series],
  );

  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      {/* Header */}
      <div className="card-hd" style={{ marginBottom: 6 }}>
        SEIR Compartment Dynamics
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              padding: "3px 9px",
              borderRadius: 12,
              background: `${diseaseColor}22`,
              color: diseaseColor,
              border: `1px solid ${diseaseColor}44`,
              fontWeight: 500,
            }}
          >
            {diseaseLabel}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--muted)",
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            N = {fmtN(population)}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          {
            label: "Peak Infectious",
            value: fmtN(peakI.I),
            sub: "maximum active cases",
            color: COLORS.I,
          },
          {
            label: "Peak Day",
            value: `Day ${peakI.day}`,
            sub: "when infections max out",
            color: diseaseColor,
          },
          {
            label: "Total Affected",
            value: fmtN(totalInfected),
            sub: `${((totalInfected / population) * 100).toFixed(1)}% of population`,
            color: COLORS.E,
          },
        ].map(({ label, value, sub, color }) => (
          <div
            key={label}
            style={{
              background: "rgba(255,255,255,.03)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "11px 14px",
            }}
          >
            <div
              style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: "var(--head)",
                fontSize: 20,
                fontWeight: 600,
                color,
              }}
            >
              {value}
            </div>
            <div
              style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main SEIR area chart */}
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={plotData}
            margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
          >
            <defs>
              {Object.entries(COLORS).map(([k, c]) => (
                <linearGradient
                  key={k}
                  id={`grad-${k}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={c} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="rgba(80,130,255,.06)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#7585a8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `D${v}`}
              interval={Math.ceil(plotData.length / 8)}
            />
            <YAxis
              tick={{ fill: "#7585a8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmtN}
              width={46}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(v) =>
                ({
                  S: "Susceptible",
                  E: "Exposed",
                  I: "Infectious",
                  R: "Recovered",
                })[v] || v
              }
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
            />
            {peakI.day > 0 && (
              <ReferenceLine
                x={peakI.day}
                stroke="rgba(240,82,82,.45)"
                strokeDasharray="5 4"
                label={{
                  value: "Peak",
                  fill: "#f05252",
                  fontSize: 10,
                  position: "top",
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="S"
              stroke={COLORS.S}
              fill={`url(#grad-S)`}
              strokeWidth={1.8}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="E"
              stroke={COLORS.E}
              fill={`url(#grad-E)`}
              strokeWidth={1.8}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="I"
              stroke={COLORS.I}
              fill={`url(#grad-I)`}
              strokeWidth={2.2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="R"
              stroke={COLORS.R}
              fill={`url(#grad-R)`}
              strokeWidth={1.8}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
