import React, { useState, useRef, useEffect, useCallback } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { riskColor } from "../utils/vulnerability";

const GEOJSON_URL =
  "https://raw.githubusercontent.com/geohacker/kerala/master/geojsons/district.geojson";

const GEOJSON_TO_CSV = {
  Alappuzha: "Alappuzha",
  Ernakulam: "Ernakulam",
  Idukki: "Idukki",
  Kannur: "Kannur",
  Kasaragod: "Kasaragod",
  Kollam: "Kollam",
  Kottayam: "Kottayam",
  Kozhikode: "Kozhikode",
  Malappuram: "Malappuram",
  Palakkad: "Palakkad",
  Pathanamthitta: "Pathanamthitta",
  Thiruvananthapuram: "Thiruvananthapuram",
  Thrissur: "Thrissur",
  Wayanad: "Wayanad",
};

const SHORT_NAMES = {
  Thiruvananthapuram: "Trivandrum",
  Pathanamthitta: "P.Thitta",
};

const METRIC_OPTIONS = [
  {
    value: "vulnerability",
    label: "Vulnerability Score",
    max: 100,
    higherBad: true,
  },
  {
    value: "mobility_exposure_score",
    label: "Mobility Exposure Score",
    max: 100,
    higherBad: true,
  },
  { value: "density", label: "Population Density", max: 1600, higherBad: true },
  {
    value: "beds_per_1000",
    label: "Hospital Beds / 1k",
    max: 2,
    higherBad: false,
  },
  {
    value: "gddp_per_capita",
    label: "GDDP per Capita (₹)",
    max: 500000,
    higherBad: false,
  },
  {
    value: "literacy_rate",
    label: "Literacy Rate",
    max: 100,
    higherBad: false,
  },
];

function getColor(d, metric) {
  if (!d) return "rgba(80,100,140,0.35)";
  const cfg = METRIC_OPTIONS.find((m) => m.value === metric);
  const norm = Math.min(1, Math.max(0, d[metric] / cfg.max));

  if (metric === "mobility_exposure_score") {
    const start = { r: 245, g: 166, b: 35 }; // yellow/amber
    const end = { r: 240, g: 82, b: 82 }; // red
    const r = Math.round(start.r + (end.r - start.r) * norm);
    const g = Math.round(start.g + (end.g - start.g) * norm);
    const b = Math.round(start.b + (end.b - start.b) * norm);
    return `rgba(${r},${g},${b},0.84)`;
  }

  const score = cfg.higherBad ? norm * 100 : (1 - norm) * 100;
  return riskColor(score, 0.84);
}

