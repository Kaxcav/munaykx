# STORY-007 · Auth + User (C2) — magic link, sessão e reivindicação de RSVPs

**Repo:** munay-site · **Executor:** Claude Code (@dev) · **Review/merge:** Kaxcav
**Branch:** `feat/auth-magic-link` a partir da `main`.

> **Desvio confessado, no cabeçalho, de propósito.** O Blueprint separa a spec
> (007, ONDA 1) da execução (011+, ONDA 2, pós-resultado do edital). Esta story
> funde as duas: o tech lead decidiu em 06/08/2026 construir a auth agora.
> Consequência econômica assumida: o que for construído antes de 19/11 não é
> reembolsável pela subvenção — a Regra Econômica do Master Plan foi lida e
> quebrada de propósito, não por esquecimento.

---

## Contexto

Auth é a raiz do mapa de dependências do Blueprint: pertencimento (C3), painel
do organizador (C4) e conteúdo (C5) pendem todos dela. Hoje a plataforma
identifica pessoas só por e-mail digitado — e-mail digitado não é e-mail
provado, o que já apareceu como limite concreto na STORY-003 (o token de
gerenciamento não pode ser devolvido numa reinscrição, senão qualquer um
sequestra a inscrição alheia).

Esta story resolve isso: e-mail provado, sessão de verdade, e as inscrições
antigas reivindicadas pela pessoa certa.

**Premissa inegociável de produto: RSVP continua funcionando SEM conta.**
Auth é aditiva, nunca barreira. Colocar login na frente da inscrição derruba
conversão justamente na janela do edital. Quem quiser conta, ganha vantagens;
quem não quiser, se inscreve como sempre.

---

## Decisões de arquitetura (fechadas aqui — o Blueprint C2 deixou em aberto)

**1. Biblioteca: Better Auth.** Não Auth.js.

O Blueprint dizia "Auth.js v5 vs Better Auth (avaliar na spec, não agora)". A
avaliação (06/08/2026) encontrou um fato que dissolve a comparação: em
**22/09/2025 a Auth.js foi absorvida pela Better Auth** — mesma equipe mantém
as duas, e ela recomenda publicamente Better Auth para projetos novos, deixando
a Auth.js em modo security-patch. A **Vercel comprou a Better Auth em
07/07/2026** (MIT mantida). A Auth.js v5 segue em **beta há ~3 anos**, sem data
de saída; o `latest` do npm ainda aponta pra v4.

Somado a isso, para o nosso caso específico:
- `@better-auth/prisma-adapter` lista `^6.0.0` **explicitamente** nos peers —
  Prisma 6 é caminho de primeira classe, não tolerado (regra 5 do projeto).
- Magic link agnóstico de transporte: implementamos `sendMagicLink` com o que
  quisermos, sem depender de lista de provedores homologados.
- **Tokens single-use consumidos atomicamente e `storeToken: "hashed"`** —
  segurança que não precisamos escrever.
- `databaseHooks.user.create.after` é exatamente o gancho pra reivindicar os
  RSVPs por e-mail.
- Sem a herança OAuth: a Auth.js obrigaria carregar a tabela `Account` inteira
  (PK composta, `refresh_token`, `id_token`…) que num projeto magic-link-only
  nunca seria usada.
- Sessão em banco com revogação real (`DELETE` na linha) + cookie cache pra não
  bater no banco a cada request. Na Auth.js, adapter + middleware Edge **obriga**
  `strategy: "jwt"`, que não tem revogação.

Riscos aceitos e como mitigar, **obrigatório no código**:
- Cadência agressiva causa regressão (caso real: o adapter Prisma quebrou na
  1.6.20). → **Versão pinada exata no `package.json`, sem `^`.** Ficar em 1.6.x;
  não subir pro 1.7 antes de semanas de estabilização.
- Superfície de segurança grande nos plugins (lote de vulnerabilidades em
  jun/2026 em SSO/OIDC/MCP). → **Instalar SÓ `magicLink` e `nextCookies`.**
  Nada de SSO, OIDC, MCP, organization, passkey.
- `nextCookies()` **precisa ser o último plugin do array** — fora de ordem, as
  server actions falham **em silêncio** ao setar cookie. → Comentário no código
  + teste E2E do login que pegaria isso.
- `getSessionCookie()` no middleware **só checa existência, não valida**. →
  Usar só pra redirect otimista; validação real sempre no server component /
  route handler.

**2. E-mail: adaptador atrás de env, e o domínio deixa de ser bloqueio.**

