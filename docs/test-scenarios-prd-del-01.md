# Cenários de Teste — PRD-DEL-01 v1.1 — Exclusão Real de Conta

Cobertura manual das Etapas 1 a 6. Derivado da implementação, não da seção de
testes do PRD — reconciliar com a lista oficial de 17 cenários antes de dar por
encerrado.

**Estes testes apagam contas de verdade.** O Bloco B é irreversível.

---

## Preparação

1. **Conta descartável.** Nunca a conta principal. Alias com `+` funciona no
   Gmail e cria um usuário distinto no Supabase:
   `seuemail+del01@gmail.com`. A confirmação chega na mesma caixa.
2. **Senha válida** conforme `auth.ts:36-56`: mínimo 8 caracteres, com
   maiúscula, minúscula, número e caractere especial. Ex.: `Teste2026!`
3. **App local.** O frontend das Etapas 3 a 6 não está em `main` — rode
   `npm run dev` na branch `claude/kind-bardeen-rKhPC`. Não mergear antes do
   Bloco B passar.
4. **Edge Functions.** `delete-account` e `stripe-checkout` já deployadas.
5. **Baseline dos arquivos.** Antes de tudo, anote a contagem inicial:

```sql
SELECT 'legal' AS t, count(*) FROM public.legal_acceptances_archive
UNION ALL
SELECT 'subs', count(*) FROM public.subscriptions_archive;
```

---

# BLOCO A — Não-destrutivos

Podem rodar em qualquer ordem, com a conta descartável recém-criada.

---

## CT-01 — RLS: arquivo de aceites é inacessível ao cliente

**Pré-condição:** chave publicável do projeto.
**Ação:**
```bash
curl -s -w '\nHTTP %{http_code}\n' \
  'https://nvkjzdhpjrbaietwcnmg.supabase.co/rest/v1/legal_acceptances_archive?select=*' \
  -H 'apikey: sb_publishable_UEenS-933goX-Wg4UUlN5A_KK7-pnIL'
```
**Resultado esperado:** HTTP 401 ou 200 com `[]` — nunca linhas. RLS habilitada
com zero policies nega por padrão, e o `REVOKE` remove o grant de `anon`.

---

## CT-02 — RLS: arquivo de assinaturas é inacessível ao cliente

**Ação:** idem CT-01 com `subscriptions_archive`.
**Resultado esperado:** idem CT-01.

---

## CT-03 — delete-account rejeita chamada sem JWT

**Ação:**
```bash
curl -s -w '\nHTTP %{http_code}\n' -X POST \
  'https://nvkjzdhpjrbaietwcnmg.supabase.co/functions/v1/delete-account' \
  -H 'Content-Type: application/json' -d '{"password":"x"}'
```
**Resultado esperado:** 401. `verify_jwt = true` barra antes de a função rodar.

---

## CT-04 — delete-account rejeita a chave publicável como Bearer

**Ação:** idem CT-03, acrescentando
`-H 'Authorization: Bearer sb_publishable_UEenS-933goX-Wg4UUlN5A_KK7-pnIL'`.
**Resultado esperado:** rejeitado. A chave anônima é um JWT válido — quem barra
é o `admin.auth.getUser(token)` do passo 1, não o `verify_jwt`. [REQ-DEL-06]

---

## CT-05 — delete-account rejeita método diferente de POST

**Ação:** `curl -X GET` no endpoint, com JWT válido.
**Resultado esperado:** HTTP 405, corpo `{"error":"method_not_allowed"}`.

---

## CT-06 — Senha incorreta não apaga nada

**Pré-condição:** logado na conta descartável, com ao menos 1 projeto criado.
**Ação:** Configurações → Excluir conta → Continuar → digitar senha errada →
Excluir permanentemente.
**Resultado esperado:** mensagem "Senha incorreta.". O diálogo permanece aberto
no passo 2. A conta e os dados continuam intactos após recarregar. [REQ-DEL-07]

---

## CT-07 — Senha vazia não habilita o botão

**Ação:** chegar ao passo 2 e deixar o campo vazio.
**Resultado esperado:** botão "Excluir permanentemente" desabilitado.

