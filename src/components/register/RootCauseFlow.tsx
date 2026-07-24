// RootCauseFlow — fluxo guiado dos 5 Porquês, step 3 opcional do Formato C.
// Uma pergunta por vez. Sem IA — o usuário pensa, o app estrutura.

import { useState, useEffect } from 'react';
import { X, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/copa/VoiceInput';
import {
  generateFirstQuestion,
  generateNextQuestion,
  shouldTerminate,
  buildChain,
  ROOT_CAUSE_MIN_ANSWER_LENGTH,
  ROOT_CAUSE_MAX_ANSWER_LENGTH,
  ROOT_CAUSE_COUNTER_THRESHOLD,
  ROOT_CAUSE_MAX_STEPS,
} from '@/lib/rootCause';
import type { RootCauseChain, RootCauseStep } from '@/lib/register';

interface RootCauseFlowProps {
  factText: string;
  onComplete: (chain: RootCauseChain) => void;
  onSkip: () => void;
}

export function RootCauseFlow({ factText, onComplete, onSkip }: RootCauseFlowProps) {
  const [steps, setSteps] = useState<RootCauseStep[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setCurrentQuestion(generateFirstQuestion(factText));
  }, [factText]);

  const stepNumber = steps.length + 1;
  const isFinalStep = stepNumber === ROOT_CAUSE_MAX_STEPS;
  const canAdvance = currentAnswer.trim().length >= ROOT_CAUSE_MIN_ANSWER_LENGTH;
  const showCounter = currentAnswer.length > ROOT_CAUSE_COUNTER_THRESHOLD;

  function handleNext() {
    const newStep: RootCauseStep = {
      question: currentQuestion,
      answer: currentAnswer.trim(),
      step_number: stepNumber,
    };
    const newSteps = [...steps, newStep];

    if (shouldTerminate(newSteps, false)) {
      onComplete(buildChain(newSteps, false));
      return;
    }

    setSteps(newSteps);
    setCurrentAnswer('');
    setCurrentQuestion(generateNextQuestion(currentAnswer.trim()));
  }

  function handleDeclareRoot() {
    const newStep: RootCauseStep = {
      question: currentQuestion,
      answer: currentAnswer.trim(),
      step_number: stepNumber,
    };
    onComplete(buildChain([...steps, newStep], true));
  }

  function handleAnswerChange(v: string) {
    if (v.length <= ROOT_CAUSE_MAX_ANSWER_LENGTH) setCurrentAnswer(v);
  }

  return (
    <>
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full bg-op-navy rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-heading font-semibold text-op-white">O que são os 5 Porquês?</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-md hover:bg-op-navy-elevated"
                aria-label="Fechar ajuda"
              >
                <X className="size-5 text-op-gray" />
              </button>
            </div>
            <p className="text-body text-op-white leading-relaxed">
              Os 5 Porquês é uma técnica para encontrar a causa raiz de um problema — não o sintoma que você vê, mas o motivo real por trás dele.
            </p>
            <p className="text-body text-op-white leading-relaxed">
              A cada resposta, você pergunta novamente: por quê isso acontece? E assim por diante, até chegar numa causa que, se resolvida, impede o problema de voltar.
            </p>
            <p className="text-body text-op-white leading-relaxed">
              Você pode parar antes do 5º passo se sentir que chegou à causa real. Toque em <em>Esta é a causa raiz</em>.
            </p>
            <p className="text-body text-op-white leading-relaxed">
              A cadeia de causa raiz fica salva junto com este registro e aparece na sua Linha do Tempo.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-heading font-semibold text-op-white">Investigar Causa Raiz</p>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1 text-label text-op-gray hover:text-op-white transition-colors shrink-0 ml-2"
          >
            <CircleHelp className="size-3.5" />
            Ajuda
          </button>
        </div>

        {/* Fato sob investigação — contexto fixo */}
        <div className="rounded-md border border-op-gray/20 bg-op-navy px-3 py-2">
          <p className="text-label text-op-gray uppercase">Fato investigado</p>
          <p className="text-small text-op-white/80 leading-snug">{factText}</p>
        </div>

        {/* Progress indicator */}
        <p className="text-small text-op-gray">
          Passo {stepNumber} de até {ROOT_CAUSE_MAX_STEPS}
        </p>

        {/* Read-only history of previous steps */}
        {steps.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-op-gray/20 bg-op-navy px-3 py-2">
            {steps.map((s) => (
              <p key={s.step_number} className="text-small text-op-gray leading-snug">
                {s.question} → <span className="text-op-white/70">{s.answer}</span>
              </p>
            ))}
          </div>
        )}

        {/* Current question card */}
        <div
          className="rounded-md bg-op-navy px-4 py-3"
          style={{ borderLeft: '3px solid var(--color-brand-blue)' }}
        >
          <p className="text-body font-bold text-op-white">{currentQuestion}</p>
        </div>

        {/* Answer input */}
        <div className="space-y-1">
          <VoiceInput
            value={currentAnswer}
            onChange={handleAnswerChange}
            placeholder="Por que isso acontece?"
            rows={3}
          />
          {showCounter && (
            <p className="text-label text-op-gray text-right">
              {currentAnswer.length}/{ROOT_CAUSE_MAX_ANSWER_LENGTH}
            </p>
          )}
        </div>

        {/* "Esta é a causa raiz" — ghost, full width */}
        <Button
          variant="outline"
          className="w-full"
          disabled={!canAdvance}
          onClick={handleDeclareRoot}
        >
          Esta é a causa raiz
        </Button>

        {/* "Próximo porquê" / "Concluir análise" — brand-blue, full width */}
        <Button
          className="w-full"
          disabled={!canAdvance}
          onClick={handleNext}
        >
          {isFinalStep ? 'Concluir análise' : 'Próximo porquê →'}
        </Button>

        {/* Skip — ghost small, footer */}
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-label text-op-gray hover:text-op-white transition-colors py-2"
        >
          Pular análise de causa raiz
        </button>
      </div>
    </>
  );
}