Descoberta que muda o planejamento: **dá pra escrever e testar o fluxo inteiro
hoje, sem domínio.** O que o domínio bloqueia é a entrega para terceiros, não o
desenvolvimento.

- Uma única função `sendEmail({ to, subject, react })` atrás de um adaptador.
  Provider por env: `EMAIL_PROVIDER` (`smtp` | `resend`), `EMAIL_FROM`,
  `RESEND_API_KEY`, `SMTP_URL`.
- **`EMAIL_FROM` nunca hardcoded** — quando o domínio sair, é 1 variável no
  Railway e redeploy. Zero código.
- **Dev e CI: Mailpit em Docker** (SMTP :1025, UI :8025, REST API pra asserção
  em teste). O MailHog está morto desde 2020; Mailpit é o padrão atual.
- **Smoke real: Resend com `onboarding@resend.dev`**, que só entrega pro e-mail
  da própria conta — suficiente pra validar render e clique fora do localhost.
  Free tier: 3.000/mês, 100/dia.
- Recomendação ao PO, fora do escopo de código: **registrar um domínio técnico
  descartável (~R$ 40/ano no Registro.br) desacopla a decisão de marca da
  necessidade técnica.** O domínio bonito continua esperando o Mateus; o e-mail
  transacional para de esperar. `.up.railway.app` **não** serve como remetente
  (não controlamos o DNS do domínio-pai).

**3. Magic link com página intermediária — não logar no GET.**

Scanners de segurança (Outlook SafeLinks, antivírus corporativo, gateways
`.gov.br`) fazem GET preventivo nos links do e-mail. Com token single-use, o
token é **queimado antes da pessoa clicar** — problema documentado no NextAuth,
FusionAuth, Supabase, Better Auth e Ghost. Nosso público é exatamente o pior
caso: Brasília, muito e-mail corporativo e `.gov.br`, e o próprio PO usa
`@hotmail.com` (Microsoft = SafeLinks ligado).

Portanto: o link do e-mail abre uma **página com botão "Entrar"**; o consumo do
token acontece no POST desse botão, nunca no GET. Validade **20 minutos**.

**4. Sessão:** database sessions + cookie cache. `expiresIn` 30 dias,
`updateAge` 1 dia. Revogação = deletar a linha.

**5. Middleware pode usar runtime Node.** O Next 15.5 estabilizou
`export const config = { runtime: 'nodejs' }` — o projeto está na **15.5.22**.
Isso não muda nada obrigatoriamente nesta story, mas destrava o Basic Auth do
admin usar `node:crypto` se um dia quisermos.

---

## Migration

Tabelas do Better Auth (`npx @better-auth/cli generate` gera o schema Prisma —
**conferir o resultado antes de aplicar**, não aceitar cego):
`user`, `session`, `account`, `verification`.

Mais, no nosso schema:

- `Rsvp`: `userId String? @map("user_id")` + relation opcional pra `User` +
  `@@index([userId])`. **O campo `email` do Rsvp permanece** — é ele que
  permite inscrição anônima e é a chave da reivindicação.
- `Lead`: **não mexer.** Lead é captação, não identidade.

Nomes de tabela: usar `modelName`/`fields` da Better Auth pra manter o padrão do
schema (`@@map` snake_case, como o resto do projeto).

---

## Tarefas

1. **Fundação de e-mail** — `lib/email.ts` com `sendEmail()` e os dois
   adaptadores (SMTP via Nodemailer, Resend via SDK), escolhidos por
   `EMAIL_PROVIDER`. Templates em React Email. `docker-compose.yml` ganha o
   serviço **Mailpit**. `.env.example` documenta as 4 envs novas. Sem env de
   e-mail configurada, o app **sobe normalmente** e o envio vira no-op logado —
   mesmo padrão do `DATABASE_URL` e do Umami.

2. **Better Auth instalada e configurada** — `lib/auth.ts` (server) e
   `lib/auth-client.ts` (client). Plugins: `magicLink` + `nextCookies` **nessa
   ordem, nextCookies por último**. `storeToken: "hashed"`, `expiresIn: 1200`.
   `sendMagicLink` chama o `sendEmail()` da tarefa 1. Route handler em
   `app/api/auth/[...all]/route.ts`. **Versão pinada exata.**

3. **Fluxo de login** — `/entrar`: campo de e-mail, honeypot `site` (mesmo
   padrão dos outros forms), estado de "confere teu e-mail". O link do e-mail
   aponta pra `/entrar/confirmar?token=…`, que renderiza a **página
   intermediária com botão** (tarefa: NÃO consumir token no GET). Erros com copy
   honesta: token expirado, token já usado, link inválido — cada um com saída
   clara (pedir novo link).

