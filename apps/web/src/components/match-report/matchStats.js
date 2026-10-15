// Pure stat builders for the VCA Post Match (team) report.
// Input: rows from /api/ballbyball/:matchid and the object from /api/getMatchDetails/:matchid
// (which carries `players`: playing XIs with batting order). No React in here so it can be
// unit-checked against a real database from node.

// ---------------------------------------------------------------------------
// Lookups & thresholds. These are the knobs to adjust if VCA wants different buckets.
// ---------------------------------------------------------------------------

// Scorecard.FieldType codes (no lookup table exists in the scoring DB).
export const FIELD_TYPES = {
  1: 'Catch Dropped',
  2: 'Run Out Missed',
  3: 'Stumping Missed',
  4: 'Misfield',
  5: 'Overthrow',
  6: 'Good Fielding'
};
const MISSED_CHANCE_KIND = { 1: 'Catch', 2: 'Run Out', 3: 'Stumping' };

// Pitch length in cm from the batter's stumps (PM_Y_CM). Negative = full toss.
export const LENGTH_BANDS = [
  { label: 'FULL TOSS', max: 0 },
  { label: 'YORKER', max: 200 },
  { label: 'FULL', max: 400 },
  { label: 'GOOD', max: 600 },
  { label: 'BACK OF LEN', max: 800 },
  { label: 'SHORT', max: Infinity }
];

// Pitch line from PM_X_CM (cm from middle stump; positive = off side of a right-hander).
const STUMP_HALF_WIDTH_CM = 15;
export const LINES = ['OUTSIDE OFF', 'STUMPS', 'OUTSIDE LEG'];

// Height of the ball as it passes the stumps (SZ_Y_CM, cm above ground).
export const HEIGHT_BANDS = [
  { label: 'LOW (<30)', max: 30 },
  { label: 'STUMPS (30-71)', max: 71 },
  { label: 'ABOVE (71-100)', max: 100 },
  { label: 'CHEST+ (>100)', max: Infinity }
];

// WWRegion_8 numbering (from the ball-by-ball query). Wagon wheel coordinates are already
// relative to the batter, so regions 1-4 are always off side - this matches the Graphics API's
// wagon wheel labels and its off/leg side totals.
const WW_REGIONS = {
  1: 'THIRD MAN', 2: 'POINT', 3: 'COVERS', 4: 'LONG OFF',
  5: 'LONG ON', 6: 'MID WICKET', 7: 'SQUARE LEG', 8: 'FINE LEG'
};
export const WW_REGION_ORDER = ['THIRD MAN', 'POINT', 'COVERS', 'LONG OFF', 'LONG ON', 'MID WICKET', 'SQUARE LEG', 'FINE LEG'];

const ODI_TYPES = [2, 5, 9, 12, 15, 18, 21, 27, 30, 33, 36, 38, 56];
const T20_TYPES = [3, 6, 7, 10, 13, 16, 19, 22, 28, 31, 34, 37, 39, 40, 41, 42, 43, 44, 45, 50, 51, 53, 54, 55, 91];

const NO_BALL_BYES = [5, 14, 15, 16, 17, 18, 19, 20, 30, 32];
const NO_BALL_LEGBYES = [6, 21, 22, 23, 24, 25, 26, 27, 31, 33];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0);
const flag = (v) => v === 1 || v === true || v === '1';
// Player ids are positive; the scoring DB stores 0 for "no player".
const idOf = (v) => (v === null || v === undefined || v === '' || Number(v) === 0 ? null : String(v));

