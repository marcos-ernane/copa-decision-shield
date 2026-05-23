import { createFileRoute } from '@tanstack/react-router';
import { BaselineAssessmentFlow } from '@/components/baseline/BaselineAssessmentFlow';

export const Route = createFileRoute('/baseline/new')({
  component: BaselineAssessmentFlow,
});
