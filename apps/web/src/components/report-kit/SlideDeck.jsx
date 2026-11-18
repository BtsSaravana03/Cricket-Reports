import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportSlides } from './exporter';

// Preview + PDF/PPTX download shell shared by the slide-based reports.
//   slides: [{ key, nav, group, section? }]
//   renderSlide(slide, id?) -> the 900x525 slide element (must carry data-slide)
//   beforeSlide(slide) -> optional promise run before a slide is shown or exported (e.g. load graphics)
export default function SlideDeck({ title, highlight, subtitle, slides, fileName, renderSlide, beforeSlide }) {
  const [current, setCurrent] = useState(0);
  const [exportIndex, setExportIndex] = useState(null);
  const [exporting, setExporting] = useState(null); // { format, done, total }
  const exportRef = useRef(null);

  const slide = slides[Math.min(current, slides.length - 1)];

  useEffect(() => {
    if (slide && beforeSlide) beforeSlide(slide);
  }, [slide, beforeSlide]);

  const handleDownload = async (format) => {
    setExporting({ format, done: 0, total: slides.length });
    try {
      await exportSlides({
        format,
        slides,
        fileName,
        beforeSlide,
        renderAt: setExportIndex,
        getRoot: () => exportRef.current?.querySelector('[data-slide]'),
        onProgress: (done) => setExporting({ format, done, total: slides.length })
      });
    } catch (err) {
      console.error('Report export error:', err);
    } finally {
      setExportIndex(null);
      setExporting(null);
    }
  };

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
            {title} – <span className="text-blue-400">{highlight}</span>
          </h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
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
          {renderSlide(slide)}
        </div>
      </div>

      {/* Off-screen render target used one slide at a time while exporting */}
      <div ref={exportRef} className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
        {exportIndex !== null && slides[exportIndex] && renderSlide(slides[exportIndex], 'report-export-node')}
      </div>
    </div>
  );
}
