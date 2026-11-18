import React, { useMemo } from 'react';
import { buildMatchModel } from './match-report/matchStats';
import { buildSlides, SlideView } from './match-report/slides';
import SlideDeck from './report-kit/SlideDeck';
import { useGraphicsLoader } from './report-kit/graphics';

export default function MatchReport({ ballData, matchDetails }) {
  const model = useMemo(() => buildMatchModel(ballData, matchDetails), [ballData, matchDetails]);
  const slides = useMemo(() => buildSlides(model, matchDetails), [model, matchDetails]);

  const teamA = matchDetails?.ClubAFull || matchDetails?.ClubAPrefix || 'Team A';
  const teamB = matchDetails?.ClubBFull || matchDetails?.ClubBPrefix || 'Team B';
  const footer = `${teamA} vs ${teamB} · ${matchDetails?.info?.Date || ''}`;
  const { graphics, ensureGraphics } = useGraphicsLoader(`${matchDetails?.ClubAPrefix || 'TeamA'} vs ${matchDetails?.ClubBPrefix || 'TeamB'}`);

  if (!slides.length || !model.innings.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-sm text-slate-400">
        No ball-by-ball data found for this match.
      </div>
    );
  }

  return (
    <SlideDeck
      title="Post Match Report Preview"
      highlight={`${teamA} vs ${teamB}`}
      subtitle={`${model.resultText} | ${model.innings.length} innings | ${slides.length} slides`}
      slides={slides}
      fileName={`MatchReport_${teamA}_vs_${teamB}`.replace(/[^a-zA-Z0-9_]/g, '_')}
      beforeSlide={ensureGraphics}
      renderSlide={(slide, id) => <SlideView slide={slide} graphics={graphics} footer={footer} id={id} />}
    />
  );
}
