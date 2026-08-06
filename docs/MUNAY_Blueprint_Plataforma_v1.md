# MUNAY — Blueprint de Desenvolvimento da Plataforma v1

**Data:** 05/08/2026 · **Autor:** Kaxcav (tech lead) + Claude
**Papel deste doc:** traduzir as ideias do Mateus (inscrição do edital, PRD, segmentação, planos de negócio) em arquitetura + roadmap executável pela fábrica AIOX. Complementa o `MUNAY_Master_Plan_v1_1.md` (que manda no calendário/edital); este manda no produto e na engenharia.

---

## 1. Visão consolidada — o que a MUNAY é

Das ideias do Mateus, a plataforma se sustenta em **3 pilares**:

**P1 · Descoberta** — qualquer pessoa encontra comunidades, eventos e experiências esportivas/culturais de Brasília por modalidade, região, horário e nível. Reduz a barreira de "começar sozinho".

**P2 · Pertencimento** — quem entrou, fica: minhas comunidades, agenda, favoritos, conteúdo, fóruns, cursos. Transforma descoberta pontual em hábito.

**P3 · Operação B2B** — organizadores (run clubs, escolinhas, academias, produtores) ganham canal de aquisição, gestão de eventos/inscrições e, no futuro, monetização (comissão 8–15% sobre ingressos, adiantamentos, eventos próprios da marca).

Princípio de expansão: validar em Brasília → replicar por cidade (o modelo de dados nasce preparado pra isso).

---

## 2. Fundação que JÁ EXISTE (produção, Railway)

- Next.js 15 + TS + Tailwind (tokens) · Postgres 16 + Prisma v6 (migrations versionadas)
- Modelos: `Lead`, `Community`, `Event`, `Rsvp` (com waitlist)
- Descoberta: `/comunidades` com filtros por URL + detalhe por slug
- RSVP transacional (Serializable, capacidade, unique, upsert de lead)
- Ciclo de RSVP completo (STORY-003): cancelamento via token (`/rsvp/[token]`),
  promoção do mais antigo da waitlist na MESMA transação, reativação de
  inscrição cancelada; contagens de vaga ignoram cancelados; retry de
  conflito compartilhado em `lib/serializable.ts`
- Captação de leads B2C/B2B com honeypot
- Admin interno `/admin` (STORY-005): Basic Auth por env (sem default), CRUD
  de comunidades/eventos com soft delete, leads/RSVPs read-only + export CSV
- Produção redonda (STORY-006): OG images dinâmicas, Umami opcional por env,
  `/privacidade` (LGPD), `city` no schema (C1) e as **35 RAs oficiais** como
  fonte única de regiões (`lib/regioes.ts`)
- Deploy contínuo: push na main → produção (pre-deploy roda `prisma migrate deploy`)

---

## 3. Arquitetura de dados alvo (evolução em camadas)

Cada camada = uma migration planejada. Nada disso se constrói de uma vez.

**C0 · Atual:** Lead, Community, Event, Rsvp.

**C1 · Multi-cidade (barato, fazer cedo):** `city` em Community/Event (default "Brasília"). Evita migração dolorosa na expansão.

**C2 · Identidade:** `User` + sessões. Auth via magic link por e-mail (sem senha = menos atrito e menos risco). ⚠️ Depende de e-mail funcionando → **depende do domínio**. Decisão de spec: Auth.js v5 vs Better Auth (avaliar na spec, não agora).

**C3 · Pertencimento:** `Membership` (User↔Community, com papel: membro/organizador), `Favorite`, `Review` (avaliações do PRD — exigem conta pra ter credibilidade).

**C4 · B2B:** `Organization` (o negócio do parceiro), organizador gerencia suas communities/events via painel self-service. `Rsvp` ganha vínculo opcional com `User` (hoje é só e-mail).

**C5 · Conteúdo:** `Post` (feed), `ForumThread`/`ForumReply`, `Course`/`Lesson` — a aba "Conteúdo e Cursos" da inscrição.

