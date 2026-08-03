import { createFileRoute } from '@tanstack/react-router';
import { BaselineAssessmentFlow } from '@/components/baseline/BaselineAssessmentFlow';

export const Route = createFileRoute('/baseline/new')({
  // `from=onboarding` diz que o operador chegou pela oferta das 12 minutos na
  // Fase 3 e ainda não fez o primeiro registro. Ao terminar o diagnóstico ele
  // segue para o Registro Estruturado em vez de cair na Home, fechando a
  // Fase 4 ([REQ-ONB-01]). Vindo da Bússola ou do Painel, nada muda.
  // O tipo de retorno é anotado com `from?` de propósito: sem a anotação o TS
  // infere a chave como obrigatória, e todo <Link to="/baseline/new"> que já
  // existe (Painel, Rubrica) passaria a exigir `search`.
  validateSearch: (s: Record<string, unknown>): { from?: 'onboarding' } =>
    s.from === 'onboarding' ? { from: 'onboarding' } : {},
  component: BaselineAssessmentFlow,
});
