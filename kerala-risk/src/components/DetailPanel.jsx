import React from "react";
import { riskColor, riskTier } from "../utils/vulnerability";
import { evaluateFlags } from "../config/flagThresholds";
import RadarChart from "./RadarChart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

function MetricBar({ label, value, max, color, suffix = "" }) {
  const pct = Math.min(100, (value / max) * 100).toFixed(1);
  const display = Number.isInteger(value)
    ? value.toLocaleString()
    : Number(value).toFixed(2);
  return (
    <div style={{ marginBottom: 12 }}>
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

function SecLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: ".85px",
        color: "var(--muted)",
        margin: "18px 0 10px",
      }}
    >
      {children}
    </div>
  );
}

function RiskRing({ score }) {
  const circ = 163.4;
  const offset = circ - (score / 100) * circ;
  const color = riskColor(score);
  const { label, cls } = riskTier(score);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        marginBottom: 6,
      }}
    >
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle
          cx="42"
          cy="42"
          r="32"
          fill="none"
          stroke="rgba(255,255,255,.07)"
          strokeWidth="8"
        />
        <circle
          cx="42"
          cy="42"
          r="32"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 42 42)"
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>
          Vulnerability Score
        </div>
        <div
          style={{
            fontFamily: "var(--head)",
            fontSize: 38,
            fontWeight: 600,
            lineHeight: 1,
            color,
          }}
        >
          {score}
        </div>
        <div style={{ marginTop: 6 }}>
          <span
            className={cls}
            style={{
              display: "inline-block",
              padding: "3px 9px",
              borderRadius: 5,
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DetailPanel({ district, onClose }) {
  if (!district) return null;
  const d = district;

  const fmtPop = (n) =>
    n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${(n / 1000).toFixed(0)}k`;

  const ruData = [
    { name: "Rural", value: d.rural_pop, pct: d.rural_pct, fill: "#00c9a7" },
    { name: "Urban", value: d.urban_pop, pct: d.urban_pct, fill: "#4f7eff" },
  ];

  const tags = evaluateFlags(d);

  return (
    <div
      style={{
        position: "fixed",
        top: 58,
        right: 0,
        bottom: 0,
        width: 440,
        background: "var(--bg2)",
        borderLeft: "1px solid var(--border2)",
        overflowY: "auto",
        zIndex: 500,
        padding: "24px 22px",
      }}
      className="panel-open"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(255,255,255,.07)",
          border: "none",
          color: "var(--muted)",
          width: 32,
          height: 32,
          borderRadius: 7,
          cursor: "pointer",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ✕
      </button>

      <div
        style={{
          fontFamily: "var(--head)",
          fontSize: 22,
          fontWeight: 600,
          marginBottom: 3,
          paddingRight: 40,
        }}
      >
        {d.district}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
        Kerala · India
      </div>

      <RiskRing score={d.vulnerability} />

      <SecLabel>Socioeconomic & Healthcare Radar</SecLabel>
      <RadarChart district={d} size={370} />

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "16px 0",
        }}
      />

      <SecLabel>Exposure Metrics</SecLabel>
      <MetricBar
        label="Population Density (/km²)"
        value={d.density}
        max={1600}
        color="var(--red)"
        suffix=" /km²"
      />

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "16px 0",
        }}
      />

      <SecLabel>Vulnerability Metrics</SecLabel>
      <MetricBar
        label="GDDP per Capita (₹k)"
        value={Math.round(d.gddp_per_capita / 1000)}
        max={500}
        color="var(--accent)"
        suffix="k"
      />
      <MetricBar
        label="Literacy Rate"
        value={d.literacy_rate}
        max={100}
        color="var(--teal)"
        suffix="%"
      />
      <MetricBar
        label="Non-Workers Seeking Work"
        value={d.unemployment_proxy}
        max={80}
        color="var(--amber)"
        suffix="%"
      />
      <MetricBar
        label="Mobility Exposure Score"
        value={d.mobility_exposure_score || 0}
        max={100}
        color="var(--red)"
        suffix="/100"
      />

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "16px 0",
        }}
      />
      <SecLabel>Healthcare Capacity</SecLabel>
      <MetricBar
        label="Hospital Beds"
        value={d.hospital_beds}
        max={6000}
        color="var(--accent)"
      />
      <MetricBar
        label="Ventilators"
        value={d.ventilators}
        max={100}
        color="var(--amber)"
      />
      <MetricBar
        label="Beds per 1,000 population"
        value={d.beds_per_1000}
        max={2}
        color="var(--teal)"
      />

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "16px 0",
        }}
      />
      <SecLabel>Rural / Urban Population</SecLabel>
      <div style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ruData}
            layout="vertical"
            margin={{ top: 6, right: 56, left: 14, bottom: 6 }}
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
                      padding: "7px 12px",
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
                      {fmtPop(payload[0].value)} ({payload[0].payload.pct}%)
                    </div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={32}>
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
        </ResponsiveContainer>
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "16px 0",
        }}
      />

      <SecLabel>Key Flags</SecLabel>
      <div style={{ lineHeight: 2.4 }}>
        {tags.map(([label, cls], i) => (
          <span
            key={i}
            className={cls}
            style={{
              display: "inline-block",
              padding: "3px 9px",
              borderRadius: 5,
              fontSize: 11.5,
              fontWeight: 500,
              marginRight: 6,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
