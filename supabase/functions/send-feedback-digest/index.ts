import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SK     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SMTP_HOST       = Deno.env.get('SMTP_HOST')!;
const SMTP_USER       = Deno.env.get('SMTP_USER')!;
const SMTP_PASS       = Deno.env.get('SMTP_PASS')!;
const ADMIN_EMAIL     = Deno.env.get('ADMIN_EMAIL')!;

interface Suggestion {
  id: string;
  category: string;
  subcategory: string | null;
  impact_level: string;
  message: string;
  user_name: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cenarios:        'Cenários',
  camadas:         'Camadas',
  tipos_entrada:   'Tipos de Entrada',
  navegacao:       'Navegação & Interface',
  funcionalidades: 'Funcionalidades',
  outro:           'Outro',
};

const IMPACT_LABELS: Record<string, string> = {
  blocks_me:   'Me impede de usar o app',
  sometimes:   'Às vezes atrapalha',
  improvement: 'É só uma melhoria',
};

function buildHtml(suggestions: Suggestion[]): string {
  const grouped = new Map<string, Suggestion[]>();
  for (const s of suggestions) {
    const cat = s.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(s);
  }

  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>
  body { font-family: Inter, Arial, sans-serif; background: #f1f5f9; color: #0f172a; margin: 0; padding: 24px; }
  .container { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .header { background: #1B2A4A; color: #F0F4F8; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 6px 0 0; font-size: 13px; opacity: .7; }
  .section { padding: 24px 32px; border-bottom: 1px solid #e2e8f0; }
  .section h2 { margin: 0 0 16px; font-size: 16px; color: #1B2A4A; border-left: 3px solid #D97706; padding-left: 10px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
  .card .meta { font-size: 11px; color: #64748b; margin-bottom: 8px; }
  .card .impact { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; margin-bottom: 8px; }
  .card .message { font-size: 14px; color: #0f172a; line-height: 1.6; }
  .card .author { font-size: 11px; color: #94a3b8; margin-top: 8px; }
  .footer { padding: 16px 32px; font-size: 11px; color: #94a3b8; }
  .summary { background: #1B2A4A; color: #F0F4F8; padding: 12px 32px; font-size: 13px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>📋 Digest de Sugestões — Operador de Precisão</h1>
    <p>Gerado em ${now} · ${suggestions.length} sugestão${suggestions.length !== 1 ? 'ões' : ''} recebida${suggestions.length !== 1 ? 's' : ''}</p>
  </div>
  <div class="summary">
    Total por categoria: ${Array.from(grouped.entries()).map(([k, v]) => `${CATEGORY_LABELS[k] ?? k} (${v.length})`).join(' · ')}
  </div>
`;

  for (const [cat, items] of grouped.entries()) {
    html += `<div class="section"><h2>${CATEGORY_LABELS[cat] ?? cat} — ${items.length} sugestão${items.length !== 1 ? 'ões' : ''}</h2>`;
    for (const s of items) {
      const date = new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      html += `
<div class="card">
  <div class="meta">${date}${s.subcategory ? ` · ${s.subcategory}` : ''}</div>
  <span class="impact">${IMPACT_LABELS[s.impact_level] ?? s.impact_level}</span>
  <div class="message">${s.message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
  ${s.user_name ? `<div class="author">— ${s.user_name.replace(/</g, '&lt;')}</div>` : ''}
</div>`;
    }
    html += '</div>';
  }

  html += `<div class="footer">Este digest é enviado 2x por mês. Os registros foram excluídos do banco após este envio.</div></div></body></html>`;
  return html;
}

serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SK);

  // Busca todas as sugestões ainda não enviadas
  const { data: suggestions, error } = await supabase
    .from('feedback_suggestions')
    .select('*')
    .is('sent_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase select error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!suggestions || suggestions.length === 0) {
    return new Response(JSON.stringify({ sent: false, reason: 'no_suggestions' }), { status: 200 });
  }

  const html = buildHtml(suggestions as Suggestion[]);
  const text = (suggestions as Suggestion[])
    .map((s, i) => `${i + 1}. [${s.category}${s.subcategory ? '/' + s.subcategory : ''}] ${s.impact_level}\n${s.message}\n${s.user_name ? '— ' + s.user_name : ''}\n`)
    .join('\n---\n\n');

  const transport = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  await transport.sendMail({
    from: `"Operador de Precisão" <${SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: `[App] Digest de Sugestões — ${suggestions.length} item${suggestions.length !== 1 ? 'ens' : ''} · ${now}`,
    text,
    html,
  });

  // Marca como enviado e deleta em seguida
  const ids = (suggestions as Suggestion[]).map((s) => s.id);
  await supabase.from('feedback_suggestions').delete().in('id', ids);

  return new Response(JSON.stringify({ sent: true, count: suggestions.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
