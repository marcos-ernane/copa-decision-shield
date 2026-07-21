import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect } from "react";
import { supabase } from "@/lib/supabase";
import { migrateGuestToCloud } from "@/lib/migrateGuest";
import { markWasAuthenticated } from "@/lib/authFlags";
import { MigrationIndicator } from "@/components/MigrationIndicator";
import { AppShell } from "@/components/app/AppShell";
import { PassiveTracker } from "@/components/PassiveTracker";

import appCss from "../styles.css?url";
// In Vite dev mode, ?url imports are served as JavaScript modules with wrong
// Content-Type, so <link> tags fail silently. This direct import forces Vite
// to inject the CSS as a <style> element via its module system.
import "../styles.css";

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
            className="inline-flex items-center justify-center rounded-xl bg-op-amber px-4 py-2 text-sm font-semibold text-op-black transition-colors hover:brightness-95"
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
            className="inline-flex items-center justify-center rounded-xl bg-op-amber px-4 py-2 text-sm font-semibold text-op-black transition-colors hover:brightness-95"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-op-cyan bg-transparent px-4 py-2 text-sm font-semibold text-op-cyan transition-colors hover:opacity-80"
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "color-scheme", content: "dark" },
      // Cor da barra do navegador mobile igual ao fundo do app (visual contínuo).
      { name: "theme-color", content: "#070C12" },
      // "Adicionar à tela inicial" (iOS) abre em modo standalone, barra translúcida
      // — o conteúdo vai sob a status bar e a safe-area-top cuida do espaçamento.
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Operador de Precisão" },
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
      // Em dev, appCss (/src/styles.css) é servido como text/javascript pelo Vite —
      // o React 19 gerencia esse link quebrado como stylesheet resource e pode causar
      // comportamento inesperado. Só incluímos em produção, onde o bundle CSS é real.
      ...(import.meta.env.PROD ? [{ rel: "stylesheet" as const, href: appCss }] : []),
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const DARK_CSS = [
  'html,body{background-color:#070C12!important;color:#F0F4F8!important;margin:0!important}',
  ':root{color-scheme:dark;--background:#070C12;--foreground:#F0F4F8;--card:#0D1B2A;--card-foreground:#F0F4F8;--popover:#0D1B2A;--popover-foreground:#F0F4F8;--muted:#1B2A4A;--muted-foreground:#8899AA}',
].join('');

// Script executado antes de qualquer render do React. Aplica o fundo escuro
// via inline style (setProperty com priority 'important') para que nenhum CSS
// de folha de estilos consiga sobrescrever enquanto o app hidrata.
const DARK_SCRIPT = `
(function(){
  var DARK='#070C12',LIGHT='#F0F4F8';
  function applyDark(){
    var h=document.documentElement,b=document.body;
    h.style.setProperty('background-color',DARK,'important');
    h.style.setProperty('color',LIGHT,'important');
    if(b){
      b.style.setProperty('background-color',DARK,'important');
      b.style.setProperty('color',LIGHT,'important');
      b.style.setProperty('margin','0','important');
    }
  }
  // Aplica imediatamente
  applyDark();
  // Injeta <style> no início do <head> — garante fundo mesmo sem CSS externo
  if(!document.getElementById('op-critical')){
    var s=document.createElement('style');
    s.id='op-critical';
    s.textContent='html,body{background-color:'+DARK+'!important;color:'+LIGHT+'!important;margin:0!important}';
    document.head.insertBefore(s,document.head.firstChild);
  }
  // Reaplicar em pontos-chave do ciclo de vida do browser/React
  document.addEventListener('DOMContentLoaded',applyDark);
  // Checkpoints para sobreviver à hidratação do React 19 (que pode remover inline styles)
  setTimeout(applyDark,0);
  setTimeout(applyDark,50);
  setTimeout(applyDark,150);
  setTimeout(applyDark,500);
})();
`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ backgroundColor: '#070C12' }}>
      <head>
        {/*
          <link> sem data-precedence: o React 19 NÃO intercepta nem carrega via
          adoptedStyleSheets. O browser carrega esse arquivo diretamente como CSS real.
          Isso garante que /op-dark.css seja SEMPRE aplicado, independente do
          sistema de gestão de stylesheets do React 19.
        */}
        <link rel="stylesheet" href="/op-dark.css" data-op-critical="true" />
        <HeadContent />
        {/*
          dangerouslySetInnerHTML previne que o React 19 trate este <style> como
          "hoistable" e o remova/mova durante a hidratação.
        */}
        <style dangerouslySetInnerHTML={{ __html: DARK_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: DARK_SCRIPT }} />
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

  // useLayoutEffect roda de forma SÍNCRONA após as mutações do DOM, ANTES do
  // browser pintar. Isso elimina qualquer flash branco que useEffect (pós-paint)
  // não consegue prevenir.
  useLayoutEffect(() => {
    const applyInline = () => {
      document.documentElement.style.setProperty('background-color', '#070C12', 'important');
      document.body?.style.setProperty('background-color', '#070C12', 'important');
      document.body?.style.setProperty('color', '#F0F4F8', 'important');
      document.body?.style.setProperty('margin', '0', 'important');
    };
    applyInline();

    const style = document.createElement('style');
    style.id = 'op-dark-override';
    style.textContent = [
      'html,body{background-color:#070C12!important;color:#F0F4F8!important;margin:0!important}',
      ':root{--background:#070C12!important;--foreground:#F0F4F8!important;--card:#0D1B2A!important;--card-foreground:#F0F4F8!important;--popover:#0D1B2A!important;--popover-foreground:#F0F4F8!important;--muted:#1B2A4A!important;--muted-foreground:#8899AA!important;--border:rgba(136,153,170,0.2)!important;--input:rgba(136,153,170,0.2)!important}',
      '.bg-background{background-color:#070C12!important}',
      '.text-foreground{color:#F0F4F8!important}',
      '.text-muted-foreground{color:#8899AA!important}',
    ].join('\n');
    document.head.appendChild(style);

    const ensureLast = () => {
      if (document.head.lastChild !== style) document.head.appendChild(style);
    };
    const observer = new MutationObserver(ensureLast);
    observer.observe(document.head, { childList: true });

    return () => { observer.disconnect(); };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          markWasAuthenticated();
        }
        if (event === "SIGNED_IN" && session?.user) {
          void migrateGuestToCloud(session.user.id);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ backgroundColor: '#070C12', minHeight: '100vh', color: '#F0F4F8' }}>
        <PassiveTracker />
        <MigrationIndicator />
        <AppShell>
          <Outlet />
        </AppShell>
      </div>
    </QueryClientProvider>
  );
}
