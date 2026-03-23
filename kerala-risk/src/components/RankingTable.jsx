import React from "react";
import { riskColor, riskTier } from "../utils/vulnerability";

export default function RankingTable({ districts, onSelect }) {
  const sorted = [...districts].sort(
    (a, b) => b.vulnerability - a.vulnerability,
  );

  return (
    <div className="card" style={{ flex: 1, padding: "18px 20px" }}>
      <div className="card-hd" style={{ marginBottom: 14 }}>
        District Vulnerability Rankings
        <span
          style={{
            fontSize: 11.5,
            color: "var(--teal)",
            fontWeight: 400,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          Click a row to inspect
        </span>
      </div>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr>
            {[
              "#",
              "District",
              "Score",
              "Beds/1k",
              "Literacy",
              "Density",
              "Risk",
            ].map((h) => (
              <th
                key={h}
                style={{
                  color: "var(--muted)",
                  fontWeight: 400,
                  textAlign: "left",
                  padding: "5px 6px 9px",
                  fontSize: 11.5,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => {
            const { label, cls } = riskTier(d.vulnerability);
            return (
              <tr
                key={d.district}
                onClick={() => onSelect(d)}
                style={{
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(80,130,255,.05)",
                  transition: "background .12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(79,126,255,.06)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td
                  style={{
                    padding: "9px 6px",
                    color: "var(--faint)",
                    fontSize: 12,
                  }}
                >
                  {i + 1}
                </td>
                <td style={{ padding: "9px 6px", fontWeight: 500 }}>
                  {d.district}
                </td>
                <td
                  style={{
                    padding: "9px 6px",
                    color: riskColor(d.vulnerability),
                    fontWeight: 600,
                    fontFamily: "var(--head)",
                    fontSize: 14,
                  }}
                >
                  {d.vulnerability}
                </td>
                <td style={{ padding: "9px 6px" }}>{d.beds_per_1000}</td>
                <td style={{ padding: "9px 6px" }}>{d.literacy_rate}%</td>
                <td style={{ padding: "9px 6px" }}>{d.density}</td>
                <td style={{ padding: "9px 6px" }}>
                  <span
                    className={cls}
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
