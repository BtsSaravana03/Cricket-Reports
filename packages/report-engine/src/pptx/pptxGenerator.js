import pptxgen from 'pptxgenjs';
import { clientTemplates } from '../templates/clientTemplates.js';
import { calculateRunRate } from '@cricket-reports/shared-utils';

export async function generatePptxReport(matchData, templateId = 'vca') {
  const theme = clientTemplates[templateId] || clientTemplates.standard;
  const pptx = typeof pptxgen === 'function' ? new pptxgen() : new pptxgen.default();

  pptx.layout = 'LAYOUT_16x9';

  // --- SLIDE 1: Title Slide ---
  const slide1 = pptx.addSlide();

  // Background Header Banner
  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 1.5,
    fill: { color: theme.primaryColor.replace('#', '') }
  });

  slide1.addText(theme.logoText, {
    x: 0.5, y: 0.4, fontFace: 'Arial', fontSize: 24, bold: true, color: 'FFFFFF'
  });

  slide1.addText(`POST MATCH PERFORMANCE REPORT`, {
    x: 0.5, y: 0.9, fontFace: 'Arial', fontSize: 14, color: theme.secondaryColor.replace('#', '')
  });

  // Match Details Box
  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0.5, y: 2.0, w: 9.0, h: 4.5,
    fill: { color: theme.cardBg.replace('#', '') },
    line: { color: theme.primaryColor.replace('#', ''), width: 1 }
  });

  const teamA = matchData.teamA || 'Team A';
  const teamB = matchData.teamB || 'Team B';
  const venue = matchData.venue || 'Stadium';
  const date = matchData.matchDate || '2026-09-21';
  const result = matchData.result || 'Match Completed';

  slide1.addText(`${teamA} VS ${teamB}`, {
    x: 0.8, y: 2.4, fontFace: 'Arial', fontSize: 28, bold: true, color: theme.primaryColor.replace('#', '')
  });

  slide1.addText(`Tournament: ${matchData.competitionName || 'Tournament'} | Venue: ${venue} | Date: ${date}`, {
    x: 0.8, y: 3.2, fontFace: 'Arial', fontSize: 14, color: '4B5563'
  });

  slide1.addText(`Result: ${result}`, {
    x: 0.8, y: 3.8, fontFace: 'Arial', fontSize: 18, bold: true, color: theme.secondaryColor.replace('#', '')
  });

  slide1.addText(theme.footerNotice, {
    x: 0.5, y: 6.8, fontFace: 'Arial', fontSize: 10, italic: true, color: '9CA3AF'
  });

  // --- SLIDE 2: Innings Summary & Scorecard ---
  const slide2 = pptx.addSlide();

  // Slide Header
  slide2.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.9,
    fill: { color: theme.primaryColor.replace('#', '') }
  });
  slide2.addText(`${teamA} Innings Summary`, {
    x: 0.5, y: 0.25, fontFace: 'Arial', fontSize: 20, bold: true, color: 'FFFFFF'
  });

  // Scorecard Table
  const tableRows = [
    [
      { text: 'Batter', options: { bold: true, fill: theme.primaryColor.replace('#', ''), color: 'FFFFFF' } },
      { text: 'Dismissal', options: { bold: true, fill: theme.primaryColor.replace('#', ''), color: 'FFFFFF' } },
      { text: 'Runs', options: { bold: true, fill: theme.primaryColor.replace('#', ''), color: 'FFFFFF' } },
      { text: 'Balls', options: { bold: true, fill: theme.primaryColor.replace('#', ''), color: 'FFFFFF' } },
      { text: '4s', options: { bold: true, fill: theme.primaryColor.replace('#', ''), color: 'FFFFFF' } },
      { text: '6s', options: { bold: true, fill: theme.primaryColor.replace('#', ''), color: 'FFFFFF' } },
      { text: 'SR', options: { bold: true, fill: theme.primaryColor.replace('#', ''), color: 'FFFFFF' } }
    ]
  ];

  const battingStats = matchData.battingStats || [];
  if (battingStats.length === 0) {
    tableRows.push(['No batting data recorded', '', '', '', '', '', '']);
  } else {
    battingStats.forEach(b => {
      tableRows.push([
        b.playerName,
        b.dismissal || 'not out',
        b.runs.toString(),
        b.balls.toString(),
        b.fours.toString(),
        b.sixes.toString(),
        b.strikeRate.toString()
      ]);
    });
  }

  slide2.addTable(tableRows, {
    x: 0.5, y: 1.2, w: 9.0, colW: [2.2, 2.3, 0.9, 0.9, 0.9, 0.9, 0.9],
    fontSize: 12, border: { pt: '1', color: 'CBD5E1' }
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer;
}
