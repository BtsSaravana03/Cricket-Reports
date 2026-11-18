// Tournament (post-tournament highlights) stats for one team across a competition.
// Each match is first run through the match report's buildMatchModel, then the team's numbers
// are aggregated. Input: [{ details, balls }] where details is /api/getMatchDetails and balls is
// /api/ballbyball for that match.

import { buildMatchModel, oversText, econ } from '../match-report/matchStats';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const idOf = (v) => (v === null || v === undefined || v === '' || Number(v) === 0 ? null : String(v));
const num = (v) => Number(v) || 0;

const teamNameOf = (details, clubId) => {
  if (clubId === idOf(details?.ClubAId)) return details?.ClubAFull || details?.ClubAPrefix || 'TEAM A';
  if (clubId === idOf(details?.ClubBId)) return details?.ClubBFull || details?.ClubBPrefix || 'TEAM B';
  return 'OPPONENT';
};

// "Won by an innings and 179 runs" / "Won by 144 Runs" / "Won by 4 Wickets" -> sortable margin
const parseMargin = (text = '') => {
  const t = text.toLowerCase();
  const runs = /(\d+)\s*runs?/.exec(t);
  const wkts = /(\d+)\s*wickets?/.exec(t);
  if (t.includes('inning')) return { kind: 'innings', value: runs ? Number(runs[1]) : 0, rank: 3e6 + (runs ? Number(runs[1]) : 0) };
  if (runs) return { kind: 'runs', value: Number(runs[1]), rank: 2e6 + Number(runs[1]) };
  if (wkts) return { kind: 'wickets', value: Number(wkts[1]), rank: 1e6 + Number(wkts[1]) };
  return { kind: 'other', value: 0, rank: 0 };
};

const outcomeOf = (details, teamId) => {
  const rows = details?.result || [];
  const mine = rows.find((r) => idOf(r.ClubID) === teamId);
  const any = mine || rows[0];
  if (!any) return { result: 'NO RESULT', text: '', won: false, points: '-' };
  const text = String(any.Result || '');
  const lower = text.toLowerCase();
  let result = 'NO RESULT';
  if (/draw/.test(lower)) result = 'DRAW';
  else if (/tie/.test(lower)) result = 'TIED';
  else if (/abandon|no result/.test(lower)) result = 'NO RESULT';
  else if (mine) result = Number(mine.Won) === 1 ? 'WON' : 'LOST';
  const points = mine && mine.Points !== null && mine.Points !== undefined && String(mine.Points).trim() !== '' ? mine.Points : '-';
  return { result, text: mine ? text : '', won: result === 'WON', points };
};

