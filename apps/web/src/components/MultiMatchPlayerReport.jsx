import React, { useMemo } from 'react';
import { SlideView } from './match-report/slides';
import { buildPlayerModel } from './player-report/playerStats';
import { buildPlayerSlides } from './player-report/playerSlides';
import SlideDeck from './report-kit/SlideDeck';
import { useGraphicsLoader } from './report-kit/graphics';

// Batter / Bowler report across several matches. matchesData: [{ details, balls }]
export default function MultiMatchPlayerReport({ matchesData, playerId, role, teamName }) {
  const model = useMemo(() => buildPlayerModel(matchesData, playerId, role), [matchesData, playerId, role]);
  const slides = useMemo(() => buildPlayerSlides(model, { teamName }), [model, teamName]);
  const { graphics, ensureGraphics } = useGraphicsLoader(`${model.name} - multi-match`);
  const footer = `${model.name} · ${model.matchesPlayed} matches`;

  if (!model.rows.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-sm text-slate-400">
        {role === 'batter' ? 'This player did not bat' : 'This player did not bowl'} in the selected matches.
      </div>
    );
  }

  return (
    <SlideDeck
      title={role === 'batter' ? 'Multi-Match Batter Report Preview' : 'Multi-Match Bowler Report Preview'}
      highlight={model.name}
      subtitle={`${model.style} | ${model.matchesPlayed} of ${model.matchesSelected} selected matches | ${model.rows.length} innings | ${slides.length} slides`}
      slides={slides}
      fileName={`${role === 'batter' ? 'BatterReport' : 'BowlerReport'}_${model.name}_${model.matchesPlayed}_matches`.replace(/[^a-zA-Z0-9_]/g, '_')}
      beforeSlide={ensureGraphics}
      renderSlide={(slide, id) => <SlideView slide={slide} graphics={graphics} footer={footer} id={id} />}
    />
  );
}
