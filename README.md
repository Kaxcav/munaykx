# MUNAY — Site

Descoberta de comunidades, RSVP de eventos e captação de leads da MUNAY
(comunidades esportivas e culturais de Brasília).
Next.js 15 · TypeScript · Tailwind · Prisma 6 · PostgreSQL 16.

## Rodar local

```bash
npm install
docker compose up -d     # Postgres 16 local (porta 5434 no host)
cp .env.example .env     # DATABASE_URL já aponta p/ o compose
npx prisma migrate dev   # aplica as migrações
npx prisma db seed       # dados demo (comunidades/eventos ilustrativos)
npm run dev
# http://localhost:3000
```

A porta do host é **5434** de propósito (5432/5433 costumam estar ocupadas
por Postgres de outros projetos). Pra trocar, mude no `docker-compose.yml`
e na `DATABASE_URL`.

O site sobe mesmo sem banco: os forms respondem que a captação/inscrição
ainda não foi configurada. Pro fluxo completo, rode o Postgres e o seed.

## Produção

No ar via **Railway**, com deploy contínuo: push na `main` → produção.
Env vars do serviço: `DATABASE_URL` (Postgres do Railway) e
`NEXT_PUBLIC_SITE_URL` — pode ser o domínio puro, sem protocolo;
`lib/site.ts` normaliza. Migrações em produção: `npx prisma migrate deploy`.

Quando o domínio próprio sair, atualize `NEXT_PUBLIC_SITE_URL` (afeta
SEO/sitemap) e o e-mail de contato no `components/Footer.tsx`.

## Estrutura

```
app/            landing, /comunidades (+detalhe), /eventos/[slug], APIs, SEO
components/     seções da landing, vitrine e form de RSVP
lib/            schemas zod compartilhados + client Prisma + SITE_URL
prisma/         schema, migrações e seed demo
docs/           Master Plan, Blueprint e stories (fontes de verdade)
CLAUDE.md       contexto e regras do projeto p/ desenvolvimento com IA
```

Leia o `CLAUDE.md` antes de mexer — as decisões de escopo têm motivo
(edital Start BSB) e as regras de marca também.
