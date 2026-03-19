import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { riskColor } from '../utils/vulnerability';

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div style={{
      background: 'rgba(6,11,22,.95)', border: '1px solid var(--border2)',
      borderRadius: 7, padding: '8px 13px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ color: v < 0.85 ? '#f05252' : v < 1.2 ? '#f5a623' : '#00c9a7' }}>
        {v} beds / 1k pop
      </div>
    </div>
  );
};

export default function BedsChart({ districts, selected }) {
  const sorted = [...districts].sort((a, b) => b.beds_per_1000 - a.beds_per_1000);

  const data = sorted.map(d => ({
    name:  d.district.length > 11 ? d.district.substring(0, 11) + '…' : d.district,
    full:  d.district,
    value: d.beds_per_1000,
    vuln:  d.vulnerability,
    sel:   selected?.district === d.district,
  }));

  return (
    <div className="card" style={{ flex: 1, padding: '18px 20px' }}>
      <div className="card-hd" style={{ marginBottom: 14 }}>
        Hospital Beds per 1,000 Population
        <span style={{
          fontSize: 11.5, color: 'var(--teal)',
          fontWeight: 400, textTransform: 'none', letterSpacing: 0,
        }}>
          WHO recommendation: 3.0
        </span>
      </div>
      <div style={{ position: 'relative', height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 56 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#7585a8', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: '#7585a8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v.toFixed(1)}
              label={{
                value: 'Beds / 1k',
                angle: -90,
                position: 'insideLeft',
                fill: '#7585a8',
                fontSize: 11,
                dx: -4,
              }}
            />
            <Tooltip content={<DarkTooltip />} />
            <ReferenceLine
              y={3}
              stroke="rgba(79,126,255,.35)"
              strokeDasharray="5 4"
              label={{
                value: 'WHO: 3.0',
                fill: 'rgba(79,126,255,.65)',
                fontSize: 11,
                position: 'right',
              }}
            />
            <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={26}>
              {data.map((entry, i) => {
                let fill;
                if (entry.sel)              fill = 'rgba(255,255,255,.9)';
                else if (entry.value < 0.85) fill = 'rgba(240,82,82,.76)';
                else if (entry.value < 1.2)  fill = 'rgba(245,166,35,.76)';
                else                         fill = 'rgba(0,201,167,.76)';
                return <Cell key={i} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex', gap: 20, fontSize: 12,
        color: 'var(--muted)', marginTop: 8,
      }}>
        {[
          ['var(--red)',   'Critical (< 0.85)'],
          ['var(--amber)', 'Low (0.85 – 1.2)'],
          ['var(--teal)',  'Adequate (≥ 1.2)'],
        ].map(([color, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 11, height: 11, borderRadius: 2,
              background: color, display: 'inline-block',
            }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
