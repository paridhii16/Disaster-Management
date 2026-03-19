import React from 'react';
import { diseaseRiskTier, diseaseRiskColor } from '../utils/seir';

export default function DiseaseRankTable({ districts, selected, onSelect, diseaseColor }) {
  const sorted = [...districts].sort((a, b) => (b.diseaseRisk ?? 0) - (a.diseaseRisk ?? 0));

  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div className="card-hd" style={{ marginBottom: 14 }}>
        District Risk Ranking
        <span style={{
          fontSize: 11, fontWeight: 400, textTransform: 'none',
          letterSpacing: 0, color: 'var(--muted)',
        }}>
          Hazard × Vulnerability × Exposure
        </span>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 480 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['#', 'District', 'Risk Score', 'Vulnerability', 'Density /km²', 'Beds /1k', 'Status'].map(h => (
                <th key={h} style={{
                  padding: '6px 10px', textAlign: 'left',
                  color: 'var(--muted)', fontWeight: 500, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '.6px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => {
              const tier = diseaseRiskTier(d.diseaseRisk ?? 0);
              const isSel = selected?.district === d.district;
              return (
                <tr
                  key={d.district}
                  onClick={() => onSelect(d)}
                  style={{
                    borderBottom: '1px solid rgba(80,130,255,.06)',
                    cursor: 'pointer',
                    background: isSel ? 'rgba(80,130,255,.08)' : 'transparent',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isSel ? 'rgba(80,130,255,.12)' : 'rgba(255,255,255,.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = isSel ? 'rgba(80,130,255,.08)' : 'transparent'}
                >
                  <td style={{ padding: '9px 10px', color: 'var(--faint)', fontFamily: 'var(--head)' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '9px 10px', fontWeight: 500, color: isSel ? diseaseColor : 'var(--text)' }}>
                    {d.district}
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: `${d.diseaseRisk ?? 0}%`, maxWidth: 60, height: 6,
                        background: diseaseRiskColor(d.diseaseRisk ?? 0, 0.7),
                        borderRadius: 3, flexShrink: 0,
                        transition: 'width .3s',
                      }} />
                      <span style={{ color: tier.color, fontFamily: 'var(--head)', fontWeight: 600 }}>
                        {d.diseaseRisk ?? '-'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '9px 10px', color: 'var(--muted)' }}>
                    {d.vulnerability}
                  </td>
                  <td style={{ padding: '9px 10px', color: 'var(--muted)' }}>
                    {d.density}
                  </td>
                  <td style={{ padding: '9px 10px', color: 'var(--muted)' }}>
                    {d.beds_per_1000}
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    <span className={tier.cls} style={{
                      padding: '2px 8px', borderRadius: 5,
                      fontSize: 11, fontWeight: 500,
                    }}>
                      {tier.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
