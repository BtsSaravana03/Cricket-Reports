import React from 'react';

// Hand-drawn SVG charts for the match report. Plain SVG (no chart lib) so html-to-image
// captures them exactly for the PDF / PPTX export.

export const COLORS = {
  navy: '#0f172a',
  ink: '#1e293b',
  muted: '#64748b',
  grid: '#e2e8f0',
  blue: '#2563eb',
  amber: '#d97706',
  green: '#16a34a',
  red: '#dc2626',
  violet: '#7c3aed',
  teal: '#0d9488'
};

const niceMax = (v) => {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * pow >= v / 4) * pow;
  return Math.ceil(v / step) * step;
};

const Empty = ({ width, height, text }) => (
  <svg width={width} height={height}>
    <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="11" fill={COLORS.muted}>{text}</text>
  </svg>
);

// Partnerships as split bars: batter A's runs grow left from the centre, batter B's right.
export function PartnershipBars({ partnerships, width = 820, rowHeight = 30 }) {
  if (!partnerships.length) return <Empty width={width} height={80} text="No partnerships" />;
  const height = partnerships.length * rowHeight + 24;
  const center = width / 2;
  const labelW = 150;
  const half = center - labelW - 40;
  const maxRuns = Math.max(1, ...partnerships.flatMap((p) => p.batters.map((b) => b.runs)));
  const scale = (r) => (r / maxRuns) * half;

  return (
    <svg width={width} height={height} fontFamily="sans-serif">
      <text x={center - 40} y={12} textAnchor="end" fontSize="9" fontWeight="700" fill={COLORS.muted}>BATTER 1 RUNS (BALLS)</text>
      <text x={center + 40} y={12} fontSize="9" fontWeight="700" fill={COLORS.muted}>BATTER 2 RUNS (BALLS)</text>
      {partnerships.map((p, i) => {
        const y = 22 + i * rowHeight;
        const [a, b] = p.batters;
        const wa = scale(a.runs);
        const wb = scale(b?.runs || 0);
        return (
          <g key={p.number}>
            <text x={labelW - 6} y={y + 12} textAnchor="end" fontSize="10" fontWeight="700" fill={COLORS.ink}>
              {a.name}
            </text>
            <text x={labelW - 6} y={y + 23} textAnchor="end" fontSize="9" fill={COLORS.muted}>{a.runs} ({a.balls})</text>
            <rect x={center - 34 - wa} y={y + 4} width={Math.max(wa, 1)} height={rowHeight - 12} rx="2" fill={COLORS.blue} />
            <rect x={center - 32} y={y + 2} width={64} height={rowHeight - 8} rx="4" fill={COLORS.navy} />
            <text x={center} y={y + 14} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">
              {p.runs}{p.unbroken ? '*' : ''} ({p.balls})
            </text>
            <text x={center} y={y + 23} textAnchor="middle" fontSize="7.5" fill="#cbd5e1">
              {`${p.number}${['ST', 'ND', 'RD'][p.number - 1] || 'TH'} WKT · EX ${p.extras}`}
            </text>
            <rect x={center + 34} y={y + 4} width={Math.max(wb, 1)} height={rowHeight - 12} rx="2" fill={COLORS.amber} />
            <text x={width - labelW + 6} y={y + 12} fontSize="10" fontWeight="700" fill={COLORS.ink}>{b?.name || '-'}</text>
            <text x={width - labelW + 6} y={y + 23} fontSize="9" fill={COLORS.muted}>{b ? `${b.runs} (${b.balls})` : ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Score at the fall of each wicket: x = wicket number, y = team score.
// wickets: [{ wkt, score, over, batterName }]
export function FowByWicketChart({ wickets, width = 820, height = 260 }) {
  if (!wickets.length) return <Empty width={width} height={height} text="No wickets fell" />;
  const pad = { l: 44, r: 30, t: 28, b: 34 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const xMax = Math.max(10, wickets[wickets.length - 1].wkt);
  const yMax = niceMax(Math.max(...wickets.map((p) => p.score)));
  const X = (x) => pad.l + (x / xMax) * w;
  const Y = (y) => pad.t + h - (y / yMax) * h;
  const points = [{ wkt: 0, score: 0 }, ...wickets];
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.wkt).toFixed(1)},${Y(p.score).toFixed(1)}`).join(' ');

  return (
    <svg width={width} height={height} fontFamily="sans-serif">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={pad.l + w} y1={Y(yMax * f)} y2={Y(yMax * f)} stroke={COLORS.grid} />
          <text x={pad.l - 6} y={Y(yMax * f) + 3} textAnchor="end" fontSize="9" fill={COLORS.muted}>{Math.round(yMax * f)}</text>
        </g>
      ))}
      {Array.from({ length: xMax + 1 }, (_, i) => i).map((x) => (
        <text key={x} x={X(x)} y={pad.t + h + 14} textAnchor="middle" fontSize="9" fontWeight={x ? 700 : 400} fill={COLORS.muted}>{x}</text>
      ))}
      <text x={pad.l + w / 2} y={height - 2} textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS.muted}>WICKETS</text>
      <text x={12} y={pad.t + h / 2} textAnchor="middle" fontSize="9" fontWeight="700" fill={COLORS.muted} transform={`rotate(-90 12 ${pad.t + h / 2})`}>SCORE</text>
      <path d={path} fill="none" stroke={COLORS.blue} strokeWidth="2.2" />
      {wickets.map((p) => (
        <g key={p.wkt}>
          <circle cx={X(p.wkt)} cy={Y(p.score)} r="4.5" fill={COLORS.red} stroke="#fff" strokeWidth="1.5" />
          <text x={X(p.wkt)} y={Y(p.score) - 9} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={COLORS.navy} stroke="#fff" strokeWidth="3" paintOrder="stroke">
            {p.score}/{p.wkt} ({p.over})
          </text>
          <text x={X(p.wkt)} y={Y(p.score) + 16} textAnchor="middle" fontSize="7.5" fill={COLORS.muted} stroke="#fff" strokeWidth="3" paintOrder="stroke">
            {p.batterName}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Bars on the left axis with a line on a right axis (e.g. dot balls + economy per bowler).
export function ComboBarLine({ categories, bars, line, width = 760, height = 200, lineFormat = (v) => v }) {
  if (!categories.length) return <Empty width={width} height={height} text="No data" />;
  const pad = { l: 34, r: 40, t: 24, b: 26 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const barVals = bars.values.map((v) => Number(v) || 0);
  const lineVals = line.values.map((v) => (Number.isFinite(Number.parseFloat(v)) ? Number.parseFloat(v) : null));
  const yBar = niceMax(Math.max(1, ...barVals));
  const yLine = niceMax(Math.max(1, ...lineVals.filter((v) => v !== null)));
  const slot = w / categories.length;
  const barW = Math.min(36, slot * 0.5);
  const cx = (i) => pad.l + slot * i + slot / 2;
  const YB = (v) => pad.t + h - (v / yBar) * h;
  const YL = (v) => pad.t + h - (v / yLine) * h;
  const pts = lineVals.map((v, i) => (v === null ? null : [cx(i), YL(v)]));
  const path = pts.filter(Boolean).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  return (
    <svg width={width} height={height} fontFamily="sans-serif">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={pad.l + w} y1={YB(yBar * f)} y2={YB(yBar * f)} stroke={COLORS.grid} />
          <text x={pad.l - 5} y={YB(yBar * f) + 3} textAnchor="end" fontSize="8.5" fill={bars.color}>{Math.round(yBar * f)}</text>
          <text x={pad.l + w + 5} y={YL(yLine * f) + 3} fontSize="8.5" fill={line.color}>{+(yLine * f).toFixed(1)}</text>
        </g>
      ))}
      {categories.map((c, i) => (
        <g key={c + i}>
          <rect x={cx(i) - barW / 2} y={YB(barVals[i])} width={barW} height={pad.t + h - YB(barVals[i])} rx="2" fill={bars.color} />
          <text x={cx(i)} y={YB(barVals[i]) + 11} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff">{barVals[i] || ''}</text>
          <text x={cx(i)} y={pad.t + h + 13} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={COLORS.ink}>{c}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke={line.color} strokeWidth="2.2" />
      {pts.map((p, i) => p && (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke={line.color} strokeWidth="2" />
          <text x={p[0]} y={p[1] - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill={line.color} stroke="#fff" strokeWidth="3" paintOrder="stroke">{lineFormat(line.values[i])}</text>
        </g>
      ))}
      <g transform={`translate(${pad.l}, 4)`}>
        <rect width="9" height="9" rx="2" fill={bars.color} />
        <text x="13" y="8" fontSize="8.5" fontWeight="700" fill={COLORS.ink}>{bars.name} (LEFT AXIS)</text>
        <g transform={`translate(${13 + (bars.name.length + 12) * 6 + 24}, 0)`}>
          <line x1="0" x2="16" y1="4.5" y2="4.5" stroke={line.color} strokeWidth="2.2" />
          <circle cx="8" cy="4.5" r="3" fill="#fff" stroke={line.color} strokeWidth="1.8" />
          <text x="21" y="8" fontSize="8.5" fontWeight="700" fill={COLORS.ink}>{line.name} (RIGHT AXIS)</text>
        </g>
      </g>
    </svg>
  );
}

// Comparative lines on a shared % axis, e.g. Dot % vs Boundary % across phases.
// series: [{ name, color, values: [number|null] }]
export function LineCompare({ categories, series, width = 400, height = 280, suffix = '%' }) {
  if (!categories.length) return <Empty width={width} height={height} text="No data" />;
  const pad = { l: 34, r: 16, t: 30, b: 28 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const all = series.flatMap((s) => s.values).filter((v) => v !== null && Number.isFinite(v));
  const yMax = niceMax(Math.max(10, ...all));
  const slot = w / categories.length;
  const cx = (i) => pad.l + slot * i + slot / 2;
  const Y = (v) => pad.t + h - (v / yMax) * h;

  return (
    <svg width={width} height={height} fontFamily="sans-serif">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={pad.l + w} y1={Y(yMax * f)} y2={Y(yMax * f)} stroke={COLORS.grid} />
          <text x={pad.l - 5} y={Y(yMax * f) + 3} textAnchor="end" fontSize="8.5" fill={COLORS.muted}>{Math.round(yMax * f)}{suffix}</text>
        </g>
      ))}
      {categories.map((c, i) => (
        <text key={c} x={cx(i)} y={pad.t + h + 14} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={COLORS.ink}>{c}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => (v === null || !Number.isFinite(v) ? null : [cx(i), Y(v)]));
        const d = pts.filter(Boolean).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke={s.color} strokeWidth="2.4" />
            {pts.map((p, i) => p && (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r="4.5" fill={s.color} stroke="#fff" strokeWidth="1.5" />
                <text x={p[0]} y={p[1] + (si === 0 || p[1] + 16 > pad.t + h - 4 ? -9 : 16)} textAnchor="middle" fontSize="9" fontWeight="800" fill={s.color} stroke="#fff" strokeWidth="3" paintOrder="stroke">
                  {s.values[i].toFixed(1)}{suffix}
                </text>
              </g>
            ))}
          </g>
        );
      })}
      {series.map((s, si) => (
        <g key={s.name} transform={`translate(${pad.l + si * 110}, 6)`}>
          <rect width="9" height="9" rx="2" fill={s.color} />
          <text x="13" y="8" fontSize="8.5" fontWeight="700" fill={COLORS.ink}>{s.name}</text>
        </g>
      ))}
    </svg>
  );
}

// Vertical grouped bars. series: [{ name, color, values: [] }], categories: []
export function GroupedBars({ categories, series, width = 400, height = 240, format = (v) => v }) {
  if (!categories.length) return <Empty width={width} height={height} text="No data" />;
  const pad = { l: 34, r: 8, t: 22, b: 28 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const yMax = niceMax(Math.max(1, ...series.flatMap((s) => s.values.map(Number).filter((v) => !Number.isNaN(v)))));
  const groupW = w / categories.length;
  const barW = Math.min(26, (groupW - 12) / series.length);
  const Y = (v) => pad.t + h - (v / yMax) * h;

  return (
    <svg width={width} height={height} fontFamily="sans-serif">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={pad.l + w} y1={Y(yMax * f)} y2={Y(yMax * f)} stroke={COLORS.grid} />
          <text x={pad.l - 5} y={Y(yMax * f) + 3} textAnchor="end" fontSize="8.5" fill={COLORS.muted}>{Math.round(yMax * f)}</text>
        </g>
      ))}
      {categories.map((c, ci) => {
        const gx = pad.l + ci * groupW + (groupW - barW * series.length) / 2;
        return (
          <g key={c}>
            {series.map((s, si) => {
              const v = Number(s.values[ci]) || 0;
              return (
                <g key={s.name}>
                  <rect x={gx + si * barW} y={Y(v)} width={barW - 2} height={pad.t + h - Y(v)} rx="2" fill={s.color} />
                  <text x={gx + si * barW + (barW - 2) / 2} y={Y(v) - 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={COLORS.ink}>{format(s.values[ci])}</text>
                </g>
              );
            })}
            <text x={pad.l + ci * groupW + groupW / 2} y={pad.t + h + 13} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={COLORS.ink}>{c}</text>
          </g>
        );
      })}
      {series.map((s, si) => (
        <g key={s.name} transform={`translate(${pad.l + si * 90}, 4)`}>
          <rect width="9" height="9" rx="2" fill={s.color} />
          <text x="13" y="8" fontSize="8.5" fontWeight="700" fill={COLORS.ink}>{s.name}</text>
        </g>
      ))}
    </svg>
  );
}

// Two-sided horizontal comparison (e.g. pace vs spin). metrics: [{ label, a, b, suffix }]
export function HBarCompare({ metrics, aLabel, bLabel, width = 380, rowHeight = 34 }) {
  const height = metrics.length * rowHeight + 26;
  const center = width / 2;
  const half = center - 46;
  return (
    <svg width={width} height={height} fontFamily="sans-serif">
      <rect x={center - half - 40} y={4} width="9" height="9" rx="2" fill={COLORS.blue} />
      <text x={center - half - 27} y={12} fontSize="9" fontWeight="700" fill={COLORS.ink}>{aLabel}</text>
      <rect x={center + half + 4 - 60} y={4} width="9" height="9" rx="2" fill={COLORS.amber} />
      <text x={center + half + 17 - 60} y={12} fontSize="9" fontWeight="700" fill={COLORS.ink}>{bLabel}</text>
      {metrics.map((m, i) => {
        const y = 24 + i * rowHeight;
        const a = Number.parseFloat(m.a) || 0;
        const b = Number.parseFloat(m.b) || 0;
        const max = Math.max(a, b, 1);
        const wa = (a / max) * (half - 30);
        const wb = (b / max) * (half - 30);
        return (
          <g key={m.label}>
            <text x={center} y={y + 9} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={COLORS.muted}>{m.label}</text>
            <rect x={center - 4 - wa} y={y + 13} width={Math.max(wa, 1)} height="12" rx="2" fill={COLORS.blue} />
            <text x={center - 8 - wa} y={y + 23} textAnchor="end" fontSize="9" fontWeight="800" fill={COLORS.ink}>{m.a}</text>
            <rect x={center + 4} y={y + 13} width={Math.max(wb, 1)} height="12" rx="2" fill={COLORS.amber} />
            <text x={center + 8 + wb} y={y + 23} fontSize="9" fontWeight="800" fill={COLORS.ink}>{m.b}</text>
          </g>
        );
      })}
    </svg>
  );
}