export function buildTournamentModel(matches, teamId) {
  const team = String(teamId);
  const sorted = [...matches].sort((a, b) => String(a.details?.Date || '').localeCompare(String(b.details?.Date || '')));

  let teamName = '';
  const journey = [];
  const victories = [];

  const batting = new Map();     // player id -> aggregate
  const bowling = new Map();
  const fielding = new Map();
  const keepers = new Map();
  const battingInnings = [];     // individual innings
  const bowlingInnings = [];     // individual bowling figures
  const partnerships = [];
  let matchesWithData = 0;
  let catchesTotal = 0;
  let dropsTotal = 0;
  let runsSavedTotal = 0;
  let runsMissedTotal = 0;

  const touch = (map, id, name, init) => {
    if (!map.has(id)) map.set(id, { id, name, matches: new Set(), ...init() });
    const row = map.get(id);
    if (name && row.name.startsWith('Player ')) row.name = name;
    return row;
  };

  sorted.forEach(({ details, balls }, idx) => {
    const clubA = idOf(details?.ClubAId);
    const clubB = idOf(details?.ClubBId);
    if (team !== clubA && team !== clubB) return;
    teamName = teamNameOf(details, team);
    const opponent = teamNameOf(details, team === clubA ? clubB : clubA);
    const outcome = outcomeOf(details, team);
    const matchNo = journey.length + 1;
    journey.push({ matchNo, phase: (details?.PhaseName || 'League').toUpperCase(), opponent, ...outcome, date: details?.info?.Date || '' });
    if (outcome.won) victories.push({ matchNo, phase: (details?.PhaseName || 'League').toUpperCase(), opponent, margin: outcome.text.toUpperCase(), ...parseMargin(outcome.text) });

    if (!balls || !balls.length) return;
    matchesWithData += 1;
    const model = buildMatchModel(balls, details);
    const matchId = String(details?.ID ?? idx);
    const xi = (details?.players || []).filter((p) => idOf(p.ClubId) === team);
    const keeperIds = new Set(xi.filter((p) => Number(p.WK) === 1).map((p) => idOf(p.PlayerId)));
    const nameOf = (id) => model.players.get(id)?.name || `Player ${id}`;

    // Everyone in the XI played the match
    xi.forEach((p) => {
      const id = idOf(p.PlayerId);
      touch(batting, id, p.FullName, () => ({ inns: 0, runs: 0, balls: 0, outs: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, hs: null, byInnings: {} })).matches.add(matchId);
      touch(bowling, id, p.FullName, () => ({ inns: 0, legal: 0, maidens: 0, runs: 0, wkts: 0, four: 0, five: 0, ten: 0, byInnings: {} })).matches.add(matchId);
      touch(fielding, id, p.FullName, () => ({ catches: 0, drops: 0, runOuts: 0, stumpings: 0, stMissed: 0, saved: 0, missed: 0 })).matches.add(matchId);
    });

    const matchWkts = new Map();
    let batIdx = 0;
    let bowlIdx = 0;
    model.innings.forEach((inn) => {
      const roman = ROMAN[inn.inningsId] || String(inn.inningsId);

      if (inn.battingClubId === team) {
        batIdx += 1;
        inn.battingRows.forEach((r) => {
          const row = touch(batting, r.id, nameOf(r.id), () => ({ inns: 0, runs: 0, balls: 0, outs: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, hs: null, byInnings: {} }));
          row.matches.add(matchId);
          row.inns += 1;
          row.runs += r.runs;
          row.balls += r.balls;
          row.outs += r.isOut ? 1 : 0;
          row.fours += r.fours;
          row.sixes += r.sixes;
          if (r.runs >= 100) row.hundreds += 1;
          else if (r.runs >= 50) row.fifties += 1;
          if (!row.hs || r.runs > row.hs.runs || (r.runs === row.hs.runs && !r.isOut)) row.hs = { runs: r.runs, notOut: !r.isOut };
          row.byInnings[batIdx] = (row.byInnings[batIdx] || 0) + r.runs;
          battingInnings.push({ id: r.id, name: nameOf(r.id), opponent, innings: roman, runs: r.runs, notOut: !r.isOut, balls: r.balls, fours: r.fours, sixes: r.sixes });
        });
        inn.partnerships.forEach((p) => {
          if (p.runs <= 0) return;
          partnerships.push({
            wicket: p.number,
            runs: p.runs,
            unbroken: p.unbroken,
            partners: p.batters.map((b) => b.name).join(' & '),
            opponent
          });
        });
      }

      if (inn.bowlingClubId === team) {
        bowlIdx += 1;
        inn.bowlingRows.forEach((r) => {
          const row = touch(bowling, r.id, nameOf(r.id), () => ({ inns: 0, legal: 0, maidens: 0, runs: 0, wkts: 0, four: 0, five: 0, ten: 0, byInnings: {} }));
          row.matches.add(matchId);
          row.inns += 1;
          row.legal += r.acc.legal;
          row.maidens += r.maidens;
          row.runs += r.runs;
          row.wkts += r.wkts;
          if (r.wkts === 4) row.four += 1;
          if (r.wkts >= 5) row.five += 1;
          row.byInnings[bowlIdx] = (row.byInnings[bowlIdx] || 0) + r.wkts;
          matchWkts.set(r.id, (matchWkts.get(r.id) || 0) + r.wkts);
          bowlingInnings.push({ id: r.id, name: nameOf(r.id), opponent, innings: roman, overs: r.overs, legal: r.acc.legal, runs: r.runs, wkts: r.wkts });
        });

        inn.fielding.rows.forEach((f) => {
          const row = touch(fielding, f.id, nameOf(f.id), () => ({ catches: 0, drops: 0, runOuts: 0, stumpings: 0, stMissed: 0, saved: 0, missed: 0 }));
          row.matches.add(matchId);
          row.catches += f.catches;
          row.drops += f.drops;
          row.runOuts += f.runOuts;
          row.stumpings += f.stumpings;
          row.stMissed += f.stMissed;
          row.saved += f.runsSaved;
          row.missed += f.runsGiven;
          catchesTotal += f.catches;
          dropsTotal += f.drops;
          runsSavedTotal += f.runsSaved;
          runsMissedTotal += f.runsGiven;
          if (keeperIds.has(f.id)) {
            const k = touch(keepers, f.id, nameOf(f.id), () => ({ catches: 0, drops: 0, stumpings: 0, stMissed: 0, byes: 0 }));
            k.matches.add(matchId);
            k.catches += f.catches;
            k.drops += f.drops;
            k.stumpings += f.stumpings;
            k.stMissed += f.stMissed;
          }
        });
        // Byes conceded go to whoever kept wicket in that match
        keeperIds.forEach((id) => {
          const k = touch(keepers, id, nameOf(id), () => ({ catches: 0, drops: 0, stumpings: 0, stMissed: 0, byes: 0 }));
          k.matches.add(matchId);
          k.byes += inn.extras.b;
        });
      }
    });
    matchWkts.forEach((w, id) => { if (w >= 10) bowling.get(id).ten += 1; });
  });

  const fmtAvg = (runs, outs) => (outs > 0 ? (runs / outs).toFixed(2) : '-');
  const battingRows = [...batting.values()]
    .filter((r) => r.inns > 0)
    .map((r) => ({
      ...r,
      mat: r.matches.size,
      avg: fmtAvg(r.runs, r.outs),
      sr: r.balls > 0 ? ((r.runs * 100) / r.balls).toFixed(2) : '-',
      notOuts: r.inns - r.outs,
      hsText: r.hs ? `${r.hs.runs}${r.hs.notOut ? '*' : ''}` : '-'
    }))
    .sort((a, b) => b.runs - a.runs || (b.runs / Math.max(1, b.outs)) - (a.runs / Math.max(1, a.outs)));

  const bowlingRows = [...bowling.values()]
    .filter((r) => r.inns > 0)
    .map((r) => ({
      ...r,
      mat: r.matches.size,
      overs: oversText(r.legal),
      eco: econ(r.runs, r.legal),
      avg: r.wkts > 0 ? (r.runs / r.wkts).toFixed(2) : '-',
      sr: r.wkts > 0 ? (r.legal / r.wkts).toFixed(1) : '-'
    }))
    .sort((a, b) => b.wkts - a.wkts || (a.wkts ? a.runs / a.wkts : 1e9) - (b.wkts ? b.runs / b.wkts : 1e9));

  const fieldingRows = [...fielding.values()].map((r) => ({ ...r, mat: r.matches.size }));

  // Best partnership for each wicket
  const byWicket = [];
  for (let w = 1; w <= 10; w += 1) {
    const best = partnerships.filter((p) => p.wicket === w).sort((a, b) => b.runs - a.runs)[0];
    if (best) byWicket.push(best);
  }

  return {
    teamName,
    totalMatches: journey.length,
    matchesWithData,
    journey,
    victories: victories.sort((a, b) => b.rank - a.rank),
    battingRows,
    bowlingRows,
    topScores: [...battingInnings].sort((a, b) => b.runs - a.runs || Number(b.notOut) - Number(a.notOut) || a.balls - b.balls),
    bestBowling: [...bowlingInnings].filter((b) => b.wkts > 0).sort((a, b) => b.wkts - a.wkts || a.runs - b.runs || a.legal - b.legal),
    partnerships: [...partnerships].sort((a, b) => b.runs - a.runs),
    partnershipsByWicket: byWicket,
    fieldingRows,
    keepers: [...keepers.values()].map((k) => ({ ...k, mat: k.matches.size })).sort((a, b) => b.mat - a.mat || b.catches - a.catches),
    totals: {
      hundreds: battingRows.reduce((s, r) => s + r.hundreds, 0),
      fifties: battingRows.reduce((s, r) => s + r.fifties, 0),
      fivers: bowlingRows.reduce((s, r) => s + r.five, 0),
      tens: bowlingRows.reduce((s, r) => s + r.ten, 0),
      catches: catchesTotal,
      drops: dropsTotal,
      runsSaved: runsSavedTotal,
      runsMissed: runsMissedTotal
    }
  };
}
