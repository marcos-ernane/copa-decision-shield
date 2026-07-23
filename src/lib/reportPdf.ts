// reportPdf.ts — Exportação do Relatório Consultivo em PDF (PRD-plano-execucao-imv).
// Molde: actionPlan.ts (Padrão A — texto nativo jsPDF, sem html2canvas).
// Acrescenta addPage guard (inexistente no molde): relatórios de 5 seções detalhadas
// facilmente ultrapassam uma página A4.

import jsPDF from 'jspdf';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { cleanReportSection } from './reportComposer';
import type { ProjectReportContent } from './register';

export async function exportReportPdf(
  content: ProjectReportContent,
  projectName: string,
): Promise<void> {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let y = margin;

  const guard = () => {
    if (y > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const addLine = (text: string, size: number, bold: boolean) => {
    guard();
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = pdf.splitTextToSize(text, pageW - margin * 2);
    lines.forEach((l: string) => {
      guard();
      pdf.text(l, margin, y);
      y += size * 1.4;
    });
  };

  addLine(`RELATÓRIO CONSULTIVO — ${projectName.toUpperCase()}`, 16, true);
  addLine(`Gerado em ${new Date(content.generated_at).toLocaleDateString('pt-BR')}`, 9, false);
  y += 12;

  const sections: [string, string][] = [
    ['1. PANORAMA DO PROJETO', cleanReportSection(content.section_panorama)],
    ['2. QUALIDADE DO DIAGNÓSTICO', cleanReportSection(content.section_quality)],
    ['3. RESULTADO E APRENDIZADO', cleanReportSection(content.section_result)],
    ['4. CRÍTICAS CONSTRUTIVAS', cleanReportSection(content.section_critique)],
    ['5. SUGESTÕES PARA O PRÓXIMO CICLO', cleanReportSection(content.section_next)],
  ];

  sections.forEach(([label, text]) => {
    y += 8;
    guard();
    addLine(label, 11, true);
    addLine(text, 11, false);
    y += 8;
  });

  if (content.is_fallback) {
    addLine('* Relatório gerado localmente — IA indisponível no momento.', 9, false);
  }

  const fileName = `relatorio-${new Date(content.generated_at).toISOString().slice(0, 10)}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const blob = pdf.output('blob');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await Share.share({ title: 'Relatório Consultivo', url: reader.result as string });
      } catch {
        /* cancelamento silencioso */
      }
    };
    reader.readAsDataURL(blob);
  } else {
    pdf.save(fileName);
  }
}
