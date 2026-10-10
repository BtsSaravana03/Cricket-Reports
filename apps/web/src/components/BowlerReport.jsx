import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import * as htmlToImage from 'html-to-image';
import pptxgen from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';

const renderInningBarChart = (rows) => {
  if (!rows || rows.length === 0) return <div className="text-xs text-slate-500 text-center py-20">No inning bowling data available</div>;

  const chartHeight = 190;
  const chartWidth = 740;
  const paddingLeft = 60;
  const paddingBottom = 32;
  const paddingTop = 18;
  const paddingRight = 20;

  const drawWidth = chartWidth - paddingLeft - paddingRight;
  const drawHeight = chartHeight - paddingTop - paddingBottom;

  let maxVal = 0;
  rows.forEach(r => {
    const innVal = Number(r.innId) || 1;
    const runsVal = Number(r.runs) || 0;
    const wktVal = Number(r.wkt) || 0;
    const ecoVal = parseFloat(r.eco) || 0;

    if (innVal > maxVal) maxVal = innVal;
    if (runsVal > maxVal) maxVal = runsVal;
    if (wktVal > maxVal) maxVal = wktVal;
    if (ecoVal > maxVal) maxVal = ecoVal;
  });
  if (maxVal === 0) maxVal = 10;
  maxVal = Math.ceil(maxVal * 1.15);

  const numGroups = rows.length;
  const groupWidth = drawWidth / numGroups;
  const barWidth = Math.min(22, (groupWidth - 24) / 4);

  const gridSteps = 4;
  const gridLines = [];
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxVal * (i / gridSteps)).toFixed(2);
    const y = paddingTop + drawHeight - (drawHeight * (i / gridSteps));
    gridLines.push({ val, y });
  }

  return (
    <div className="w-full flex flex-col items-center">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {gridLines.map((gl, idx) => (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={gl.y}
              x2={chartWidth - paddingRight}
              y2={gl.y}
              stroke="#1e293b"
              strokeDasharray="3 3"
            />
            <text
              x={paddingLeft - 8}
              y={gl.y + 4}
              fill="#94a3b8"
              fontSize="10"
              textAnchor="end"
              fontWeight="bold"
            >
              {gl.val}
            </text>
          </g>
        ))}

        <text
          x={-(paddingTop + drawHeight / 2)}
          y={16}
          fill="#64748b"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          transform="rotate(-90)"
        >
          Runs Conceded / Bowling Metrics
        </text>

        {rows.map((r, gIdx) => {
          const groupCenterX = paddingLeft + (gIdx * groupWidth) + (groupWidth / 2);
          const innVal = Number(r.innId) || 1;
          const runsVal = Number(r.runs) || 0;
          const wktVal = Number(r.wkt) || 0;
          const ecoVal = parseFloat(r.eco) || 0;

          const hInn = (innVal / maxVal) * drawHeight;
          const hRuns = (runsVal / maxVal) * drawHeight;
          const hWkt = (wktVal / maxVal) * drawHeight;
          const hEco = (ecoVal / maxVal) * drawHeight;

          const yInn = paddingTop + drawHeight - hInn;
          const yRuns = paddingTop + drawHeight - hRuns;
          const yWkt = paddingTop + drawHeight - hWkt;
          const yEco = paddingTop + drawHeight - hEco;

          const xInn = groupCenterX - (barWidth * 2) - 3;
          const xRuns = groupCenterX - (barWidth * 1) - 1;
          const xWkt = groupCenterX + 1;
          const xEco = groupCenterX + (barWidth * 1) + 3;

          const labelText = r.innName ? r.innName.split(' ')[0].toUpperCase() : `${r.innId}ND`;

          return (
            <g key={gIdx}>
              {/* INN Bar (Cyan) */}
              <rect
                x={xInn}
                y={yInn}
                width={barWidth}
                height={Math.max(2, hInn)}
                fill="#38bdf8"
                rx="3"
              />
              <text x={xInn + barWidth / 2} y={yInn - 4} fill="#38bdf8" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                {innVal}
              </text>

              {/* Runs Conceded Bar (Amber) */}
              <rect
                x={xRuns}
                y={yRuns}
                width={barWidth}
                height={Math.max(2, hRuns)}
                fill="#f59e0b"
                rx="3"
              />
              <text x={xRuns + barWidth / 2} y={yRuns - 4} fill="#f59e0b" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                {runsVal}
              </text>

              {/* Wickets Bar (Emerald Green) */}
              <rect
                x={xWkt}
                y={yWkt}
                width={barWidth}
                height={Math.max(2, hWkt)}
                fill="#22c55e"
                rx="3"
              />
              <text x={xWkt + barWidth / 2} y={yWkt - 4} fill="#22c55e" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                {wktVal}
              </text>

              {/* Eco Bar (Purple) */}
              <rect
                x={xEco}
                y={yEco}
                width={barWidth}
                height={Math.max(2, hEco)}
                fill="#8b5cf6"
                rx="3"
              />
              <text x={xEco + barWidth / 2} y={yEco - 4} fill="#8b5cf6" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                {r.eco}
              </text>

              {/* Inning Group Label (e.g. 2ND, 4TH) */}
              <text
                x={groupCenterX}
                y={paddingTop + drawHeight + 16}
                fill="#f8fafc"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <span className="w-3 h-3 rounded-xs bg-[#38bdf8] inline-block" /> INN
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <span className="w-3 h-3 rounded-xs bg-[#f59e0b] inline-block" /> Runs Conceded
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <span className="w-3 h-3 rounded-xs bg-[#22c55e] inline-block" /> Wickets
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <span className="w-3 h-3 rounded-xs bg-[#8b5cf6] inline-block" /> Eco
        </div>
      </div>
    </div>
  );
};

const renderBattingTypeBarChart = (comfortRows) => {
  const chartWidth = 220;
  const chartHeight = 200;
  const paddingTop = 25;
  const paddingBottom = 40;
  const paddingLeft = 35;
  const paddingRight = 15;

  const drawHeight = chartHeight - paddingTop - paddingBottom;
  const drawWidth = chartWidth - paddingLeft - paddingRight;

  const maxVal = Math.max(10, ...comfortRows.map(r => r.runs || 0)) * 1.25;
  const groupWidth = drawWidth / comfortRows.length;
  const barWidth = 36;

  const gridSteps = 4;
  const gridLines = [];
  for (let i = 0; i <= gridSteps; i++) {
    const val = Math.round((maxVal * i) / gridSteps);
    const y = paddingTop + drawHeight - (drawHeight * i) / gridSteps;
    gridLines.push({ val, y });
  }

  return (
    <div className="flex flex-col items-center w-full">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {gridLines.map((gl, idx) => (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={gl.y}
              x2={chartWidth - paddingRight}
              y2={gl.y}
              stroke="#1e293b"
              strokeDasharray="3 3"
            />
            <text
              x={paddingLeft - 6}
              y={gl.y + 4}
              fill="#94a3b8"
              fontSize="9"
              textAnchor="end"
              fontWeight="bold"
            >
              {gl.val}
            </text>
          </g>
        ))}

        <text
          x={-(paddingTop + drawHeight / 2)}
          y={12}
          fill="#64748b"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
          transform="rotate(-90)"
        >
          Runs Conceded
        </text>

        {comfortRows.map((r, gIdx) => {
          const groupCenterX = paddingLeft + (gIdx * groupWidth) + (groupWidth / 2);
          const val = Number(r.runs) || 0;
          const barH = (val / maxVal) * drawHeight;
          const barY = paddingTop + drawHeight - barH;
          const barX = groupCenterX - barWidth / 2;

          return (
            <g key={gIdx}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={Math.max(2, barH)}
                fill="#2563eb"
                rx="4"
              />
              <text
                x={groupCenterX}
                y={barY - 5}
                fill="#ffffff"
                fontSize="11"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                {val}
              </text>
              <rect
                x={groupCenterX - 22}
                y={paddingTop + drawHeight + 8}
                width="44"
                height="20"
                fill="#334155"
                rx="3"
              />
              <text
                x={groupCenterX}
                y={paddingTop + drawHeight + 22}
                fill="#f8fafc"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {r.hand}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const renderDonutChart = (composition) => {
  const slices = [
    { label: "1's", value: (composition.ones || 0) * 1, color: '#38bdf8' },
    { label: "2's", value: (composition.twos || 0) * 2, color: '#8b5cf6' },
    { label: "3's", value: (composition.threes || 0) * 3, color: '#22c55e' },
    { label: "4's", value: (composition.fours || 0) * 4, color: '#f59e0b' },
    { label: "6's", value: (composition.sixes || 0) * 6, color: '#ef4444' }
  ];

  const totalRuns = slices.reduce((acc, s) => acc + s.value, 0);

  const size = 160;
  const strokeWidth = 28;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;

  const paths = slices.map(s => {
    const fraction = totalRuns > 0 ? s.value / totalRuns : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -((currentAngle + 90) / 360) * circumference;
    currentAngle += fraction * 360;

    return {
      ...s,
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div className="flex flex-col items-center justify-between w-full h-full">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {totalRuns > 0 && paths.map((p, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={p.color}
              strokeWidth={strokeWidth}
              strokeDasharray={p.strokeDasharray}
              strokeDashoffset={p.strokeDashoffset}
              className="transition-all duration-500"
            />
          ))}
        </svg>

        {/* Center Text inside Donut */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          <span className="text-xl font-black text-white tracking-tight">{totalRuns}</span>
        </div>
      </div>

      {/* Donut Legend at bottom */}
      <div className="flex items-center justify-center gap-2 mt-2 flex-wrap text-[10px] font-bold text-slate-300">
        {slices.map((s, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderComfortHorizontalBarChart = (comfortRows) => {
  const chartWidth = 230;
  const chartHeight = 160;
  const paddingTop = 15;
  const paddingBottom = 25;
  const paddingLeft = 40;
  const paddingRight = 35;

  const drawWidth = chartWidth - paddingLeft - paddingRight;

  const maxVal = Math.max(
    5,
    ...comfortRows.map(r => parseFloat(r.overs) || 0),
    ...comfortRows.map(r => r.wkt || 0)
  ) * 1.25;

  const rowHeight = 55;

  return (
    <div className="flex flex-col items-center w-full h-full justify-between">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {comfortRows.map((r, idx) => {
          const yBase = paddingTop + (idx * rowHeight);
          const oversVal = parseFloat(r.overs) || 0;
          const wktVal = Number(r.wkt) || 0;

          const oversW = (oversVal / maxVal) * drawWidth;
          const wktW = (wktVal / maxVal) * drawWidth;

          return (
            <g key={idx}>
              {/* Row Label (RHB / LHB) */}
              <text
                x={paddingLeft - 6}
                y={yBase + 22}
                fill="#f8fafc"
                fontSize="10"
                fontWeight="extrabold"
                textAnchor="end"
              >
                {r.hand}
              </text>

              {/* Overs Horizontal Bar (Teal) */}
              <rect
                x={paddingLeft}
                y={yBase + 2}
                width={Math.max(3, oversW)}
                height="15"
                fill="#0d9488"
                rx="3"
              />
              <text
                x={paddingLeft + Math.max(3, oversW) + 5}
                y={yBase + 14}
                fill="#2dd4bf"
                fontSize="10"
                fontWeight="extrabold"
              >
                {r.overs}
              </text>

              {/* Wickets Horizontal Bar (Blue) */}
              <rect
                x={paddingLeft}
                y={yBase + 22}
                width={Math.max(3, wktW)}
                height="15"
                fill="#3b82f6"
                rx="3"
              />
              <text
                x={paddingLeft + Math.max(3, wktW) + 5}
                y={yBase + 34}
                fill="#60a5fa"
                fontSize="10"
                fontWeight="extrabold"
              >
                {wktVal}
              </text>
            </g>
          );
        })}

        {/* X-axis title at bottom */}
        <text
          x={paddingLeft + drawWidth / 2}
          y={chartHeight - 5}
          fill="#64748b"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
        >
          Overs / Wickets
        </text>
      </svg>

      {/* Bottom Legend */}
      <div className="flex items-center justify-center gap-4 mt-1 text-[10px] font-bold text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#0d9488] inline-block" />
          <span>Overs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#3b82f6] inline-block" />
          <span>Wickets</span>
        </div>
      </div>
    </div>
  );
};

const renderBoundaryRatioBarChart = (stat) => {
  const chartWidth = 740;
  const chartHeight = 270;
  const paddingTop = 30;
  const paddingBottom = 40;
  const paddingLeft = 55;
  const paddingRight = 20;

  const drawWidth = chartWidth - paddingLeft - paddingRight;
  const drawHeight = chartHeight - paddingTop - paddingBottom;

  const ballValues = [
    stat.ball1 || 0,
    stat.ball2 || 0,
    stat.ball3 || 0,
    stat.ball4 || 0,
    stat.ball5 || 0,
    stat.ball6 || 0
  ];
  const barColors = ['#2563eb', '#22c55e', '#d97706', '#dc2626', '#8b5cf6', '#0d9488'];

  const maxVal = Math.max(6, ...ballValues) * 1.2;
  const groupWidth = drawWidth / 6;
  const barWidth = Math.min(54, groupWidth - 28);

  const gridSteps = 6;
  const gridLines = [];
  for (let i = 0; i <= gridSteps; i++) {
    const val = Math.round((maxVal * i) / gridSteps);
    const y = paddingTop + drawHeight - (drawHeight * i) / gridSteps;
    gridLines.push({ val, y });
  }

  return (
    <div className="w-full flex flex-col items-center">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {gridLines.map((gl, idx) => (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={gl.y}
              x2={chartWidth - paddingRight}
              y2={gl.y}
              stroke="#1e293b"
              strokeDasharray="3 3"
            />
            <text
              x={paddingLeft - 8}
              y={gl.y + 4}
              fill="#94a3b8"
              fontSize="10"
              textAnchor="end"
              fontWeight="bold"
            >
              {gl.val}
            </text>
          </g>
        ))}

        <text
          x={-(paddingTop + drawHeight / 2)}
          y={16}
          fill="#94a3b8"
          fontSize="11"
          fontWeight="bold"
          textAnchor="middle"
          transform="rotate(-90)"
        >
          Boundary Count
        </text>

        {ballValues.map((val, bIdx) => {
          const groupCenterX = paddingLeft + (bIdx * groupWidth) + (groupWidth / 2);
          const barH = (val / maxVal) * drawHeight;
          const barY = paddingTop + drawHeight - barH;
          const barX = groupCenterX - barWidth / 2;
          const color = barColors[bIdx % barColors.length];

          return (
            <g key={bIdx}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={Math.max(2, barH)}
                fill={color}
                rx="6"
              />
              <text
                x={groupCenterX}
                y={barY - 6}
                fill="#ffffff"
                fontSize="12"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                {val}
              </text>

              <text
                x={groupCenterX}
                y={paddingTop + drawHeight + 20}
                fill="#94a3b8"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                Ball {bIdx + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function BowlerReport({
  ballData,
  matchDetails,
  selectedTeamId,
  selectedBowlerId,
  activeBowler,
  activeTeam,
  selectedTemplateId,
  selectedReportType
}) {
  const [previewSlide, setPreviewSlide] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [graphicsData, setGraphicsData] = useState({
    pitchmapSvg: '',
    wwregionSvg: '',
    beatenPitchmapSvg: '',
    loading: false
  });
  const [phaseGraphicsMap, setPhaseGraphicsMap] = useState({});

  const seriesTitle = (matchDetails?.CompFullName || matchDetails?.CompPrefix || 'SEASON 2025-26').toUpperCase();
  const safeName = (activeBowler?.name || 'Bowler').replace(/[^a-zA-Z0-9]/g, '_');
  
  const opponentName = (activeTeam?.name === matchDetails?.ClubAFull || activeTeam?.name === matchDetails?.ClubAPrefix ? (matchDetails?.ClubBFull || matchDetails?.ClubBPrefix) : (matchDetails?.ClubAFull || matchDetails?.ClubAPrefix)) || 'OPPONENT';
  const matchLocation = (matchDetails?.City || matchDetails?.StadiumName || matchDetails?.Venue || 'VENUE').toUpperCase();
  const roundText = matchDetails?.CompFullName || (matchDetails?.Round ? `ROUND - ${matchDetails.Round}` : (matchDetails?.CompPrefix || 'SERIES 2026'));
  const matchTitle = `${roundText} VS ${opponentName.toUpperCase()} AT ${matchLocation}.`;

  // Filter deliveries for selected bowler
  const bowlerBalls = useMemo(() => {
    if (!ballData || !selectedBowlerId) return [];
    return ballData.filter(b => String(b.BowlerID || b.BOWLERID || b.BowlerId) === String(selectedBowlerId));
  }, [ballData, selectedBowlerId]);

  // Calculate Phase-Wise Bowling Statistics
  const bowlerPhaseStats = useMemo(() => {
    if (!bowlerBalls || bowlerBalls.length === 0) {
      return { phases: [], currentMatchCategory: 'UNKNOWN' };
    }

    const matchTypeId = bowlerBalls[0]?.MatchTypeID || matchDetails?.MatchTypeID || 2;
    const odiTypes = [2, 5, 9, 12, 15, 18, 21, 27, 30, 33, 36, 38, 56];
    const t20Types = [3, 6, 7, 10, 13, 16, 19, 22, 28, 31, 34, 37, 39, 40, 41, 42, 43, 44, 45, 50, 51, 53, 54, 55, 91];

    let matchCategory = 'TEST';
    if (odiTypes.includes(Number(matchTypeId))) {
      matchCategory = 'ODI';
    } else if (t20Types.includes(Number(matchTypeId))) {
      matchCategory = 'T20';
    }

    const getPhaseLabel = (b) => {
      const over = b.OverId !== undefined && b.OverId !== null ? Number(b.OverId) : Math.floor(Number(b.Overs || 0));
      if (matchCategory === 'ODI') {
        if (over >= 1 && over <= 10) return '01-10 OVERS';
        if (over >= 11 && over <= 20) return '11-20 OVERS';
        if (over >= 21 && over <= 30) return '21-30 OVERS';
        if (over >= 31 && over <= 40) return '31-40 OVERS';
        if (over >= 41 && over <= 50) return '41-50 OVERS';
        return '41-50 OVERS';
      } else if (matchCategory === 'T20') {
        if (over >= 1 && over <= 6) return '01-06 OVERS';
        if (over >= 7 && over <= 10) return '07-10 OVERS';
        if (over >= 11 && over <= 15) return '11-15 OVERS';
        if (over >= 16 && over <= 20) return '16-20 OVERS';
        return '16-20 OVERS';
      } else {
        if (over >= 1 && over <= 25) return '1-25 OVERS (NEW BALL)';
        if (over >= 26 && over <= 60) return '26-60 OVERS (SEMI NEW BALL)';
        if (over >= 61 && over <= 80) return '61-80 OVERS (OLD BALL)';
        return '81+ OVERS (SECOND NEW BALL)';
      }
    };

    let phaseOrder = [];
    if (matchCategory === 'ODI') {
      phaseOrder = ['01-10 OVERS', '11-20 OVERS', '21-30 OVERS', '31-40 OVERS', '41-50 OVERS'];
    } else if (matchCategory === 'T20') {
      phaseOrder = ['01-06 OVERS', '07-10 OVERS', '11-15 OVERS', '16-20 OVERS'];
    } else {
      phaseOrder = ['1-25 OVERS (NEW BALL)', '26-60 OVERS (SEMI NEW BALL)', '61-80 OVERS (OLD BALL)', '81+ OVERS (SECOND NEW BALL)'];
    }

    const phaseMap = new Map();
    phaseOrder.forEach(p => phaseMap.set(p, []));

    bowlerBalls.forEach(b => {
      const label = getPhaseLabel(b);
      if (!phaseMap.has(label)) {
        phaseMap.set(label, []);
      }
      phaseMap.get(label).push(b);
    });

    const phases = [];

    phaseMap.forEach((ballsInPhase, phaseName) => {
      if (ballsInPhase.length === 0) return;

      const innsSet = new Set();
      let runs = 0;
      let balls = 0;
      let wkt = 0;
      let dots = 0;
      let ones = 0;
      let twos = 0;
      let threes = 0;
      let fours = 0;
      let sixes = 0;
      let wides = 0;
      let noBalls = 0;

      const innBreakdownMap = new Map();

      ballsInPhase.forEach(b => {
        const innId = b.InningsId !== undefined && b.InningsId !== null ? b.InningsId : (b.InningsID || 1);
        innsSet.add(innId);

        const r = Number(b.Bowlruns !== undefined ? b.Bowlruns : (b.Runs || 0));
        runs += r;

        const isLegalBall = b.Bowlballs === 1 || b.Bowlballs === true || b.BowlBalls === 1;
        if (isLegalBall) {
          balls += 1;
        }

        const isWkt = b.Bowlwkts === 1 || b.Bowlwkts === true || Number(b.Dismissal) === 1 || b.IsWicket === 1;
        if (isWkt) wkt += 1;

        if (r === 0) dots += 1;
        else if (r === 1) ones += 1;
        else if (r === 2) twos += 1;
        else if (r === 3) threes += 1;
        else if (r === 4 || b.isFour) fours += 1;
        else if (r === 6 || b.isSix) sixes += 1;

        if (b.Wide === 1 || b.WideRuns > 0) wides += 1;
        
        let isNb = false;
        let nbCount = 0;
        if (b.ExtraTypeId === 1 || b.ExtraTypeId === 5 || b.ExtraTypeId === 6) {
          isNb = true;
          nbCount = b.ExtraTypeId === 1 ? (Number(b.Extras !== undefined ? b.Extras : (b.ExtraRuns !== undefined ? b.ExtraRuns : 1)) || 1) : 1;
        } else if (b.NoBall === 1 || b.NoBallRuns > 0) {
          isNb = true;
          nbCount = 1;
        }
        if (isNb) noBalls += nbCount;

        const innKey = `Inning_${innId}`;
        if (!innBreakdownMap.has(innKey)) {
          innBreakdownMap.set(innKey, {
            matchName: `${matchDetails?.ClubAPrefix || 'TeamA'}_vs_${matchDetails?.ClubBPrefix || 'TeamB'}`,
            innId: innId,
            runs: 0,
            balls: 0,
            wkt: 0,
            dots: 0,
            ones: 0,
            twos: 0,
            threes: 0,
            fours: 0,
            sixes: 0,
            wides: 0,
            noBalls: 0
          });
        }
        const item = innBreakdownMap.get(innKey);
        item.runs += r;
        if (isLegalBall) item.balls += 1;
        if (isWkt) item.wkt += 1;
        if (r === 0) item.dots += 1;
        else if (r === 1) item.ones += 1;
        else if (r === 2) item.twos += 1;
        else if (r === 3) item.threes += 1;
        else if (r === 4 || b.isFour) item.fours += 1;
        else if (r === 6 || b.isSix) item.sixes += 1;
        if (b.Wide === 1 || b.WideRuns > 0) item.wides += 1;
        if (isNb) item.noBalls += nbCount;
      });

      let twosWktPlus = 0;
      let threesWktPlus = 0;
      let fivesWktPlus = 0;

      const matchRows = Array.from(innBreakdownMap.values()).map(m => {
        if (m.wkt >= 2) twosWktPlus += 1;
        if (m.wkt >= 3) threesWktPlus += 1;
        if (m.wkt >= 5) fivesWktPlus += 1;

        const overs = `${Math.floor(m.balls / 6)}.${m.balls % 6}`;
        const eco = m.balls > 0 ? ((m.runs / m.balls) * 6).toFixed(2) : '0.00';

        return {
          ...m,
          overs,
          eco
        };
      });

      const overs = `${Math.floor(balls / 6)}.${balls % 6}`;
      const eco = balls > 0 ? ((runs / balls) * 6).toFixed(1) : '0.0';
      const avg = wkt > 0 ? (runs / wkt).toFixed(1) : runs.toFixed(1);

      phases.push({
        phaseName,
        ballsInPhase,
        summary: {
          inns: innsSet.size,
          wkt,
          runs,
          balls,
          overs,
          eco,
          sb: dots,
          dots,
          ones,
          twos,
          threes,
          fours,
          sixes,
          avg,
          twosWktPlus,
          threesWktPlus,
          fivesWktPlus
        },
        matchRows
      });
    });

    return { phases, currentMatchCategory: matchCategory };
  }, [bowlerBalls, matchDetails]);

  // Fetch phase graphics for bowler deliveries in each phase
  useEffect(() => {
    if (!bowlerPhaseStats.phases || bowlerPhaseStats.phases.length === 0) return;

    const mTitle = `${matchDetails?.ClubAPrefix || 'TeamA'} vs ${matchDetails?.ClubBPrefix || 'TeamB'}`;

    const mapBallToPayload = (b) => ({
      Match: mTitle,
      MatchID: String(b.MatchId),
      MatchTypeID: b.MatchTypeID !== undefined && b.MatchTypeID !== null ? b.MatchTypeID : 2,
      InningsID: b.InningsId !== undefined && b.InningsId !== null ? b.InningsId : 1,
      BallID: b.BallId !== undefined ? b.BallId : null,
      Overs: b.Overs !== undefined ? b.Overs : null,
      BatType: b.StBattingTypeID !== undefined && b.StBattingTypeID !== null ? b.StBattingTypeID : (b.BatTypeID !== undefined ? b.BatTypeID : null),
      BatBalls: b.Batballs !== undefined ? b.Batballs : null,
      IsFour: b.isFour !== undefined ? b.isFour : (b.Runs === 4 ? 1 : 0),
      IsSix: b.isSix !== undefined ? b.isSix : (b.Runs === 6 ? 1 : 0),
      Runs: b.Runs !== undefined ? b.Runs : 0,
      BowlBalls: b.Bowlballs !== undefined ? b.Bowlballs : null,
      Dismissal: b.Dismissal !== undefined ? b.Dismissal : 0,
      PaceorSpinDesc: b.SpinOrPace === 1 ? 'pace' : (b.SpinOrPace === 2 ? 'spin' : 'pace'),
      LengthX: b.PM_X !== undefined && b.PM_X !== null ? b.PM_X : 1,
      LengthY: b.PM_Y !== undefined && b.PM_Y !== null ? b.PM_Y : 1,
      HeightX: b.SZ_X !== undefined && b.SZ_X !== null ? b.SZ_X : 1,
      HeightY: b.SZ_Y !== undefined && b.SZ_Y !== null ? b.SZ_Y : 1,
      wwRegion_6: b.WWRegion_6 !== undefined && b.WWRegion_6 !== null ? b.WWRegion_6 : 1,
      wwRegion_8: b.WWRegion_8 !== undefined && b.WWRegion_8 !== null ? b.WWRegion_8 : 1,
      wwRegion_16: b.WWRegion_16 !== undefined && b.WWRegion_16 !== null ? b.WWRegion_16 : 1,
      wagonWheelX: b.WagonWheelX !== undefined && b.WagonWheelX !== null ? b.WagonWheelX : 1,
      wagonWheelY: b.WagonWheelY !== undefined && b.WagonWheelY !== null ? b.WagonWheelY : 1
    });

    const GRAPHICS_BASE = 'https://cloud.cricket-21.com/GraphicsApi/api';

    bowlerPhaseStats.phases.forEach(async (p) => {
      try {
        const validBallsInPhase = p.ballsInPhase.filter(b => b.Bowlballs === 1 || b.Bowlballs === true || b.BowlBalls === 1);
        const mappedBalls = validBallsInPhase.map(mapBallToPayload);
        const pitchPayload = {
          title: "pitchmap",
          type: "svg",
          scale: 50,
          view: "1",
          region: 8,
          template: 2,
          clientid: 1,
          isHawk: 0,
          balls: mappedBalls
        };
        const wwPayload = {
          title: "WW Region",
          type: "svg",
          scale: 50,
          view: "1",
          region: 8,
          template: 2,
          clientid: 1,
          isHawk: 0,
          balls: mappedBalls
        };

        const [pitchRes, wwRes] = await Promise.all([
          axios.post(`${GRAPHICS_BASE}/pitchmap`, pitchPayload, { headers: { 'Content-Type': 'application/json' } }).catch(() => null),
          axios.post(`${GRAPHICS_BASE}/wwregion`, wwPayload, { headers: { 'Content-Type': 'application/json' } }).catch(() => null)
        ]);

        let pitchSvg = '';
        if (typeof pitchRes?.data === 'string') pitchSvg = pitchRes.data;
        else if (pitchRes?.data?.svg) pitchSvg = pitchRes.data.svg;
        else if (pitchRes?.data?.data) pitchSvg = pitchRes.data.data;

        let wwSvg = '';
        if (typeof wwRes?.data === 'string') wwSvg = wwRes.data;
        else if (wwRes?.data?.svg) wwSvg = wwRes.data.svg;
        else if (wwRes?.data?.data) wwSvg = wwRes.data.data;

        if (typeof pitchSvg === 'string' && pitchSvg.startsWith('"') && pitchSvg.endsWith('"')) {
          try { pitchSvg = JSON.parse(pitchSvg); } catch (e) { }
        }
        if (typeof wwSvg === 'string' && wwSvg.startsWith('"') && wwSvg.endsWith('"')) {
          try { wwSvg = JSON.parse(wwSvg); } catch (e) { }
        }

        setPhaseGraphicsMap(prev => ({
          ...prev,
          [p.phaseName]: { pitchSvg, wwSvg }
        }));
      } catch (err) {
        console.error(`Error fetching phase graphics for ${p.phaseName}:`, err);
      }
    });
  }, [bowlerPhaseStats.phases, matchDetails]);

  // Fetch graphics for bowler's deliveries
  useEffect(() => {
    if (!bowlerBalls || bowlerBalls.length === 0) {
      setGraphicsData({ pitchmapSvg: '', wwregionSvg: '', beatenPitchmapSvg: '', loading: false });
      return;
    }

    const fetchGraphics = async () => {
      setGraphicsData(prev => ({ ...prev, loading: true }));
      try {
        const mTitle = `${matchDetails?.ClubAPrefix || 'TeamA'} vs ${matchDetails?.ClubBPrefix || 'TeamB'}`;

        const mapBallToPayload = (b) => ({
          Match: mTitle,
          MatchID: String(b.MatchId),
          MatchTypeID: b.MatchTypeID !== undefined && b.MatchTypeID !== null ? b.MatchTypeID : 2,
          InningsID: b.InningsId !== undefined && b.InningsId !== null ? b.InningsId : 1,
          BallID: b.BallId !== undefined ? b.BallId : null,
          Overs: b.Overs !== undefined ? b.Overs : null,
          BatType: b.StBattingTypeID !== undefined && b.StBattingTypeID !== null ? b.StBattingTypeID : (b.BatTypeID !== undefined ? b.BatTypeID : null),
          BatBalls: b.Batballs !== undefined ? b.Batballs : null,
          IsFour: b.isFour !== undefined ? b.isFour : (b.Runs === 4 ? 1 : 0),
          IsSix: b.isSix !== undefined ? b.isSix : (b.Runs === 6 ? 1 : 0),
          Runs: b.Runs !== undefined ? b.Runs : 0,
          BowlBalls: b.Bowlballs !== undefined ? b.Bowlballs : null,
          Dismissal: b.Dismissal !== undefined ? b.Dismissal : 0,
          PaceorSpinDesc: b.SpinOrPace === 1 ? 'pace' : (b.SpinOrPace === 2 ? 'spin' : 'pace'),
          LengthX: b.PM_X !== undefined && b.PM_X !== null ? b.PM_X : 1,
          LengthY: b.PM_Y !== undefined && b.PM_Y !== null ? b.PM_Y : 1,
          HeightX: b.SZ_X !== undefined && b.SZ_X !== null ? b.SZ_X : 1,
          HeightY: b.SZ_Y !== undefined && b.SZ_Y !== null ? b.SZ_Y : 1,
          wwRegion_6: b.WWRegion_6 !== undefined && b.WWRegion_6 !== null ? b.WWRegion_6 : 1,
          wwRegion_8: b.WWRegion_8 !== undefined && b.WWRegion_8 !== null ? b.WWRegion_8 : 1,
          wwRegion_16: b.WWRegion_16 !== undefined && b.WWRegion_16 !== null ? b.WWRegion_16 : 1,
          wagonWheelX: b.WagonWheelX !== undefined && b.WagonWheelX !== null ? b.WagonWheelX : 1,
          wagonWheelY: b.WagonWheelY !== undefined && b.WagonWheelY !== null ? b.WagonWheelY : 1
        });

        const validBowlerBalls = bowlerBalls.filter(b => b.Bowlballs === 1 || b.Bowlballs === true || b.BowlBalls === 1);
        const mappedBalls = validBowlerBalls.map(mapBallToPayload);

        // Filter for Beaten, Uncomfortable, and Dismissals
        const beatenUncomfortableBalls = validBowlerBalls.filter((b) => {
          const isBeaten = String(b.BatSubject) === '5';
          const isUncomfortable = b.Batsman ? String(b.Batsman).split(',').map(s => s.trim()).includes('5') : false;
          const isDismissal = b.Dismissal === 1 || b.Bowlwkts === 1 || b.Bowlwkts === true || b.IsWicket === 1;
          return isBeaten || isUncomfortable || isDismissal;
        });

        const mappedBeatenBalls = beatenUncomfortableBalls.map(mapBallToPayload);

        const pitchPayload = {
          title: "pitchmap",
          type: "svg",
          scale: 50,
          view: "1",
          region: 8,
          template: 2,
          clientid: 1,
          isHawk: 0,
          balls: mappedBalls
        };

        const wwPayload = {
          title: "WW Region",
          type: "svg",
          scale: 50,
          view: "1",
          region: 8,
          template: 2,
          clientid: 1,
          isHawk: 0,
          balls: mappedBalls
        };

        const beatenPitchPayload = {
          title: "pitchmap",
          type: "svg",
          scale: 50,
          view: "1",
          region: 8,
          template: 2,
          clientid: 1,
          isHawk: 0,
          balls: mappedBeatenBalls
        };

        const GRAPHICS_BASE = 'https://cloud.cricket-21.com/GraphicsApi/api';

        const [pitchRes, wwRes, beatenRes] = await Promise.all([
          axios.post(`${GRAPHICS_BASE}/pitchmap`, pitchPayload, { headers: { 'Content-Type': 'application/json' } }).catch(e => {
            console.error('Bowler Pitchmap API error:', e);
            return null;
          }),
          axios.post(`${GRAPHICS_BASE}/wwregion`, wwPayload, { headers: { 'Content-Type': 'application/json' } }).catch(e => {
            console.error('Bowler WWRegion API error:', e);
            return null;
          }),
          axios.post(`${GRAPHICS_BASE}/pitchmap`, beatenPitchPayload, { headers: { 'Content-Type': 'application/json' } }).catch(e => {
            console.error('Bowler Beaten Pitchmap API error:', e);
            return null;
          })
        ]);

        let pitchSvg = '';
        if (typeof pitchRes?.data === 'string') pitchSvg = pitchRes.data;
        else if (pitchRes?.data?.svg) pitchSvg = pitchRes.data.svg;
        else if (pitchRes?.data?.data) pitchSvg = pitchRes.data.data;
        else if (pitchRes?.data) pitchSvg = JSON.stringify(pitchRes.data);

        let wwSvg = '';
        if (typeof wwRes?.data === 'string') wwSvg = wwRes.data;
        else if (wwRes?.data?.svg) wwSvg = wwRes.data.svg;
        else if (wwRes?.data?.data) wwSvg = wwRes.data.data;
        else if (wwRes?.data) wwSvg = JSON.stringify(wwRes.data);

        let beatenSvg = '';
        if (typeof beatenRes?.data === 'string') beatenSvg = beatenRes.data;
        else if (beatenRes?.data?.svg) beatenSvg = beatenRes.data.svg;
        else if (beatenRes?.data?.data) beatenSvg = beatenRes.data.data;
        else if (beatenRes?.data) beatenSvg = JSON.stringify(beatenRes.data);

        if (typeof pitchSvg === 'string' && pitchSvg.startsWith('"') && pitchSvg.endsWith('"')) {
          try { pitchSvg = JSON.parse(pitchSvg); } catch (e) { }
        }
        if (typeof wwSvg === 'string' && wwSvg.startsWith('"') && wwSvg.endsWith('"')) {
          try { wwSvg = JSON.parse(wwSvg); } catch (e) { }
        }
        if (typeof beatenSvg === 'string' && beatenSvg.startsWith('"') && beatenSvg.endsWith('"')) {
          try { beatenSvg = JSON.parse(beatenSvg); } catch (e) { }
        }

        setGraphicsData({ pitchmapSvg: pitchSvg, wwregionSvg: wwSvg, beatenPitchmapSvg: beatenSvg, loading: false });
      } catch (err) {
        console.error('Error fetching bowler graphics:', err);
        setGraphicsData({ pitchmapSvg: '', wwregionSvg: '', beatenPitchmapSvg: '', loading: false });
      }
    };

    fetchGraphics();
  }, [bowlerBalls, matchDetails]);

  // Calculate Inning-Wise Bowling Statistics
  const bowlerInningStats = useMemo(() => {
    if (bowlerBalls.length === 0) {
      return { rows: [], total: { inningsCount: 0, overs: '0.0', runs: 0, wkt: 0, eco: '0.00', avg: '0.00', sr: '0.00', dots: 0, fours: 0, sixes: 0 } };
    }

    const inningsMap = new Map();

    bowlerBalls.forEach(b => {
      const innId = b.InningsId !== undefined && b.InningsId !== null ? b.InningsId : (b.InningsID || 1);
      const innName = `${innId}${innId === 1 ? 'st' : innId === 2 ? 'nd' : innId === 3 ? 'rd' : 'th'} Innings`;

      if (!inningsMap.has(innId)) {
        inningsMap.set(innId, {
          innId,
          innName,
          validBalls: 0,
          runs: 0,
          wkt: 0,
          dots: 0,
          fours: 0,
          sixes: 0
        });
      }

      const inn = inningsMap.get(innId);

      if (b.Bowlballs === 1 || b.Bowlballs === true) {
        inn.validBalls += 1;
      }

      const r = Number(b.Bowlruns !== undefined ? b.Bowlruns : (b.Runs || 0));
      inn.runs += r;

      if (b.Bowlwkts === 1 || b.Bowlwkts === true || Number(b.Dismissal) === 1 || b.IsWicket === 1) {
        inn.wkt += 1;
      }

      if (r === 0) {
        inn.dots += 1;
      } else if (r === 4) {
        inn.fours += 1;
      } else if (r === 6) {
        inn.sixes += 1;
      }
    });

    let totalValidBalls = 0;
    let totalRuns = 0;
    let totalWkt = 0;
    let totalDots = 0;
    let totalFours = 0;
    let totalSixes = 0;

    const rows = Array.from(inningsMap.values()).map(inn => {
      totalValidBalls += inn.validBalls;
      totalRuns += inn.runs;
      totalWkt += inn.wkt;
      totalDots += inn.dots;
      totalFours += inn.fours;
      totalSixes += inn.sixes;

      const overs = `${Math.floor(inn.validBalls / 6)}.${inn.validBalls % 6}`;
      const eco = inn.validBalls > 0 ? ((inn.runs / inn.validBalls) * 6).toFixed(2) : '0.00';
      const avg = inn.wkt > 0 ? (inn.runs / inn.wkt).toFixed(2) : inn.runs.toFixed(2);
      const sr = inn.wkt > 0 ? (inn.validBalls / inn.wkt).toFixed(2) : '0.00';

      return {
        ...inn,
        overs,
        eco,
        avg,
        sr
      };
    });

    const totalOvers = `${Math.floor(totalValidBalls / 6)}.${totalValidBalls % 6}`;
    const totalEco = totalValidBalls > 0 ? ((totalRuns / totalValidBalls) * 6).toFixed(2) : '0.00';
    const totalAvg = totalWkt > 0 ? (totalRuns / totalWkt).toFixed(2) : totalRuns.toFixed(2);
    const totalSr = totalWkt > 0 ? (totalValidBalls / totalWkt).toFixed(2) : '0.00';

    const total = {
      inningsCount: rows.length,
      overs: totalOvers,
      runs: totalRuns,
      wkt: totalWkt,
      eco: totalEco,
      avg: totalAvg,
      sr: totalSr,
      dots: totalDots,
      fours: totalFours,
      sixes: totalSixes
    };

    return { rows, total };
  }, [bowlerBalls]);

  // Calculate Order-Wise Bowling Statistics (Batting Order, Batter Hand Comfort, Runs Conceded Composition)
  const bowlerOrderWiseStats = useMemo(() => {
    if (!bowlerBalls || bowlerBalls.length === 0) {
      return {
        orderRows: [
          { orderName: 'Top Order', overs: '0.0', wkt: 0, eco: '0.00', avg: '-', sr: '-', runs: 0 },
          { orderName: 'Middle Order', overs: '0.0', wkt: 0, eco: '0.00', avg: '-', sr: '-', runs: 0 },
          { orderName: 'Lower Order', overs: '0.0', wkt: 0, eco: '0.00', avg: '-', sr: '-', runs: 0 }
        ],
        comfortRows: [
          { hand: 'RHB', overs: '0.0', wkt: 0, eco: '0.00', avg: '-', sr: '-' },
          { hand: 'LHB', overs: '0.0', wkt: 0, eco: '0.00', avg: '-', sr: '-' }
        ],
        composition: { ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0 }
      };
    }

    const orderData = {
      'Top Order': { validBalls: 0, runs: 0, wkt: 0 },
      'Middle Order': { validBalls: 0, runs: 0, wkt: 0 },
      'Lower Order': { validBalls: 0, runs: 0, wkt: 0 }
    };

    const comfortData = {
      RHB: { validBalls: 0, runs: 0, wkt: 0 },
      LHB: { validBalls: 0, runs: 0, wkt: 0 }
    };

    const composition = { ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0 };

    bowlerBalls.forEach(b => {
      const isLegal = b.Bowlballs === 1 || b.Bowlballs === true || b.BowlBalls === 1;
      const r = Number(b.Bowlruns !== undefined ? b.Bowlruns : (b.Runs || 0));
      const isWkt = b.Bowlwkts === 1 || b.Bowlwkts === true || Number(b.Dismissal) === 1 || b.IsWicket === 1;

      // 1. Batting Order Grouping
      const pos = Number(
        b.StBattingPositionID !== undefined && b.StBattingPositionID !== null
          ? b.StBattingPositionID
          : (b.BattingPosition !== undefined && b.BattingPosition !== null
            ? b.BattingPosition
            : (b.Position !== undefined && b.Position !== null
              ? b.Position
              : (b.PositionID !== undefined ? b.PositionID : (b.BatPos || 0))))
      );

      let orderGroup = 'Middle Order';
      if (pos >= 1 && pos <= 3) orderGroup = 'Top Order';
      else if (pos >= 4 && pos <= 7) orderGroup = 'Middle Order';
      else if (pos >= 8) orderGroup = 'Lower Order';
      else orderGroup = 'Middle Order';

      const orderItem = orderData[orderGroup];
      if (isLegal) orderItem.validBalls += 1;
      orderItem.runs += r;
      if (isWkt) orderItem.wkt += 1;

      // 2. Batter Hand Comfort Grouping (StBattingTypeID: 1 -> RHB, 2 -> LHB)
      const batType = Number(
        b.StBattingTypeID !== undefined && b.StBattingTypeID !== null
          ? b.StBattingTypeID
          : (b.BatTypeID !== undefined && b.BatTypeID !== null ? b.BatTypeID : 1)
      );

      const hand = batType === 2 ? 'LHB' : 'RHB';
      const handItem = comfortData[hand];
      if (isLegal) handItem.validBalls += 1;
      handItem.runs += r;
      if (isWkt) handItem.wkt += 1;

      // 3. Runs Conceded Composition
      if (r === 1) composition.ones += 1;
      else if (r === 2) composition.twos += 1;
      else if (r === 3) composition.threes += 1;
      else if (r === 4 || b.isFour) composition.fours += 1;
      else if (r === 6 || b.isSix) composition.sixes += 1;
    });

    const formatOrderRow = (orderName, data) => {
      const overs = `${Math.floor(data.validBalls / 6)}.${data.validBalls % 6}`;
      const eco = data.validBalls > 0 ? ((data.runs / data.validBalls) * 6).toFixed(2) : '0.00';
      const avg = data.wkt > 0 ? (data.runs / data.wkt).toFixed(2) : '-';
      const sr = data.wkt > 0 ? (data.validBalls / data.wkt).toFixed(2) : '-';
      return { orderName, overs, wkt: data.wkt, eco, avg, sr, runs: data.runs };
    };

    const formatComfortRow = (hand, data) => {
      const overs = `${Math.floor(data.validBalls / 6)}.${data.validBalls % 6}`;
      const eco = data.validBalls > 0 ? ((data.runs / data.validBalls) * 6).toFixed(2) : '0.00';
      const avg = data.wkt > 0 ? (data.runs / data.wkt).toFixed(2) : '-';
      const sr = data.wkt > 0 ? (data.validBalls / data.wkt).toFixed(2) : '-';
      return { hand, overs, wkt: data.wkt, eco, avg, sr, runs: data.runs, validBalls: data.validBalls };
    };

    return {
      orderRows: [
        formatOrderRow('Top Order', orderData['Top Order']),
        formatOrderRow('Middle Order', orderData['Middle Order']),
        formatOrderRow('Lower Order', orderData['Lower Order'])
      ],
      comfortRows: [
        formatComfortRow('RHB', comfortData['RHB']),
        formatComfortRow('LHB', comfortData['LHB'])
      ],
      composition
    };
  }, [bowlerBalls]);

  // Calculate Boundary Ratio Statistics per distinct Innings
  const bowlerBoundaryRatioStats = useMemo(() => {
    if (!bowlerBalls || bowlerBalls.length === 0) {
      return [
        {
          innId: 1,
          innName: '1st Innings',
          overs: '0.0',
          runs: 0,
          wkts: 0,
          matchesCount: 1,
          ball1: 0,
          ball2: 0,
          ball3: 0,
          ball4: 0,
          ball5: 0,
          ball6: 0,
          total: 0
        }
      ];
    }

    const inningsMap = new Map();

    bowlerBalls.forEach(b => {
      const innId = b.InningsId !== undefined && b.InningsId !== null ? b.InningsId : (b.InningsID || 1);
      if (!inningsMap.has(innId)) {
        inningsMap.set(innId, []);
      }
      inningsMap.get(innId).push(b);
    });

    const inningsList = Array.from(inningsMap.keys()).sort((a, b) => Number(a) - Number(b));

    return inningsList.map(innId => {
      const ballsInInning = inningsMap.get(innId);

      const overMap = new Map();
      ballsInInning.forEach(b => {
        const overKey = b.OverId !== undefined && b.OverId !== null
          ? Number(b.OverId)
          : Math.floor(Number(b.Overs || 0));
        if (!overMap.has(overKey)) {
          overMap.set(overKey, []);
        }
        overMap.get(overKey).push(b);
      });

      let validBalls = 0;
      let totalRuns = 0;
      let totalWkts = 0;
      let ball1 = 0;
      let ball2 = 0;
      let ball3 = 0;
      let ball4 = 0;
      let ball5 = 0;
      let ball6 = 0;
      let totalBoundaries = 0;

      overMap.forEach(deliveriesInOver => {
        deliveriesInOver.forEach((b, idx) => {
          const isLegal = b.Bowlballs === 1 || b.Bowlballs === true || b.BowlBalls === 1;
          if (isLegal) validBalls += 1;

          const r = Number(b.Bowlruns !== undefined ? b.Bowlruns : (b.Runs || 0));
          totalRuns += r;

          const isWkt = b.Bowlwkts === 1 || b.Bowlwkts === true || Number(b.Dismissal) === 1 || b.IsWicket === 1;
          if (isWkt) totalWkts += 1;

          // Check boundary ONLY using b.isFour === 1 || b.isSix === 1 || b.isFour === true || b.isSix === true
          const isBoundary = b.isFour === 1 || b.isFour === true || b.isSix === 1 || b.isSix === true;

          if (isBoundary) {
            totalBoundaries += 1;
            if (idx === 0) ball1 += 1;
            else if (idx === 1) ball2 += 1;
            else if (idx === 2) ball3 += 1;
            else if (idx === 3) ball4 += 1;
            else if (idx === 4) ball5 += 1;
            else if (idx === 5) ball6 += 1;
          }
        });
      });

      const overs = `${Math.floor(validBalls / 6)}.${validBalls % 6}`;
      const innName = `${innId}${innId === 1 ? 'st' : innId === 2 ? 'nd' : innId === 3 ? 'rd' : 'th'} Innings`;

      return {
        innId,
        innName,
        overs,
        runs: totalRuns,
        wkts: totalWkts,
        matchesCount: 1,
        ball1,
        ball2,
        ball3,
        ball4,
        ball5,
        ball6,
        total: totalBoundaries
      };
    });
  }, [bowlerBalls]);

  // Handle PDF & PPTX Download for Bowler Report
  const handleDownload = async (format) => {
    setDownloading(true);
    try {
      if (format === 'pptx') {
        const pptx = typeof pptxgen === 'function' ? new pptxgen() : new pptxgen.default();
        pptx.layout = 'LAYOUT_16x9';

        // -------------------------------------------------------------
        // BOWLER PPTX SLIDE 1: COVER PAGE
        // -------------------------------------------------------------
        const s1 = pptx.addSlide();
        s1.background = { color: 'F6F4EB' };

        // Top-Left L-Corner Frame
        s1.addShape(pptx.shapes.RECTANGLE, {
          x: 0.5, y: 0.5, w: 2.2, h: 0.22, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        s1.addShape(pptx.shapes.RECTANGLE, {
          x: 0.5, y: 0.5, w: 0.22, h: 1.8, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Bottom-Right L-Corner Frame
        s1.addShape(pptx.shapes.RECTANGLE, {
          x: 7.3, y: 4.9, w: 2.2, h: 0.22, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        s1.addShape(pptx.shapes.RECTANGLE, {
          x: 9.28, y: 3.32, w: 0.22, h: 1.8, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Main Title (Bowler Name)
        s1.addText((activeBowler?.name || 'BOWLER').toUpperCase(), {
          x: 1.0, y: 1.8, w: 8.0, h: 1.2,
          fontSize: 40, bold: true, align: 'center', color: '0F172A', fontFace: 'Arial'
        });

        // Subtitles (Style, Team, Series)
        s1.addText(`${(activeBowler?.bwStyle || 'RIGHT ARM MEDIUM PACER').toUpperCase()}\n${(activeTeam?.name || 'TEAM').toUpperCase()}\nIN ${seriesTitle}`, {
          x: 1.0, y: 3.2, w: 8.0, h: 1.4,
          fontSize: 16, bold: true, italic: true, align: 'center', color: '1E293B', fontFace: 'Arial', lineSpacing: 24
        });

        // -------------------------------------------------------------
        // BOWLER PPTX SLIDE 2: BOWLING STATS TABLE
        // -------------------------------------------------------------
        const s2 = pptx.addSlide();
        s2.background = { color: 'F6F4EB' };

        s2.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        s2.addText(matchTitle.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        s2.addText('■  BOWLING STATS', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        s2.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.7, w: 8.8, h: 0.9, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        s2.addText(`${(activeBowler?.name || 'BOWLER').toUpperCase()}\nConsolidated player summary | OVR: ${bowlerInningStats.total.overs} | WK: ${bowlerInningStats.total.wkt} | Runs: ${bowlerInningStats.total.runs} | ECO: ${bowlerInningStats.total.eco}`, {
          x: 0.8, y: 1.8, w: 8.4, h: 0.7,
          fontSize: 11, color: 'FFFFFF', fontFace: 'Arial', bold: true
        });

        const bTableRows = [
          [
            { text: 'Inning', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
            { text: 'INNING', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'OVR', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'RUNS CONCEDED', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'WK', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'ECO', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'AVG', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'SR', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'DOTS', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: '4S', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: '6S', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
          ]
        ];

        bowlerInningStats.rows.forEach(r => {
          bTableRows.push([
            { text: r.innName, options: { align: 'left', color: '1E293B', bold: true } },
            { text: String(r.innId), options: { align: 'center', color: '1E293B' } },
            { text: String(r.overs), options: { align: 'center', color: '1E293B' } },
            { text: String(r.runs), options: { align: 'center', color: '1E293B' } },
            { text: String(r.wkt), options: { align: 'center', color: '1E293B' } },
            { text: String(r.eco), options: { align: 'center', color: '1E293B' } },
            { text: String(r.avg), options: { align: 'center', color: '1E293B' } },
            { text: String(r.sr), options: { align: 'center', color: '1E293B' } },
            { text: String(r.dots), options: { align: 'center', color: '1E293B' } },
            { text: String(r.fours), options: { align: 'center', color: '1E293B' } },
            { text: String(r.sixes), options: { align: 'center', color: '1E293B' } }
          ]);
        });

        bTableRows.push([
          { text: 'Total', options: { align: 'left', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.inningsCount), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.overs), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.runs), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.wkt), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.eco), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.avg), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.sr), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.dots), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.fours), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(bowlerInningStats.total.sixes), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } }
        ]);

        s2.addTable(bTableRows, {
          x: 0.6, y: 2.8, w: 8.8, colW: [1.8, 0.7, 0.7, 1.3, 0.6, 0.7, 0.7, 0.7, 0.6, 0.5, 0.5],
          fontSize: 10, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' }, fill: 'FFFFFF'
        });

        // -------------------------------------------------------------
        // BOWLER PPTX SLIDE 3: BOWLING STATS GRAPHICAL REPRESENTATION
        // -------------------------------------------------------------
        const s3 = pptx.addSlide();
        s3.background = { color: 'F6F4EB' };

        s3.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        s3.addText(matchTitle.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        s3.addText('■  BOWLING STATS GRAPHICAL REPRESENTATION', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        s3.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.7, w: 8.8, h: 0.9, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        s3.addText(`${(activeBowler?.name || 'BOWLER').toUpperCase()}\nConsolidated graphical summary | OVR: ${bowlerInningStats.total.overs} | WK: ${bowlerInningStats.total.wkt} | Runs: ${bowlerInningStats.total.runs} | ECO: ${bowlerInningStats.total.eco}`, {
          x: 0.8, y: 1.8, w: 8.4, h: 0.7,
          fontSize: 11, color: 'FFFFFF', fontFace: 'Arial', bold: true
        });

        if (bowlerInningStats.rows.length > 0) {
          const categories = bowlerInningStats.rows.map(r => r.innName ? r.innName.split(' ')[0].toUpperCase() : `${r.innId}ND`);
          const innData = bowlerInningStats.rows.map(r => r.innId);
          const runsData = bowlerInningStats.rows.map(r => r.runs);
          const wktData = bowlerInningStats.rows.map(r => r.wkt);
          const ecoData = bowlerInningStats.rows.map(r => parseFloat(r.eco));

          const chartSeries = [
            { name: 'INN', labels: categories, values: innData },
            { name: 'Runs Conceded', labels: categories, values: runsData },
            { name: 'Wickets', labels: categories, values: wktData },
            { name: 'Eco', labels: categories, values: ecoData }
          ];

          s3.addChart(pptx.charts.BAR, chartSeries, {
            x: 0.6, y: 2.8, w: 8.8, h: 2.3,
            barDir: 'col',
            chartColors: ['38BDF8', 'F59E0B', '22C55E', '8B5CF6'],
            showLegend: true,
            legendPos: 'b',
            showValue: true
          });
        }

        // -------------------------------------------------------------
        // BOWLER PPTX SLIDE 4: OVER ALL GRAPHICS
        // -------------------------------------------------------------
        const s4 = pptx.addSlide();
        s4.background = { color: 'F6F4EB' };

        s4.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        s4.addText(matchTitle.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        s4.addText('■  OVER ALL', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        s4.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.7, w: 8.8, h: 3.3, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        if (graphicsData.wwregionSvg) {
          s4.addImage({
            data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(graphicsData.wwregionSvg)))}`,
            x: 0.75, y: 1.94, w: 4.15, h: 2.8
          });
        }
        if (graphicsData.pitchmapSvg) {
          s4.addImage({
            data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(graphicsData.pitchmapSvg)))}`,
            x: 5.10, y: 1.94, w: 4.15, h: 2.8
          });
        }

        // -------------------------------------------------------------
        // BOWLER PPTX SLIDE 5: BEATEN, UNCOMFORTABLE & DISMISSAL AREAS
        // -------------------------------------------------------------
        const s5 = pptx.addSlide();
        s5.background = { color: 'F6F4EB' };

        s5.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        s5.addText(matchTitle.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        s5.addText('■  BEATEN , UNCOMFORTABLE & DISMISSAL AREAS', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        s5.addShape(pptx.shapes.RECTANGLE, {
          x: 2.4, y: 1.7, w: 5.2, h: 2.95, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        if (graphicsData.beatenPitchmapSvg) {
          s5.addImage({
            data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(graphicsData.beatenPitchmapSvg)))}`,
            x: 2.7, y: 1.90, w: 4.6, h: 2.55
          });
        }

        // Phase Slides (Stats & Graphics) in PPTX
        bowlerPhaseStats.phases.forEach((p) => {
          // Phase Stats Slide
          const sPhaseStats = pptx.addSlide();
          sPhaseStats.background = { color: 'F6F4EB' };
          sPhaseStats.addShape(pptx.shapes.RECTANGLE, {
            x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
          });
          sPhaseStats.addText(matchTitle.toUpperCase(), {
            x: 0.6, y: 0.5, w: 9.0, h: 0.6,
            fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
          });
          sPhaseStats.addText(`■  PHASE WISE - ( ${p.phaseName} )`, {
            x: 0.6, y: 1.2, w: 9.0, h: 0.4,
            fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
          });

          // Phase Card Summary Box
          sPhaseStats.addShape(pptx.shapes.RECTANGLE, {
            x: 0.6, y: 1.7, w: 8.8, h: 1.0, fill: { color: '0F172A' }, line: { color: '0F172A' }
          });
          sPhaseStats.addText(`${(activeBowler?.name || 'BOWLER').toUpperCase()}\nInns: ${p.summary.inns} | Wkts: ${p.summary.wkt} | Runs: ${p.summary.runs} | Balls: ${p.summary.balls} | Overs: ${p.summary.overs} | Eco: ${p.summary.eco} | SB: ${p.summary.sb}\nDots: ${p.summary.dots} | 4s: ${p.summary.fours} | 6s: ${p.summary.sixes} | Avg: ${p.summary.avg} | 2w+: ${p.summary.twosWktPlus} | 3w+: ${p.summary.threesWktPlus} | 5w+: ${p.summary.fivesWktPlus}`, {
            x: 0.8, y: 1.8, w: 8.4, h: 0.8,
            fontSize: 11, color: 'FFFFFF', fontFace: 'Arial', bold: true
          });

          // Breakdown Table
          const pTableRows = [
            [
              { text: 'Match', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
              { text: 'Inns', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Overs', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Runs', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Wkts', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Eco', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Dots', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: '1s', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: '2s', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: '3s', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Fours', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Sixers', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'WD', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'NB', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
            ]
          ];

          p.matchRows.forEach(m => {
            pTableRows.push([
              { text: m.matchName, options: { align: 'left', color: '1E293B', bold: true } },
              { text: String(m.innId), options: { align: 'center', color: '1E293B' } },
              { text: String(m.overs), options: { align: 'center', color: '1E293B' } },
              { text: String(m.runs), options: { align: 'center', color: '1E293B' } },
              { text: String(m.wkt), options: { align: 'center', color: '1E293B' } },
              { text: String(m.eco), options: { align: 'center', color: '1E293B' } },
              { text: String(m.dots), options: { align: 'center', color: '1E293B' } },
              { text: String(m.ones), options: { align: 'center', color: '1E293B' } },
              { text: String(m.twos), options: { align: 'center', color: '1E293B' } },
              { text: String(m.threes), options: { align: 'center', color: '1E293B' } },
              { text: String(m.fours), options: { align: 'center', color: '1E293B' } },
              { text: String(m.sixes), options: { align: 'center', color: '1E293B' } },
              { text: String(m.wides), options: { align: 'center', color: '1E293B' } },
              { text: String(m.noBalls), options: { align: 'center', color: '1E293B' } }
            ]);
          });

          sPhaseStats.addTable(pTableRows, {
            x: 0.6, y: 2.9, w: 8.8, colW: [2.0, 0.5, 0.6, 0.6, 0.6, 0.6, 0.5, 0.4, 0.4, 0.4, 0.6, 0.6, 0.5, 0.5],
            fontSize: 9, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' }, fill: 'FFFFFF'
          });

          // Phase Graphics Slide
          const sPhaseGraphics = pptx.addSlide();
          sPhaseGraphics.background = { color: 'F6F4EB' };
          sPhaseGraphics.addShape(pptx.shapes.RECTANGLE, {
            x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
          });
          sPhaseGraphics.addText(matchTitle.toUpperCase(), {
            x: 0.6, y: 0.5, w: 9.0, h: 0.6,
            fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
          });
          sPhaseGraphics.addText(`■  PHASE WISE - ( ${p.phaseName} )`, {
            x: 0.6, y: 1.2, w: 9.0, h: 0.4,
            fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
          });
          sPhaseGraphics.addShape(pptx.shapes.RECTANGLE, {
            x: 0.6, y: 1.7, w: 8.8, h: 3.4, fill: { color: '0F172A' }, line: { color: '0F172A' }
          });

          const pG = phaseGraphicsMap[p.phaseName];
          if (pG?.wwSvg) {
            sPhaseGraphics.addImage({
              data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(pG.wwSvg)))}`,
              x: 0.8, y: 1.9, w: 4.1, h: 3.0
            });
          }
          if (pG?.pitchSvg) {
            sPhaseGraphics.addImage({
              data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(pG.pitchSvg)))}`,
              x: 5.1, y: 1.9, w: 4.1, h: 3.0
            });
          }
        });

        // -------------------------------------------------------------
        // BOWLER PPTX SLIDE: ORDER WISE REPORT
        // -------------------------------------------------------------
        const sOrderWise = pptx.addSlide();
        sOrderWise.background = { color: 'F6F4EB' };
        sOrderWise.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        sOrderWise.addText(matchTitle.toUpperCase(), {
          x: 0.6, y: 0.35, w: 9.0, h: 0.55,
          fontSize: 18, bold: true, color: '0F172A', fontFace: 'Arial'
        });
        sOrderWise.addText('■  ORDER WISE REPORT', {
          x: 0.6, y: 0.92, w: 9.0, h: 0.25,
          fontSize: 11, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        // Bowler Header Pill Box
        sOrderWise.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.20, w: 8.8, h: 0.35, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        sOrderWise.addText(`${(activeBowler?.name || 'BOWLER').toUpperCase()} | OVR: ${bowlerInningStats.total.overs} | WK: ${bowlerInningStats.total.wkt} | Runs: ${bowlerInningStats.total.runs} | ECO: ${bowlerInningStats.total.eco}`, {
          x: 0.8, y: 1.22, w: 8.4, h: 0.3,
          fontSize: 9.5, color: 'FFFFFF', fontFace: 'Arial', bold: true
        });

        // Table 1: Batting Order Label & Table
        sOrderWise.addText('BATTING ORDER WISE DATA', {
          x: 0.6, y: 1.62, w: 8.8, h: 0.2,
          fontSize: 9.5, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        const orderTableRows = [
          [
            { text: 'Order', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
            { text: 'OVR', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'WK', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'ECO', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'AVG', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'SR', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'Runs Conceded', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
          ]
        ];
        bowlerOrderWiseStats.orderRows.forEach(r => {
          orderTableRows.push([
            { text: r.orderName, options: { align: 'left', color: '1E293B', bold: true } },
            { text: String(r.overs), options: { align: 'center', color: '1E293B' } },
            { text: String(r.wkt), options: { align: 'center', color: '1E293B' } },
            { text: String(r.eco), options: { align: 'center', color: '1E293B' } },
            { text: String(r.avg), options: { align: 'center', color: '1E293B' } },
            { text: String(r.sr), options: { align: 'center', color: '1E293B' } },
            { text: String(r.runs), options: { align: 'center', color: '1E293B', bold: true } }
          ]);
        });
        sOrderWise.addTable(orderTableRows, {
          x: 0.6, y: 1.84, w: 8.8, colW: [2.2, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1],
          fontSize: 9, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' }, fill: 'FFFFFF', margin: [3, 4, 3, 4]
        });

        // Table 2: Comfort Level Label & Table
        sOrderWise.addText('COMFORT LEVEL', {
          x: 0.6, y: 2.92, w: 8.8, h: 0.2,
          fontSize: 9.5, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        const comfortTableRows = [
          [
            { text: 'Hand', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
            { text: 'OVR', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'WK', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'ECO', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'AVG', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'SR', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
          ]
        ];
        bowlerOrderWiseStats.comfortRows.forEach(c => {
          comfortTableRows.push([
            { text: c.hand, options: { align: 'left', color: '1E293B', bold: true } },
            { text: String(c.overs), options: { align: 'center', color: '1E293B' } },
            { text: String(c.wkt), options: { align: 'center', color: '1E293B' } },
            { text: String(c.eco), options: { align: 'center', color: '1E293B' } },
            { text: String(c.avg), options: { align: 'center', color: '1E293B' } },
            { text: String(c.sr), options: { align: 'center', color: '1E293B' } }
          ]);
        });
        sOrderWise.addTable(comfortTableRows, {
          x: 0.6, y: 3.14, w: 8.8, colW: [2.3, 1.3, 1.3, 1.3, 1.3, 1.3],
          fontSize: 9, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' }, fill: 'FFFFFF', margin: [3, 4, 3, 4]
        });

        // Table 3: Runs Conceded Composition Label & Table
        sOrderWise.addText('RUNS CONCEDED COMPOSITION', {
          x: 0.6, y: 3.98, w: 8.8, h: 0.2,
          fontSize: 9.5, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        const compTableRows = [
          [
            { text: "1's", options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: "2's", options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: "3's", options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: "4's", options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: "6's", options: { fill: '0F172A', color: 'FFFFFF', align: 'center', bold: true } }
          ],
          [
            { text: String(bowlerOrderWiseStats.composition.ones), options: { align: 'center', color: '1E293B' } },
            { text: String(bowlerOrderWiseStats.composition.twos), options: { align: 'center', color: '1E293B' } },
            { text: String(bowlerOrderWiseStats.composition.threes), options: { align: 'center', color: '1E293B' } },
            { text: String(bowlerOrderWiseStats.composition.fours), options: { align: 'center', color: '1E293B', bold: true } },
            { text: String(bowlerOrderWiseStats.composition.sixes), options: { align: 'center', color: '1E293B', bold: true } }
          ]
        ];
        sOrderWise.addTable(compTableRows, {
          x: 0.6, y: 4.20, w: 8.8, colW: [1.76, 1.76, 1.76, 1.76, 1.76],
          fontSize: 9, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' }, fill: 'FFFFFF', margin: [3, 4, 3, 4]
        });

        // -------------------------------------------------------------
        // BOWLER PPTX SLIDE: ORDER TYPE REPORT - GRAPHICAL
        // -------------------------------------------------------------
        const sOrderTypeGraphical = pptx.addSlide();
        sOrderTypeGraphical.background = { color: 'F6F4EB' };
        sOrderTypeGraphical.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        sOrderTypeGraphical.addText(matchTitle.toUpperCase(), {
          x: 0.6, y: 0.35, w: 9.0, h: 0.55,
          fontSize: 18, bold: true, color: '0F172A', fontFace: 'Arial'
        });
        sOrderTypeGraphical.addText('■  ORDER TYPE REPORT - GRAPHICAL', {
          x: 0.6, y: 0.92, w: 9.0, h: 0.25,
          fontSize: 11, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        // Bowler Header Pill Box
        sOrderTypeGraphical.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.20, w: 8.8, h: 0.35, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        sOrderTypeGraphical.addText(`${(activeBowler?.name || 'BOWLER').toUpperCase()} | Graphical order-wise breakdown | OVR: ${bowlerInningStats.total.overs} | WK: ${bowlerInningStats.total.wkt} | Runs: ${bowlerInningStats.total.runs}`, {
          x: 0.8, y: 1.22, w: 8.4, h: 0.3,
          fontSize: 9.5, color: 'FFFFFF', fontFace: 'Arial', bold: true
        });

        // Chart 1: Batting Type Wise Runs Given (Col Bar)
        const typeBarData = [
          {
            name: 'Runs Conceded',
            labels: bowlerOrderWiseStats.comfortRows.map(r => r.hand),
            values: bowlerOrderWiseStats.comfortRows.map(r => r.runs || 0)
          }
        ];
        sOrderTypeGraphical.addChart(pptx.charts.BAR, typeBarData, {
          x: 0.6, y: 1.8, w: 2.7, h: 3.2,
          barDir: 'col',
          chartColors: ['2563EB'],
          showTitle: true, title: 'BATTING TYPE WISE RUNS GIVEN', titleFontSize: 9, titleColor: '0F172A',
          showValue: true, fontSize: 8
        });

        // Chart 2: Runs Conceded Composition (Doughnut / Pie)
        const donutData = [
          {
            name: 'Runs Composition',
            labels: ["1's", "2's", "3's", "4's", "6's"],
            values: [
              (bowlerOrderWiseStats.composition.ones || 0) * 1,
              (bowlerOrderWiseStats.composition.twos || 0) * 2,
              (bowlerOrderWiseStats.composition.threes || 0) * 3,
              (bowlerOrderWiseStats.composition.fours || 0) * 4,
              (bowlerOrderWiseStats.composition.sixes || 0) * 6
            ]
          }
        ];
        sOrderTypeGraphical.addChart(pptx.charts.DOUGHNUT, donutData, {
          x: 3.65, y: 1.8, w: 2.7, h: 3.2,
          chartColors: ['38BDF8', '8B5CF6', '22C55E', 'F59E0B', 'EF4444'],
          showTitle: true, title: 'RUNS CONCEDED COMPOSITION', titleFontSize: 9, titleColor: '0F172A',
          showLegend: true, legendPos: 'b', fontSize: 8
        });

        // Chart 3: Comfort Level (Horizontal Bar)
        const comfortHorizData = [
          {
            name: 'Overs',
            labels: bowlerOrderWiseStats.comfortRows.map(r => r.hand),
            values: bowlerOrderWiseStats.comfortRows.map(r => parseFloat(r.overs) || 0)
          },
          {
            name: 'Wickets',
            labels: bowlerOrderWiseStats.comfortRows.map(r => r.hand),
            values: bowlerOrderWiseStats.comfortRows.map(r => r.wkt || 0)
          }
        ];
        sOrderTypeGraphical.addChart(pptx.charts.BAR, comfortHorizData, {
          x: 6.7, y: 1.8, w: 2.7, h: 3.2,
          barDir: 'bar',
          chartColors: ['0D9488', '3B82F6'],
          showTitle: true, title: 'COMFORT LEVEL', titleFontSize: 9, titleColor: '0F172A',
          showLegend: true, legendPos: 'b', fontSize: 8
        });

        // -------------------------------------------------------------
        // BOWLER PPTX SLIDES: BOUNDARY RATIO (PER INNINGS)
        // -------------------------------------------------------------
        bowlerBoundaryRatioStats.forEach(stat => {
          const sBoundary = pptx.addSlide();
          sBoundary.background = { color: 'F6F4EB' };
          sBoundary.addShape(pptx.shapes.RECTANGLE, {
            x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
          });
          sBoundary.addText(matchTitle.toUpperCase(), {
            x: 0.6, y: 0.35, w: 9.0, h: 0.55,
            fontSize: 18, bold: true, color: '0F172A', fontFace: 'Arial'
          });
          sBoundary.addText(`■  BOUNDARY RATIO - ( ${stat.innName.toUpperCase()} )`, {
            x: 0.6, y: 0.92, w: 9.0, h: 0.25,
            fontSize: 11, bold: true, color: '1E293B', fontFace: 'Arial'
          });

          // Bowler Header Pill Box
          sBoundary.addShape(pptx.shapes.RECTANGLE, {
            x: 0.6, y: 1.20, w: 8.8, h: 0.35, fill: { color: '0F172A' }, line: { color: '0F172A' }
          });
          sBoundary.addText(`${(activeBowler?.name || 'BOWLER').toUpperCase()} | ${stat.innName} Boundary Ratio | Overs: ${stat.overs} | Wkts: ${stat.wkts} | Total Boundaries: ${stat.total}`, {
            x: 0.8, y: 1.22, w: 8.4, h: 0.3,
            fontSize: 9.5, color: 'FFFFFF', fontFace: 'Arial', bold: true
          });

          // Summary Metric Cards Grid (10 columns: MATCHES, INNINGS, BALL 1-6, TOTAL, WKTS)
          const cardsData = [
            { title: 'MATCHES', val: stat.matchesCount, color: '0F172A' },
            { title: 'INNINGS', val: stat.innId, color: '0F172A' },
            { title: 'BALL 1', val: stat.ball1, color: '0F172A' },
            { title: 'BALL 2', val: stat.ball2, color: '0F172A' },
            { title: 'BALL 3', val: stat.ball3, color: '0F172A' },
            { title: 'BALL 4', val: stat.ball4, color: '0F172A' },
            { title: 'BALL 5', val: stat.ball5, color: '0F172A' },
            { title: 'BALL 6', val: stat.ball6, color: '0F172A' },
            { title: 'TOTAL', val: stat.total, color: '0D9488' },
            { title: 'WKTS', val: stat.wkts, color: 'E11D48' }
          ];

          const cardW = 0.82;
          const cardGap = 0.06;
          const startX = 0.6;
          cardsData.forEach((c, cIdx) => {
            const xPos = startX + cIdx * (cardW + cardGap);
            sBoundary.addShape(pptx.shapes.RECTANGLE, {
              x: xPos, y: 1.70, w: cardW, h: 0.85, fill: { color: c.color }, line: { color: '1E293B' }
            });
            sBoundary.addText(c.title, {
              x: xPos, y: 1.74, w: cardW, h: 0.25,
              fontSize: 8, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial'
            });
            sBoundary.addText(String(c.val), {
              x: xPos, y: 2.05, w: cardW, h: 0.45,
              fontSize: 16, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial'
            });
          });

          // Table Section
          sBoundary.addText('INNINGS BOUNDARY RATIO BREAKDOWN', {
            x: 0.6, y: 2.75, w: 8.8, h: 0.2,
            fontSize: 9.5, bold: true, color: '0F172A', fontFace: 'Arial'
          });

          const boundTableRows = [
            [
              { text: 'Match', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
              { text: 'Inning', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Bowl', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
              { text: 'Team', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
              { text: 'Ball 1', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Ball 2', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Ball 3', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Ball 4', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Ball 5', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Ball 6', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
              { text: 'Total', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
            ],
            [
              { text: `${matchDetails?.ClubAPrefix || 'TeamA'} vs ${matchDetails?.ClubBPrefix || 'TeamB'}`, options: { align: 'left', color: '1E293B', bold: true } },
              { text: String(stat.innId), options: { align: 'center', color: '1E293B' } },
              { text: activeBowler?.name || 'Bowler', options: { align: 'left', color: '1E293B' } },
              { text: activeTeam?.name || 'Team', options: { align: 'left', color: '1E293B' } },
              { text: String(stat.ball1), options: { align: 'center', color: '1E293B' } },
              { text: String(stat.ball2), options: { align: 'center', color: '1E293B' } },
              { text: String(stat.ball3), options: { align: 'center', color: '1E293B' } },
              { text: String(stat.ball4), options: { align: 'center', color: '1E293B' } },
              { text: String(stat.ball5), options: { align: 'center', color: '1E293B' } },
              { text: String(stat.ball6), options: { align: 'center', color: '1E293B' } },
              { text: String(stat.total), options: { align: 'center', color: '0D9488', bold: true } }
            ]
          ];

          sBoundary.addTable(boundTableRows, {
            x: 0.6, y: 3.0, w: 8.8, colW: [1.8, 0.6, 1.4, 1.2, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.8],
            fontSize: 9, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' }, fill: 'FFFFFF', margin: [4, 4, 4, 4]
          });

          // -------------------------------------------------------------
          // BOWLER PPTX SLIDE: BOUNDARY RATIO - GRAPHICAL
          // -------------------------------------------------------------
          const sBoundaryGraphical = pptx.addSlide();
          sBoundaryGraphical.background = { color: 'F6F4EB' };
          sBoundaryGraphical.addShape(pptx.shapes.RECTANGLE, {
            x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
          });
          sBoundaryGraphical.addText(matchTitle.toUpperCase(), {
            x: 0.6, y: 0.35, w: 9.0, h: 0.55,
            fontSize: 18, bold: true, color: '0F172A', fontFace: 'Arial'
          });
          sBoundaryGraphical.addText(`■  BOUNDARY RATIO - GRAPHICAL - ( ${stat.innName.toUpperCase()} )`, {
            x: 0.6, y: 0.92, w: 9.0, h: 0.25,
            fontSize: 11, bold: true, color: '1E293B', fontFace: 'Arial'
          });

          const boundChartData = [
            {
              name: 'Boundary Count',
              labels: ['Ball 1', 'Ball 2', 'Ball 3', 'Ball 4', 'Ball 5', 'Ball 6'],
              values: [stat.ball1 || 0, stat.ball2 || 0, stat.ball3 || 0, stat.ball4 || 0, stat.ball5 || 0, stat.ball6 || 0]
            }
          ];
          sBoundaryGraphical.addChart(pptx.charts.BAR, boundChartData, {
            x: 0.6, y: 1.4, w: 8.8, h: 3.6,
            barDir: 'col',
            chartColors: ['2563EB', '22C55E', 'D97706', 'DC2626', '8B5CF6', '0D9488'],
            showTitle: false,
            showValue: true, fontSize: 9
          });
        });

        await pptx.writeFile({ fileName: `BowlerReport_${safeName}.pptx` });

      } else {
        // PDF Export using html-to-image
        const slide1El = document.getElementById('bowler-slide-1-node');
        const slide2El = document.getElementById('bowler-slide-2-node');
        const slide3El = document.getElementById('bowler-slide-3-node');
        const slide4El = document.getElementById('bowler-slide-4-node');
        const slide5El = document.getElementById('bowler-slide-5-node');
        const imgOpts = { quality: 0.92, pixelRatio: 1.5, cacheBust: false };

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [900, 525] });

        const addSlideToPdf = async (el, isFirst = false) => {
          if (!el) return;
          try {
            const imgData = await htmlToImage.toPng(el, imgOpts);
            if (imgData) {
              if (!isFirst) pdf.addPage([900, 525], 'landscape');
              pdf.addImage(imgData, 'PNG', 0, 0, 900, 525);
            }
          } catch (e) {
            console.error('Error capturing PDF slide element:', el.id, e);
          }
        };

        await addSlideToPdf(slide1El, true);
        await addSlideToPdf(slide2El);
        await addSlideToPdf(slide3El);
        await addSlideToPdf(slide4El);
        await addSlideToPdf(slide5El);

        for (let pIdx = 0; pIdx < bowlerPhaseStats.phases.length; pIdx++) {
          const statsEl = document.getElementById(`bowler-phase-stats-${pIdx}-node`);
          const graphicsEl = document.getElementById(`bowler-phase-graphics-${pIdx}-node`);
          await addSlideToPdf(statsEl);
          await addSlideToPdf(graphicsEl);
        }

        const orderWiseEl = document.getElementById('bowler-order-wise-node');
        await addSlideToPdf(orderWiseEl);

        const orderTypeGraphicalEl = document.getElementById('bowler-order-type-graphical-node');
        await addSlideToPdf(orderTypeGraphicalEl);

        for (const stat of bowlerBoundaryRatioStats) {
          const boundaryEl = document.getElementById(`bowler-boundary-ratio-${stat.innId}-node`);
          const boundaryGraphicalEl = document.getElementById(`bowler-boundary-ratio-graphical-${stat.innId}-node`);
          await addSlideToPdf(boundaryEl);
          await addSlideToPdf(boundaryGraphicalEl);
        }

        pdf.save(`BowlerReport_${safeName}.pdf`);
      }
    } catch (err) {
      console.error('Bowler Report Export Error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const orderWiseSlideNum = 6 + (bowlerPhaseStats.phases.length * 2);
  const orderTypeGraphicalSlideNum = 7 + (bowlerPhaseStats.phases.length * 2);
  const boundaryRatioBaseSlideNum = 8 + (bowlerPhaseStats.phases.length * 2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 animate-fadeIn">
      {/* Header Bar with Export Buttons */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Bowler Report Preview – <span className="text-blue-400">{activeBowler?.name}</span>
          </h3>
          <p className="text-xs text-slate-400">
            {activeBowler?.bwStyle} | {activeTeam?.name} | {seriesTitle}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            disabled={downloading}
            onClick={() => handleDownload('pdf')}
            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-lg shadow-md text-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
          <button
            disabled={downloading}
            onClick={() => handleDownload('pptx')}
            className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-lg shadow-md text-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download PPTX</span>
          </button>
        </div>
      </div>

      {/* Slide Tabs Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 overflow-x-auto gap-2">
        <div className="flex items-center space-x-2 overflow-x-auto max-w-[700px] pb-1">
          <button
            onClick={() => setPreviewSlide(1)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              previewSlide === 1
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Slide 1: Cover Page
          </button>
          <button
            onClick={() => setPreviewSlide(2)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              previewSlide === 2
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Slide 2: Bowling Stats
          </button>
          <button
            onClick={() => setPreviewSlide(3)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              previewSlide === 3
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Slide 3: Graphical Stats
          </button>
          <button
            onClick={() => setPreviewSlide(4)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              previewSlide === 4
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Slide 4: Overall Graphics
          </button>
          <button
            onClick={() => setPreviewSlide(5)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              previewSlide === 5
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Slide 5: Beaten Areas
          </button>

          {bowlerPhaseStats.phases.map((p, pIdx) => {
            const statsSlideNum = 6 + (pIdx * 2);
            const graphicsSlideNum = 6 + (pIdx * 2) + 1;
            return (
              <React.Fragment key={pIdx}>
                <button
                  onClick={() => setPreviewSlide(statsSlideNum)}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    previewSlide === statsSlideNum
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Slide {statsSlideNum}: Phase {p.phaseName}
                </button>
                <button
                  onClick={() => setPreviewSlide(graphicsSlideNum)}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    previewSlide === graphicsSlideNum
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Slide {graphicsSlideNum}: Phase {p.phaseName} (Graphics)
                </button>
              </React.Fragment>
            );
          })}

          <button
            onClick={() => setPreviewSlide(orderWiseSlideNum)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              previewSlide === orderWiseSlideNum
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Slide {orderWiseSlideNum}: Order Wise Report
          </button>

          <button
            onClick={() => setPreviewSlide(orderTypeGraphicalSlideNum)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              previewSlide === orderTypeGraphicalSlideNum
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Slide {orderTypeGraphicalSlideNum}: Order Type Report (Graphical)
          </button>

          {bowlerBoundaryRatioStats.map((stat, bIdx) => {
            const tableSlideNum = boundaryRatioBaseSlideNum + (bIdx * 2);
            const graphSlideNum = boundaryRatioBaseSlideNum + (bIdx * 2) + 1;
            return (
              <React.Fragment key={stat.innId}>
                <button
                  onClick={() => setPreviewSlide(tableSlideNum)}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    previewSlide === tableSlideNum
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Slide {tableSlideNum}: Boundary Ratio ({stat.innName})
                </button>
                <button
                  onClick={() => setPreviewSlide(graphSlideNum)}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    previewSlide === graphSlideNum
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Slide {graphSlideNum}: Boundary Ratio Graphical ({stat.innName})
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="text-xs font-semibold text-slate-400 shrink-0">
          Showing Slide <span className="text-white">{previewSlide}</span> of {boundaryRatioBaseSlideNum + (bowlerBoundaryRatioStats.length * 2) - 1}
        </div>
      </div>

      {/* Main Slide Preview Area */}
      <div className="flex justify-center bg-slate-950/60 p-6 rounded-xl border border-slate-800/80 min-h-[560px] overflow-auto">
        {previewSlide === 1 && (
          <div
            id="bowler-slide-1-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
            style={{ fontFamily: 'sans-serif' }}
          >
            {/* Corner Decorative Framing */}
            <div className="absolute top-8 left-8 w-20 h-20 border-t-4 border-l-4 border-[#0f172a] pointer-events-none" />
            <div className="absolute bottom-8 right-8 w-20 h-20 border-b-4 border-r-4 border-[#0f172a] pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center text-center px-12 z-10">
              <h1 className="text-5xl font-black uppercase text-[#0f172a] tracking-tight mb-4 leading-tight">
                {activeBowler?.name}
              </h1>

              <div className="space-y-1 mt-2">
                <p className="text-xl font-bold italic uppercase text-slate-800 tracking-wide">
                  {activeBowler?.bwStyle}
                </p>
                <p className="text-lg font-bold italic uppercase text-slate-700 tracking-wide">
                  {activeTeam?.name}
                </p>
                <p className="text-base font-extrabold italic uppercase text-slate-600 tracking-wider mt-3">
                  IN {seriesTitle}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-slate-300 pt-4 z-10 text-xs font-bold text-slate-500 uppercase">
              <div>Cricket-21 Analytics Report</div>
              <div>Confidential</div>
            </div>
          </div>
        )}

        {previewSlide === 2 && (
          <div
            id="bowler-slide-2-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> BOWLING STATS
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">INNING WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-3">Player-wise bowling split by innings with runs conceded, wickets, economy, average, and strike rate.</div>

                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Consolidated player summary</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                      <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                        ECO {bowlerInningStats.total.eco}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-white uppercase mb-2">INNING WISE RUNS CONCEDED DATA</div>

                  <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-[#0b1726]">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-2.5 px-3 font-bold">Inning</th>
                          <th className="py-2.5 px-2 text-center font-bold">INNING</th>
                          <th className="py-2.5 px-2 text-center font-bold">OVR</th>
                          <th className="py-2.5 px-2 text-center font-bold">RUNS CONCEDED</th>
                          <th className="py-2.5 px-2 text-center font-bold">WK</th>
                          <th className="py-2.5 px-2 text-center font-bold">ECO</th>
                          <th className="py-2.5 px-2 text-center font-bold">AVG</th>
                          <th className="py-2.5 px-2 text-center font-bold">SR</th>
                          <th className="py-2.5 px-2 text-center font-bold">DOTS</th>
                          <th className="py-2.5 px-2 text-center font-bold">4S</th>
                          <th className="py-2.5 px-2 text-center font-bold">6S</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-semibold">
                        {bowlerInningStats.rows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 text-cyan-300 font-bold">{r.innName}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.innId}</td>
                            <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{r.overs}</td>
                            <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{r.runs}</td>
                            <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{r.wkt}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.eco}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.avg}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.sr}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.dots}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.fours}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.sixes}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#0f2438] text-white font-extrabold border-t-2 border-slate-700">
                          <td className="py-2.5 px-3">Total</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.inningsCount}</td>
                          <td className="py-2.5 px-2 text-center text-cyan-300">{bowlerInningStats.total.overs}</td>
                          <td className="py-2.5 px-2 text-center text-cyan-300">{bowlerInningStats.total.runs}</td>
                          <td className="py-2.5 px-2 text-center text-emerald-400">{bowlerInningStats.total.wkt}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.eco}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.avg}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.sr}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.dots}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.fours}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.sixes}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {previewSlide === 3 && (
          <div
            id="bowler-slide-3-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> BOWLING STATS GRAPHICAL REPRESENTATION
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">INNING WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-3">Player-wise bowling split by innings with runs conceded, wickets, economy, average, and strike rate.</div>

                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Consolidated graphical summary</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                      <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                        ECO {bowlerInningStats.total.eco}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-white uppercase mb-2">INNING WISE RUNS CONCEDED</div>

                  {/* Bar Chart Container */}
                  <div className="w-full bg-[#0b1726] border border-slate-800 rounded-lg p-3 flex justify-center">
                    {renderInningBarChart(bowlerInningStats.rows)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {previewSlide === 4 && (
          <div
            id="bowler-slide-4-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> OVER ALL
                </div>
              </div>

              {/* Centered Graphics Container Box matching Slide 4 design */}
              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex items-center justify-center gap-6">
                {graphicsData.loading ? (
                  <div className="text-slate-400 text-sm animate-pulse">Loading Wagon Wheel & Pitch Map graphics...</div>
                ) : (
                  <>
                    {graphicsData.wwregionSvg ? (
                      <div
                        className="w-1/2 h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: graphicsData.wwregionSvg }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                        Wagon Wheel graphic unavailable
                      </div>
                    )}

                    {graphicsData.pitchmapSvg ? (
                      <div
                        className="w-1/2 h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden border-l border-slate-800/80 pl-3"
                        dangerouslySetInnerHTML={{ __html: graphicsData.pitchmapSvg }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                        Pitch Map graphic unavailable
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {previewSlide === 5 && (
          <div
            id="bowler-slide-5-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> BEATEN , UNCOMFORTABLE & DISMISSAL AREAS
                </div>
              </div>

              {/* Centered Pitchmap Box */}
              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex items-center justify-center">
                {graphicsData.loading ? (
                  <div className="text-slate-400 text-sm animate-pulse">Loading Beaten/Uncomfortable Pitch Map graphic...</div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    {graphicsData.beatenPitchmapSvg ? (
                      <div
                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: graphicsData.beatenPitchmapSvg }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                        Beaten / Uncomfortable / Dismissal Pitch Map graphic unavailable
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phase Slides Preview Blocks */}
        {bowlerPhaseStats.phases.map((p, pIdx) => {
          const statsSlideNum = 6 + (pIdx * 2);
          const graphicsSlideNum = 6 + (pIdx * 2) + 1;
          const pG = phaseGraphicsMap[p.phaseName];

          return (
            <React.Fragment key={pIdx}>
              {previewSlide === statsSlideNum && (
                <div
                  id={`bowler-phase-stats-${pIdx}-node`}
                  className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                  <div className="pl-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                        {matchTitle}
                      </h1>

                      <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                        <span className="text-slate-950 text-sm">■</span> PHASE WISE – ( {p.phaseName} )
                      </div>
                    </div>

                    {/* Standalone Top Bowler Summary Header Card matching Batter Report */}
                    <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 text-white shadow-xl flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="w-12 h-12 rounded-full bg-slate-700/60 border-2 border-amber-400 flex items-center justify-center text-slate-300">
                          <svg className="w-7 h-7 text-slate-300 fill-current" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-white text-center max-w-[110px] truncate">
                          {activeBowler?.name}
                        </span>
                      </div>

                      <div className="flex-1 grid grid-cols-7 gap-y-2 gap-x-2 text-center border-l border-slate-700/80 pl-4">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Inns</span>
                          <span className="text-base font-extrabold text-white">{p.summary.inns}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">W</span>
                          <span className="text-base font-extrabold text-white">{p.summary.wkt}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Runs</span>
                          <span className="text-base font-extrabold text-white">{p.summary.runs}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Balls</span>
                          <span className="text-base font-extrabold text-white">{p.summary.balls}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Overs</span>
                          <span className="text-base font-extrabold text-white">{p.summary.overs}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Eco</span>
                          <span className="text-base font-extrabold text-white">{p.summary.eco}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">SB</span>
                          <span className="text-base font-extrabold text-white">{p.summary.sb}</span>
                        </div>

                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Dots</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.dots}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Fours</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.fours}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Sixers</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.sixes}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Avg</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.avg}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">2w+</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.twosWktPlus}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">3w+</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.threesWktPlus}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">5w+</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.fivesWktPlus}</span>
                        </div>
                      </div>
                    </div>

                    {/* Standalone Innings Breakdown Table Card matching Batter Report */}
                    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-[#071320] shadow-xl mt-4">
                      <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                        <thead>
                          <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                            <th className="py-2.5 px-3 font-bold">Match</th>
                            <th className="py-2.5 px-2 text-center font-bold">Inns</th>
                            <th className="py-2.5 px-2 text-center font-bold">Overs</th>
                            <th className="py-2.5 px-2 text-center font-bold">Runs</th>
                            <th className="py-2.5 px-2 text-center font-bold">Wkts</th>
                            <th className="py-2.5 px-2 text-center font-bold">Eco</th>
                            <th className="py-2.5 px-2 text-center font-bold">Dots</th>
                            <th className="py-2.5 px-1.5 text-center font-bold">1s</th>
                            <th className="py-2.5 px-1.5 text-center font-bold">2s</th>
                            <th className="py-2.5 px-1.5 text-center font-bold">3s</th>
                            <th className="py-2.5 px-2 text-center font-bold">Fours</th>
                            <th className="py-2.5 px-2 text-center font-bold">Sixers</th>
                            <th className="py-2.5 px-2 text-center font-bold">WD</th>
                            <th className="py-2.5 px-2 text-center font-bold">NB</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 font-semibold">
                          {p.matchRows.map((m, mIdx) => (
                            <tr key={mIdx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-cyan-300 font-bold">{m.matchName}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.innId}</td>
                              <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{m.overs}</td>
                              <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{m.runs}</td>
                              <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{m.wkt}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.eco}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.dots}</td>
                              <td className="py-2.5 px-1.5 text-center text-slate-300">{m.ones}</td>
                              <td className="py-2.5 px-1.5 text-center text-slate-300">{m.twos}</td>
                              <td className="py-2.5 px-1.5 text-center text-slate-300">{m.threes}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.fours}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.sixes}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.wides}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.noBalls}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {previewSlide === graphicsSlideNum && (
                <div
                  id={`bowler-phase-graphics-${pIdx}-node`}
                  className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                  <div className="pl-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                        {matchTitle}
                      </h1>

                      <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                        <span className="text-slate-950 text-sm">■</span> PHASE WISE – ( {p.phaseName} )
                      </div>
                    </div>

                    <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex items-center justify-center gap-6">
                      {pG?.wwSvg ? (
                        <div
                          className="w-1/2 h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden"
                          dangerouslySetInnerHTML={{ __html: pG.wwSvg }}
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                          Wagon Wheel graphic unavailable for {p.phaseName}
                        </div>
                      )}

                      {pG?.pitchSvg ? (
                        <div
                          className="w-1/2 h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden border-l border-slate-800/80 pl-3"
                          dangerouslySetInnerHTML={{ __html: pG.pitchSvg }}
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                          Pitch Map graphic unavailable for {p.phaseName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {previewSlide === orderWiseSlideNum && (
          <div
            id="bowler-order-wise-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                  <span className="text-slate-950 text-sm">■</span> ORDER WISE REPORT
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">ORDER WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-2">Bowling split by batting order, batter hand comfort, and runs conceded composition.</div>

                  {/* Bowler Summary Header Pill */}
                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-2.5 mb-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Filtered bowling summary</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                      <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                        ECO {bowlerInningStats.total.eco}
                      </span>
                    </div>
                  </div>

                  {/* 1. BATTING ORDER WISE DATA */}
                  <div className="text-[11px] font-bold text-white uppercase mb-1 tracking-wider">BATTING ORDER WISE DATA</div>
                  <div className="w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b1726] mb-2.5">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-1.5 px-3 font-bold">Order</th>
                          <th className="py-1.5 px-2 text-center font-bold">OVR</th>
                          <th className="py-1.5 px-2 text-center font-bold">WK</th>
                          <th className="py-1.5 px-2 text-center font-bold">ECO</th>
                          <th className="py-1.5 px-2 text-center font-bold">AVG</th>
                          <th className="py-1.5 px-2 text-center font-bold">SR</th>
                          <th className="py-1.5 px-2 text-center font-bold">Runs Conceded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-semibold">
                        {bowlerOrderWiseStats.orderRows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-3 text-cyan-300 font-bold">{r.orderName}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{r.overs}</td>
                            <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">{r.wkt}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{r.eco}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{r.avg}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{r.sr}</td>
                            <td className="py-1.5 px-2 text-center text-cyan-300 font-extrabold">{r.runs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. COMFORT LEVEL */}
                  <div className="text-[11px] font-bold text-white uppercase mb-1 tracking-wider">COMFORT LEVEL</div>
                  <div className="w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b1726] mb-2.5">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-1.5 px-3 font-bold">Hand</th>
                          <th className="py-1.5 px-2 text-center font-bold">OVR</th>
                          <th className="py-1.5 px-2 text-center font-bold">WK</th>
                          <th className="py-1.5 px-2 text-center font-bold">ECO</th>
                          <th className="py-1.5 px-2 text-center font-bold">AVG</th>
                          <th className="py-1.5 px-2 text-center font-bold">SR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-semibold">
                        {bowlerOrderWiseStats.comfortRows.map((c, cIdx) => (
                          <tr key={cIdx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-3 text-cyan-300 font-bold">{c.hand}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{c.overs}</td>
                            <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">{c.wkt}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{c.eco}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{c.avg}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{c.sr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 3. RUNS CONCEDED COMPOSITION */}
                  <div className="text-[11px] font-bold text-white uppercase mb-1 tracking-wider">RUNS CONCEDED COMPOSITION</div>
                  <div className="w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b1726]">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-1.5 px-2 text-center font-bold">1's</th>
                          <th className="py-1.5 px-2 text-center font-bold">2's</th>
                          <th className="py-1.5 px-2 text-center font-bold">3's</th>
                          <th className="py-1.5 px-2 text-center font-bold">4's</th>
                          <th className="py-1.5 px-2 text-center font-bold">6's</th>
                        </tr>
                      </thead>
                      <tbody className="font-semibold">
                        <tr>
                          <td className="py-1.5 px-2 text-center text-cyan-300 font-bold">{bowlerOrderWiseStats.composition.ones}</td>
                          <td className="py-1.5 px-2 text-center text-cyan-300 font-bold">{bowlerOrderWiseStats.composition.twos}</td>
                          <td className="py-1.5 px-2 text-center text-cyan-300 font-bold">{bowlerOrderWiseStats.composition.threes}</td>
                          <td className="py-1.5 px-2 text-center text-amber-400 font-bold">{bowlerOrderWiseStats.composition.fours}</td>
                          <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">{bowlerOrderWiseStats.composition.sixes}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {previewSlide === orderTypeGraphicalSlideNum && (
          <div
            id="bowler-order-type-graphical-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                  <span className="text-slate-950 text-sm">■</span> ORDER TYPE REPORT - GRAPHICAL
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">ORDER WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-2">Bowling split by batting order, batter hand comfort, and runs conceded composition.</div>

                  {/* Bowler Summary Header Pill */}
                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-2.5 mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Graphical order-wise breakdown</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                    </div>
                  </div>

                  {/* 3 Grid Boxes Side-by-Side */}
                  <div className="grid grid-cols-3 gap-3 w-full">
                    {/* Box 1: BATTING TYPE WISE RUNS GIVEN */}
                    <div className="bg-[#0b1726] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-between">
                      <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-2 text-center">
                        BATTING TYPE WISE RUNS GIVEN
                      </div>
                      <div className="w-full flex justify-center items-center">
                        {renderBattingTypeBarChart(bowlerOrderWiseStats.comfortRows)}
                      </div>
                    </div>

                    {/* Box 2: RUNS CONCEDED COMPOSITION */}
                    <div className="bg-[#0b1726] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-between">
                      <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-2 text-center">
                        RUNS CONCEDED COMPOSITION
                      </div>
                      <div className="w-full flex justify-center items-center">
                        {renderDonutChart(bowlerOrderWiseStats.composition)}
                      </div>
                    </div>

                    {/* Box 3: COMFORT LEVEL */}
                    <div className="bg-[#0b1726] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-between">
                      <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-2 text-center">
                        COMFORT LEVEL
                      </div>
                      <div className="w-full flex justify-center items-center">
                        {renderComfortHorizontalBarChart(bowlerOrderWiseStats.comfortRows)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {bowlerBoundaryRatioStats.map((stat, bIdx) => {
          const tableSlideNum = boundaryRatioBaseSlideNum + (bIdx * 2);
          const graphSlideNum = boundaryRatioBaseSlideNum + (bIdx * 2) + 1;

          return (
            <React.Fragment key={stat.innId}>
              {previewSlide === tableSlideNum && (
                <div
                  id={`bowler-boundary-ratio-${stat.innId}-node`}
                  className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                  <div className="pl-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                        {matchTitle}
                      </h1>

                      <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                        <span className="text-slate-950 text-sm">■</span> BOUNDARY RATIO - ( {stat.innName.toUpperCase()} )
                      </div>
                    </div>

                    <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-extrabold uppercase text-white tracking-wider">BOUNDARY RATIO REPORT</div>
                        <div className="text-[10px] text-cyan-400/80 mb-2">Over-ball index boundary frequencies for {stat.innName}.</div>

                        {/* Bowler Summary Header Pill */}
                        <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-2.5 mb-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                            <div className="text-[10px] text-slate-400">{stat.innName} summary</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                              OVR {stat.overs}
                            </span>
                            <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                              WK {stat.wkts}
                            </span>
                            <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                              Runs {stat.runs}
                            </span>
                          </div>
                        </div>

                        {/* Metric Cards Grid (10 Columns) */}
                        <div className="grid grid-cols-10 gap-2 mb-4">
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">MATCHES</div>
                            <div className="text-base font-extrabold text-white mt-0.5">{stat.matchesCount}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">INNINGS</div>
                            <div className="text-base font-extrabold text-white mt-0.5">{stat.innId}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 1</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball1}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 2</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball2}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 3</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball3}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 4</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball4}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 5</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball5}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 6</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball6}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-emerald-600/40 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-emerald-400 uppercase">TOTAL</div>
                            <div className="text-base font-extrabold text-emerald-300 mt-0.5">{stat.total}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-rose-600/40 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-rose-400 uppercase">WKTS</div>
                            <div className="text-base font-extrabold text-rose-300 mt-0.5">{stat.wkts}</div>
                          </div>
                        </div>

                        {/* Breakdown Table */}
                        <div className="text-[11px] font-bold text-white uppercase mb-1.5 tracking-wider">INNINGS BOUNDARY RATIO BREAKDOWN</div>
                        <div className="w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b1726]">
                          <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                            <thead>
                              <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                                <th className="py-2 px-3 font-bold">Match</th>
                                <th className="py-2 px-2 text-center font-bold">Inning</th>
                                <th className="py-2 px-3 font-bold">Bowl</th>
                                <th className="py-2 px-3 font-bold">Team</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 1</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 2</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 3</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 4</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 5</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 6</th>
                                <th className="py-2 px-2 text-center font-bold">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 font-semibold">
                              <tr className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-2 px-3 text-cyan-300 font-bold">{matchDetails?.ClubAPrefix || 'TeamA'} vs {matchDetails?.ClubBPrefix || 'TeamB'}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.innId}</td>
                                <td className="py-2 px-3 text-slate-300">{activeBowler?.name || 'Bowler'}</td>
                                <td className="py-2 px-3 text-slate-300">{activeTeam?.name || 'Team'}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball1}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball2}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball3}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball4}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball5}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball6}</td>
                                <td className="py-2 px-2 text-center text-emerald-400 font-extrabold">{stat.total}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewSlide === graphSlideNum && (
                <div
                  id={`bowler-boundary-ratio-graphical-${stat.innId}-node`}
                  className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none shadow-2xl shrink-0"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                  <div className="pl-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                        {matchTitle}
                      </h1>

                      <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                        <span className="text-slate-950 text-sm">■</span> BOUNDARY RATIO - GRAPHICAL
                      </div>
                    </div>

                    <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between items-center">
                      <div className="w-full flex-1 flex items-center justify-center pt-2">
                        {renderBoundaryRatioBarChart(stat)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* OFFSCREEN CONTAINER FOR PDF EXPORT */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-100 z-[-9999]">
        <div
          id="bowler-slide-1-node"
          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
          style={{ fontFamily: 'sans-serif' }}
        >
            {/* Corner Decorative Framing */}
            <div className="absolute top-8 left-8 w-20 h-20 border-t-4 border-l-4 border-[#0f172a] pointer-events-none" />
            <div className="absolute bottom-8 right-8 w-20 h-20 border-b-4 border-r-4 border-[#0f172a] pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center text-center px-12 z-10">
              <h1 className="text-5xl font-black uppercase text-[#0f172a] tracking-tight mb-4 leading-tight">
                {activeBowler?.name}
              </h1>

              <div className="space-y-1 mt-2">
                <p className="text-xl font-bold italic uppercase text-slate-800 tracking-wide">
                  {activeBowler?.bwStyle}
                </p>
                <p className="text-lg font-bold italic uppercase text-slate-700 tracking-wide">
                  {activeTeam?.name}
                </p>
                <p className="text-base font-extrabold italic uppercase text-slate-600 tracking-wider mt-3">
                  IN {seriesTitle}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-slate-300 pt-4 z-10 text-xs font-bold text-slate-500 uppercase">
              <div>Cricket-21 Analytics Report</div>
              <div>Confidential</div>
            </div>
          </div>

          <div
            id="bowler-slide-2-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> BOWLING STATS
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">INNING WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-3">Player-wise bowling split by innings with runs conceded, wickets, economy, average, and strike rate.</div>

                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Consolidated player summary</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                      <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                        ECO {bowlerInningStats.total.eco}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-white uppercase mb-2">INNING WISE RUNS CONCEDED DATA</div>

                  <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-[#0b1726]">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-2.5 px-3 font-bold">Inning</th>
                          <th className="py-2.5 px-2 text-center font-bold">INNING</th>
                          <th className="py-2.5 px-2 text-center font-bold">OVR</th>
                          <th className="py-2.5 px-2 text-center font-bold">RUNS CONCEDED</th>
                          <th className="py-2.5 px-2 text-center font-bold">WK</th>
                          <th className="py-2.5 px-2 text-center font-bold">ECO</th>
                          <th className="py-2.5 px-2 text-center font-bold">AVG</th>
                          <th className="py-2.5 px-2 text-center font-bold">SR</th>
                          <th className="py-2.5 px-2 text-center font-bold">DOTS</th>
                          <th className="py-2.5 px-2 text-center font-bold">4S</th>
                          <th className="py-2.5 px-2 text-center font-bold">6S</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-semibold">
                        {bowlerInningStats.rows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 text-cyan-300 font-bold">{r.innName}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.innId}</td>
                            <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{r.overs}</td>
                            <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{r.runs}</td>
                            <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{r.wkt}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.eco}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.avg}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.sr}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.dots}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.fours}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.sixes}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#0f2438] text-white font-extrabold border-t-2 border-slate-700">
                          <td className="py-2.5 px-3">Total</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.inningsCount}</td>
                          <td className="py-2.5 px-2 text-center text-cyan-300">{bowlerInningStats.total.overs}</td>
                          <td className="py-2.5 px-2 text-center text-cyan-300">{bowlerInningStats.total.runs}</td>
                          <td className="py-2.5 px-2 text-center text-emerald-400">{bowlerInningStats.total.wkt}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.eco}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.avg}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.sr}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.dots}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.fours}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.sixes}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <div
          id="bowler-slide-3-node"
          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
          style={{ fontFamily: 'sans-serif' }}
        >
          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

          <div className="pl-6 flex-1 flex flex-col justify-between">
            <div>
              <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                {matchTitle}
              </h1>

              <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                <span className="text-slate-950 text-sm">■</span> BOWLING STATS GRAPHICAL REPRESENTATION
              </div>
            </div>

            <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
              <div>
                <div className="text-xs font-extrabold uppercase text-white tracking-wider">INNING WISE REPORT</div>
                <div className="text-[10px] text-cyan-400/80 mb-3">Player-wise bowling split by innings with runs conceded, wickets, economy, average, and strike rate.</div>

                <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                    <div className="text-[10px] text-slate-400">Consolidated graphical summary</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                      OVR {bowlerInningStats.total.overs}
                    </span>
                    <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                      WK {bowlerInningStats.total.wkt}
                    </span>
                    <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                      Runs {bowlerInningStats.total.runs}
                    </span>
                    <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                      ECO {bowlerInningStats.total.eco}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-bold text-white uppercase mb-2">INNING WISE RUNS CONCEDED</div>

                <div className="w-full bg-[#0b1726] border border-slate-800 rounded-lg p-3 flex justify-center">
                  {renderInningBarChart(bowlerInningStats.rows)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="bowler-slide-4-node"
          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
          style={{ fontFamily: 'sans-serif' }}
        >
          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

          <div className="pl-6 flex-1 flex flex-col justify-between">
            <div>
              <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                {matchTitle}
              </h1>

              <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                <span className="text-slate-950 text-sm">■</span> OVER ALL
              </div>
            </div>

            <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex items-center justify-center gap-6">
              {graphicsData.loading ? (
                <div className="text-slate-400 text-sm animate-pulse">Loading Wagon Wheel & Pitch Map graphics...</div>
              ) : (
                <>
                  {graphicsData.wwregionSvg ? (
                    <div
                      className="flex-1 flex justify-center items-center max-h-[360px] overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: graphicsData.wwregionSvg }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                      Wagon Wheel graphic unavailable
                    </div>
                  )}

                  {graphicsData.pitchmapSvg ? (
                    <div
                      className="flex-1 flex justify-center items-center max-h-[360px] overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: graphicsData.pitchmapSvg }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                      Pitch Map graphic unavailable
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
      {/* OFFSCREEN HIDDEN CONTAINER FOR PDF EXPORT */}
      </div>
          <div
            id="bowler-slide-2-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> BOWLING STATS
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">INNING WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-3">Player-wise bowling split by innings with runs conceded, wickets, economy, average, and strike rate.</div>

                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Consolidated player summary</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                      <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                        ECO {bowlerInningStats.total.eco}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-white uppercase mb-2">INNING WISE RUNS CONCEDED DATA</div>

                  <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-[#0b1726]">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-2.5 px-3 font-bold">Inning</th>
                          <th className="py-2.5 px-2 text-center font-bold">INNING</th>
                          <th className="py-2.5 px-2 text-center font-bold">OVR</th>
                          <th className="py-2.5 px-2 text-center font-bold">RUNS CONCEDED</th>
                          <th className="py-2.5 px-2 text-center font-bold">WK</th>
                          <th className="py-2.5 px-2 text-center font-bold">ECO</th>
                          <th className="py-2.5 px-2 text-center font-bold">AVG</th>
                          <th className="py-2.5 px-2 text-center font-bold">SR</th>
                          <th className="py-2.5 px-2 text-center font-bold">DOTS</th>
                          <th className="py-2.5 px-2 text-center font-bold">4S</th>
                          <th className="py-2.5 px-2 text-center font-bold">6S</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-semibold">
                        {bowlerInningStats.rows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 text-cyan-300 font-bold">{r.innName}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.innId}</td>
                            <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{r.overs}</td>
                            <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{r.runs}</td>
                            <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{r.wkt}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.eco}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.avg}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.sr}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.dots}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.fours}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{r.sixes}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#0f2438] text-white font-extrabold border-t-2 border-slate-700">
                          <td className="py-2.5 px-3">Total</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.inningsCount}</td>
                          <td className="py-2.5 px-2 text-center text-cyan-300">{bowlerInningStats.total.overs}</td>
                          <td className="py-2.5 px-2 text-center text-cyan-300">{bowlerInningStats.total.runs}</td>
                          <td className="py-2.5 px-2 text-center text-emerald-400">{bowlerInningStats.total.wkt}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.eco}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.avg}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.sr}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.dots}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.fours}</td>
                          <td className="py-2.5 px-2 text-center">{bowlerInningStats.total.sixes}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            id="bowler-slide-3-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> BOWLING STATS GRAPHICAL REPRESENTATION
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">INNING WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-3">Player-wise bowling split by innings with runs conceded, wickets, economy, average, and strike rate.</div>

                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Consolidated graphical summary</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                      <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                        ECO {bowlerInningStats.total.eco}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-white uppercase mb-2">INNING WISE RUNS CONCEDED</div>

                  <div className="w-full bg-[#0b1726] border border-slate-800 rounded-lg p-3 flex justify-center">
                    {renderInningBarChart(bowlerInningStats.rows)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            id="bowler-slide-4-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> OVER ALL
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex items-center justify-center gap-6">
                {graphicsData.loading ? (
                  <div className="text-slate-400 text-sm animate-pulse">Loading Wagon Wheel & Pitch Map graphics...</div>
                ) : (
                  <>
                    {graphicsData.wwregionSvg ? (
                      <div
                        className="w-1/2 h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: graphicsData.wwregionSvg }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                        Wagon Wheel graphic unavailable
                      </div>
                    )}

                    {graphicsData.pitchmapSvg ? (
                      <div
                        className="w-1/2 h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden border-l border-slate-800/80 pl-3"
                        dangerouslySetInnerHTML={{ __html: graphicsData.pitchmapSvg }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                        Pitch Map graphic unavailable
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            id="bowler-slide-5-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                  <span className="text-slate-950 text-sm">■</span> BEATEN , UNCOMFORTABLE & DISMISSAL AREAS
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex items-center justify-center">
                {graphicsData.loading ? (
                  <div className="text-slate-400 text-sm animate-pulse">Loading Beaten Pitch Map graphic...</div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    {graphicsData.beatenPitchmapSvg ? (
                      <div
                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: graphicsData.beatenPitchmapSvg }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                        Beaten / Uncomfortable / Dismissal Pitch Map graphic unavailable
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Phase Offscreen Nodes for PDF capture */}
        {bowlerPhaseStats.phases.map((p, pIdx) => {
          const statsSlideNum = 6 + (pIdx * 2);
          const graphicsSlideNum = 6 + (pIdx * 2) + 1;
          const pG = phaseGraphicsMap[p.phaseName];

          return (
            <React.Fragment key={pIdx}>
                <div
                  id={`bowler-phase-stats-${pIdx}-node`}
                  className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                  <div className="pl-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                        {matchTitle}
                      </h1>

                      <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                        <span className="text-slate-950 text-sm">■</span> PHASE WISE – ( {p.phaseName} )
                      </div>
                    </div>

                    {/* Standalone Top Bowler Summary Header Card matching Batter Report */}
                    <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 text-white shadow-xl flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="w-12 h-12 rounded-full bg-slate-700/60 border-2 border-amber-400 flex items-center justify-center text-slate-300">
                          <svg className="w-7 h-7 text-slate-300 fill-current" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-white text-center max-w-[110px] truncate">
                          {activeBowler?.name}
                        </span>
                      </div>

                      <div className="flex-1 grid grid-cols-7 gap-y-2 gap-x-2 text-center border-l border-slate-700/80 pl-4">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Inns</span>
                          <span className="text-base font-extrabold text-white">{p.summary.inns}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">W</span>
                          <span className="text-base font-extrabold text-white">{p.summary.wkt}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Runs</span>
                          <span className="text-base font-extrabold text-white">{p.summary.runs}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Balls</span>
                          <span className="text-base font-extrabold text-white">{p.summary.balls}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Overs</span>
                          <span className="text-base font-extrabold text-white">{p.summary.overs}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Eco</span>
                          <span className="text-base font-extrabold text-white">{p.summary.eco}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">SB</span>
                          <span className="text-base font-extrabold text-white">{p.summary.sb}</span>
                        </div>

                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Dots</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.dots}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Fours</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.fours}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Sixers</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.sixes}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">Avg</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.avg}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">2w+</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.twosWktPlus}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">3w+</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.threesWktPlus}</span>
                        </div>
                        <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-cyan-300 font-bold uppercase">5w+</span>
                          <span className="text-sm font-extrabold text-white">{p.summary.fivesWktPlus}</span>
                        </div>
                      </div>
                    </div>

                    {/* Standalone Innings Breakdown Table Card matching Batter Report */}
                    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-[#071320] shadow-xl mt-4">
                      <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                        <thead>
                          <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                            <th className="py-2.5 px-3 font-bold">Match</th>
                            <th className="py-2.5 px-2 text-center font-bold">Inns</th>
                            <th className="py-2.5 px-2 text-center font-bold">Overs</th>
                            <th className="py-2.5 px-2 text-center font-bold">Runs</th>
                            <th className="py-2.5 px-2 text-center font-bold">Wkts</th>
                            <th className="py-2.5 px-2 text-center font-bold">Eco</th>
                            <th className="py-2.5 px-2 text-center font-bold">Dots</th>
                            <th className="py-2.5 px-1.5 text-center font-bold">1s</th>
                            <th className="py-2.5 px-1.5 text-center font-bold">2s</th>
                            <th className="py-2.5 px-1.5 text-center font-bold">3s</th>
                            <th className="py-2.5 px-2 text-center font-bold">Fours</th>
                            <th className="py-2.5 px-2 text-center font-bold">Sixers</th>
                            <th className="py-2.5 px-2 text-center font-bold">WD</th>
                            <th className="py-2.5 px-2 text-center font-bold">NB</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 font-semibold">
                          {p.matchRows.map((m, mIdx) => (
                            <tr key={mIdx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-cyan-300 font-bold">{m.matchName}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.innId}</td>
                              <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{m.overs}</td>
                              <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{m.runs}</td>
                              <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{m.wkt}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.eco}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.dots}</td>
                              <td className="py-2.5 px-1.5 text-center text-slate-300">{m.ones}</td>
                              <td className="py-2.5 px-1.5 text-center text-slate-300">{m.twos}</td>
                              <td className="py-2.5 px-1.5 text-center text-slate-300">{m.threes}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.fours}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.sixes}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.wides}</td>
                              <td className="py-2.5 px-2 text-center text-slate-300">{m.noBalls}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div
                  id={`bowler-phase-graphics-${pIdx}-node`}
                  className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                  <div className="pl-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                        {matchTitle}
                      </h1>

                      <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                        <span className="text-slate-950 text-sm">■</span> PHASE WISE – ( {p.phaseName} )
                      </div>
                    </div>

                    <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex items-center justify-center gap-6">
                      {pG?.wwSvg ? (
                        <div
                          className="w-1/2 h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden"
                          dangerouslySetInnerHTML={{ __html: pG.wwSvg }}
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                          Wagon Wheel graphic unavailable for {p.phaseName}
                        </div>
                      )}

                      {pG?.pitchSvg ? (
                        <div
                          className="w-1/2 h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[340px] [&>svg]:object-contain overflow-hidden border-l border-slate-800/80 pl-3"
                          dangerouslySetInnerHTML={{ __html: pG.pitchSvg }}
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                          Pitch Map graphic unavailable for {p.phaseName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            </React.Fragment>
          );
        })}

          <div
            id="bowler-order-wise-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                  <span className="text-slate-950 text-sm">■</span> ORDER WISE REPORT
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">ORDER WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-2">Bowling split by batting order, batter hand comfort, and runs conceded composition.</div>

                  {/* Bowler Summary Header Pill */}
                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-2.5 mb-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Filtered bowling summary</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                      <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                        ECO {bowlerInningStats.total.eco}
                      </span>
                    </div>
                  </div>

                  {/* 1. BATTING ORDER WISE DATA */}
                  <div className="text-[11px] font-bold text-white uppercase mb-1 tracking-wider">BATTING ORDER WISE DATA</div>
                  <div className="w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b1726] mb-2.5">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-1.5 px-3 font-bold">Order</th>
                          <th className="py-1.5 px-2 text-center font-bold">OVR</th>
                          <th className="py-1.5 px-2 text-center font-bold">WK</th>
                          <th className="py-1.5 px-2 text-center font-bold">ECO</th>
                          <th className="py-1.5 px-2 text-center font-bold">AVG</th>
                          <th className="py-1.5 px-2 text-center font-bold">SR</th>
                          <th className="py-1.5 px-2 text-center font-bold">Runs Conceded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-semibold">
                        {bowlerOrderWiseStats.orderRows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-3 text-cyan-300 font-bold">{r.orderName}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{r.overs}</td>
                            <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">{r.wkt}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{r.eco}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{r.avg}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{r.sr}</td>
                            <td className="py-1.5 px-2 text-center text-cyan-300 font-extrabold">{r.runs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. COMFORT LEVEL */}
                  <div className="text-[11px] font-bold text-white uppercase mb-1 tracking-wider">COMFORT LEVEL</div>
                  <div className="w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b1726] mb-2.5">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-1.5 px-3 font-bold">Hand</th>
                          <th className="py-1.5 px-2 text-center font-bold">OVR</th>
                          <th className="py-1.5 px-2 text-center font-bold">WK</th>
                          <th className="py-1.5 px-2 text-center font-bold">ECO</th>
                          <th className="py-1.5 px-2 text-center font-bold">AVG</th>
                          <th className="py-1.5 px-2 text-center font-bold">SR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-semibold">
                        {bowlerOrderWiseStats.comfortRows.map((c, cIdx) => (
                          <tr key={cIdx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-3 text-cyan-300 font-bold">{c.hand}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{c.overs}</td>
                            <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">{c.wkt}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{c.eco}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{c.avg}</td>
                            <td className="py-1.5 px-2 text-center text-slate-300">{c.sr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 3. RUNS CONCEDED COMPOSITION */}
                  <div className="text-[11px] font-bold text-white uppercase mb-1 tracking-wider">RUNS CONCEDED COMPOSITION</div>
                  <div className="w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b1726]">
                    <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                      <thead>
                        <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="py-1.5 px-2 text-center font-bold">1's</th>
                          <th className="py-1.5 px-2 text-center font-bold">2's</th>
                          <th className="py-1.5 px-2 text-center font-bold">3's</th>
                          <th className="py-1.5 px-2 text-center font-bold">4's</th>
                          <th className="py-1.5 px-2 text-center font-bold">6's</th>
                        </tr>
                      </thead>
                      <tbody className="font-semibold">
                        <tr>
                          <td className="py-1.5 px-2 text-center text-cyan-300 font-bold">{bowlerOrderWiseStats.composition.ones}</td>
                          <td className="py-1.5 px-2 text-center text-cyan-300 font-bold">{bowlerOrderWiseStats.composition.twos}</td>
                          <td className="py-1.5 px-2 text-center text-cyan-300 font-bold">{bowlerOrderWiseStats.composition.threes}</td>
                          <td className="py-1.5 px-2 text-center text-amber-400 font-bold">{bowlerOrderWiseStats.composition.fours}</td>
                          <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">{bowlerOrderWiseStats.composition.sixes}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            id="bowler-order-type-graphical-node"
            className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
            style={{ fontFamily: 'sans-serif' }}
          >
            <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

            <div className="pl-6 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                  {matchTitle}
                </h1>

                <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                  <span className="text-slate-950 text-sm">■</span> ORDER TYPE REPORT - GRAPHICAL
                </div>
              </div>

              <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-white tracking-wider">ORDER WISE REPORT</div>
                  <div className="text-[10px] text-cyan-400/80 mb-2">Bowling split by batting order, batter hand comfort, and runs conceded composition.</div>

                  {/* Bowler Summary Header Pill */}
                  <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-2.5 mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                      <div className="text-[10px] text-slate-400">Graphical order-wise breakdown</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                        OVR {bowlerInningStats.total.overs}
                      </span>
                      <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                        WK {bowlerInningStats.total.wkt}
                      </span>
                      <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                        Runs {bowlerInningStats.total.runs}
                      </span>
                    </div>
                  </div>

                  {/* 3 Grid Boxes Side-by-Side */}
                  <div className="grid grid-cols-3 gap-3 w-full">
                    {/* Box 1: BATTING TYPE WISE RUNS GIVEN */}
                    <div className="bg-[#0b1726] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-between">
                      <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-2 text-center">
                        BATTING TYPE WISE RUNS GIVEN
                      </div>
                      <div className="w-full flex justify-center items-center">
                        {renderBattingTypeBarChart(bowlerOrderWiseStats.comfortRows)}
                      </div>
                    </div>

                    {/* Box 2: RUNS CONCEDED COMPOSITION */}
                    <div className="bg-[#0b1726] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-between">
                      <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-2 text-center">
                        RUNS CONCEDED COMPOSITION
                      </div>
                      <div className="w-full flex justify-center items-center">
                        {renderDonutChart(bowlerOrderWiseStats.composition)}
                      </div>
                    </div>

                    {/* Box 3: COMFORT LEVEL */}
                    <div className="bg-[#0b1726] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-between">
                      <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-2 text-center">
                        COMFORT LEVEL
                      </div>
                      <div className="w-full flex justify-center items-center">
                        {renderComfortHorizontalBarChart(bowlerOrderWiseStats.comfortRows)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {bowlerBoundaryRatioStats.map((stat, bIdx) => {
          const tableSlideNum = boundaryRatioBaseSlideNum + (bIdx * 2);
          const graphSlideNum = boundaryRatioBaseSlideNum + (bIdx * 2) + 1;

          return (
            <React.Fragment key={stat.innId}>
                <div
                  id={`bowler-boundary-ratio-${stat.innId}-node`}
                  className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                  <div className="pl-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                        {matchTitle}
                      </h1>

                      <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                        <span className="text-slate-950 text-sm">■</span> BOUNDARY RATIO - ( {stat.innName.toUpperCase()} )
                      </div>
                    </div>

                    <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-extrabold uppercase text-white tracking-wider">BOUNDARY RATIO REPORT</div>
                        <div className="text-[10px] text-cyan-400/80 mb-2">Over-ball index boundary frequencies for {stat.innName}.</div>

                        {/* Bowler Summary Header Pill */}
                        <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-2.5 mb-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-extrabold text-white uppercase">{activeBowler?.name}</div>
                            <div className="text-[10px] text-slate-400">{stat.innName} summary</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                              OVR {stat.overs}
                            </span>
                            <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                              WK {stat.wkts}
                            </span>
                            <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                              Runs {stat.runs}
                            </span>
                          </div>
                        </div>

                        {/* Metric Cards Grid (10 Columns) */}
                        <div className="grid grid-cols-10 gap-2 mb-4">
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">MATCHES</div>
                            <div className="text-base font-extrabold text-white mt-0.5">{stat.matchesCount}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">INNINGS</div>
                            <div className="text-base font-extrabold text-white mt-0.5">{stat.innId}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 1</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball1}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 2</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball2}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 3</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball3}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 4</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball4}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 5</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball5}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-slate-800 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">BALL 6</div>
                            <div className="text-base font-extrabold text-cyan-300 mt-0.5">{stat.ball6}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-emerald-600/40 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-emerald-400 uppercase">TOTAL</div>
                            <div className="text-base font-extrabold text-emerald-300 mt-0.5">{stat.total}</div>
                          </div>
                          <div className="bg-[#0b1726] border border-rose-600/40 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-rose-400 uppercase">WKTS</div>
                            <div className="text-base font-extrabold text-rose-300 mt-0.5">{stat.wkts}</div>
                          </div>
                        </div>

                        {/* Breakdown Table */}
                        <div className="text-[11px] font-bold text-white uppercase mb-1.5 tracking-wider">INNINGS BOUNDARY RATIO BREAKDOWN</div>
                        <div className="w-full overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b1726]">
                          <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                            <thead>
                              <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                                <th className="py-2 px-3 font-bold">Match</th>
                                <th className="py-2 px-2 text-center font-bold">Inning</th>
                                <th className="py-2 px-3 font-bold">Bowl</th>
                                <th className="py-2 px-3 font-bold">Team</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 1</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 2</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 3</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 4</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 5</th>
                                <th className="py-2 px-2 text-center font-bold">Ball 6</th>
                                <th className="py-2 px-2 text-center font-bold">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 font-semibold">
                              <tr className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-2 px-3 text-cyan-300 font-bold">{matchDetails?.ClubAPrefix || 'TeamA'} vs {matchDetails?.ClubBPrefix || 'TeamB'}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.innId}</td>
                                <td className="py-2 px-3 text-slate-300">{activeBowler?.name || 'Bowler'}</td>
                                <td className="py-2 px-3 text-slate-300">{activeTeam?.name || 'Team'}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball1}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball2}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball3}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball4}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball5}</td>
                                <td className="py-2 px-2 text-center text-slate-300">{stat.ball6}</td>
                                <td className="py-2 px-2 text-center text-emerald-400 font-extrabold">{stat.total}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  id={`bowler-boundary-ratio-graphical-${stat.innId}-node`}
                  className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                  <div className="pl-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                        {matchTitle}
                      </h1>

                      <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                        <span className="text-slate-950 text-sm">■</span> BOUNDARY RATIO - GRAPHICAL
                      </div>
                    </div>

                    <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between items-center">
                      <div className="w-full flex-1 flex items-center justify-center pt-2">
                        {renderBoundaryRatioBarChart(stat)}
                      </div>
                    </div>
                  </div>
                </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
