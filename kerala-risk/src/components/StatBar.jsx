import React from 'react';

function Stat({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '18px 22px' }}>
      <div style={{
        fontSize: 11.5, color: 'var(--muted)', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.8px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--head)', fontSize: 32, fontWeight: 600,
        lineHeight: 1, color,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{sub}</div>
    </div>
  );
}

export default function StatBar({ districts }) {
  if (!districts.length) return null;

  const byVuln    = [...districts].sort((a, b) => b.vulnerability - a.vulnerability);
  const mean      = (districts.reduce((s, d) => s + d.vulnerability, 0) / districts.length).toFixed(1);
  const minBed    = [...districts].sort((a, b) => a.beds_per_1000 - b.beds_per_1000)[0];
  // Highest exposure = highest population density (most exposed to disease spread)
  const maxDensity = [...districts].sort((a, b) => b.density - a.density)[0];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
      gap: 16, marginBottom: 20,
    }}>
      <Stat
        label="Highest Vulnerability"
        value={byVuln[0].vulnerability}
        sub={byVuln[0].district}
        color="var(--red)"
      />
      <Stat
        label="State Mean Score"
        value={mean}
        sub="Composite vulnerability index"
        color="var(--amber)"
      />
      <Stat
        label="Lowest Bed Ratio"
        value={minBed.beds_per_1000}
        sub={minBed.district}
        color="var(--red)"
      />
      <Stat
        label="Highest Exposure"
        value={maxDensity.density.toLocaleString()}
        sub={`${maxDensity.district} · persons/km²`}
        color="var(--amber)"
      />
    </div>
  );
}
