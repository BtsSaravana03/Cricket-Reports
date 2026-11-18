import React from 'react';
import { col, graphicsSlide } from '../match-report/slides';
import { COLORS, ComboBarLine, LineCompare, GroupedBars } from '../match-report/charts';
import { BOWLING_METRICS, accOf, oversText, pct, sr } from '../match-report/matchStats';

// Multi-match Batter / Bowler report slides. Same sections as the single-match reports; the
// innings-wise sections list every innings of every selected match.

const ROWS_PER_PAGE = 11;
const chunk = (rows, size) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out.length ? out : [[]];
};
const shortTeam = (name = '') => String(name).split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 4);

export function buildPlayerSlides(model, { teamName }) {
  const slides = [];
  const role = model.role;
  const isBatter = role === 'batter';
  const competition = model.competitions.join(' / ');
  const tag = `${model.name} · ${model.matchesPlayed} MATCHES · ${competition}`.toUpperCase();
  const add = (key, section, nav, slide) => slides.push({ key, section, nav, group: section, tag, ...slide });
  const perspective = isBatter ? 'batting' : 'bowling';
  const t = model.total;

  slides.push({
    key: 'cover',
    kind: 'cover',
    nav: 'Cover',
    group: 'COVER',
    cover: {
      kicker: isBatter ? 'MULTI-MATCH BATTER REPORT' : 'MULTI-MATCH BOWLER REPORT',
      title: model.name,
      lines: [model.style, teamName, competition].filter(Boolean),
      result: isBatter
        ? `${model.matchesPlayed} MATCHES · ${t.inns} INNINGS · ${t.runs} RUNS · AVG ${t.avg} · SR ${t.sr}`
        : `${model.matchesPlayed} MATCHES · ${t.inns} INNINGS · ${t.wkts} WICKETS · AVG ${t.avg} · ECO ${t.eco}`
    }
  });

  // ===== STATS =====
  const summaryBlock = isBatter
    ? {
      type: 'table',
      title: 'CONSOLIDATED SUMMARY',
      fontSize: 10,
      columns: [col('INNS'), col('RUNS'), col('BALLS'), col('N.O'), col('AVG'), col('S/R'), col("50'S"), col("100'S"), col('4s'), col('6s'), col('H.S')],
      rows: [{ cells: [t.inns, t.runs, t.balls, t.notOuts, t.avg, t.sr, t.fifties, t.hundreds, t.fours, t.sixes, t.hs], tone: 'total' }]
    }
    : {
      type: 'table',
      title: 'CONSOLIDATED SUMMARY',
      fontSize: 10,
      columns: [col('INNS'), col('OVERS'), col('MD'), col('RUNS'), col('WKTS'), col('ECO'), col('AVG'), col('S/R'), col('4W'), col('5W'), col('BEST')],
      rows: [{ cells: [t.inns, t.overs, t.maidens, t.runs, t.wkts, t.eco, t.avg, t.sr, t.fourFors, t.fiveFors, t.best ? `${t.best.wkts}/${t.best.runs}` : '-'], tone: 'total' }]
    };

  const inningsRows = model.rows.map((r) => (isBatter
    ? { cells: [r.match, r.opponent.toUpperCase(), r.innings, `${r.runs}${r.isOut ? '' : '*'}`, r.balls, r.dots, r.fours, r.sixes, r.sr, r.howOut], tone: r.isOut ? '' : 'highlight' }
    : { cells: [r.match, r.opponent.toUpperCase(), r.innings, r.overs, r.maidens, r.runs, r.wkts, r.econ, r.dots, r.fours, r.sixes, r.wides, r.noballs] }));
  const inningsColumns = isBatter
    ? [col('MATCH', 'left', 1.7), col('OPPONENT', 'left', 1.5), col('INN', 'center', 0.5), col('RUNS', 'center', 0.6), col('BALLS', 'center', 0.6), col('DOTS', 'center', 0.6), col('4s', 'center', 0.5), col('6s', 'center', 0.5), col('S/R', 'center', 0.65), col('DISMISSAL', 'left', 2.4)]
    : [col('MATCH', 'left', 1.7), col('OPPONENT', 'left', 1.5), col('INN', 'center', 0.5), col('OVR'), col('MD'), col('RUNS'), col('WK'), col('ECO'), col('DOTS'), col('4s'), col('6s'), col('WD'), col('NB')];
  const pages = chunk(inningsRows, ROWS_PER_PAGE);
  pages.forEach((rows, p) => add(`stats-${p}`, isBatter ? 'BATTING STATS' : 'BOWLING STATS', pages.length > 1 ? `Match-wise (${p + 1}/${pages.length})` : 'Match-wise', {
    title: `${isBatter ? 'BATTING' : 'BOWLING'} STATS${pages.length > 1 ? ` (${p + 1}/${pages.length})` : ''}`,
    cols: 1,
    blocks: [
      ...(p === 0 ? [summaryBlock] : []),
      {
        type: 'table',
        title: 'MATCH-WISE (EVERY INNINGS)',
        fontSize: 9,
        columns: inningsColumns,
        rows: rows.length ? rows : [{ cells: ['No innings in the selected matches', ...Array(inningsColumns.length - 1).fill('')] }]
      }
    ]
  }));

  const chartCats = model.rows.map((r) => `${shortTeam(r.opponent)} ${r.innings}`);
  add('graphical', isBatter ? 'BATTING STATS' : 'BOWLING STATS', 'Graphical Representation', {
    title: `${isBatter ? 'BATTING' : 'BOWLING'} STATS GRAPHICAL REPRESENTATION`,
    cols: 1,
    blocks: [{
      type: 'chart',
      title: isBatter ? 'RUNS (BARS) & STRIKE RATE (LINE) BY INNINGS' : 'WICKETS (BARS) & ECONOMY (LINE) BY INNINGS',
      render: (w) => (
        <ComboBarLine
          width={w}
          height={330}
          categories={chartCats}
          bars={isBatter
            ? { name: 'RUNS', color: COLORS.blue, values: model.rows.map((r) => r.runs) }
            : { name: 'WICKETS', color: COLORS.blue, values: model.rows.map((r) => r.wkts) }}
          line={isBatter
            ? { name: 'STRIKE RATE', color: COLORS.red, values: model.rows.map((r) => r.sr) }
            : { name: 'ECONOMY', color: COLORS.red, values: model.rows.map((r) => r.econ) }}
        />
      ),
      note: 'Each bar is one innings: opponent initials and the match innings number.'
    }]
  });

  // ===== GRAPHICS =====
  slides.push(graphicsSlide(
    { key: 'overall', section: 'OVER ALL', nav: 'Overall Graphics', group: 'OVER ALL', tag },
    'OVER ALL - PITCH MAP · BEEHIVE · WAGON WHEEL', model.balls, 'player-all', model.players, perspective
  ));
  slides.push(graphicsSlide(
    { key: 'trouble', section: 'OVER ALL', nav: 'Beaten, Uncomfortable & Dismissal Areas', group: 'OVER ALL', tag },
    'BEATEN, UNCOMFORTABLE & DISMISSAL AREAS', model.troubleBalls, 'player-trouble', model.players, perspective
  ));

  // ===== PHASE WISE =====
  const phaseCols = [col(model.category === 'MULTIDAY' ? 'OVERS' : 'PHASE', 'left', 1.8), ...model.phases.map((g) => col(g.label)), col('TOTAL')];
  if (isBatter) {
    const metrics = [
      ['RUNS', (a) => a.batRuns], ['BALLS', (a) => a.faced], ['STRIKE RATE', (a) => sr(a.batRuns, a.faced)],
      ['DOTS', (a) => a.batDots], ['DOT %', (a) => pct(a.batDots, a.faced)], ['1s', (a) => a.ones], ['2s', (a) => a.twos],
      ['3s', (a) => a.threes], ['4s', (a) => a.fours], ['6s', (a) => a.sixes], ['BOUNDARY %', (a) => pct(a.fours + a.sixes, a.faced)]
    ];
    const accs = model.phases.map((g) => accOf(g.balls));
    const totalAcc = accOf(model.balls);
    add('phases', 'PHASE WISE', 'Phase-wise Stats', {
      title: 'PHASE WISE BATTING',
      cols: 5,
      blocks: [
        {
          type: 'table',
          span: 3,
          fontSize: 9.5,
          columns: phaseCols,
          rows: [
            ...metrics.map(([label, get]) => ({ cells: [label, ...accs.map(get), get(totalAcc)] })),
            { cells: ['DISMISSALS', ...model.phases.map((g) => model.outsIn(g.balls)), model.outsIn(model.balls)], tone: 'total' }
          ]
        },
        {
          type: 'chart',
          span: 2,
          title: 'DOT % vs BOUNDARY % BY PHASE',
          render: (w) => (
            <LineCompare
              width={w}
              height={290}
              categories={model.phases.map((g) => g.label)}
              series={[
                { name: 'DOT %', color: COLORS.navy, values: accs.map((a) => (a.faced ? (a.batDots * 100) / a.faced : null)) },
                { name: 'BOUNDARY %', color: COLORS.amber, values: accs.map((a) => (a.faced ? ((a.fours + a.sixes) * 100) / a.faced : null)) }
              ]}
            />
          )
        }
      ]
    });
  } else {
    const accs = model.phases.map((g) => accOf(g.balls));
    const totalAcc = accOf(model.balls);
    add('phases', 'PHASE WISE', 'Phase-wise Stats', {
      title: 'PHASE WISE BOWLING',
      cols: 5,
      blocks: [
        {
          type: 'table',
          span: 3,
          fontSize: 9.5,
          columns: phaseCols,
          rows: BOWLING_METRICS.map((m) => ({ cells: [m.label, ...accs.map(m.get), m.get(totalAcc)] }))
        },
        {
          type: 'chart',
          span: 2,
          title: 'WICKETS (BARS) & ECONOMY (LINE) BY PHASE',
          render: (w) => (
            <ComboBarLine
              width={w}
              height={290}
              categories={model.phases.map((g) => g.label)}
              bars={{ name: 'WICKETS', color: COLORS.blue, values: accs.map((a) => a.bowlWkts) }}
              line={{ name: 'ECONOMY', color: COLORS.red, values: accs.map((a) => (a.legal ? ((a.bowlRuns * 6) / a.legal).toFixed(2) : null)) }}
            />
          )
        }
      ]
    });
  }
  model.phases.forEach((g) => slides.push(graphicsSlide(
    { key: `phase-gfx-${g.label}`, section: 'PHASE WISE', nav: `Phase ${g.label} - Graphics`, group: 'PHASE WISE', tag },
    `PHASE WISE - ( ${g.label} OVERS )`, g.balls, `player-phase-${g.label}`, model.players, perspective
  )));

  // ===== BATTER: COMFORT LEVEL =====
  if (isBatter) {
    add('comfort', 'COMFORT LEVEL', 'Comfort Level Report', {
      title: 'COMFORT LEVEL REPORT',
      cols: 1,
      blocks: [{
        type: 'table',
        title: 'COMFORT LEVEL AGAINST BOWLING TYPE',
        fontSize: 10,
        columns: [col('TYPE', 'left', 1), col('BALLS'), col('OVERS'), col('RUNS'), col('WKT'), col('STR'), col('AVG'), col('DOT %'), col('BOUNDARY %', 'center', 1.2)],
        rows: [
          ...model.comfort.map((c) => ({ cells: [c.type, c.acc.faced, c.overs, c.acc.batRuns, c.outs, c.sr, c.avg, pct(c.acc.batDots, c.acc.faced), pct(c.acc.fours + c.acc.sixes, c.acc.faced)] })),
          { cells: ['TOTAL', t.balls, oversText(t.balls), t.runs, t.outs, t.sr, t.avg, pct(t.dots, t.balls), pct(t.fours + t.sixes, t.balls)], tone: 'total' }
        ]
      }]
    });
    add('comfort-graphical', 'COMFORT LEVEL', 'Comfort Level - Graphical', {
      title: 'COMFORT LEVEL REPORT - GRAPHICAL',
      cols: 1,
      blocks: [{
        type: 'chart',
        title: 'RUNS (BARS) & STRIKE RATE (LINE) BY BOWLING TYPE',
        render: (w) => (
          <ComboBarLine
            width={w}
            height={330}
            categories={model.comfort.map((c) => c.type)}
            bars={{ name: 'RUNS', color: COLORS.blue, values: model.comfort.map((c) => c.acc.batRuns) }}
            line={{ name: 'STRIKE RATE', color: COLORS.red, values: model.comfort.map((c) => c.sr) }}
          />
        )
      }]
    });
  }

  // ===== BOWLER: ORDER WISE & BOUNDARY RATIO =====
  if (!isBatter) {
    const splitRow = (s) => ({ cells: [s.label, s.overs, s.acc.bowlRuns, s.acc.bowlWkts, s.eco, s.avg, s.sr, s.acc.bowlDots, s.acc.fours, s.acc.sixes] });
    const splitCols = (first) => [col(first, 'left', 1.5), col('OVR'), col('RUNS'), col('WK'), col('ECO'), col('AVG'), col('SR'), col('DOTS'), col('4s'), col('6s')];
    add('order-wise', 'ORDER WISE', 'Order Wise Report', {
      title: 'ORDER WISE REPORT',
      cols: 1,
      blocks: [
        { type: 'table', title: 'AGAINST BATTING ORDER', fontSize: 10, columns: splitCols('ORDER'), rows: model.orderWise.map(splitRow) },
        { type: 'table', title: 'AGAINST BATTER TYPE', fontSize: 10, columns: splitCols('HAND'), rows: model.handWise.map(splitRow) }
      ]
    });
    add('order-graphical', 'ORDER WISE', 'Order Type Report - Graphical', {
      title: 'ORDER TYPE REPORT - GRAPHICAL',
      cols: 2,
      blocks: [model.orderWise, model.handWise].map((set, i) => ({
        type: 'chart',
        span: 1,
        title: i === 0 ? 'BY BATTING ORDER' : 'BY BATTER TYPE',
        render: (w) => (
          <ComboBarLine
            width={w}
            height={320}
            categories={set.map((s) => s.label)}
            bars={{ name: 'WICKETS', color: COLORS.blue, values: set.map((s) => s.acc.bowlWkts) }}
            line={{ name: 'ECONOMY', color: COLORS.red, values: set.map((s) => (s.eco === '-' ? null : s.eco)) }}
          />
        )
      }))
    });
    const totalBalls = model.boundaryByBall.reduce((s, b) => s + b.balls, 0);
    add('boundary-ratio', 'BOUNDARY RATIO', 'Boundary Ratio', {
      title: 'BOUNDARY RATIO',
      cols: 5,
      blocks: [
        {
          type: 'table',
          span: 2,
          title: 'BOUNDARIES CONCEDED BY BALL OF THE OVER',
          fontSize: 10,
          columns: [col('BALL', 'left', 1), col('BALLS'), col('4s'), col('6s'), col('BDRY %', 'center', 1.1)],
          rows: [
            ...model.boundaryByBall.map((b, i) => ({ cells: [`BALL ${i + 1}`, b.balls, b.fours, b.sixes, pct(b.fours + b.sixes, b.balls)] })),
            {
              cells: ['TOTAL', totalBalls, model.boundaryByBall.reduce((s, b) => s + b.fours, 0), model.boundaryByBall.reduce((s, b) => s + b.sixes, 0),
                pct(model.boundaryByBall.reduce((s, b) => s + b.fours + b.sixes, 0), totalBalls)],
              tone: 'total'
            }
          ]
        },
        {
          type: 'chart',
          span: 3,
          title: 'BOUNDARY RATIO - GRAPHICAL',
          render: (w) => (
            <GroupedBars
              width={w}
              height={300}
              categories={model.boundaryByBall.map((_, i) => `BALL ${i + 1}`)}
              series={[
                { name: '4s', color: COLORS.amber, values: model.boundaryByBall.map((b) => b.fours) },
                { name: '6s', color: COLORS.red, values: model.boundaryByBall.map((b) => b.sixes) }
              ]}
            />
          )
        }
      ]
    });
  }

  return slides.map((s, i) => ({ ...s, page: i + 1 }));
}