**C6 · Transacional (pós-tração):** `Order`, `Ticket`, `Payment` — ingressos pagos, comissão, repasse. Gateway BR (Stripe vs Mercado Pago vs Pagar.me) é decisão de spec da Onda 3. O RSVP gratuito de hoje é deliberado (Cenário A do MVP).

**C7 · Notificação:** `Notification` in-app + e-mail transacional (confirmação de RSVP, promoção de waitlist, avisos de comunidade).

---

## 4. Mapa de dependências (o que destrava o quê)

```
Domínio ──► E-mail (Resend) ──► Auth magic link (C2) ──► Membership/Favoritos/Reviews (C3)
                                                    └──► Painel organizador self-service (C4)
Admin interno (sem auth de usuário) ──► onboarding de parceiros reais JÁ
Auth (C2) ──► Conteúdo/Fórum (C5)
Tração (2 eventos + leads) ──► Monetização (C6)
Backend estável ──► Mobile (consome a mesma base; React Native, Onda 4)
```

**Leitura estratégica:** o DOMÍNIO é a raiz de quase tudo (e-mail → auth → metade da plataforma). É a pendência nº 1 do Mateus. Enquanto isso, **admin interno** e polimento não dependem de nada — são o trabalho certo de agora.

---

## 5. Roadmap em ondas (amarrado ao Master Plan)

**ONDA 0 — agora → 03/09 (paralelo à Etapa 2):** fechar o ciclo do que existe.
Cancelamento/promoção via token · admin interno mínimo (CRUD de communities/events protegido por senha de env — sem ele, cadastrar parceiro real = SQL na mão) · e-mail transacional (quando domínio sair) · OG image + analytics (Umami self-host no Railway) + política de privacidade (LGPD: leads/RSVPs são dados pessoais) · campo `city`.

> **Fechada em 06/08/2026.** Tudo acima está escrito. Duas correções ao que estava previsto aqui:
>
> 1. **"e-mail transacional (quando domínio sair)" estava errado.** O adapter (`lib/email.ts`) fala SMTP ou Resend e o remetente vem de `EMAIL_FROM` — domínio próprio é troca de env, não de código. A dependência que travava metade do roadmap não existia. Enquanto ela era tratada como real, quem era promovido da lista de espera **não recebia aviso nenhum**: a fila andava em silêncio.
> 2. **Regra que ficou do trabalho de e-mail:** disparo NUNCA acontece dentro da transação Serializable. Ela roda com retry — enviar lá dentro entregaria o mesmo e-mail a cada repetição. Envio é sempre pós-commit, fire-and-forget, e falha de e-mail não derruba inscrição.
>
> Entrou junto, fora da lista original: melhorias de operação no `/admin` (paginação, busca, período, "ver no site") e **SEO programático** por recorte modalidade+região (`/descobrir/[recorte]`) — este último cabe no "ajuste fino de SEO ok" do anti-meta do Master Plan. **C2 (auth) saiu da ONDA 2 e foi construída agora: desvio confessado, registrado no Master Plan.**

**ONDA 1 — 03/09 → 15/10 (Fase 2: specs, pouco código):** especificar os módulos grandes via AIOX (`@pm` → `@architect` → `@qa *critique-spec`): Auth (C2), Pertencimento (C3), Painel organizador (C4), Conteúdo (C5). Decisões de PO colhidas em lote. Código só de débito leve.

**ONDA 2 — pós-resultado (Fase 3, financiável):** construir C2→C3→C4 nessa ordem. Auth primeiro porque tudo pende dele; painel organizador em seguida porque destrava a operação dos 2 eventos-meta com parceiros reais.

**ONDA 3 — tração comprovada:** Conteúdo/Fórum (C5) · Reviews · Notificações ricas (C7) · Monetização (C6) — só depois de eventos gratuitos validarem demanda.

**ONDA 4 — escala:** app mobile React Native (mesmo backend) · segunda cidade · adiantamentos a produtores e eventos próprios da marca.

