# MUNAY — Master Plan v1 (Fábrica AIOX)

**Data:** 05/08/2026 · **Autores:** Kaxcav (tech lead) + Claude
**Objetivo:** consolidar TODAS as frentes do MUNAY (handoffs, PRD, plano de builds, edital) num backlog único priorizado, orquestrado via AIOX + Claude Code com múltiplos agentes.

**Datas-âncora (edital Start BSB, Chamada 02/2026 — Eixo I):**
Etapa 2 até **03/09** · Resultado preliminar **24/09** · Resultado final **15/10** · Contratação a partir de **19/11** (subvenção R$ 53k).

**Regra econômica que governa o plano:** gasto antes da contratação NÃO é reembolsável. Logo: até 15/10, priorizar o que é barato/grátis e o que gera evidência pro edital; guardar escopo pesado como trabalho financiável pós-contratação.

---

## FASE 0 — Destravar coordenação (esta semana)

Bloqueadores que, sem resolver, fazem N agentes gerarem lixo em paralelo:

| # | Item | Dono | Esforço |
|---|------|------|---------|
| 0.1 | **Auditoria do repo do app**: o que existe DE VERDADE? Mock (PRD) ou Supabase completo (memória)? Inventário de telas, migrations, RLS, `purchase_ticket` | Kaxcav + 1 agente | 1 sessão |
| 0.2 | **Corrigir memória do Claude do Mateus**: nome é MUNAY (não MUNA). Sem isso, agentes dele geram artefatos com nome errado pra sempre | Mateus | 2 min |
| 0.3 | **Decisão de paleta**: Identidade Visual (lime/petróleo/areia/coral) vs alternativa (petróleo/sage/coral). Uma mensagem do PO resolve | Mateus | 5 min |
| 0.4 | **Deploy do site v1** + Supabase de leads (código pronto, buildado, testado) | Kaxcav | 1-2h |
| 0.5 | **Renomear docs ELO→MUNAY** (PRD, plano de negócios etc.) e declarar fonte única de verdade por assunto | 1 agente | 1 sessão |

**Gate da Fase 0:** nenhum épico novo começa antes de 0.1–0.4 fechados.

---

## FASE 1 — Até 03/09: evidência e captação (WIP = 1 frente de código)

Meta: Etapa 2 enviada com link de produto real + captação rodando.

- **E1.1 · Etapa 2 do edital** — textos revisados (consistência MUNAY, inovação enfatizada: matching por perfil/nível/rotina, dados do ecossistema local — peso 4 na avaliação), vídeo com acesso liberado, experiência real do coordenador em destaque (critério E). *Dono: Mateus + Claude de revisão.*
- **E1.2 · Site no ar + GTM de lista** — divulgar captação nos canais dos parceiros-âncora e Instagram. Métrica do PRD: caminhar pros 500 leads. *Dono: Mateus (relacionamento) + Kaxcav (medição).*
- **E1.3 · Estabilização do app (sem frente nova)** — corrigir só o que a auditoria 0.1 apontar como quebrado/urgente. Débitos baratos da lista de gaps (sessão persistida, campos de checkout) SÓ se sobrar folga. *Dono: Kaxcav + @dev.*
- **E1.4 · MEI→ME** — iniciar desenquadramento/abertura pra não travar habilitação jurídica se aprovar. *Dono: Mateus + contador.*

**Anti-meta da Fase 1:** NÃO iniciar builds 2–5 do site, NÃO iniciar Build 6 admin, NÃO refatorar app. É a fase de parecer pronto, não de construir tudo.

---

## FASE 2 — 03/09 → 15/10: planejar é grátis (WIP = specs + débitos baratos)

Janela de espera do resultado. Codar o financiável agora = queimar dinheiro próprio. Especificar é de graça e acelera a Fase 3.

