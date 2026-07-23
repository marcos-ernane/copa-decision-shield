// ReportScreen — Relatório Consultivo de Projeto com IA (PRD-plano-execucao-imv)
// Rota: /report?projectId=xxx  (opcional &entryId=yyy → visualização de relatório salvo)
// Molde: clarity.tsx. A IA lê o projeto inteiro e devolve 5 seções de análise.
// Etapa 4: tela completa (estados, aviso Aferição, cooldown, CircleHelps, fallback,
// salvar, exportar PDF). A exportação de PDF vive inline aqui nesta etapa e será
// extraída para src/lib/reportPdf.ts na Etapa 5.

import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  ClipboardList, CircleHelp, X, AlertTriangle, AlertCircle,
  BookmarkCheck, FileDown, RefreshCw, Check,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import { BackButton } from '@/components/app/BackButton';
import { Button } from '@/components/ui/button';
import { getProject, listEntries, listPrinciples } from '@/lib/projects';
import { useAuthState } from '@/lib/planLimits';
import {
  buildReportPayload, generateReport, reportCooldown,
  type ReportPayload, type ParsedReport,
} from '@/lib/reportComposer';
import { saveProjectReport, type ProjectReportContent, type ProjectReportType } from '@/lib/register';
import type { Entry, Project as ProjectType } from '@/types/database';

export const Route = createFileRoute('/report')({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : '',
    entryId: typeof s.entryId === 'string' ? s.entryId : undefined,
  }),
  component: ReportScreen,
});

// ─── Metadados ────────────────────────────────────────────────────────────────

const TITLE_BY_TYPE: Record<ProjectReportType, string> = {
  diagnostic: 'Diagnóstico e Intervenção',
  full_cycle: 'Relatório de Ciclo',
  evolution: 'Evolução Operacional',
};

type SectionKey = keyof ParsedReport;

const SECTIONS: { key: SectionKey; num: number; label: string; help: string }[] = [
  {
    key: 'section_panorama', num: 1, label: 'Panorama do Projeto',
    help: 'Síntese do que foi feito: o que o operador observou, qual gargalo identificou e com que critério escolheu a intervenção.',
  },
  {
    key: 'section_quality', num: 2, label: 'Qualidade do Diagnóstico',
    help: 'A IA avalia se o diagnóstico foi preciso: fato limpo, gargalo correto, IMV bem calibrada nos 4 critérios do método.',
  },
  {
    key: 'section_result', num: 3, label: 'Resultado e Aprendizado',
    help: 'O que a execução revelou, o que funcionou e o que o princípio extraído representa para o projeto.',
  },
  {
    key: 'section_critique', num: 4, label: 'Críticas Construtivas',
    help: 'Pontos onde o ciclo poderia ter sido mais preciso. Sempre construtivo — serve para o operador crescer, não para julgar.',
  },
  {
    key: 'section_next', num: 5, label: 'Sugestões para o Próximo Ciclo',
    help: 'Sugestões concretas baseadas no aprendizado: qual gargalo atacar, qual camada priorizar, qual IMV evitar.',
  },
];

