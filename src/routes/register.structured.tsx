import { createFileRoute } from '@tanstack/react-router';
import { StructuredRegister } from '@/components/register/StructuredRegister';

const VALID_FORMATS = ['C', 'O', 'P', 'A'] as const;

export const Route = createFileRoute('/register/structured')({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === 'string' ? s.projectId : undefined,
    format: typeof s.format === 'string' && (VALID_FORMATS as readonly string[]).includes(s.format)
      ? (s.format as 'C' | 'O' | 'P' | 'A')
      : undefined,
    linkedTo: typeof s.linkedTo === 'string' ? s.linkedTo : undefined,
    inboxEntryId: typeof s.inboxEntryId === 'string' ? s.inboxEntryId : undefined,
    inboxText: typeof s.inboxText === 'string' ? s.inboxText : undefined,
    step: typeof s.step === 'number' && s.step >= 0 ? s.step : undefined,
  }),
  component: StructuredRegister,
});
