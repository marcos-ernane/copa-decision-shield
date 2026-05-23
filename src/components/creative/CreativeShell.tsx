// CreativeShell — orquestra as 3 etapas + tela final.

import { useState } from 'react';
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

export function CreativeShell() {
  const [step, setStep] = useState<Step>('diverge');
  const [fn, setFn] = useState('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [checks, setChecks] = useState<FunctionCheck[]>([]);
  const [scores, setScores] = useState<CreativeScore[]>([]);
  const [chosenIdx, setChosenIdx] = useState<number>(0);
  const [doneMode, setDoneMode] = useState<'convert' | 'save_only'>('convert');

  if (step === 'diverge') {
    return (
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
    );
  }

  if (step === 'function') {
    return (
      <CreativeFunction
        alternatives={alternatives}
        initial={checks}
        onContinue={(c) => {
          setChecks(c);
          setStep('converge');
        }}
      />
    );
  }

  if (step === 'converge') {
    return (
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
