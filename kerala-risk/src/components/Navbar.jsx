import React from "react";

export default function Navbar({ page, onPageChange }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 400,
        height: 58,
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        background: "var(--bg2)",
        borderBottom: "1px solid var(--border)",
        gap: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginRight: 36,
        }}
      >
        <span
          className="pulse-dot"
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "var(--teal)",
            display: "inline-block",
          }}
        />
        <span
          style={{ fontFamily: "var(--head)", fontSize: 18, fontWeight: 600 }}
        >
          Kerala<span style={{ color: "var(--accent)" }}>Risk</span>Watch
        </span>
      </div>

      {/* Page tabs */}
      <div style={{ display: "flex", gap: 4 }}>
        {[
          { id: 1, label: "Vulnerability Index", icon: "🗺" },
          { id: 2, label: "Disease Spread Simulation", icon: "🦠" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onPageChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: "var(--font)",
              border:
                page === tab.id
                  ? "1px solid var(--border2)"
                  : "1px solid transparent",
              background:
                page === tab.id ? "rgba(80,130,255,.12)" : "transparent",
              color: page === tab.id ? "var(--accent)" : "var(--muted)",
              transition: "all .15s",
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
