import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as htmlToImage from 'html-to-image';
import pptxgen from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import {
  Trophy, Lock, User, LogOut, FileText, Presentation, Shield,
  Layers, ChevronRight, Activity, ArrowLeft, Eye, Download, CheckCircle2, Play
} from 'lucide-react';

import BowlerReport from './components/BowlerReport';
import MatchReport from './components/MatchReport';

const API_BASE = '/api';

const BW_STYLE_FULL_MAP = {
  1: 'RIGHT ARM FAST PACER',
  2: 'LEFT ARM FAST PACER',
  3: 'RIGHT ARM MEDIUM PACER',
  4: 'LEFT ARM MEDIUM PACER',
  5: 'RIGHT ARM MEDIUM-FAST PACER',
  6: 'LEFT ARM MEDIUM-FAST PACER',
  7: 'RIGHT ARM FAST-MEDIUM PACER',
  8: 'LEFT ARM FAST-MEDIUM PACER',
  9: 'RIGHT ARM OFFBREAK SPINNER',
  10: 'SLOW LEFT ARM ORTHODOX',
  11: 'RIGHT ARM LEG-BREAK SPINNER',
  12: 'LEFT ARM CHINAMAN SPINNER'
};

const BOWLING_TYPE_MAP = {
  1: 'RAF',
  2: 'LAF',
  3: 'RAM',
  4: 'LAM',
  5: 'RAMF',
  6: 'LAMF',
  7: 'RAFM',
  8: 'LAFM',
  9: 'RAO',
  10: 'SLAO',
  11: 'RALB',
  12: 'LAC'
};

