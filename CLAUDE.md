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
  filtros via URL) · `/comunidades/[slug]` · `/eventos/[slug]` (detalhe +
  RSVP) · `/rsvp/[token]` (gerenciar inscrição, noindex) · `/privacidade`
  (LGPD) · `/admin/*` (interno: Basic Auth por env, noindex + robots).
  Não existe índice `/eventos` — evento se descobre pela comunidade.
- APIs: `POST /api/leads` · `POST /api/rsvps`. RSVP roda em transação
  **Serializable** com retry + backoff (P2034): capacidade cheia → entra
  como `lista_espera`; e-mail repetido no evento → `{ok, jaExistia}`.
  Quem faz RSVP também vira lead (`origem: "rsvp"`, upsert que não
  sobrescreve cadastro do site). Padrão permanente do Blueprint:
  **transação onde há disputa**.
- Dados: `prisma/schema.prisma` (Lead, Community, Event, Rsvp), migrações
  em `prisma/migrations/`, client singleton em `lib/db.ts`, seed demo
  idempotente em `prisma/seed.ts` (tudo `demo: true`).
- Validação compartilhada client/server em `lib/leads.ts`, `lib/rsvps.ts`
  e `lib/admin.ts` (fonte única, Zod). Regiões: **`lib/regioes.ts`** é a
  fonte única das 35 RAs oficiais + "Outra região" — nenhuma lista de
  região hardcoded fora dela.
- Anti-spam: honeypot `site` nos dois forms — preenchido, a API responde
  `{ok:true}` falso sem gravar. Não "consertar" isso achando que é bug.
- Sem `DATABASE_URL` o site sobe mesmo assim: APIs respondem 503 amigável
  e o sitemap sai só com rotas fixas (decisão consciente).
- URL pública: fonte única em `lib/site.ts` — `NEXT_PUBLIC_SITE_URL`
  aceita domínio sem protocolo (Railway fornece assim); ninguém lê a env
  direto.
- Assinatura visual: `components/PlanoPiloto.tsx` (SVG procedural — não
  substituir por mapa pago).
- Fontes por `<link>` no layout (build sem rede); futuro: `next/font`.

## Comandos

```bash
docker compose up -d    # Postgres 16 local (localhost:5434)
npx prisma migrate dev  # aplica migrações (cria o banco na 1ª vez)
npx prisma db seed      # dados demo (tsx prisma/seed.ts)
npm run dev             # desenvolvimento
npm run build           # build + typecheck + lint
npm run typecheck       # só tipos
```

Env local: copiar `.env.example` → `.env` (já vem com
`DATABASE_URL=postgresql://munay:munay@localhost:5434/munay`).

## Agora (pós-ONDA 0 — atualizado 06/08 fim do dia)

**ONDA 0 executável concluída e em produção**: STORY-003 (cancelamento +
promoção via token), STORY-005 (admin interno + select das 35 RAs + city)
e STORY-006 (OG, Umami, `/privacidade`, `city`, `lib/regioes.ts`) —
mergeadas na main, deploy verificado. O que resta:

1. **STORY-004** — e-mail transacional (Resend): 🔒 bloqueada pelo
   **domínio**, pendência nº 1 do PO (domínio → e-mail → auth → metade
   do roadmap).
2. **Decisões do PO** (Blueprint §7): domínio, paleta (0.3), ratificar
   "cancelou → fim da fila" (desvio 3 da 003), limpeza de memória (0.2).
3. **Operação**: cadastrar parceiros reais pelo `/admin` (só com
   autorização assinada — regra 3) e criar o serviço Umami no Railway
   (+ envs `NEXT_PUBLIC_UMAMI_*`). Chore de fábrica: configurar ESLint.
4. **ONDA 1 (Fase 2, a partir de 04/09)**: specs dos módulos grandes
   (auth C2, pertencimento C3, painel B2B C4, conteúdo C5) via pipeline
   AIOX — specs, não código de produto.

Anti-meta: nenhuma feature nova fora disso antes da Etapa 2 (03/09);
construção pesada é pós-resultado (15/10), como escopo financiável.
