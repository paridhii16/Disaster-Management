import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { riskColor } from "../utils/vulnerability";

function MetricBar({ label, value, max, color, suffix = "" }) {
  const pct = Math.min(100, (value / max) * 100).toFixed(1);
  const display =
    typeof value === "number"
      ? Number.isInteger(value)
        ? value.toLocaleString()
        : value.toFixed(2)
      : value;
  return (
    <div style={{ marginBottom: 13 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "var(--muted)",
          marginBottom: 5,
        }}
      >
        <span>{label}</span>
        <strong style={{ color: "var(--text)", fontWeight: 500 }}>
          {display}
          {suffix}
        </strong>
      </div>
      <div
        style={{
          height: 8,
          background: "rgba(255,255,255,.07)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          className="bar-fill"
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(6,11,22,.95)",
        border: "1px solid var(--border2)",
        borderRadius: 7,
        padding: "8px 13px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--text)", fontWeight: 500, marginBottom: 4 }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color || "var(--muted)" }}>
          {p.name}:{" "}
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

export default function ExposurePanel({ districts, selected }) {
  const d = selected;

  const stateAvg = useMemo(
    () => ({
      density: Math.round(
        districts.reduce((s, x) => s + x.density, 0) / districts.length,
      ),
      gddp_per_capita: Math.round(
        districts.reduce((s, x) => s + x.gddp_per_capita, 0) / districts.length,
      ),
      literacy_rate: (
        districts.reduce((s, x) => s + x.literacy_rate, 0) / districts.length
      ).toFixed(1),
      beds_per_1000: (
        districts.reduce((s, x) => s + x.beds_per_1000, 0) / districts.length
      ).toFixed(3),
    }),
    [districts],
  );

  const target = d || stateAvg;
  const title = d ? d.district : "State Average";

  const ruData = d
    ? [
        {
          name: "Rural",
          value: d.rural_pop,
          pct: d.rural_pct,
          fill: "#00c9a7",
        },
        {
          name: "Urban",
          value: d.urban_pop,
          pct: d.urban_pct,
          fill: "#4f7eff",
        },
      ]
    : districts.map((x) => ({
        name:
          x.district.length > 9 ? x.district.substring(0, 9) + "…" : x.district,
        fullDistrictName: x.district,
        Rural: x.rural_pct,
        Urban: x.urban_pct,
        ruralPop: x.rural_pop,
        urbanPop: x.urban_pop,
        totalPop: x.population,
      }));

  const gdpData = useMemo(
    () =>
      [...districts]
        .sort((a, b) => b.gddp_pct - a.gddp_pct)
        .map((x) => ({
          name:
            x.district.length > 10
              ? x.district.substring(0, 10) + "…"
              : x.district,
          value: x.gddp_pct,
          vuln: x.vulnerability,
          sel: d?.district === x.district,
        })),
    [districts, d],
  );

  const fmtPop = (n) =>
    n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${(n / 1000).toFixed(0)}k`;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        minWidth: 0,
      }}
    >
      {/* Exposure index bars */}
      <div className="card" style={{ padding: "18px 20px" }}>
        <div className="card-hd" style={{ marginBottom: 16 }}>
          Exposure Index
          <span
            style={{
              fontSize: 11.5,
              color: "var(--teal)",
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            — {title}
          </span>
        </div>
        <MetricBar
          label="Population Density (persons/km²)"
          value={Number(target.density)}
          max={1600}
          color="var(--red)"
          suffix=" /km²"
        />
        <MetricBar
          label="GDDP per Capita (₹k)"
          value={Math.round(Number(target.gddp_per_capita) / 1000)}
          max={500}
          color="var(--accent)"
          suffix="k"
        />
        <MetricBar
          label="Literacy Rate"
          value={Number(target.literacy_rate)}
          max={100}
          color="var(--teal)"
          suffix="%"
        />
        <MetricBar
          label="Hospital Beds per 1,000"
          value={Number(target.beds_per_1000)}
          max={2}
          color="var(--amber)"
        />
      </div>

      {/* Rural / Urban + GDDP */}
      <div style={{ display: "flex", gap: 18 }}>
        {/* Rural / Urban */}
        <div className="card" style={{ flex: 1, padding: "18px 20px" }}>
          <div className="card-hd" style={{ marginBottom: 14 }}>
            {d ? "Rural / Urban Population" : "Rural / Urban Split"}
            <span
              style={{
                fontSize: 11.5,
                color: "var(--teal)",
                fontWeight: 400,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {d ? d.district : "All Districts"}
            </span>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              {d ? (
                <BarChart
                  data={ruData}
                  layout="vertical"
                  margin={{ top: 10, right: 50, left: 14, bottom: 10 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: "#7585a8", fontSize: 11 }}
                    tickFormatter={fmtPop}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#7585a8", fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div
                          style={{
                            background: "rgba(6,11,22,.95)",
                            border: "1px solid var(--border2)",
                            borderRadius: 7,
                            padding: "8px 13px",
                            fontSize: 12,
                          }}
                        >
                          <div
                            style={{
                              color: payload[0].payload.fill,
                              fontWeight: 500,
                            }}
                          >
                            {payload[0].payload.name}
                          </div>
                          <div style={{ color: "var(--text)" }}>
                            {fmtPop(payload[0].value)} ({payload[0].payload.pct}
                            %)
                          </div>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={36}>
                    {ruData.map((e, i) => (
                      <Cell key={i} fill={e.fill} fillOpacity={0.78} />
                    ))}
                    <LabelList
                      dataKey="pct"
                      position="right"
                      formatter={(v) => `${v}%`}
                      style={{ fill: "#7585a8", fontSize: 12 }}
                    />
                  </Bar>
                </BarChart>
              ) : (
                <BarChart
                  data={ruData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 48 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#7585a8", fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: "#7585a8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: "rgba(6,11,22,.95)",
                            border: "1px solid var(--border2)",
                            borderRadius: 7,
                            padding: "10px 14px",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ color: "var(--text)", fontWeight: 500, marginBottom: 8 }}>
                            {data.fullDistrictName || data.name}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "#00c9a7", marginBottom: 3 }}>
                            <span>Rural ({data.Rural}%)</span>
                            <span style={{ fontWeight: 500 }}>{(data.ruralPop || 0).toLocaleString()}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "#4f7eff", marginBottom: 8 }}>
                            <span>Urban ({data.Urban}%)</span>
                            <span style={{ fontWeight: 500 }}>{(data.urbanPop || 0).toLocaleString()}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "var(--muted)", paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                            <span>Total Pop</span>
                            <span style={{ fontWeight: 500 }}>{(data.totalPop || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="Rural"
                    stackId="a"
                    fill="#00c9a7"
                    fillOpacity={0.72}
                  />
                  <Bar
                    dataKey="Urban"
                    stackId="a"
                    fill="#4f7eff"
                    fillOpacity={0.72}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          {!d && (
            <div
              style={{
                display: "flex",
                gap: 14,
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 8,
              }}
            >
              {[
                ["#00c9a7", "Rural"],
                ["#4f7eff", "Urban"],
              ].map(([bg, lbl]) => (
                <span
                  key={lbl}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      background: bg,
                      display: "inline-block",
                    }}
                  />
                  {lbl}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* GDDP contribution */}
        <div className="card" style={{ flex: 1.2, padding: "18px 20px" }}>
          <div className="card-hd" style={{ marginBottom: 14 }}>
            GDDP Share of State (%)
            <span
              style={{
                fontSize: 11.5,
                color: "var(--teal)",
                fontWeight: 400,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {d ? `${d.district}: ${d.gddp_pct}%` : "All Districts"}
            </span>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gdpData}
                margin={{ top: 4, right: 8, left: 0, bottom: 48 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#7585a8", fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#7585a8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={<DarkTooltip />}
                  formatter={(v) => [`${v}%`, "GDDP share"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                  {gdpData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.sel ? "#ffffff" : riskColor(entry.vuln, 0.75)}
                      fillOpacity={entry.sel ? 0.95 : 0.78}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
