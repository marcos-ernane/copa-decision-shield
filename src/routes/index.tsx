// HomeScreen — lista de projetos ordenada e Principle Recall passivo (REQ-NAV-05).

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Plus, Settings as SettingsIcon, Inbox } from 'lucide-react';
import { GuestStorage } from '@/lib/guestStorage';
import { wasAuthenticated } from '@/lib/authFlags';
import { getInboxCount } from '@/lib/universalCapture';
import { supabase } from '@/lib/supabase';
import { listProjects, listPrinciples, updateProject, listAllEntries, deleteProject } from '@/lib/projects';
import { sortProjects } from '@/lib/projectState';
import { ProjectCard } from '@/components/project/ProjectCard';
import { PactContextBanner } from '@/components/pact/PactContextBanner';
import { CommunityLink } from '@/components/project/CommunityLink';
import { RegistrationNudge } from '@/components/RegistrationNudge';
import { BottleneckBankSheet } from '@/components/project/BottleneckBankSheet';
import { usePendingBottlenecks } from '@/hooks/usePendingBottlenecks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Project, Principle, Entry } from '@/types/database';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [principles, setPrinciples] = useState<Record<string, Principle | null>>({});
  const [name, setName] = useState('');
  const [communityLink, setCommunityLink] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [showConcluded, setShowConcluded] = useState(false);
  const [showActive, setShowActive] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [showHelpConcluded, setShowHelpConcluded] = useState(false);
  const [showHelpActive, setShowHelpActive] = useState(false);
  const [showHelpPaused, setShowHelpPaused] = useState(false);
  const [showHelpGargalos, setShowHelpGargalos] = useState(false);
  const [showBottleneckBank, setShowBottleneckBank] = useState(false);
  const [showDay7Nudge, setShowDay7Nudge] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');

  const { pending: pendingBottlenecks, dismiss: dismissBottleneck } = usePendingBottlenecks(entries, projects);

  useEffect(() => {
    async function loadInbox() {
      const n = await getInboxCount();
      setInboxCount(n);
    }
    void loadInbox();
    const handler = () => void loadInbox();
    window.addEventListener('aop:inbox-updated', handler);
    return () => window.removeEventListener('aop:inbox-updated', handler);
  }, []);

  useEffect(() => {
    void (async () => {
      // Usuário autenticado: sessão Supabase tem precedência — nunca vai para onboarding.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, community_link')
          .eq('id', session.user.id)
          .maybeSingle();
        const p = data as { display_name?: string; community_link?: string } | null;
        setName(p?.display_name ?? session.user.email ?? 'Operador');
        setCommunityLink(p?.community_link ?? null);
        void load();
        return;
      }
      // Usuário guest: verifica onboarding no localStorage.
      const profile = GuestStorage.getProfile();
      if (!profile || !profile.onboarding_completed) {
        // Usuário que já teve conta e saiu → tela de retorno, não onboarding.
        if (wasAuthenticated()) {
          navigate({ to: '/login' });
        } else {
          navigate({ to: '/onboarding' });
        }
        return;
      }
      setName(profile.display_name);
      setCommunityLink(profile.community_link ?? null);
      // [REQ-AUTH-03] Momento 3: 7 dias como guest → nudge de cadastro (uma vez por sessão)
      if (GuestStorage.daysSinceGuestStart() >= 7) {
        const KEY = 'aop.nudge3_session_shown';
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, '1');
          setShowDay7Nudge(true);
        }
      }
      void load();
    })();
  }, [navigate]);

  async function load() {
    const [list, allEntries] = await Promise.all([listProjects(), listAllEntries()]);
    setProjects(list);
    setEntries(allEntries);
    // Principle recall: para cada projeto blocked/new, busca 1 princípio
    const recall: Record<string, Principle | null> = {};
    await Promise.all(
      list.map(async (p) => {
        if (p.state === 'blocked' || p.state === 'new') {
          const principles = await listPrinciples(p.id);
          recall[p.id] = principles[0] ?? null;
        }
      }),
    );
    setPrinciples(recall);
    setReady(true);
  }

  async function handleArchive() {
    if (!archivingId) return;
    await updateProject(archivingId, {
      archived_at: new Date().toISOString(),
      state: 'archived',
    });
    setArchivingId(null);
    void load();
  }

  async function handleDelete() {
    if (!deletingId) return;
    await deleteProject(deletingId);
    setDeletingId(null);
    void load();
  }

  async function handlePause() {
    if (!pausingId) return;
    const reason = pauseReason.trim() || 'Pausado';
    await updateProject(pausingId, { state: 'paused', pause_reason: reason });
    setPausingId(null);
    setPauseReason('');
    void load();
  }

  async function handleResume(id: string) {
    await updateProject(id, { state: 'new', pause_reason: '' });
    void load();
  }

  if (!ready) return null;

  const { active, concluded } = sortProjects(projects);
  const trueActive = active.filter((p) => p.state !== 'paused');
  const pausedProjects = active.filter((p) => p.state === 'paused');

  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: "#070C12", minHeight: "100vh" }}>
      <header className="px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <p className="text-label text-op-gray uppercase">Operador</p>
          <h1 className="text-title text-op-white mt-1">{name || 'Operador'}</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: '/settings' })}
          className="p-2 -mr-2 rounded-md hover:bg-op-navy"
          aria-label="Configurações"
        >
          <SettingsIcon className="size-5 text-op-gray" />
        </button>
      </header>

      <main className="px-6 space-y-3">
        <Link
          to="/project/new"
          className="flex items-center justify-center gap-2 rounded-lg py-4 text-body font-semibold text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'var(--color-brand-blue)' }}
        >
          <Plus className="size-5" />
          Novo projeto
        </Link>

        {/* PROJETOS ATIVOS — colapsável */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowActive((s) => !s)}
              className="flex-1 flex items-center gap-2 text-small font-medium rounded-md border border-op-cyan/30 bg-op-navy px-4 py-3 text-left hover:opacity-80 transition-opacity min-w-0"
              aria-expanded={showActive}
              aria-label="Expandir projetos ativos"
            >
              <span className="uppercase tracking-wide flex-1 text-green-600">
                Projetos ativos
              </span>
              {trueActive.length > 0 && (
                <>
                  <span className="text-label text-op-cyan shrink-0">Ver →</span>
                  <span className="text-label font-semibold text-op-cyan bg-op-cyan/10 border border-op-cyan/30 rounded-full px-2 py-0.5 leading-none shrink-0">
                    {trueActive.length}
                  </span>
                </>
              )}
              <span className={`text-label shrink-0 transition-transform duration-200 ${showActive ? 'text-op-white' : 'text-op-gray'}`}>
                {showActive ? '▾' : '▸'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowHelpActive(true)}
              className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors shrink-0"
              aria-label="O que são Projetos Ativos?"
            >
              ⓘ
            </button>
          </div>

          {showActive && (
            <div className="space-y-3 pt-1">
              {trueActive.length === 0 ? (
                <p className="text-small text-op-gray py-8 text-center">
                  Nenhum projeto em campo.
                </p>
              ) : (
                trueActive.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    recallPrinciple={principles[p.id]}
                    onEdit={() => navigate({ to: '/project/$id/edit', params: { id: p.id } })}
                    onConclude={() => navigate({ to: '/project/$id/conclude', params: { id: p.id } })}
                    onArchive={() => setArchivingId(p.id)}
                    onPause={() => setPausingId(p.id)}
                    onDelete={() => setDeletingId(p.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Pacto — presença contextual [PRD-ITEM-03 Etapa 4] */}
        <PactContextBanner projects={projects} entries={entries} />

        {pendingBottlenecks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBottleneckBank(true)}
              className="flex-1 flex items-center justify-between gap-3 rounded-md border border-op-cyan/30 bg-op-navy px-4 py-3 text-left hover:bg-op-navy-elevated transition-colors min-w-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-small text-op-cyan font-medium uppercase tracking-wide">Gargalos pendentes</p>
                <p className="text-label text-op-gray truncate">
                  {pendingBottlenecks.length !== 1
                    ? 'Podem se transformar em novos projetos'
                    : 'Pode se transformar em um novo projeto'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-label text-op-cyan">Ver →</span>
                <span className="text-label font-semibold text-op-cyan bg-op-cyan/10 border border-op-cyan/30 rounded-full px-2 py-0.5 leading-none">
                  {pendingBottlenecks.length}
                </span>
                <span className="text-label text-op-gray">▸</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setShowHelpGargalos(true)}
              className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors shrink-0"
              aria-label="O que são Gargalos Pendentes?"
            >
              ⓘ
            </button>
          </div>
        )}

        {/* PROJETOS PAUSADOS — colapsável */}
        {pausedProjects.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPaused((s) => !s)}
                className="flex-1 flex items-center gap-2 text-small font-medium rounded-md border border-op-cyan/30 bg-op-navy px-4 py-3 text-left hover:opacity-80 transition-opacity min-w-0"
                aria-expanded={showPaused}
                aria-label="Expandir projetos pausados"
              >
                <span className="uppercase tracking-wide flex-1 text-op-gray">
                  Projetos pausados
                </span>
                <span className="text-label text-op-cyan shrink-0">Ver →</span>
                <span className="text-label font-semibold text-op-cyan bg-op-cyan/10 border border-op-cyan/30 rounded-full px-2 py-0.5 leading-none shrink-0">
                  {pausedProjects.length}
                </span>
                <span className={`text-label shrink-0 transition-transform duration-200 ${showPaused ? 'text-op-white' : 'text-op-gray'}`}>
                  {showPaused ? '▾' : '▸'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowHelpPaused(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors shrink-0"
                aria-label="O que são Projetos Pausados?"
              >
                ⓘ
              </button>
            </div>

            {showPaused && (
              <div className="space-y-3 pt-1">
                {pausedProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    recallPrinciple={principles[p.id]}
                    onEdit={() => navigate({ to: '/project/$id/edit', params: { id: p.id } })}
                    onConclude={() => navigate({ to: '/project/$id/conclude', params: { id: p.id } })}
                    onArchive={() => setArchivingId(p.id)}
                    onResume={() => void handleResume(p.id)}
                    onDelete={() => setDeletingId(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {concluded.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConcluded((s) => !s)}
                className="flex-1 flex items-center gap-2 text-small font-medium rounded-md border border-op-cyan/30 bg-op-navy px-4 py-3 text-left transition-opacity hover:opacity-80 min-w-0"
                style={{ color: 'var(--color-brand-red)' }}
              >
                <span className="uppercase tracking-wide flex-1">Projetos já concluídos</span>
                <span className="text-label text-op-cyan shrink-0">Ver →</span>
                <span className="text-label font-semibold text-op-cyan bg-op-cyan/10 border border-op-cyan/30 rounded-full px-2 py-0.5 leading-none shrink-0">
                  {concluded.length}
                </span>
                <span className={`text-label shrink-0 transition-transform duration-200 ${showConcluded ? 'text-op-white' : 'text-op-gray'}`}>
                  {showConcluded ? '▾' : '▸'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowHelpConcluded(true)}
                className="text-label text-op-cyan border border-op-cyan/40 rounded-full w-5 h-5 flex items-center justify-center leading-none hover:bg-op-cyan/10 transition-colors shrink-0"
                aria-label="O que são Projetos Concluídos?"
              >
                ⓘ
              </button>
            </div>
            {showConcluded && (
              <div className="space-y-3">
                {concluded.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {inboxCount > 0 && (
          <Link
            to="/inbox"
            className="w-full flex items-center justify-between gap-3 rounded-md border border-op-cyan/30 bg-op-navy px-4 py-3 hover:bg-op-navy-elevated transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Inbox className="size-4 text-op-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-small text-op-cyan font-medium">
                  {inboxCount} {inboxCount === 1 ? 'captura pendente' : 'capturas pendentes'} no Inbox
                </p>
                <p className="text-label text-op-gray">Processar e transformar em COPA →</p>
              </div>
            </div>
          </Link>
        )}

        <CommunityLink url={communityLink} />
      </main>

      {/* Help sheet: Projetos Já Concluídos */}
      {showHelpConcluded && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setShowHelpConcluded(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Projetos Já Concluídos</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que é</p>
              <p className="text-body text-op-white">
                Projetos em que o Norte foi alcançado — o objetivo principal foi atingido. Cada projeto concluído gera automaticamente um capítulo no <span className="font-semibold">Manual do Operador</span>, preservando o que aconteceu, o que funcionou, o que não funcionou e o aprendizado extraído.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como concluir um projeto</p>
              <p className="text-body text-op-white">
                No Dashboard do projeto, acesse o menu <span className="font-semibold">···</span> no canto superior direito e escolha <span className="font-semibold">Concluir projeto</span>. O app guia por 3 telas: confirmação do Norte alcançado · o que aconteceu · prévia do capítulo gerado.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como navegar</p>
              <p className="text-body text-op-white">
                Toque em <span className="font-semibold">+</span> para expandir a lista. Toque em qualquer projeto para acessar o Dashboard — o histórico completo e o capítulo do Manual permanecem acessíveis e podem ser consultados a qualquer momento.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Concluído vs. Arquivado</p>
              <p className="text-body text-op-white">
                Concluído significa que o Norte foi alcançado — há um capítulo documentado e princípios extraídos. Arquivado significa que o projeto foi encerrado sem atingir o Norte. Ambos preservam todos os dados, mas apenas os concluídos geram capítulo no Manual.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpConcluded(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Help sheet: Gargalos Pendentes */}
      {showHelpGargalos && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setShowHelpGargalos(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Gargalos Pendentes</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que é</p>
              <p className="text-body text-op-white">
                Gargalos são os principais obstáculos identificados durante os seus registros COPA — fricções específicas que estavam impedindo o avanço de um projeto e foram nomeadas na fase de Organização ou Aferição. Quando superados, frequentemente revelam uma nova frente de trabalho.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como surgem</p>
              <p className="text-body text-op-white">
                Cada vez que você registra a fase de Organização (mapeando fricções) ou conclui uma Aferição (identificando o próximo gargalo), o app registra o principal obstáculo declarado. Se ele ainda não foi resolvido nem transformado em ação, aparece aqui como pendente.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que fazer com eles</p>
              <p className="text-body text-op-white">
                Toque em <span className="font-semibold">Ver →</span> para abrir o Banco de Gargalos. Lá você pode transformar um gargalo em um novo projeto, descartá-lo se não for mais relevante, ou mantê-lo como referência para uma decisão futura.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Observação</p>
              <p className="text-body text-op-white">
                Gargalos pendentes não exigem ação imediata — são um convite à reflexão. O app os mantém visíveis para que você decida o momento certo de agir, sem pressão.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpGargalos(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Help sheet: Projetos Ativos */}
      {showHelpActive && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setShowHelpActive(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Projetos Ativos</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que é</p>
              <p className="text-body text-op-white">
                Projetos em que você está trabalhando — capturando informações, organizando recursos, testando uma ação ou avaliando resultados. Cada projeto tem um Norte claro: a condição que indica que ele melhorou de verdade.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Estados possíveis</p>
              <p className="text-body text-op-white">
                Um projeto ativo pode estar em diferentes fases: <span className="font-semibold">Novo</span> (sem registros ainda), <span className="font-semibold">Capturando</span>, <span className="font-semibold">Organizando</span>, <span className="font-semibold">Em teste</span> (com uma IMV ativa) ou <span className="font-semibold">Travado</span> (sem registro há mais de 7 dias). O app calcula o estado automaticamente com base nos seus registros — você não altera isso manualmente.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como navegar</p>
              <p className="text-body text-op-white">
                Toque em qualquer projeto para abrir o <span className="font-semibold">Dashboard</span>, que mostra a fase atual, o gargalo em foco, o progresso da semana e o histórico de registros. A partir do Dashboard você registra, analisa e pode concluir o projeto.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Dica de uso</p>
              <p className="text-body text-op-white">
                Projetos travados aparecem no topo da lista — são os que mais precisam de atenção. Para pausar temporariamente, acesse o menu <span className="font-semibold">···</span> no Dashboard do projeto.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpActive(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Help sheet: Projetos Pausados */}
      {showHelpPaused && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setShowHelpPaused(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-op-navy border border-op-gray/30 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-op-gray/40 rounded-full mx-auto" />
            <h3 className="text-heading text-op-white font-semibold">Projetos Pausados</h3>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">O que é</p>
              <p className="text-body text-op-white">
                Projetos temporariamente parados por uma razão declarada — aguardando resultado externo, dependência de terceiros ou qualquer impedimento que bloqueie o avanço agora. O motivo da pausa fica visível no card do projeto.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como pausar um projeto</p>
              <p className="text-body text-op-white">
                No Dashboard do projeto, acesse o menu <span className="font-semibold">···</span> no canto superior direito e escolha <span className="font-semibold">Pausar projeto</span>. Você informará o motivo da pausa, que ficará visível enquanto o projeto estiver nesse estado.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Como retomar</p>
              <p className="text-body text-op-white">
                Expanda a lista de projetos pausados e toque em <span className="font-semibold">Retomar</span> no card do projeto. Ele voltará ao estado <span className="font-semibold">Novo</span> e reaparecerá entre os projetos ativos imediatamente.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-label text-op-cyan uppercase">Pausado vs. Arquivado</p>
              <p className="text-body text-op-white">
                Pausado é temporário — você pretende retomar quando o impedimento passar. Arquivado é permanente, para projetos encerrados sem atingir o Norte. Nenhum dos dois apaga registros, princípios ou histórico.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpPaused(false)}
              className="w-full rounded-xl border border-op-gray/30 py-2.5 text-small text-op-gray hover:text-op-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <BottleneckBankSheet
        open={showBottleneckBank}
        bottlenecks={pendingBottlenecks}
        onDismiss={dismissBottleneck}
        onClose={() => setShowBottleneckBank(false)}
      />

      {/* Dialog: Pausar projeto */}
      <AlertDialog open={!!pausingId} onOpenChange={(v) => { if (!v) { setPausingId(null); setPauseReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da pausa. Ele ficará visível no projeto enquanto estiver pausado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Ex: aguardando resultado externo"
            className="mt-2 w-full rounded-xl border border-op-gray/30 bg-op-navy text-op-white placeholder:text-op-gray px-3 py-2 text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPausingId(null); setPauseReason(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handlePause()}
              disabled={!pauseReason.trim()}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar pausa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Arquivar projeto — PRD Seção 12.1 */}
      <AlertDialog open={!!archivingId} onOpenChange={(v) => !v && setArchivingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será removido da lista ativa. Nenhum dado é apagado.
              Use "Concluir projeto" se o Norte foi alcançado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchive()}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Dialog: Excluir projeto — permanente, remove todos os dados vinculados */}
      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os registros, princípios, capítulos e configurações deste projeto
              serão apagados definitivamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* [REQ-AUTH-03] Momento 3: nudge de cadastro após 7 dias como guest */}
      <RegistrationNudge open={showDay7Nudge} moment={3} onDismiss={() => setShowDay7Nudge(false)} />
    </div>
  );
}