// A IA às vezes acrescenta markdown por conta própria (títulos #, separadores ---,
// **negrito**). Limpa esses artefatos apenas na exibição — o texto cru é preservado
// no que é salvo/persistido.
function cleanSection(raw: string): string {
  return (raw || '')
    .split('\n')
    .filter((l) => !/^\s*[-=*_]{3,}\s*$/.test(l))      // remove --- === *** separadores
    .map((l) => l.replace(/^\s*#{1,6}\s+/, '').trimEnd()) // remove cabeçalhos markdown
    .join('\n')
    .replace(/\*\*/g, '')                                // remove marcações de negrito
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Estados ──────────────────────────────────────────────────────────────────

type Phase =
  | 'loading'
  | 'no_project'
  | 'no_imv'
  | 'ready'
  | 'generating'
  | 'generated'
  | 'viewing_saved';

// ─── Componente ───────────────────────────────────────────────────────────────

function ReportScreen() {
  const { projectId, entryId } = useSearch({ strict: false }) as {
    projectId?: string;
    entryId?: string;
  };
  const navigate = useNavigate();
  const { authState } = useAuthState();

  const [phase, setPhase] = useState<Phase>('loading');
  const [project, setProject] = useState<ProjectType | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [hasApa, setHasApa] = useState(false);
  const [result, setResult] = useState<ParsedReport | null>(null);
  const [reportType, setReportType] = useState<ProjectReportType>('diagnostic');
  const [completeCycles, setCompleteCycles] = useState(0);
  const [isFallback, setIsFallback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openHelp, setOpenHelp] = useState<'main' | number | null>(null);
  const [showAferAviso, setShowAferAviso] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!projectId) { setPhase('no_project'); return; }
      const [proj, allEntries, principles] = await Promise.all([
        getProject(projectId),
        listEntries(projectId),
        listPrinciples(projectId),
      ]);
      if (cancelled) return;
      if (!proj) { setPhase('no_project'); return; }
      setProject(proj);
      setEntries(allEntries);

      // Modo visualização de relatório salvo (aberto pela Timeline).
      if (entryId) {
        const saved = allEntries.find(
          (e) => e.id === entryId && e.entry_type === 'project_report',
        );
        if (saved) {
          const c = saved.content as unknown as ProjectReportContent;
          setResult({
            section_panorama: c.section_panorama,
            section_quality: c.section_quality,
            section_result: c.section_result,
            section_critique: c.section_critique,
            section_next: c.section_next,
          });
          setReportType(c.report_type);
          setCompleteCycles(c.complete_cycles);
          setIsFallback(c.is_fallback);
          setSaved(true);
          setPhase('viewing_saved');
          return;
        }
      }

      const decisions = allEntries.filter((e) => e.entry_type === 'decision_record');
      const pay = buildReportPayload(proj, allEntries, principles, decisions);
      if (!pay) { setPhase('no_imv'); return; }
      setPayload(pay);
      setReportType(pay.reportType);
      setCompleteCycles(pay.completeCycles);
      setHasApa(allEntries.some((e) => e.entry_type === 'structured_A'));
      setPhase('ready');
    }
    void load();
    return () => { cancelled = true; };
  }, [projectId, entryId]);

  const cooldown = reportCooldown(entries, authState);

  async function runGenerate() {
    if (!payload) return;
    setPhase('generating');
    const { report, isFallback: fb } = await generateReport(payload, authState);
    setResult(report);
    setIsFallback(fb);
    setSaved(false);
    setPhase('generated');
  }

  function onClickGenerate() {
    if (!payload) return;
    if (!hasApa) { setShowAferAviso(true); return; }
    void runGenerate();
  }

  async function handleSave() {
    if (!project || !result || !payload || saving || saved) return;
    setSaving(true);
    const content: ProjectReportContent = {
      report_type: payload.reportType,
      complete_cycles: payload.completeCycles,
      summary: cleanSection(result.section_panorama).slice(0, 100),
      section_panorama: result.section_panorama,
      section_quality: result.section_quality,
      section_result: result.section_result,
      section_critique: result.section_critique,
      section_next: result.section_next,
      is_fallback: isFallback,
      generated_at: new Date().toISOString(),
    };
    try {
      await saveProjectReport(project.id, content, project.scenario_type);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  // Exportação de PDF — inline nesta etapa; extraída para src/lib/reportPdf.ts na Etapa 5.
  async function handleExportPdf() {
    if (!result || !project) return;
    const content: ProjectReportContent = {
      report_type: reportType,
      complete_cycles: completeCycles,
      summary: '',
      section_panorama: result.section_panorama,
      section_quality: result.section_quality,
      section_result: result.section_result,
      section_critique: result.section_critique,
      section_next: result.section_next,
      is_fallback: isFallback,
      generated_at: new Date().toISOString(),
    };
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    let y = margin;
    const guard = () => { if (y > pageH - margin) { pdf.addPage(); y = margin; } };
    const addLine = (text: string, size: number, bold: boolean) => {
      guard();
      pdf.setFontSize(size);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, pageW - margin * 2);
      lines.forEach((l: string) => { guard(); pdf.text(l, margin, y); y += size * 1.4; });
    };
    addLine(`RELATÓRIO CONSULTIVO — ${project.name.toUpperCase()}`, 16, true);
    addLine(`Gerado em ${new Date(content.generated_at).toLocaleDateString('pt-BR')}`, 9, false);
    y += 12;
    const pdfSections: [string, string][] = [
      ['1. PANORAMA DO PROJETO', cleanSection(content.section_panorama)],
      ['2. QUALIDADE DO DIAGNÓSTICO', cleanSection(content.section_quality)],
      ['3. RESULTADO E APRENDIZADO', cleanSection(content.section_result)],
      ['4. CRÍTICAS CONSTRUTIVAS', cleanSection(content.section_critique)],
      ['5. SUGESTÕES PARA O PRÓXIMO CICLO', cleanSection(content.section_next)],
    ];
    pdfSections.forEach(([label, text]) => {
      y += 8; guard();
      addLine(label, 11, true);
      addLine(text, 11, false);
      y += 8;
    });
    if (content.is_fallback) addLine('* Relatório gerado localmente — IA indisponível no momento.', 9, false);
    const fileName = `relatorio-${new Date(content.generated_at).toISOString().slice(0, 10)}.pdf`;
    if (Capacitor.isNativePlatform()) {
      const blob = pdf.output('blob');
      const reader = new FileReader();
      reader.onload = async () => {
        try { await Share.share({ title: 'Relatório Consultivo', url: reader.result as string }); }
        catch { /* cancelamento silencioso */ }
      };
      reader.readAsDataURL(blob);
    } else {
      pdf.save(fileName);
    }
  }

  const showFooter = phase === 'generated' || phase === 'viewing_saved';
  const headerTitle = phase === 'viewing_saved' || phase === 'generated' || phase === 'ready'
    ? TITLE_BY_TYPE[reportType]
    : 'Relatório Consultivo';

  return (
    <div className="min-h-screen pb-48" style={{ backgroundColor: '#070C12' }}>
      <header
        className="sticky top-0 z-10 border-b border-border"
        style={{ backgroundColor: '#070C12' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 max-w-md mx-auto">
          <BackButton />
          <div className="flex-1 min-w-0">
            <h1 className="text-heading font-semibold text-foreground truncate">{headerTitle}</h1>
            {project && (
              <p className="text-label text-muted-foreground truncate">{project.name}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Ajuda: o que é o Relatório Consultivo"
            onClick={() => setOpenHelp((v) => (v === 'main' ? null : 'main'))}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded shrink-0 flex items-center gap-1"
          >
            {openHelp === 'main' ? <X className="size-3.5" /> : <CircleHelp className="size-3.5" />}
            <span className="text-label">Ajuda</span>
          </button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto space-y-4">

        {/* CircleHelp principal */}
        {openHelp === 'main' && (
          <div className="rounded-md border border-border bg-card p-4 space-y-2">
            <p className="text-small font-semibold text-foreground">O que é o Relatório Consultivo?</p>
            <p className="text-small text-muted-foreground leading-relaxed">
              A IA lê todo o histórico do seu projeto — fatos, gargalos, IMV, resultado e princípios — e entrega uma análise completa como um consultor externo faria.
            </p>
            <p className="text-small text-muted-foreground leading-relaxed">
              Quanto mais completo o ciclo (com Aferição registrada), mais rica é a análise.
            </p>
            <p className="text-small text-muted-foreground leading-relaxed">
              O relatório fica salvo no histórico do projeto para você comparar a evolução ao longo do tempo.
            </p>
            <p className="text-small text-muted-foreground leading-relaxed">
              Usuários do plano pago podem gerar a cada 7 dias. Plano gratuito: a cada 15 dias.
            </p>
          </div>
        )}

        {/* Card contextual do projeto */}
        {(phase === 'ready' || phase === 'generated' || phase === 'viewing_saved') && project && (
          <div className="rounded-md bg-card border-l-[3px] border-brand-blue px-4 py-3">
            <p className="text-small font-medium text-foreground truncate">{project.name}</p>
            <p className="text-label text-muted-foreground">
              {TITLE_BY_TYPE[reportType]} · {completeCycles} ciclo{completeCycles === 1 ? '' : 's'} completo{completeCycles === 1 ? '' : 's'}
            </p>
          </div>
        )}

        {/* Loading inicial */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="size-8 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
            <p className="text-body text-muted-foreground">Carregando…</p>
          </div>
        )}

        {/* Sem projeto */}
        {phase === 'no_project' && (
          <ErrorState
            title="Projeto não encontrado"
            description="Verifique se o projeto existe e tente novamente."
            onBack={() => navigate({ to: '/' })}
          />
        )}

        {/* Sem IMV */}
        {phase === 'no_imv' && (
          <ErrorState
            title="Nenhuma IMV registrada"
            description={'O Relatório Consultivo precisa de pelo menos uma IMV (Formato P) registrada para ter o que analisar.\nRegistre uma IMV e volte aqui.'}
            onBack={() => navigate({ to: '/' })}
          />
        )}

        {/* Pronto para gerar — ou cooldown */}
        {phase === 'ready' && (
          cooldown.blocked ? (
            <div className="rounded-md border border-border bg-card p-4 space-y-2">
              <p className="text-body text-foreground font-medium">Relatório em intervalo</p>
              <p className="text-[12px] text-muted-foreground">
                Próximo relatório disponível em{' '}
                {cooldown.nextAvailableAt?.toLocaleDateString('pt-BR')}
              </p>
              {!cooldown.isPaidPlan && (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/settings' })}
                  className="text-[12px] text-brand-blue hover:underline text-left"
                >
                  Usuários do plano pago podem gerar a cada 7 dias.
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <Button onClick={onClickGenerate} className="w-full gap-2">
                <ClipboardList className="size-4" /> Gerar Relatório Consultivo
              </Button>
              <p className="text-[12px] text-muted-foreground text-center">
                A IA vai analisar todo o histórico do seu projeto. Pode levar até 30 segundos.
              </p>
            </div>
          )
        )}

        {/* Gerando */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="size-8 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
            <p className="text-body text-foreground">Analisando o histórico do projeto…</p>
            <div className="w-full max-w-[200px] h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 bg-brand-blue rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
            </div>
            <p className="text-label text-muted-foreground">10 a 30 segundos.</p>
          </div>
        )}

        {/* Gerado / Visualização de salvo — 5 seções */}
        {(phase === 'generated' || phase === 'viewing_saved') && result && (
          <div className="space-y-3">
            {isFallback && (
              <div className="rounded-md border border-brand-amber/40 bg-brand-amber/5 p-3 flex items-start gap-2">
                <AlertTriangle className="size-4 text-brand-amber shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-small text-foreground/90 leading-relaxed">
                    Relatório gerado localmente — IA temporariamente indisponível. As análises qualitativas estão simplificadas.
                  </p>
                  {phase === 'generated' && (
                    <button
                      type="button"
                      onClick={() => void runGenerate()}
                      className="text-label text-brand-blue hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="size-3" /> Tentar novamente com IA
                    </button>
                  )}
                </div>
              </div>
            )}

            {SECTIONS.map((s) => (
              <div key={s.key} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="size-[22px] rounded-full bg-brand-blue text-white text-label font-semibold flex items-center justify-center shrink-0">
                    {s.num}
                  </span>
                  <span className="flex-1 min-w-0 text-body font-semibold text-foreground">{s.label}</span>
                  <button
                    type="button"
                    aria-label={`Ajuda: ${s.label}`}
                    onClick={() => setOpenHelp((v) => (v === s.num ? null : s.num))}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {openHelp === s.num ? <X className="size-3.5" /> : <CircleHelp className="size-3.5" />}
                  </button>
                </div>
                {openHelp === s.num && (
                  <p className="text-label text-muted-foreground leading-relaxed">{s.help}</p>
                )}
                <p className="text-body text-foreground leading-relaxed whitespace-pre-wrap">
                  {cleanSection(result[s.key])}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Aviso de Aferição incompleta — orientativo, nunca bloqueante */}
      <AlertDialog open={showAferAviso} onOpenChange={setShowAferAviso}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este relatório seria mais completo com a Aferição</AlertDialogTitle>
            <AlertDialogDescription>
              Você ainda não registrou o resultado da sua IMV (Formato A — Aferição). O relatório será gerado com os dados disponíveis, mas ficará mais rico depois de concluir o ciclo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowAferAviso(false); void runGenerate(); }}>
              Gerar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rodapé fixo */}
      {showFooter && result && (
        <div
          className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-3 border-t border-border z-20"
          style={{ backgroundColor: '#070C12' }}
        >
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex gap-3">
              {phase === 'generated' && (
                <Button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="flex-1 gap-2"
                >
                  {saved
                    ? <><Check className="size-4" /> Relatório salvo ✓</>
                    : saving
                    ? <><div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Salvando…</>
                    : <><BookmarkCheck className="size-4" /> Salvar relatório</>}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => void handleExportPdf()}
                className="flex-1 gap-2"
              >
                <FileDown className="size-4" /> Exportar PDF
              </Button>
            </div>
            {phase === 'generated' && !cooldown.blocked && !saved && (
              <button
                type="button"
                onClick={() => void runGenerate()}
                className="w-full text-label text-muted-foreground hover:text-foreground transition-colors"
              >
                Gerar novamente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({
  title, description, onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertCircle className="size-10 text-brand-amber" />
      <div className="space-y-2">
        <p className="text-body text-foreground font-medium">{title}</p>
        <p className="text-small text-muted-foreground whitespace-pre-line">{description}</p>
      </div>
      <Button variant="outline" onClick={onBack} className="mt-2">Voltar</Button>
    </div>
  );
}
