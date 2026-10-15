import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import * as htmlToImage from 'html-to-image';
import pptxgen from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMatchModel } from './match-report/matchStats';
import { buildSlides, SlideView, SLIDE_W, SLIDE_H, GRAPHIC_KINDS } from './match-report/slides';

const GRAPHICS_BASE = 'https://cloud.cricket-21.com/GraphicsApi/api';
const PX_PER_INCH = SLIDE_W / 10; // slides are 900x525px = 10 x 5.83in (custom layout below)
const PT_PER_PX = 72 / PX_PER_INCH;

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

// setTimeout rather than requestAnimationFrame so exports keep going if the tab is in the background
const nextFrame = () => new Promise((r) => setTimeout(r, 60));

const toHex = (cssColor) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(cssColor || '');
  if (!m || (m[4] !== undefined && Number(m[4]) === 0)) return null;
  return [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase();
};

// Rebuilds a rendered slide as native PPTX objects, positioned from the DOM.
const addDomSlideToPptx = async (pptx, root) => {
  const slide = pptx.addSlide();
  slide.background = { color: 'F6F4EB' };
  const origin = root.getBoundingClientRect();
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - origin.left) / PX_PER_INCH,
      y: (r.top - origin.top) / PX_PER_INCH,
      w: r.width / PX_PER_INCH,
      h: r.height / PX_PER_INCH
    };
  };

  root.querySelectorAll('[data-pshape]').forEach((el) => {
    const cs = getComputedStyle(el);
    const fill = toHex(cs.backgroundColor);
    const border = parseFloat(cs.borderTopWidth) > 0 ? toHex(cs.borderTopColor) : null;
    slide.addShape(parseFloat(cs.borderTopLeftRadius) > 0 ? pptx.shapes.ROUNDED_RECTANGLE : pptx.shapes.RECTANGLE, {
      ...box(el),
      fill: fill ? { color: fill } : { type: 'none' },
      line: border ? { color: border, width: 0.75 } : { type: 'none' },
      rectRadius: 0.05
    });
  });

  for (const el of root.querySelectorAll('[data-pimg]')) {
    try {
      const data = await htmlToImage.toPng(el, { pixelRatio: 2, cacheBust: false });
      slide.addImage({ data, ...box(el) });
    } catch (e) {
      console.error('Match report: could not snapshot block', e);
    }
  }

  root.querySelectorAll('[data-ptable]').forEach((table) => {
    const rows = [...table.querySelectorAll('tr')].map((tr) => [...tr.children].map((cell) => {
      const cs = getComputedStyle(cell);
      const rowCs = getComputedStyle(tr);
      return {
        text: cell.textContent,
        options: {
          bold: Number(cs.fontWeight) >= 700,
          color: toHex(cs.color) || '1E293B',
          fill: { color: toHex(cs.backgroundColor) || toHex(rowCs.backgroundColor) || 'FFFFFF' },
          align: cs.textAlign === 'left' ? 'left' : cs.textAlign === 'right' ? 'right' : 'center',
          fontSize: parseFloat(cs.fontSize) * PT_PER_PX
        }
      };
    }));
    const firstRow = table.querySelector('tr');
    const colW = firstRow ? [...firstRow.children].map((c) => c.getBoundingClientRect().width / PX_PER_INCH) : undefined;
    const rowH = [...table.querySelectorAll('tr')].map((tr) => tr.getBoundingClientRect().height / PX_PER_INCH);
    slide.addTable(rows, {
      ...box(table),
      colW,
      rowH,
      margin: [0.01, 0.04, 0.01, 0.04],
      fontFace: 'Arial',
      valign: 'middle',
      border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
      autoPage: false
    });
  });

  root.querySelectorAll('[data-ptext]').forEach((el) => {
    const cs = getComputedStyle(el);
    // PowerPoint sets Arial a little wider than the browser: give each line 20% slack, anchored by alignment
    const b = box(el);
    const slack = b.w * 0.2;
    const shift = cs.textAlign === 'center' ? slack / 2 : cs.textAlign === 'right' ? slack : 0;
    // Text the browser had to truncate (long team names) is shrunk to fit instead of overflowing
    const fitRatio = el.scrollWidth > el.clientWidth ? el.clientWidth / el.scrollWidth : 1;
    slide.addText(el.innerText, {
      ...b,
      x: b.x - shift,
      w: b.w + slack,
      wrap: false,
      fontSize: parseFloat(cs.fontSize) * PT_PER_PX * fitRatio,
      bold: Number(cs.fontWeight) >= 600,
      italic: cs.fontStyle === 'italic',
      color: toHex(cs.color) || '0F172A',
      align: cs.textAlign === 'center' ? 'center' : cs.textAlign === 'right' ? 'right' : 'left',
      valign: 'middle',
      margin: 0,
      fontFace: 'Arial'
    });
  });
};

