# STORY-005 · Admin interno mínimo (operação sem SQL)

**Repo:** munay-site · **Executor:** Claude Code (@dev) · **Review/merge:** Kaxcav
**Branch:** `feat/admin-interno` a partir da `main` (após merge da 003).

## Contexto

Hoje, cadastrar um parceiro real ou criar um evento = SQL na mão. Esta story dá ao time (Kaxcav/Mateus) um painel interno mínimo ANTES do sistema de auth completo (Blueprint C2/C4). Não é o painel self-service do organizador — é ferramenta interna de operação.

## Proteção (sem dependências novas)

Middleware do Next em `/admin/*` com **Basic Auth**: `ADMIN_USER` + `ADMIN_PASSWORD` de env. Sem env definida → `/admin` responde 503 com mensagem clara (NUNCA um default de senha). `noindex` + bloqueio em `robots.ts`.

## Tarefas

1. **`/admin`** — dashboard simples: contagens (comunidades ativas, eventos futuros, leads por tipo, RSVPs confirmados/fila) direto do Prisma.
2. **CRUD de comunidades** — listar (incluindo inativas e demo), criar, editar todos os campos (`nome, slug, modalidade, regiao, city*, descricao, horarios, local, nivel, demo, ativo`). Slug auto a partir do nome, editável. Desativar em vez de deletar (soft delete via `ativo`).
3. **CRUD de eventos** — idem, vinculado a comunidade, com `startsAt`, `capacidade`, `gratuito`, `demo`, `ativo`.
4. **Leitura de leads e RSVPs** — tabelas read-only com filtros básicos e export CSV simples (leads é a métrica dos 500 do edital — o Mateus vai pedir esse número).
5. Server Actions ou rotas API internas — escolher um padrão e manter consistência; validação Zod reaproveitando schemas existentes.

*`city`: se a STORY-006 ainda não rodou, incluir a migration aqui e avisar no handoff (coordenar pra não duplicar).

## Critérios de pronto

- Fluxo real: criar comunidade nova (sem `demo`) pelo painel → aparece em `/comunidades` em produção-like local, sem tag de exemplo
- Sem envs de admin → 503; com envs → Basic Auth funciona no browser
- `/admin` fora do sitemap, com `noindex` e bloqueado no robots
- Build + typecheck limpos; PR pro Kaxcav

## Fora de escopo

Upload de imagens, auth de usuário (C2), painel self-service do organizador (C4), edição de RSVPs (só leitura). Desvios → confessados no handoff.

## Handoff final

Feito / assumido / desvios / travou + proposta de melhorias baratas percebidas durante o uso (sem executá-las).
