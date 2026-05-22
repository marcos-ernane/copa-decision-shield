import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

const searchSchema = z.object({
  from: z.enum(['book', 'course', 'organic', 'bundle']).optional(),
});

export const Route = createFileRoute('/onboarding')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: 'Onboarding — Operador de Precisão' },
      { name: 'description', content: 'Configure seu primeiro projeto e execute o primeiro COPA.' },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { from } = Route.useSearch();
  return <OnboardingFlow cameFrom={from ?? null} />;
}
