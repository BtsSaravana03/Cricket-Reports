import React from 'react';
import { COLORS } from '../match-report/charts';

// Infographic SVGs for the tournament highlights report (leader "pills", hexagons, rings).
// Plain SVG so the PDF / PPTX export captures them exactly.

export const LEADER_COLORS = ['#3b4fa8', '#e53935', '#f2b705', '#94a3b8', '#14b8a6', '#7c3aed'];

// Splits a name onto at most two lines of ~maxChars
const twoLines = (name = '', maxChars = 11) => {
  const words = String(name).toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1 || name.length <= maxChars) return [String(name).toUpperCase()];
  let first = words[0];
  let i = 1;
  while (i < words.length - 1 && `${first} ${words[i]}`.length <= maxChars) { first += ` ${words[i]}`; i += 1; }
  return [first, words.slice(i).join(' ')];
};

const Empty = ({ width, height, text }) => (
  <svg width={width} height={height}>
    <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.muted}>{text}</text>
  </svg>
);

const gradientDefs = (prefix) => (
  <defs>
    {LEADER_COLORS.map((c, i) => (
      <linearGradient key={c} id={`${prefix}${i}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c} />
        <stop offset="100%" stopColor={c} stopOpacity="0.45" />
      </linearGradient>
    ))}
  </defs>
);

// Capsules with the value in a white circle, alternating top / bottom (top run getters, 100s, ...)
export function PillLeaders({ items, width = 800, height = 300, idPrefix = 'pill' }) {
  if (!items.length) return <Empty width={width} height={height} text="None this tournament" />;
  if (height < 220) return <PillLeadersCompact items={items} width={width} height={height} idPrefix={idPrefix} />;
  const n = items.length;
  const slot = width / Math.max(n, 6);
  const pillW = Math.min(92, slot * 0.78);
  const pillH = height * 0.62;
  const offset = (width - slot * n) / 2;
  return (
    <svg width={width} height={height} fontFamily="Arial, sans-serif">
      {gradientDefs(idPrefix)}
      {items.map((it, i) => {
        const cx = offset + slot * i + slot / 2;
        const top = i % 2 === 0 ? height * 0.08 : height * 0.3;
        const r = pillW * 0.36;
        const circleY = i % 2 === 0 ? top + r + 8 : top + pillH - r - 8;
        const textY = i % 2 === 0 ? top + pillH * 0.66 : top + pillH * 0.34;
        const lines = twoLines(it.name);
        return (
          <g key={`${it.name}-${i}`}>
            <rect x={cx - pillW / 2} y={top} width={pillW} height={pillH} rx={pillW / 2} fill={`url(#${idPrefix}${i % 6})`} stroke={LEADER_COLORS[i % 6]} strokeWidth="2" />
            <circle cx={cx} cy={circleY} r={r} fill="#fff" stroke={LEADER_COLORS[i % 6]} strokeWidth="2" />
            <text x={cx} y={circleY + 6} textAnchor="middle" fontSize={r * 0.62} fontWeight="900" fill={COLORS.navy}>{it.value}</text>
            {lines.map((l, li) => (
              <text key={li} x={cx} y={textY + (li - (lines.length - 1) / 2) * 12} textAnchor="middle" fontSize="9.5" fontWeight="900" fill={i % 6 === 2 || i % 6 === 3 ? COLORS.navy : '#fff'}>{l}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// Short panels: horizontal capsules (value circle on the left, name on the right), two rows of three
function PillLeadersCompact({ items, width, height, idPrefix }) {
  const perRow = 3;
  const rows = Math.ceil(items.length / perRow);
  const gap = 10;
  const pillW = (width - gap * (perRow + 1)) / perRow;
  const pillH = Math.min(48, (height - gap * (rows + 1)) / rows);
  const r = pillH / 2 - 4;
  return (
    <svg width={width} height={height} fontFamily="Arial, sans-serif">
      {gradientDefs(idPrefix)}
      {items.map((it, i) => {
        const x = gap + (i % perRow) * (pillW + gap);
        const y = gap + Math.floor(i / perRow) * (pillH + gap);
        const lines = twoLines(it.name, 16);
        return (
          <g key={`${it.name}-${i}`}>
            <rect x={x} y={y} width={pillW} height={pillH} rx={pillH / 2} fill={`url(#${idPrefix}${i % 6})`} stroke={LEADER_COLORS[i % 6]} strokeWidth="2" />
            <circle cx={x + pillH / 2} cy={y + pillH / 2} r={r} fill="#fff" stroke={LEADER_COLORS[i % 6]} strokeWidth="2" />
            <text x={x + pillH / 2} y={y + pillH / 2 + r * 0.35} textAnchor="middle" fontSize={r * 0.95} fontWeight="900" fill={COLORS.navy}>{it.value}</text>
            {lines.map((l, li) => (
              <text key={li} x={x + pillH + 6} y={y + pillH / 2 + 4 + (li - (lines.length - 1) / 2) * 12} fontSize="10" fontWeight="900" fill={i % 6 === 2 || i % 6 === 3 ? COLORS.navy : '#fff'}>{l}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// Zig-zag hexagons with the value inside and the name outside (top wicket takers)
export function HexLeaders({ items, width = 800, height = 320 }) {
  if (!items.length) return <Empty width={width} height={height} text="None this tournament" />;
  const n = items.length;
  const slot = width / Math.max(n, 6);
  const offset = (width - slot * n) / 2;
  const R = Math.min(slot * 0.62, 58);
  const hex = (cx, cy) => Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k;
    return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} fontFamily="Arial, sans-serif">
      {gradientDefs('hex')}
      {items.map((it, i) => {
        const cx = offset + slot * i + slot / 2;
        const up = i % 2 === 0;
        const cy = up ? height * 0.42 : height * 0.6;
        const lines = twoLines(it.name, 14);
        const labelY = up ? cy - R - 18 : cy + R + 22;
        return (
          <g key={`${it.name}-${i}`}>
            <line x1={cx} x2={cx} y1={up ? cy - R : cy + R} y2={up ? labelY + 6 : labelY - 14} stroke="#94a3b8" strokeWidth="1.2" />
            <polygon points={hex(cx, cy)} fill={`url(#hex${i % 6})`} stroke={LEADER_COLORS[i % 6]} strokeWidth="2" />
            <text x={cx} y={cy + R * 0.22} textAnchor="middle" fontSize={R * 0.62} fontWeight="900" fill={COLORS.navy}>{it.value}</text>
            {lines.map((l, li) => (
              <text key={li} x={cx} y={labelY + li * 11 - (up ? (lines.length - 1) * 11 : 0)} textAnchor="middle" fontSize="9.5" fontWeight="900" fill={COLORS.navy}>{l}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// Ring with a big number; arc filled by value/max when a max is given (totals, keeper stats)
export function RingStat({ value, label, max, color = COLORS.green, width = 170, height = 170 }) {
  const r = Math.min(width, height - 30) / 2 - 10;
  const cx = width / 2;
  const cy = r + 12;
  const frac = max ? Math.max(0, Math.min(1, Number(value) / max)) : 1;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={width} height={height} fontFamily="Arial, sans-serif">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${(circ * frac).toFixed(1)} ${circ.toFixed(1)}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={r - 12} fill="#3b4fa8" />
      <text x={cx} y={cy + r * 0.2} textAnchor="middle" fontSize={r * 0.6} fontWeight="900" fill="#fff">{value}</text>
      <text x={cx} y={height - 4} textAnchor="middle" fontSize="10" fontWeight="900" fill={COLORS.navy}>{label}</text>
    </svg>
  );
}

// Half-circle gauge (e.g. runs missed vs runs saved)
export function Gauge({ value, max, label, color = COLORS.red, width = 220, height = 150 }) {
  const r = Math.min(width / 2 - 14, height - 40);
  const cx = width / 2;
  const cy = r + 16;
  const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const pt = (f) => [cx - r * Math.cos(Math.PI * f), cy - r * Math.sin(Math.PI * f)];
  const [ex, ey] = pt(frac);
  const [nx, ny] = [cx - (r - 18) * Math.cos(Math.PI * frac), cy - (r - 18) * Math.sin(Math.PI * frac)];
  return (
    <svg width={width} height={height} fontFamily="Arial, sans-serif">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth="22" />
      {frac > 0 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={color} strokeWidth="22" />}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={COLORS.navy} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={COLORS.navy} />
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="16" fontWeight="900" fill={COLORS.navy}>{value}</text>
      <text x={cx} y={height - 2} textAnchor="middle" fontSize="10" fontWeight="900" fill={COLORS.navy}>{label}</text>
    </svg>
  );
}
