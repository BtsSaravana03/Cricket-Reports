/**
 * Cricket Statistics & Data Utilities
 */

export function calculateRunRate(runs, overs) {
  if (!overs || overs === 0) return "0.00";
  const numOvers = typeof overs === 'string' ? parseOvers(overs) : overs;
  if (numOvers === 0) return "0.00";
  return (runs / numOvers).toFixed(2);
}

export function parseOvers(oversStr) {
  if (!oversStr) return 0;
  const parts = oversStr.toString().split('.');
  const completedOvers = parseInt(parts[0], 10) || 0;
  const balls = parseInt(parts[1], 10) || 0;
  return completedOvers + (balls / 6);
}

export function formatEconomyRate(runs, oversStr) {
  return calculateRunRate(runs, oversStr);
}

export function calculateStrikeRate(runs, balls) {
  if (!balls || balls === 0) return "0.00";
  return ((runs / balls) * 100).toFixed(2);
}
