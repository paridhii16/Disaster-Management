import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { geoMercator, geoPath } from "d3-geo";
import { diseaseRiskColor, diseaseRiskTier } from "../utils/seir";

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

export default function DiseaseMap({
  districts,
  baselineDistricts = [],
  selectedDistrict,
  onSelect,
}) {
  const [pathData, setPathData] = useState([]);
  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const wrapRef = useRef(null);

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
        setGeoError(err.message);
        setGeoLoading(false);
      });
  }, []);

  const byName = useCallback(
    (csvName) => districts.find((d) => d.district === csvName),
    [districts],
  );

  // Quick lookup for baseline risk by district name
  const baselineByName = useMemo(() => {
    const m = new Map();
    baselineDistricts.forEach((d) => m.set(d.district, d.diseaseRisk));
    return m;
  }, [baselineDistricts]);

  function handleMouseEnter(e, item) {
    const d = byName(item.csvName);
    if (!d) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const TOOLTIP_HEIGHT = 220;
    const TOOLTIP_WIDTH = 220;
    let y = e.clientY - rect.top - 16;
    // If tooltip would extend below container, position above cursor instead
    if (y + TOOLTIP_HEIGHT > rect.height) {
      y = Math.max(0, e.clientY - rect.top - TOOLTIP_HEIGHT - 8);
    }
    setTooltip({
      x: Math.min(e.clientX - rect.left + 16, rect.width - TOOLTIP_WIDTH),
      y,
      d,
    });
  }

  function handleMouseMove(e) {
    if (!tooltip) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const TOOLTIP_HEIGHT = 220;
    const TOOLTIP_WIDTH = 220;
    let y = e.clientY - rect.top - 16;
    // If tooltip would extend below container, position above cursor instead
    if (y + TOOLTIP_HEIGHT > rect.height) {
      y = Math.max(0, e.clientY - rect.top - TOOLTIP_HEIGHT - 8);
    }
    setTooltip((t) =>
      t
        ? {
            ...t,
            x: Math.min(e.clientX - rect.left + 16, rect.width - TOOLTIP_WIDTH),
            y,
          }
        : null,
    );
  }

  return (
    <div className="card" style={{ flex: "0 0 480px", padding: 16 }}>
      {/* Header */}
      <div className="card-hd" style={{ marginBottom: 14 }}>
        Disease Risk Zoning Map
        <span
          style={{
            fontSize: 11,
            color: "var(--muted)",
            fontWeight: 400,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          Risk = Hazard × Vulnerability × Exposure
        </span>
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
                stroke="var(--red)"
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
              fill="rgba(240,82,82,.38)"
              fontSize="11"
              fontFamily="Space Grotesk, sans-serif"
              letterSpacing="2"
            >
              DISEASE RISK ZONES
            </text>

            {/* District polygons */}
            <g>
              {pathData.map((item) => {
                const d = byName(item.csvName);
                const sel = selectedDistrict?.district === item.csvName;
                const risk = d?.diseaseRisk ?? 50;
                return (
                  <path
                    key={item.csvName}
                    d={item.d}
                    fill={diseaseRiskColor(risk, 0.82)}
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

            {/* Labels */}
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
                        {d.diseaseRisk}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Tooltip */}
        {tooltip &&
          (() => {
            const { d } = tooltip;
            const tier = diseaseRiskTier(d.diseaseRisk ?? 50);
            return (
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
                  minWidth: 205,
                  boxShadow: "0 10px 28px rgba(0,0,0,.55)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--head)",
                    fontSize: 15,
                    fontWeight: 600,
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {d.district}
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: `${tier.color}22`,
                      color: tier.color,
                      border: `1px solid ${tier.color}44`,
                    }}
                  >
                    {tier.label}
                  </span>
                </div>
                {(() => {
                  const currentRisk = d.diseaseRisk ?? 0;
                  const baseRisk = baselineByName.get(d.district);
                  const delta = baseRisk != null ? currentRisk - baseRisk : 0;
                  const showDelta = Math.abs(delta) >= 0.1;
                  const deltaColor = delta > 0 ? "#f05252" : "#00c9a7";
                  const deltaLabel = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
                  return (
                    <>
                      {[
                        [
                          "Disease Risk Score",
                          `${currentRisk}/100`,
                          tier.color,
                        ],
                        ["Base Vulnerability", `${d.vulnerability}/100`, null],
                        [
                          "Computed Vulnerability",
                          `${d.compVulnerability ?? d.vulnerability}/100`,
                          "var(--amber)",
                        ],
                        ["Population Density", `${d.density}/km²`, null],
                        [
                          "Beds / 1,000",
                          typeof d.beds_per_1000 === "number"
                            ? d.beds_per_1000.toFixed(2)
                            : d.beds_per_1000,
                          null,
                        ],
                        ["Literacy Rate", `${d.literacy_rate}%`, null],
                        [
                          "GDDP per Capita",
                          `₹${(d.gddp_per_capita / 1000).toFixed(0)}k`,
                          null,
                        ],
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
                          <span
                            style={{
                              color: col || "var(--text)",
                              fontWeight: 500,
                            }}
                          >
                            {val}
                          </span>
                        </div>
                      ))}
                      {showDelta && (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            background: `${deltaColor}18`,
                            border: `1px solid ${deltaColor}44`,
                            borderRadius: 6,
                            padding: "5px 9px",
                          }}
                        >
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>
                            Risk change vs baseline
                          </span>
                          <span
                            style={{
                              marginLeft: "auto",
                              fontFamily: "var(--head)",
                              fontSize: 13,
                              fontWeight: 700,
                              color: deltaColor,
                            }}
                          >
                            {deltaLabel} {delta > 0 ? "↑" : "↓"}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            );
          })()}

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
            Disease Risk Score
          </div>
          {[
            ["var(--red)", "Critical (≥65)"],
            ["var(--amber)", "Elevated (40–64)"],
            ["var(--teal)", "Contained (<40)"],
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