- **E2.1 · Pipeline de specs AIOX** — pra cada épico da Fase 3: `@pm *gather-requirements` → `@architect *assess-complexity` → `@pm *write-spec` → `@qa *critique-spec`. Stories prontas na gaveta.
- **E2.2 · Decisões de arquitetura pendentes** — SEO (público/SSR vs login), API de mapas (free tier vs paga), monorepo vs repos separados (site cresce pra web app?), notificações web (.ics vs nada). *@architect propõe, Kaxcav decide, Mateus ratifica.*
- **E2.3 · Branding final** — logo MUNAY, OG image 1200×630, ativos gráficos. Reconciliar com `Branding_Munay__Conceito_completo.pdf`.
- **E2.4 · Débitos baratos do app** — itens da lista de gaps que não dependem do edital.
- **E2.5 · Confirmação formal dos parceiros-âncora** — autorização de marca por escrito (destrava vitrine real no site). *Dono: Mateus.*

---

## FASE 3 — Pós-resultado (15/10+)

**Cenário A (aprovado):** executar com subvenção, dev remunerado via bolsa OU fornecedor (nunca os dois — ver regras já mapeadas). Plano de aplicação primeiro, gasto depois da assinatura + dinheiro na conta BRB.

Backlog priorizado (specs prontas da Fase 2):

| Prio | Épico | Origem | Nota |
|------|-------|--------|------|
| 1 | Backend real consolidado (se 0.1 revelar mock) | Contradição PRD×memória | Fundação de tudo |
| 2 | Fluxo de reserva de evento (Cenário A: eventos gratuitos → "checkout" vira RSVP) | Build 2 redimensionada | Valida os 2 eventos-meta |
| 3 | Comunidade + Conteúdo (retenção) | Build 3 / PRD | Abas core do produto |
| 4 | Build 6 · Painel admin de parceiros | Handoff 1 | Explicitamente adiado até aqui |
| 5 | Perfil completo + notificações | Build 4 + gaps | |
| 6 | Polimento AA / performance | Build 5 | Transversal, antes de release público |
| 7 | Monetização real (ingressos pagos, comissão 8–15%) | Plano de negócios | Depende de tração dos eventos gratuitos |

**Cenário B (não aprovado):** replanejar em 1 sessão — cortar pra: app estável + site + 2 eventos gratuitos com parceiros + captação contínua, e reavaliar próximo ciclo do edital (Eixo II citado nos objetivos da inscrição).

---

## ORQUESTRAÇÃO — regras da fábrica

1. **Instalação AIOX:** no repo do **app** (onde mora a complexidade). `munay-site` fica fora (landing fechada, tem CLAUDE.md próprio). Monorepo é decisão E2.2, não default.
2. **Papéis humanos:** Mateus = PO (decide escopo/prioridade, SLA de 24h pra pendências — o acúmulo de "decisões pendentes do PO" foi o que travou o ciclo passado). Kaxcav = tech lead (stack, review, merge; único humano com autoridade de merge na main).
3. **Agentes:** executam stories, nunca inventam escopo. Story sem critério de pronto não entra em execução. 1 story = 1 worktree (`@devops *create-worktree`).
4. **WIP:** Fase 1 = 1 frente de código. Fases 2–3 = máx. 3 worktrees simultâneos (limite prático do review humano + rate limit do Max plan).
5. **Fonte de verdade:** este plano > handoffs > docs antigos. Conflito novo → registra no plano, PO decide, docs perdedores ganham banner de "superado".
6. **Toda sessão de agente começa lendo** o CLAUDE.md do repo + a story. Toda sessão termina com handoff curto (o que fez, o que assumiu, o que travou).

---

## PRÓXIMAS 5 AÇÕES (ordem)

1. Kaxcav: deploy do site v1 (0.4)
2. Mateus: corrigir memória MUNA→MUNAY (0.2) + decidir paleta (0.3)
3. Kaxcav + agente: auditoria do repo do app (0.1) → resultado atualiza este plano
4. Dupla: revisão final da Etapa 2 e envio bem antes de 03/09 (E1.1)
5. Instalar AIOX no repo do app e rodar o primeiro ciclo de spec (E2.1 adiantada só em specs, zero código)
