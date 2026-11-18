// Multi-match Batter / Bowler report stats for one player across several matches.
// Each match goes through the match report's buildMatchModel (so innings totals, dismissal text,
// bowling figures etc. match the post match report); the player's deliveries are then pooled.

import { buildMatchModel, matchCategoryOf, accOf, oversText, econ, sr } from '../match-report/matchStats';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const num = (v) => Number(v) || 0;
const flag = (v) => v === 1 || v === true || v === '1';

export const BOWLING_TYPE_PREFIX = {
  1: 'RAF', 2: 'LAF', 3: 'RAM', 4: 'LAM', 5: 'RAMF', 6: 'LAMF', 7: 'RAFM', 8: 'LAFM', 9: 'RAO', 10: 'SLAO', 11: 'RALB', 12: 'LAC'
};
const BOWLING_TYPE_NAME = {
  1: 'RIGHT ARM FAST', 2: 'LEFT ARM FAST', 3: 'RIGHT ARM MEDIUM', 4: 'LEFT ARM MEDIUM', 5: 'RIGHT ARM MEDIUM FAST',
  6: 'LEFT ARM MEDIUM FAST', 7: 'RIGHT ARM FAST MEDIUM', 8: 'LEFT ARM FAST MEDIUM', 9: 'RIGHT ARM OFF SPIN',
  10: 'SLOW LEFT ARM ORTHODOX', 11: 'RIGHT ARM LEG SPIN', 12: 'LEFT ARM CHINAMAN'
};

// Same over ranges as the single-match Batter / Bowler reports
const PHASES = {
  T20: [['01-06', 1, 6], ['07-10', 7, 10], ['11-15', 11, 15], ['16-20', 16, 20]],
  ODI: [['01-10', 1, 10], ['11-20', 11, 20], ['21-30', 21, 30], ['31-40', 31, 40], ['41-50', 41, 50]],
  MULTIDAY: [['1-25 (NEW BALL)', 1, 25], ['26-60', 26, 60], ['61-80', 61, 80], ['81+ (2ND NEW BALL)', 81, 999]]
};
const phaseGroups = (balls, category) => (PHASES[category] || PHASES.MULTIDAY)
  .map(([label, from, to]) => ({ label, balls: balls.filter((b) => num(b.OverId) >= from && num(b.OverId) <= to) }))
  .filter((g) => g.balls.length);

// Beaten / uncomfortable flags as used by the single-match reports
const isBeaten = (b) => String(b.BatSubject) === '5';
const isUncomfortable = (b) => (b.Batsman ? String(b.Batsman).split(',').map((s) => s.trim()).includes('5') : false);

const matchLabel = (d) => {
  const date = String(d?.Date || '').slice(0, 10).split('-').reverse().join('/');
  return `${d?.ClubAPrefix || 'A'} v ${d?.ClubBPrefix || 'B'}${date ? ` ${date}` : ''}`;
};

// matches: [{ details, balls }] ; role: 'batter' | 'bowler'
export function buildPlayerModel(matches, playerId, role) {
  const pid = String(playerId);
  const sorted = [...matches].sort((a, b) => String(a.details?.Date || '').localeCompare(String(b.details?.Date || '')));
  const playerBalls = [];
  const rows = [];
  const players = new Map();
  const competitions = new Set();
  let info = null;

  sorted.forEach(({ details, balls }) => {
    if (!balls?.length) return;
    const model = buildMatchModel(balls, details);
    model.players.forEach((p, id) => { if (!players.has(id)) players.set(id, p); });
    if (details?.CompFullName) competitions.add(details.CompFullName);
    if (!info && model.players.get(pid)) info = model.players.get(pid);

    model.innings.forEach((inn) => {
      const label = matchLabel(details);
      if (role === 'batter') {
        const r = inn.battingRows.find((x) => x.id === pid);
        if (!r) return;
        rows.push({ match: label, opponent: inn.bowlingTeam, innings: ROMAN[inn.inningsId] || inn.inningsId, ...r });
        playerBalls.push(...inn.balls.filter((b) => String(b.StrikerID) === pid));
        // a run-out at the non-striker's end still counts as the dismissal ball
        inn.balls.filter((b) => String(b.DismissedBatter) === pid && String(b.StrikerID) !== pid).forEach((b) => playerBalls.push({ ...b, __nonStrikerOut: true }));
      } else {
        const r = inn.bowlingRows.find((x) => x.id === pid);
        if (!r) return;
        rows.push({ match: label, opponent: inn.battingTeam, innings: ROMAN[inn.inningsId] || inn.inningsId, ...r });
        playerBalls.push(...inn.balls.filter((b) => String(b.BowlerID) === pid));
      }
    });
  });

  const category = matchCategoryOf(playerBalls[0]?.MatchTypeID ?? sorted[0]?.details?.MatchTypeID);
  const matchesPlayed = new Set(rows.map((r) => r.match)).size;
  const style = role === 'batter'
    ? (info?.bat === 2 ? 'LEFT HAND BATSMAN' : 'RIGHT HAND BATSMAN')
    : (BOWLING_TYPE_NAME[info?.bowlType] || 'BOWLER');

  const base = {
    role,
    name: info?.name || 'PLAYER',
    clubId: info?.clubId,
    style,
    category,
    competitions: [...competitions],
    matchesSelected: sorted.length,
    matchesPlayed,
    rows,
    players,
    balls: playerBalls.filter((b) => !b.__nonStrikerOut),
    phases: phaseGroups(playerBalls.filter((b) => !b.__nonStrikerOut), category)
  };

  return role === 'batter' ? { ...base, ...batterExtras(rows, playerBalls, pid) } : { ...base, ...bowlerExtras(rows, playerBalls) };
}

