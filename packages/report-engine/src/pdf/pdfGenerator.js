import PDFDocument from 'pdfkit';
import { clientTemplates } from '../templates/clientTemplates.js';

export function generatePdfReport(matchData, templateId = 'vca') {
  return new Promise((resolve, reject) => {
    try {
      const theme = clientTemplates[templateId] || clientTemplates.standard;
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- Header Banner ---
      doc.rect(0, 0, 595.28, 90).fill(theme.primaryColor);

      doc.fillColor('#FFFFFF')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(theme.logoText, 40, 25);

      doc.fillColor(theme.secondaryColor)
         .fontSize(12)
         .text('MATCH PERFORMANCE REPORT', 40, 55);

      doc.moveDown(4);

      // --- Match Overview Card ---
      const teamA = matchData.teamA || 'Team A';
      const teamB = matchData.teamB || 'Team B';
      const result = matchData.result || 'Match Completed';

      doc.rect(40, 110, 515, 120)
         .fillAndStroke(theme.cardBg, theme.primaryColor);

      doc.fillColor(theme.primaryColor)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(`${teamA} vs ${teamB}`, 55, 125);

      doc.fillColor('#4B5563')
         .fontSize(11)
         .font('Helvetica')
         .text(`Tournament: ${matchData.competitionName || 'Tournament'}`, 55, 155)
         .text(`Venue: ${matchData.venue || 'Stadium'} | Date: ${matchData.matchDate || '2026-09-21'}`, 55, 172);

      doc.fillColor(theme.secondaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(`Result: ${result}`, 55, 195);

      doc.moveDown(3);

      // --- Batting Performance Table ---
      doc.fillColor(theme.primaryColor)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Batting Performance Overview', 40, 250);

      // Table Header
      let startY = 275;
      doc.rect(40, startY, 515, 24).fill(theme.primaryColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text('Batter', 50, startY + 7);
      doc.text('Dismissal', 200, startY + 7);
      doc.text('Runs', 340, startY + 7);
      doc.text('Balls', 400, startY + 7);
      doc.text('SR', 470, startY + 7);

      startY += 24;
      const battingStats = matchData.battingStats || [];

      battingStats.forEach((b, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        doc.rect(40, startY, 515, 20).fill(bg);

        doc.fillColor('#1F2937').fontSize(9).font('Helvetica');
        doc.text(b.playerName, 50, startY + 5);
        doc.text(b.dismissal || 'not out', 200, startY + 5);
        doc.text(b.runs.toString(), 340, startY + 5);
        doc.text(b.balls.toString(), 400, startY + 5);
        doc.text(b.strikeRate.toString(), 470, startY + 5);

        startY += 20;
      });

      // --- Footer ---
      doc.fillColor('#9CA3AF')
         .fontSize(9)
         .text(theme.footerNotice, 40, 780, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
