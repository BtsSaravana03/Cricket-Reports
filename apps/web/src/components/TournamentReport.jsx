import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Activity, CheckCircle2 } from 'lucide-react';
import { SlideView } from './match-report/slides';
import { buildTournamentModel } from './tournament-report/tournamentStats';
import { buildTournamentSlides } from './tournament-report/tournamentSlides';
import SlideDeck from './report-kit/SlideDeck';

const API_BASE = '/api';

// Tournament Reports studio: pick a competition and a team, load every match of that team, and
// build the post-tournament highlights deck.
export default function TournamentReport() {
  const [competitions, setCompetitions] = useState([]);
  const [competitionId, setCompetitionId] = useState('');
  const [matches, setMatches] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(null); // { done, total }
  const [data, setData] = useState(null);       // [{ details, balls }]
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/getCompetitions`)
      .then((res) => setCompetitions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Could not load competitions.'));
  }, []);

  const handleCompetition = async (id) => {
    setCompetitionId(id);
    setTeamId('');
    setMatches([]);
    setData(null);
    if (!id) return;
    try {
      const res = await axios.get(`${API_BASE}/getMatches/${id}`);
      setMatches(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError('Could not load matches for this competition.');
    }
  };

  // Teams = every club that appears in the competition's matches (names resolved per match)
  const [teams, setTeams] = useState([]);
  useEffect(() => {
    if (!matches.length) { setTeams([]); return; }
    // getMatches returns names only, so resolve club ids from the first match details of each pair
    let cancelled = false;
    (async () => {
      const found = new Map();
      for (const m of matches) {
        if (found.size && [m.ClubA, m.ClubB].every((n) => [...found.values()].includes(n))) continue;
        try {
          const res = await axios.get(`${API_BASE}/getMatchDetails/${m.ID}`);
          const d = res.data?.[0];
          if (d) {
            found.set(String(d.ClubAId), d.ClubAFull);
            found.set(String(d.ClubBId), d.ClubBFull);
          }
        } catch (e) { /* skip */ }
        if (cancelled) return;
      }
      if (!cancelled) setTeams([...found.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
    })();
    return () => { cancelled = true; };
  }, [matches]);

  const teamName = teams.find((t) => t.id === teamId)?.name || '';
  const teamMatches = matches.filter((m) => m.ClubA === teamName || m.ClubB === teamName);

  const handleFetch = async () => {
    setError('');
    setData(null);
    setLoading({ done: 0, total: teamMatches.length });
    try {
      const out = [];
      for (const m of teamMatches) {
        const [details, balls] = await Promise.all([
          axios.get(`${API_BASE}/getMatchDetails/${m.ID}`).then((r) => r.data?.[0]),
          axios.get(`${API_BASE}/ballbyball/${m.ID}`).then((r) => r.data?.data || [])
        ]);
        if (details) out.push({ details, balls });
        setLoading({ done: out.length, total: teamMatches.length });
      }
      setData(out);
    } catch (e) {
      console.error('Tournament fetch error:', e);
      setError('Could not load the match data.');
    } finally {
      setLoading(null);
    }
  };

  const competition = competitions.find((c) => String(c.ID) === String(competitionId));
  const model = useMemo(() => (data ? buildTournamentModel(data, teamId) : null), [data, teamId]);
  const slides = useMemo(
    () => (model ? buildTournamentSlides(model, { competition: competition?.Name || '', season: competition?.Season || '' }) : []),
    [model, competition]
  );
  const footer = `${model?.teamName || ''} · ${competition?.Name || ''}`;

  const selectClass = 'w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none';
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <h3 className="text-base font-bold text-white">1. Select Competition & Team</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Competition</label>
            <select value={competitionId} onChange={(e) => handleCompetition(e.target.value)} className={selectClass}>
              <option value="">-- Choose Competition --</option>
              {competitions.map((c) => <option key={c.ID} value={c.ID}>{c.Name} ({c.Season})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Team</label>
            <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setData(null); }} className={selectClass} disabled={!teams.length}>
              <option value="">{competitionId && !teams.length ? 'Loading teams…' : '-- Choose Team --'}</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Report Type</label>
            <select className={selectClass} value="highlights" onChange={() => {}}>
              <option value="highlights">VCA Tournament Highlights</option>
            </select>
          </div>
        </div>
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {error && <span className="text-rose-400">{error}</span>}
            {!error && data && (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Loaded {data.length} matches ({data.filter((d) => d.balls.length).length} with ball-by-ball data)
              </span>
            )}
            {!error && !data && teamId && <span>{teamMatches.length} matches for {teamName}</span>}
          </div>
          <button
            disabled={!teamId || !teamMatches.length || !!loading}
            onClick={handleFetch}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg shadow-blue-500/20 text-sm transition-all flex items-center space-x-2"
          >
            <Activity className="w-4 h-4" />
            <span>{loading ? `Loading matches ${loading.done}/${loading.total}…` : 'Fetch Tournament Data'}</span>
          </button>
        </div>
      </div>

      {model && slides.length > 0 && (
        <SlideDeck
          title="Tournament Highlights Preview"
          highlight={`${model.teamName} · ${competition?.Name || ''}`}
          subtitle={`${model.totalMatches} matches | ${model.matchesWithData} with ball-by-ball data | ${slides.length} slides`}
          slides={slides}
          fileName={`TournamentHighlights_${model.teamName}_${competition?.Name || ''}`.replace(/[^a-zA-Z0-9_]/g, '_')}
          renderSlide={(slide, id) => <SlideView slide={slide} graphics={{}} footer={footer} id={id} />}
        />
      )}
    </div>
  );
}