const renderComfortBarChart = (rows) => {
  if (!rows || rows.length === 0) return <div className="text-xs text-slate-500 text-center py-20">No bowling type data available</div>;

  const chartHeight = 220;
  const chartWidth = 740;
  const paddingLeft = 60;
  const paddingBottom = 40;
  const paddingTop = 25;
  const paddingRight = 20;

  const drawWidth = chartWidth - paddingLeft - paddingRight;
  const drawHeight = chartHeight - paddingTop - paddingBottom;

  let maxVal = 0;
  rows.forEach(r => {
    const o = parseFloat(r.overs) || 0;
    if (o > maxVal) maxVal = o;
    if (r.runs > maxVal) maxVal = r.runs;
    if (r.wkt > maxVal) maxVal = r.wkt;
  });
  if (maxVal === 0) maxVal = 10;
  maxVal = Math.ceil(maxVal * 1.15);

  const numGroups = rows.length;
  const groupWidth = drawWidth / numGroups;
  const barWidth = Math.min(26, (groupWidth - 20) / 3);

  const gridSteps = 4;
  const gridLines = [];
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxVal * (i / gridSteps)).toFixed(1);
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
          Overs / Runs / Wickets
        </text>

        {rows.map((r, gIdx) => {
          const groupCenterX = paddingLeft + (gIdx * groupWidth) + (groupWidth / 2);
          const oversVal = parseFloat(r.overs) || 0;
          const runsVal = r.runs || 0;
          const wktVal = r.wkt || 0;

          const hOvers = (oversVal / maxVal) * drawHeight;
          const hRuns = (runsVal / maxVal) * drawHeight;
          const hWkt = (wktVal / maxVal) * drawHeight;

          const yOvers = paddingTop + drawHeight - hOvers;
          const yRuns = paddingTop + drawHeight - hRuns;
          const yWkt = paddingTop + drawHeight - hWkt;

          const xOvers = groupCenterX - (barWidth * 1.5) - 2;
          const xRuns = groupCenterX - (barWidth * 0.5);
          const xWkt = groupCenterX + (barWidth * 0.5) + 2;

          return (
            <g key={gIdx}>
              {/* Overs Bar */}
              <rect
                x={xOvers}
                y={yOvers}
                width={barWidth}
                height={Math.max(2, hOvers)}
                fill="#38bdf8"
                rx="3"
              />
              <text x={xOvers + barWidth / 2} y={yOvers - 4} fill="#38bdf8" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                {r.overs}
              </text>

              {/* Runs Bar */}
              <rect
                x={xRuns}
                y={yRuns}
                width={barWidth}
                height={Math.max(2, hRuns)}
                fill="#22c55e"
                rx="3"
              />
              <text x={xRuns + barWidth / 2} y={yRuns - 4} fill="#22c55e" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                {runsVal}
              </text>

              {/* Wkt Bar */}
              <rect
                x={xWkt}
                y={yWkt}
                width={barWidth}
                height={Math.max(2, hWkt)}
                fill="#f97316"
                rx="3"
              />
              <text x={xWkt + barWidth / 2} y={yWkt - 4} fill="#f97316" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                {wktVal}
              </text>

              {/* Bowling Type Label */}
              <text
                x={groupCenterX}
                y={paddingTop + drawHeight + 20}
                fill="#f8fafc"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {r.type}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-6 mt-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <span className="w-3 h-3 rounded-xs bg-[#38bdf8] inline-block" /> OVERS
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <span className="w-3 h-3 rounded-xs bg-[#22c55e] inline-block" /> RUNS
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <span className="w-3 h-3 rounded-xs bg-[#f97316] inline-block" /> WKT
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // Navigation & User Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [loginError, setLoginError] = useState('');

  // Page state: 'home' | 'match_reports' | 'tournament_reports'
  const [currentPage, setCurrentPage] = useState('home');

  // Match Reports Form State
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompId, setSelectedCompId] = useState('');
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');

  // Ball By Ball Data & Report State
  const [ballData, setBallData] = useState([]);
  const [matchDetails, setMatchDetails] = useState(null);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Client Template & Report Type State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('vca');
  const [selectedReportType, setSelectedReportType] = useState('vca-bowler');

  // Team, Batter & Bowler Selection State
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedBatterId, setSelectedBatterId] = useState('');
  const [selectedBowlerId, setSelectedBowlerId] = useState('');
  const [previewSlide, setPreviewSlide] = useState(1);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadCompetitions();
    }
  }, [isLoggedIn, currentPage]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/templates`);
      setTemplates(res.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  // 1. LOGIN HANDLER
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post(`${API_BASE}/login/validate/${username}/${password}`);
      if (res.data.status === 200) {
        setIsLoggedIn(true);
        loadCompetitions();
      } else {
        setLoginError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      // Fallback log in for demo if table lacks user record
      setIsLoggedIn(true);
      loadCompetitions();
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('home');
    resetMatchForm();
  };

  const loadCompetitions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/getCompetitions`);
      setCompetitions(res.data || []);
    } catch (err) {
      console.error('Error loading competitions:', err);
    }
  };

  // 2. COMPETITION SELECTION HANDLER
  const handleCompetitionChange = async (compId) => {
    setSelectedCompId(compId);
    setSelectedMatchId('');
    setMatches([]);
    resetMatchForm();

    if (!compId) return;

    try {
      const res = await axios.get(`${API_BASE}/getMatches/${compId}`);
      setMatches(res.data || []);
    } catch (err) {
      console.error('Error loading matches:', err);
    }
  };

  const handleMatchChange = (matchId) => {
    setSelectedMatchId(matchId);
    resetMatchForm();
  };

  const resetMatchForm = () => {
    setBallData([]);
    setMatchDetails(null);
    setIsDataFetched(false);
    setShowPreview(false);
    setSelectedTeamId('');
    setSelectedBatterId('');
    setPreviewSlide(1);
  };

  // 3. GENERATE REPORT BUTTON HANDLER (Fetch Ball by Ball Data & Match Details)
  const handleGenerateReport = async () => {
    if (!selectedMatchId) return;
    setLoading(true);
    try {
      // Call Ball by Ball API
      const bbbRes = await axios.get(`${API_BASE}/ballbyball/${selectedMatchId}`);
      const rawData = bbbRes.data.data || [];
      setBallData(rawData);

      // Call Match Details API
      const matchRes = await axios.get(`${API_BASE}/getMatchDetails/${selectedMatchId}`);
      const mDetails = matchRes.data[0] || null;
      setMatchDetails(mDetails);

      // Pre-select Team A if available
      if (mDetails?.ClubAId) {
        setSelectedTeamId(String(mDetails.ClubAId));
      }

      setIsDataFetched(true);
      setShowPreview(true);
    } catch (err) {
      console.error('Error generating report dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derived teams dynamically from ball-by-ball delivery data & matchDetails
  const availableTeams = React.useMemo(() => {
    const teamsMap = new Map();

    if (matchDetails) {
      if (matchDetails.ClubAId) {
        teamsMap.set(String(matchDetails.ClubAId), matchDetails.ClubAFull || matchDetails.ClubAPrefix || 'Team A');
      }
      if (matchDetails.ClubBId) {
        teamsMap.set(String(matchDetails.ClubBId), matchDetails.ClubBFull || matchDetails.ClubBPrefix || 'Team B');
      }
    }

    // Discover team names from ball-by-ball delivery data
    ballData.forEach((b) => {
      const cId = b.BattingClubID;
      if (cId) {
        const teamName = b.BattingClubName || b.BattingClubPrefix || b.ClubName || b.ClubPrefix;
        if (teamName && (!teamsMap.has(String(cId)) || teamsMap.get(String(cId)).startsWith('Team '))) {
          teamsMap.set(String(cId), teamName);
        } else if (!teamsMap.has(String(cId))) {
          teamsMap.set(String(cId), `Team ${cId}`);
        }
      }
    });

    return Array.from(teamsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [matchDetails, ballData]);

  // Derived unique batters filtered by selected team
  const availableBatters = React.useMemo(() => {
    if (!ballData.length) return [];
    const batterMap = new Map();

    ballData.forEach((b) => {
      const strikerId = b.StrikerID;
      const strikerName = b.StrikerName;
      const clubId = b.BattingClubID;

      if (!strikerId || !strikerName) return;

      // Filter by selected team if selected
      if (selectedTeamId && String(clubId) !== String(selectedTeamId)) {
        return;
      }

      if (!batterMap.has(String(strikerId))) {
        // StBattingTypeID = 1 => Right Hand Batsman, 2 => Left Hand Batsman
        let batStyle = 'RIGHT HAND BATSMAN';
        if (b.StBattingTypeID === 2) {
          batStyle = 'LEFT HAND BATSMAN';
        } else if (b.StBattingTypeID === 1) {
          batStyle = 'RIGHT HAND BATSMAN';
        }

        batterMap.set(String(strikerId), {
          id: String(strikerId),
          name: strikerName,
          clubId: String(clubId),
          batStyle,
          batOrder: b.BatOrder || 99
        });
      }
    });

    return Array.from(batterMap.values()).sort((a, b) => a.batOrder - b.batOrder);
  }, [ballData, selectedTeamId]);

  // Handle Team Dropdown Selection Change
  const handleTeamChange = (newTeamId) => {
    setSelectedTeamId(newTeamId);
    // Auto-select first batter belonging to newly selected team
    const teamBatters = ballData.filter(b => String(b.BattingClubID) === String(newTeamId));
    if (teamBatters.length > 0 && teamBatters[0].StrikerID) {
      setSelectedBatterId(String(teamBatters[0].StrikerID));
    } else {
      setSelectedBatterId('');
    }
  };

  // Set default selected batter when availableBatters list changes
  useEffect(() => {
    if (availableBatters.length > 0 && (!selectedBatterId || !availableBatters.some(b => String(b.id) === String(selectedBatterId)))) {
      setSelectedBatterId(String(availableBatters[0].id));
    }
  }, [availableBatters]);

  // Currently selected batter object
  const activeBatter = availableBatters.find(b => String(b.id) === String(selectedBatterId)) || availableBatters[0] || {
    name: 'ABHISHEK POREL',
    batStyle: 'LEFT HAND BATSMAN'
  };

  // Derived unique bowlers filtered by selected team
  const availableBowlers = React.useMemo(() => {
    if (!ballData.length) return [];
    const bowlerMap = new Map();

    ballData.forEach((b) => {
      const bowlerId = b.BowlerID || b.BOWLERID || b.BowlerId;
      const bowlerName = b.BowlerName || b.BOWLERNAME || b.Bowler;
      const clubId = b.BowlingClubID || (selectedTeamId && String(b.BattingClubID) !== String(selectedTeamId) ? selectedTeamId : null);

      if (!bowlerId || !bowlerName) return;

      if (selectedTeamId && clubId && String(clubId) !== String(selectedTeamId)) {
        return;
      }

      if (!bowlerMap.has(String(bowlerId))) {
        const bwTypeId = b.BwBowlingTypeID || b.BowlingTypeID || 3;
        const bwStyle = BW_STYLE_FULL_MAP[bwTypeId] || 'RIGHT ARM MEDIUM PACER';

        bowlerMap.set(String(bowlerId), {
          id: String(bowlerId),
          name: bowlerName,
          bwTypeId,
          bwStyle,
          clubId: clubId ? String(clubId) : ''
        });
      }
    });

    return Array.from(bowlerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ballData, selectedTeamId]);

  useEffect(() => {
    if (availableBowlers.length > 0 && (!selectedBowlerId || !availableBowlers.some(b => String(b.id) === String(selectedBowlerId)))) {
      setSelectedBowlerId(String(availableBowlers[0].id));
    }
  }, [availableBowlers]);

  const activeBowler = availableBowlers.find(b => String(b.id) === String(selectedBowlerId)) || availableBowlers[0] || {
    id: '',
    name: 'NACHIKET BHUTE',
    bwStyle: 'RIGHT ARM MEDIUM PACER'
  };

  // Currently selected team object
  const activeTeam = availableTeams.find(t => String(t.id) === String(selectedTeamId)) || availableTeams[0] || {
    name: "DELHI CAPITALS"
  };

  // Ball-by-ball deliveries filtered for selected batter
  const batterBalls = React.useMemo(() => {
    if (!selectedBatterId) return ballData;
    return ballData.filter(b => String(b.StrikerID) === String(selectedBatterId));
  }, [ballData, selectedBatterId]);

  // Phase-Wise Performance Calculation for selected batter (ODI, T20, and Test Matches)
  const phaseWiseStats = React.useMemo(() => {
    if (!batterBalls || batterBalls.length === 0) {
      return { phases: [], currentMatchTypeName: 'UNKNOWN' };
    }

    // Determine match type from the first ball or default
    const matchTypeId = batterBalls[0]?.MatchTypeID || matchDetails?.MatchTypeID || 2;

    const odiTypes = [2, 5, 9, 12, 15, 18, 21, 27, 30, 33, 36, 38, 56];
    const t20Types = [3, 6, 7, 10, 13, 16, 19, 22, 28, 31, 34, 37, 39, 40, 41, 42, 43, 44, 45, 50, 51, 53, 54, 55, 91];

    let matchCategory = 'TEST';
    if (odiTypes.includes(Number(matchTypeId))) {
      matchCategory = 'ODI';
    } else if (t20Types.includes(Number(matchTypeId))) {
      matchCategory = 'T20';
    }

    // Helper to determine the phase label of a delivery
    const getPhaseLabel = (b) => {
      if (matchCategory === 'ODI') {
        const over = b.OverId !== undefined && b.OverId !== null ? Number(b.OverId) : Math.floor(Number(b.Overs || 0));
        if (over >= 1 && over <= 10) return '01-10 OVERS';
        if (over >= 11 && over <= 20) return '11-20 OVERS';
        if (over >= 21 && over <= 30) return '21-30 OVERS';
        if (over >= 31 && over <= 40) return '31-40 OVERS';
        if (over >= 41 && over <= 50) return '41-50 OVERS';
        return '41-50 OVERS';
      } else if (matchCategory === 'T20') {
        const over = b.OverId !== undefined && b.OverId !== null ? Number(b.OverId) : Math.floor(Number(b.Overs || 0));
        if (over >= 1 && over <= 6) return '01-06 OVERS';
        if (over >= 7 && over <= 10) return '07-10 OVERS';
        if (over >= 11 && over <= 15) return '11-15 OVERS';
        if (over >= 16 && over <= 20) return '16-20 OVERS';
        return '16-20 OVERS';
      } else {
        // Test Match (Over based)
        const over = b.OverId !== undefined && b.OverId !== null ? Number(b.OverId) : Math.floor(Number(b.Overs || 0));
        if (over >= 1 && over <= 25) return 'NEW BALL (1-25 OVERS)';
        if (over >= 26 && over <= 60) return 'SEMI NEW BALL (26-60 OVERS)';
        if (over >= 61 && over <= 80) return 'OLD BALL (61-80 OVERS)';
        return 'SECOND NEW BALL (81+ OVERS)';
      }
    };

    // Predefine phase order based on category
    let phaseOrder = [];
    if (matchCategory === 'ODI') {
      phaseOrder = ['01-10 OVERS', '11-20 OVERS', '21-30 OVERS', '31-40 OVERS', '41-50 OVERS'];
    } else if (matchCategory === 'T20') {
      phaseOrder = ['01-06 OVERS', '07-10 OVERS', '11-15 OVERS', '16-20 OVERS'];
    } else {
      phaseOrder = ['NEW BALL (1-25 OVERS)', 'SEMI NEW BALL (26-60 OVERS)', 'OLD BALL (61-80 OVERS)', 'SECOND NEW BALL (81+ OVERS)'];
    }

    // Map deliveries to phases
    const phaseMap = new Map();
    phaseOrder.forEach(p => phaseMap.set(p, []));

    batterBalls.forEach(b => {
      const label = getPhaseLabel(b);
      if (!phaseMap.has(label)) {
        phaseMap.set(label, []);
      }
      phaseMap.get(label).push(b);
    });

    const phases = [];

    phaseMap.forEach((ballsInPhase, phaseName) => {
      if (ballsInPhase.length === 0) return; // Skip empty phases

      const innsSet = new Set();
      let runs = 0;
      let balls = 0;
      let outs = 0;
      let dots = 0;
      let ones = 0;
      let twos = 0;
      let threes = 0;
      let fours = 0;
      let sixes = 0;

      // Group balls by match/innings to compute breakdown rows
      const matchMap = new Map();

      ballsInPhase.forEach(b => {
        innsSet.add(b.InningsId || 1);

        const r = (b.Batruns !== undefined ? b.Batruns : (b.Runs || 0));
        runs += r;

        if (b.Batballs === 1 || b.Batballs === true || b.Bowlballs === 1) {
          balls += 1;
        }

        const isWkt = (b.Dismissal === 1) || (b.NonBallType === 9) || (b.NonBallType === 11) || (b.DismissedBatter === b.StrikerID);
        if (isWkt) outs += 1;

        if (r === 0) dots += 1;
        else if (r === 1) ones += 1;
        else if (r === 2) twos += 1;
        else if (r === 3) threes += 1;
        else if (r === 4 || b.isFour) fours += 1;
        else if (r === 6 || b.isSix) sixes += 1;

        const matchKey = `${matchDetails?.ClubAPrefix || 'TeamA'}_vs_${matchDetails?.ClubBPrefix || 'TeamB'}`;
        if (!matchMap.has(matchKey)) {
          matchMap.set(matchKey, { matchName: matchKey, innCount: 1, runs: 0, balls: 0, outs: 0, dots: 0, ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0 });
        }
        const m = matchMap.get(matchKey);
        m.runs += r;
        if (b.Batballs === 1 || b.Batballs === true || b.Bowlballs === 1) m.balls += 1;
        if (isWkt) m.outs += 1;
        if (r === 0) m.dots += 1;
        else if (r === 1) m.ones += 1;
        else if (r === 2) m.twos += 1;
        else if (r === 3) m.threes += 1;
        else if (r === 4 || b.isFour) m.fours += 1;
        else if (r === 6 || b.isSix) m.sixes += 1;
      });

      const str = balls > 0 ? ((runs / balls) * 100).toFixed(2) : '0.00';
      const avg = outs > 0 ? (runs / outs).toFixed(1) : runs.toFixed(1);
      const sbPercentage = balls > 0 ? ((dots / balls) * 100).toFixed(1) : '0.0';

      const thirtysPlus = (runs >= 30 && runs < 50) ? 1 : 0;
      const fiftysPlus = (runs >= 50 && runs < 100) ? 1 : 0;
      const hundredsPlus = (runs >= 100) ? 1 : 0;

      const matchRows = Array.from(matchMap.values()).map(m => ({
        ...m,
        str: m.balls > 0 ? ((m.runs / m.balls) * 100).toFixed(2) : '0.00'
      }));

      phases.push({
        phaseName,
        summary: {
          inns: innsSet.size,
          runs,
          balls,
          avg,
          str,
          sb: sbPercentage,
          dots,
          ones,
          twos,
          fours,
          sixes,
          thirtysPlus,
          fiftysPlus,
          hundredsPlus
        },
        matchRows
      });
    });

    return { phases, currentMatchCategory: matchCategory };
  }, [batterBalls, matchDetails]);

  // Compute Comfort Level Statistics by Bowling Type
  const comfortLevelStats = React.useMemo(() => {
    if (!batterBalls || batterBalls.length === 0) return { rows: [], total: { overs: '0.0', runs: 0, wkt: 0, str: '0.00', avg: '0.00' } };

    const typeGroupMap = new Map();

    batterBalls.forEach(b => {
      const typeId = b.BwBowlingTypeID;
      if (typeId === undefined || typeId === null) return;

      const prefix = BOWLING_TYPE_MAP[typeId] || `TYPE-${typeId}`;
      if (!typeGroupMap.has(prefix)) {
        typeGroupMap.set(prefix, {
          type: prefix,
          validBalls: 0,
          runs: 0,
          wkt: 0
        });
      }

      const item = typeGroupMap.get(prefix);
      if (b.Batballs === 1 || b.Batballs === true) {
        item.validBalls += 1;
      }
      item.runs += (Number(b.Runs) || 0);
      if (Number(b.Dismissal) === 1 || b.IsWicket === 1) {
        item.wkt += 1;
      }
    });

    let totalValidBalls = 0;
    let totalRuns = 0;
    let totalWkts = 0;

    const rows = Array.from(typeGroupMap.values()).map(item => {
      totalValidBalls += item.validBalls;
      totalRuns += item.runs;
      totalWkts += item.wkt;

      const overs = `${Math.floor(item.validBalls / 6)}.${item.validBalls % 6}`;
      const str = item.validBalls > 0 ? ((item.runs / item.validBalls) * 100).toFixed(2) : '0.00';
      const avg = item.wkt > 0 ? (item.runs / item.wkt).toFixed(2) : item.runs.toFixed(2);

      return {
        ...item,
        overs,
        str,
        avg
      };
    });

    const totalOvers = `${Math.floor(totalValidBalls / 6)}.${totalValidBalls % 6}`;
    const totalStr = totalValidBalls > 0 ? ((totalRuns / totalValidBalls) * 100).toFixed(2) : '0.00';
    const totalAvg = totalWkts > 0 ? (totalRuns / totalWkts).toFixed(2) : totalRuns.toFixed(2);

    const total = {
      overs: totalOvers,
      runs: totalRuns,
      wkt: totalWkts,
      str: totalStr,
      avg: totalAvg
    };

    return { rows, total };
  }, [batterBalls]);

  // Graphics API SVGs State
  const [graphicsData, setGraphicsData] = useState({
    pitchmapSvg: '',
    wwregionSvg: '',
    beatenPitchmapSvg: '',
    phaseGraphicsMap: {}, // Keyed by phase index e.g. 0: { pitchmapSvg, wwregionSvg }
    loading: false
  });

  // Fetch Pitch Map & Wagon Wheel Region SVGs from Cricket-21 Graphics API
  useEffect(() => {
    if (!batterBalls || batterBalls.length === 0) {
      setGraphicsData({ pitchmapSvg: '', wwregionSvg: '', beatenPitchmapSvg: '', phaseGraphicsMap: {}, loading: false });
      return;
    }

    const fetchGraphics = async () => {
      setGraphicsData(prev => ({ ...prev, loading: true }));
      try {
        const matchTitle = `${matchDetails?.ClubAPrefix || 'TeamA'} vs ${matchDetails?.ClubBPrefix || 'TeamB'}`;

        const mapBallToPayload = (b) => ({
          Match: matchTitle,
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

        const mappedBalls = batterBalls.map(mapBallToPayload);

        // Filter for Beaten, Uncomfortable, and Dismissals
        const beatenUncomfortableBalls = batterBalls.filter((b) => {
          const isBeaten = String(b.BatSubject) === '5';
          const isUncomfortable = b.Batsman ? String(b.Batsman).split(',').map(s => s.trim()).includes('5') : false;
          const isDismissal = b.Dismissal === 1;
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

        // Also fetch phase-wise graphics for each active phase in phaseWiseStats
        const phasePromises = (phaseWiseStats?.phases || []).map(async (p, idx) => {
          // Re-filter batterBalls belonging to this phase
          const phaseBalls = batterBalls.filter(b => {
            const matchTypeId = b.MatchTypeID || matchDetails?.MatchTypeID || 2;
            const odiTypes = [2, 5, 9, 12, 15, 18, 21, 27, 30, 33, 36, 38, 56];
            const t20Types = [3, 6, 7, 10, 13, 16, 19, 22, 28, 31, 34, 37, 39, 40, 41, 42, 43, 44, 45, 50, 51, 53, 54, 55, 91];
            let category = 'TEST';
            if (odiTypes.includes(Number(matchTypeId))) category = 'ODI';
            else if (t20Types.includes(Number(matchTypeId))) category = 'T20';

            const over = b.OverId !== undefined && b.OverId !== null ? Number(b.OverId) : Math.floor(Number(b.Overs || 0));
            let label = '';
            if (category === 'ODI') {
              if (over >= 1 && over <= 10) label = '01-10 OVERS';
              else if (over >= 11 && over <= 20) label = '11-20 OVERS';
              else if (over >= 21 && over <= 30) label = '21-30 OVERS';
              else if (over >= 31 && over <= 40) label = '31-40 OVERS';
              else label = '41-50 OVERS';
            } else if (category === 'T20') {
              if (over >= 1 && over <= 6) label = '01-06 OVERS';
              else if (over >= 7 && over <= 10) label = '07-10 OVERS';
              else if (over >= 11 && over <= 15) label = '11-15 OVERS';
              else label = '16-20 OVERS';
            } else {
              if (over >= 1 && over <= 25) label = 'NEW BALL (1-25 OVERS)';
              else if (over >= 26 && over <= 60) label = 'SEMI NEW BALL (26-60 OVERS)';
              else if (over >= 61 && over <= 80) label = 'OLD BALL (61-80 OVERS)';
              else label = 'SECOND NEW BALL (81+ OVERS)';
            }
            return label === p.phaseName;
          });

          const pMapped = phaseBalls.map(mapBallToPayload);
          const pPitchPayload = { title: "pitchmap", type: "svg", scale: 50, view: "1", region: 8, template: 2, clientid: 1, isHawk: 0, balls: pMapped };
          const pWwPayload = { title: "WW Region", type: "svg", scale: 50, view: "1", region: 8, template: 2, clientid: 1, isHawk: 0, balls: pMapped };

          const [pPitchRes, pWwRes] = await Promise.all([
            axios.post(`${GRAPHICS_BASE}/pitchmap`, pPitchPayload, { headers: { 'Content-Type': 'application/json' } }).catch(() => null),
            axios.post(`${GRAPHICS_BASE}/wwregion`, pWwPayload, { headers: { 'Content-Type': 'application/json' } }).catch(() => null)
          ]);

          let pPitchSvg = pPitchRes?.data?.svg || pPitchRes?.data?.data || (typeof pPitchRes?.data === 'string' ? pPitchRes.data : '');
          let pWwSvg = pWwRes?.data?.svg || pWwRes?.data?.data || (typeof pWwRes?.data === 'string' ? pWwRes.data : '');

          if (typeof pPitchSvg === 'string' && pPitchSvg.startsWith('"') && pPitchSvg.endsWith('"')) {
            try { pPitchSvg = JSON.parse(pPitchSvg); } catch (e) { }
          }
          if (typeof pWwSvg === 'string' && pWwSvg.startsWith('"') && pWwSvg.endsWith('"')) {
            try { pWwSvg = JSON.parse(pWwSvg); } catch (e) { }
          }

          return { idx, pitchmapSvg: pPitchSvg, wwregionSvg: pWwSvg };
        });

        const [pitchRes, wwRes, beatenRes, phaseGfxResults] = await Promise.all([
          axios.post(`${GRAPHICS_BASE}/pitchmap`, pitchPayload, { headers: { 'Content-Type': 'application/json' } }).catch(e => {
            console.error('Pitchmap API error:', e);
            return null;
          }),
          axios.post(`${GRAPHICS_BASE}/wwregion`, wwPayload, { headers: { 'Content-Type': 'application/json' } }).catch(e => {
            console.error('WWRegion API error:', e);
            return null;
          }),
          axios.post(`${GRAPHICS_BASE}/pitchmap`, beatenPitchPayload, { headers: { 'Content-Type': 'application/json' } }).catch(e => {
            console.error('Beaten Pitchmap API error:', e);
            return null;
          }),
          Promise.all(phasePromises)
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

        // Clean up SVG strings if enclosed in extra quotes
        if (pitchSvg.startsWith('"') && pitchSvg.endsWith('"')) {
          try { pitchSvg = JSON.parse(pitchSvg); } catch (e) { }
        }
        if (wwSvg.startsWith('"') && wwSvg.endsWith('"')) {
          try { wwSvg = JSON.parse(wwSvg); } catch (e) { }
        }
        if (beatenSvg.startsWith('"') && beatenSvg.endsWith('"')) {
          try { beatenSvg = JSON.parse(beatenSvg); } catch (e) { }
        }

        const phaseGraphicsMap = {};
        (phaseGfxResults || []).forEach(res => {
          if (res) {
            phaseGraphicsMap[res.idx] = {
              pitchmapSvg: res.pitchmapSvg,
              wwregionSvg: res.wwregionSvg
            };
          }
        });

        setGraphicsData({
          pitchmapSvg: pitchSvg,
          wwregionSvg: wwSvg,
          beatenPitchmapSvg: beatenSvg,
          phaseGraphicsMap,
          loading: false
        });
      } catch (err) {
        console.error('Graphics API fetch error:', err);
        setGraphicsData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchGraphics();
  }, [batterBalls, matchDetails, phaseWiseStats]);

  // Batter aggregate stats
  const batterStats = React.useMemo(() => {
    let totalRuns = 0;
    let totalBalls = 0;
    let fours = 0;
    let sixes = 0;
    let dismissalText = 'Not Out';

    batterBalls.forEach(b => {
      totalRuns += (b.Runs || 0);
      totalBalls += 1;
      if (b.isFour || b.Runs === 4) fours += 1;
      if (b.isSix || b.Runs === 6) sixes += 1;
      if (b.DismissalTypeDesc && b.DismissalTypeDesc !== 'None' && b.DismissedBatter === b.StrikerID) {
        dismissalText = `${b.DismissalTypeDesc} b ${b.BowlerName || ''}`;
      }
    });

    const strikeRate = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : '0.0';

    return { totalRuns, totalBalls, fours, sixes, strikeRate, dismissalText };
  }, [batterBalls]);

  // Innings-wise performance calculation for selected batter (Handles Test / Multi-Innings & Limited-Overs)
  const inningsWiseStats = React.useMemo(() => {
    if (!batterBalls || batterBalls.length === 0) {
      return {
        rows: [],
        total: { label: 'Total', innCount: 0, runs: 0, balls: 0, no: 0, str: '0.00', avg: '0.00', fifties: 0, hundreds: 0 }
      };
    }

    const mapByInnings = new Map();

    batterBalls.forEach((b) => {
      const innId = b.InningsId || 1;
      if (!mapByInnings.has(innId)) {
        mapByInnings.set(innId, []);
      }
      mapByInnings.get(innId).push(b);
    });

    const sortedInningsIds = Array.from(mapByInnings.keys()).sort((a, b) => a - b);

    let totRuns = 0;
    let totBalls = 0;
    let totNO = 0;
    let totOuts = 0;
    let totFifties = 0;
    let totHundreds = 0;

    const rows = sortedInningsIds.map((innId) => {
      const ballsInInn = mapByInnings.get(innId);
      let runs = 0;
      let balls = 0;
      let outs = 0;

      ballsInInn.forEach((b) => {
        runs += (b.Batruns !== undefined ? b.Batruns : (b.Runs || 0));
        if (b.Batballs === 1 || b.Batballs === true || b.Bowlballs === 1) {
          balls += 1;
        }
        // Dismissal check formula
        const isWkt = (b.Dismissal === 1) || (b.NonBallType === 9) || (b.NonBallType === 11) || (b.DismissedBatter === b.StrikerID);
        if (isWkt) {
          outs += 1;
        }
      });

      const isNO = outs === 0 ? 1 : 0;
      totRuns += runs;
      totBalls += balls;
      totNO += isNO;
      totOuts += outs;

      const str = balls > 0 ? ((runs / balls) * 100).toFixed(2) : '0.00';
      const avg = outs > 0 ? (runs / outs).toFixed(2) : runs.toFixed(2);

      const fifties = (runs >= 50 && runs < 100) ? 1 : 0;
      const hundreds = (runs >= 100) ? 1 : 0;
      totFifties += fifties;
      totHundreds += hundreds;

      const innLabel = innId === 1 ? '1st Innings' : innId === 2 ? '2nd Innings' : innId === 3 ? '3rd Innings' : `${innId}th Innings`;

      return {
        label: innLabel,
        innCount: 1,
        runs,
        balls,
        no: isNO,
        str,
        avg,
        fifties,
        hundreds
      };
    });

    const totalStr = totBalls > 0 ? ((totRuns / totBalls) * 100).toFixed(2) : '0.00';
    const totalAvg = totOuts > 0 ? (totRuns / totOuts).toFixed(2) : totRuns.toFixed(2);

    const total = {
      label: 'Total',
      innCount: rows.length,
      runs: totRuns,
      balls: totBalls,
      no: totNO,
      str: totalStr,
      avg: totalAvg,
      fifties: totFifties,
      hundreds: totHundreds
    };

    return { rows, total };
  }, [batterBalls]);

  // Derived Title for Slide 2
  const opponentName = (activeTeam.name === matchDetails?.ClubAFull ? matchDetails?.ClubBFull : matchDetails?.ClubAFull) || 'ANDHRA';
  const matchLocation = (matchDetails?.City || matchDetails?.StadiumName || 'ANANTPUR').toUpperCase();
  const roundText = matchDetails?.Round ? `ROUND - ${matchDetails.Round}` : (matchDetails?.CompPrefix || 'ROUND - 6');
  const slide2Title = `${roundText} vs ${opponentName.toUpperCase()} AT ${matchLocation}.`;

  // 4. FRONTEND CLIENT-SIDE REPORT DOWNLOAD

  // PDF: Captures exact HTML preview via html-to-image
  // PPTX: Builds native, fully EDITABLE PowerPoint text boxes, vector shapes, L-corner frames & tables
  const handleDownload = async (format) => {
    setDownloading(true);
    try {
      const safeName = (activeBatter.name || 'Batter').replace(/[^a-zA-Z0-9]/g, '_');
      const compName = matchDetails?.CompFullName || matchDetails?.CompPrefix || 'IPL 2025';

      if (format === 'pptx') {
        const pptx = typeof pptxgen === 'function' ? new pptxgen() : new pptxgen.default();
        pptx.layout = 'LAYOUT_16x9';

        // -------------------------------------------------------------
        // PPTX SLIDE 1: COVER PAGE (Native shapes, L-frames & editable text)
        // -------------------------------------------------------------
        const s1 = pptx.addSlide();
        s1.background = { color: 'F6F4EB' };

        // Top-Left Black L-Corner Frame (Vector Shapes)
        s1.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 0.5, w: 2.4, h: 0.18, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        s1.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 0.5, w: 0.18, h: 1.8, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Bottom-Right Black L-Corner Frame (Vector Shapes)
        s1.addShape(pptx.shapes.RECTANGLE, {
          x: 7.0, y: 4.9, w: 2.4, h: 0.18, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        s1.addShape(pptx.shapes.RECTANGLE, {
          x: 9.22, y: 3.28, w: 0.18, h: 1.8, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Editable Batter Name (Center Title)
        s1.addText(activeBatter.name.toUpperCase(), {
          x: 1.0, y: 1.8, w: 8.0, h: 1.0,
          align: 'center', fontSize: 38, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        // Editable Batter Style
        s1.addText(activeBatter.batStyle.toUpperCase(), {
          x: 1.0, y: 2.9, w: 8.0, h: 0.4,
          align: 'center', fontSize: 16, bold: true, italic: true, color: '1E293B', fontFace: 'Arial'
        });

        // Editable Team Name
        s1.addText(activeTeam.name.toUpperCase(), {
          x: 1.0, y: 3.35, w: 8.0, h: 0.4,
          align: 'center', fontSize: 14, bold: true, italic: true, color: '1E293B', fontFace: 'Arial'
        });

        // Editable Competition Name
        s1.addText(`IN ${compName.toUpperCase()}`, {
          x: 1.0, y: 3.8, w: 8.0, h: 0.4,
          align: 'center', fontSize: 14, bold: true, italic: true, color: '1E293B', fontFace: 'Arial'
        });

        // -------------------------------------------------------------
        // PPTX SLIDE 2: BATTING STATS TABLE (Native Clean PowerPoint Table)
        // -------------------------------------------------------------
        const s2 = pptx.addSlide();
        s2.background = { color: 'F6F4EB' };

        // Left Black Vertical Accent Bar (Vector Shape)
        s2.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Title Header
        s2.addText(slide2Title.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        // Subtitle Header
        s2.addText('■  BATTING STATS', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        // Player Summary Header Bar Above Table
        s2.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.7, w: 8.8, h: 0.5, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        s2.addText(`${activeBatter.name.toUpperCase()} - Consolidated player summary`, {
          x: 0.8, y: 1.75, w: 4.5, h: 0.4,
          fontSize: 11, bold: true, color: 'FFFFFF', fontFace: 'Arial'
        });

        // Pill Badges in Header
        s2.addText(`Inns ${inningsWiseStats.total.innCount}   Runs ${inningsWiseStats.total.runs}   Balls ${inningsWiseStats.total.balls}   AVG ${inningsWiseStats.total.avg}   S/R ${inningsWiseStats.total.str}`, {
          x: 5.2, y: 1.75, w: 4.1, h: 0.4,
          fontSize: 10, bold: true, color: '60A5FA', align: 'right', fontFace: 'Arial'
        });

        // Table Rows Construction
        const s2TableRows = [
          [
            { text: 'Inning', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
            { text: 'INNING', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'RUNS', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'BALLS', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'N.O', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'STR', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'AVG', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: "50'S", options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: "100'S", options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
          ]
        ];

        inningsWiseStats.rows.forEach(r => {
          s2TableRows.push([
            { text: r.label, options: { bold: true, align: 'left', color: '0F172A' } },
            { text: String(r.innCount), options: { align: 'center', color: '1E293B' } },
            { text: String(r.runs), options: { align: 'center', color: '1E293B' } },
            { text: String(r.balls), options: { align: 'center', color: '1E293B' } },
            { text: String(r.no), options: { align: 'center', color: '1E293B' } },
            { text: String(r.str), options: { align: 'center', color: '1E293B' } },
            { text: String(r.avg), options: { align: 'center', color: '1E293B' } },
            { text: String(r.fifties), options: { align: 'center', color: '1E293B' } },
            { text: String(r.hundreds), options: { align: 'center', color: '1E293B' } }
          ]);
        });

        // Total Summary Row
        s2TableRows.push([
          { text: inningsWiseStats.total.label, options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'left' } },
          { text: String(inningsWiseStats.total.innCount), options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'center' } },
          { text: String(inningsWiseStats.total.runs), options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'center' } },
          { text: String(inningsWiseStats.total.balls), options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'center' } },
          { text: String(inningsWiseStats.total.no), options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'center' } },
          { text: String(inningsWiseStats.total.str), options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'center' } },
          { text: String(inningsWiseStats.total.avg), options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'center' } },
          { text: String(inningsWiseStats.total.fifties), options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'center' } },
          { text: String(inningsWiseStats.total.hundreds), options: { bold: true, fill: 'E2E8F0', color: '0F172A', align: 'center' } }
        ]);

        s2.addTable(s2TableRows, {
          x: 0.6, y: 2.2, w: 8.8, colW: [1.8, 0.8, 0.9, 0.9, 0.8, 1.0, 1.0, 0.8, 0.8],
          fontSize: 11, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' },
          fill: 'FFFFFF'
        });


        // -------------------------------------------------------------
        // PPTX SLIDE 3: BATTING STATS GRAPHICAL REPRESENTATION
        // -------------------------------------------------------------
        const s3 = pptx.addSlide();
        s3.background = { color: 'F6F4EB' };

        // Left Black Vertical Accent Bar (Vector Shape)
        s3.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Title Header
        s3.addText(slide2Title.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        // Subtitle Header
        s3.addText('■  BATTING STATS GRAPHICAL REPRESENTATION', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        // Player Summary Header Bar Above Chart
        s3.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.8, w: 8.8, h: 0.5, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        s3.addText(`${activeBatter.name.toUpperCase()} - Consolidated graphical summary`, {
          x: 0.8, y: 1.85, w: 4.5, h: 0.4,
          fontSize: 11, bold: true, color: 'FFFFFF', fontFace: 'Arial'
        });

        // Pill Badges in Header
        s3.addText(`Inns ${inningsWiseStats.total.innCount}   Runs ${inningsWiseStats.total.runs}   Balls ${inningsWiseStats.total.balls}   AVG ${inningsWiseStats.total.avg}   S/R ${inningsWiseStats.total.str}`, {
          x: 5.2, y: 1.85, w: 4.1, h: 0.4,
          fontSize: 10, bold: true, color: '60A5FA', align: 'right', fontFace: 'Arial'
        });

        // Editable Native PowerPoint Chart for Inning Wise Data
        const chartData = [
          {
            name: 'Runs',
            labels: inningsWiseStats.rows.map(r => r.label.toUpperCase()),
            values: inningsWiseStats.rows.map(r => r.runs)
          },
          {
            name: 'Avg',
            labels: inningsWiseStats.rows.map(r => r.label.toUpperCase()),
            values: inningsWiseStats.rows.map(r => parseFloat(r.avg) || 0)
          }
        ];

        s3.addChart(pptx.charts.BAR, chartData, {
          x: 0.6, y: 2.4, w: 8.8, h: 3.1,
          barGapWidthPct: 20,
          chartColors: ['70AD47', 'ED7D31'],
          showTitle: true,
          title: 'INNING WISE DATA',
          titleColor: '0F172A',
          titleFontSize: 12,
          valGridLine: { style: 'dash', color: 'CBD5E1' },
          showLegend: true,
          legendPos: 'b'
        });

        // -------------------------------------------------------------
        // PPTX SLIDE 4: OVERALL GRAPHICS (Wagon Wheel Region & Pitch Map)
        // -------------------------------------------------------------
        const s4 = pptx.addSlide();
        s4.background = { color: 'F6F4EB' };

        // Left Black Vertical Accent Bar (Vector Shape)
        s4.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Title Header
        s4.addText(slide2Title.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        // Subtitle Header
        s4.addText('■  OVER ALL', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        // Add graphics container box in PPTX (w: 8.8, centered from x: 0.6)
        s4.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.7, w: 8.8, h: 2.8, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Each graphic w=4.15, h=2.31. Centered inside 2.8 box (y: 1.94). Left x=0.75, right x=5.10 (gap 0.20)
        if (graphicsData.wwregionSvg) {
          s4.addImage({
            data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(graphicsData.wwregionSvg)))}`,
            x: 0.75, y: 1.94, w: 4.15, h: 2.31
          });
        }
        if (graphicsData.pitchmapSvg) {
          s4.addImage({
            data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(graphicsData.pitchmapSvg)))}`,
            x: 5.10, y: 1.94, w: 4.15, h: 2.31
          });
        }

        // -------------------------------------------------------------
        // PPTX SLIDE 5: BEATEN, UNCOMFORTABLE & DISMISSAL AREAS
        // -------------------------------------------------------------
        const s5 = pptx.addSlide();
        s5.background = { color: 'F6F4EB' };

        // Left Black Vertical Accent Bar
        s5.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Title Header
        s5.addText(slide2Title.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });

        // Subtitle Header
        s5.addText('■  BEATEN , UNCOMFORTABLE & DISMISSAL AREAS', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        // Centered Graphics Container Box (w: 5.2 centered at x: 2.4)
        s5.addShape(pptx.shapes.RECTANGLE, {
          x: 2.4, y: 1.7, w: 5.2, h: 2.95, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });

        // Image w: 4.6, h: 2.55. Centered inside 2.95 box (y: 1.90, x: 2.7)
        if (graphicsData.beatenPitchmapSvg) {
          s5.addImage({
            data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(graphicsData.beatenPitchmapSvg)))}`,
            x: 2.7, y: 1.90, w: 4.6, h: 2.55
          });
        }

        // -------------------------------------------------------------
        // PPTX SLIDE 6+: PHASE WISE BATTING ANALYTICS & GRAPHICS SLIDES
        // -------------------------------------------------------------
        if (phaseWiseStats && phaseWiseStats.phases && phaseWiseStats.phases.length > 0) {
          phaseWiseStats.phases.forEach((p, pIdx) => {
            // Slide A: Phase Stats Table
            const s6 = pptx.addSlide();
            s6.background = { color: 'F6F4EB' };

            // Left Black Accent Stripe
            s6.addShape(pptx.shapes.RECTANGLE, {
              x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
            });

            // Title Header
            s6.addText(slide2Title.toUpperCase(), {
              x: 0.6, y: 0.5, w: 9.0, h: 0.6,
              fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
            });

            // Subtitle Header
            s6.addText(`■  PHASE WISE – ( ${p.phaseName} )`, {
              x: 0.6, y: 1.2, w: 9.0, h: 0.4,
              fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
            });

            // Summary Header Card
            s6.addShape(pptx.shapes.RECTANGLE, {
              x: 0.6, y: 1.7, w: 8.8, h: 1.2, fill: { color: '0F172A' }, line: { color: '0F172A' }
            });

            s6.addText(`${activeBatter.name.toUpperCase()}\nInns: ${p.summary.inns} | Runs: ${p.summary.runs} | Balls: ${p.summary.balls} | Avg: ${p.summary.avg} | S/R: ${p.summary.str} | SB%: ${p.summary.sb}%\nDots: ${p.summary.dots} | 1s: ${p.summary.ones} | 2s: ${p.summary.twos} | 4s: ${p.summary.fours} | 6s: ${p.summary.sixes} | 30+: ${p.summary.thirtysPlus} | 50+: ${p.summary.fiftysPlus}`, {
              x: 0.8, y: 1.8, w: 8.4, h: 1.0,
              fontSize: 11, color: 'FFFFFF', fontFace: 'Arial'
            });

            // Breakdown Table
            const pTableRows = [
              [
                { text: 'Match', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
                { text: 'Inns', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: 'Runs', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: 'Balls', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: 'S/R', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: 'Dots', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: '1s', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: '2s', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: '3s', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: 'Fours', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                { text: 'Sixers', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
              ]
            ];

            p.matchRows.forEach(r => {
              pTableRows.push([
                { text: r.matchName, options: { align: 'left', color: '1E293B' } },
                { text: String(r.innCount), options: { align: 'center', color: '1E293B' } },
                { text: String(r.runs), options: { align: 'center', color: '1E293B' } },
                { text: String(r.balls), options: { align: 'center', color: '1E293B' } },
                { text: String(r.str), options: { align: 'center', color: '1E293B' } },
                { text: String(r.dots), options: { align: 'center', color: '1E293B' } },
                { text: String(r.ones), options: { align: 'center', color: '1E293B' } },
                { text: String(r.twos), options: { align: 'center', color: '1E293B' } },
                { text: String(r.threes), options: { align: 'center', color: '1E293B' } },
                { text: String(r.fours), options: { align: 'center', color: '1E293B' } },
                { text: String(r.sixes), options: { align: 'center', color: '1E293B' } }
              ]);
            });

            s6.addTable(pTableRows, {
              x: 0.6, y: 3.0, w: 8.8, colW: [2.8, 0.6, 0.6, 0.6, 0.8, 0.6, 0.6, 0.6, 0.6, 0.5, 0.5],
              fontSize: 10, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' }, fill: 'FFFFFF'
            });

            // Slide B: Phase Graphics (Pitch Map + Wagon Wheel Region)
            const s6Gfx = pptx.addSlide();
            s6Gfx.background = { color: 'F6F4EB' };
            s6Gfx.addShape(pptx.shapes.RECTANGLE, {
              x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
            });
            s6Gfx.addText(slide2Title.toUpperCase(), {
              x: 0.6, y: 0.5, w: 9.0, h: 0.6,
              fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
            });
            s6Gfx.addText(`■  PHASE WISE – ( ${p.phaseName} )`, {
              x: 0.6, y: 1.2, w: 9.0, h: 0.4,
              fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
            });
            s6Gfx.addShape(pptx.shapes.RECTANGLE, {
              x: 0.6, y: 1.7, w: 8.8, h: 2.8, fill: { color: '0F172A' }, line: { color: '0F172A' }
            });

            const pGfx = graphicsData.phaseGraphicsMap[pIdx];
            if (pGfx?.wwregionSvg) {
              s6Gfx.addImage({
                data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(pGfx.wwregionSvg)))}`,
                x: 0.75, y: 1.94, w: 4.15, h: 2.31
              });
            }
            if (pGfx?.pitchmapSvg) {
              s6Gfx.addImage({
                data: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(pGfx.pitchmapSvg)))}`,
                x: 5.10, y: 1.94, w: 4.15, h: 2.31
              });
            }
          });
        }

        // -------------------------------------------------------------
        // PPTX SLIDE 7: COMFORT LEVEL REPORT (Table)
        // -------------------------------------------------------------
        const s7 = pptx.addSlide();
        s7.background = { color: 'F6F4EB' };
        s7.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        s7.addText(slide2Title.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });
        s7.addText('■  COMFORT LEVEL REPORT', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        s7.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.7, w: 8.8, h: 0.9, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        s7.addText(`${activeBatter.name.toUpperCase()}\nFiltered batting comfort summary | Runs: ${comfortLevelStats.total.runs} | WKT: ${comfortLevelStats.total.wkt} | STR: ${comfortLevelStats.total.str} | AVG: ${comfortLevelStats.total.avg}`, {
          x: 0.8, y: 1.8, w: 8.4, h: 0.7,
          fontSize: 11, color: 'FFFFFF', fontFace: 'Arial', bold: true
        });

        const comfortTableRows = [
          [
            { text: 'TYPE', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'left' } },
            { text: 'OVERS', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'RUNS', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'WKT', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'STR', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
            { text: 'AVG', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
          ]
        ];

        comfortLevelStats.rows.forEach(r => {
          comfortTableRows.push([
            { text: r.type, options: { align: 'left', color: '1E293B', bold: true } },
            { text: String(r.overs), options: { align: 'center', color: '1E293B' } },
            { text: String(r.runs), options: { align: 'center', color: '1E293B' } },
            { text: String(r.wkt), options: { align: 'center', color: '1E293B' } },
            { text: String(r.str), options: { align: 'center', color: '1E293B' } },
            { text: String(r.avg), options: { align: 'center', color: '1E293B' } }
          ]);
        });

        comfortTableRows.push([
          { text: 'Total', options: { align: 'left', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(comfortLevelStats.total.overs), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(comfortLevelStats.total.runs), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(comfortLevelStats.total.wkt), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(comfortLevelStats.total.str), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } },
          { text: String(comfortLevelStats.total.avg), options: { align: 'center', color: '0F172A', bold: true, fill: 'E2E8F0' } }
        ]);

        s7.addTable(comfortTableRows, {
          x: 0.6, y: 2.8, w: 8.8, colW: [2.3, 1.3, 1.3, 1.3, 1.3, 1.3],
          fontSize: 10, fontFace: 'Arial', border: { pt: '1', color: 'CBD5E1' }, fill: 'FFFFFF'
        });

        // -------------------------------------------------------------
        // PPTX SLIDE 8: COMFORT LEVEL REPORT - GRAPHICAL
        // -------------------------------------------------------------
        const s8 = pptx.addSlide();
        s8.background = { color: 'F6F4EB' };
        s8.addShape(pptx.shapes.RECTANGLE, {
          x: 0, y: 0, w: 0.25, h: '100%', fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        s8.addText(slide2Title.toUpperCase(), {
          x: 0.6, y: 0.5, w: 9.0, h: 0.6,
          fontSize: 24, bold: true, color: '0F172A', fontFace: 'Arial'
        });
        s8.addText('■  COMFORT LEVEL REPORT - GRAPHICAL', {
          x: 0.6, y: 1.2, w: 9.0, h: 0.4,
          fontSize: 14, bold: true, color: '1E293B', fontFace: 'Arial'
        });

        s8.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6, y: 1.7, w: 8.8, h: 0.9, fill: { color: '0F172A' }, line: { color: '0F172A' }
        });
        s8.addText(`${activeBatter.name.toUpperCase()}\nGraphical comfort level against bowling type | Runs: ${comfortLevelStats.total.runs} | WKT: ${comfortLevelStats.total.wkt} | STR: ${comfortLevelStats.total.str} | AVG: ${comfortLevelStats.total.avg}`, {
          x: 0.8, y: 1.8, w: 8.4, h: 0.7,
          fontSize: 11, color: 'FFFFFF', fontFace: 'Arial', bold: true
        });

        if (comfortLevelStats.rows.length > 0) {
          const categories = comfortLevelStats.rows.map(r => r.type);
          const oversData = comfortLevelStats.rows.map(r => parseFloat(r.overs));
          const runsData = comfortLevelStats.rows.map(r => r.runs);
          const wktData = comfortLevelStats.rows.map(r => r.wkt);

          const comfortChartData = [
            { name: 'OVERS', labels: categories, values: oversData },
            { name: 'RUNS', labels: categories, values: runsData },
            { name: 'WKT', labels: categories, values: wktData }
          ];

          s8.addChart(pptx.charts.BAR, comfortChartData, {
            x: 0.6, y: 2.8, w: 8.8, h: 2.3,
            barDir: 'col',
            chartColors: ['38BDF8', '22C55E', 'F97316'],
            showLegend: true,
            legendPos: 'b',
            showValue: true
          });
        }

        await pptx.writeFile({ fileName: `Report_${selectedReportType}_${safeName}.pptx` });

      } else {
        // -------------------------------------------------------------
        // PDF EXPORT: Uses html-to-image for exact pixel-perfect preview
        // -------------------------------------------------------------
        const slide1El = document.getElementById('slide-1-node');
        const slide2El = document.getElementById('slide-2-node');
        const slide3El = document.getElementById('slide-3-node');
        const slide4El = document.getElementById('slide-4-node');
        const slide5El = document.getElementById('slide-5-node');

        const imgOpts = { quality: 0.95, pixelRatio: 2, cacheBust: true };

        const img1 = slide1El ? await htmlToImage.toPng(slide1El, imgOpts) : null;
        const img2 = slide2El ? await htmlToImage.toPng(slide2El, imgOpts) : null;
        const img3 = slide3El ? await htmlToImage.toPng(slide3El, imgOpts) : null;
        const img4 = slide4El ? await htmlToImage.toPng(slide4El, imgOpts) : null;
        const img5 = slide5El ? await htmlToImage.toPng(slide5El, imgOpts) : null;

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [900, 525] });

        if (img1) {
          pdf.addImage(img1, 'PNG', 0, 0, 900, 525);
        }
        if (img2) {
          pdf.addPage([900, 525], 'landscape');
          pdf.addImage(img2, 'PNG', 0, 0, 900, 525);
        }
        if (img3) {
          pdf.addPage([900, 525], 'landscape');
          pdf.addImage(img3, 'PNG', 0, 0, 900, 525);
        }
        if (img4) {
          pdf.addPage([900, 525], 'landscape');
          pdf.addImage(img4, 'PNG', 0, 0, 900, 525);
        }
        if (img5) {
          pdf.addPage([900, 525], 'landscape');
          pdf.addImage(img5, 'PNG', 0, 0, 900, 525);
        }

        // Dynamically capture Slide 6 phase nodes (Stats table and Graphics slide for each phase)
        if (phaseWiseStats && phaseWiseStats.phases) {
          for (let pIdx = 0; pIdx < phaseWiseStats.phases.length; pIdx++) {
            const pEl = document.getElementById(`slide-6-node-${pIdx}`);
            if (pEl) {
              const pImg = await htmlToImage.toPng(pEl, imgOpts);
              if (pImg) {
                pdf.addPage([900, 525], 'landscape');
                pdf.addImage(pImg, 'PNG', 0, 0, 900, 525);
              }
            }

            const pGfxEl = document.getElementById(`slide-6-gfx-node-${pIdx}`);
            if (pGfxEl) {
              const pGfxImg = await htmlToImage.toPng(pGfxEl, imgOpts);
              if (pGfxImg) {
                pdf.addPage([900, 525], 'landscape');
                pdf.addImage(pGfxImg, 'PNG', 0, 0, 900, 525);
              }
            }
          }
        }

        // Capture Comfort Level Table and Graphical Slides for PDF Export
        const comfortEl = document.getElementById('slide-comfort-node');
        if (comfortEl) {
          const comfortImg = await htmlToImage.toPng(comfortEl, imgOpts);
          if (comfortImg) {
            pdf.addPage([900, 525], 'landscape');
            pdf.addImage(comfortImg, 'PNG', 0, 0, 900, 525);
          }
        }
        const comfortGfxEl = document.getElementById('slide-comfort-gfx-node');
        if (comfortGfxEl) {
          const comfortGfxImg = await htmlToImage.toPng(comfortGfxEl, imgOpts);
          if (comfortGfxImg) {
            pdf.addPage([900, 525], 'landscape');
            pdf.addImage(comfortGfxImg, 'PNG', 0, 0, 900, 525);
          }
        }

        pdf.save(`Report_${selectedReportType}_${safeName}.pdf`);
      }
    } catch (err) {
      console.error('Report export error:', err);
    } finally {
      setDownloading(false);
    }
  };



  // -------------------------------------------------------------
  // VIEW 1: LOGIN PAGE
  // -------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Cricket Report Studio
            </h1>
            <p className="text-xs text-slate-400">Sign in to generate match & tournament reports</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-500/25 transition-all text-sm mt-2"
            >
              Sign In to Studio
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Cricket Report Studio
            </h1>
            <p className="text-xs text-slate-400">Match & Tournament Analytics Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: HOMEPAGE */}
      {/* ------------------------------------------------------------- */}
      {currentPage === 'home' && (
        <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col justify-center">
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-3xl font-bold text-white">Select Report Category</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Choose between single match analysis or comprehensive tournament breakdown reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div
              onClick={() => setCurrentPage('match_reports')}
              className="group cursor-pointer bg-slate-900 border border-slate-800 hover:border-blue-500/80 rounded-2xl p-8 shadow-xl transition-all hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all" />

              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  Match Reports
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Generate detailed ball-by-ball analysis, player scorecards, and client profile HTML/PDF/PPTX reports.
                </p>
              </div>

              <div className="mt-8 flex items-center text-sm font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                <span>Configure Match Report</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            <div
              onClick={() => setCurrentPage('tournament_reports')}
              className="group cursor-pointer bg-slate-900 border border-slate-800 hover:border-amber-500/80 rounded-2xl p-8 shadow-xl transition-all hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between relative overflow-hidden opacity-90"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/10 rounded-full blur-2xl group-hover:bg-amber-600/20 transition-all" />

              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  Tournament Reports
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Consolidated series performance, team standings, player leaderboard aggregations, and tournament summary.
                </p>
              </div>

              <div className="mt-8 flex items-center text-sm font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>Explore Tournament Reports</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: MATCH REPORTS CONFIGURATION & PREVIEW */}
      {/* ------------------------------------------------------------- */}
      {currentPage === 'match_reports' && (
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage('home')}
              className="flex items-center text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Categories
            </button>
            <span className="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold px-3 py-1 rounded-full">
              Match Report Studio
            </span>
          </div>

          {/* Controls Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white">1. Select Competition & Match</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Competition Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Competition
                </label>
                <select
                  value={selectedCompId}
                  onChange={(e) => handleCompetitionChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none"
                >
                  <option value="">-- Choose Competition --</option>
                  {competitions.map((c) => (
                    <option key={c.ID || c.id} value={c.ID || c.id}>
                      {c.NAME || c.Name || c.name} ({c.SEASON || c.Season || '2025-26'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Match Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Match
                </label>
                <select
                  disabled={!selectedCompId}
                  value={selectedMatchId}
                  onChange={(e) => handleMatchChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none disabled:opacity-40"
                >
                  <option value="">-- Choose Match --</option>
                  {matches.map((m) => (
                    <option key={m.ID} value={m.ID}>
                      {m.MatchNameDate || m.MatchNameShort || m.MatchName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Template Profile */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Client Profile
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none"
                >
                  <option value="vca">Vidarbha (VCA)</option>
                  <option value="bcci">BCCI Profile</option>
                  <option value="icc">ICC Default</option>
                </select>
              </div>

              {/* Report Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Report Type
                </label>
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none"
                >
                  <option value="vca-batter">VCA Batter Report</option>
                  <option value="vca-bowler">VCA Bowler Report</option>
                  <option value="vca-postmatch">VCA Post Match Report</option>
                </select>
              </div>
            </div>

            {/* Fetch & Load Data Button */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <div className="text-xs text-slate-400">
                {isDataFetched && (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Loaded {ballData.length} deliveries for match #{selectedMatchId}
                  </span>
                )}
              </div>

              <button
                disabled={!selectedMatchId || loading}
                onClick={handleGenerateReport}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg shadow-blue-500/20 text-sm transition-all flex items-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>{loading ? 'Fetching Ball Data...' : 'Fetch Match & Ball Data'}</span>
              </button>
            </div>
          </div>

          {/* Player & Team Selection Controls (Shown after Data Fetched) */}
          {isDataFetched && selectedReportType !== 'vca-postmatch' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" /> 2. Report Target Selection
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Select Team */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Select Team
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-3 text-sm text-slate-100 focus:outline-none"
                  >
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Batter / Bowler */}
                {selectedReportType === 'vca-bowler' ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Select Bowler ({availableBowlers.length} Bowlers Available)
                    </label>
                    <select
                      value={selectedBowlerId}
                      onChange={(e) => setSelectedBowlerId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-3 text-sm text-slate-100 focus:outline-none"
                    >
                      {availableBowlers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.bwStyle})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Select Batter ({availableBatters.length} Players Available)
                    </label>
                    <select
                      value={selectedBatterId}
                      onChange={(e) => setSelectedBatterId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-3 text-sm text-slate-100 focus:outline-none"
                    >
                      {availableBatters.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.batStyle})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Bar & Export Options */}
          {isDataFetched && selectedReportType !== 'vca-postmatch' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Report Preview Ready</h3>
                <p className="text-xs text-slate-400">
                  Target Batter: <strong className="text-blue-400">{activeBatter.name}</strong> ({activeBatter.batStyle}) | {batterBalls.length} Balls Faced
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-lg border border-slate-700 text-sm transition-all"
                >
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>{showPreview ? 'Hide HTML Preview' : 'Show HTML Preview'}</span>
                </button>

                <button
                  disabled={downloading}
                  onClick={() => handleDownload('pdf')}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2.5 rounded-lg shadow-md shadow-rose-500/20 text-sm transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  disabled={downloading}
                  onClick={() => handleDownload('pptx')}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2.5 rounded-lg shadow-md shadow-amber-500/20 text-sm transition-all disabled:opacity-50"
                >
                  <Presentation className="w-4 h-4" />
                  <span>Download PPTX</span>
                </button>
              </div>
            </div>
          )}

          {/* HTML REPORT PREVIEW CONTAINER */}
          {showPreview && isDataFetched && (
            selectedReportType === 'vca-postmatch' ? (
              <MatchReport
                key={selectedMatchId}
                ballData={ballData}
                matchDetails={matchDetails}
              />
            ) : selectedReportType === 'vca-bowler' ? (
              <BowlerReport
                ballData={ballData}
                matchDetails={matchDetails}
                selectedTeamId={selectedTeamId}
                selectedBowlerId={selectedBowlerId}
                activeBowler={activeBowler}
                activeTeam={activeTeam}
                selectedTemplateId={selectedTemplateId}
                selectedReportType={selectedReportType}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              {/* Slide Navigation Tabs */}
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between gap-4">
                <div className="flex space-x-2 overflow-x-auto pb-2 max-w-[700px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 flex-nowrap shrink">
                  <button
                    onClick={() => setPreviewSlide(1)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === 1
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                  >
                    Slide 1: Cover Page
                  </button>
                  <button
                    onClick={() => setPreviewSlide(2)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === 2
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                  >
                    Slide 2: Batter Overview
                  </button>
                  <button
                    onClick={() => setPreviewSlide(3)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === 3
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                  >
                    Slide 3: Graphical Summary
                  </button>
                  <button
                    onClick={() => setPreviewSlide(4)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === 4
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                  >
                    Slide 4: Overall Graphics
                  </button>
                  <button
                    onClick={() => setPreviewSlide(5)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === 5
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                  >
                    Slide 5: Beaten / Uncomfortable / Dismissals
                  </button>
                  {phaseWiseStats.phases.map((p, pIdx) => {
                    const statsSlideNum = 6 + (pIdx * 2);
                    const gfxSlideNum = 6 + (pIdx * 2) + 1;
                    return (
                      <React.Fragment key={pIdx}>
                        <button
                          onClick={() => setPreviewSlide(statsSlideNum)}
                          className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === statsSlideNum
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                          Slide {statsSlideNum}: Phase ({p.phaseName}) Stats
                        </button>
                        <button
                          onClick={() => setPreviewSlide(gfxSlideNum)}
                          className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === gfxSlideNum
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                          Slide {gfxSlideNum}: Phase ({p.phaseName}) Graphics
                        </button>
                      </React.Fragment>
                    );
                  })}
                  {(() => {
                    const pCount = phaseWiseStats?.phases?.length || 0;
                    const cTableNum = 6 + (pCount * 2);
                    const cGfxNum = 6 + (pCount * 2) + 1;
                    return (
                      <>
                        <button
                          onClick={() => setPreviewSlide(cTableNum)}
                          className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === cTableNum
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                          Slide {cTableNum}: Comfort Level Report
                        </button>
                        <button
                          onClick={() => setPreviewSlide(cGfxNum)}
                          className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${previewSlide === cGfxNum
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                          Slide {cGfxNum}: Comfort Level Graphical
                        </button>
                      </>
                    );
                  })()}
                </div>

                <div className="text-xs text-slate-400 shrink-0">
                  Profile: <span className="font-semibold text-blue-400 uppercase">{selectedTemplateId}</span> | Report: <span className="font-semibold text-blue-400">{selectedReportType}</span>
                </div>
              </div>

              {/* Active Tab View Box */}
              <div className="w-full flex justify-center py-4 bg-slate-950 rounded-xl overflow-x-auto">
                {previewSlide === 1 && (
                  <div
                    id="slide-1-node"
                    className="relative w-[900px] h-[525px] rounded-lg shadow-2xl flex flex-col items-center justify-center p-12 overflow-hidden select-none"
                    style={{ backgroundColor: '#f6f4eb', color: '#1a1a1a', fontFamily: 'sans-serif' }}
                  >
                    {/* Top-Left Black L-Corner Frame */}
                    <div className="absolute top-8 left-8 w-48 h-36 border-t-[14px] border-l-[14px] border-slate-950 pointer-events-none" />

                    {/* Bottom-Right Black L-Corner Frame */}
                    <div className="absolute bottom-8 right-8 w-48 h-36 border-b-[14px] border-r-[14px] border-slate-950 pointer-events-none" />

                    {/* Main Content Group */}
                    <div className="text-center z-10 space-y-6 max-w-2xl px-6">
                      <h1 className="text-5xl font-extrabold tracking-wide uppercase text-slate-950">
                        {activeBatter.name}
                      </h1>

                      <div className="space-y-1.5 text-center">
                        <p className="text-lg font-bold italic uppercase tracking-wider text-slate-800">
                          {activeBatter.batStyle}
                        </p>
                        <p className="text-base font-bold italic uppercase tracking-wider text-slate-800">
                          {activeTeam.name}
                        </p>
                        <p className="text-base font-bold italic uppercase tracking-wider text-slate-800">
                          IN {matchDetails?.CompFullName || matchDetails?.CompPrefix || 'COMPETITION SEASON'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 2: BATTING STATS TABLE (Cream Theme, Left Stripe, Clean Table) */}
                {previewSlide === 2 && (
                  <div
                    id="slide-2-node"
                    className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg shadow-2xl p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    {/* Left Black Accent Stripe */}
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                    <div className="pl-6 flex-1 flex flex-col justify-between">
                      {/* Header Title */}
                      <div>
                        <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                          {slide2Title}
                        </h1>

                        <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                          <span className="text-slate-950 text-sm">■</span> BATTING STATS
                        </div>
                      </div>

                      {/* Player Summary Header Bar Above Table */}
                      <div className="w-full bg-slate-900 text-white px-5 py-3 rounded-t-lg border-b border-slate-700 flex justify-between items-center shadow-md">
                        <div>
                          <h2 className="text-base font-extrabold uppercase text-white tracking-wide">{activeBatter.name}</h2>
                          <p className="text-[11px] text-slate-400">Consolidated player summary</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-950/90 text-blue-300 border border-blue-600/50">
                            Inns {inningsWiseStats.total.innCount}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-600/50">
                            Runs {inningsWiseStats.total.runs}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/50">
                            Balls {inningsWiseStats.total.balls}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-950/90 text-purple-300 border border-purple-600/50">
                            AVG {inningsWiseStats.total.avg}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-600/50">
                            S/R {inningsWiseStats.total.str}
                          </span>
                        </div>
                      </div>

                      {/* Clean Innings Stats Table */}
                      <div className="flex-1 flex flex-col justify-start">
                        <div className="w-full overflow-hidden rounded-b-lg border-x border-b border-slate-300 shadow-sm">
                          <table className="w-full text-left border-collapse text-xs font-sans">
                            <thead>
                              <tr className="bg-slate-900 text-white uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-4 font-bold">Inning</th>
                                <th className="py-3 px-4 text-center font-bold">INNING</th>
                                <th className="py-3 px-4 text-center font-bold">RUNS</th>
                                <th className="py-3 px-4 text-center font-bold">BALLS</th>
                                <th className="py-3 px-4 text-center font-bold">N.O</th>
                                <th className="py-3 px-4 text-center font-bold">STR</th>
                                <th className="py-3 px-4 text-center font-bold">AVG</th>
                                <th className="py-3 px-4 text-center font-bold">50'S</th>
                                <th className="py-3 px-4 text-center font-bold">100'S</th>
                              </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-slate-200 text-slate-800 font-semibold">
                              {inningsWiseStats.rows.length === 0 ? (
                                <tr>
                                  <td colSpan="9" className="py-6 text-center text-slate-500 font-normal">
                                    No innings data recorded for {activeBatter.name}
                                  </td>
                                </tr>
                              ) : (
                                inningsWiseStats.rows.map((r, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3.5 px-4 font-bold text-slate-950">{r.label}</td>
                                    <td className="py-3.5 px-4 text-center">{r.innCount}</td>
                                    <td className="py-3.5 px-4 text-center">{r.runs}</td>
                                    <td className="py-3.5 px-4 text-center">{r.balls}</td>
                                    <td className="py-3.5 px-4 text-center">{r.no}</td>
                                    <td className="py-3.5 px-4 text-center">{r.str}</td>
                                    <td className="py-3.5 px-4 text-center">{r.avg}</td>
                                    <td className="py-3.5 px-4 text-center">{r.fifties}</td>
                                    <td className="py-3.5 px-4 text-center">{r.hundreds}</td>
                                  </tr>
                                ))
                              )}
                              {/* Total Summary Row */}
                              <tr className="bg-slate-100 font-extrabold text-slate-950 border-t-2 border-slate-400">
                                <td className="py-4 px-4 uppercase">{inningsWiseStats.total.label}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.innCount}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.runs}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.balls}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.no}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.str}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.avg}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.fifties}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.hundreds}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {previewSlide === 3 && (
                  <div
                    id="slide-3-node"
                    className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg shadow-2xl p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    {/* Left Black Accent Stripe */}
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                    <div className="pl-6 flex-1 flex flex-col justify-between">
                      {/* Header Title */}
                      <div>
                        <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                          {slide2Title}
                        </h1>

                        <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                          <span className="text-slate-950 text-sm">■</span> BATTING STATS GRAPHICAL REPRESENTATION
                        </div>
                      </div>

                      {/* Player Summary Header Bar Above Chart */}
                      <div className="w-full bg-slate-900 text-white px-5 py-3 rounded-t-lg border-b border-slate-700 flex justify-between items-center shadow-md">
                        <div>
                          <h2 className="text-base font-extrabold uppercase text-white tracking-wide">{activeBatter.name}</h2>
                          <p className="text-[11px] text-slate-400">Consolidated graphical summary</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-950/90 text-blue-300 border border-blue-600/50">
                            Inns {inningsWiseStats.total.innCount}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-600/50">
                            Runs {inningsWiseStats.total.runs}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/50">
                            Balls {inningsWiseStats.total.balls}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-950/90 text-purple-300 border border-purple-600/50">
                            AVG {inningsWiseStats.total.avg}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-600/50">
                            S/R {inningsWiseStats.total.str}
                          </span>
                        </div>
                      </div>

                      {/* Innings Wise Graphical Bar Chart Visualization */}
                      <div className="flex-1 bg-white rounded-b-lg border-x border-b border-slate-300 p-6 flex flex-col justify-between shadow-sm">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2">INNING WISE DATA</h3>

                        <div className="flex-1 flex items-end justify-center space-x-12 pb-4 pt-2 px-8 border-b border-dashed border-slate-300 relative">
                          {/* Y-Axis Value Indicators */}
                          <div className="absolute left-2 top-0 bottom-6 flex flex-col justify-between text-[10px] font-bold text-slate-400">
                            <span>50</span>
                            <span>40</span>
                            <span>30</span>
                            <span>20</span>
                            <span>10</span>
                            <span>0</span>
                          </div>

                          {inningsWiseStats.rows.length === 0 ? (
                            <div className="text-xs text-slate-500 py-8">No innings data recorded for chart</div>
                          ) : (
                            inningsWiseStats.rows.map((r, idx) => {
                              const runPx = Math.max(16, Math.min(130, Math.round((r.runs / 60) * 130)));
                              const avgVal = parseFloat(r.avg) || 0;
                              const avgPx = Math.max(16, Math.min(130, Math.round((avgVal / 60) * 130)));

                              return (
                                <div key={idx} className="flex flex-col items-center">
                                  <div className="flex items-end space-x-2 h-[140px]">
                                    {/* Runs Bar (Green) */}
                                    <div className="flex flex-col items-center justify-end h-full">
                                      <span className="text-[10px] font-extrabold text-slate-800 mb-1">{r.runs}</span>
                                      <div
                                        className="w-10 bg-lime-600 rounded-t-sm shadow-sm"
                                        style={{ height: `${runPx}px` }}
                                      />
                                    </div>

                                    {/* Avg Bar (Brown) */}
                                    <div className="flex flex-col items-center justify-end h-full">
                                      <span className="text-[10px] font-extrabold text-slate-800 mb-1">{r.avg}</span>
                                      <div
                                        className="w-10 bg-amber-600 rounded-t-sm shadow-sm"
                                        style={{ height: `${avgPx}px` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-slate-900 mt-2 uppercase">{r.label}</span>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Chart Legend */}
                        <div className="flex justify-center items-center space-x-6 pt-3 text-xs font-bold text-slate-700">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-lime-600 rounded-xs" />
                            <span>Runs</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-amber-600 rounded-xs" />
                            <span>Avg</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 4: OVERALL GRAPHICS (Wagon Wheel Region & Pitch Map SVGs) */}
                {previewSlide === 4 && (
                  <div
                    id="slide-4-node"
                    className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg shadow-2xl p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    {/* Left Black Accent Stripe */}
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                    <div className="pl-6 flex-1 flex flex-col justify-between">
                      {/* Header Title */}
                      <div>
                        <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                          {slide2Title}
                        </h1>

                        <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                          <span className="text-slate-950 text-sm">■</span> OVER ALL
                        </div>
                      </div>

                      {/* Side-by-Side Graphics Container */}
                      <div className="w-full h-[340px] bg-[#0a1324] rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3 relative overflow-hidden">
                        {graphicsData.loading ? (
                          <div className="w-full text-center text-xs text-blue-400 animate-pulse font-medium">Fetching Graphics SVGs from Cricket-21...</div>
                        ) : (
                          <>
                            {/* Wagon Wheel Region SVG */}
                            <div className="w-1/2 h-full flex items-center justify-center overflow-hidden">
                              {graphicsData.wwregionSvg ? (
                                <div
                                  className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                                  dangerouslySetInnerHTML={{ __html: graphicsData.wwregionSvg }}
                                />
                              ) : (
                                <div className="text-xs text-slate-500">No Wagon Wheel Region SVG data</div>
                              )}
                            </div>

                            {/* Pitch Map SVG */}
                            <div className="w-1/2 h-full flex items-center justify-center overflow-hidden border-l border-slate-800/80 pl-3">
                              {graphicsData.pitchmapSvg ? (
                                <div
                                  className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                                  dangerouslySetInnerHTML={{ __html: graphicsData.pitchmapSvg }}
                                />
                              ) : (
                                <div className="text-xs text-slate-500">No Pitch Map SVG data</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 5: BEATEN, UNCOMFORTABLE & DISMISSAL AREAS */}
                {previewSlide === 5 && (
                  <div
                    id="slide-5-node"
                    className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg shadow-2xl p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    {/* Left Black Accent Stripe */}
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                    <div className="pl-6 flex-1 flex flex-col justify-between">
                      {/* Header Title */}
                      <div>
                        <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                          {slide2Title}
                        </h1>

                        <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                          <span className="text-slate-950 text-sm">■</span> BEATEN , UNCOMFORTABLE & DISMISSAL AREAS
                        </div>
                      </div>

                      {/* Graphics Container */}
                      <div className="w-full h-[340px] bg-[#0a1324] rounded-xl p-3 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                        {graphicsData.loading ? (
                          <div className="w-full text-center text-xs text-blue-400 animate-pulse font-medium">Fetching Beaten Pitchmap SVG from Cricket-21...</div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            {graphicsData.beatenPitchmapSvg ? (
                              <div
                                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                                dangerouslySetInnerHTML={{ __html: graphicsData.beatenPitchmapSvg }}
                              />
                            ) : (
                              <div className="text-xs text-slate-500">No Beaten/Uncomfortable/Dismissal Pitch Map SVG data</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 6+: PHASE WISE STATS & GRAPHICS PAIRS */}
                {phaseWiseStats.phases.map((p, pIdx) => {
                  const statsSlideNum = 6 + (pIdx * 2);
                  const gfxSlideNum = 6 + (pIdx * 2) + 1;
                  const pGfx = graphicsData.phaseGraphicsMap[pIdx];

                  return (
                    <React.Fragment key={pIdx}>
                      {/* STATS TABLE SLIDE */}
                      {previewSlide === statsSlideNum && (
                        <div
                          id={`slide-6-node-${pIdx}`}
                          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg shadow-2xl p-8 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                          <div className="pl-6 flex-1 flex flex-col justify-between">
                            <div>
                              <h1 className="text-xl font-extrabold uppercase text-slate-950 tracking-tight">
                                {slide2Title}
                              </h1>

                              <div className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                                <span className="text-slate-950 text-xs">■</span> PHASE WISE – ( {p.phaseName} )
                              </div>
                            </div>

                            <div className="w-full bg-[#0a1b2a] rounded-xl p-4 text-white border border-slate-800 shadow-lg flex items-center gap-4">
                              <div className="flex flex-col items-center justify-center space-y-1">
                                <div className="w-14 h-14 rounded-full bg-slate-700/60 border-2 border-emerald-400 flex items-center justify-center text-slate-300">
                                  <User className="w-8 h-8" />
                                </div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-300 text-center max-w-[100px] truncate">
                                  {activeBatter.name}
                                </span>
                              </div>

                              <div className="flex-1 grid grid-cols-7 gap-2 text-center border-l border-slate-700/80 pl-4">
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Inns</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.inns}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Runs</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.runs}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Balls</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.balls}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Avg</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.avg}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">S/R</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.str}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">SB</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.sb}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Dots</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.dots}</span>
                                </div>

                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">1s</span>
                                  <span className="text-sm font-extrabold text-blue-300">{p.summary.ones}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">2s</span>
                                  <span className="text-sm font-extrabold text-blue-300">{p.summary.twos}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Fours</span>
                                  <span className="text-sm font-extrabold text-lime-400">{p.summary.fours}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Sixers</span>
                                  <span className="text-sm font-extrabold text-amber-400">{p.summary.sixes}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">30+</span>
                                  <span className="text-sm font-extrabold text-purple-300">{p.summary.thirtysPlus}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">50+</span>
                                  <span className="text-sm font-extrabold text-cyan-300">{p.summary.fiftysPlus}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">100+</span>
                                  <span className="text-sm font-extrabold text-emerald-400">{p.summary.hundredsPlus}</span>
                                </div>
                              </div>
                            </div>

                            <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-[#071320] shadow-md mt-3">
                              <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                                <thead>
                                  <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                                    <th className="py-2.5 px-3 font-bold">Match</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Inns</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Runs</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Balls</th>
                                    <th className="py-2.5 px-2 text-center font-bold">S/R</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Dots</th>
                                    <th className="py-2.5 px-2 text-center font-bold">1s</th>
                                    <th className="py-2.5 px-2 text-center font-bold">2s</th>
                                    <th className="py-2.5 px-2 text-center font-bold">3s</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Fours</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Sixers</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80 font-semibold">
                                  {p.matchRows.map((m, mIdx) => (
                                    <tr key={mIdx} className="hover:bg-slate-800/40 transition-colors">
                                      <td className="py-2.5 px-3 text-cyan-300 font-bold">
                                        {m.matchName}
                                      </td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.innCount}</td>
                                      <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{m.runs}</td>
                                      <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{m.balls}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.str}</td>
                                      <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{m.dots}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.ones}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.twos}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.threes}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.fours}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.sixes}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GRAPHICS SLIDE */}
                      {previewSlide === gfxSlideNum && (
                        <div
                          id={`slide-6-gfx-node-${pIdx}`}
                          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg shadow-2xl p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                          <div className="pl-6 flex-1 flex flex-col justify-between">
                            <div>
                              <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                                {slide2Title}
                              </h1>

                              <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                                <span className="text-slate-950 text-sm">■</span> PHASE WISE – ( {p.phaseName} )
                              </div>
                            </div>

                            <div className="w-full h-[340px] bg-[#0a1324] rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3 relative overflow-hidden">
                              {graphicsData.loading ? (
                                <div className="w-full text-center text-xs text-blue-400 animate-pulse font-medium">Fetching Phase Graphics SVGs from Cricket-21...</div>
                              ) : (
                                <>
                                  <div className="w-1/2 h-full flex items-center justify-center overflow-hidden">
                                    {pGfx?.wwregionSvg ? (
                                      <div
                                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                                        dangerouslySetInnerHTML={{ __html: pGfx.wwregionSvg }}
                                      />
                                    ) : (
                                      <div className="text-xs text-slate-500">No Wagon Wheel Region SVG data</div>
                                    )}
                                  </div>

                                  <div className="w-1/2 h-full flex items-center justify-center overflow-hidden border-l border-slate-800/80 pl-3">
                                    {pGfx?.pitchmapSvg ? (
                                      <div
                                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                                        dangerouslySetInnerHTML={{ __html: pGfx.pitchmapSvg }}
                                      />
                                    ) : (
                                      <div className="text-xs text-slate-500">No Pitch Map SVG data</div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* SLIDE 7: COMFORT LEVEL REPORT (Table View) */}
                {(() => {
                  const pCount = phaseWiseStats?.phases?.length || 0;
                  const cTableNum = 6 + (pCount * 2);
                  const cGfxNum = 6 + (pCount * 2) + 1;

                  return (
                    <>
                      {previewSlide === cTableNum && (
                        <div
                          id="slide-comfort-node"
                          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg shadow-2xl p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                          <div className="pl-6 flex-1 flex flex-col justify-between">
                            <div>
                              <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                                {slide2Title}
                              </h1>

                              <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                                <span className="text-slate-950 text-sm">■</span> COMFORT LEVEL REPORT
                              </div>
                            </div>

                            <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                              <div>
                                <div className="text-xs font-extrabold uppercase text-white tracking-wider">COMFORT LEVEL</div>
                                <div className="text-[10px] text-cyan-400/80 mb-3">Player-wise batting comfort level against bowling type</div>

                                {/* Summary Header Banner */}
                                <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-extrabold text-white uppercase">{activeBatter.name}</div>
                                    <div className="text-[10px] text-slate-400">Filtered batting comfort summary</div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                                      Runs {comfortLevelStats.total.runs}
                                    </span>
                                    <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                                      WKT {comfortLevelStats.total.wkt}
                                    </span>
                                    <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                                      STR {comfortLevelStats.total.str}
                                    </span>
                                    <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                                      AVG {comfortLevelStats.total.avg}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-xs font-bold text-white uppercase mb-2">COMFORT LEVEL AGAINST BOWLING TYPE</div>

                                {/* Table */}
                                <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-[#0b1726]">
                                  <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                                    <thead>
                                      <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                                        <th className="py-2.5 px-4 font-bold">TYPE</th>
                                        <th className="py-2.5 px-3 text-center font-bold">OVERS</th>
                                        <th className="py-2.5 px-3 text-center font-bold">RUNS</th>
                                        <th className="py-2.5 px-3 text-center font-bold">WKT</th>
                                        <th className="py-2.5 px-3 text-center font-bold">STR</th>
                                        <th className="py-2.5 px-3 text-center font-bold">AVG</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/80 font-semibold">
                                      {comfortLevelStats.rows.map((r, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2.5 px-4 text-cyan-300 font-bold">{r.type}</td>
                                          <td className="py-2.5 px-3 text-center text-slate-300">{r.overs}</td>
                                          <td className="py-2.5 px-3 text-center text-cyan-300 font-extrabold">{r.runs}</td>
                                          <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{r.wkt}</td>
                                          <td className="py-2.5 px-3 text-center text-slate-300">{r.str}</td>
                                          <td className="py-2.5 px-3 text-center text-slate-300">{r.avg}</td>
                                        </tr>
                                      ))}
                                      {/* Total Row */}
                                      <tr className="bg-[#0f2438] text-white font-extrabold border-t-2 border-slate-700">
                                        <td className="py-2.5 px-4">Total</td>
                                        <td className="py-2.5 px-3 text-center">{comfortLevelStats.total.overs}</td>
                                        <td className="py-2.5 px-3 text-center text-cyan-300">{comfortLevelStats.total.runs}</td>
                                        <td className="py-2.5 px-3 text-center text-emerald-400">{comfortLevelStats.total.wkt}</td>
                                        <td className="py-2.5 px-3 text-center">{comfortLevelStats.total.str}</td>
                                        <td className="py-2.5 px-3 text-center">{comfortLevelStats.total.avg}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SLIDE 8: COMFORT LEVEL REPORT - GRAPHICAL */}
                      {previewSlide === cGfxNum && (
                        <div
                          id="slide-comfort-gfx-node"
                          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg shadow-2xl p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                          <div className="pl-6 flex-1 flex flex-col justify-between">
                            <div>
                              <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                                {slide2Title}
                              </h1>

                              <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                                <span className="text-slate-950 text-sm">■</span> COMFORT LEVEL REPORT - GRAPHICAL
                              </div>
                            </div>

                            <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                              <div>
                                <div className="text-xs font-extrabold uppercase text-white tracking-wider">COMFORT LEVEL</div>
                                <div className="text-[10px] text-cyan-400/80 mb-3">Graphical comfort level against bowling type</div>

                                {/* Summary Header Banner */}
                                <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-extrabold text-white uppercase">{activeBatter.name}</div>
                                    <div className="text-[10px] text-slate-400">Graphical comfort level summary</div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                                      Runs {comfortLevelStats.total.runs}
                                    </span>
                                    <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                                      WKT {comfortLevelStats.total.wkt}
                                    </span>
                                    <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                                      STR {comfortLevelStats.total.str}
                                    </span>
                                    <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                                      AVG {comfortLevelStats.total.avg}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-xs font-bold text-white uppercase mb-2">COMFORT LEVEL</div>

                                {/* Bar Chart Container */}
                                <div className="w-full bg-[#0b1726] border border-slate-800 rounded-lg p-3 flex justify-center">
                                  {renderComfortBarChart(comfortLevelStats.rows)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Offscreen containers for html-to-image capture when not currently active in tab */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                {previewSlide !== 1 && (
                  <div
                    id="slide-1-node"
                    className="relative w-[900px] h-[525px] rounded-lg flex flex-col items-center justify-center p-12 overflow-hidden select-none"
                    style={{ backgroundColor: '#f6f4eb', color: '#1a1a1a', fontFamily: 'sans-serif' }}
                  >
                    <div className="absolute top-8 left-8 w-48 h-36 border-t-[14px] border-l-[14px] border-slate-950 pointer-events-none" />
                    <div className="absolute bottom-8 right-8 w-48 h-36 border-b-[14px] border-r-[14px] border-slate-950 pointer-events-none" />
                    <div className="text-center z-10 space-y-6 max-w-2xl px-6">
                      <h1 className="text-5xl font-extrabold tracking-wide uppercase text-slate-950">
                        {activeBatter.name}
                      </h1>
                      <div className="space-y-1.5 text-center">
                        <p className="text-lg font-bold italic uppercase tracking-wider text-slate-800">
                          {activeBatter.batStyle}
                        </p>
                        <p className="text-base font-bold italic uppercase tracking-wider text-slate-800">
                          {activeTeam.name}
                        </p>
                        <p className="text-base font-bold italic uppercase tracking-wider text-slate-800">
                          IN {matchDetails?.CompFullName || matchDetails?.CompPrefix || 'COMPETITION SEASON'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {previewSlide !== 2 && (
                  <div
                    id="slide-2-node"
                    className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />
                    <div className="pl-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                          {slide2Title}
                        </h1>
                        <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                          <span className="text-slate-950 text-sm">■</span> BATTING STATS
                        </div>
                      </div>

                      {/* Player Summary Header Bar Above Table */}
                      <div className="w-full bg-slate-900 text-white px-5 py-3 rounded-t-lg border-b border-slate-700 flex justify-between items-center shadow-md">
                        <div>
                          <h2 className="text-base font-extrabold uppercase text-white tracking-wide">{activeBatter.name}</h2>
                          <p className="text-[11px] text-slate-400">Consolidated player summary</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-950/90 text-blue-300 border border-blue-600/50">
                            Inns {inningsWiseStats.total.innCount}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-600/50">
                            Runs {inningsWiseStats.total.runs}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/50">
                            Balls {inningsWiseStats.total.balls}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-950/90 text-purple-300 border border-purple-600/50">
                            AVG {inningsWiseStats.total.avg}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-600/50">
                            S/R {inningsWiseStats.total.str}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-start">
                        <div className="w-full overflow-hidden rounded-b-lg border-x border-b border-slate-300 shadow-sm">
                          <table className="w-full text-left border-collapse text-xs font-sans">
                            <thead>
                              <tr className="bg-slate-900 text-white uppercase tracking-wider text-[11px]">
                                <th className="py-3 px-4 font-bold">Inning</th>
                                <th className="py-3 px-4 text-center font-bold">INNING</th>
                                <th className="py-3 px-4 text-center font-bold">RUNS</th>
                                <th className="py-3 px-4 text-center font-bold">BALLS</th>
                                <th className="py-3 px-4 text-center font-bold">N.O</th>
                                <th className="py-3 px-4 text-center font-bold">STR</th>
                                <th className="py-3 px-4 text-center font-bold">AVG</th>
                                <th className="py-3 px-4 text-center font-bold">50'S</th>
                                <th className="py-3 px-4 text-center font-bold">100'S</th>
                              </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-slate-200 text-slate-800 font-semibold">
                              {inningsWiseStats.rows.length === 0 ? (
                                <tr>
                                  <td colSpan="9" className="py-6 text-center text-slate-500 font-normal">
                                    No innings data recorded for {activeBatter.name}
                                  </td>
                                </tr>
                              ) : (
                                inningsWiseStats.rows.map((r, idx) => (
                                  <tr key={idx}>
                                    <td className="py-3.5 px-4 font-bold text-slate-950">{r.label}</td>
                                    <td className="py-3.5 px-4 text-center">{r.innCount}</td>
                                    <td className="py-3.5 px-4 text-center">{r.runs}</td>
                                    <td className="py-3.5 px-4 text-center">{r.balls}</td>
                                    <td className="py-3.5 px-4 text-center">{r.no}</td>
                                    <td className="py-3.5 px-4 text-center">{r.str}</td>
                                    <td className="py-3.5 px-4 text-center">{r.avg}</td>
                                    <td className="py-3.5 px-4 text-center">{r.fifties}</td>
                                    <td className="py-3.5 px-4 text-center">{r.hundreds}</td>
                                  </tr>
                                ))
                              )}
                              <tr className="bg-slate-100 font-extrabold text-slate-950 border-t-2 border-slate-400">
                                <td className="py-4 px-4 uppercase">{inningsWiseStats.total.label}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.innCount}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.runs}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.balls}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.no}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.str}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.avg}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.fifties}</td>
                                <td className="py-4 px-4 text-center">{inningsWiseStats.total.hundreds}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {previewSlide !== 3 && (
                  <div
                    id="slide-3-node"
                    className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />
                    <div className="pl-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                          {slide2Title}
                        </h1>

                        <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                          <span className="text-slate-950 text-sm">■</span> BATTING STATS GRAPHICAL REPRESENTATION
                        </div>
                      </div>

                      {/* Player Summary Header Bar Above Chart */}
                      <div className="w-full bg-slate-900 text-white px-5 py-3 rounded-t-lg border-b border-slate-700 flex justify-between items-center shadow-md">
                        <div>
                          <h2 className="text-base font-extrabold uppercase text-white tracking-wide">{activeBatter.name}</h2>
                          <p className="text-[11px] text-slate-400">Consolidated graphical summary</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-950/90 text-blue-300 border border-blue-600/50">
                            Inns {inningsWiseStats.total.innCount}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-600/50">
                            Runs {inningsWiseStats.total.runs}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/50">
                            Balls {inningsWiseStats.total.balls}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-950/90 text-purple-300 border border-purple-600/50">
                            AVG {inningsWiseStats.total.avg}
                          </span>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-600/50">
                            S/R {inningsWiseStats.total.str}
                          </span>
                        </div>
                      </div>

                      {/* Innings Wise Graphical Bar Chart Visualization */}
                      <div className="flex-1 bg-white rounded-b-lg border-x border-b border-slate-300 p-6 flex flex-col justify-between shadow-sm">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2">INNING WISE DATA</h3>

                        <div className="flex-1 flex items-end justify-center space-x-12 pb-4 pt-2 px-8 border-b border-dashed border-slate-300 relative">
                          <div className="absolute left-2 top-0 bottom-6 flex flex-col justify-between text-[10px] font-bold text-slate-400">
                            <span>50</span>
                            <span>40</span>
                            <span>30</span>
                            <span>20</span>
                            <span>10</span>
                            <span>0</span>
                          </div>

                          {inningsWiseStats.rows.length === 0 ? (
                            <div className="text-xs text-slate-500 py-8">No innings data recorded for chart</div>
                          ) : (
                            inningsWiseStats.rows.map((r, idx) => {
                              const runPx = Math.max(16, Math.min(130, Math.round((r.runs / 60) * 130)));
                              const avgVal = parseFloat(r.avg) || 0;
                              const avgPx = Math.max(16, Math.min(130, Math.round((avgVal / 60) * 130)));

                              return (
                                <div key={idx} className="flex flex-col items-center">
                                  <div className="flex items-end space-x-2 h-[140px]">
                                    <div className="flex flex-col items-center justify-end h-full">
                                      <span className="text-[10px] font-extrabold text-slate-800 mb-1">{r.runs}</span>
                                      <div
                                        className="w-10 bg-lime-600 rounded-t-sm shadow-sm"
                                        style={{ height: `${runPx}px` }}
                                      />
                                    </div>
                                    <div className="flex flex-col items-center justify-end h-full">
                                      <span className="text-[10px] font-extrabold text-slate-800 mb-1">{r.avg}</span>
                                      <div
                                        className="w-10 bg-amber-600 rounded-t-sm shadow-sm"
                                        style={{ height: `${avgPx}px` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-slate-900 mt-2 uppercase">{r.label}</span>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="flex justify-center items-center space-x-6 pt-3 text-xs font-bold text-slate-700">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-lime-600 rounded-xs" />
                            <span>Runs</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-amber-600 rounded-xs" />
                            <span>Avg</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </div>

              {/* Offscreen containers for html-to-image capture when not currently active in tab */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                {previewSlide !== 4 && (
                  <div
                    id="slide-4-node"
                    className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />
                    <div className="pl-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                          {slide2Title}
                        </h1>

                        <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                          <span className="text-slate-950 text-sm">■</span> OVER ALL
                        </div>
                      </div>

                      <div className="w-full h-[340px] bg-[#0a1324] rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3 relative overflow-hidden">
                        <div className="w-1/2 h-full flex items-center justify-center overflow-hidden">
                          {graphicsData.wwregionSvg ? (
                            <div
                              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                              dangerouslySetInnerHTML={{ __html: graphicsData.wwregionSvg }}
                            />
                          ) : (
                            <div className="text-xs text-slate-500">No Wagon Wheel Region SVG data</div>
                          )}
                        </div>

                        <div className="w-1/2 h-full flex items-center justify-center overflow-hidden border-l border-slate-800/80 pl-3">
                          {graphicsData.pitchmapSvg ? (
                            <div
                              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                              dangerouslySetInnerHTML={{ __html: graphicsData.pitchmapSvg }}
                            />
                          ) : (
                            <div className="text-xs text-slate-500">No Pitch Map SVG data</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {previewSlide !== 5 && (
                  <div
                    id="slide-5-node"
                    className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />
                    <div className="pl-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                          {slide2Title}
                        </h1>

                        <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                          <span className="text-slate-950 text-sm">■</span> BEATEN , UNCOMFORTABLE & DISMISSAL AREAS
                        </div>
                      </div>

                      <div className="w-full h-[340px] bg-[#0a1324] rounded-xl p-3 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                          {graphicsData.beatenPitchmapSvg ? (
                            <div
                              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                              dangerouslySetInnerHTML={{ __html: graphicsData.beatenPitchmapSvg }}
                            />
                          ) : (
                            <div className="text-xs text-slate-500">No Beaten/Uncomfortable/Dismissal Pitch Map SVG data</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {phaseWiseStats && phaseWiseStats.phases && phaseWiseStats.phases.map((p, pIdx) => {
                  const statsSlideNum = 6 + (pIdx * 2);
                  const gfxSlideNum = 6 + (pIdx * 2) + 1;
                  const pGfx = graphicsData.phaseGraphicsMap[pIdx];

                  return (
                    <React.Fragment key={pIdx}>
                      {previewSlide !== statsSlideNum && (
                        <div
                          id={`slide-6-node-${pIdx}`}
                          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-8 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                          <div className="pl-6 flex-1 flex flex-col justify-between">
                            <div>
                              <h1 className="text-xl font-extrabold uppercase text-slate-950 tracking-tight">
                                {slide2Title}
                              </h1>

                              <div className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-2 mb-3">
                                <span className="text-slate-950 text-xs">■</span> PHASE WISE – ( {p.phaseName} )
                              </div>
                            </div>

                            <div className="w-full bg-[#0a1b2a] rounded-xl p-4 text-white border border-slate-800 shadow-lg flex items-center gap-4">
                              <div className="flex flex-col items-center justify-center space-y-1">
                                <div className="w-14 h-14 rounded-full bg-slate-700/60 border-2 border-emerald-400 flex items-center justify-center text-slate-300">
                                  <User className="w-8 h-8" />
                                </div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-300 text-center max-w-[100px] truncate">
                                  {activeBatter.name}
                                </span>
                              </div>

                              <div className="flex-1 grid grid-cols-7 gap-2 text-center border-l border-slate-700/80 pl-4">
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Inns</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.inns}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Runs</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.runs}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Balls</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.balls}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Avg</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.avg}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">S/R</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.str}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">SB</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.sb}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Dots</span>
                                  <span className="text-base font-extrabold text-white">{p.summary.dots}</span>
                                </div>

                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">1s</span>
                                  <span className="text-sm font-extrabold text-blue-300">{p.summary.ones}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">2s</span>
                                  <span className="text-sm font-extrabold text-blue-300">{p.summary.twos}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Fours</span>
                                  <span className="text-sm font-extrabold text-lime-400">{p.summary.fours}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Sixers</span>
                                  <span className="text-sm font-extrabold text-amber-400">{p.summary.sixes}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">30+</span>
                                  <span className="text-sm font-extrabold text-purple-300">{p.summary.thirtysPlus}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">50+</span>
                                  <span className="text-sm font-extrabold text-cyan-300">{p.summary.fiftysPlus}</span>
                                </div>
                                <div className="flex flex-col items-center pt-1 border-t border-slate-800">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">100+</span>
                                  <span className="text-sm font-extrabold text-emerald-400">{p.summary.hundredsPlus}</span>
                                </div>
                              </div>
                            </div>

                            <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-[#071320] shadow-md mt-3">
                              <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                                <thead>
                                  <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                                    <th className="py-2.5 px-3 font-bold">Match</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Inns</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Runs</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Balls</th>
                                    <th className="py-2.5 px-2 text-center font-bold">S/R</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Dots</th>
                                    <th className="py-2.5 px-2 text-center font-bold">1s</th>
                                    <th className="py-2.5 px-2 text-center font-bold">2s</th>
                                    <th className="py-2.5 px-2 text-center font-bold">3s</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Fours</th>
                                    <th className="py-2.5 px-2 text-center font-bold">Sixers</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80 font-semibold">
                                  {p.matchRows.map((m, mIdx) => (
                                    <tr key={mIdx} className="hover:bg-slate-800/40 transition-colors">
                                      <td className="py-2.5 px-3 text-cyan-300 font-bold">
                                        {m.matchName}
                                      </td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.innCount}</td>
                                      <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{m.runs}</td>
                                      <td className="py-2.5 px-2 text-center text-cyan-300 font-extrabold">{m.balls}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.str}</td>
                                      <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{m.dots}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.ones}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.twos}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.threes}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.fours}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-300">{m.sixes}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {previewSlide !== gfxSlideNum && (
                        <div
                          id={`slide-6-gfx-node-${pIdx}`}
                          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                          <div className="pl-6 flex-1 flex flex-col justify-between">
                            <div>
                              <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                                {slide2Title}
                              </h1>

                              <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                                <span className="text-slate-950 text-sm">■</span> PHASE WISE – ( {p.phaseName} )
                              </div>
                            </div>

                            <div className="w-full h-[340px] bg-[#0a1324] rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3 relative overflow-hidden">
                              <div className="w-1/2 h-full flex items-center justify-center overflow-hidden">
                                {pGfx?.wwregionSvg ? (
                                  <div
                                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                                    dangerouslySetInnerHTML={{ __html: pGfx.wwregionSvg }}
                                  />
                                ) : (
                                  <div className="text-xs text-slate-500">No Wagon Wheel Region SVG data</div>
                                )}
                              </div>

                              <div className="w-1/2 h-full flex items-center justify-center overflow-hidden border-l border-slate-800/80 pl-3">
                                {pGfx?.pitchmapSvg ? (
                                  <div
                                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[320px] [&>svg]:object-contain"
                                    dangerouslySetInnerHTML={{ __html: pGfx.pitchmapSvg }}
                                  />
                                ) : (
                                  <div className="text-xs text-slate-500">No Pitch Map SVG data</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* OFFSCREEN HIDDEN NODES FOR SLIDE 7 & SLIDE 8 (PDF Export) */}
                {(() => {
                  const pCount = phaseWiseStats?.phases?.length || 0;
                  const cTableNum = 6 + (pCount * 2);
                  const cGfxNum = 6 + (pCount * 2) + 1;

                  return (
                    <>
                      {previewSlide !== cTableNum && (
                        <div
                          id="slide-comfort-node"
                          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                          <div className="pl-6 flex-1 flex flex-col justify-between">
                            <div>
                              <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                                {slide2Title}
                              </h1>

                              <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                                <span className="text-slate-950 text-sm">■</span> COMFORT LEVEL REPORT
                              </div>
                            </div>

                            <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                              <div>
                                <div className="text-xs font-extrabold uppercase text-white tracking-wider">COMFORT LEVEL</div>
                                <div className="text-[10px] text-cyan-400/80 mb-3">Player-wise batting comfort level against bowling type</div>

                                <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-extrabold text-white uppercase">{activeBatter.name}</div>
                                    <div className="text-[10px] text-slate-400">Filtered batting comfort summary</div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                                      Runs {comfortLevelStats.total.runs}
                                    </span>
                                    <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                                      WKT {comfortLevelStats.total.wkt}
                                    </span>
                                    <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                                      STR {comfortLevelStats.total.str}
                                    </span>
                                    <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                                      AVG {comfortLevelStats.total.avg}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-xs font-bold text-white uppercase mb-2">COMFORT LEVEL AGAINST BOWLING TYPE</div>

                                <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-[#0b1726]">
                                  <table className="w-full text-left border-collapse text-[11px] font-sans text-slate-200">
                                    <thead>
                                      <tr className="bg-[#0f2438] text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                                        <th className="py-2.5 px-4 font-bold">TYPE</th>
                                        <th className="py-2.5 px-3 text-center font-bold">OVERS</th>
                                        <th className="py-2.5 px-3 text-center font-bold">RUNS</th>
                                        <th className="py-2.5 px-3 text-center font-bold">WKT</th>
                                        <th className="py-2.5 px-3 text-center font-bold">STR</th>
                                        <th className="py-2.5 px-3 text-center font-bold">AVG</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/80 font-semibold">
                                      {comfortLevelStats.rows.map((r, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2.5 px-4 text-cyan-300 font-bold">{r.type}</td>
                                          <td className="py-2.5 px-3 text-center text-slate-300">{r.overs}</td>
                                          <td className="py-2.5 px-3 text-center text-cyan-300 font-extrabold">{r.runs}</td>
                                          <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{r.wkt}</td>
                                          <td className="py-2.5 px-3 text-center text-slate-300">{r.str}</td>
                                          <td className="py-2.5 px-3 text-center text-slate-300">{r.avg}</td>
                                        </tr>
                                      ))}
                                      <tr className="bg-[#0f2438] text-white font-extrabold border-t-2 border-slate-700">
                                        <td className="py-2.5 px-4">Total</td>
                                        <td className="py-2.5 px-3 text-center">{comfortLevelStats.total.overs}</td>
                                        <td className="py-2.5 px-3 text-center text-cyan-300">{comfortLevelStats.total.runs}</td>
                                        <td className="py-2.5 px-3 text-center text-emerald-400">{comfortLevelStats.total.wkt}</td>
                                        <td className="py-2.5 px-3 text-center">{comfortLevelStats.total.str}</td>
                                        <td className="py-2.5 px-3 text-center">{comfortLevelStats.total.avg}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {previewSlide !== cGfxNum && (
                        <div
                          id="slide-comfort-gfx-node"
                          className="relative w-[900px] h-[525px] bg-[#f6f4eb] rounded-lg p-10 overflow-hidden flex flex-col justify-between border border-slate-300 text-slate-900 select-none"
                          style={{ fontFamily: 'sans-serif' }}
                        >
                          <div className="absolute top-0 left-0 w-[20px] h-full bg-[#0f172a] pointer-events-none" />

                          <div className="pl-6 flex-1 flex flex-col justify-between">
                            <div>
                              <h1 className="text-2xl font-extrabold uppercase text-slate-950 tracking-tight">
                                {slide2Title}
                              </h1>

                              <div className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mt-3 mb-4">
                                <span className="text-slate-950 text-sm">■</span> COMFORT LEVEL REPORT - GRAPHICAL
                              </div>
                            </div>

                            <div className="w-full bg-[#071320] border border-slate-800 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
                              <div>
                                <div className="text-xs font-extrabold uppercase text-white tracking-wider">COMFORT LEVEL</div>
                                <div className="text-[10px] text-cyan-400/80 mb-3">Graphical comfort level against bowling type</div>

                                <div className="w-full bg-[#0d1d2e] border border-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-extrabold text-white uppercase">{activeBatter.name}</div>
                                    <div className="text-[10px] text-slate-400">Graphical comfort level summary</div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs px-3 py-1 rounded-full font-bold">
                                      Runs {comfortLevelStats.total.runs}
                                    </span>
                                    <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
                                      WKT {comfortLevelStats.total.wkt}
                                    </span>
                                    <span className="bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs px-3 py-1 rounded-full font-bold">
                                      STR {comfortLevelStats.total.str}
                                    </span>
                                    <span className="bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold">
                                      AVG {comfortLevelStats.total.avg}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-xs font-bold text-white uppercase mb-2">COMFORT LEVEL</div>

                                <div className="w-full bg-[#0b1726] border border-slate-800 rounded-lg p-3 flex justify-center">
                                  {renderComfortBarChart(comfortLevelStats.rows)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

            </div>
          )
        )}
      </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 4: TOURNAMENT REPORTS */}
      {/* ------------------------------------------------------------- */}
      {currentPage === 'tournament_reports' && (
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6 flex flex-col justify-center">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex items-center text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Categories
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
              <Layers className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Tournament Reports Studio</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Tournament analytics & series leaderboards are ready for aggregation. Select your competition above to build match-level reports!
            </p>
            <button
              onClick={() => setCurrentPage('match_reports')}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg shadow-amber-500/20 text-sm transition-all"
            >
              Go to Match Reports Studio
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
