import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/copa/prove')({
  beforeLoad: () => { throw redirect({ to: '/copa' }); },
});