export default function KeralaMap({ districts, selectedDistrict, onSelect }) {
  const [pathData, setPathData] = useState([]);
  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [metric, setMetric] = useState("vulnerability");
  const [tooltip, setTooltip] = useState(null);
  const wrapRef = useRef(null);

  // Map SVG dimensions — taller viewBox for a larger rendered map
  const VW = 460,
    VH = 880;

  useEffect(() => {
    setGeoLoading(true);
    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} fetching GeoJSON`);
        return r.json();
      })
      .then((gj) => {
        const projection = geoMercator().fitExtent(
          [
            [24, 24],
            [VW - 24, VH - 24],
          ],
          gj,
        );
        const pathGen = geoPath().projection(projection);

        const paths = gj.features.map((feature) => {
          const geoName = feature.properties.DISTRICT;
          const csvName = GEOJSON_TO_CSV[geoName] || geoName;
          const centroid = pathGen.centroid(feature);
          return {
            geoName,
            csvName,
            d: pathGen(feature),
            cx: isNaN(centroid[0]) ? 0 : centroid[0],
            cy: isNaN(centroid[1]) ? 0 : centroid[1],
          };
        });

        setPathData(paths);
        setGeoLoading(false);
      })
      .catch((err) => {
        console.error("GeoJSON load failed:", err);
        setGeoError(err.message);
        setGeoLoading(false);
      });
  }, []);

  const byName = useCallback(
    (csvName) => districts.find((d) => d.district === csvName),
    [districts],
  );

  function handleMouseEnter(e, item) {
    const d = byName(item.csvName);
    if (!d) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTooltip({
      x: Math.min(e.clientX - rect.left + 16, rect.width - 210),
      y: Math.max(0, e.clientY - rect.top - 16),
      d,
    });
  }

  function handleMouseMove(e) {
    if (!tooltip) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTooltip((t) =>
      t
        ? {
            ...t,
            x: Math.min(e.clientX - rect.left + 16, rect.width - 210),
            y: Math.max(0, e.clientY - rect.top - 16),
          }
        : null,
    );
  }

  const cfg = METRIC_OPTIONS.find((m) => m.value === metric);

  return (
    <div className="card" style={{ flex: "0 0 480px", padding: 16 }}>
      {/* Header */}
      <div className="card-hd" style={{ marginBottom: 14 }}>
        District Vulnerability Map
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          style={{ fontSize: 12, padding: "5px 10px" }}
        >
          {METRIC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Map container */}
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#0c1625 0%,#081020 100%)",
          borderRadius: 10,
          overflow: "hidden",
          minHeight: 480,
        }}
      >
        {/* Loading */}
        {geoLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              color: "var(--muted)",
            }}
          >
            <svg width="38" height="38" viewBox="0 0 38 38">
              <circle
                cx="19"
                cy="19"
                r="14"
                fill="none"
                stroke="var(--border2)"
                strokeWidth="3"
              />
              <circle
                cx="19"
                cy="19"
                r="14"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeDasharray="20 66"
                strokeLinecap="round"
                transform="rotate(-90 19 19)"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="-90 19 19"
                  to="270 19 19"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
            <span style={{ fontSize: 12 }}>Loading map boundaries…</span>
          </div>
        )}

        {/* Error */}
        {geoError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: "var(--muted)",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 26, color: "var(--red)" }}>⚠</div>
            <div style={{ fontSize: 13, color: "var(--text)" }}>
              Could not load GeoJSON
            </div>
            <div style={{ fontSize: 11.5 }}>{geoError}</div>
          </div>
        )}

        {/* SVG Map */}
        {!geoLoading && !geoError && (
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ display: "block", width: "100%" }}
          >
            <text
              x="20"
              y="22"
              fill="rgba(79,126,255,.45)"
              fontSize="11"
              fontFamily="Space Grotesk, sans-serif"
              letterSpacing="2"
            >
              KERALA
            </text>

            {/* District polygons */}
            <g>
              {pathData.map((item) => {
                const d = byName(item.csvName);
                const sel = selectedDistrict?.district === item.csvName;
                return (
                  <path
                    key={item.csvName}
                    d={item.d}
                    fill={getColor(d, metric)}
                    stroke={sel ? "#ffffff" : "rgba(0,0,0,.45)"}
                    strokeWidth={sel ? 2.5 : 1}
                    strokeLinejoin="round"
                    style={{
                      cursor: "pointer",
                      transition: "opacity .15s, filter .15s",
                      filter: sel ? "brightness(1.35)" : undefined,
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, item)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => onSelect(d || null)}
                  />
                );
              })}
            </g>

            {/* Labels — name + vulnerability score */}
            <g pointerEvents="none">
              {pathData.map((item) => {
                const d = byName(item.csvName);
                if (!item.cx || !item.cy) return null;
                const label = SHORT_NAMES[item.csvName] || item.csvName;
                return (
                  <g key={item.csvName + "_lbl"}>
                    <text
                      x={item.cx}
                      y={item.cy - 3}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgba(255,255,255,.92)"
                      fontSize="9.5"
                      fontFamily="DM Sans, sans-serif"
                      fontWeight="500"
                    >
                      {label}
                    </text>
                    {d && (
                      <text
                        x={item.cx}
                        y={item.cy + 11}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="rgba(255,255,255,.55)"
                        fontSize="8"
                        fontFamily="Space Grotesk, sans-serif"
                      >
                        {d.vulnerability}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y,
              background: "rgba(6,11,22,.97)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              padding: "12px 15px",
              fontSize: 12.5,
              pointerEvents: "none",
              zIndex: 99,
              minWidth: 190,
              boxShadow: "0 10px 28px rgba(0,0,0,.55)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--head)",
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {tooltip.d.district}
            </div>
            {[
              [
                "Vulnerability",
                `${tooltip.d.vulnerability}/100`,
                riskColor(tooltip.d.vulnerability),
              ],
              [
                "Mobility Exposure",
                `${Number(tooltip.d.mobility_exposure_score || 0).toFixed(1)}/100`,
                null,
              ],
              [
                "Core Investment",
                `₹${Number(tooltip.d.investment_core_crore || 0).toFixed(1)} cr`,
                null,
              ],
              [
                "Exposure Index",
                `${Number(tooltip.d.exposure_index || 0).toFixed(1)}/100`,
                null,
              ],
              [
                "Population",
                `${(tooltip.d.population / 1e6).toFixed(2)}M`,
                null,
              ],
              ["Density", `${tooltip.d.density}/km²`, null],
              ["Beds / 1k", tooltip.d.beds_per_1000, null],
              ["Literacy", `${tooltip.d.literacy_rate}%`, null],
            ].map(([lbl, val, col]) => (
              <div
                key={lbl}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  color: "var(--muted)",
                  marginBottom: 3,
                }}
              >
                <span>{lbl}</span>
                <span style={{ color: col || "var(--text)", fontWeight: 500 }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "rgba(6,11,22,.88)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            padding: "10px 13px",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              color: "var(--muted)",
              marginBottom: 7,
              textTransform: "uppercase",
              letterSpacing: ".7px",
            }}
          >
            {cfg?.label}
          </div>
          {[
            ...(metric === "mobility_exposure_score"
              ? [
                  ["var(--red)", "High Mobility"],
                  ["var(--amber)", "Moderate Mobility"],
                  ["#f5a623", "Low Mobility"],
                ]
              : [
                  [
                    "var(--red)",
                    cfg?.higherBad ? "High (risk)" : "High (good)",
                  ],
                  ["var(--amber)", "Moderate"],
                  [
                    "var(--teal)",
                    cfg?.higherBad ? "Low (safe)" : "Low (concern)",
                  ],
                ]),
          ].map(([color, label]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 4,
                fontSize: 11.5,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 9,
                  borderRadius: 2,
                  background: color,
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
