# STORY-003 · Cancelamento de RSVP + promoção de waitlist (token)

**Repo:** munay-site · **Executor:** Claude Code (@dev) · **Review/merge:** Kaxcav
**Branch:** `feat/rsvp-cancelamento` a partir da `main`.
**Status:** ✅ concluída — mergeada na main em 06/08/2026 (`ee928cb`), em produção.

## Contexto

A STORY-002 criou (fora de spec, agora aceito) o estado `lista_espera` — mas sem promoção. Resultado: estado zumbi, a fila nunca anda. Esta story fecha o ciclo: cancelar libera vaga e promove o primeiro da fila, tudo sem auth (via token), porque auth ainda não existe (Blueprint C2).

Adaptar nomenclaturas ao que a 002 realmente implementou (conferir enum/campos no schema antes de codar).

## Migration

Adicionar ao `Rsvp`: `token String @unique @default(uuid())` e `canceledAt DateTime?`. Backfill automático do token pelos defaults na migration.

## Tarefas

1. **Página `/rsvp/[token]`** — mostra evento, nome, status atual (confirmado / lista de espera / cancelado) e botão "Cancelar inscrição" com confirmação. Estado pós-cancelamento claro. `noindex`.
2. **API de cancelamento** — transação **Serializable**: marca o RSVP como cancelado (`canceledAt`), conta confirmados; se abriu vaga e há fila, **promove o mais antigo da lista_espera na mesma transação**. Idempotente (cancelar 2x não explode).
3. **Retry de P2034** — ponto aberto da revisão: resolvido, a 002 **já trata**. O retry existe inline em `app/api/rsvps/route.ts` (`MAX_TENTATIVAS = 5` + `backoff()` — não há helper nomeado). Reutilizar o que existe: extrair esse padrão pra um helper compartilhado (ex.: `withSerializableRetry` em `lib/serializable.ts`) e consumir nos dois lugares — a rota da 002 passa a importá-lo, sem mudança de comportamento (mantém 5 tentativas). Nada de reimplementar nem "corrigir" a 002.
4. **Exibir o token** — a tela de confirmação do RSVP passa a mostrar o link `/rsvp/[token]` com aviso "guarda esse link pra gerenciar tua inscrição" (quando e-mail existir — STORY-004 — o link irá na mensagem).
5. **Texto honesto da waitlist** — onde houver promessa de aviso, trocar por "se abrir vaga, tua inscrição é confirmada automaticamente — acompanha pelo teu link". Nada de prometer e-mail/lembrete que ainda não existe.
6. **Pendência da revisão anterior:** validar o `error.tsx` de `/comunidades` em browser real (banco parado → estado degradado amigável). Registrar no handoff com screenshot ou descrição.

## Critérios de pronto

- Fluxo completo em dev: RSVP até lotar → entra na fila → confirmado cancela pelo link → primeiro da fila vira confirmado (verificar no banco)
- Cancelamento idempotente; token inválido → 404 amigável
- P2034 simulado/coberto pelo retry (ao menos teste manual descrito no handoff)
- `npm run build` + `typecheck` limpos; commits na branch, PR pro Kaxcav

## Fora de escopo

E-mail (STORY-004), auth, painel admin, UI de "meus RSVPs" (exige auth). Desvio de spec → seção Desvios do handoff, sempre.

## Handoff final

Feito / assumido / desvios / travou + confirmação dos itens 3 e 6 da revisão anterior.
