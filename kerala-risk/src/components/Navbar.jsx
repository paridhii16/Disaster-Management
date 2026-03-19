import React from 'react';

export default function Navbar() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 400,
      height: 58, display: 'flex', alignItems: 'center', padding: '0 32px',
      background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      gap: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 36 }}>
        <span className="pulse-dot" style={{
          width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)',
          display: 'inline-block',
        }} />
        <span style={{ fontFamily: 'var(--head)', fontSize: 18, fontWeight: 600 }}>
          Kerala<span style={{ color: 'var(--accent)' }}>Risk</span>Watch
        </span>
      </div>

      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
        Vulnerability Index · Page 1 of 2
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          Census 2011 · NHM Bed Data · GSDP 2022-23
        </span>
        <span style={{
          fontSize: 12, padding: '4px 12px', borderRadius: 20,
          background: 'rgba(0,201,167,0.1)', color: 'var(--teal)',
          border: '1px solid rgba(0,201,167,0.25)',
        }}>
          ● Real Data
        </span>
      </div>
    </nav>
  );
}
