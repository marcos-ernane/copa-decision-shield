// ProjectPicker — seletor de projeto reutilizado pelas telas de registro
// (Pulso e Estruturado) quando ainda não há projeto selecionado.
// Usa o shell padrão do app: header com Voltar/Fechar, container centralizado,
// cores de lista consistentes e rolagem natural.

import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { FlowHeader } from '@/components/app/FlowHeader';
import {
  PROJ_OPTION_ITEM,
  PROJ_OPTION_GHOST,
  ProjectStatusLegend,
  statusDotClass,
} from '@/components/diary/ProjectFilterSelect';
import type { Project } from '@/types/database';

interface Props {
  title?: string;
  /** Qual registro está sendo iniciado — vira o rótulo do cabeçalho. */
  eyebrow?: string;
  projects: Project[];
  onPick: (id: string) => void;
}

export function ProjectPicker({
  title = 'Para qual projeto?',
  eyebrow = 'Registro',
  projects,
  onPick,
}: Props) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: '#070C12', minHeight: '100vh' }}>
      {/* Rótulo + pergunta em duas linhas: numa só, entre as pílulas de Voltar
          e Fechar, a pergunta virava "Para qual pr…" a 375px. */}
      <FlowHeader eyebrow={eyebrow} title={title} />

      <div className="max-w-md mx-auto w-full px-4 py-4 space-y-2 pb-28">
        {projects.length === 0 ? (
          <p className="text-small text-op-gray py-8 text-center">
            Você ainda não tem projetos. Crie um primeiro.
          </p>
        ) : (
          <div className="pb-1"><ProjectStatusLegend /></div>
        )}

        {/* Antes da lista, não depois: no fim, cada projeto novo empurra o
            botão para mais longe do polegar. Mesma posição do Modo Pressão e
            da Home. */}
        <button
          type="button"
          onClick={() => navigate({ to: '/project/new' })}
          className={PROJ_OPTION_GHOST}
        >
          <Plus className="size-4 shrink-0" />
          Novo projeto
        </button>

        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className={PROJ_OPTION_ITEM}
          >
            {/* Ponto de status: existia só no Diário. Sem ele, o operador
                escolhia projeto sem saber se estava ativo, concluído ou
                pausado. */}
            <span className={`size-2 rounded-full shrink-0 ${statusDotClass(p.state)}`} />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
