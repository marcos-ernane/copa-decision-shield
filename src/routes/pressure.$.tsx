import { createFileRoute, Navigate } from '@tanstack/react-router';

// Catch-all redireciona para /pressure mantendo o fluxo único do Shell.
export const Route = createFileRoute('/pressure/$')({
  component: () => <Navigate to="/pressure" />,
});
