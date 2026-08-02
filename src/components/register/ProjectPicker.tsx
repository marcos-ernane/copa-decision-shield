// ProjectPicker — seletor de projeto reutilizado pelas telas de registro
// (Pulso e Estruturado) quando ainda não há projeto selecionado.
// Usa o shell padrão do app: header com Voltar/Fechar, container centralizado,
// cores de lista consistentes e rolagem natural.

import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { BackButton } from '@/components/app/BackButton';
import { PROJ_OPTION_ITEM, PROJ_OPTION_GHOST, statusDotClass } from '@/components/diary/ProjectFilterSelect';
import { CloseButton } from '@/components/app/CloseButton';
import type { Project } from '@/types/database';

interface Props {
  title?: string;
  projects: Project[];
  onPick: (id: string) => void;
}

export function ProjectPicker({ title = 'Para qual projeto?', projects, onPick }: Props) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-op-black" style={{ backgroundColor: '#070C12', minHeight: '100vh' }}>
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-op-navy z-10">
        <BackButton />
        <h1 className="text-heading text-op-white">{title}</h1>
        <CloseButton className="ml-auto" />
      </header>

      <div className="max-w-md mx-auto w-full px-4 py-4 space-y-2 pb-28">
        {projects.length === 0 ? (
          <p className="text-small text-op-gray py-8 text-center">
            Você ainda não tem projetos. Crie um primeiro.
          </p>
        ) : (
          projects.map((p) => (
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
          ))
        )}

        <button
          type="button"
          onClick={() => navigate({ to: '/project/new' })}
          className={PROJ_OPTION_GHOST}
        >
          <Plus className="size-4 shrink-0" />
          Novo projeto
        </button>
      </div>
    </div>
  );
}
