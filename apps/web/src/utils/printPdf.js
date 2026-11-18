/**
 * Reliable Cross-Browser & Electron PDF Print Utility
 * Triggers native system print dialog with reliable fallback
 */
export function printPdfDocument(pdf) {
  try {
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // 1. Create a print iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '10px';
    iframe.style.height = '10px';
    iframe.style.opacity = '0.01';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    let hasPrinted = false;

    const doPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          return;
        }
      } catch (err) {
        console.warn('Iframe contentWindow print failed:', err);
      }

      // Pop-up print window fallback
      try {
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (_) {}
          }, 600);
        }
      } catch (e) {
        console.warn('Window open fallback error:', e);
      }
    };

    iframe.onload = () => {
      setTimeout(doPrint, 300);
    };

    document.body.appendChild(iframe);

    // Reliable timer fallback if iframe.onload does not fire for application/pdf
    setTimeout(() => {
      if (!hasPrinted) {
        doPrint();
      }
    }, 700);

    // Cleanup resources
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 120000);

  } catch (error) {
    console.error('Error invoking print dialog for PDF:', error);
    try {
      pdf.autoPrint();
      const fallbackUrl = pdf.output('bloburl');
      const win = window.open(fallbackUrl, '_blank');
      if (win) {
        win.focus();
        win.print();
      }
    } catch (_) {}
  }
}
