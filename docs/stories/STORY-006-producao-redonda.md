# STORY-006 · Produção redonda (OG · analytics · LGPD · multi-cidade · regiões)

**Repo:** munay-site · **Executor:** Claude Code (@dev) · **Review/merge:** Kaxcav
**Branch:** `feat/producao-redonda`. Independente da 005 (podem rodar em worktrees paralelos).
**Status:** ✅ concluída — mergeada na main em 06/08/2026 (`dfcf3ca`), incluindo a tarefa 6 (35 RAs), em produção.

## Contexto

O site está no ar mas cru em 5 pontos: link compartilhado sem imagem, zero métricas, dado pessoal sem política pública (LGPD), schema preso a uma cidade e captação com lista parcial de regiões. Cinco acabamentos baratos, nenhum dependente de domínio.

## Tarefas

1. **OG image dinâmica** — `app/opengraph-image.tsx` com `ImageResponse` (next/og): fundo areia, wordmark MUNAY em petróleo, tagline, detalhe em lime (tokens da marca, nada de hex novo). Idem `twitter-image`. Bônus: OG por comunidade em `/comunidades/[slug]` com nome/modalidade.
2. **Analytics (Umami self-host)** — novo serviço no Railway a partir do template Umami (banco próprio do template, separado do nosso). Script no layout via env `NEXT_PUBLIC_UMAMI_*` (sem env → sem script, site não quebra). Eventos custom: `lead_participante`, `lead_organizador`, `rsvp_confirmado`, `rsvp_lista_espera`. Documentar no README como acessar o painel.
3. **Página `/privacidade`** — LGPD em linguagem simples: quais dados coletamos (nome, e-mail, WhatsApp em leads/RSVPs), finalidade (contato sobre a MUNAY e gestão de inscrições), sem venda a terceiros, como pedir exclusão (e-mail de contato — usar o placeholder atual até o domínio sair), cookies (só analytics anônimo). Link no footer + checkbox implícito vira frase no form ("ao enviar, você concorda com a política de privacidade" com link).
4. **Multi-cidade no dado** — migration: `city String @default("Brasília")` em `Community` e `Event`; queries de descoberta ganham filtro por city (default Brasília); **sem UI de seletor ainda** (Blueprint C1 — preparação, não feature).
5. **Footer** — linkar /privacidade; conferir se não sobrou promessa falsa em nenhum texto.
6. **Regiões administrativas completas** — criar `lib/regioes.ts` com as **35 RAs oficiais do DF** como fonte única, em ordem alfabética, e **"Outra região" sempre no fim** (cobre RIDE/Entorno). Lista VERIFICADA em fonte oficial em 06/08/2026 — transcrever daqui, NÃO reescrever de memória (SEDUH/dossiê nomeia RA I–XX; SINJ/LC 1.028/2023 confirma RA XXXIV Arapoanga e RA XXXV Água Quente, criadas pelas Leis 7.190 e 7.191/2022; atenção: fontes de 2020 ainda dizem "33 RAs"):
   Água Quente · Águas Claras · Arapoanga · Arniqueira · Brazlândia · Candangolândia · Ceilândia · Cruzeiro · Fercal · Gama · Guará · Itapoã · Jardim Botânico · Lago Norte · Lago Sul · Núcleo Bandeirante · Paranoá · Park Way · Planaltina · Plano Piloto · Recanto das Emas · Riacho Fundo · Riacho Fundo II · Samambaia · Santa Maria · São Sebastião · SCIA/Estrutural · SIA · Sobradinho · Sobradinho II · Sol Nascente/Pôr do Sol · Sudoeste/Octogonal · Taguatinga · Varjão · Vicente Pires
   Consumir em: select de região do `LeadSection` (substitui o array `REGIOES` hardcoded de 9 itens), filtros de `/comunidades` e admin da STORY-005 — nenhuma lista de região hardcoded fora de `lib/regioes.ts`.
   Comunidades existentes: manter `regiao` atual, **sem migração de dados**. Atenção: os valores demo "Asa Norte/Asa Sul/Noroeste" não são RAs — nos filtros de `/comunidades`, usar lista oficial ∪ valores distintos do banco enquanto houver conteúdo demo, pra nenhum card sumir do filtro (converge sozinho quando os parceiros reais entrarem pelo admin).
   Racional (registrado no Blueprint §8): cobertura de todo o DF é requisito de produto — a MUNAY se propõe a alcançar além do Plano Piloto; lista parcial exclui exatamente o público que mais importa.

## Critérios de pronto

- Compartilhar o link (WhatsApp/Discord debug ou opengraph.xyz) mostra a OG com a marca
- Eventos custom aparecem no Umami em teste local/prod
- `/privacidade` no ar, linkada no footer e nos forms
- Migration aplicada; `/comunidades` segue funcionando igual (city default transparente)
- Select do LeadSection, filtros de /comunidades e admin mostram as 35 RAs + "Outra região" no fim; grep não acha lista de região fora de `lib/regioes.ts`; cards demo continuam aparecendo nos filtros
- Build + typecheck limpos; PR pro Kaxcav

## Fora de escopo

Detalhamento da RIDE/Entorno (municípios goianos — "Outra região" cobre por ora), seletor de cidade na UI, cookie banner completo (só analytics anônimo não exige consentimento prévio — manter simples), e-mail real (STORY-004), SEO programático por modalidade (ideia futura: `/comunidades/corrida-asa-norte` — anotar, não fazer).

## Handoff final

Feito / assumido / desvios / travou.
