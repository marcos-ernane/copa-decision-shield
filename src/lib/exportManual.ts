// PDF export do Manual do Operador.
// jsPDF + html2canvas. Compartilhamento via Capacitor Share.

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export async function exportManualPDF(
  containerEl: HTMLElement,
  meta: { userName: string },
): Promise<void> {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Capa
  pdf.setFontSize(28);
  pdf.text('Manual do Operador', pageW / 2, pageH / 2 - 40, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text(meta.userName || 'Operador', pageW / 2, pageH / 2, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(new Date().toLocaleDateString('pt-BR'), pageW / 2, pageH / 2 + 24, { align: 'center' });

  // Capítulos: 1 página por seção .chapter-page
  const pages = containerEl.querySelectorAll<HTMLElement>('.chapter-page');
  for (const el of pages) {
    pdf.addPage();
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
    const img = canvas.toDataURL('image/png');
    const ratio = canvas.width / canvas.height;
    let w = pageW - 48;
    let h = w / ratio;
    if (h > pageH - 48) { h = pageH - 48; w = h * ratio; }
    pdf.addImage(img, 'PNG', (pageW - w) / 2, 24, w, h);
  }

  const fileName = `manual-operador-${new Date().toISOString().slice(0, 10)}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const blob = pdf.output('blob');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await Share.share({ title: 'Manual do Operador', text: 'Meu manual.', url: reader.result as string });
      } catch { /* user cancel */ }
    };
    reader.readAsDataURL(blob);
  } else {
    pdf.save(fileName);
  }
}
