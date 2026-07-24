import { describe, it, expect } from 'vitest';
import { parseReport, cleanReportSection } from '../reportComposer';

// A IA nem sempre devolve o formato exato pedido no prompt (acrescenta markdown,
// troca travessão por hífen, muda a caixa do título...). O parser precisa
// tolerar essas variações — quando ele falha, o app cai no relatório local e
// exibe "IA indisponível" mesmo com a IA tendo respondido corretamente.
const SECOES = [
  'PANORAMA DO PROJETO',
  'QUALIDADE DO DIAGNÓSTICO',
  'RESULTADO E APRENDIZADO',
  'CRÍTICAS CONSTRUTIVAS',
  'SUGESTÕES PARA O PRÓXIMO CICLO',
];

const corpo = (i: number) => `Conteúdo analítico da seção ${i + 1}.`;

const variantes: Record<string, string> = {
  'formato exato do prompt': SECOES.map((s, i) => `SEÇÃO ${i + 1} — ${s}\n${corpo(i)}`).join('\n\n'),
  'com cabeçalhos markdown ##': SECOES.map((s, i) => `## SEÇÃO ${i + 1} — ${s}\n\n${corpo(i)}`).join('\n---\n'),
  'título em **negrito**': SECOES.map((s, i) => `**SEÇÃO ${i + 1} — ${s}**\n${corpo(i)}`).join('\n\n'),
  'hífen em vez de travessão': SECOES.map((s, i) => `SEÇÃO ${i + 1} - ${s}\n${corpo(i)}`).join('\n\n'),
  'dois-pontos após o título': SECOES.map((s, i) => `SEÇÃO ${i + 1} — ${s}:\n${corpo(i)}`).join('\n\n'),
  'título em Title Case': SECOES.map((s, i) => `SEÇÃO ${i + 1} — ${s[0]}${s.slice(1).toLowerCase()}\n${corpo(i)}`).join('\n\n'),
  'sem acento (SECAO)': SECOES.map((s, i) => `SECAO ${i + 1} - ${s}\n${corpo(i)}`).join('\n\n'),
  'com texto de abertura': `Segue o relatório:\n\n${SECOES.map((s, i) => `SEÇÃO ${i + 1} — ${s}\n${corpo(i)}`).join('\n\n')}`,
  'markdown combinado (### + **)': SECOES.map((s, i) => `### **SEÇÃO ${i + 1} — ${s}**\n\n${corpo(i)}`).join('\n\n'),
};

describe('parseReport', () => {
  for (const [nome, raw] of Object.entries(variantes)) {
    it(`parseia as 5 seções: ${nome}`, () => {
      const r = parseReport(raw);
      expect(r).not.toBeNull();
      expect(r!.section_panorama).toContain('seção 1');
      expect(r!.section_quality).toContain('seção 2');
      expect(r!.section_result).toContain('seção 3');
      expect(r!.section_critique).toContain('seção 4');
      expect(r!.section_next).toContain('seção 5');
    });
  }

  it('preserva o conteúdo quando o corpo vem na mesma linha do título', () => {
    const raw = SECOES.map((s, i) => `SEÇÃO ${i + 1} — ${s}: ${corpo(i)} Texto adicional para passar de 60 chars.`).join('\n\n');
    const r = parseReport(raw);
    expect(r).not.toBeNull();
    expect(r!.section_panorama).toContain('Conteúdo analítico');
  });

  it('retorna null quando falta alguma seção', () => {
    const raw = SECOES.slice(0, 4).map((s, i) => `SEÇÃO ${i + 1} — ${s}\n${corpo(i)}`).join('\n\n');
    expect(parseReport(raw)).toBeNull();
  });

  it('retorna null para resposta vazia ou sem seções', () => {
    expect(parseReport('')).toBeNull();
    expect(parseReport('Não consegui gerar o relatório.')).toBeNull();
  });
});

describe('cleanReportSection', () => {
  it('remove markdown de exibição sem perder o texto', () => {
    const out = cleanReportSection('## Título\n---\nO gargalo é **estrutural**.\n\n\n\nFim.');
    expect(out).not.toContain('#');
    expect(out).not.toContain('---');
    expect(out).not.toContain('**');
    expect(out).toContain('O gargalo é estrutural.');
    expect(out).toContain('Fim.');
  });
});