function batterExtras(rows, playerBalls, pid) {
  const faced = playerBalls.filter((b) => !b.__nonStrikerOut);
  const runs = rows.reduce((s, r) => s + r.runs, 0);
  const balls = rows.reduce((s, r) => s + r.balls, 0);
  const outs = rows.filter((r) => r.isOut).length;
  const best = [...rows].sort((a, b) => b.runs - a.runs || Number(a.isOut) - Number(b.isOut))[0];
  const total = {
    inns: rows.length,
    runs,
    balls,
    notOuts: rows.length - outs,
    outs,
    avg: outs ? (runs / outs).toFixed(2) : '-',
    sr: sr(runs, balls),
    dots: rows.reduce((s, r) => s + r.dots, 0),
    fours: rows.reduce((s, r) => s + r.fours, 0),
    sixes: rows.reduce((s, r) => s + r.sixes, 0),
    fifties: rows.filter((r) => r.runs >= 50 && r.runs < 100).length,
    hundreds: rows.filter((r) => r.runs >= 100).length,
    hs: best ? `${best.runs}${best.isOut ? '' : '*'}` : '-'
  };

  const outsIn = (set) => set.filter((b) => String(b.DismissedBatter) === pid && flag(b.Dismissal)).length;

  // Comfort level against each bowling type
  const byType = new Map();
  faced.forEach((b) => {
    const t = BOWLING_TYPE_PREFIX[num(b.BwBowlingTypeID)] || 'OTHER';
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(b);
  });
  const comfort = [...byType.entries()].map(([type, set]) => {
    const acc = accOf(set);
    const o = outsIn(set);
    return {
      type, acc, outs: o,
      overs: oversText(acc.faced),
      sr: sr(acc.batRuns, acc.faced),
      avg: o ? (acc.batRuns / o).toFixed(2) : '-'
    };
  }).sort((a, b) => b.acc.faced - a.acc.faced);

  return {
    total,
    outsIn,
    comfort,
    // beaten, uncomfortable or dismissed (incl. a non-striker run-out ball)
    troubleBalls: playerBalls.filter((b) => (!b.__nonStrikerOut && (isBeaten(b) || isUncomfortable(b))) || (String(b.DismissedBatter) === pid && flag(b.Dismissal)))
  };
}

function bowlerExtras(rows, playerBalls) {
  const acc = accOf(playerBalls);
  const total = {
    inns: rows.length,
    overs: oversText(acc.legal),
    maidens: rows.reduce((s, r) => s + r.maidens, 0),
    runs: acc.bowlRuns,
    wkts: acc.bowlWkts,
    eco: econ(acc.bowlRuns, acc.legal),
    avg: acc.bowlWkts ? (acc.bowlRuns / acc.bowlWkts).toFixed(2) : '-',
    sr: acc.bowlWkts ? (acc.legal / acc.bowlWkts).toFixed(1) : '-',
    dots: acc.bowlDots,
    fours: acc.fours,
    sixes: acc.sixes,
    fourFors: rows.filter((r) => r.wkts === 4).length,
    fiveFors: rows.filter((r) => r.wkts >= 5).length,
    best: [...rows].sort((a, b) => b.wkts - a.wkts || a.runs - b.runs)[0]
  };

  const summary = (label, set) => {
    const a = accOf(set);
    return {
      label, acc: a,
      overs: oversText(a.legal),
      eco: econ(a.bowlRuns, a.legal),
      avg: a.bowlWkts ? (a.bowlRuns / a.bowlWkts).toFixed(2) : '-',
      sr: a.bowlWkts ? (a.legal / a.bowlWkts).toFixed(1) : '-'
    };
  };

  // Batting order of the striker (1-3 top, 4-7 middle, 8+ lower), as in the single-match report
  const orderOf = (b) => {
    const pos = num(b.BatOrder);
    if (pos >= 1 && pos <= 3) return 'TOP ORDER';
    if (pos >= 8) return 'LOWER ORDER';
    return 'MIDDLE ORDER';
  };
  const orderWise = ['TOP ORDER', 'MIDDLE ORDER', 'LOWER ORDER'].map((o) => summary(o, playerBalls.filter((b) => orderOf(b) === o)));
  const handWise = [['RHB', 1], ['LHB', 2]].map(([label, t]) => summary(label, playerBalls.filter((b) => (num(b.StBattingTypeID) === 2 ? 2 : 1) === t)));

  // Boundaries conceded by ball of the over (legal deliveries numbered 1-6 within each over)
  const boundaryByBall = Array.from({ length: 6 }, () => ({ fours: 0, sixes: 0, balls: 0 }));
  const byMatchOver = new Map();
  playerBalls.forEach((b) => {
    const key = `${b.MatchId}|${b.InningsId}|${b.OverId}`;
    if (!byMatchOver.has(key)) byMatchOver.set(key, []);
    byMatchOver.get(key).push(b);
  });
  byMatchOver.forEach((overBalls) => {
    let n = 0;
    [...overBalls].sort((a, b) => num(a.BallId) - num(b.BallId)).forEach((b) => {
      const isLegal = flag(b.Bowlballs);
      const pos = Math.min(6, n + 1) - 1;
      boundaryByBall[pos].balls += isLegal ? 1 : 0;
      if (flag(b.isFour)) boundaryByBall[pos].fours += 1;
      if (flag(b.isSix)) boundaryByBall[pos].sixes += 1;
      if (isLegal) n += 1;
    });
  });

  return {
    total,
    phaseSummary: (g) => summary(g.label, g.balls),
    orderWise,
    handWise,
    boundaryByBall,
    troubleBalls: playerBalls.filter((b) => isBeaten(b) || isUncomfortable(b) || flag(b.Bowlwkts))
  };
}
