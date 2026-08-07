# MUNAY — Site

Plataforma de descoberta de comunidades, eventos e experiências esportivas
e culturais de Brasília. O site hoje faz três coisas: descoberta de
comunidades (filtros + detalhe), RSVP de eventos com controle de capacidade
e captação de leads B2C (lista de espera) e B2B (organizadores). Também é
evidência de execução na Etapa 2 do edital Start BSB. Está **em produção
no Railway** — push na `main` = deploy.

## Fontes de verdade

- `docs/MUNAY_Master_Plan_v1_1.md` — calendário, fases, edital.
- `docs/MUNAY_Blueprint_Plataforma_v1.md` — produto e engenharia
  (pilares, camadas de dados C0–C7, ondas e backlog de stories).
- Stories executáveis em `docs/stories/`.

Hierarquia (regra do Master Plan): plano > repositório git > docs de
planejamento > memória de conversa (nunca é fato). Este CLAUDE.md é o
resumo operacional — em conflito, os docs acima mandam.

## Regras inegociáveis

1. **O nome é MUNAY.** Nunca "MUNA" (registro antigo incorreto) nem "ELO"
   (nome anterior do projeto). Inscrição oficial no edital = MUNAY.
2. **Regra de realidade**: só existe o que está em repositório git.
   Memória de conversa, resumo de sessão ou doc sem código correspondente
   = planejamento, nunca fato. (Origem: a "memória fantasma" que descrevia
   um app mobile que nunca existiu — o app é greenfield, ver Master Plan.)
3. **Nunca publicar nomes/dados de parceiros reais** (Liga Entrequadras,
   MOAI, Gracie Barra Noroeste, Evolve etc.) sem autorização formal por
   escrito. Conteúdo ilustrativo carrega **`demo: true`** (models
   `Community` e `Event`; o seed só cria registro demo) — a flag existe
   para o fake ser isolável e removível sem dó. Não criar registro com
   `demo: false` sem autorização assinada.
4. **Cores só via tokens.** Os hex moram em **`lib/brand.ts`** (fonte
   única — `tailwind.config.ts` e as OG images importam de lá; next/og não
   enxerga classes Tailwind). Zero hex hardcoded em componente. Paleta
   alternativa em disputa (decisão 0.3 do PO) — a troca segue num arquivo só.
5. **Prisma fixado na major v6** (`^6.x` no package.json). Não subir de
   major nem trocar ORM sem decisão explícita. Migrations only: nunca
   editar migration já aplicada.
6. **Desvio confessado** (regra da fábrica): desviar de spec/plano pode —
   desde que explícito na seção "Desvios" do handoff e registrado em
   story/commit. Nunca silencioso. Precedente: a `lista_espera` da
   STORY-002 nasceu fora de spec, foi confessada e aceita.
7. Copy em pt-BR, voz direta, sem corporativês. Lime é acento raro, não
   cor de fundo de texto (contraste ruim sobre areia).

## Fábrica (papéis e fluxo)

- **Mateus = PO** (escopo/prioridade, SLA de decisão 24h) ·
  **Kaxcav = tech lead** (stack, review, **único merge na `main`**).
- Agentes executam stories, nunca inventam escopo. 1 story = 1 branch.
- Toda sessão de agente: começa lendo este arquivo + a story; termina com
  handoff curto (feito / assumido / desvios / travou).
- **Um operador de git por vez.** `add`/`commit`/`push` é o Kaxcav, em
  janela única. Agente entrega arquivos e PARA — não roda git de escrita.
  (Aprendido em 06/08: `index.lock` travou o repo com duas ferramentas.)
- **Mover/apagar só com lista explícita de arquivos, aprovada antes.**
  Nunca executar "move o que estiver em X". (Aprendido em 06/08: 11
  standards do AIOX movidos por engano numa instrução genérica.)
- **O app mobile não existe e não deve nascer agora**: gasto antes da
  contratação (19/11) não é reembolsável — o app é O escopo financiável.

## Contexto do edital (afeta decisões de produto)