---

## 6. Backlog de stories (numeração contínua da fábrica)

| # | Story | Onda | Depende de | Status |
|---|-------|------|-----------|--------|
| 003 | Cancelamento de RSVP + promoção de waitlist via token (`/rsvp/[token]`) | 0 | — | ✅ mergeada na main 06/08, em produção |
| 004 | E-mail transacional (Resend): confirmação, promoção, cancelamento | 0 | Domínio | 🔒 bloqueada |
| 005 | Admin interno mínimo: CRUD communities/events, rota protegida por senha env | 0 | — | ✅ mergeada 06/08 (+ integração RAs/city), em produção |
| 006 | Produção redonda: OG image, Umami, página de privacidade, `city` no schema, 35 RAs oficiais como fonte única de regiões (`lib/regioes.ts`) | 0 | — | ✅ mergeada na main 06/08, em produção |
| 007 | SPEC Auth + User (C2) — magic link, sessões, migração de RSVPs por e-mail | 1 | 004 no ar p/ executar | Fase 2 |
| 008 | SPEC Pertencimento (C3) — membership, favoritos, minhas comunidades, agenda | 1 | 007 | Fase 2 |
| 009 | SPEC Painel do organizador (C4) — self-service de eventos, lista de inscritos, check-in | 1 | 007 | Fase 2 |
| 010 | SPEC Conteúdo (C5) — feed, fórum, cursos (recorte mínimo primeiro) | 1 | 007 | Fase 2 |
| 011+ | Execuções das specs 007–010, na ordem C2→C3→C4→C5 | 2–3 | Resultado do edital | Fase 3 |

Regra da fábrica continua: 1 story = 1 branch, handoff obrigatório, desvio confessado, Kaxcav é o único merge na main.

---

## 7. Decisões pendentes do PO (Mateus) — colher em lote

1. **Domínio** — registrar JÁ (bloqueia e-mail → auth → metade do roadmap)
2. Cancelamento de RSVP: só via link/token (proposto) ou também mediado pelo organizador?
3. Avaliações (Reviews): entram na primeira leva pós-auth ou depois da tração? (recomendação: depois — moderação custa)
4. Conteúdo (C5): qual recorte mínimo primeiro — feed simples, fórum ou cursos? (recomendação: feed de avisos por comunidade; fórum e cursos depois)
5. Monetização: ratificar gateway na spec da Onda 3 (sem pressa)
6. Paleta e limpeza de memória — pendências antigas, seguem abertas
7. **Ratificar (desvio 3 da STORY-003):** reinscrição após cancelamento volta pro FIM da fila (`createdAt` zerado) — quem cancela não guarda lugar. Implementado assim; reverter é 1 linha se o Mateus discordar

---

## 8. Princípios técnicos permanentes

1. **Uma base pra tudo:** o mobile futuro consome o mesmo Postgres/API — nenhuma feature web pode assumir "só browser" na modelagem
2. **Multi-cidade no dado, não no código:** filtros e queries sempre cidade-conscientes a partir da C1
3. **Migrations only** — nunca editar migration aplicada (regra que veio da memória fantasma, mas é boa de verdade)
4. **LGPD by default:** dado pessoal só com finalidade clara; política de privacidade pública; exclusão possível
5. **Transação onde há disputa:** capacidade, promoção de waitlist, pagamentos — padrão da 002 vale sempre
6. **Demo flag:** conteúdo ilustrativo sempre `demo: true`, removível sem dó
7. **MUNAY** — sempre, em tudo
8. **DF inteiro, não Plano Piloto:** cobertura das 35 RAs oficiais é requisito de produto — a MUNAY se propõe a alcançar além do Plano Piloto, e lista parcial de regiões exclui exatamente o público que mais importa. Fonte única em `lib/regioes.ts`, "Outra região" cobre RIDE/Entorno (decisão do tech lead, 06/08/2026 — STORY-006)