export const oversText = (legalBalls) => `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
export const sr = (runs, balls) => (balls > 0 ? ((runs * 100) / balls).toFixed(1) : '-');
export const econ = (runs, balls) => (balls > 0 ? ((runs * 6) / balls).toFixed(2) : '-');
export const bowlAvg = (a) => (a.bowlWkts > 0 ? (a.bowlRuns / a.bowlWkts).toFixed(2) : '-');
export const bowlSr = (a) => (a.bowlWkts > 0 ? (a.legal / a.bowlWkts).toFixed(1) : '-');
export const pct = (part, whole) => (whole > 0 ? `${((part * 100) / whole).toFixed(1)}%` : '-');
export const ordinal = (n) => {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export const matchCategoryOf = (matchTypeId) => {
  const id = Number(matchTypeId);
  if (ODI_TYPES.includes(id)) return 'ODI';
  if (T20_TYPES.includes(id)) return 'T20';
  return 'MULTIDAY';
};

const phaseOf = (category, overId) => {
  const over = num(overId);
  if (category === 'ODI') {
    if (over <= 10) return '01-10';
    if (over <= 20) return '11-20';
    if (over <= 30) return '21-30';
    if (over <= 40) return '31-40';
    return '41-50';
  }
  if (over <= 6) return '01-06';
  if (over <= 10) return '07-10';
  if (over <= 15) return '11-15';
  return '16-20';
};
const PHASE_ORDER = {
  ODI: ['01-10', '11-20', '21-30', '31-40', '41-50'],
  T20: ['01-06', '07-10', '11-15', '16-20']
};

// Ball-level facts
const isFaced = (b) => flag(b.Batballs);            // every delivery except wides
const isLegal = (b) => flag(b.Bowlballs);           // counts towards the over
const batRuns = (b) => num(b.Runs);
const bowlerRuns = (b) => num(b.Bowlruns);
const totalRuns = (b) => num(b.Runs) + num(b.Extras) + num(b.BLExtras) + num(b.Penalty1);
const isTeamWicket = (b) => flag(b.Dismissal);
const isBowlerWicket = (b) => flag(b.Bowlwkts);
const isFour = (b) => flag(b.isFour);
const isSix = (b) => flag(b.isSix);

// ---------------------------------------------------------------------------
// Accumulator shared by every batting / bowling table
// ---------------------------------------------------------------------------

export const newAcc = () => ({
  runs: 0, batRuns: 0, extras: 0, faced: 0, legal: 0,
  batDots: 0, bowlDots: 0, ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0,
  wkts: 0, bowlWkts: 0, bowlRuns: 0, wides: 0, noballs: 0
});

export const addBall = (acc, b) => {
  const r = batRuns(b);
  acc.runs += totalRuns(b);
  acc.batRuns += r;
  acc.extras += totalRuns(b) - r;
  acc.bowlRuns += bowlerRuns(b);
  if (isFaced(b)) {
    acc.faced += 1;
    if (r === 0) acc.batDots += 1;
    if (r === 1) acc.ones += 1;
    if (r === 2) acc.twos += 1;
    if (r === 3) acc.threes += 1;
  }
  if (isLegal(b)) {
    acc.legal += 1;
    if (bowlerRuns(b) === 0) acc.bowlDots += 1;
  }
  if (isFour(b)) acc.fours += 1;
  if (isSix(b)) acc.sixes += 1;
  if (isTeamWicket(b)) acc.wkts += 1;
  if (isBowlerWicket(b)) acc.bowlWkts += 1;
  if (flag(b.isWide)) acc.wides += 1;
  if (flag(b.isNoBall)) acc.noballs += 1;
  return acc;
};

export const accOf = (balls) => balls.reduce(addBall, newAcc());

// Batting-perspective metric rows (rows = metrics, used with any column grouping)
export const BATTING_METRICS = [
  { label: 'RUNS SCORED', get: (a) => a.batRuns },
  { label: 'BALLS FACED', get: (a) => a.faced },
  { label: 'STRIKE RATE', get: (a) => sr(a.batRuns, a.faced) },
  { label: 'DOTS PLAYED', get: (a) => a.batDots },
  { label: 'DOT %', get: (a) => pct(a.batDots, a.faced) },
  { label: '1s', get: (a) => a.ones },
  { label: '2s', get: (a) => a.twos },
  { label: '3s', get: (a) => a.threes },
  { label: '4s', get: (a) => a.fours },
  { label: '6s', get: (a) => a.sixes },
  { label: 'BOUNDARIES', get: (a) => a.fours + a.sixes },
  { label: 'BOUNDARY RUNS %', get: (a) => pct(a.fours * 4 + a.sixes * 6, a.batRuns) },
  { label: 'WICKETS LOST', get: (a) => a.wkts },
  { label: 'EXTRAS', get: (a) => a.extras }
];

export const BOWLING_METRICS = [
  { label: 'OVERS', get: (a) => oversText(a.legal) },
  { label: 'RUNS CONCEDED', get: (a) => a.bowlRuns },
  { label: 'WICKETS', get: (a) => a.bowlWkts },
  { label: 'ECONOMY', get: (a) => econ(a.bowlRuns, a.legal) },
  { label: 'STRIKE RATE', get: (a) => (a.bowlWkts > 0 ? (a.legal / a.bowlWkts).toFixed(1) : '-') },
  { label: 'DOT BALLS', get: (a) => a.bowlDots },
  { label: 'DOT %', get: (a) => pct(a.bowlDots, a.legal) },
  { label: '4s', get: (a) => a.fours },
  { label: '6s', get: (a) => a.sixes },
  { label: 'BOUNDARY %', get: (a) => pct(a.fours + a.sixes, a.legal) },
  { label: 'WIDES', get: (a) => a.wides },
  { label: 'NO BALLS', get: (a) => a.noballs }
];

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

const buildPlayers = (ballData, matchDetails) => {
  const map = new Map();
  const put = (id, patch) => {
    if (!id) return;
    const cur = map.get(id) || { id, name: `Player ${id}`, bat: null, bowlType: null, clubId: null, wk: false, captain: false };
    Object.entries(patch).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') cur[k] = v;
    });
    map.set(id, cur);
  };

  (matchDetails?.players || []).forEach((p) => put(idOf(p.PlayerId), {
    name: p.FullName,
    bat: num(p.BattingTypeID) || null,
    bowlType: num(p.BowlingTypeID) || null,
    clubId: idOf(p.ClubId),
    wk: flag(p.WK),
    captain: flag(p.Captain)
  }));

  ballData.forEach((b) => {
    put(idOf(b.StrikerID), { name: b.StrikerName, bat: num(b.StBattingTypeID) || null, clubId: idOf(b.BattingClubID) });
    put(idOf(b.NonStrikerID), { name: b.NonStrikerName, clubId: idOf(b.BattingClubID) });
    put(idOf(b.BowlerID), { name: b.BowlerName, bowlType: num(b.BwBowlingTypeID) || null, clubId: idOf(b.BowlingClubID) });
  });
  return map;
};

// Bowling types 1-8 are pace, 9-12 spin (BowlingType table); fall back to the delivery tag.
const paceOrSpin = (b, players) => {
  const t = players.get(idOf(b.BowlerID))?.bowlType || num(b.BwBowlingTypeID);
  if (t >= 1 && t <= 8) return 'PACE';
  if (t >= 9 && t <= 12) return 'SPIN';
  return num(b.SpinOrPace) === 2 ? 'SPIN' : 'PACE';
};

const handOf = (playerId, players) => (players.get(idOf(playerId))?.bat === 2 ? 'LHB' : 'RHB');

// ---------------------------------------------------------------------------
// Zones for the graphics data tables
// ---------------------------------------------------------------------------

const lengthOf = (b) => {
  if (b.PM_Y_CM === null || b.PM_Y_CM === undefined) return null;
  const y = num(b.PM_Y_CM);
  return LENGTH_BANDS.find((band) => y < band.max || band.max === Infinity)?.label;
};

const lineOf = (b, players) => {
  if (b.PM_X_CM === null || b.PM_X_CM === undefined) return null;
  const x = num(b.PM_X_CM) * (handOf(b.StrikerID, players) === 'LHB' ? -1 : 1);
  if (Math.abs(x) <= STUMP_HALF_WIDTH_CM) return 'STUMPS';
  return x > 0 ? 'OUTSIDE OFF' : 'OUTSIDE LEG';
};

const heightOf = (b) => {
  if (b.SZ_Y_CM === null || b.SZ_Y_CM === undefined) return null;
  const y = num(b.SZ_Y_CM);
  return HEIGHT_BANDS.find((band) => y < band.max)?.label;
};

const regionOf = (b) => WW_REGIONS[num(b.WWRegion_8)] || null;

const groupBy = (balls, keyFn) => {
  const m = new Map();
  balls.forEach((b) => {
    const k = keyFn(b);
    if (k === null || k === undefined) return;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(b);
  });
  return m;
};

// Length x line grid with per-cell accumulators (deliveries except wides)
export const pitchGrid = (balls, players) => {
  const faced = balls.filter(isFaced);
  const cells = {};
  LENGTH_BANDS.forEach(({ label }) => {
    cells[label] = {};
    LINES.forEach((l) => { cells[label][l] = newAcc(); });
    cells[label].TOTAL = newAcc();
  });
  const lineTotals = {};
  LINES.forEach((l) => { lineTotals[l] = newAcc(); });
  const total = newAcc();
  faced.forEach((b) => {
    const len = lengthOf(b);
    const line = lineOf(b, players);
    if (!len || !line) return;
    addBall(cells[len][line], b);
    addBall(cells[len].TOTAL, b);
    addBall(lineTotals[line], b);
    addBall(total, b);
  });
  return { cells, lineTotals, total };
};

export const heightTable = (balls) => {
  const groups = groupBy(balls.filter(isFaced), heightOf);
  return HEIGHT_BANDS.map(({ label }) => ({ label, acc: accOf(groups.get(label) || []) }));
};

export const regionTable = (balls) => {
  const groups = groupBy(balls.filter(isFaced), regionOf);
  return WW_REGION_ORDER.map((label) => ({ label, acc: accOf(groups.get(label) || []) }));
};

// ---------------------------------------------------------------------------
// Dismissal text
// ---------------------------------------------------------------------------

const dismissalText = (b, players) => {
  const name = (id) => players.get(idOf(id))?.name || '';
  const bowler = name(b.BowlerID);
  const f1 = name(b.DismissalFielderID1);
  const f2 = name(b.DismissalFielderID2);
  switch (num(b.DismissalTypeID)) {
    case 1: return `b ${bowler}`;
    case 2: return idOf(b.DismissalFielderID1) === idOf(b.BowlerID) ? `c & b ${bowler}` : `c ${f1} b ${bowler}`;
    case 3: return `lbw b ${bowler}`;
    case 4: return `run out (${[f1, f2].filter(Boolean).join(' / ') || 'fielder'})`;
    case 5: return `st ${f1} b ${bowler}`;
    case 6: return `hit wicket b ${bowler}`;
    case 8: return 'retired hurt';
    case 9: return 'retired out';
    case 10: return 'obstructing the field';
    case 11: return 'timed out';
    case 12: return 'handled the ball';
    case 13: return 'hit the ball twice';
    case 15: return 'absent hurt';
    case 16: return `run out (${bowler}) - non-striker`;
    default: return b.DismissalTypeDesc || 'out';
  }
};

const dismissedBatterOf = (b) => idOf(b.DismissedBatter) || idOf(b.NonBall_dismissBatter);

// Short label for one delivery from the batter's point of view: runs off the bat, plus nb/lb/b.
const ballLabel = (b) => {
  const r = batRuns(b);
  const e = num(b.Extras);
  const type = num(b.ExtraTypeId);
  if (flag(b.isNoBall)) return `${r}nb`;
  if (r === 0 && e > 0 && (type === 3 || NO_BALL_LEGBYES.includes(type))) return `${e}lb`;
  if (r === 0 && e > 0 && (type === 4 || NO_BALL_BYES.includes(type))) return `${e}b`;
  return String(r);
};

// ---------------------------------------------------------------------------
// Innings builder
// ---------------------------------------------------------------------------

const buildInnings = (inningsId, balls, ctx) => {
  const { players, category, matchDetails } = ctx;
  const first = balls[0] || {};
  const inningsRow = (matchDetails?.inningsData || []).find((i) => num(i.InningsID) === inningsId) || {};
  const battingClubId = idOf(first.BattingClubID ?? inningsRow.BattingClubID);
  const bowlingClubId = idOf(first.BowlingClubID ?? inningsRow.BowlingClubID);
  const clubName = (id) => {
    if (id === idOf(matchDetails?.ClubAId)) return matchDetails?.ClubAFull || matchDetails?.ClubAPrefix;
    if (id === idOf(matchDetails?.ClubBId)) return matchDetails?.ClubBFull || matchDetails?.ClubBPrefix;
    return null;
  };
  const battingTeam = first.BattingClubName || inningsRow.BattingClubName || clubName(battingClubId) || 'BATTING TEAM';
  const bowlingTeam = inningsRow.BowlingClubName || clubName(bowlingClubId) || 'BOWLING TEAM';

  const total = accOf(balls);

  // ---- Batting scorecard -------------------------------------------------
  const batters = new Map(); // id -> row
  const touchBatter = (id) => {
    if (!id) return null;
    if (!batters.has(id)) {
      batters.set(id, { id, name: players.get(id)?.name || `Player ${id}`, acc: newAcc(), out: null, firstSeen: batters.size });
    }
    return batters.get(id);
  };

  const fow = [];
  const lastBalls = [];                 // per dismissal: the batter's last 10 balls faced before it
  const facedBy = new Map();            // batter id -> balls faced so far (no wides)
  const runningBatterRuns = new Map(); // batter id -> {runs, balls} as the innings progresses
  const chances = [];                   // fielding chances (taken + missed), for WTO

  balls.forEach((b) => {
    const striker = touchBatter(idOf(b.StrikerID));
    touchBatter(idOf(b.NonStrikerID));
    if (striker) {
      // Only the striker's own runs/balls go to the batter (extras do not).
      if (isFaced(b)) {
        striker.acc.faced += 1;
        if (batRuns(b) === 0) striker.acc.batDots += 1;
      }
      striker.acc.batRuns += batRuns(b);
      if (isFour(b)) striker.acc.fours += 1;
      if (isSix(b)) striker.acc.sixes += 1;
    }

    const before = { ...(runningBatterRuns.get(idOf(b.StrikerID)) || { runs: 0, balls: 0 }) };
    runningBatterRuns.set(idOf(b.StrikerID), {
      runs: before.runs + batRuns(b),
      balls: before.balls + (isFaced(b) ? 1 : 0)
    });

    // Missed chances recorded against this ball
    const ft = num(b.FieldType);
    if (MISSED_CHANCE_KIND[ft]) {
      chances.push({
        ball: b, kind: MISSED_CHANCE_KIND[ft], outcome: 'MISSED', fielderId: idOf(b.FielderId),
        batterId: idOf(b.StrikerID), scoreAtChance: before
      });
    }

    const outId = dismissedBatterOf(b);
    if (outId && (isTeamWicket(b) || [8, 9, 15].includes(num(b.DismissalTypeID)))) {
      const row = touchBatter(outId);
      row.out = { text: dismissalText(b, players), typeId: num(b.DismissalTypeID) };
      if (isTeamWicket(b)) {
        fow.push({
          wkt: num(b.TeamWickets) || fow.length + 1,
          score: num(b.TeamRuns),
          over: b.Overs,
          batterId: outId,
          batterName: row.name
        });
      }
      const history = facedBy.get(outId) || [];
      const facedOutBall = idOf(b.StrikerID) === outId;
      lastBalls.push({
        batterId: outId,
        wkt: isTeamWicket(b) ? num(b.TeamWickets) : null,
        howOut: row.out.text,
        over: b.Overs,
        facedOutBall,
        previous: history.slice(-10).map((x) => ({ label: ballLabel(x), runs: batRuns(x), boundary: isFour(x) || isSix(x), over: x.Overs }))
      });
      const kind = { 2: 'Catch', 4: 'Run Out', 5: 'Stumping', 16: 'Run Out' }[num(b.DismissalTypeID)];
      if (kind) {
        chances.push({
          ball: b, kind, outcome: 'TAKEN', fielderId: idOf(b.DismissalFielderID1),
          batterId: outId, scoreAtChance: runningBatterRuns.get(outId) || { runs: 0, balls: 0 }
        });
      }
    }
    if (isFaced(b) && idOf(b.StrikerID)) {
      if (!facedBy.has(idOf(b.StrikerID))) facedBy.set(idOf(b.StrikerID), []);
      facedBy.get(idOf(b.StrikerID)).push(b);
    }
  });

  // Batting order from the scoring DB, falling back to order of appearance
  const orderOf = new Map();
  (matchDetails?.players || []).forEach((p) => {
    if (num(p.InningsID) === inningsId && p.BattingOrder !== null && p.BattingOrder !== undefined) {
      orderOf.set(idOf(p.PlayerId), num(p.BattingOrder));
    }
  });
  const battingRows = [...batters.values()]
    .sort((a, b) => (orderOf.get(a.id) ?? 100 + a.firstSeen) - (orderOf.get(b.id) ?? 100 + b.firstSeen))
    .map((r) => {
      const p = players.get(r.id) || {};
      fow.forEach((f) => { if (f.batterId === r.id) f.batterScore = `${r.acc.batRuns} (${r.acc.faced})`; });
      return {
        id: r.id,
        name: `${r.name}${p.captain ? ' (c)' : ''}${p.wk ? ' †' : ''}`,
        howOut: r.out ? r.out.text : 'not out',
        isOut: !!r.out,
        runs: r.acc.batRuns,
        balls: r.acc.faced,
        dots: r.acc.batDots,
        fours: r.acc.fours,
        sixes: r.acc.sixes,
        sr: sr(r.acc.batRuns, r.acc.faced),
        hand: handOf(r.id, players)
      };
    });

  const battedIds = new Set(battingRows.map((r) => r.id));
  const didNotBat = (matchDetails?.players || [])
    .filter((p) => idOf(p.ClubId) === battingClubId && !battedIds.has(idOf(p.PlayerId)))
    .filter((p, i, arr) => arr.findIndex((q) => idOf(q.PlayerId) === idOf(p.PlayerId)) === i)
    .sort((a, b) => num(a.BattingOrder) - num(b.BattingOrder))
    .map((p) => p.FullName);

  // Extras breakdown
  const extras = { b: 0, lb: 0, w: 0, nb: 0, p: 0 };
  balls.forEach((b) => {
    const e = num(b.Extras);
    const type = num(b.ExtraTypeId);
    if (flag(b.isWide) || type === 2) {
      extras.w += e;
    } else if (flag(b.isNoBall) || type === 1 || NO_BALL_BYES.includes(type) || NO_BALL_LEGBYES.includes(type) || (type >= 7 && type <= 33)) {
      extras.nb += Math.min(1, e);
      const rest = Math.max(0, e - 1);
      if (NO_BALL_BYES.includes(type)) extras.b += rest;
      else if (NO_BALL_LEGBYES.includes(type)) extras.lb += rest;
      else extras.nb += rest;
    } else if (type === 3) {
      extras.lb += e;
    } else if (type === 4) {
      extras.b += e;
    }
    extras.p += num(b.Penalty1) + num(b.BLExtras);
  });
  const extrasTotal = extras.b + extras.lb + extras.w + extras.nb + extras.p;

  // ---- Bowling scorecard -------------------------------------------------
  const bowlerOrder = [];
  const byBowler = groupBy(balls, (b) => {
    const id = idOf(b.BowlerID);
    if (id && !bowlerOrder.includes(id)) bowlerOrder.push(id);
    return id;
  });
  const overs = buildOvers(balls);
  const bowlingRows = bowlerOrder.map((id) => {
    const acc = accOf(byBowler.get(id));
    const maidens = overs.filter((o) => o.bowlerId === id && o.legal >= 6 && o.bowlRuns === 0).length;
    return {
      id,
      name: players.get(id)?.name || `Player ${id}`,
      type: paceOrSpin(byBowler.get(id)[0], players),
      overs: oversText(acc.legal),
      maidens,
      runs: acc.bowlRuns,
      wkts: acc.bowlWkts,
      econ: econ(acc.bowlRuns, acc.legal),
      avg: bowlAvg(acc),
      sr: bowlSr(acc),
      dots: acc.bowlDots,
      fours: acc.fours,
      sixes: acc.sixes,
      wides: acc.wides,
      noballs: acc.noballs,
      acc
    };
  });

  // ---- Column groupings (phases / days / sessions) -----------------------
  // Multi-day: days for batting, sessions for bowling, in day/session order
  const byNumbers = (groups) => groups.sort((x, y) => {
    const [a1, a2 = 0] = x.label.match(/\d+/g).map(Number);
    const [b1, b2 = 0] = y.label.match(/\d+/g).map(Number);
    return a1 - b1 || a2 - b2;
  });
  const battingGroups = category === 'MULTIDAY'
    ? byNumbers(orderedGroups(balls, (b) => `DAY ${num(b.Day) || 1}`))
    : orderedGroups(balls, (b) => phaseOf(category, b.OverId), PHASE_ORDER[category]);
  const bowlingGroups = category === 'MULTIDAY'
    ? byNumbers(orderedGroups(balls, (b) => `D${num(b.Day) || 1} S${num(b.Session) || 1}`))
    : battingGroups;

  // ---- Partnerships -----------------------------------------------------
  const partnerships = buildPartnerships(balls, players);

  // ---- Bowling splits ---------------------------------------------------
  const pairs = buildBowlingPairs(overs, players);

  const endWise = [];
  orderedGroups(balls, (b) => b.BowlingEnd || 'UNKNOWN END').forEach(({ label, balls: endBalls }) => {
    const bySkill = groupBy(endBalls, (b) => paceOrSpin(b, players));
    ['PACE', 'SPIN'].forEach((skill) => endWise.push({ end: label, skill, acc: accOf(bySkill.get(skill) || []) }));
    endWise.push({ end: label, skill: 'TOTAL', acc: accOf(endBalls), isTotal: true });
  });

  const handCombo = (b) => {
    const s = handOf(b.StrikerID, players);
    const n = handOf(b.NonStrikerID, players);
    if (s === 'RHB' && n === 'RHB') return 'RHB - RHB';
    if (s === 'LHB' && n === 'LHB') return 'LHB - LHB';
    return 'RHB - LHB';
  };
  const vsPairs = [];
  const byCombo = groupBy(balls, handCombo);
  ['RHB - RHB', 'LHB - LHB', 'RHB - LHB'].forEach((combo) => {
    const comboBalls = byCombo.get(combo) || [];
    const bySkill = groupBy(comboBalls, (b) => paceOrSpin(b, players));
    ['PACE', 'SPIN'].forEach((skill) => vsPairs.push({ combo, skill, acc: accOf(bySkill.get(skill) || []) }));
    vsPairs.push({ combo, skill: 'TOTAL', acc: accOf(comboBalls), isTotal: true });
  });

  const firstLast = buildFirstLastBoundaries(overs, players);

  // ---- Fielding ---------------------------------------------------------
  const fielding = buildFielding(balls, chances, bowlingClubId, ctx, runningBatterRuns, batters);

  return {
    inningsId,
    label: `${ordinal(inningsId)} INNINGS`,
    battingClubId,
    bowlingClubId,
    battingTeam,
    bowlingTeam,
    balls,
    total,
    scoreText: `${total.runs}/${total.wkts}`,
    oversText: oversText(total.legal),
    runRate: econ(total.runs, total.legal),
    battingRows,
    didNotBat,
    extras,
    extrasTotal,
    fow,
    lastBalls: lastBalls.map((d) => {
      const r = battingRows.find((x) => x.id === d.batterId);
      return { ...d, name: r?.name || players.get(d.batterId)?.name || '', score: r ? `${r.runs} (${r.balls})` : '-' };
    }),
    bowlingRows,
    battingGroups,
    bowlingGroups,
    paceSpinBatting: ['PACE', 'SPIN'].map((skill) => ({ skill, acc: accOf(balls.filter((b) => paceOrSpin(b, ctx.players) === skill)) })),
    partnerships,
    pairs,
    endWise,
    vsPairs,
    firstLast,
    fielding,
    paceOrSpin: (b) => paceOrSpin(b, players)
  };
};

// Keeps groups in a fixed order (if given) followed by any unexpected keys in order of appearance.
const orderedGroups = (balls, keyFn, fixedOrder = []) => {
  const m = groupBy(balls, keyFn);
  const keys = [...fixedOrder.filter((k) => m.has(k)), ...[...m.keys()].filter((k) => !fixedOrder.includes(k))];
  return keys.map((label) => ({ label, balls: m.get(label), acc: accOf(m.get(label)) }));
};

// One entry per over in bowling order. The bowler of an over is whoever bowled most of it.
const buildOvers = (balls) => {
  const byOver = groupBy(balls, (b) => num(b.OverId));
  return [...byOver.entries()].sort((a, b) => a[0] - b[0]).map(([overId, overBalls]) => {
    const counts = {};
    overBalls.forEach((b) => { counts[idOf(b.BowlerID)] = (counts[idOf(b.BowlerID)] || 0) + 1; });
    const bowlerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const acc = accOf(overBalls);
    const ordered = [...overBalls].sort((a, b) => num(a.BallId) - num(b.BallId));
    return { overId, bowlerId, balls: ordered, legal: acc.legal, bowlRuns: acc.bowlRuns, acc };
  });
};

// Bowling in tandem: each over is credited to the pair formed with the bowler of the previous
// over (the first over pairs with the second over's bowler).
const buildBowlingPairs = (overs, players) => {
  const pairs = new Map();
  overs.forEach((o, i) => {
    const partner = i > 0 ? overs[i - 1].bowlerId : overs[1]?.bowlerId;
    if (!partner || partner === o.bowlerId) return;
    const ids = [o.bowlerId, partner].sort();
    const key = ids.join('|');
    if (!pairs.has(key)) {
      pairs.set(key, { ids, names: ids.map((id) => players.get(id)?.name || id), acc: newAcc(), overs: 0, spells: 0, lastIndex: -2 });
    }
    const p = pairs.get(key);
    o.balls.forEach((b) => addBall(p.acc, b));
    p.overs += 1;
    if (p.lastIndex !== i - 1) p.spells += 1;
    p.lastIndex = i;
  });
  return [...pairs.values()].sort((a, b) => b.acc.legal - a.acc.legal);
};

const buildFirstLastBoundaries = (overs, players) => {
  const rows = new Map();
  const incidents = [];
  overs.forEach((o) => {
    const id = o.bowlerId;
    if (!rows.has(id)) {
      rows.set(id, { id, name: players.get(id)?.name || id, overs: 0, first4: 0, first6: 0, last4: 0, last6: 0, firstRuns: 0, lastRuns: 0 });
    }
    const row = rows.get(id);
    row.overs += 1;
    const firstBall = o.balls[0];
    const lastBall = o.balls.find((b) => flag(b.EndOver)) || o.balls[o.balls.length - 1];
    [['first', firstBall], ['last', lastBall]].forEach(([which, b]) => {
      if (!b) return;
      row[`${which}Runs`] += bowlerRuns(b);
      if (isFour(b) || isSix(b)) {
        row[`${which}${isSix(b) ? 6 : 4}`] += 1;
        incidents.push({
          over: o.overId,
          which: which === 'first' ? 'FIRST BALL' : 'LAST BALL',
          bowler: row.name,
          batter: players.get(idOf(b.StrikerID))?.name || '',
          shot: b.StrokeName || '-',
          runs: isSix(b) ? 6 : 4
        });
      }
    });
  });
  return { rows: [...rows.values()], incidents };
};

const buildPartnerships = (balls, players) => {
  const list = [];
  let current = null;
  balls.forEach((b) => {
    const s = idOf(b.StrikerID);
    const n = idOf(b.NonStrikerID);
    const key = [s, n].sort().join('|');
    if (!current || current.key !== key || current.closed) {
      current = {
        key, number: list.length + 1, order: [s, n],
        batters: { [s]: { runs: 0, balls: 0 }, [n]: { runs: 0, balls: 0 } },
        extras: 0, runs: 0, faced: 0, closed: false, unbroken: true
      };
      list.push(current);
    }
    const sb = current.batters[s];
    sb.runs += batRuns(b);
    if (isFaced(b)) sb.balls += 1;
    current.extras += totalRuns(b) - batRuns(b);
    current.runs += totalRuns(b);
    if (isFaced(b)) current.faced += 1;
    if (isTeamWicket(b)) {
      current.closed = true;
      current.unbroken = false;
    }
  });
  return list.map((p) => ({
    number: p.number,
    runs: p.runs,
    balls: p.faced,
    extras: p.extras,
    unbroken: p.unbroken,
    batters: p.order.map((id) => ({ id, name: players.get(id)?.name || id, ...p.batters[id] }))
  }));
};

const buildFielding = (balls, chances, fieldingClubId, ctx, finalScores, batters) => {
  const { players, matchDetails } = ctx;
  const rows = new Map();
  const touch = (id) => {
    if (!id) return null;
    if (!rows.has(id)) {
      rows.set(id, {
        id, name: players.get(id)?.name || `Player ${id}`,
        catches: 0, runOuts: 0, stumpings: 0, drops: 0, roMissed: 0, stMissed: 0,
        misfields: 0, overthrows: 0, goodFielding: 0, runsSaved: 0, runsGiven: 0
      });
    }
    return rows.get(id);
  };

  // Seed with the fielding XI so every player gets a row
  (matchDetails?.players || [])
    .filter((p) => idOf(p.ClubId) === fieldingClubId)
    .forEach((p) => touch(idOf(p.PlayerId)));

  balls.forEach((b) => {
    const typeId = num(b.DismissalTypeID);
    if (isTeamWicket(b)) {
      if (typeId === 2) touch(idOf(b.DismissalFielderID1)).catches += 1;
      if (typeId === 4 || typeId === 16) {
        [b.DismissalFielderID1, b.DismissalFielderID2].map(idOf).filter(Boolean).forEach((id) => { touch(id).runOuts += 1; });
      }
      if (typeId === 5) touch(idOf(b.DismissalFielderID1)).stumpings += 1;
    }
    const fielder = touch(idOf(b.FielderId));
    if (!fielder) return;
    const ft = num(b.FieldType);
    if (ft === 1) fielder.drops += 1;
    if (ft === 2) fielder.roMissed += 1;
    if (ft === 3) fielder.stMissed += 1;
    if (ft === 4) fielder.misfields += 1;
    if (ft === 5) fielder.overthrows += 1;
    if (ft === 6) fielder.goodFielding += 1;
    fielder.runsSaved += num(b.SaveRun);
    fielder.runsGiven += num(b.MissRun);
  });

  const list = [...rows.values()];
  const sum = (k) => list.reduce((s, r) => s + r[k], 0);
  const summary = {
    catches: sum('catches'), runOuts: sum('runOuts'), stumpings: sum('stumpings'),
    drops: sum('drops'), roMissed: sum('roMissed'), stMissed: sum('stMissed'),
    misfields: sum('misfields'), overthrows: sum('overthrows'), goodFielding: sum('goodFielding'),
    runsSaved: sum('runsSaved'), runsGiven: sum('runsGiven')
  };

  // Wicket-taking opportunities
  const wtoByKind = ['Catch', 'Run Out', 'Stumping'].map((kind) => {
    const all = chances.filter((c) => c.kind === kind);
    const taken = all.filter((c) => c.outcome === 'TAKEN').length;
    return { kind, opportunities: all.length, taken, missed: all.length - taken };
  });
  const missed = chances
    .filter((c) => c.outcome === 'MISSED')
    .map((c) => {
      const final = batters.get(c.batterId)?.acc;
      const finalRuns = final ? final.batRuns : finalScores.get(c.batterId)?.runs || 0;
      return {
        over: c.ball.Overs,
        kind: c.kind,
        fielder: players.get(c.fielderId)?.name || '-',
        bowler: players.get(idOf(c.ball.BowlerID))?.name || '-',
        batter: players.get(c.batterId)?.name || '-',
        scoreAtChance: `${c.scoreAtChance.runs} (${c.scoreAtChance.balls})`,
        finalScore: final ? `${final.batRuns} (${final.faced})` : '-',
        cost: Math.max(0, finalRuns - c.scoreAtChance.runs)
      };
    });

  return { rows: list, summary, wtoByKind, missed };
};

// ---------------------------------------------------------------------------
// Match model
// ---------------------------------------------------------------------------

export const buildMatchModel = (ballData, matchDetails) => {
  const balls = Array.isArray(ballData) ? ballData : [];
  const players = buildPlayers(balls, matchDetails);
  const category = matchCategoryOf(balls[0]?.MatchTypeID ?? matchDetails?.MatchTypeID);
  const ctx = { players, category, matchDetails };

  const byInnings = groupBy(balls, (b) => num(b.InningsId));
  const innings = [...byInnings.keys()].sort((a, b) => a - b).map((id) => buildInnings(id, byInnings.get(id), ctx));

  const result = (matchDetails?.result || []).find((r) => flag(r.Won)) || (matchDetails?.result || [])[0];
  const resultText = result ? `${result.ClubName || ''} ${String(result.Result || '').toLowerCase()}`.trim() : 'Result not available';

  // Session report: every day/session in order, split by innings when a session spans two
  const sessionKey = (b) => `${num(b.Day) || 1}|${num(b.Session) || 1}`;
  const sessions = [...groupBy(balls, sessionKey).entries()]
    .sort(([a], [b]) => {
      const [ad, as] = a.split('|').map(Number);
      const [bd, bs] = b.split('|').map(Number);
      return ad - bd || as - bs;
    })
    .map(([key, sessionBalls]) => {
      const [day, session] = key.split('|').map(Number);
      const rows = [...groupBy(sessionBalls, (b) => num(b.InningsId)).entries()]
        .sort(([a], [b]) => a - b)
        .map(([inningsId, inningsBalls]) => {
          const inn = innings.find((i) => i.inningsId === inningsId);
          return { inningsLabel: inn?.label || `INNINGS ${inningsId}`, battingTeam: inn?.battingTeam || '', acc: accOf(inningsBalls) };
        });
      return { day, session, rows, acc: accOf(sessionBalls) };
    });

  // Pace vs pace and spin vs spin across the match, per bowling team
  const teamSkill = new Map();
  innings.forEach((inn) => {
    inn.balls.forEach((b) => {
      const key = `${inn.bowlingTeam}|${paceOrSpin(b, players)}`;
      if (!teamSkill.has(key)) teamSkill.set(key, newAcc());
      addBall(teamSkill.get(key), b);
    });
  });
  const bowlingTeams = [...new Set(innings.map((i) => i.bowlingTeam))];
  const paceSpinTeams = ['PACE', 'SPIN'].flatMap((skill) => bowlingTeams.map((team) => ({
    team, skill, acc: teamSkill.get(`${team}|${skill}`) || newAcc()
  })));

  return { category, players, innings, resultText, sessions, paceSpinTeams };
};
