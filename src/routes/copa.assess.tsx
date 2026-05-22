import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/copa/assess')({
  beforeLoad: () => { throw redirect({ to: '/copa' }); },
});
