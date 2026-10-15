import React from 'react';
import {
  BATTING_METRICS, BOWLING_METRICS, LENGTH_BANDS, LINES,
  pitchGrid, heightTable, regionTable, oversText, econ, pct, sr, bowlAvg, bowlSr
} from './matchStats';
import { COLORS, PartnershipBars, FowByWicketChart, ComboBarLine, LineCompare, GroupedBars, HBarCompare } from './charts';

// ---------------------------------------------------------------------------
// Slide model
//
// A slide is { key, nav, group, tag, section, title, cols, blocks, graphics? }.
// Blocks are laid out on a CSS grid of `cols` columns (block.span defaults to all columns):
//   { type: 'table', title, columns: [{ label, align, w }], rows: [{ cells, tone }], note }
//   { type: 'chart', title, render: (innerWidth) => <svg/> }
//   { type: 'graphic', title, kind: 'pitchmap' | 'beehive' | 'ww' }   (image from Graphics API)
// The same model drives the HTML preview, the PDF snapshot and the native PPTX export.
// ---------------------------------------------------------------------------

export const SLIDE_W = 900;
export const SLIDE_H = 525;
const BODY_W = SLIDE_W - 44 - 24; // left bar + gutter, right gutter
const GAP = 10;
const PANEL_PAD = 18;            // panel padding + border, both sides

export const GRAPHIC_KINDS = ['pitchmap', 'beehive', 'ww'];
const GRAPHIC_TITLES = { pitchmap: 'PITCH MAP', beehive: 'BEEHIVE', ww: 'WAGON WHEEL' };

