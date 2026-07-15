import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { BackButton } from '@/components/app/BackButton';
import { Button } from '@/components/ui/button';
import { CircleHelp, X, ChevronDown, ChevronUp, Plus, Trash2, ArrowRight } from 'lucide-react';
import type { LeverItem } from '@/lib/register';
import { updateEntryLeverFilter } from '@/lib/register';
import { calcLeverResult, corResultado } from '@/lib/leverFilter';
import { GuestStorage, guestId } from '@/lib/guestStorage';
import { supabase } from '@/lib/supabase';
import { useReadingMode } from '@/hooks/useReadingMode';
import { listProjects, listEntries } from '@/lib/projects';
import type { Project } from '@/types/database';

// ──────────────────────────────────────
// Help content — 1 principal + 5 perguntas
// ──────────────────────────────────────
type HelpKey = 'main' | 'impact' | 'control' | 'effort' | 'repeatability' | 'measurement';

const HELP: Record<HelpKey, { title: string; text: string }> = {
  main: {
    title: 'O que é o Filtro de Alavanca?',
    text: 'O Filtro das 5 Alavancas é do livro Primeiro os Olhos, Depois as Mãos. Antes de criar uma IMV, você avalia a ideia com 5 perguntas. Se ela falha em 2 ou mais, é ruído agora — não porque seja ruim, mas porque não é o momento certo ou o recurso certo.\n\nAvalie até 5 ideias diferentes. A que passar com 0 ou 1 NÃO é sua alavanca real.\n\nO resultado é sempre informativo. Você decide o que fazer com ele.',
  },
  impact: {
    title: 'Q1 — Impacto',
    text: 'Se essa ideia funcionar, o resultado que mais importa aqui vai mudar de verdade? Não levemente — de verdade.',
  },
  control: {
    title: 'Q2 — Controle',
    text: 'Você consegue executar isso com os recursos que tem agora? Tempo, dinheiro, equipe, ferramentas — o que existe hoje.',
  },
  effort: {
    title: 'Q3 — Esforço',
    text: 'O esforço que essa ideia exige é proporcional ao ganho que ela pode trazer? Não compensa esforço alto para ganho pequeno.',
  },
  repeatability: {
    title: 'Q4 — Repetibilidade',
    text: 'Se funcionar, isso pode virar padrão repetível — ou foi apenas condição favorável do momento?',
  },
  measurement: {
    title: 'Q5 — Medição',
    text: 'Você consegue medir se funcionou com um número simples, sem precisar se convencer de que deu certo?',
  },
};

const QUESTIONS: Array<{
  key: keyof Pick<LeverItem, 'impact' | 'control' | 'effort' | 'repeatability' | 'measurement'>;
  label: string;
  helpKey: HelpKey;
}> = [
  { key: 'impact',        label: 'Impacto: muda o resultado de verdade?',    helpKey: 'impact' },
  { key: 'control',       label: 'Controle: consigo executar com o que tenho?', helpKey: 'control' },
  { key: 'effort',        label: 'Esforço: proporcional ao ganho?',           helpKey: 'effort' },
  { key: 'repeatability', label: 'Repetibilidade: pode virar padrão?',        helpKey: 'repeatability' },
  { key: 'measurement',   label: 'Medição: consigo medir sem autoengano?',    helpKey: 'measurement' },
];

const MAX_ITEMS = 5;

// ──────────────────────────────────────
// Route
// ──────────────────────────────────────
export const Route = createFileRoute('/lever-filter')({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : undefined,
    entryId:   typeof s.entryId   === 'string' ? s.entryId   : undefined,
  }),
  component: LeverFilterScreen,
});

// ──────────────────────────────────────
// YesNo — mesmo padrão do FormatP.tsx
// ──────────────────────────────────────
function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={value === true ? 'default' : 'outline'}
        className={value !== true ? 'border-dashed' : ''}
        onClick={() => onChange(true)}
      >
        SIM
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === false ? 'default' : 'outline'}
        onClick={() => onChange(false)}
      >
        NÃO
      </Button>
    </div>
  );
}

function makeItem(): LeverItem {
  return {
    id: guestId(),
    idea: '',
    impact: null,
    control: null,
    effort: null,
    repeatability: null,
    measurement: null,
    result: 'incomplete',
    no_count: 0,
  };
}