- Chamada 02/2026 Start BSB, **Eixo I** (Ideação/Pré-Incubação), TRL 3.
- Etapa 2 da inscrição: até **03/09/2026** (site no ar = evidência).
- Preliminar 24/09 · resultado final 15/10 · contratação a partir de
  19/11 · subvenção R$ 53k.
- Avaliação: Mercado (peso 3) · **Inovação (peso 4)** · Coordenador (peso 1).

## Stack e arquitetura (estado real)

- Next.js 15 (App Router) · TypeScript strict · Tailwind 3.4 · Zod ·
  **Prisma 6 + PostgreSQL 16**. Local: Docker (porta **5434** no host —
  5432/5433 já pertencem a outros projetos). Produção: Railway.
- Rotas: `/` (landing + captação) · `/comunidades` (descoberta com
  filtros via URL) · `/comunidades/[slug]` · `/descobrir/[recorte]` (SEO
  programático) · `/eventos/[slug]` (detalhe + RSVP) · `/rsvp/[token]`
  (gerenciar inscrição, noindex) · `/entrar` + `/entrar/confirmar` +
  `/minhas-inscricoes` (auth por magic link) · `/privacidade` (LGPD) ·
  `/admin/*` (interno: Basic Auth por env, noindex + robots).
  Não existe índice `/eventos` — evento se descobre pela comunidade.
- APIs: `POST /api/leads` · `POST /api/rsvps` · `POST /api/rsvps/cancel` ·
  `/api/auth/[...all]`. RSVP roda em transação **Serializable** com retry +
  backoff (P2034): capacidade cheia → entra como `lista_espera`; e-mail
  repetido no evento → `{ok, jaExistia}`. Quem faz RSVP também vira lead
  (`origem: "rsvp"`, upsert que não sobrescreve cadastro do site). Padrão
  permanente do Blueprint: **transação onde há disputa**.
- **E-mail nunca sai de dentro da transação.** O RSVP e o cancelamento
  rodam com retry; enviar lá dentro faria a pessoa receber o mesmo e-mail
  a cada repetição. Disparo é sempre **depois do commit**, via
  `dispararEmail()` (fire-and-forget que engole erro). Templates em
  `lib/emails-rsvp.ts`, transporte em `lib/email.ts` (adapter
  `EMAIL_PROVIDER` = smtp | resend | não definido → no-op logado).
  `EMAIL_FROM` NUNCA é hardcoded — domínio novo é troca de env, não de
  código. A copy da UI só promete aviso por e-mail quando
  `emailConfigurado()` é true.
- **E-mail tem TRÊS estados, não dois** (`statusEmail()`): desligado,
  **teste** e produção. O do meio é o perigoso: com o remetente
  `onboarding@resend.dev` a Resend só entrega pro dono da conta e devolve
  403 pro resto — e como `sendEmail` engole erro de propósito, o sintoma é
  silêncio. Por isso `emailConfigurado()` responde **false** nesse modo: a
  UI não promete aviso e o `/admin` mostra o alerta. Só vira produção com
  domínio verificado + `EMAIL_FROM` nesse domínio.
- **SEO programático** (`lib/descoberta.ts`): os recortes vêm do banco,
  nunca do produto cartesiano modalidade × 35 RAs — página sem dado é 404,
  não 200 vazio (doorway page derruba o domínio inteiro). Recorte que só
  tem comunidade `demo: true` renderiza mas sai `noindex` e fora do
  sitemap: publicar parceiro ilustrativo no Google seria transformar
  exemplo em afirmação pública (regra 3).
- Dados: `prisma/schema.prisma` (Lead, Community, Event, Rsvp), migrações
  em `prisma/migrations/`, client singleton em `lib/db.ts`, seed demo
  idempotente em `prisma/seed.ts` (tudo `demo: true`).
- Validação compartilhada client/server em `lib/leads.ts`, `lib/rsvps.ts`
  e `lib/admin.ts` (fonte única, Zod). Regiões: **`lib/regioes.ts`** é a
  fonte única das 35 RAs oficiais + "Outra região" — nenhuma lista de
  região hardcoded fora dela.
