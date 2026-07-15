import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { Button } from '@/components/ui/button';
import { listProjects } from '@/lib/projects';
import type { Project } from '@/types/database';

export const Route = createFileRoute('/compass/recombination')({
  component: RecombinationPage,
});

const STEPS = [
  {
    number: 1,
    title: 'Identifique os recursos disponíveis',
    detail: 'Liste o que você já tem no cenário atual — pessoas, tempo, conhecimento, ferramentas, relacionamentos. Sem inventar recursos novos.',
  },
  {
    number: 2,
    title: 'Escreva combinações possíveis',
    detail: 'Para cada recurso, pergunte: "Como posso usar isso de uma forma diferente do habitual?" Gere até 5 combinações. O limite não é arbitrário — mais do que isso é dispersão, não criatividade.',
  },
  {
    number: 3,
    title: 'Restrinja ao que já existe',
    detail: 'Cada ideia deve usar apenas o que você declarou como recurso disponível. Combinações que exigem recursos novos fogem do escopo.',
  },
  {
    number: 4,
    title: 'Selecione a combinação com maior potencial de IMV',
    detail: 'Qual das ideias pode ser transformada em uma Intervenção Mínima Viável? Considere: reversível, barato, específico, mensurável.',
  },
  {
    number: 5,
    title: 'Avance para a IMV',
    detail: 'A ideia selecionada alimenta automaticamente o campo de ação do Formato P. Edite antes de salvar — é um ponto de partida, não um destino.',
  },
];

const PRINCIPLES = [
  'Criatividade aqui não é inspiração — é recombinação do que já existe.',
  'O limite de 5 ideias força convergência. Mais opções não geram mais clareza.',
  'Uma combinação viável vale mais do que dez hipóteses não testadas.',
];

function RecombinationPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    setLoadingProjects(true);
    listProjects().then((projs) => {
      setProjects(projs.filter((p) => !['archived', 'concluded'].includes(p.state)));
      setLoadingProjects(false);
    });
  }, []);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#070C12', minHeight: '100vh' }}>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 z-10" style={{ backgroundColor: '#070C12' }}>
        <BackButton onClick={() => void navigate({ to: '/compass' })} />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Shuffle className="size-5 text-foreground shrink-0" />
          <div>
            <p className="text-heading font-semibold text-foreground">Recombinação</p>
            <p className="text-label text-muted-foreground">Criar IMVs a partir do que você já tem</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto space-y-5">

        {/* Princípio central */}
        <div className="rounded-xl border border-op-gray/20 bg-op-navy px-4 py-3">
          <p className="text-small text-op-white leading-relaxed">
            Antes de buscar recursos novos, use melhor o que você já tem. A Recombinação é o processo de criar novas ideias de IMV a partir dos recursos identificados no Mapa 3R ou no Inventário 4D.
          </p>
        </div>

        {/* Passos */}
        <div>
          <p className="text-label text-op-gray uppercase tracking-wide mb-3">Protocolo em 5 passos</p>
          <div className="space-y-3">
            {STEPS.map((s) => (
              <div key={s.number} className="flex gap-3">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold mt-0.5"
                  style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: 'var(--color-brand-blue, #2563EB)', border: '1px solid rgba(37,99,235,0.35)' }}
                >
                  {s.number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium text-op-white mb-0.5">{s.title}</p>
                  <p className="text-small text-op-white/70 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Princípios operacionais */}
        <div>
          <p className="text-label text-op-gray uppercase tracking-wide mb-2">Princípios operacionais</p>
          <div className="space-y-2">
            {PRINCIPLES.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-op-gray shrink-0 mt-0.5 text-small">·</span>
                <p className="text-small text-op-white/80 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Seletor de projeto */}
        <div
          className="rounded-lg border border-op-gray/20 p-3 space-y-2"
          style={{ backgroundColor: '#0F1923' }}
        >
          <p className="text-label text-op-gray uppercase tracking-wide">Para qual projeto?</p>
          {loadingProjects ? (
            <p className="text-small text-op-gray">Carregando projetos…</p>
          ) : projects.length === 0 ? (
            <p className="text-small text-op-gray italic">Nenhum projeto ativo encontrado.</p>
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
        </div>

        {/* CTA */}
        <Button
          className="w-full"
          disabled={!selectedProjectId}
          onClick={() => void navigate({
            to: '/register/structured',
            search: { format: 'O', projectId: selectedProjectId || undefined, step: 3, linkedTo: undefined, inboxEntryId: undefined, inboxText: undefined },
          })}
        >
          Abrir Formato O — Organização
        </Button>
        <p className="text-label text-op-gray text-center">
          A Recombinação está no último passo do Formato O, após os recursos serem identificados.
        </p>
      </main>
    </div>
  );
}
