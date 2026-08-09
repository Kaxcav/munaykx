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
   Desde 07/08/2026 a paleta tem **`salvia`** (verde sálvia, pedido do PO) e
   seis **acentos de categoria** — todos DERIVADOS por mistura no
   `tailwind.config.ts`, nenhum hex novo. As classes de acento são escolhidas
   em runtime, então dependem da **`safelist`** do config: mexeu em
   `lib/modalidades.ts`, confira a safelist, senão o card sai colorido em dev
   e cinza em produção. A matemática de cor mora em **`lib/cor.ts`**, que não
   importa NADA — o loader de config do Tailwind não resolve o alias `@/`.
5. **Prisma fixado na major v6** (`^6.x` no package.json). Não subir de
   major nem trocar ORM sem decisão explícita. Migrations only: nunca
   editar migration já aplicada.
6. **Desvio confessado** (regra da fábrica): desviar de spec/plano pode —
   desde que explícito na seção "Desvios" do handoff e registrado em
   story/commit. Nunca silencioso. Precedente: a `lista_espera` da
   STORY-002 nasceu fora de spec, foi confessada e aceita.
7. Copy em pt-BR, voz direta, sem corporativês. **Desde o briefing de
   07/08/2026 o tom é mais coloquial** ("Dá uma conferida aí"), mirando jovem
   de classe A/B — nada institucional. Lime continua sendo acento RARO, não
   cor de fundo de texto (contraste ruim sobre areia); quem cobre área agora é
   o `salvia`.

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
  `/minhas-inscricoes` + `/perfil` + `/meus-ingressos` (auth por magic link,
  todas noindex) · `/privacidade` (LGPD) ·
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

## Trabalhar em paralelo (várias janelas)

Dá, e o repo já tem worktrees (`git worktree list`). O que NÃO dá é duas
janelas na mesma pasta — foi assim que o `index.lock` travou o repo em 06/08
e que dois `npm ci` simultâneos comeram o `node_modules` em 07/08.

Uma janela = um worktree = uma branch = um banco = uma porta:

```powershell
git worktree add ..\munay-B feat/outra-coisa
cd ..\munay-B
Copy-Item ..\munay-site\.env .env          # cada worktree tem o seu
npm ci                                      # node_modules é por pasta
docker exec munay-site-db-1 psql -U munay -d munay -c "CREATE DATABASE munay_b"
# no .env do worktree: DATABASE_URL=...localhost:5434/munay_b
npx prisma migrate deploy
$env:PW_PORTA='3200'                        # senão as duas suítes brigam
```

**Por que porta separada não é frescura:** com a porta fixa, a segunda suíte
acha a 3100 ocupada e — por causa de `reuseExistingServer` — reaproveita o
servidor da OUTRA branch. Verde contra código que não é o seu.

**Por que banco separado:** os fixtures apagam tudo que começa com `zzt-` no
`beforeAll`. Duas suítes no mesmo banco se apagam no meio.

**O que continua sendo de UM só:** `git push`, merge na `main`, e a migration.
Duas migrations criadas em paralelo colidem no histórico do Prisma e a segunda
só falha no deploy. Quem for mexer em `schema.prisma` avisa antes.

**Como dividir sem colisão:** paralelize por PASTA, não por intenção. Duas
janelas em `app/painel/` e `app/admin/` convivem; duas janelas em
`lib/organizacao.ts` não. Arquivos-gargalo hoje: `lib/organizacao.ts`,
`prisma/schema.prisma`, `tests/fixtures.ts`, `CLAUDE.md`.

## Armadilhas que já custaram tempo (não repita)

**Verde por acidente de ambiente é pior que vermelho.** Dois casos em 07/08:
um teste que passava só porque a máquina não tinha uma env que o CI tem, e
outro que dependia do `prisma db seed`, que o CI não roda. Antes de confiar
num verde, reproduza a condição do CI: banco NOVO e vazio e as variáveis do
job. Receita: `CREATE DATABASE munay_ci` → `migrate deploy` sem seed →
`DATABASE_URL` apontando pra ele.

**Teste que nunca falhou não é teste.** Ao escrever guarda de segurança,
quebre a guarda de propósito e confirme que o teste fica vermelho. Foi assim
que os testes de escopo do painel foram validados.

**Função com parâmetro default que lê env não é testável.** `f(bruto =
process.env.X)` chamada como `f(undefined)` lê a env do mesmo jeito. Separe a
parte pura (`fDe(valor)`) de quem lê o ambiente (`f()`).

