// FlowHeader — cabeçalho único dos fluxos de várias telas.
//
// O padrão (Voltar · rótulo · nome do contexto · Fechar) já existia copiado em
// DiagnosisFlow, ConcludeFlow, BaselineAssessmentFlow, CreativeShell e
// SimulationDetail. Copiado, divergiu: uns em bg-op-navy, outro em bg-op-black,
// um sem Fechar, e três fluxos inteiros sem cabeçalho nenhum — no Modo Pressão,
// depois de escolher o projeto, o operador ficava sem saber em qual projeto
// estava e sem caminho de volta a não ser o gesto do sistema.
//
// Sticky e opaco de propósito: as listas destes fluxos passam de uma tela de
// altura (o seletor do Modo Pressão com 19 projetos, por exemplo) e um
// cabeçalho que rola para fora leva junto a única saída.
//
// A regra de notch em styles.css é escopada em .sticky.top-0 — este cabeçalho
// entra nela sem precisar de env(safe-area-inset-top) próprio.

import type { ReactNode } from 'react';
import { BackButton } from './BackButton';
import { CloseButton } from './CloseButton';

interface Props {
  /** Rótulo fixo do fluxo — "Modo Pressão", "Diagnóstico". */
  eyebrow?: string;
  /** Contexto atual — nome do projeto ou etapa. Truncado a 375px. */
  title?: string;
  /**
   * Volta um passo DENTRO do fluxo. Sem isto, cai no histórico do navegador,
   * que sai do fluxo inteiro — as etapas não são rotas.
   */
  onBack?: () => void;
  /** Telas sem passo anterior (primeira do fluxo, ou já salvo). */
  hideBack?: boolean;
  /** Sem isto, Fechar vai para a Início. */
  onClose?: () => void;
  hideClose?: boolean;
  /** Ação extra à esquerda do Fechar (ex.: exportar). */
  children?: ReactNode;
}

export function FlowHeader({
  eyebrow,
  title,
  onBack,
  hideBack = false,
  onClose,
  hideClose = false,
  children,
}: Props) {
  // Duas linhas quando há rótulo E contexto. Medido a 375px: entre as duas
  // pílulas sobram 143px, e um nome de projeto real ("Lançamento Livro + APP")
  // precisa de 235px — empilhado na coluna do meio ele virava "Lançamento…",
  // que não informa nada. Na segunda linha o nome tem a largura inteira.
  //
  // Com apenas um dos dois (o "Para qual projeto?" do seletor, por exemplo),
  // uma linha basta e é o formato da referência.
  const duasLinhas = Boolean(eyebrow && title);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-op-navy px-4 py-3">
      <div className="flex items-center gap-2">
        {!hideBack && <BackButton onClick={onBack} />}
        {duasLinhas ? (
          <p className="min-w-0 truncate text-label uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        ) : (
          (eyebrow || title) && (
            <h1 className="min-w-0 truncate text-heading text-foreground">{eyebrow ?? title}</h1>
          )
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {children}
          {!hideClose && <CloseButton onClick={onClose} />}
        </div>
      </div>
      {duasLinhas && (
        <h1 className="mt-1 truncate text-heading text-foreground">{title}</h1>
      )}
    </header>
  );
}
