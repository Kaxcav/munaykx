# STORY-006 · Produção redonda (OG · analytics · LGPD · multi-cidade)

**Repo:** munay-site · **Executor:** Claude Code (@dev) · **Review/merge:** Kaxcav
**Branch:** `feat/producao-redonda`. Independente da 005 (podem rodar em worktrees paralelos).

## Contexto

O site está no ar mas cru em 4 pontos: link compartilhado sem imagem, zero métricas, dado pessoal sem política pública (LGPD) e schema preso a uma cidade. Quatro acabamentos baratos, nenhum dependente de domínio.

## Tarefas

1. **OG image dinâmica** — `app/opengraph-image.tsx` com `ImageResponse` (next/og): fundo areia, wordmark MUNAY em petróleo, tagline, detalhe em lime (tokens da marca, nada de hex novo). Idem `twitter-image`. Bônus: OG por comunidade em `/comunidades/[slug]` com nome/modalidade.
2. **Analytics (Umami self-host)** — novo serviço no Railway a partir do template Umami (banco próprio do template, separado do nosso). Script no layout via env `NEXT_PUBLIC_UMAMI_*` (sem env → sem script, site não quebra). Eventos custom: `lead_participante`, `lead_organizador`, `rsvp_confirmado`, `rsvp_lista_espera`. Documentar no README como acessar o painel.
3. **Página `/privacidade`** — LGPD em linguagem simples: quais dados coletamos (nome, e-mail, WhatsApp em leads/RSVPs), finalidade (contato sobre a MUNAY e gestão de inscrições), sem venda a terceiros, como pedir exclusão (e-mail de contato — usar o placeholder atual até o domínio sair), cookies (só analytics anônimo). Link no footer + checkbox implícito vira frase no form ("ao enviar, você concorda com a política de privacidade" com link).
4. **Multi-cidade no dado** — migration: `city String @default("Brasília")` em `Community` e `Event`; queries de descoberta ganham filtro por city (default Brasília); **sem UI de seletor ainda** (Blueprint C1 — preparação, não feature).
5. **Footer** — linkar /privacidade; conferir se não sobrou promessa falsa em nenhum texto.

## Critérios de pronto

- Compartilhar o link (WhatsApp/Discord debug ou opengraph.xyz) mostra a OG com a marca
- Eventos custom aparecem no Umami em teste local/prod
- `/privacidade` no ar, linkada no footer e nos forms
- Migration aplicada; `/comunidades` segue funcionando igual (city default transparente)
- Build + typecheck limpos; PR pro Kaxcav

## Fora de escopo

Seletor de cidade na UI, cookie banner completo (só analytics anônimo não exige consentimento prévio — manter simples), e-mail real (STORY-004), SEO programático por modalidade (ideia futura: `/comunidades/corrida-asa-norte` — anotar, não fazer).

## Handoff final

Feito / assumido / desvios / travou.
