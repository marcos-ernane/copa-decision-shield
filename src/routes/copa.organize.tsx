import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/copa/organize')({
  beforeLoad: () => { throw redirect({ to: '/copa' }); },
});