---

## CT-08 — Passo 1 enumera consequências e não apaga nada

**Ação:** Configurações → Excluir conta.
**Resultado esperado:** diálogo lista projetos/registros, princípios e capítulos,
imagens, histórico do Índice; menciona cancelamento de assinatura; frase "Esta
ação é irreversível e não pode ser desfeita.". Botões: Cancelar, Exportar meus
dados antes, Continuar. [REQ-DEL-22]

---

## CT-09 — Cancelar em qualquer passo é inócuo

**Ação:** abrir o diálogo, avançar ao passo 2, clicar Cancelar. Repetir com
`Esc` e com clique fora.
**Resultado esperado:** diálogo fecha, nada é apagado, ao reabrir volta ao
passo 1 com o campo de senha limpo.

---

## CT-10 — Exportação antes de excluir

**Pré-condição:** conta com pelo menos 1 projeto, 1 entry e 1 princípio.
**Ação:** passo 1 → "Exportar meus dados antes".
**Resultado esperado:** download de JSON. Toast informa **14 tabelas**
(13 de `USER_TABLES` + `profiles`) e a contagem de imagens. O diálogo
**permanece aberto** no passo 1. [REQ-DEL-22]

---

## CT-11 — Conteúdo do arquivo exportado

**Ação:** abrir o JSON baixado.
**Resultado esperado:** contém as chaves `projects`, `entries`, `principles`,
`chapters`, `baseline_assessments`, `transfer_proofs`, `operator_sheets`,
`notification_configs`, `operator_index`, `subscriptions`, `legal_acceptances`,
`entry_images`, `feedback_suggestions` e `profiles`. Os projetos criados no teste
aparecem com o conteúdo correto.

---

## CT-12 — Visitante: rótulo e fluxo próprios

**Pré-condição:** navegador sem sessão (aba anônima), onboarding concluído como
visitante, ao menos 1 projeto local.
**Ação:** abrir Configurações.
**Resultado esperado:** o botão diz **"Apagar dados deste dispositivo"**, não
"Excluir conta". Ao clicar, diálogo de **passo único**, sem campo de senha, com
o texto "Como você não tem conta, eles não existem em nenhum outro lugar."
[REQ-DEL-25]

---

## CT-13 — Visitante: limpeza local efetiva

**Ação:** confirmar "Apagar dados" no CT-12.
**Resultado esperado:** app recarrega no onboarding. Em DevTools →
Application → Local Storage, **nenhuma chave com prefixo `aop.`** permanece.
Notificações agendadas canceladas. [REQ-DEL-16] [REQ-DEL-19]

---

# BLOCO B — Destrutivos

**Ordem obrigatória.** São uma sequência sobre a mesma conta descartável.
Não pule etapas — CT-19 é a prova da Etapa 6 e depende de CT-15.

---

## CT-14 — Preparar massa de dados

**Ação:** na conta descartável, criar: 1 projeto com Norte, 1 COPA completo
(gera `structured_C/O/P`), 1 APA com princípio, 1 entrada com **foto** (Formato
C), e aceitar os documentos legais no cadastro.
**Resultado esperado:** dados visíveis no Diário e no Painel. Anote o `user_id`:

```sql
SELECT id, email FROM auth.users WHERE email = 'seuemail+del01@gmail.com';
```

---

## CT-15 — Exclusão completa executa

**Ação:** Configurações → Excluir conta → Continuar → senha **correta** →
Excluir permanentemente.
**Resultado esperado:** botão exibe "Excluindo conta…" e o diálogo **não fecha**
por `Esc` nem clique fora durante a operação. Ao concluir, o app redireciona
para `/` no estado de visitante.

---

## CT-16 — Usuário e dados desapareceram

**Ação:**
```sql
SELECT count(*) FROM auth.users WHERE email = 'seuemail+del01@gmail.com';
SELECT count(*) FROM public.projects WHERE user_id = '<user_id do CT-14>';
SELECT count(*) FROM public.entries  WHERE user_id = '<user_id do CT-14>';
SELECT count(*) FROM public.profiles WHERE id      = '<user_id do CT-14>';
```
**Resultado esperado:** **0 em todas.** O CASCADE de `auth.users` propagou.

