import React from "react";

const AXES = [
  { key: "literacy_rate", label: "Literacy", max: 100, invert: false },
  { key: "beds_per_1000", label: "Beds / 1k", max: 2, invert: false },
  { key: "gddp_per_capita", label: "GDP Index", max: 500000, invert: false },
  { key: "unemployment_proxy", label: "Low Unempl.", max: 80, invert: true },
  { key: "density", label: "Low Density", max: 1600, invert: true },
];

export default function RadarChart({ district, size = 300 }) {
  const N = AXES.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;
  const offset = -Math.PI / 2;
  const rings = [0.25, 0.5, 0.75, 1];

  const angle = (i) => offset + (i * (2 * Math.PI)) / N;
  const point = (r, i) => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ];

  const values = AXES.map((ax) => {
    const raw = Number(district[ax.key]) || 0;
    const norm = Math.min(1, Math.max(0, raw / ax.max));
    return ax.invert ? 1 - norm : norm;
  });

  const dataPoints = values.map((v, i) => point(R * v, i));
  const dataPath =
    dataPoints
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`,
      )
      .join(" ") + " Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", width: "100%" }}
    >
      {/* Grid rings */}
      {rings.map((r) => {
        const pts =
          AXES.map((_, i) => point(R * r, i))
            .map(
              ([x, y], i) =>
                `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`,
            )
            .join(" ") + " Z";
        return (
          <path
            key={r}
            d={pts}
            fill="none"
            stroke="rgba(79,126,255,.12)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis spokes */}
      {AXES.map((_, i) => {
        const [x, y] = point(R, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x.toFixed(1)}
            y2={y.toFixed(1)}
            stroke="rgba(79,126,255,.18)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill="rgba(79,126,255,.13)"
        stroke="rgba(79,126,255,.88)"
        strokeWidth="1.8"
      />

      {/* Dots */}
      {dataPoints.map(([x, y], i) => (
        <circle
          key={i}
          cx={x.toFixed(1)}
          cy={y.toFixed(1)}
          r="3.5"
          fill="#4f7eff"
        />
      ))}

      {/* Labels */}
      {AXES.map((ax, i) => {
        const labelR = R + 22;
        const [lx, ly] = point(labelR, i);
        return (
          <text
            key={i}
            x={lx.toFixed(1)}
            y={ly.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#7585a8"
            fontSize="11"
            fontFamily="DM Sans, sans-serif"
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}
