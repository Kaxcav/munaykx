# MUNAY — Master Plan v1.1 (Fábrica AIOX)

**Data:** 05/08/2026 · **Autores:** Kaxcav (tech lead) + Claude
**Changelog v1.1:** auditoria 0.1 resolvida — **o app mobile NÃO existe** (nem código, nem backend, nem repo). A memória do Claude do Mateus descrevia desenvolvimento fictício (migrations, auditorias, EAS) gerado em sessões de planejamento e consolidado como fato. Fase 3 reescrita como construção greenfield; risco de "memória fantasma" adicionado.

**Datas-âncora (edital Start BSB, Chamada 02/2026 — Eixo I):**
Etapa 2 até **03/09** · Resultado preliminar **24/09** · Resultado final **15/10** · Contratação a partir de **19/11** (subvenção R$ 53k).

**Regra econômica:** gasto antes da contratação NÃO é reembolsável. O app inteiro é greenfield → é O escopo financiável ideal. Construí-lo de graça agora = queimar o próprio pagamento. Até 15/10: evidência, captação e specs. Depois: construção remunerada.

**Regra de realidade (nova):** só existe o que está em repositório git. Memória de conversa, resumo de sessão e documento sem código correspondente = planejamento, nunca fato. Todo agente novo lê esta regra antes de qualquer outra.

---

## FASE 0 — Destravar coordenação (esta semana)

| # | Item | Dono | Status |
|---|------|------|--------|
| 0.1 | ~~Auditoria do repo do app~~ → **RESOLVIDO: app inexistente.** Greenfield confirmado | — | ✅ 05/08 |
| 0.2 | **Limpeza da memória do Claude do Mateus** (3 correções): nome = MUNAY; app NÃO construído — backend/migrations/auditorias eram simulação; o que existe = docs de planejamento + site Next.js do Kaxcav | Mateus | 🔴 hoje |
| 0.3 | **Decisão de paleta**: lime/petróleo/areia (Identidade Visual) vs petróleo/sage/coral (Plano de Negócios) | Mateus | 🔴 |
| 0.4 | ~~Site v1 operacional: Supabase (schema.sql) + `.env.local` + deploy Vercel~~ → **EXECUTADO** (06/08: executado com Railway/Postgres/Prisma; decisão de stack do tech lead substituiu Supabase/Vercel). Git + GitHub + deploy contínuo (push na `main`) + captação em produção | Kaxcav | ✅ 06/08 |
| 0.5 | **Renomear docs ELO→MUNAY** + banner "SUPERADO" nos conflitantes + banner "PLANEJAMENTO — nunca implementado" nos docs que descrevem o app | 1 agente | 🟡 |

**Gate:** nenhum épico novo antes de 0.2 e 0.4 fechados.

---

## FASE 1 — Até 03/09: evidência e captação (WIP = 0 frentes de código novo)

Meta: Etapa 2 enviada com link de produto real + captação rodando. **Não existe app pra estabilizar — a fase fica ainda mais focada.**

- **E1.1 · Etapa 2 do edital** — textos revisados (consistência MUNAY; inovação enfatizada — peso 4: matching por perfil/nível/rotina, dados do ecossistema local; experiência real do coordenador — critério E), vídeo com acesso liberado. *Mateus + Claude de revisão.*
- **E1.2 · Site no ar + GTM de lista** — divulgação via parceiros-âncora e Instagram. Meta do PRD: caminhar pros 500 leads. *Mateus (relacionamento) + Kaxcav (medição).*
- **E1.3 · MEI→ME** — iniciar processo pra não travar habilitação jurídica. *Mateus + contador.*

**Anti-meta:** NÃO começar o app. NÃO evoluir o site além da v1. Ajuste fino de copy/SEO ok; feature nova, não.

---

## FASE 2 — 03/09 → 15/10: planejar é grátis (WIP = specs)

O material de planejamento do Mateus (PRD, identidade, segmentação) é REAL e bom — vira insumo formal aqui. O que era ilusão era o código; os documentos prestam.