// ──────────────────────────────────────
// Screen
// ──────────────────────────────────────
function LeverFilterScreen() {
  const { entryId: urlEntryId, projectId: urlProjectId } = Route.useSearch();
  const readingMode = useReadingMode();

  // effectiveEntryId: vem da URL (fluxo FormatO) ou é resolvido ao selecionar projeto (modo avulso)
  const [effectiveEntryId, setEffectiveEntryId] = useState<string | undefined>(urlEntryId);
  // isAvulso: só quando não há nenhum contexto de projeto na URL (acesso puro pela Bússola)
  const isAvulso = !urlEntryId && !urlProjectId;

  const [items,      setItems]      = useState<LeverItem[]>(() => {
    const idea = sessionStorage.getItem('__recombinationIdea');
    if (idea) {
      sessionStorage.removeItem('__recombinationIdea');
      return [{ ...makeItem(), idea }];
    }
    return [];
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bottleneck, setBottleneck] = useState<string>('');
  const [helpKey,    setHelpKey]    = useState<HelpKey | null>(null);
  const [saving,     setSaving]     = useState(false);

  // ── Modo avulso: seletor de projeto ──
  const [projects,           setProjects]           = useState<Project[]>([]);
  const [loadingProjects,    setLoadingProjects]    = useState(false);
  const [selectedProjectId,  setSelectedProjectId]  = useState<string>('');
  const [selectedProjectName,setSelectedProjectName]= useState<string>('');
  const [noOEntry,           setNoOEntry]           = useState(false); // projeto sem structured_O

  useEffect(() => {
    if (!isAvulso) return;
    setLoadingProjects(true);
    listProjects().then((projs) => {
      setProjects(projs.filter((p) => !['archived', 'concluded'].includes(p.state)));
      setLoadingProjects(false);
    });
  }, [isAvulso]);

  // Quando projeto selecionado: busca structured_O mais recente para contexto e entryId
  useEffect(() => {
    if (!selectedProjectId) {
      setEffectiveEntryId(undefined);
      setBottleneck('');
      setNoOEntry(false);
      setItems([]);
      return;
    }
    const proj = projects.find((p) => p.id === selectedProjectId);
    setSelectedProjectName(proj?.name ?? '');

    listEntries(selectedProjectId).then((entries) => {
      const oEntry = entries.find((e) => e.entry_type === 'structured_O');
      if (oEntry) {
        setEffectiveEntryId(oEntry.id);
        setNoOEntry(false);
        const c = oEntry.content as Record<string, unknown>;
        setBottleneck((c.bottleneck as string) ?? '');
        const lf = c.lever_filter as LeverItem[] | undefined;
        if (lf && lf.length > 0) setItems(lf);
        else setItems([]);
      } else {
        setEffectiveEntryId(undefined);
        setNoOEntry(true);
        setBottleneck('');
        setItems([]);
      }
    });
  }, [selectedProjectId, projects]);

  // Quando FormatO ainda não foi salvo: projectId na URL mas sem entryId — carrega structured_O do projeto
  useEffect(() => {
    if (!urlProjectId || urlEntryId) return;
    listEntries(urlProjectId).then((entries) => {
      const oEntry = entries.find((e) => e.entry_type === 'structured_O');
      if (oEntry) {
        setEffectiveEntryId(oEntry.id);
        const c = oEntry.content as Record<string, unknown>;
        setBottleneck((c.bottleneck as string) ?? '');
        const lf = c.lever_filter as LeverItem[] | undefined;
        if (lf && lf.length > 0) setItems(lf);
      }
    });
  }, [urlProjectId, urlEntryId]);

  // Carrega entry por URL (fluxo FormatO linkado)
  useEffect(() => {
    if (!urlEntryId) return;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      let content: Record<string, unknown> | null = null;
      if (session) {
        const { data } = await supabase
          .from('entries')
          .select('content')
          .eq('id', urlEntryId)
          .single();
        content = (data?.content as Record<string, unknown>) ?? null;
      } else {
        const entry = GuestStorage.getEntries().find((e) => e.id === urlEntryId);
        content = (entry?.content as Record<string, unknown>) ?? null;
      }
      if (!content) return;
      setBottleneck((content.bottleneck as string) ?? '');
      const lf = content.lever_filter as LeverItem[] | undefined;
      if (lf && lf.length > 0) setItems(lf);
    }
    void load();
  }, [urlEntryId]);

  // ── Item helpers ──
  function updateItem(id: string, patch: Partial<LeverItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const merged = { ...item, ...patch };
        const { result, no_count } = calcLeverResult(merged);
        return { ...merged, result, no_count };
      }),
    );
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) return;
    const item = makeItem();
    setItems((prev) => [...prev, item]);
    setExpandedId(item.id);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
  }

  // ── Save ──
  async function handleSave() {
    setSaving(true);
    try {
      if (effectiveEntryId && items.length > 0) {
        await updateEntryLeverFilter(effectiveEntryId, items);
      }
    } finally {
      setSaving(false);
      window.history.back();
    }
  }

  // ── Usar ideia como base da IMV ──
  async function handleUseAsIMV(item: LeverItem) {
    if (saving) return;
    setSaving(true);
    try {
      if (effectiveEntryId && items.length > 0) {
        await updateEntryLeverFilter(effectiveEntryId, items);
      }
    } finally {
      setSaving(false);
    }
    if (item.idea.trim()) {
      sessionStorage.setItem('__leverSuggestion', item.idea.trim());
    }
    window.history.back();
  }

  // ── Derived ──
  const passedCount = items.filter((i) => i.result === 'lever').length;

  return (
    <div className="flex flex-col min-h-screen pb-48" style={{ backgroundColor: '#070C12' }}>

      {/* ── Header ── */}
      <header
        className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/20 sticky top-0 z-10"
        style={{ backgroundColor: '#070C12' }}
      >
        <BackButton />
        <h1 className="text-heading font-semibold text-op-white flex-1">Filtro de Alavanca</h1>
        <button
          type="button"
          onClick={() => setHelpKey('main')}
          className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors"
        >
          <CircleHelp className="size-3.5" />
          Ajuda
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 px-4 py-4 max-w-md mx-auto w-full space-y-4">

        {/* ── Seletor de projeto (modo avulso — Bússola) ── */}
        {isAvulso && (
          <div
            className="rounded-lg border border-op-gray/20 p-3 space-y-2"
            style={{ backgroundColor: '#0F1923' }}
          >
            <p className="text-label text-op-gray uppercase tracking-wide">
              Para qual projeto?
            </p>
            {loadingProjects ? (
              <p className="text-small text-op-gray">Carregando projetos…</p>
            ) : projects.length === 0 ? (
              <p className="text-small text-op-gray italic">
                Nenhum projeto ativo encontrado.
              </p>
            ) : (
              <select
                className="w-full rounded-lg px-3 py-2 text-body text-op-white border border-op-gray/30 focus:outline-none focus:border-brand-blue"
                style={{ backgroundColor: '#1B2A4A' }}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">— Selecione um projeto —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            {noOEntry && selectedProjectId && (
              <p className="text-small leading-snug" style={{ color: '#D97706' }}>
                Este projeto ainda não tem um Formato O (Organização). Para salvar o filtro aqui, registre um Formato O primeiro.
              </p>
            )}
          </div>
        )}

        {/* ── Instrução + âncora contextual ── */}
        <div className="space-y-3">
          {/* Regra de ouro — sempre visível */}
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#0F1923' }}
          >
            <p className="text-small text-op-white/80 leading-snug">
              Responda as 5 perguntas para cada ideia.{' '}
              <span className="text-brand-red font-medium">2 ou mais NÃOs</span>
              {' '}= ruído agora.{' '}
              <span className="text-brand-green font-medium">0 ou 1 NÃO</span>
              {' '}= alavanca real.
            </p>
          </div>

          {/* Âncora: gargalo que o usuário quer superar */}
          {effectiveEntryId && (
            <div
              className="rounded-lg p-3 border-l-2"
              style={{ backgroundColor: '#1B2A4A', borderLeftColor: '#2563EB' }}
            >
              <p className="text-[10px] text-op-gray uppercase tracking-wide mb-1.5">
                Avaliando ideias para superar:
              </p>
              {bottleneck ? (
                <p className="text-small text-op-white font-medium leading-snug">
                  {bottleneck}
                </p>
              ) : (
                <p className="text-small text-op-gray italic leading-snug">
                  Gargalo não preenchido no R3 do Formato O.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Lista de itens ── */}
        <div className="space-y-2">
          {items.map((item, index) => {
            const isExpanded = expandedId === item.id;
            const { result } = calcLeverResult(item);
            const ideaCount  = item.idea.length;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-op-gray/20 overflow-hidden"
                style={{ backgroundColor: '#0F1923' }}
              >
                {/* Collapsed header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {/* Número */}
                  <span
                    className="flex-shrink-0 size-[22px] rounded-full flex items-center justify-center text-label font-semibold text-white"
                    style={{ backgroundColor: 'var(--color-brand-blue, #2563EB)' }}
                  >
                    {index + 1}
                  </span>
                  {/* Texto da ideia */}
                  <span className="flex-1 text-body text-op-white truncate min-w-0">
                    {item.idea
                      ? item.idea
                      : <span className="text-op-gray italic">Nova ideia…</span>
                    }
                  </span>
                  {/* Badge resultado */}
                  <span
                    className={`text-label font-semibold flex-shrink-0 ${
                      result === 'lever' ? 'text-brand-green'
                      : result === 'noise' ? 'text-brand-red'
                      : 'text-op-gray'
                    }`}
                  >
                    {result === 'lever' ? 'ALAVANCA' : result === 'noise' ? 'RUÍDO' : '—'}
                  </span>
                  {isExpanded
                    ? <ChevronUp   className="size-3.5 text-op-gray flex-shrink-0" />
                    : <ChevronDown className="size-3.5 text-op-gray flex-shrink-0" />
                  }
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-op-gray/10 pt-3">

                    {/* Campo da ideia */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-label text-op-gray">A ideia a avaliar</label>
                        {ideaCount > 120 && (
                          <span className="text-label text-op-gray">{ideaCount}/150</span>
                        )}
                      </div>
                      <textarea
                        className="w-full rounded-lg px-3 py-2 text-body text-op-white bg-op-navy border border-op-gray/30 resize-none focus:outline-none focus:border-brand-blue placeholder:text-op-gray/50"
                        rows={2}
                        maxLength={150}
                        placeholder="Descreva a ideia a avaliar…"
                        value={item.idea}
                        onChange={(e) => updateItem(item.id, { idea: e.target.value })}
                      />
                    </div>

                    {/* 5 Perguntas */}
                    {QUESTIONS.map((q) => (
                      <div key={q.key} className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-body font-semibold text-op-white flex-1 leading-snug">
                            {q.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => setHelpKey(q.helpKey)}
                            className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors flex-shrink-0 mt-0.5"
                          >
                            <CircleHelp className="size-3.5" />
                          </button>
                        </div>
                        <YesNo
                          value={item[q.key] as boolean | null}
                          onChange={(v) => updateItem(item.id, { [q.key]: v })}
                        />
                      </div>
                    ))}

                    {/* Resultado em tempo real */}
                    {result !== 'incomplete' && (
                      <p className={`text-small font-semibold ${corResultado(result)}`}>
                        {result === 'lever'
                          ? `ALAVANCA — ${item.no_count <= 1 ? item.no_count : 1} NÃO. Pronta para virar IMV.`
                          : `RUÍDO — ${item.no_count} NÃOs. Descarte agora.`
                        }
                      </p>
                    )}

                    {/* CTA — só aparece para ALAVANCA */}
                    {result === 'lever' && (
                      <button
                        type="button"
                        onClick={() => void handleUseAsIMV(item)}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-small font-medium border transition-colors disabled:opacity-50"
                        style={{
                          color: '#16A34A',
                          borderColor: 'rgba(22,163,74,0.35)',
                          backgroundColor: 'rgba(22,163,74,0.07)',
                        }}
                      >
                        <ArrowRight className="size-3.5" />
                        Usar esta ideia como base da IMV
                      </button>
                    )}

                    {/* Lixeira */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-1 text-label text-brand-red hover:underline"
                    >
                      <Trash2 className="size-3.5" />
                      Remover ideia
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botão adicionar */}
        {items.length < MAX_ITEMS && (
          <Button
            type="button"
            variant="ghost"
            className="w-full border border-dashed border-op-gray/30 text-op-gray hover:text-op-white"
            onClick={addItem}
          >
            <Plus className="size-4 mr-1" />
            Avaliar outra ideia
          </Button>
        )}
      </div>

      {/* ── Rodapé fixo — bottom-16 para limpar BottomNav (h-16); bottom-28 em Modo Leitura (ReadingModeBanner adiciona ~36px acima do nav) ── */}
      <div
        className={`fixed ${readingMode ? 'bottom-28' : 'bottom-16'} left-0 right-0 px-4 py-4 border-t border-op-gray/20 space-y-3`}
        style={{ backgroundColor: '#070C12' }}
      >
        {items.length > 0 && (
          <p
            className={`text-small text-center ${
              passedCount > 0 ? 'text-brand-green' : 'text-brand-red'
            }`}
          >
            {passedCount} de {items.length}{' '}
            {items.length === 1 ? 'ideia passou' : 'ideias passaram'} o filtro
          </p>
        )}
        {isAvulso && !selectedProjectId ? (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => window.history.back()}
          >
            Fechar sem salvar
          </Button>
        ) : isAvulso && noOEntry ? (
          <Button className="w-full" disabled>
            Selecione um projeto com Formato O para salvar
          </Button>
        ) : (
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving
              ? 'Salvando…'
              : isAvulso
              ? `Salvar em "${selectedProjectName}"`
              : 'Salvar e voltar ao projeto'}
          </Button>
        )}
      </div>

      {/* ── Help bottom sheet ── */}
      {helpKey && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setHelpKey(null)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">
                {HELP[helpKey].title}
              </h3>
              <button
                type="button"
                onClick={() => setHelpKey(null)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            {HELP[helpKey].text.split('\n\n').map((para, i) => (
              <p key={i} className="text-body text-op-white leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