- Anti-spam: honeypot `site` nos dois forms — preenchido, a API responde
  `{ok:true}` falso sem gravar. Não "consertar" isso achando que é bug.
- **Ninguém chama `auth.api.getSession()` direto — só `sessaoAtual()`**
  (`lib/sessao.ts`). A Better Auth **lança** nessa chamada sem
  `BETTER_AUTH_SECRET`, e como o `<Header />` está em toda página, o site
  INTEIRO respondia 500 por falta de uma variável (achado em 06/08 rodando
  a suíte numa máquina sem o segredo). A suíte agora roda **sempre** com a
  auth desligada (`playwright.config.ts`), então todo teste de página é
  prova de que o site fica de pé sem ela. Pendência consciente: sem o
  segredo a lib ainda solta um `unhandledRejection` no boot — vem de
  construir o `betterAuth()`, o Next registra e segue servindo; matar isso
  exigiria construção preguiçosa em `lib/auth.ts`.
- Sem `DATABASE_URL` o site sobe mesmo assim: APIs respondem 503 amigável
  e o sitemap sai só com rotas fixas (decisão consciente).
- URL pública: fonte única em `lib/site.ts` — `NEXT_PUBLIC_SITE_URL`
  aceita domínio sem protocolo (Railway fornece assim); ninguém lê a env
  direto. ⚠️ **`NEXT_PUBLIC_*` vale nos dois tempos, e isso confunde:** no
  bundle de **cliente** o valor é assado no BUILD (trocar exige rebuild —
  restart mantém o valor velho); em código de **servidor** (middleware,
  route handler, RSC) é lido em **runtime**, então trocar no Railway e
  reiniciar já muda o comportamento. Provado em 06/08 subindo o mesmo
  `.next` com três valores e vendo o middleware mudar de destino nos três.
- **Sem `NEXT_PUBLIC_SITE_URL` o middleware NÃO canonicaliza** (`hostCanonico()`
  devolve string vazia). O fallback de `SITE_URL` existe só pro `metadataBase`
  e as OG images — usar chute como canônico faria uma variável esquecida
  derrubar o site inteiro, com todo visitante levando 308 pra um domínio que
  talvez nem seja nosso.
- **O site tem um domínio canônico e o middleware força ele.** O Railway
  nunca desliga o `*.up.railway.app`, e no endereço secundário a Better
  Auth compara a origem com `baseURL` e devolve **403** — o login morre sem
  dizer por quê, e a mensagem de erro aponta pro lugar errado. O middleware
  redireciona com **308** (preserva método e corpo; 301 viraria GET e
  perderia POST). `/api/*`, assets e `localhost` ficam fora do redirect.
- Assinatura visual: `components/PlanoPiloto.tsx` (SVG procedural — não
  substituir por mapa pago).
- Fontes por `<link>` no layout (build sem rede); futuro: `next/font`.

## Comandos

```bash
docker compose up -d    # Postgres 16 local (localhost:5434)
npm ci                  # roda `prisma generate` sozinho (script postinstall)
npx prisma migrate dev  # aplica migrações (cria o banco na 1ª vez)
npx prisma db seed      # dados demo (tsx prisma/seed.ts)
npm run dev             # desenvolvimento
npm run build           # build + typecheck + lint (reprova de verdade)
npm run typecheck       # só tipos
npm run lint            # eslint . (flat config em eslint.config.mjs)
```

ESLint: `npm run lint` é **`eslint .`**, não `next lint` — o `next lint`
está deprecado e some no Next 16, e enquanto não havia config ele abria um
menu interativo e travava o terminal (ou seja: o projeto passou semanas
achando que tinha lint sem ter nenhum). O flat config ignora tudo que
começa com ponto (`.aiox-core`, `.claude`, `.github`…): o ESLint 9 deixou
de pular pasta oculta sozinho, e sem essa linha o lint acusa ~2.400 erros
em código que não é nosso.

