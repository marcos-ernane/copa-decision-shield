import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/copa/capture')({
  beforeLoad: () => { throw redirect({ to: '/copa' }); },
});