- **E2.1 · Spec do APP MOBILE (épico master)** — pipeline AIOX completo: `@pm *gather-requirements` (com PRD existente como entrada) → `@architect *assess-complexity` → specs por módulo → `@qa *critique-spec`. Saída: backlog de stories pronto pra execução financiada.
- **E2.2 · Decisões de arquitetura** — web-first confirmado pela realidade (site existe, app não). Decidir: (a) evoluir site → web app (aproveita Next.js, Supabase de leads como embrião do backend) e app nativo depois, ou (b) app React Native/Expo direto na Fase 3. `@architect` propõe com trade-offs, Kaxcav decide, Mateus ratifica. Inclui: monorepo?, SEO, API de mapas, stack de notificações.
- **E2.3 · Modelagem do backend real** — schema Supabase completo (comunidades, eventos, RSVP, perfis) como EVOLUÇÃO do projeto de leads existente. Migrations desenhadas, não aplicadas além do necessário.
- **E2.4 · Branding final** — logo MUNAY, OG image, reconciliar com `Branding_Munay__Conceito_completo.pdf`.
- **E2.5 · Parceiros-âncora formalizados** — autorização de marca por escrito. *Mateus.*

---

## FASE 3 — Pós-resultado (15/10+): construção greenfield

**Cenário A (aprovado):** app construído como trabalho financiável (bolsa OU fornecedor — nunca ambos). Plano de aplicação primeiro; gasto só após assinatura + recurso na conta BRB.

| Prio | Épico | Nota |
|------|-------|------|
| 1 | Backend Supabase real (evolução do projeto de leads) | Fundação: auth, comunidades, eventos, perfis, RLS |
| 2 | Descoberta (busca, filtros, detalhe de comunidade/evento, mapa) | Core da proposta de valor |
| 3 | RSVP de eventos (Cenário A: gratuitos — "checkout" é reserva) | Valida os 2 eventos-meta do MVP |
| 4 | Comunidade + Conteúdo (retenção) | Abas core do PRD |
| 5 | Painel admin de parceiros (ex-Build 6) | Destrava operação B2B |
| 6 | Perfil + notificações | |
| 7 | Polimento AA / performance | Antes de release público |
| 8 | Monetização (ingressos pagos, comissão 8–15%) | Depende de tração dos eventos gratuitos |

Forma (web app vs nativo) definida em E2.2 — as prioridades valem pras duas.

**Cenário B (não aprovado):** replanejar em 1 sessão — site + 2 eventos gratuitos com parceiros + captação contínua; construção do app em ritmo sustentável; próximo ciclo do edital (Eixo II) como alvo.

---

## ORQUESTRAÇÃO — regras da fábrica

1. **AIOX instalado no munay-site** (único repo existente). Quando o app nascer (Fase 3), decisão E2.2 define se é monorepo ou repo novo com fábrica própria.
2. **Papéis:** Mateus = PO (decide escopo/prioridade, SLA 24h — pendência acumulada de PO foi o que travou o ciclo passado). Kaxcav = tech lead (stack, review, único merge na main).
3. **Agentes executam stories, nunca inventam escopo.** Story sem critério de pronto não entra em execução. 1 story = 1 worktree.
4. **WIP:** Fase 1 = 0 código novo. Fase 2 = specs ilimitadas, 0 código de produto. Fase 3 = máx. 3 worktrees simultâneos.
5. **Fontes de verdade:** este plano > repositório git > docs de planejamento > memória de conversa (nunca é fato).
6. **Toda sessão de agente:** começa lendo CLAUDE.md + story; termina com handoff curto (feito / assumido / travado).

---

## PRÓXIMAS 5 AÇÕES (ordem)

1. Kaxcav: fechar 0.4 — git + Supabase + Vercel + teste de lead em produção
2. Mateus: mensagem de limpeza de memória (0.2) + paleta (0.3)
3. Agente: higiene de docs (0.5) com os dois banners
4. Dupla: revisão final da Etapa 2 e envio bem antes de 03/09 (E1.1)
5. Dia 04/09: abrir a Fase 2 com `@pm *gather-requirements` usando o PRD como entrada (E2.1)