Env local: copiar `.env.example` → `.env` (já vem com
`DATABASE_URL=postgresql://munay:munay@localhost:5434/munay`).

**`npm ci` apaga o `node_modules` inteiro — e junto vai o client gerado do
Prisma.** Sem regenerar, o build quebra com um erro que não parece ter
nada a ver: `Property 'PrismaClientKnownRequestError' does not exist on
type 'typeof Prisma'`. Por isso existe o script `postinstall`: o
`prisma generate` passou a rodar sozinho depois de todo install. Se algum
dia o erro voltar, é sinal de que o postinstall não rodou —
`npx prisma generate` resolve na hora. (Aprendido em 06/08.)

## Agora (ONDA 0 fechada — atualizado 06/08, noite)

**ONDA 0 inteira está escrita.** Em produção: STORY-003 (cancelamento +
promoção via token), STORY-005 (admin interno + 35 RAs + city) e
STORY-006 (OG, Umami, `/privacidade`, `lib/regioes.ts`). Em branch,
buildando limpo, esperando push/merge do Kaxcav:

- **STORY-007 · auth por magic link** (`feat/auth-magic-link`) — Better
  Auth 1.6.26 **pinada exata**, só 2 plugins (magicLink + nextCookies,
  este SEMPRE por último), sessão em banco, `storeToken: "hashed"`, página
  intermediária `/entrar/confirmar` porque scanner corporativo (SafeLinks,
  gateway .gov.br) faz GET preventivo e queimaria o token. Sem
  `BETTER_AUTH_SECRET` a auth responde 503 em vez de cair no segredo
  default público — mesma regra do "nunca existe senha default" do /admin.
- **STORY-004 · e-mail transacional** — **desbloqueada**: a premissa "só
  com domínio" caiu. O adapter fala SMTP ou Resend e `EMAIL_FROM` vem de
  env, então domínio próprio vira troca de variável. Fecha o buraco maior
  do produto: quem era promovido da fila **não era avisado por ninguém**.
- **Melhorias do /admin** — paginação (50/página), busca por nome/e-mail,
  período de 7/30 dias, dropdown de eventos, "ver no site". CSV exporta o
  recorte inteiro, **nunca só a página**.
- **SEO programático** — `/descobrir/[recorte]` (ver seção de stack).
- **ESLint** configurado; o `npm run build` reprova erro de lint de fato.

O que resta, e não é código:

1. **Kaxcav**: push/merge das branches; no Railway, setar
   `BETTER_AUTH_SECRET`, `EMAIL_PROVIDER`, `SMTP_URL`/`RESEND_API_KEY` e
   `EMAIL_FROM`; **rotar a senha do Postgres** (vazou em chat); criar o
   serviço Umami (+ `NEXT_PUBLIC_UMAMI_*`); apagar por SQL os 4 registros
   de teste que sobraram em produção.
2. **Decisões do PO** (Blueprint §7): domínio, paleta (0.3), ratificar
   "cancelou → fim da fila" (desvio 3 da 003), limpeza de memória (0.2).
3. **Operação**: cadastrar parceiros reais pelo `/admin` — só com
   autorização assinada (regra 3).
4. **ONDA 1 — specs escritas em 06/08**: `docs/stories/STORY-008`
   (pertencimento C3), `STORY-009` (painel do organizador C4) e
   `STORY-010` (conteúdo C5). **São specs: a execução é ONDA 2**, depois
   do resultado do edital (15/10) — construir antes queima orçamento não
   reembolsável. C2 (auth) saiu na frente por decisão do tech lead:
   **desvio confessado**, registrado aqui e no Master Plan.
   Três decisões dessas specs esperam ratificação do PO (Blueprint §7):
   Reviews fora da primeira leva, `Favorite` fundido em `Membership`, e
   conteúdo começando só por feed de avisos.

Anti-meta: nenhuma feature nova fora disso antes da Etapa 2 (03/09);
construção pesada é pós-resultado (15/10), como escopo financiável.