4. **Reivindicação de RSVPs** — `databaseHooks.user.create.after`: ao criar
   usuário, `updateMany` nos `Rsvp` com aquele e-mail (case-insensitive, mesmo
   `trim().toLowerCase()` das rotas existentes) setando `userId`. Idempotente.
   **Login de quem já tem conta também reconcilia** (RSVPs feitos anonimamente
   depois do cadastro): rodar a mesma reivindicação no `session.create.after`.

5. **`/minhas-inscricoes`** — página autenticada listando os RSVPs do usuário:
   evento, data, status (confirmado / lista de espera / cancelada), e link pra
   página de gerenciamento. `noindex`. Sem sessão → redirect pra `/entrar`.
   Esta é a única superfície de valor da story pro usuário final; o resto
   (favoritos, minhas comunidades, agenda) é C3 / STORY-008.

6. **Header ciente de sessão** — "Entrar" quando anônimo; nome/inicial + "Sair"
   quando logado. Server component lendo a sessão de verdade (não o cookie
   otimista).

7. **Defesa em profundidade no `/admin`** *(fora do pedido literal, incluído por
   segurança — confessado)*: hoje a proteção do admin vive **só** no middleware,
   e as páginas consultam o Prisma sem nenhuma checagem própria. A CVE-2025-29927
   não nos atinge (estamos na 15.5.22, corrigida na 15.2.3), mas essa classe de
   bug já reapareceu três vezes e o que está exposto é dado pessoal (leads com
   nome, e-mail, WhatsApp — LGPD). Adicionar um `assertAdmin()` server-side
   chamado no layout do `/admin` e nas server actions, relendo o header
   `authorization` e comparando em tempo constante com a mesma função
   `igualSeguro` já existente. Dez linhas, e o middleware deixa de ser ponto
   único de falha.

8. **Testes E2E do login** — Playwright: dispara login → **lê o e-mail pela REST
   API do Mailpit** → extrai o link → abre a página intermediária → clica
   "Entrar" → assere sessão. Cobrir também: token expirado, token reusado, e
   **GET no link não consome o token** (o teste que protege contra o SafeLinks).

---

## Critérios de pronto

- Fluxo completo em dev com Mailpit: pedir link → receber e-mail → abrir página
  intermediária → clicar → sessão criada → `/minhas-inscricoes` lista os RSVPs
- **GET no link do e-mail NÃO consome o token** (verificado por teste)
- Token expirado e token reusado dão mensagens distintas e acionáveis
- RSVP feito anonimamente ANTES do cadastro aparece em `/minhas-inscricoes`
  depois do login; RSVP feito DEPOIS também (reconciliação no login)
- **Inscrição sem conta continua funcionando exatamente como antes** — nenhuma
  rota de RSVP passou a exigir sessão
- `/admin` responde igual com o `assertAdmin()` (503 sem envs, 401 sem
  credencial, 200 com) — e responde **401 mesmo se o middleware for pulado**
- Smoke com Resend `onboarding@resend.dev` pro e-mail da conta: e-mail chega,
  render ok, link funciona fora do localhost
- Sem envs de e-mail: app sobe, login mostra aviso honesto de indisponível
- `npm run build` + `typecheck` limpos; commits na branch; **push e merge são do
  Kaxcav** (regra do operador único de git)

---

## Fora de escopo

Membership / favoritos / minhas comunidades / agenda (C3 — STORY-008), painel
self-service do organizador (C4 — STORY-009), conteúdo e fórum (C5 —
STORY-010), OAuth social de qualquer tipo, senha, 2FA, papéis e permissões além
do admin já existente, migrar o `/admin` pra Better Auth (segue Basic Auth de
env), e-mail de confirmação de RSVP (STORY-004 — esta story entrega a
infraestrutura de e-mail que a 004 vai consumir).

**Nota de coordenação com a STORY-004:** a tarefa 1 desta story entrega
`lib/email.ts`. A 004 deixa de ser "bloqueada pelo domínio" e passa a ser
"depende da tarefa 1 da 007" — o domínio vira requisito só pra enviar a
terceiros, não pra escrever e testar.

---

## Handoff final

Feito / assumido / desvios / travou. Obrigatório relatar: a versão exata da
Better Auth instalada, se o schema gerado pelo CLI precisou de ajuste manual, e
o resultado do teste "GET não consome token".
