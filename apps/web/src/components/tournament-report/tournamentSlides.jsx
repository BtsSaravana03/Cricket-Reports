import React from 'react';
import { col } from '../match-report/slides';
import { COLORS, GroupedBars } from '../match-report/charts';
import { PillLeaders, HexLeaders, RingStat, Gauge } from './infographics';

// Tournament highlights deck (the Ranji Trophy sample's structure), built on the match report's
// slide model so it previews and exports the same way.

const RESULT_COLORS = { WON: '#16a34a', LOST: '#dc2626', DRAW: '#2563eb', TIED: '#7c3aed' };
const TABLE_ROWS = 15; // rows per page before a table continues on the next slide

const chunk = (rows, size) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out.length ? out : [[]];
};

const orNone = (rows, width, text = 'No data yet') => (rows.length ? rows : [{ cells: [text, ...Array(width - 1).fill('')] }]);

export function buildTournamentSlides(model, { competition, season }) {
  const team = (model.teamName || 'TEAM').toUpperCase();
  const seasonLabel = season ? `SEASON ${season}` : 'SEASON';
  const tag = `${seasonLabel} · ${competition}`.toUpperCase();
  const slides = [];
  const add = (key, section, nav, slide) => slides.push({ key, section, nav, group: section, tag, ...slide });

  const wins = model.journey.filter((j) => j.result === 'WON').length;
  const losses = model.journey.filter((j) => j.result === 'LOST').length;
  const draws = model.journey.filter((j) => j.result === 'DRAW').length;

  slides.push({
    key: 'cover',
    kind: 'cover',
    nav: 'Cover',
    group: 'TOURNAMENT',
    cover: {
      kicker: 'TOURNAMENT HIGHLIGHTS',
      title: team,
      lines: [competition, seasonLabel].filter(Boolean),
      result: `${model.totalMatches} MATCHES · WON ${wins} · DRAWN ${draws} · LOST ${losses}`
    }
  });

  // ===== TOURNAMENT =====
  add('journey', 'TOURNAMENT', 'Tournament Journey', {
    title: 'TOURNAMENT JOURNEY',
    cols: 1,
    blocks: [{
      type: 'table',
      fontSize: 10.5,
      columns: [col('MATCH', 'center', 0.6), col('PHASE', 'center', 1.2), col('OPPONENTS', 'center', 2), col('RESULT', 'center', 1.1), col('POINTS', 'center', 0.8)],
      rows: orNone(model.journey.slice(0, 16).map((j) => ({
        cells: [j.matchNo, j.phase, j.opponent.toUpperCase(), { text: j.result, color: RESULT_COLORS[j.result] || COLORS.muted, bold: true }, j.points]
      })), 5, 'No matches found')
    }]
  });

  add('victories', 'TOURNAMENT', 'Largest Victory Margin', {
    title: 'LARGEST VICTORY MARGIN',
    cols: 1,
    blocks: [{
      type: 'table',
      fontSize: 10.5,
      columns: [col('#', 'center', 0.5), col('MATCH', 'center', 0.6), col('PHASE', 'center', 1.2), col('OPPONENTS', 'center', 2), col('VICTORY MARGIN', 'center', 2.2)],
      rows: orNone(model.victories.slice(0, 10).map((v, i) => ({ cells: [i + 1, v.matchNo, v.phase, v.opponent.toUpperCase(), v.margin] })), 5, 'No victories')
    }]
  });

  // ===== BATTING =====
  const batPages = chunk(model.battingRows, TABLE_ROWS);
  batPages.forEach((rows, p) => add(`batting-${p}`, 'BATTING', batPages.length > 1 ? `Overall Batting Stats (${p + 1}/${batPages.length})` : 'Overall Batting Stats', {
    title: batPages.length > 1 ? `OVERALL BATTING STATS (${p + 1}/${batPages.length})` : 'OVERALL BATTING STATS',
    cols: 1,
    blocks: [{
      type: 'table',
      fontSize: 9.5,
      columns: [col('PLAYER', 'left', 2.4), col('MAT'), col('INNS'), col('RUNS'), col('AVG'), col('SR'), col("100'S"), col("50'S"), col('4s'), col('6s'), col('H.S'), col('N.O')],
      rows: orNone(rows.map((r) => ({ cells: [r.name.toUpperCase(), r.mat, r.inns, r.runs, r.avg, r.sr, r.hundreds, r.fifties, r.fours, r.sixes, r.hsText, r.notOuts] })), 12)
    }]
  }));

  const topBatters = model.battingRows.slice(0, 6);
  add('top-run-getters', 'BATTING', 'Top Run Getters', {
    title: 'TOP RUN GETTERS',
    cols: 1,
    blocks: [{ type: 'chart', render: (w) => <PillLeaders width={w} height={360} idPrefix="runs" items={topBatters.map((r) => ({ name: r.name, value: r.runs }))} /> }]
  });

  add('batting-innings-wise', 'BATTING', 'Top Batsman Inning Wise Runs', {
    title: 'TOP BATSMAN INNING WISE RUNS',
    cols: 1,
    blocks: [{
      type: 'chart',
      title: 'RUNS IN THE TEAM\'S 1ST AND 2ND INNINGS OF EACH MATCH',
      render: (w) => (
        <GroupedBars
          width={w}
          height={340}
          categories={topBatters.map((r) => r.name.toUpperCase())}
          series={[
            { name: 'INNING 1', color: '#3b4fa8', values: topBatters.map((r) => r.byInnings[1] || 0) },
            { name: 'INNING 2', color: '#14b8a6', values: topBatters.map((r) => r.byInnings[2] || 0) }
          ]}
        />
      )
    }]
  });

  add('highest-scores', 'BATTING', 'Highest Individual Score', {
    title: 'HIGHEST INDIVIDUAL SCORE',
    cols: 1,
    blocks: [{
      type: 'table',
      fontSize: 10.5,
      columns: [col('PLAYER', 'center', 2), col('OPPONENT', 'center', 1.8), col('INNGS', 'center', 0.7), col('RUNS', 'center', 0.7), col('BALLS', 'center', 0.7), col('4s', 'center', 0.6), col('6s', 'center', 0.6)],
      rows: orNone(model.topScores.slice(0, 10).map((s) => ({ cells: [s.name.toUpperCase(), s.opponent.toUpperCase(), s.innings, `${s.runs}${s.notOut ? '*' : ''}`, s.balls, s.fours, s.sixes] })), 7)
    }]
  });

  // ===== BOWLING =====
  const bowlPages = chunk(model.bowlingRows, TABLE_ROWS);
  bowlPages.forEach((rows, p) => add(`bowling-${p}`, 'BOWLING', bowlPages.length > 1 ? `Overall Bowling Stats (${p + 1}/${bowlPages.length})` : 'Overall Bowling Stats', {
    title: bowlPages.length > 1 ? `OVERALL BOWLING STATS (${p + 1}/${bowlPages.length})` : 'OVERALL BOWLING STATS',
    cols: 1,
    blocks: [{
      type: 'table',
      fontSize: 9.5,
      columns: [col('PLAYER', 'left', 2.4), col('MAT'), col('INNG'), col('OVERS'), col('MD'), col('RUNS'), col('WICK'), col('4 WK'), col('5 WK'), col('ECO'), col('AVG')],
      rows: orNone(rows.map((r) => ({ cells: [r.name.toUpperCase(), r.mat, r.inns, r.overs, r.maidens, r.runs, r.wkts, r.four, r.five, r.eco, r.avg] })), 11)
    }]
  }));

  const topBowlers = model.bowlingRows.filter((r) => r.wkts > 0).slice(0, 6);
  add('top-wicket-takers', 'BOWLING', 'Top Wicket Takers', {
    title: 'TOP WICKET TAKERS',
    cols: 1,
    blocks: [{ type: 'chart', render: (w) => <HexLeaders width={w} height={360} items={topBowlers.map((r) => ({ name: r.name, value: r.wkts }))} /> }]
  });

  add('bowling-innings-wise', 'BOWLING', "Top Bowler's Inning Wise Wickets", {
    title: "TOP BOWLER'S INNING WISE WICKETS",
    cols: 1,
    blocks: [{
      type: 'chart',
      title: "WICKETS IN THE TEAM'S 1ST AND 2ND BOWLING INNINGS OF EACH MATCH",
      render: (w) => (
        <GroupedBars
          width={w}
          height={340}
          categories={topBowlers.map((r) => r.name.toUpperCase())}
          series={[
            { name: 'INNING 1', color: '#3b4fa8', values: topBowlers.map((r) => r.byInnings[1] || 0) },
            { name: 'INNING 2', color: '#14b8a6', values: topBowlers.map((r) => r.byInnings[2] || 0) }
          ]}
        />
      )
    }]
  });

  add('best-bowling', 'BOWLING', 'Best Bowling Figures', {
    title: 'BEST BOWLING FIGURES',
    cols: 1,
    blocks: [{
      type: 'table',
      fontSize: 10.5,
      columns: [col('PLAYER', 'center', 2), col('OPPONENT', 'center', 1.8), col('INNG', 'center', 0.6), col('OVERS', 'center', 0.7), col('RUNS', 'center', 0.7), col('WICKETS', 'center', 0.8)],
      rows: orNone(model.bestBowling.slice(0, 10).map((b) => ({ cells: [b.name.toUpperCase(), b.opponent.toUpperCase(), b.innings, b.overs, b.runs, b.wkts] })), 6)
    }]
  });

  // ===== MILESTONES =====
  const milestoneSlide = (key, nav, title, rows) => add(key, 'MILESTONES', nav, {
    title,
    cols: 4,
    blocks: rows.flatMap(({ label, items, total, idPrefix }) => [
      { type: 'chart', span: 3, title: label, render: (w) => <PillLeaders width={w} height={150} idPrefix={idPrefix} items={items} /> },
      { type: 'chart', span: 1, title: `TOTAL ${label}`, render: (w) => <RingStat width={w} height={150} value={total} label={label} /> }
    ])
  });
  const leadersBy = (rows, key) => [...rows].filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, 6).map((r) => ({ name: r.name, value: r[key] }));
  milestoneSlide('hundreds-fifties', 'Total Centuries and Fifties', 'TOTAL CENTURIES AND FIFTIES', [
    { label: 'CENTURIES', idPrefix: 'hund', items: leadersBy(model.battingRows, 'hundreds'), total: model.totals.hundreds },
    { label: 'FIFTIES', idPrefix: 'fift', items: leadersBy(model.battingRows, 'fifties'), total: model.totals.fifties }
  ]);
  milestoneSlide('fivers-tens', 'Total Fifer and Ten Wickets', 'TOTAL FIFER AND TEN WICKETS', [
    { label: 'FIFERS', idPrefix: 'five', items: leadersBy(model.bowlingRows, 'five'), total: model.totals.fivers },
    { label: 'TEN WICKETS', idPrefix: 'tenw', items: leadersBy(model.bowlingRows, 'ten'), total: model.totals.tens }
  ]);

  // ===== PARTNERSHIPS =====
  const ordinalWkt = (n) => `${n}${['ST', 'ND', 'RD'][n - 1] || 'TH'}`.toLowerCase();
  add('partnerships', 'PARTNERSHIPS', 'Highest Partnership', {
    title: 'HIGHEST PARTNERSHIP',
    cols: 1,
    blocks: [{
      type: 'table',
      fontSize: 10,
      columns: [col('PARTNERS', 'center', 3), col('RUNS', 'center', 0.7), col('WICKET', 'center', 0.7), col('OPPONENTS', 'center', 1.8)],
      rows: orNone(model.partnerships.slice(0, 12).map((p) => ({ cells: [p.partners.toUpperCase(), `${p.runs}${p.unbroken ? '*' : ''}`, ordinalWkt(p.wicket), p.opponent.toUpperCase()] })), 4)
    }]
  });
  add('partnerships-wicket', 'PARTNERSHIPS', 'Highest Partnership Wicket Wise', {
    title: 'HIGHEST PARTNERSHIP WICKET WISE',
    cols: 1,
    blocks: [{
      type: 'table',
      fontSize: 10.5,
      columns: [col('WICKET', 'center', 0.7), col('RUNS', 'center', 0.7), col('PARTNERS', 'center', 3), col('OPPONENTS', 'center', 1.8)],
      rows: orNone(model.partnershipsByWicket.map((p) => ({ cells: [ordinalWkt(p.wicket), `${p.runs}${p.unbroken ? '*' : ''}`, p.partners.toUpperCase(), p.opponent.toUpperCase()] })), 4)
    }]
  });

  // ===== FIELDING =====
  const fieldingLeaders = (key) => [...model.fieldingRows].filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, 6).map((r) => ({ name: r.name, value: r[key] }));
  const fieldingSlide = (key, nav, title, leaderKey, totalLabel, total, idPrefix) => add(key, 'FIELDING', nav, {
    title,
    cols: 4,
    blocks: [
      { type: 'chart', span: 3, title: `${title} - TOP FIELDERS`, render: (w) => <PillLeaders width={w} height={340} idPrefix={idPrefix} items={fieldingLeaders(leaderKey)} /> },
      {
        type: 'chart',
        span: 1,
        title: 'TOURNAMENT',
        render: (w) => (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <RingStat width={w} height={165} value={total} label={totalLabel} color={leaderKey === 'drops' ? COLORS.red : COLORS.green} />
            <RingStat width={w} height={165} value={model.totalMatches} label="TOTAL MATCHES" color={COLORS.blue} />
          </div>
        )
      }
    ]
  });
  fieldingSlide('catches', 'Most Catches Taken', 'MOST CATCHES TAKEN', 'catches', 'TOTAL CATCHES TAKEN', model.totals.catches, 'ctch');
  fieldingSlide('drops', 'Catches Dropped', 'CATCHES DROPPED', 'drops', 'TOTAL CATCHES DROPPED', model.totals.drops, 'drop');

  const savedMax = Math.max(model.totals.runsSaved, model.totals.runsMissed, 1);
  add('runs-saved', 'FIELDING', 'Total Runs Saved and Missed', {
    title: 'TOTAL RUNS SAVED AND MISSED',
    cols: 3,
    blocks: [
      { type: 'chart', span: 1, title: 'TOTAL MATCHES', render: (w) => <RingStat width={w} height={230} value={model.totalMatches} label="MATCHES" color={COLORS.blue} /> },
      { type: 'chart', span: 1, title: 'RUNS SAVED', render: (w) => <Gauge width={w} height={230} value={model.totals.runsSaved} max={savedMax} label="RUNS SAVED" color={COLORS.green} /> },
      { type: 'chart', span: 1, title: 'RUNS MISSED', render: (w) => <Gauge width={w} height={230} value={model.totals.runsMissed} max={savedMax} label="RUNS MISSED" color={COLORS.red} /> }
    ]
  });

  // ===== WICKET KEEPING (one slide per keeper) =====
  model.keepers.slice(0, 3).forEach((k, i) => add(`keeper-${i}`, 'FIELDING', `Wicket Keeper's Stats - ${k.name}`, {
    title: `WICKET KEEPER'S STATS - ${k.name.toUpperCase()}`,
    cols: 3,
    blocks: [
      ['MATCHES KEPT', k.mat, COLORS.blue, model.totalMatches],
      ['CATCHES TAKEN', k.catches, COLORS.green],
      ['CATCHES DROPPED', k.drops, COLORS.red],
      ['STUMPINGS', k.stumpings, COLORS.green],
      ['STUMPINGS MISSED', k.stMissed, COLORS.red],
      ['BYES CONCEDED', k.byes, COLORS.amber]
    ].map(([label, value, color, max]) => ({
      type: 'chart',
      span: 1,
      render: (w) => <RingStat width={w} height={165} value={value} label={label} color={color} max={max} />
    }))
  }));

  return slides.map((s, i) => ({ ...s, page: i + 1 }));
}
