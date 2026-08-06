# IDEIAS — registro rápido do Kaxcav

Uma linha por ideia, com data. Ideia madura vira story — e ganha o link
aqui em vez de sumir. (Regra de realidade: ideia listada aqui é
planejamento, nunca fato.)

- **05/08/2026** · Select de região com as **35 RAs oficiais do DF**, não
  só o eixo central; "Outra região" no fim pra RIDE/Entorno. → promovida:
  tarefa 6 da STORY-006 (06/08/2026).
- **06/08/2026** · **Melhorias baratas do /admin**: paginação, busca por
  nome/e-mail, link "ver no site", recorte de leads dos últimos 7 dias e
  dropdown de eventos no lugar da fileira de chips. → **feita 06/08/2026**
  (`lib/admin-lista.ts` + `components/admin/`, 34 asserções em
  `teste-admin.mjs`).
- **06/08/2026** · **SEO programático** por recorte modalidade+região —
  ninguém pesquisa "plataforma de comunidades esportivas", pesquisa
  "corrida em Ceilândia". → **feita 06/08/2026** (`/descobrir/[recorte]`,
  `lib/descoberta.ts`, 28 asserções em `teste-seo.mjs`). Duas regras
  ficaram gravadas no código: só existe página onde existe dado, e recorte
  que só tem `demo: true` sai `noindex` e fora do sitemap.
- **06/08/2026** · **Configurar ESLint** (chore de fábrica). → **feito
  06/08/2026** (`eslint.config.mjs`, flat config; `npm run lint` virou
  `eslint .` porque `next lint` some no Next 16).

## Não feitas ainda

- **06/08/2026** · Suíte **Playwright versionada** no repo (tarefa 8 da
  STORY-007). Hoje os testes são andaimes `.mjs` que rodam contra o dev
  server e não entram em CI nenhum. Vira story quando houver CI.
- **06/08/2026** · Página de **evento passado** com resumo/galeria — hoje
  evento que passa some da descoberta e leva o SEO junto.
- **06/08/2026** · **Lembrete por e-mail 24h antes do treino.** A régua de
  e-mail já existe (`lib/emails-rsvp.ts`); falta o disparo agendado, e
  isso exige worker, que o Railway cobra à parte. É decisão de custo, não
  de código.
- **06/08/2026** · `/descobrir` **sem recorte** (índice de todos os
  recortes). Hoje o índice é a seção "Buscas frequentes" no rodapé de
  `/comunidades`. Só vale a pena quando houver dezenas de recortes.
