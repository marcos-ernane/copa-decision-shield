import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { migrateGuestToCloud } from "@/lib/migrateGuest";
import { MigrationIndicator } from "@/components/MigrationIndicator";
import { AppShell } from "@/components/app/AppShell";
import { PassiveTracker } from "@/components/PassiveTracker";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Operador de Precisão" },
      { name: "description", content: "Sistema de inteligência operacional pessoal baseado no Método COPA" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Operador de Precisão" },
      { property: "og:description", content: "Sistema de inteligência operacional pessoal baseado no Método COPA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Operador de Precisão" },
      { name: "twitter:description", content: "Sistema de inteligência operacional pessoal baseado no Método COPA" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ backgroundColor: '#070C12' }}>
      <head>
        <HeadContent />
        <style>{`
          html, body, #__app, [data-router] {
            background-color: #070C12 !important;
            color: #F0F4F8 !important;
          }
        `}</style>
        <script dangerouslySetInnerHTML={{ __html: `
          document.documentElement.style.setProperty('background-color','#070C12','important');
          document.addEventListener('DOMContentLoaded',function(){
            if(document.body) document.body.style.setProperty('background-color','#070C12','important');
          });
        ` }} />
      </head>
      <body style={{ backgroundColor: '#070C12', color: '#F0F4F8', margin: 0 }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          void migrateGuestToCloud(session.user.id);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PassiveTracker />
      <MigrationIndicator />
      <AppShell>
        <Outlet />
      </AppShell>
    </QueryClientProvider>
  );
}