---

## CT-17 — Prova de consentimento sobreviveu

**Ação:**
```sql
SELECT original_user_id, document_type, version, accepted_at, deletion_reason
FROM public.legal_acceptances_archive ORDER BY archived_at DESC;
```
**Resultado esperado:** linhas novas em relação ao baseline, uma por documento
aceito, com `original_user_id` igual ao do CT-14 e `deletion_reason =
'account_deletion'`. **Esta é a tabela que não pode ter FK** — se sumiu junto,
[REQ-DEL-01] falhou. Note que `user_email_hash` é hash, não o e-mail.

---

## CT-18 — Login com a conta excluída falha

**Ação:** tentar entrar com o mesmo e-mail e senha.
**Resultado esperado:** falha de credenciais. A conta não existe mais.

---

## CT-19 — Recadastro é permitido, segundo trial é bloqueado

**Pré-condição:** CT-15 concluído. Só é conclusivo se a conta excluída **tinha
trial** (`subscriptions_archive.trial_ends_at` não nulo — confira antes).
**Ação:** criar conta novamente com o **mesmo e-mail**, e tentar iniciar o
período de teste.
**Resultado esperado:** o cadastro **funciona** (Seção 8 prevê recadastro). A
tentativa de trial é **recusada** com a mensagem exata:

> O período de teste gratuito já foi utilizado por este e-mail.

Se aparecer "Edge Function returned a non-2xx status code", o frontend está
desatualizado — a correção está em `src/lib/stripe.ts`. Se o trial for
**concedido**, a Etapa 6 falhou. [REQ-DEL-28]

---

## CT-20 — Imagens removidas do Storage

**Pré-condição:** CT-14 incluiu entrada com foto.
**Ação:** Supabase → Storage → bucket `entry-images`, procurar a pasta do
`user_id` do CT-14.
**Resultado esperado:** nenhum arquivo remanescente. Falha no passo 5 abortaria
a exclusão inteira, então arquivo órfão com conta apagada é contradição.

---

## CT-21 — Assinatura cancelada e customer preservado

**Pré-condição:** só aplicável se a conta descartável tinha assinatura ativa.
**Ação:** Stripe → Customers → localizar pelo e-mail.
**Resultado esperado:** a **subscription** aparece como cancelada; o **customer
continua existindo** com o histórico de faturas — registro fiscal, preservação
deliberada. [REQ-DEL-09] [REQ-DEL-13]

```sql
SELECT plan, stripe_customer_id, stripe_subscription_id,
       trial_ends_at, cancelled_at_deletion
FROM public.subscriptions_archive ORDER BY archived_at DESC LIMIT 1;
```

---

## CT-22 — Idempotência do arquivo

**Ação:** repetir o INSERT de teste da migration (seção VALIDAÇÃO, item 8) com
`original_id` duplicado.
**Resultado esperado:** violação de unicidade. Garante que uma retentativa após
falha nos passos 7 ou 8 não duplica a prova de consentimento.

---

## Registro de resultados

