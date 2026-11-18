import * as htmlToImage from 'html-to-image';
import pptxgen from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import { printPdfDocument } from '../../utils/printPdf';

// Shared PDF / native-PPTX / Direct-Print export for slide-based reports (match report, tournament report).
// Slides are rendered at a fixed 900x525px; PPTX objects are positioned from the rendered DOM using
// data-p* markers: data-pshape (filled rectangle), data-ptext (text), data-ptable (table), data-pimg (image).

export const SLIDE_W = 900;
export const SLIDE_H = 525;
const PX_PER_INCH = SLIDE_W / 10; // 900x525px = 10 x 5.83in (custom layout below)
const PT_PER_PX = 72 / PX_PER_INCH;

// setTimeout rather than requestAnimationFrame so exports keep going if the tab is in the background
export const nextFrame = () => new Promise((r) => setTimeout(r, 60));

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
      console.error('Report export: could not snapshot block', e);
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

// Renders each slide (via renderAt) into an off-screen node and writes a PDF or PPTX.
// renderAt(i) must render slide i into the node returned by getRoot().
export async function exportSlides({ format, slides, fileName, renderAt, getRoot, beforeSlide, onProgress }) {
  const pptx = format === 'pptx' ? (typeof pptxgen === 'function' ? new pptxgen() : new pptxgen.default()) : null;
  if (pptx) {
    pptx.defineLayout({ name: 'C21_REPORT', width: SLIDE_W / PX_PER_INCH, height: SLIDE_H / PX_PER_INCH });
    pptx.layout = 'C21_REPORT';
  }
  const isPdfMode = format === 'pdf' || format === 'print';
  const pdf = isPdfMode ? new jsPDF({ orientation: 'landscape', unit: 'px', format: [SLIDE_W, SLIDE_H] }) : null;

  for (let i = 0; i < slides.length; i += 1) {
    if (beforeSlide) await beforeSlide(slides[i]);
    renderAt(i);
    await nextFrame();
    const root = getRoot();
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
    if (onProgress) onProgress(i + 1);
  }

  if (pdf) {
    if (format === 'print') {
      printPdfDocument(pdf);
    } else {
      pdf.save(`${fileName}.pdf`);
    }
  }
  if (pptx) await pptx.writeFile({ fileName: `${fileName}.pptx` });
}