**`prisma migrate dev` é interativo** e falha em terminal sem TTY. Caminho
não-interativo: `prisma migrate diff --from-schema-datasource
prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
dentro de `prisma/migrations/<timestamp>_<nome>/migration.sql`, depois
`migrate deploy`. **Cuidado com BOM:** `Set-Content -Encoding UTF8` do
PowerShell 5 grava BOM e o Postgres devolve `syntax error at or near "﻿"`.
Use `[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding $false))`.

**Antes de qualquer migration, confira pra onde a `DATABASE_URL` aponta.**
Near-miss em 06/08: o env do PowerShell apontava pra produção.

## Agora (atualizado 07/08, madrugada)

**Tudo que existia em branch foi mergeado. `main` = `57ded3f`, e o CI ficou
verde pela primeira vez.** Em produção: ONDA 0 completa + auth por magic
link + e-mail transacional + `/admin` com shadcn/ui + `/mapa` + domínio
canônico.

Estado verificado (não de memória):

- **E-mail está em PRODUÇÃO.** `sejamunay.com.br` verificado na Resend,
  envio habilitado, remetente `ola@sejamunay.com.br`. Mas **só 1 e-mail
  saiu da conta inteira** — falta a prova prática com destinatário que não
  seja o dono.
- **O domínio NÃO recebe e-mail**: não existe registro MX. O endereço do
  rodapé e da política de privacidade devolve bounce. Pendência do Kaxcav.
- **Produção não tem NENHUMA comunidade.** O site está no ar, testado e
  vazio. `/comunidades` responde "nada por aqui" e o `/mapa` mostra 35 de
  35 regiões sem ninguém. Decisão do PO: rodar o seed demo ou esperar
  organizador real.
- **Senha do Postgres continua a que vazou em chat.** Sem rotação.

Em andamento, branch `feat/painel-organizador` (2 commits, 94 testes verdes):
a fundação da **STORY-009** — `Organization`, `OrganizationMember`,
`Membership`, `OrganizationInvite`, `statusPublicacao` e `lib/organizacao.ts`
com o filtro de dono. Mais o portão de aprovação fechado nas seis consultas
públicas. **Decisão do tech lead em 07/08: organização se cadastra sozinha,
com aprovação e edição do admin.**

Falta da 009 (é daqui que a próxima rodada começa):

1. Formulário de cadastro de comunidade com o **checkbox de autorização**
   (grava texto e timestamp — é a prova da regra 3), nascendo `pendente`.
2. `/painel` — comunidades da organização, edição, quem não é organizador
   de nada vê convite pra cadastrar, não erro.
3. Fila de aprovação no `/admin` — aprovar, recusar com motivo, ver o texto
   aceito. Recusa avisa por e-mail.
4. CRUD de evento no painel reusando `eventAdminSchema` (sem duplicar regra)
   e cancelamento como status, com e-mail pros inscritos.
5. Inscritos por evento + check-in + **CSV por evento, nunca global**.
6. Convites: **link aberto vira MEMBRO** (`Membership`), **convite nominal
   por e-mail vira ORGANIZADOR** (`OrganizationInvite`). Não borrar os dois.

**Desvio confessado (regra 6):** as STORY-008 e 009 dizem que a execução é
ONDA 2, pós-15/10, porque construir antes queima orçamento não reembolsável.
Foi antecipada por decisão do tech lead em 07/08, com justificativa: a regra
foi escrita supondo que o site teria conteúdo, e ele não tem — e sem
autosserviço o conteúdo depende do Kaxcav digitar.

Anti-meta continua valendo pro resto: nada de app mobile, checkout, ingresso
ou `Friendship` antes do resultado do edital.

## Briefing do PO — 07/08/2026 (STORY-011, executada)

O Mateus entregou um briefing de 13 itens (`MUNAY Briefing Landing Page.docx`)
cobrindo landing, área do usuário e rodapé. **Está implementado** — spec e
racional completos em `docs/stories/STORY-011-briefing-mateus.md`.

**⚠️ DESVIO CONFESSADO, e é grande:** a Parte II do briefing (perfil com CPF,
inteligência de consumo, ingressos) é justamente a "construção pesada" que a
linha acima manda deixar pro pós-15/10. **Foi executada mesmo assim, por
decisão explícita do Kaxcav em 07/08/2026.** Mitigações: a migração só
ACRESCENTA colunas anuláveis (reverter é `DROP COLUMN`), nenhuma dependência
nova entrou, e o item 10.1 (vender inteligência de público pra terceiros)
**não foi construído** — depende de parecer jurídico, não de código.

O que mudou no site:

- **Landing** ganhou `<Mosaico />` (seção de mídia; composições SVG no lugar
  das fotos, que não existem) e `<PainelFuncional />` (Comunidade · Mapa ·
  Organizadores + Cursos no roadmap). Os cards da vitrine agora têm **cor por
  categoria**, determinística (`lib/modalidades.ts`). A ordem das seções é
  amarrada pelo briefing: mídia vem ANTES de "Brasília treina todo dia" — tem
  teste que reprova se inverter.
- **Área do usuário**: `/perfil` (cadastro + painel de ajuda + tags de
  interesse + perguntas leves + consentimento granular), `/minhas-inscricoes`
  com os chips Ativos/Encerrados/Pagos, e `/meus-ingressos` — tela escura, densa
  e verde, de propósito o oposto do resto do site.
- **LGPD**: consentimento é **data**, não booleano ("desde quando" é o que se
  prova); três finalidades separadas; versão da política guardada no aceite;
  idade mínima 16 pro CADASTRO (RSVP continua sem conta, pra qualquer idade);
  perfil privado por padrão; `panoramaAgregado()` com k-anonimato k=5.

**A aba "Pagos" nasce vazia e isso está certo** — não existe pagamento no
produto. `ehPago()` em `lib/inscricoes.ts` é o único ponto que muda quando
existir.

**Pendências que dependem de DADO, não de código** (o rodapé e a seção de mídia
estão prontos e vazios; campo sem valor não renderiza, pra não repetir o
`contato@munay.app.br` que ficou semanas no ar): fotos/vídeos com autorização
de imagem, telefone + WhatsApp + Instagram, e os perfis pessoais dos
fundadores. Mais quatro decisões do Mateus, listadas no fim da STORY-011.
