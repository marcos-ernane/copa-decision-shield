// Home temporária — exibe estado mínimo e redireciona para /onboarding
// enquanto o onboarding não estiver completo. Home real é o Sprint 3.

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { GuestStorage } from '@/lib/guestStorage';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState<string>('');
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    const profile = GuestStorage.getProfile();
    if (!profile || !profile.onboarding_completed) {
      navigate({ to: '/onboarding' });
      return;
    }
    setName(profile.display_name);
    setProjectCount(GuestStorage.getProjects().length);
    setReady(true);
  }, [navigate]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background px-6 py-12 max-w-md mx-auto">
      <p className="text-label text-muted-foreground uppercase">Operador</p>
      <h1 className="text-title text-foreground mt-1">{name}</h1>
      <p className="text-small text-muted-foreground mt-4">
        {projectCount} projeto{projectCount === 1 ? '' : 's'} em campo.
      </p>
      <p className="text-small text-muted-foreground mt-8">
        Sprint 3 entrega a Home completa.{' '}
        <Link to="/onboarding" className="underline">
          Refazer onboarding
        </Link>
      </p>
    </div>
  );
}