| CT | Descrição | Resultado | Observação |
|---|---|---|---|
| 01 | RLS aceites | **PASSOU** | `42501 permission denied` + 401 — negado no nível de privilégio, antes da RLS |
| 02 | RLS assinaturas | **PASSOU** | idem CT-01 |
| 03 | Sem JWT | **PASSOU** | `UNAUTHORIZED_NO_AUTH_HEADER` — barrado pelo gateway |
| 04 | Chave anônima como Bearer | **PASSOU** | `{"error":"unauthorized"}` — formato da função: passou o `verify_jwt`, barrado pelo `getUser` do Passo 1 |
| 05 | Método não-POST | pendente | exige JWT válido |
| 06 | Senha incorreta | pendente | exige conta real |
| 07 | Senha vazia | pendente | exige sessão real |
| 08 | Passo 1 enumera | pendente | exige sessão real |
| 09 | Cancelar é inócuo | **PASSOU (visitante)** | nenhuma chave semeada removida; falta a variante autenticada |
| 10 | Exportação | pendente | exige conta real |
| 11 | Conteúdo do JSON | pendente | exige conta real |
| 12 | Visitante: rótulo | **PASSOU** | 7 asserts: rótulo correto, passo único, sem senha, sem "Continuar" |
| 13 | Visitante: limpeza | **PASSOU** | zero sentinelas sobreviveram; chave de terceiro preservada |
| 14 | Massa de dados | **PASSOU** | 2 projetos, 15 registros, 2 princípios, 2 imagens, 2 aceites, trial até 2026-08-14 |
| 15 | Exclusão executa | **PASSOU** | dispositivo limpo leva a `/onboarding`, não a `/login` — prova que `clearWasAuthenticated()` rodou [REQ-DEL-18] |
| 16 | Dados sumiram | **PASSOU** | zero nas 8 contagens: usuário, profile, projetos, registros, princípios, imagens, aceites, assinaturas |
| 17 | Aceites sobreviveram | **PASSOU** | `legal_acceptances` = 0 e `legal_acceptances_archive` = 2 (privacy_policy 1.1, terms_of_use 1.1). O contraste é o [REQ-DEL-01] |
| 18 | Login falha | **PASSOU** | credenciais recusadas após a exclusão |
| 19 | **Bloqueio de 2º trial** | pendente | |
| 20 | Storage limpo | **PASSOU** | bucket `entry-images` sem a pasta do `user_id` |
| 21 | Stripe | **PASSOU** | assinatura `Cancelada`, encerrada 31/07 18:36; log `DELETE /v1/subscriptions` 200 OK às 18:36:10; customer preservado; fatura R$ 0,00 |
| 22 | Idempotência | pendente | |

**Conta usada no Bloco B:** `amandaoliveiradoor28@gmail.com`,
`user_id = 672698e8-861f-45e2-b491-61d4cc1e741b`,
`cus_UzMTVPC3TaqvCt` / `sub_1TzNkfFT1yK1Ox4iSsx7fDQG`.
Linha de base dos dois arquivos antes da exclusão: **0 e 0** — qualquer linha
presente depois é necessariamente desta exclusão.

---

## Método de verificação de CT-12 e CT-13

Executados com Chromium a 375px contra o dev server local. O ponto delicado do
CT-13 é distinguir chave que **sobreviveu** à limpeza de chave **recriada** pelo
app ao reiniciar como visitante novo — a simples presença da chave não decide.

A verificação usa valores-sentinela impossíveis de o app gerar
(`aop.guest_started_at = '2020-01-01'`, `aop.passive_buffer =
[{"sentinela":true}]`). Depois da limpeza ambas as chaves existem, mas com
valores novos — portanto foram recriadas, não preservadas. Zero sentinelas
sobreviveram.

Semeado também `aop.feedback_2026-07`, de nome variável por mês: é o caso que
uma lista estática de chaves não alcançaria, e que a varredura por prefixo
resolve. [REQ-DEL-16]

Uma chave fora do prefixo (`naoDeveSerApagado`) foi preservada, confirmando que
a limpeza não é indiscriminada.

## Por que CT-07, CT-08 e CT-09 (autenticado) não foram automatizados

Tentou-se forjar uma sessão em `localStorage` para exercitar a interface do
fluxo autenticado sem rede. O supabase-js rejeita a sessão sintética e o app
permanece em `GUEST`. Como uma sessão real exige alcançar o Supabase, estes três
ficam para execução manual — e são observados de graça durante o CT-06, que
percorre os mesmos dois passos do diálogo.

## Não coberto aqui

Os abortos dos passos 3 a 8 (`stripe_cancel_failed`, `storage_cleanup_failed`,
`archive_legal_failed`, `archive_subs_failed`, `nullify_failed`) exigem injeção
de falha — derrubar o Stripe, revogar permissão do bucket, quebrar a constraint
do arquivo. Não são reproduzíveis por uso normal do app. O que o teste manual
cobre é a **ordem** das operações: como nada é destruído antes do passo 9,
qualquer aborto deixa a conta intacta, e isso é verificável relendo os dados
após uma falha provocada.