const col = (label, align = 'center', w = 1) => ({ label, align, w });
const shortName = (name = '') => {
  const parts = String(name).replace(/\s*\(c\)|\s*†/g, '').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]} ${parts.slice(1).join(' ')}` : name;
};
const surname = (name = '') => String(name).trim().split(/\s+/).pop();

// Rows = metrics, columns = groups (+ TOTAL)
const metricTable = (metrics, groups, totalAcc, firstLabel) => ({
  type: 'table',
  columns: [col(firstLabel, 'left', 2.3), ...groups.map((g) => col(g.label)), col('TOTAL')],
  rows: metrics.map((m) => ({ cells: [m.label, ...groups.map((g) => m.get(g.acc)), m.get(totalAcc)] }))
});

const fowTable = (inn) => ({
  type: 'table',
  title: 'FALL OF WICKETS',
  columns: [col('', 'left', 1.1), ...inn.fow.map((f) => col(`${f.wkt}${['ST', 'ND', 'RD'][f.wkt - 1] || 'TH'}`))],
  rows: inn.fow.length
    ? [
      { cells: ['SCORE', ...inn.fow.map((f) => `${f.score}/${f.wkt}`)] },
      { cells: ['OVER', ...inn.fow.map((f) => f.over)] },
      { cells: ['BATTER', ...inn.fow.map((f) => shortName(f.batterName))] }
    ]
    : [{ cells: ['No wickets fell'] }],
  fontSize: 9
});

// --- Graphics data tables -------------------------------------------------

const pitchTableBlock = (balls, players, perspective) => {
  const grid = pitchGrid(balls, players);
  const cell = (a) => {
    if (!a.faced) return '-';
    return perspective === 'bowling' ? `${a.bowlRuns}-${a.bowlWkts} (${a.legal})` : `${a.batRuns} (${a.faced})`;
  };
  return {
    type: 'table',
    title: perspective === 'bowling' ? 'LENGTH x LINE · RUNS-WKTS (BALLS)' : 'LENGTH x LINE · RUNS (BALLS)',
    columns: [col('LENGTH', 'left', 1.45), col('OFF'), col('STUMPS', 'center', 1.1), col('LEG'), col('TOTAL', 'center', 1.35)],
    rows: [
      ...LENGTH_BANDS.map(({ label }) => ({ cells: [label, ...LINES.map((l) => cell(grid.cells[label][l])), cell(grid.cells[label].TOTAL)] })),
      { cells: ['TOTAL', ...LINES.map((l) => cell(grid.lineTotals[l])), cell(grid.total)], tone: 'total' }
    ],
    fontSize: perspective === 'bowling' ? 7.5 : 8
  };
};

const heightTableBlock = (balls, perspective) => ({
  type: 'table',
  title: 'HEIGHT AT STUMPS (CM)',
  columns: perspective === 'bowling'
    ? [col('HEIGHT', 'left', 2.2), col('BALLS'), col('RUNS'), col('WKTS'), col('DOT %', 'center', 1.1)]
    : [col('HEIGHT', 'left', 2.2), col('BALLS'), col('RUNS'), col('SR'), col('OUTS')],
  rows: heightTable(balls).map(({ label, acc }) => ({
    cells: perspective === 'bowling'
      ? [label, acc.legal, acc.bowlRuns, acc.bowlWkts, pct(acc.bowlDots, acc.legal)]
      : [label, acc.faced, acc.batRuns, sr(acc.batRuns, acc.faced), acc.wkts]
  })),
  fontSize: 8
});

const regionTableBlock = (balls) => {
  const rows = regionTable(balls);
  const totalRuns = rows.reduce((s, r) => s + r.acc.batRuns, 0);
  return {
    type: 'table',
    title: 'SCORING AREAS',
    columns: [col('REGION', 'left', 1.7), col('RUNS'), col('4s'), col('6s'), col('% RUNS', 'center', 1.2)],
    rows: rows.map(({ label, acc }) => ({ cells: [label, acc.batRuns, acc.fours, acc.sixes, pct(acc.batRuns, totalRuns)] })),
    fontSize: 8
  };
};

const graphicsSlide = (base, title, balls, graphicsKey, players, perspective) => ({
  ...base,
  title,
  cols: 3,
  graphics: { key: graphicsKey, balls },
  blocks: [
    ...GRAPHIC_KINDS.map((kind) => ({ type: 'graphic', kind, title: GRAPHIC_TITLES[kind], span: 1 })),
    {
      ...pitchTableBlock(balls, players, perspective),
      span: 1,
      note: balls.some((b) => Number(b.PM_X) > 0 || Number(b.WagonWheelX) > 0) ? '' : 'No ball-tracking data was captured for these deliveries.'
    },
    { ...heightTableBlock(balls, perspective), span: 1 },
    { ...regionTableBlock(balls), span: 1 }
  ]
});

// ---------------------------------------------------------------------------
// Slide list
// ---------------------------------------------------------------------------

export function buildSlides(model, matchDetails) {
  const info = matchDetails?.info || {};
  const teamA = matchDetails?.ClubAFull || matchDetails?.ClubAPrefix || 'TEAM A';
  const teamB = matchDetails?.ClubBFull || matchDetails?.ClubBPrefix || 'TEAM B';
  const isMultiDay = model.category === 'MULTIDAY';
  const slides = [];

  slides.push({
    key: 'cover',
    kind: 'cover',
    nav: 'Cover',
    group: 'MATCH',
    cover: {
      title: `${teamA} vs ${teamB}`,
      lines: [
        info.Series || matchDetails?.CompFullName || '',
        [info.Venue || matchDetails?.StadiumName, info.City || matchDetails?.City].filter(Boolean).join(', '),
        [info.Date, info.Format].filter(Boolean).join(' · ')
      ].filter(Boolean),
      result: model.resultText
    }
  });

  // --- Match summary -------------------------------------------------------
  const allBatters = model.innings.flatMap((inn) => inn.battingRows.map((r) => ({ ...r, team: inn.battingTeam })));
  const allBowlers = model.innings.flatMap((inn) => inn.bowlingRows.map((r) => ({ ...r, team: inn.bowlingTeam })));
  slides.push({
    key: 'summary',
    nav: 'Match Summary',
    group: 'MATCH',
    tag: `${teamA} vs ${teamB}`.toUpperCase(),
    section: 'MATCH SUMMARY',
    title: model.resultText,
    cols: 2,
    blocks: [
      {
        type: 'table',
        title: 'INNINGS SUMMARY',
        span: 2,
        columns: [col('INNINGS', 'left', 1.1), col('BATTING', 'left', 1.6), col('SCORE'), col('OVERS'), col('RUN RATE'), col('4s'), col('6s'), col('EXTRAS'), col('TOP SCORER', 'left', 2)],
        rows: model.innings.map((inn) => {
          const top = [...inn.battingRows].sort((a, b) => b.runs - a.runs)[0];
          return {
            cells: [inn.label, inn.battingTeam, inn.scoreText, inn.oversText, inn.runRate, inn.total.fours, inn.total.sixes, inn.extrasTotal,
              top ? `${top.name} ${top.runs}${top.isOut ? '' : '*'} (${top.balls})` : '-']
          };
        })
      },
      {
        type: 'table',
        title: 'MATCH INFORMATION',
        span: 1,
        columns: [col('', 'left', 1.35), col('', 'left', 2.4)],
        hideHeader: true,
        rows: [
          ['SERIES', info.Series || matchDetails?.CompFullName],
          ['VENUE', [info.Venue || matchDetails?.StadiumName, info.City].filter(Boolean).join(', ')],
          ['DATE', [info.Date, info.Time].filter(Boolean).join(' ')],
          ['FORMAT', info.Format],
          ['TOSS', info.Toss],
          ['RESULT', model.resultText],
          ['PLAYER OF THE MATCH', matchDetails?.MomPlayerName],
          ['UMPIRES', info.Umpires],
          ['MATCH REFEREE', info['Match Refree']]
        ].filter(([, v]) => v).map(([k, v]) => ({ cells: [k, v] }))
      },
      {
        type: 'table',
        title: 'TOP PERFORMERS',
        span: 1,
        columns: [col('PLAYER', 'left', 2.2), col('TEAM', 'left', 1.3), col('FIGURES', 'center', 1.3), col('SR / ECON', 'center', 1)],
        rows: [
          { cells: ['BATTING', '', '', ''], tone: 'sub' },
          ...[...allBatters].sort((a, b) => b.runs - a.runs).slice(0, 4)
            .map((r) => ({ cells: [r.name, r.team, `${r.runs}${r.isOut ? '' : '*'} (${r.balls})`, r.sr] })),
          { cells: ['BOWLING', '', '', ''], tone: 'sub' },
          ...[...allBowlers].sort((a, b) => b.wkts - a.wkts || a.runs - b.runs).slice(0, 4)
            .map((r) => ({ cells: [r.name, r.team, `${r.wkts}/${r.runs} (${r.overs})`, r.econ] }))
        ]
      }
    ]
  });

  // --- Multi-day: session report and team pace / spin comparison ----------
  if (isMultiDay) {
    const sessionRows = model.sessions.map((sess) => {
      const rows = sess.rows.map((r, i) => ({
        cells: [i === 0 ? `DAY ${sess.day}` : '', i === 0 ? `SESSION ${sess.session}` : '', r.inningsLabel, r.battingTeam,
          oversText(r.acc.legal), r.acc.runs, r.acc.wkts, econ(r.acc.runs, r.acc.legal)]
      }));
      if (sess.rows.length > 1) {
        rows.push({
          cells: ['', '', 'SESSION TOTAL', '', oversText(sess.acc.legal), sess.acc.runs, sess.acc.wkts, econ(sess.acc.runs, sess.acc.legal)],
          tone: 'sub'
        });
      }
      return rows;
    });
    // Keep each session's rows together and start a new slide after ~16 rows
    const pages = [];
    sessionRows.forEach((rows) => {
      if (!pages.length || pages[pages.length - 1].length + rows.length > 16) pages.push([]);
      pages[pages.length - 1].push(...rows);
    });
    pages.forEach((rows, i) => {
      slides.push({
        key: `sessions-${i + 1}`,
        nav: pages.length > 1 ? `Session Report (${i + 1}/${pages.length})` : 'Session Report',
        group: 'MATCH',
        tag: `${teamA} vs ${teamB}`.toUpperCase(),
        section: 'SESSION REPORT',
        title: pages.length > 1 ? `SESSION REPORT (${i + 1}/${pages.length})` : 'SESSION REPORT',
        cols: 1,
        blocks: [{
          type: 'table',
          title: 'OVERS BOWLED, RUNS & WICKETS BY SESSION',
          fontSize: 10,
          columns: [col('DAY', 'left', 0.8), col('SESSION', 'left', 1), col('INNINGS', 'left', 1.3), col('BATTING', 'left', 1.8), col('OVERS'), col('RUNS'), col('WICKETS'), col('RUN RATE')],
          rows,
          note: i === pages.length - 1
            ? `MATCH TOTAL: ${oversText(model.sessions.reduce((t, x) => t + x.acc.legal, 0))} overs · ${model.sessions.reduce((t, x) => t + x.acc.runs, 0)} runs · ${model.sessions.reduce((t, x) => t + x.acc.wkts, 0)} wickets`
            : ''
        }]
      });
    });

    const teamsBowling = [...new Set(model.paceSpinTeams.map((t) => t.team))];
    const teamColors = [COLORS.blue, COLORS.amber];
    const skillChart = (title, get) => ({
      type: 'chart',
      span: 1,
      title,
      render: (w) => (
        <GroupedBars
          width={w}
          height={170}
          categories={['PACERS', 'SPINNERS']}
          series={teamsBowling.map((team, i) => ({
            name: team.toUpperCase(),
            color: teamColors[i % 2],
            values: ['PACE', 'SPIN'].map((skill) => get(model.paceSpinTeams.find((t) => t.team === team && t.skill === skill).acc))
          }))}
        />
      )
    });
    slides.push({
      key: 'pace-spin-teams',
      nav: 'Pacers vs Pacers, Spinners vs Spinners',
      group: 'MATCH',
      tag: `${teamA} vs ${teamB}`.toUpperCase(),
      section: 'BOWLING COMPARISON',
      title: 'PACERS vs PACERS · SPINNERS vs SPINNERS',
      cols: 2,
      blocks: [
        {
          type: 'table',
          span: 2,
          fontSize: 10,
          columns: [col('BOWLING', 'left', 1), col('TEAM', 'left', 1.8), col('OVERS'), col('WICKETS'), col('RUNS'), col('BOWL AVG'), col('BOWL SR')],
          rows: model.paceSpinTeams.map((t) => ({
            cells: [t.skill === 'PACE' ? 'PACERS' : 'SPINNERS', t.team, oversText(t.acc.legal), t.acc.bowlWkts, t.acc.bowlRuns, bowlAvg(t.acc), bowlSr(t.acc)],
            tone: t.skill === 'SPIN' ? 'sub' : ''
          }))
        },
        skillChart('BOWLING AVERAGE (RUNS PER WICKET)', bowlAvg),
        skillChart('BOWLING STRIKE RATE (BALLS PER WICKET)', bowlSr)
      ]
    });
  }

  // --- Per innings ---------------------------------------------------------
  model.innings.forEach((inn) => {
    const { players } = model;
    const tag = `${inn.label} · ${inn.battingTeam} ${inn.scoreText} (${inn.oversText} OV) vs ${inn.bowlingTeam}`.toUpperCase();
    const group = `${inn.label} - ${inn.battingTeam.toUpperCase()} BATTING`;
    const base = (key, section, nav) => ({ key: `inn${inn.inningsId}-${key}`, tag, section, nav, group });
    const groupWord = isMultiDay ? 'DAY' : 'PHASE';
    const bowlGroupWord = isMultiDay ? 'SESSION' : 'PHASE';

    // ===== TEAM SCORECARD =====
    const battingTotalRow = {
      cells: ['', 'TOTAL', `${inn.total.wkts} wkts · ${inn.oversText} ov · RR ${inn.runRate}`, inn.total.runs, inn.total.faced, '', inn.total.fours, inn.total.sixes, ''],
      tone: 'total'
    };
    slides.push({
      ...base('bat-card', 'TEAM SCORECARD', 'Batting Scorecard'),
      title: `${inn.battingTeam} - BATTING SCORECARD`,
      cols: 1,
      blocks: [
        {
          type: 'table',
          columns: [col('#', 'center', 0.35), col('BATTER', 'left', 2.3), col('DISMISSAL', 'left', 3.3), col('R', 'center', 0.55), col('B', 'center', 0.55), col('0s', 'center', 0.55), col('4s', 'center', 0.55), col('6s', 'center', 0.55), col('SR', 'center', 0.7)],
          rows: [
            ...inn.battingRows.map((r, i) => ({ cells: [i + 1, r.name, r.howOut, r.runs, r.balls, r.dots, r.fours, r.sixes, r.sr], tone: r.isOut ? '' : 'highlight' })),
            { cells: ['', 'EXTRAS', `b ${inn.extras.b}, lb ${inn.extras.lb}, w ${inn.extras.w}, nb ${inn.extras.nb}, p ${inn.extras.p}`, inn.extrasTotal, '', '', '', '', ''], tone: 'sub' },
            battingTotalRow
          ],
          note: inn.didNotBat.length ? `DID NOT BAT: ${inn.didNotBat.join(', ')}` : ''
        },
        fowTable(inn)
      ]
    });

    const bowlTotal = inn.total;
    slides.push({
      ...base('bowl-card', 'TEAM SCORECARD', 'Bowling Scorecard'),
      title: `${inn.bowlingTeam} - BOWLING SCORECARD`,
      cols: 1,
      blocks: [
        {
          type: 'table',
          // Multi-day shows bowling average & strike rate where limited overs shows dot balls
          columns: [col('#', 'center', 0.35), col('BOWLER', 'left', 2.4), col('TYPE', 'center', 0.7), col('O'), col('M'), col('R'), col('W'), col('ECON'),
            ...(isMultiDay ? [col('AVG'), col('SR')] : [col('0s')]), col('4s'), col('6s'), col('WD'), col('NB')],
          rows: [
            ...inn.bowlingRows.map((r, i) => ({
              cells: [i + 1, r.name, r.type, r.overs, r.maidens, r.runs, r.wkts, r.econ, ...(isMultiDay ? [r.avg, r.sr] : [r.dots]), r.fours, r.sixes, r.wides, r.noballs]
            })),
            {
              cells: ['', 'TOTAL', '', oversText(bowlTotal.legal), inn.bowlingRows.reduce((s, r) => s + r.maidens, 0), bowlTotal.bowlRuns, bowlTotal.bowlWkts,
                econ(bowlTotal.bowlRuns, bowlTotal.legal), ...(isMultiDay ? [bowlAvg(bowlTotal), bowlSr(bowlTotal)] : [bowlTotal.bowlDots]),
                bowlTotal.fours, bowlTotal.sixes, bowlTotal.wides, bowlTotal.noballs],
              tone: 'total'
            }
          ]
        },
        {
          type: 'chart',
          title: isMultiDay ? 'BOWLING AVERAGE & STRIKE RATE BY BOWLER' : 'DOT BALLS & ECONOMY BY BOWLER',
          render: (w) => (
            <ComboBarLine
              width={w}
              height={Math.max(140, Math.min(240, 400 - (inn.bowlingRows.length + 1) * 20 - 90 - (isMultiDay ? 14 : 0)))}
              categories={inn.bowlingRows.map((r) => surname(r.name).toUpperCase())}
              bars={isMultiDay
                ? { name: 'BOWLING AVERAGE', color: COLORS.blue, values: inn.bowlingRows.map((r) => r.avg) }
                : { name: 'DOT BALLS', color: COLORS.green, values: inn.bowlingRows.map((r) => r.dots) }}
              line={isMultiDay
                ? { name: 'STRIKE RATE', color: COLORS.red, values: inn.bowlingRows.map((r) => r.sr) }
                : { name: 'ECONOMY', color: COLORS.red, values: inn.bowlingRows.map((r) => r.econ) }}
            />
          ),
          note: isMultiDay ? 'Bowlers without a wicket have no average or strike rate.' : ''
        }
      ]
    });

    // ===== BATTING PERFORMANCE =====
    const battingComparison = (key, word, groups, firstLabel) => ({
      ...base(key, 'BATTING PERFORMANCE', `${word[0]}${word.slice(1).toLowerCase()}-wise Comparison`),
      title: `${word}-WISE BATTING COMPARISON`,
      cols: 5,
      blocks: [
        { ...metricTable(BATTING_METRICS, groups, inn.total, firstLabel), span: 3, fontSize: 9 },
        {
          type: 'chart',
          span: 2,
          title: `DOT % vs BOUNDARY % BY ${word}`,
          render: (w) => (
            <LineCompare
              width={w}
              height={290}
              categories={groups.map((g) => g.label)}
              series={[
                { name: 'DOT %', color: COLORS.navy, values: groups.map((g) => (g.acc.faced ? (g.acc.batDots * 100) / g.acc.faced : null)) },
                { name: 'BOUNDARY %', color: COLORS.amber, values: groups.map((g) => (g.acc.faced ? ((g.acc.fours + g.acc.sixes) * 100) / g.acc.faced : null)) }
              ]}
            />
          ),
          note: 'Boundary % = 4s + 6s per ball faced.'
        }
      ]
    });
    slides.push(battingComparison('bat-phase', groupWord, inn.battingGroups, groupWord === 'DAY' ? 'DAY' : 'OVERS'));
    if (isMultiDay) slides.push(battingComparison('bat-session', 'SESSION', inn.bowlingGroups, 'SESSION'));

    const [pace, spin] = inn.paceSpinBatting;
    const paceSpinMetrics = BATTING_METRICS.filter((m) => !['3s', 'BOUNDARY RUNS %', 'EXTRAS'].includes(m.label));
    slides.push({
      ...base('bat-pacespin', 'BATTING PERFORMANCE', 'Pace vs Spin'),
      title: 'PACE vs SPIN COMPARISON',
      cols: 5,
      blocks: [
        {
          type: 'table',
          span: 3,
          fontSize: 10.5,
          columns: [col('', 'left', 1.8), col('vs PACE'), col('vs SPIN'), col('TOTAL')],
          rows: paceSpinMetrics.map((m) => ({ cells: [m.label, m.get(pace.acc), m.get(spin.acc), m.get(inn.total)] }))
        },
        {
          type: 'chart',
          span: 2,
          title: 'PACE vs SPIN AT A GLANCE',
          render: (w) => (
            <HBarCompare
              width={w}
              aLabel="vs PACE"
              bLabel="vs SPIN"
              metrics={[
                { label: 'RUNS', a: pace.acc.batRuns, b: spin.acc.batRuns },
                { label: 'STRIKE RATE', a: sr(pace.acc.batRuns, pace.acc.faced), b: sr(spin.acc.batRuns, spin.acc.faced) },
                { label: 'DOT %', a: pct(pace.acc.batDots, pace.acc.faced), b: pct(spin.acc.batDots, spin.acc.faced) },
                { label: 'BOUNDARIES', a: pace.acc.fours + pace.acc.sixes, b: spin.acc.fours + spin.acc.sixes },
                { label: 'WICKETS LOST', a: pace.acc.wkts, b: spin.acc.wkts }
              ]}
            />
          )
        }
      ]
    });

    slides.push({
      ...base('bat-partnerships', 'BATTING PERFORMANCE', 'Partnerships'),
      title: 'PARTNERSHIPS',
      cols: 1,
      blocks: [{
        type: 'chart',
        title: 'PARTNERSHIP RUNS (BALLS) - BATTER CONTRIBUTIONS',
        render: (w) => <PartnershipBars width={w} partnerships={inn.partnerships} rowHeight={Math.min(44, Math.floor(370 / Math.max(1, inn.partnerships.length)))} />
      }]
    });

    slides.push({
      ...base('bat-fow', 'BATTING PERFORMANCE', 'Fall of Wickets'),
      title: 'FALL OF WICKETS',
      cols: 1,
      blocks: [
        {
          type: 'chart',
          title: 'SCORE AT THE FALL OF EACH WICKET',
          render: (w) => <FowByWicketChart width={w} height={250} wickets={inn.fow.map((f) => ({ ...f, batterName: shortName(f.batterName) }))} />
        },
        fowTable(inn)
      ]
    });

    const chip = (ball) => {
      if (!ball) return '';
      const tone = /[a-z]/.test(ball.label) ? ['#ede9fe', '#5b21b6']
        : ball.runs >= 6 ? ['#bbf7d0', '#166534']
          : ball.runs === 4 ? ['#fde68a', '#92400e']
            : ball.runs > 0 ? ['#dbeafe', '#1e40af'] : ['#e2e8f0', '#475569'];
      return { text: ball.label, bg: tone[0], color: tone[1], bold: true };
    };
    const lastN = isMultiDay ? 10 : 5;
    slides.push({
      ...base('bat-lastballs', 'BATTING PERFORMANCE', `Last ${lastN} Balls Before Dismissal`),
      title: `LAST ${lastN} BALLS BEFORE DISMISSAL`,
      cols: 1,
      blocks: [{
        type: 'table',
        title: 'EACH DISMISSED BATTER - OLDEST TO LATEST',
        fontSize: isMultiDay ? 9 : 9.5,
        columns: [col('WKT', 'center', 0.45), col('BATTER', 'left', isMultiDay ? 1.8 : 2), col('SCORE', 'center', 0.8),
          ...Array.from({ length: lastN }, (_, i) => col(`-${lastN - i}`, 'center', isMultiDay ? 0.42 : 0.5)),
          col('OUT', 'center', 0.55), col('OVER', 'center', 0.55), col('HOW OUT', 'left', isMultiDay ? 2.4 : 2.8)],
        rows: inn.lastBalls.length
          ? inn.lastBalls.map((d) => {
            const recent = d.previous.slice(-lastN);
            const prev = [...Array(lastN - recent.length).fill(null), ...recent];
            return {
              cells: [d.wkt || '-', d.name, d.score, ...prev.map(chip),
                { text: d.facedOutBall ? 'W' : 'W*', bg: '#dc2626', color: '#ffffff', bold: true }, d.over, d.howOut]
            };
          })
          : [{ cells: ['-', 'No dismissals', ...Array(lastN + 4).fill('')] }],
        note: "Runs off the bat on each ball faced (nb = no ball, lb / b = leg byes / byes). W* = dismissed at the non-striker's end."
      }]
    });

    slides.push(graphicsSlide(
      { ...base('bat-gfx-all', 'BATTING PERFORMANCE', 'Graphics - Overall') },
      `${inn.battingTeam} BATTING GRAPHICS - OVERALL`, inn.balls, `inn${inn.inningsId}-all`, players, 'batting'
    ));
    if (inn.battingGroups.length > 1) {
      inn.battingGroups.forEach((g) => {
        slides.push(graphicsSlide(
          { ...base(`bat-gfx-${g.label}`, 'BATTING PERFORMANCE', `Graphics - ${g.label}`) },
          `${inn.battingTeam} BATTING GRAPHICS - ${isMultiDay ? g.label : `${g.label} OVERS`}`, g.balls, `inn${inn.inningsId}-${g.label}`, players, 'batting'
        ));
      });
    }

    // ===== BOWLING PERFORMANCE =====
    slides.push({
      ...base('bowl-phase', 'BOWLING PERFORMANCE', `${bowlGroupWord === 'SESSION' ? 'Session' : 'Phase'}-wise Comparison`),
      title: `${bowlGroupWord}-WISE BOWLING COMPARISON - ${inn.bowlingTeam}`,
      cols: 5,
      blocks: [
        { ...metricTable(BOWLING_METRICS, inn.bowlingGroups, inn.total, isMultiDay ? 'SESSION' : 'OVERS'), span: 2, title: 'TEAM BOWLING', fontSize: 9.5 },
        {
          type: 'table',
          span: 3,
          title: 'BOWLER-WISE · OVERS-RUNS-WKTS',
          fontSize: 9.5,
          columns: [col('BOWLER', 'left', 2), ...inn.bowlingGroups.map((g) => col(g.label)), col('TOTAL')],
          rows: inn.bowlingRows.map((r) => ({
            cells: [
              r.name,
              ...inn.bowlingGroups.map((g) => {
                const a = g.balls.filter((b) => String(b.BowlerID) === r.id).reduce((acc, b) => {
                  acc.legal += b.Bowlballs ? 1 : 0; acc.runs += Number(b.Bowlruns) || 0; acc.wkts += b.Bowlwkts ? 1 : 0; return acc;
                }, { legal: 0, runs: 0, wkts: 0 });
                return a.legal || a.runs ? `${oversText(a.legal)}-${a.runs}-${a.wkts}` : '-';
              }),
              `${r.overs}-${r.runs}-${r.wkts}`
            ]
          }))
        }
      ]
    });

    slides.push({
      ...base('bowl-pairs', 'BOWLING PERFORMANCE', 'Bowling by Pairs'),
      title: 'BOWLING BY PAIRS',
      cols: 1,
      blocks: [{
        type: 'table',
        title: 'BOWLERS OPERATING IN TANDEM (CONSECUTIVE OVERS)',
        fontSize: 10.5,
        columns: [col('PAIR', 'left', 3.2), col('OVERS'), col('SPELLS'), col('RUNS'), col('WKTS'), col('ECON'), col('DOTS'), col('DOT %'), col('4s'), col('6s')],
        rows: inn.pairs.slice(0, 14).map((p) => ({
          cells: [p.names.join(' & '), oversText(p.acc.legal), p.spells, p.acc.bowlRuns, p.acc.bowlWkts, econ(p.acc.bowlRuns, p.acc.legal), p.acc.bowlDots, pct(p.acc.bowlDots, p.acc.legal), p.acc.fours, p.acc.sixes]
        })),
        note: 'Each over is credited to the bowler of that over and the bowler of the over before it.'
      }]
    });

    const ends = [...new Set(inn.endWise.map((e) => e.end))];
    slides.push({
      ...base('bowl-ends', 'BOWLING PERFORMANCE', 'End-wise'),
      title: 'BOWLING END-WISE - PACE vs SPIN',
      cols: 5,
      blocks: [
        {
          type: 'table',
          span: 3,
          columns: [col('END', 'left', 2.5), col('TYPE', 'center', 0.9), col('OVERS'), col('RUNS'), col('WKTS'), col('ECON'), col('DOT %', 'center', 1.1), col('4s', 'center', 0.7), col('6s', 'center', 0.7)],
          rows: inn.endWise.map((e) => ({
            cells: [e.end, e.skill, oversText(e.acc.legal), e.acc.bowlRuns, e.acc.bowlWkts, econ(e.acc.bowlRuns, e.acc.legal), pct(e.acc.bowlDots, e.acc.legal), e.acc.fours, e.acc.sixes],
            tone: e.isTotal ? 'total' : ''
          }))
        },
        {
          type: 'chart',
          span: 2,
          title: 'ECONOMY BY END',
          render: (w) => (
            <GroupedBars
              width={w}
              height={260}
              categories={ends.map((e) => e.toUpperCase())}
              format={(v) => (v === '-' ? '-' : v)}
              series={['PACE', 'SPIN'].map((skill) => ({
                name: skill,
                color: skill === 'PACE' ? COLORS.blue : COLORS.amber,
                values: ends.map((e) => econ(inn.endWise.find((x) => x.end === e && x.skill === skill).acc.bowlRuns, inn.endWise.find((x) => x.end === e && x.skill === skill).acc.legal))
              }))}
            />
          )
        }
      ]
    });

    slides.push({
      ...base('bowl-hands', 'BOWLING PERFORMANCE', 'vs Batting Pairs'),
      title: 'BOWLING AGAINST BATTING PAIRS',
      cols: 1,
      blocks: [{
        type: 'table',
        title: 'STRIKER & NON-STRIKER COMBINATION',
        fontSize: 10.5,
        columns: [col('BATTING PAIR', 'left', 1.5), col('TYPE'), col('BALLS'), col('RUNS'), col('WKTS'), col('ECON'), col('DOTS'), col('DOT %'), col('4s'), col('6s'), col('BDRY %')],
        rows: inn.vsPairs.map((v) => ({
          cells: [v.combo, v.skill, v.acc.legal, v.acc.bowlRuns, v.acc.bowlWkts, econ(v.acc.bowlRuns, v.acc.legal), v.acc.bowlDots, pct(v.acc.bowlDots, v.acc.legal), v.acc.fours, v.acc.sixes, pct(v.acc.fours + v.acc.sixes, v.acc.legal)],
          tone: v.isTotal ? 'total' : ''
        }))
      }]
    });

    // First & last ball boundaries are a limited-overs view
    if (!isMultiDay) {
      const fl = inn.firstLast;
      const flTotal = fl.rows.reduce((t, r) => {
        ['overs', 'first4', 'first6', 'firstRuns', 'last4', 'last6', 'lastRuns'].forEach((k) => { t[k] += r[k]; });
        return t;
      }, { overs: 0, first4: 0, first6: 0, firstRuns: 0, last4: 0, last6: 0, lastRuns: 0 });
      slides.push({
        ...base('bowl-firstlast', 'BOWLING PERFORMANCE', 'First & Last Ball Boundaries'),
        title: 'FIRST & LAST BALL BOUNDARIES CONCEDED',
        cols: 2,
        blocks: [
          {
            type: 'table',
            title: 'BY BOWLER',
            fontSize: 9.5,
            columns: [col('BOWLER', 'left', 2.2), col('OVERS'), col('1ST 4s'), col('1ST 6s'), col('1ST RUNS', 'center', 1.2), col('LAST 4s'), col('LAST 6s'), col('LAST RUNS', 'center', 1.2)],
            rows: [
              ...fl.rows.map((r) => ({ cells: [r.name, r.overs, r.first4, r.first6, r.firstRuns, r.last4, r.last6, r.lastRuns] })),
              { cells: ['TOTAL', flTotal.overs, flTotal.first4, flTotal.first6, flTotal.firstRuns, flTotal.last4, flTotal.last6, flTotal.lastRuns], tone: 'total' }
            ]
          },
          {
            type: 'table',
            title: 'BOUNDARIES CONCEDED ON FIRST / LAST BALL',
            fontSize: 9.5,
            columns: [col('OVER', 'center', 0.6), col('BALL', 'center', 1.1), col('BOWLER', 'left', 1.6), col('BATTER', 'left', 1.6), col('SHOT', 'left', 1.2), col('RUNS', 'center', 0.6)],
            rows: fl.incidents.length
              ? fl.incidents.slice(0, 16).map((x) => ({ cells: [x.over, x.which, shortName(x.bowler), shortName(x.batter), x.shot, x.runs] }))
              : [{ cells: ['-', 'None', '', '', '', ''] }],
            note: fl.incidents.length > 16 ? `+${fl.incidents.length - 16} more` : ''
          }
        ]
      });

    }

    // Same scopes as the batting graphics (phases, or days in multi-day) so the images are shared
    slides.push(graphicsSlide(
      { ...base('bowl-gfx-all', 'BOWLING PERFORMANCE', 'Graphics - Overall') },
      `${inn.bowlingTeam} BOWLING GRAPHICS - OVERALL`, inn.balls, `inn${inn.inningsId}-all`, players, 'bowling'
    ));
    if (inn.battingGroups.length > 1) {
      inn.battingGroups.forEach((g) => {
        slides.push(graphicsSlide(
          { ...base(`bowl-gfx-${g.label}`, 'BOWLING PERFORMANCE', `Graphics - ${g.label}`) },
          `${inn.bowlingTeam} BOWLING GRAPHICS - ${isMultiDay ? g.label : `${g.label} OVERS`}`, g.balls, `inn${inn.inningsId}-${g.label}`, players, 'bowling'
        ));
      });
    }

    // ===== FIELDING =====
    const f = inn.fielding;
    const s = f.summary;
    slides.push({
      ...base('field-summary', 'FIELDING', 'Fielding Summary'),
      title: `FIELDING SUMMARY - ${inn.bowlingTeam}`,
      cols: 1,
      blocks: [
        {
          type: 'table',
          title: 'TEAM SUMMARY',
          columns: [col('CATCHES'), col('RUN OUTS'), col('STUMPINGS'), col('DROPS'), col('RO MISSED'), col('ST MISSED'), col('MISFIELDS'), col('OVERTHROWS'), col('RUNS SAVED'), col('RUNS GIVEN'), col('CATCH %')],
          rows: [{ cells: [s.catches, s.runOuts, s.stumpings, s.drops, s.roMissed, s.stMissed, s.misfields, s.overthrows, s.runsSaved, s.runsGiven, pct(s.catches, s.catches + s.drops)], tone: 'total' }]
        },
        {
          type: 'table',
          title: 'PLAYER-WISE',
          fontSize: 8.5,
          columns: [col('PLAYER', 'left', 2.4), col('CT'), col('RO'), col('ST'), col('DROPS'), col('RO MISS'), col('ST MISS'), col('MISFIELD'), col('O/THROW'), col('GOOD'), col('SAVED'), col('GIVEN')],
          rows: f.rows.map((r) => ({
            cells: [r.name, r.catches, r.runOuts, r.stumpings, r.drops, r.roMissed, r.stMissed, r.misfields, r.overthrows, r.goodFielding, r.runsSaved, r.runsGiven]
          }))
        }
      ]
    });

    const wtoTotal = f.wtoByKind.reduce((t, k) => ({ o: t.o + k.opportunities, t: t.t + k.taken, m: t.m + k.missed }), { o: 0, t: 0, m: 0 });
    slides.push({
      ...base('field-wto', 'FIELDING', 'WTO & Chances Missed'),
      title: `WICKET-TAKING OPPORTUNITIES - ${inn.bowlingTeam}`,
      cols: 1,
      blocks: [
        {
          type: 'table',
          title: 'WTO SUMMARY',
          fontSize: 10.5,
          columns: [col('CHANCE', 'left', 1.5), col('OPPORTUNITIES'), col('TAKEN'), col('MISSED'), col('CONVERSION %')],
          rows: [
            ...f.wtoByKind.map((k) => ({ cells: [k.kind.toUpperCase(), k.opportunities, k.taken, k.missed, pct(k.taken, k.opportunities)] })),
            { cells: ['TOTAL', wtoTotal.o, wtoTotal.t, wtoTotal.m, pct(wtoTotal.t, wtoTotal.o)], tone: 'total' }
          ]
        },
        {
          type: 'table',
          title: 'CHANCES MISSED',
          fontSize: 8.5,
          columns: [col('OVER', 'center', 0.6), col('CHANCE', 'center', 0.9), col('FIELDER', 'left', 1.6), col('BOWLER', 'left', 1.6), col('BATTER', 'left', 1.6), col('SCORE AT CHANCE', 'center', 1.2), col('FINAL SCORE', 'center', 1), col('RUNS COST', 'center', 0.9)],
          rows: f.missed.length
            ? f.missed.slice(0, 12).map((m) => ({ cells: [m.over, m.kind.toUpperCase(), m.fielder, m.bowler, m.batter, m.scoreAtChance, m.finalScore, m.cost] }))
            : [{ cells: ['-', 'No chances missed', '', '', '', '', '', ''] }],
          note: f.missed.length > 12 ? `+${f.missed.length - 12} more chances missed` : 'Runs cost = runs the batter added after the chance was missed.'
        }
      ]
    });
  });

  return slides.map((sl, i) => ({ ...sl, page: i + 1 }));
}

// ---------------------------------------------------------------------------
// Rendering
//
// data-p* attributes tell the PPTX exporter what each element becomes:
//   data-pshape (filled rectangle), data-ptext (native text), data-ptable (native table),
//   data-pimg (snapshot image). Everything is positioned from the rendered DOM.
// ---------------------------------------------------------------------------

const TONE_STYLE = {
  total: { background: '#e2e8f0', fontWeight: 800, color: '#0f172a' },
  sub: { background: '#f1f5f9', fontWeight: 700, color: '#334155' },
  highlight: { background: '#fefce8', color: '#0f172a' }
};

function TableBlock({ block }) {
  const sum = block.columns.reduce((s, c) => s + (c.w || 1), 0);
  const fontSize = block.fontSize || 9.5;
  return (
    <table data-ptable="" className="w-full border-collapse" style={{ tableLayout: 'fixed', fontSize, lineHeight: 1.2 }}>
      <colgroup>
        {block.columns.map((c, i) => <col key={i} style={{ width: `${((c.w || 1) / sum) * 100}%` }} />)}
      </colgroup>
      {!block.hideHeader && (
        <thead>
          <tr style={{ background: COLORS.navy, color: '#fff' }}>
            {block.columns.map((c, i) => (
              <th key={i} style={{ textAlign: c.align, padding: '3px 4px', fontWeight: 800, fontSize: fontSize - 0.5 }}>{c.label}</th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {block.rows.map((r, ri) => (
          <tr key={ri} style={{ background: ri % 2 ? '#f8fafc' : '#ffffff', color: '#1e293b', ...(TONE_STYLE[r.tone] || {}) }}>
            {r.cells.map((cell, ci) => {
              // A cell is a plain value or { text, bg, color, bold } for coloured "chip" cells
              const styled = cell !== null && typeof cell === 'object';
              const text = styled ? cell.text : cell;
              return (
                <td
                  key={ci}
                  style={{
                    textAlign: block.columns[ci]?.align || 'center',
                    padding: '2.5px 4px',
                    borderBottom: '1px solid #e2e8f0',
                    fontWeight: (styled && cell.bold) || (block.hideHeader && ci === 0) ? 800 : undefined,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    ...(styled ? { background: cell.bg, color: cell.color, border: '2px solid #ffffff' } : {})
                  }}
                >
                  {text === null || text === undefined ? '' : String(text)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GraphicBlock({ block, graphic, width }) {
  const img = graphic?.[block.kind];
  const height = Math.round(width * (img?.h && img?.w ? img.h / img.w : 0.56));
  if (img?.src) {
    return <img data-pimg="" src={img.src} alt={block.title} width={width} height={height} style={{ width, height, display: 'block' }} />;
  }
  return (
    <div data-pimg="" className="flex items-center justify-center bg-slate-100 text-slate-500 text-[10px] font-bold" style={{ width, height }}>
      {graphic?.status === 'loading' || !graphic ? 'LOADING GRAPHIC…' : 'GRAPHIC UNAVAILABLE'}
    </div>
  );
}

const innerWidth = (cols, span) => {
  const colW = (BODY_W - GAP * (cols - 1)) / cols;
  return Math.floor(colW * span + GAP * (span - 1) - PANEL_PAD);
};

function CoverSlide({ slide, id }) {
  const { cover } = slide;
  return (
    <div
      id={id}
      data-slide=""
      className="relative overflow-hidden flex flex-col justify-between text-slate-900 select-none"
      style={{ width: SLIDE_W, height: SLIDE_H, background: '#f6f4eb', padding: 40, fontFamily: 'Arial, sans-serif' }}
    >
      <div data-pshape="" className="absolute" style={{ top: 32, left: 32, width: 80, height: 5, background: COLORS.navy }} />
      <div data-pshape="" className="absolute" style={{ top: 32, left: 32, width: 5, height: 80, background: COLORS.navy }} />
      <div data-pshape="" className="absolute" style={{ bottom: 32, right: 32, width: 80, height: 5, background: COLORS.navy }} />
      <div data-pshape="" className="absolute" style={{ bottom: 32, right: 32, width: 5, height: 80, background: COLORS.navy }} />
      <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
        <div data-ptext="" className="font-extrabold uppercase tracking-[0.3em] text-slate-500" style={{ fontSize: 14 }}>POST MATCH REPORT</div>
        <div data-ptext="" className="font-black uppercase leading-tight mt-3" style={{ fontSize: 40, color: COLORS.navy }}>{cover.title}</div>
        {cover.lines.map((l, i) => (
          <div key={i} data-ptext="" className="font-bold italic uppercase text-slate-700 mt-1" style={{ fontSize: i === 0 ? 17 : 14 }}>{l}</div>
        ))}
        <div data-pshape="" className="mt-6 px-6 py-2 rounded" style={{ background: COLORS.navy }}>
          <div data-ptext="" className="font-extrabold uppercase text-white" style={{ fontSize: 15 }}>{cover.result}</div>
        </div>
      </div>
      <div className="flex justify-between items-end border-t border-slate-300 pt-3 text-[10px] font-bold text-slate-500 uppercase">
        <div data-ptext="">Cricket-21 Analytics Report</div>
        <div data-ptext="">Confidential</div>
      </div>
    </div>
  );
}

export function SlideView({ slide, graphics, footer, id }) {
  if (slide.kind === 'cover') return <CoverSlide slide={slide} id={id} />;
  const cols = slide.cols || 1;
  const graphic = slide.graphics ? graphics?.[slide.graphics.key] : null;

  return (
    <div
      id={id}
      data-slide=""
      className="relative overflow-hidden text-slate-900 select-none"
      style={{ width: SLIDE_W, height: SLIDE_H, background: '#f6f4eb', fontFamily: 'Arial, sans-serif' }}
    >
      <div data-pshape="" className="absolute top-0 left-0 h-full" style={{ width: 20, background: COLORS.navy }} />
      <div className="absolute inset-0 flex flex-col" style={{ padding: '16px 24px 10px 44px' }}>
        <div className="flex justify-between items-end pb-1.5 mb-2.5" style={{ borderBottom: `2px solid ${COLORS.navy}` }}>
          <div className="min-w-0">
            <div data-ptext="" className="font-bold uppercase tracking-wide text-slate-500 truncate" style={{ fontSize: 10 }}>{slide.tag}</div>
            <div data-ptext="" className="font-black uppercase leading-tight truncate" style={{ fontSize: 19, color: COLORS.navy, maxWidth: 640 }}>{slide.title}</div>
          </div>
          <div data-ptext="" className="font-extrabold uppercase text-slate-700 whitespace-nowrap pl-4" style={{ fontSize: 10 }}>■ {slide.section}</div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden grid content-start" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: GAP }}>
          {slide.blocks.map((block, i) => {
            const span = Math.min(block.span || cols, cols);
            const w = innerWidth(cols, span);
            return (
              <div
                key={i}
                data-pshape=""
                className="bg-white rounded-md flex flex-col min-w-0"
                style={{ gridColumn: `span ${span} / span ${span}`, padding: 8, border: '1px solid #cbd5e1' }}
              >
                {block.title && (
                  <div data-ptext="" className="font-extrabold uppercase tracking-wide mb-1" style={{ fontSize: 9.5, color: COLORS.navy }}>■ {block.title}</div>
                )}
                {block.type === 'table' && <TableBlock block={block} />}
                {block.type === 'chart' && <div data-pimg="" style={{ width: w }}>{block.render(w)}</div>}
                {block.type === 'graphic' && <GraphicBlock block={block} graphic={graphic} width={w} />}
                {block.note && <div data-ptext="" className="text-slate-600 font-semibold mt-1" style={{ fontSize: 8.5 }}>{block.note}</div>}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-1 mt-1.5 border-t border-slate-300 font-bold text-slate-500 uppercase" style={{ fontSize: 8.5 }}>
          <span data-ptext="">{footer}</span>
          <span data-ptext="">Cricket-21 Analytics Report · {slide.page}</span>
        </div>
      </div>
    </div>
  );
}
