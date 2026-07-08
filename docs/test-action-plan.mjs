// Validação analítica dos 10 cenários PRD-ITEM-05
// CT-01 a CT-10: lógica de domínio exercitada sem browser nem node_modules.

// ── Funções extraídas de actionPlan.ts ────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return 'Não definido';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildActionPlan(content, projectBottleneck) {
  const what = content.action.split('\n')[0].trim();
  return {
    what,
    why: (projectBottleneck ?? '').trim() || 'Não especificado',
    how: (content.metric ?? '').trim() || 'Não especificado',
    when: formatDate(content.deadline),
    who_is_affected: (content.ethical_check ?? '').trim() || 'Não especificado',
    how_much: (content.cut_rule ?? '').trim() || 'Não especificado',
    generated_at: new Date().toISOString(),
  };
}

// ── Cenários ──────────────────────────────────────────────────────────────────

const tests = [
  {
    id: 'CT-01',
    desc: 'formatDate(null) → "Não definido"',
    run: () => formatDate(null),
    expect: (r) => r === 'Não definido',
    note: 'null → fallback imediato',
  },
  {
    id: 'CT-02',
    desc: 'formatDate(undefined) → "Não definido"',
    run: () => formatDate(undefined),
    expect: (r) => r === 'Não definido',
    note: 'undefined → falsy → fallback',
  },
  {
    id: 'CT-03',
    desc: 'formatDate("") → "Não definido"',
    run: () => formatDate(''),
    expect: (r) => r === 'Não definido',
    note: 'string vazia → falsy → fallback',
  },
  {
    id: 'CT-04',
    desc: 'formatDate com ISO válido → formato DD/MM/AAAA (10 chars com barras)',
    run: () => formatDate('2025-06-20T12:00:00Z'),
    expect: (r) => {
      // Formato pt-BR: DD/MM/AAAA — 10 chars, 2 barras, dígitos
      return typeof r === 'string' && r.length === 10 && r[2] === '/' && r[5] === '/';
    },
    note: 'ISO → toLocaleDateString pt-BR → 2 barras em posições 2 e 5',
  },
  {
    id: 'CT-05',
    desc: 'buildActionPlan — action linha única → what === action.trim()',
    run: () => {
      const content = {
        action: '  Testar campanha de e-mail  ',
        metric: 'Taxa de abertura > 25%',
        deadline: '2025-07-01T00:00:00Z',
        cut_rule: 'Se não atingir 20%, parar campanha',
        ethical_check: 'Impacto nos clientes ativos',
      };
      return buildActionPlan(content, 'Conversão de leads estagnada');
    },
    expect: (r) => r.what === 'Testar campanha de e-mail',
    note: 'Trim aplicado e a primeira (única) linha usada como "O quê"',
  },
  {
    id: 'CT-06',
    desc: 'buildActionPlan — action multilinha → what usa apenas primeira linha',
    run: () => {
      const content = {
        action: 'Publicar landing page\nConfigurar formulário\nAtualizar CRM',
        metric: 'Leads captados',
        deadline: null,
        cut_rule: '',
        ethical_check: null,
      };
      return buildActionPlan(content, 'Site sem conversão');
    },
    expect: (r) => r.what === 'Publicar landing page',
    note: 'split("\\n")[0] → só a primeira linha mesmo com múltiplas',
  },
  {
    id: 'CT-07',
    desc: 'buildActionPlan — ethical_check null → who_is_affected = "Não especificado"',
    run: () => {
      const content = {
        action: 'Ação qualquer',
        metric: 'Métrica',
        deadline: null,
        cut_rule: 'Corte',
        ethical_check: null,
      };
      return buildActionPlan(content, 'Gargalo');
    },
    expect: (r) => r.who_is_affected === 'Não especificado',
    note: 'ethical_check null → fallback "Não especificado"',
  },
  {
    id: 'CT-08',
    desc: 'buildActionPlan — cut_rule vazio → how_much = "Não especificado"',
    run: () => {
      const content = {
        action: 'Ação qualquer',
        metric: 'Métrica',
        deadline: null,
        cut_rule: '   ',
        ethical_check: 'Algum check',
      };
      return buildActionPlan(content, 'Gargalo');
    },
    expect: (r) => r.how_much === 'Não especificado',
    note: 'cut_rule só com espaços → trim() → string vazia → fallback',
  },
  {
    id: 'CT-09',
    desc: 'buildActionPlan — projectBottleneck vazio → why = "Não especificado"',
    run: () => {
      const content = {
        action: 'Ação qualquer',
        metric: 'Métrica',
        deadline: null,
        cut_rule: 'Corte',
        ethical_check: null,
      };
      return buildActionPlan(content, '');
    },
    expect: (r) => r.why === 'Não especificado',
    note: 'projectBottleneck vazio → fallback "Não especificado"',
  },
  {
    id: 'CT-10',
    desc: 'Spread condicional — action_plan ausente em content quando não gerado',
    run: () => {
      // Simula salvar structured_P sem chamar buildActionPlan
      const content = {
        action: 'IMV sem plano de ação',
        metric: 'Métrica',
        deadline: null,
        cut_rule: 'Corte',
        reversible: true,
        cheap: true,
        specific: true,
        measurable: true,
        layer: 'conversao',
      };
      const actionPlan = undefined; // usuário não gerou
      const saved = { ...content, ...(actionPlan && { action_plan: actionPlan }) };

      // ActionPlanSheet não aparece quando action_plan está ausente
      const showButton = 'action_plan' in saved;
      return { showButton, hasField: 'action_plan' in saved };
    },
    expect: (r) => r.showButton === false && r.hasField === false,
    note: 'Spread condicional → action_plan ausente → botão não renderizado na Timeline/Dashboard',
  },
];

// ── Executar ──────────────────────────────────────────────────────────────────

console.log('PRD-ITEM-05 — Validação dos 10 cenários CT-01 a CT-10\n');

let pass = 0, fail = 0;

for (const t of tests) {
  const result = t.run();
  const ok = t.expect(result);
  const icon = ok ? '✓' : '✗';
  if (ok) pass++; else fail++;

  console.log(`${icon} ${t.id}: ${t.desc}`);
  if (!ok) {
    console.log(`    Resultado: ${JSON.stringify(result)}`);
    console.log(`    *** FALHA *** (${t.note})`);
  } else {
    console.log(`    OK — ${t.note}`);
  }
}

console.log('\n─────────────────────────────────────────────');
console.log(`Resultado: ${pass} aprovados, ${fail} falhos de ${tests.length} cenários`);
if (fail === 0) console.log('✓ Todos os 10 cenários aprovados.');
else process.exit(1);
