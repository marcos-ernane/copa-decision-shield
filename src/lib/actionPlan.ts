// actionPlan.ts — Construção e exportação do Plano de Ação 5W2H (PRD-ITEM-05).
// Derivado do content de uma entry structured_P e do gargalo atual do projeto.
// Exporta como PDF via jsPDF. Compartilha via Capacitor Share no mobile.

import jsPDF from 'jspdf';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import type { ActionPlan, StructuredPContent } from './register';

// Formata ISO date para DD/MM/AAAA. Retorna 'Não definido' quando null/vazio.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Não definido';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Constrói um ActionPlan (5W2H) a partir do content da entry structured_P
// e do gargalo atual do projeto (current_bottleneck → Por quê).
export function buildActionPlan(
  content: StructuredPContent,
  projectBottleneck: string,
): ActionPlan {
  const what = content.action.split('\n')[0].trim();
  return {
    what,
    why: projectBottleneck.trim() || 'Não especificado',
    how: content.metric.trim() || 'Não especificado',
    when: formatDate(content.deadline),
    who_is_affected: content.ethical_check?.trim() || 'Não especificado',
    how_much: content.cut_rule.trim() || 'Não especificado',
    generated_at: new Date().toISOString(),
  };
}

// Exporta o Plano de Ação 5W2H como PDF.
// No mobile (Capacitor): compartilha via Share. Na web: faz download.
// imvTitle: texto opcional exibido como subtítulo (texto completo da ação).
export async function exportActionPlan(
  plan: ActionPlan,
  imvTitle?: string,
): Promise<void> {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Cabeçalho
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Plano de Ação 5W2H', margin, y);
  y += 28;

  if (imvTitle) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const titleLines = pdf.splitTextToSize(`IMV: ${imvTitle}`, pageW - margin * 2);
    pdf.text(titleLines, margin, y);
    y += titleLines.length * 14 + 8;
    pdf.setTextColor(0, 0, 0);
  }

  // Linha divisória
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, pageW - margin, y);
  y += 20;

  // Campos 5W2H na ordem canônica
  const fields: Array<{ label: string; value: string }> = [
    { label: 'O quê',          value: plan.what },
    { label: 'Por quê',        value: plan.why },
    { label: 'Como',           value: plan.how },
    { label: 'Quando',         value: plan.when },
    { label: 'Quem é afetado', value: plan.who_is_affected },
    { label: 'Quanto custa',   value: plan.how_much },
  ];

  for (const field of fields) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(80, 80, 80);
    pdf.text(field.label.toUpperCase(), margin, y);
    y += 13;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const lines = pdf.splitTextToSize(field.value, pageW - margin * 2);
    pdf.text(lines, margin, y);
    y += lines.length * 16 + 14;
  }

  // Rodapé com data de geração
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(150, 150, 150);
  const genDate = new Date(plan.generated_at).toLocaleDateString('pt-BR');
  pdf.text(`Gerado em ${genDate} — Operador de Precisão`, margin, y + 16);

  const fileName = `plano-acao-${new Date(plan.generated_at).toISOString().slice(0, 10)}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const blob = pdf.output('blob');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await Share.share({
          title: 'Plano de Ação 5W2H',
          text: 'Meu plano de ação.',
          url: reader.result as string,
        });
      } catch { /* user cancel — sem erro para o usuário */ }
    };
    reader.readAsDataURL(blob);
  } else {
    pdf.save(fileName);
  }
}
