# MUNAY — Site (v1 enxuta)

Landing de captação da MUNAY: plataforma de descoberta de comunidades,
eventos e experiências esportivas e culturais de Brasília. Esta v1 existe
para (1) captar leads B2C (lista de espera) e B2B (organizadores) e
(2) servir de evidência de execução na Etapa 2 do edital Start BSB.

## Regras inegociáveis

1. **O nome é MUNAY.** Nunca "MUNA" (registro antigo incorreto em memória)
   nem "ELO" (nome anterior do projeto). Inscrição oficial no edital = MUNAY.
2. **Nunca publicar nomes de parceiros reais** (Liga Entrequadras, MOAI,
   Gracie Barra Noroeste, Evolve etc.) sem autorização formal por escrito.
   A vitrine usa cards ilustrativos por modalidade até lá.
3. **Escopo v1 é enxuto e fechado**: vitrine + captação de leads. NÃO
   adicionar login, checkout, mapa com API paga, painel admin ou réplica do
   app sem decisão explícita do PO (Mateus). Motivo: edital Eixo I não exige
   MVP web, e gasto pré-contratação não é reembolsável pela subvenção.
4. **Cores só via tokens** (`tailwind.config.ts`). Zero hex hardcoded em
   componente. Há uma paleta alternativa em disputa — se o PO trocar, a
   troca acontece num arquivo só.
5. Copy em pt-BR, voz direta, sem corporativês. Lime é acento raro, não
   cor de fundo de texto (contraste ruim sobre areia).

## Contexto do edital (afeta decisões de produto)

- Chamada 02/2026 Start BSB, **Eixo I** (Ideação/Pré-Incubação), TRL 3.
- Etapa 2 da inscrição: até **03/09/2026** (site no ar antes disso = evidência).
- Resultado final 15/10; contratação a partir de 19/11; subvenção R$ 53k.
- Avaliação: Mercado (peso 3) · **Inovação (peso 4)** · Coordenador (peso 1).

## Stack e arquitetura

- Next.js 15 (App Router) · TypeScript strict · Tailwind 3.4 · Zod · Supabase.
- Uma página (`app/page.tsx`) composta por seções em `components/`.
- Leads: form client (`LeadSection`) → `POST /api/leads` → Supabase com
  **service role** (server-only, `lib/supabase.ts`). RLS ligado, sem policy
  pública — o insert só acontece pelo servidor.
- Validação compartilhada client/server em `lib/leads.ts` (fonte única).
- Anti-spam: honeypot `site` — se preenchido, a API responde `{ok:true}`
  falso sem gravar. Não "consertar" isso achando que é bug.
- Fontes por `<link>` no layout (decisão consciente p/ build sem rede);
  melhoria futura: migrar para `next/font/google`.
- Assinatura visual: `components/PlanoPiloto.tsx` (SVG procedural, sem
  API de mapa — não substituir por mapa pago na v1).

## Comandos

```bash
npm run dev        # desenvolvimento
npm run build      # build + typecheck + lint
npm run typecheck  # só tipos
```

## Setup do Supabase (uma vez)

1. Criar projeto gratuito em supabase.com (pode ser o mesmo do app ou um novo).
2. Rodar `supabase/schema.sql` no SQL Editor.
3. Copiar `.env.example` → `.env.local` e preencher URL + service role key.

## Backlog imediato (em ordem)

1. Deploy (Vercel ou Railway) + configurar env vars.
2. PO registrar domínio → trocar `NEXT_PUBLIC_SITE_URL` e o e-mail do Footer.
3. Imagem OG (1200×630) com a identidade — hoje o OG sai sem imagem.
4. Substituir cards da vitrine quando parceiros assinarem autorização.
5. Pós-resultado do edital (15/10): reavaliar builds 2–5 do plano original
   (checkout, comunidade, conteúdo) — só com decisão do PO e, idealmente,
   como escopo financiável pela subvenção.
