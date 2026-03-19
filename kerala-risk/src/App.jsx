import React, { useState, useCallback } from 'react';
import { useDistrictData } from './hooks/useDistrictData';
import Navbar from './components/Navbar';
import StatBar from './components/StatBar';
import KeralaMap from './components/KeralaMap';
import ExposurePanel from './components/ExposurePanel';
import DetailPanel from './components/DetailPanel';

export default function App() {
  const { districts, loading, error } = useDistrictData();
  const [selected, setSelected] = useState(null);

  const handleSelect = useCallback((d) => {
    setSelected(prev => (prev?.district === d?.district ? null : d));
  }, []);

  const handleClose = useCallback(() => setSelected(null), []);

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ padding: '24px 32px 60px', maxWidth: 1800, margin: '0 auto' }}>

        {/* ── Stat bar ─── */}
        <StatBar districts={districts} />

        {/* ── Main row: map + exposure ─── */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
          <KeralaMap
            districts={districts}
            selectedDistrict={selected}
            onSelect={handleSelect}
          />
          <ExposurePanel
            districts={districts}
            selected={selected}
          />
        </div>


      </div>

      {/* ── Slide-in detail panel ─── */}
      {selected && (
        <DetailPanel district={selected} onClose={handleClose} />
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      background: 'var(--bg)', color: 'var(--muted)',
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="18" fill="none" stroke="var(--border2)" strokeWidth="3.5" />
        <circle cx="24" cy="24" r="18" fill="none" stroke="var(--accent)" strokeWidth="3.5"
          strokeDasharray="28 85" strokeLinecap="round" transform="rotate(-90 24 24)">
          <animateTransform attributeName="transform" type="rotate"
            from="-90 24 24" to="270 24 24" dur="1s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div style={{ fontFamily: 'var(--head)', fontSize: 16, color: 'var(--text)' }}>
        Loading district data…
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        Reading CSVs from /public/data/
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      background: 'var(--bg)', color: 'var(--muted)',
    }}>
      <div style={{ fontSize: 32, color: 'var(--red)' }}>⚠</div>
      <div style={{ fontFamily: 'var(--head)', fontSize: 16, color: 'var(--text)' }}>
        Failed to load data
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420, textAlign: 'center' }}>
        {message}
      </div>
      <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 8 }}>
        Make sure <code style={{ color: 'var(--accent)' }}>public/data/districts.csv</code> exists.
      </div>
    </div>
  );
}
