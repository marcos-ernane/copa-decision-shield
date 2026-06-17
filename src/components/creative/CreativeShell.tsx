// CreativeShell — orquestra as 3 etapas + tela final.

import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { BackButton } from '@/components/app/BackButton';
import { CreativeDiverge } from './CreativeDiverge';
import { CreativeFunction } from './CreativeFunction';
import { CreativeConverge } from './CreativeConverge';
import { CreativeDone } from './CreativeDone';
import {
  bestAlternativeIndex,
  type CreativeScore,
  type FunctionCheck,
} from '@/lib/creative';

type Step = 'diverge' | 'function' | 'converge' | 'done';

const STEP_LABELS: Record<Step, string> = {
  diverge: 'Divergir',
  function: 'Função antes da Forma',
  converge: 'Convergir com Critério',
  done: 'Conclusão',
};

export function CreativeShell() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('diverge');
  const [fn, setFn] = useState('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [checks, setChecks] = useState<FunctionCheck[]>([]);
  const [scores, setScores] = useState<CreativeScore[]>([]);
  const [chosenIdx, setChosenIdx] = useState<number>(0);
  const [doneMode, setDoneMode] = useState<'convert' | 'save_only'>('convert');

  function handleBack() {
    if (step === 'diverge') { router.history.back(); return; }
    if (step === 'function') { setStep('diverge'); return; }
    if (step === 'converge') { setStep('function'); return; }
    router.history.back();
  }

  if (step === 'diverge') {
    return (
      <div>
        <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/30 sticky top-0 bg-op-black z-10">
          <BackButton onClick={handleBack} />
          <p className="text-label uppercase tracking-wide text-op-gray">{STEP_LABELS[step]}</p>
        </header>
      <CreativeDiverge
        initialFunction={fn}
        initialAlternatives={alternatives}
        onContinue={(f, alts) => {
          setFn(f);
          setAlternatives(alts);
          // reset downstream
          setChecks([]);
          setScores([]);
          setStep('function');
        }}
      />
      </div>
    );
  }

  if (step === 'function') {
    return (
      <div>
        <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/30 sticky top-0 bg-op-black z-10">
          <BackButton onClick={handleBack} />
          <p className="text-label uppercase tracking-wide text-op-gray">{STEP_LABELS[step]}</p>
        </header>
      <CreativeFunction
        alternatives={alternatives}
        initial={checks}
        onContinue={(c) => {
          setChecks(c);
          setStep('converge');
        }}
      />
      </div>
    );
  }

  if (step === 'converge') {
    return (
      <div>
        <header className="flex items-center gap-2 px-4 py-3 border-b border-op-gray/30 sticky top-0 bg-op-black z-10">
          <BackButton onClick={handleBack} />
          <p className="text-label uppercase tracking-wide text-op-gray">{STEP_LABELS[step]}</p>
        </header>
      <CreativeConverge
        alternatives={alternatives}
        functionCheck={checks}
        initialScores={scores}
        initialChosen={null}
        onConvert={(idx, s) => {
          setChosenIdx(idx);
          setScores(s);
          setDoneMode('convert');
          setStep('done');
        }}
        onSaveWithoutIMV={(idx, s) => {
          setChosenIdx(idx);
          setScores(s);
          setDoneMode('save_only');
          setStep('done');
        }}
      />
      </div>
    );
  }

  // step === 'done'
  const chosen = alternatives[chosenIdx] ?? alternatives[bestAlternativeIndex(scores)] ?? '';
  return (
    <CreativeDone
      baseSession={{
        function_declared: fn,
        alternatives,
        function_check: checks,
        scores,
        chosen_alternative: chosen,
      }}
      mode={doneMode}
      onAdjust={() => setStep('converge')}
    />
  );
}
