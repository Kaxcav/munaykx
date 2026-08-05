# MUNAY — Site

Landing de captação da MUNAY (comunidades esportivas e culturais de Brasília).
Next.js 15 · TypeScript · Tailwind · Supabase.

## Rodar local

```bash
npm install
npm run dev
# http://localhost:3000
```

O site funciona sem Supabase (o form retorna aviso de "não configurado").
Para captar leads de verdade:

1. Crie um projeto gratuito em https://supabase.com
2. Rode `supabase/schema.sql` no SQL Editor
3. `cp .env.example .env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API — **nunca** exponha no client)

## Deploy

**Vercel (recomendado p/ Next):** importar o repo, colar as 2 env vars, deploy.
**Railway (alternativa):** novo serviço a partir do repo, build `npm run build`,
start `npm run start`, mesmas env vars.

Depois do domínio registrado, defina também `NEXT_PUBLIC_SITE_URL` com a URL
final (afeta SEO/sitemap) e troque o e-mail no `components/Footer.tsx`.

## Estrutura

```
app/            página, layout (SEO), API de leads, robots, sitemap
components/     seções da landing (Hero, Vitrine, LeadSection…)
lib/            schema zod compartilhado + client Supabase (server-only)
supabase/       schema.sql da tabela de leads
CLAUDE.md       contexto e regras do projeto p/ desenvolvimento com IA
```

Leia o `CLAUDE.md` antes de mexer — as decisões de escopo têm motivo
(edital Start BSB) e as regras de marca também.