export default function MatchReport({ ballData, matchDetails }) {
  const [current, setCurrent] = useState(0);
  const [graphics, setGraphics] = useState({});
  const [exportIndex, setExportIndex] = useState(null);
  const [exporting, setExporting] = useState(null); // { format, done, total }
  const pending = useRef({});
  const exportRef = useRef(null);

  const model = useMemo(() => buildMatchModel(ballData, matchDetails), [ballData, matchDetails]);
  const slides = useMemo(() => buildSlides(model, matchDetails), [model, matchDetails]);

  const teamA = matchDetails?.ClubAFull || matchDetails?.ClubAPrefix || 'Team A';
  const teamB = matchDetails?.ClubBFull || matchDetails?.ClubBPrefix || 'Team B';
  const matchTitle = `${matchDetails?.ClubAPrefix || 'TeamA'} vs ${matchDetails?.ClubBPrefix || 'TeamB'}`;
  const footer = `${teamA} vs ${teamB} · ${matchDetails?.info?.Date || ''}`;
  const fileName = `MatchReport_${teamA}_vs_${teamB}`.replace(/[^a-zA-Z0-9_]/g, '_');

  const ensureGraphics = useCallback((spec) => {
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
          console.error(`Match report: ${kind} graphic failed for ${spec.key}`, e);
          return [kind, null];
        }
      }));
      setGraphics((prev) => ({ ...prev, [spec.key]: { status: 'ready', ...Object.fromEntries(entries) } }));
    })();
    pending.current[spec.key] = job;
    return job;
  }, [matchTitle]);

  const slide = slides[Math.min(current, slides.length - 1)];

  useEffect(() => {
    if (slide?.graphics) ensureGraphics(slide.graphics);
  }, [slide, ensureGraphics]);

  const handleDownload = async (format) => {
    setExporting({ format, done: 0, total: slides.length });
    try {
      const pptx = format === 'pptx' ? (typeof pptxgen === 'function' ? new pptxgen() : new pptxgen.default()) : null;
      if (pptx) {
        pptx.defineLayout({ name: 'C21_MATCH_REPORT', width: SLIDE_W / PX_PER_INCH, height: SLIDE_H / PX_PER_INCH });
        pptx.layout = 'C21_MATCH_REPORT';
      }
      const pdf = format === 'pdf' ? new jsPDF({ orientation: 'landscape', unit: 'px', format: [SLIDE_W, SLIDE_H] }) : null;

      for (let i = 0; i < slides.length; i += 1) {
        await ensureGraphics(slides[i].graphics);
        setExportIndex(i);
        await nextFrame();
        const root = exportRef.current?.querySelector('[data-slide]');
        if (!root) continue;
        await Promise.all([...root.querySelectorAll('img')].map((img) => (img.complete ? null : img.decode().catch(() => null))));

        if (pdf) {
          // JPEG keeps a 40-page report around 10MB (PNG pages are stored nearly raw by jsPDF)
          const jpg = await htmlToImage.toJpeg(root, { pixelRatio: 2, quality: 0.9, backgroundColor: '#f6f4eb', cacheBust: false });
          if (i > 0) pdf.addPage([SLIDE_W, SLIDE_H], 'landscape');
          pdf.addImage(jpg, 'JPEG', 0, 0, SLIDE_W, SLIDE_H, undefined, 'FAST');
        } else {
          await addDomSlideToPptx(pptx, root);
        }
        setExporting({ format, done: i + 1, total: slides.length });
      }

      if (pdf) pdf.save(`${fileName}.pdf`);
      if (pptx) await pptx.writeFile({ fileName: `${fileName}.pptx` });
    } catch (err) {
      console.error('Match Report Export Error:', err);
    } finally {
      setExportIndex(null);
      setExporting(null);
    }
  };

  if (!slides.length || !model.innings.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-sm text-slate-400">
        No ball-by-ball data found for this match.
      </div>
    );
  }

  // Slides grouped for the picker
  const groups = slides.reduce((acc, s, i) => {
    const g = acc.find((x) => x.name === s.group);
    if (g) g.items.push({ s, i }); else acc.push({ name: s.group, items: [{ s, i }] });
    return acc;
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 animate-fadeIn">
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Post Match Report Preview – <span className="text-blue-400">{teamA} vs {teamB}</span>
          </h3>
          <p className="text-xs text-slate-400">
            {model.resultText} | {model.innings.length} innings | {slides.length} slides
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {exporting && (
            <span className="text-xs text-slate-300 font-medium">
              Exporting {exporting.format.toUpperCase()} {exporting.done}/{exporting.total}…
            </span>
          )}
          <button
            disabled={!!exporting}
            onClick={() => handleDownload('pdf')}
            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-lg shadow-md text-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
          <button
            disabled={!!exporting}
            onClick={() => handleDownload('pptx')}
            className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-lg shadow-md text-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download PPTX</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <select
          value={current}
          onChange={(e) => setCurrent(Number(e.target.value))}
          className="flex-1 max-w-[560px] bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2 text-sm text-slate-100 focus:outline-none"
        >
          {groups.map((g) => (
            <optgroup key={g.name} label={g.name}>
              {g.items.map(({ s, i }) => (
                <option key={s.key} value={i}>Slide {i + 1}: {s.section ? `${s.section} – ` : ''}{s.nav}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}
          disabled={current === slides.length - 1}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-500 font-semibold">{current + 1} / {slides.length}</span>
      </div>

      <div className="overflow-x-auto flex justify-center">
        <div className="rounded-lg shadow-2xl border border-slate-700 overflow-hidden shrink-0">
          <SlideView slide={slide} graphics={graphics} footer={footer} />
        </div>
      </div>

      {/* Off-screen render target used one slide at a time while exporting */}
      <div ref={exportRef} className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
        {exportIndex !== null && slides[exportIndex] && (
          <SlideView slide={slides[exportIndex]} graphics={graphics} footer={footer} id="match-report-export-node" />
        )}
      </div>
    </div>
  );
}
