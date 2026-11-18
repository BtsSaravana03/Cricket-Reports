import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

// Pitch map / beehive / wagon wheel images from the Cricket-21 Graphics API, shared by the
// slide-based reports. A slide asks for graphics with slide.graphics = { key, balls }.

const GRAPHICS_BASE = 'https://cloud.cricket-21.com/GraphicsApi/api';
export const GRAPHIC_KINDS = ['pitchmap', 'beehive', 'ww'];

// Same payload shape the Batter / Bowler reports send to the Graphics API
const mapBallToPayload = (matchTitle) => (b) => ({
  Match: matchTitle,
  MatchID: String(b.MatchId),
  MatchTypeID: b.MatchTypeID ?? 2,
  InningsID: b.InningsId ?? 1,
  BallID: b.BallId ?? null,
  Overs: b.Overs ?? null,
  BatType: b.StBattingTypeID ?? b.BatTypeID ?? null,
  BatBalls: b.Batballs ?? null,
  IsFour: b.isFour ?? (b.Runs === 4 ? 1 : 0),
  IsSix: b.isSix ?? (b.Runs === 6 ? 1 : 0),
  Runs: b.Runs ?? 0,
  BowlBalls: b.Bowlballs ?? null,
  Dismissal: b.Dismissal ?? 0,
  PaceorSpinDesc: b.SpinOrPace === 2 ? 'spin' : 'pace',
  LengthX: b.PM_X ?? 1,
  LengthY: b.PM_Y ?? 1,
  HeightX: b.SZ_X ?? 1,
  HeightY: b.SZ_Y ?? 1,
  wwRegion_6: b.WWRegion_6 ?? 1,
  wwRegion_8: b.WWRegion_8 ?? 1,
  wwRegion_16: b.WWRegion_16 ?? 1,
  wagonWheelX: b.WagonWheelX ?? 1,
  wagonWheelY: b.WagonWheelY ?? 1
});

const extractSvg = (res) => {
  let svg = '';
  if (typeof res?.data === 'string') svg = res.data;
  else if (res?.data?.svg) svg = res.data.svg;
  else if (res?.data?.data) svg = res.data.data;
  if (typeof svg === 'string' && svg.startsWith('"') && svg.endsWith('"')) {
    try { svg = JSON.parse(svg); } catch (e) { /* keep raw */ }
  }
  return typeof svg === 'string' && svg.includes('<svg') ? svg : '';
};

// The Graphics API SVGs are ~1MB each and reuse element ids, so they are rasterised once to
// PNG: they can then sit side by side on a slide and export cheaply.
const svgToPng = (svg, scale = 1.5) => new Promise((resolve) => {
  const vb = /viewBox=['"]\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(svg);
  const w = vb ? Number(vb[1]) : 1080;
  const h = vb ? Number(vb[2]) : 600;
  const sized = svg.replace(/width=['"]100%['"]/, `width='${w}'`).replace(/height=['"]100%['"]/, `height='${h}'`);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ src: canvas.toDataURL('image/png'), w, h });
    } catch (e) {
      resolve(null);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  img.src = url;
});

// Returns { graphics, ensureGraphics }: ensureGraphics(slide) fetches the slide's three images once
// per graphics key and resolves when they are ready.
export function useGraphicsLoader(matchTitle) {
  const [graphics, setGraphics] = useState({});
  const pending = useRef({});

  const ensureGraphics = useCallback((slide) => {
    const spec = slide?.graphics;
    if (!spec) return Promise.resolve();
    if (pending.current[spec.key]) return pending.current[spec.key];
    const job = (async () => {
      setGraphics((prev) => ({ ...prev, [spec.key]: { status: 'loading' } }));
      const balls = spec.balls
        .filter((b) => b.Batballs === 1 || b.Batballs === true)
        .map(mapBallToPayload(matchTitle));
      const entries = await Promise.all(GRAPHIC_KINDS.map(async (kind) => {
        try {
          const res = await axios.post(`${GRAPHICS_BASE}/${kind}`, {
            title: ' ', type: 'svg', scale: 50, view: '1', region: 8, template: 2, clientid: 1, isHawk: 0, balls
          }, { headers: { 'Content-Type': 'application/json' } });
          const svg = extractSvg(res);
          return [kind, svg ? await svgToPng(svg) : null];
        } catch (e) {
          console.error(`Report graphics: ${kind} failed for ${spec.key}`, e);
          return [kind, null];
        }
      }));
      setGraphics((prev) => ({ ...prev, [spec.key]: { status: 'ready', ...Object.fromEntries(entries) } }));
    })();
    pending.current[spec.key] = job;
    return job;
  }, [matchTitle]);

  return { graphics, ensureGraphics };
}
