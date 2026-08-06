# Andaimes de teste

Scripts de verificação manual, escritos em 06/08/2026 junto com as
features que eles provam. **Não são suíte automatizada**: rodam contra um
`npm run dev` de pé e contra o banco local, e por isso não entram em CI
nenhum. A suíte versionada (Playwright) está registrada como ideia não
feita em `docs/IDEIAS.md`.

Existem porque cada um deles pegou pelo menos um erro real durante a
escrita. Ficam aqui pra não sumir.

## Como rodar

Sobe o banco e o servidor:

```bash
docker compose up -d
npx prisma migrate dev
npm run dev
```

### `teste-admin.mjs` — 34 asserções

Paginação, busca, período, dropdown de eventos e a regra do CSV (exporta o
recorte inteiro, nunca só a página). Precisa de volume pra provar que a
paginação corta: gera leads antes.

```bash
node scripts/testes/teste-admin.mjs
```

Usa `ADMIN_USER`/`ADMIN_PASSWORD` do `.env` — se você trocou, ajusta o
`AUTH` no topo do arquivo.

### `teste-seo.mjs` — 28 asserções

Páginas `/descobrir/[recorte]`: recorte sem dado é 404, recorte só com
`demo: true` sai `noindex` e fora do sitemap, e comunidade real vira
recorte indexável. O grupo 4 espera uma comunidade **não-demo** no banco.

```bash
node scripts/testes/teste-seo.mjs
```

### `teste-004-emails.mjs` — 16 asserções

E-mail transacional de inscrição — inclusive o que faltava: cancelamento
promove a fila **e avisa as duas pessoas**. Espera um evento `evento-004`
com **capacidade 1** e uma caixa de entrada falsa em `/tmp/inbox`.

```bash
# caixa de entrada falsa (deps fora do repo, não sujam o package.json)
mkdir -p /tmp/sink && cd /tmp/sink && npm i smtp-server mailparser
cp <repo>/scripts/testes/sink-smtp.mjs . && node sink-smtp.mjs &

# .env: EMAIL_PROVIDER="smtp" e SMTP_URL="smtp://localhost:1025"
node scripts/testes/teste-004-emails.mjs
```

Alternativa sem Node: Mailpit no docker compose (SMTP 1025, UI 8025) — aí
o `sink-smtp.mjs` não é necessário, mas as asserções que leem `/tmp/inbox`
precisam ser trocadas pela API do Mailpit.

### `teste-email-modo.mjs` — 10 asserções

Os três estados do e-mail (`desligado` / `teste` / `producao`) e a regra que
importa: **Resend com `onboarding@resend.dev` NÃO conta como configurado**,
porque só entrega pro dono da conta. Não precisa de servidor nem de banco.

```bash
npx tsx scripts/testes/teste-email-modo.mjs
```

## Três armadilhas que custaram tempo

1. **Contar linha de tabela no HTML inteiro dá o dobro.** O App Router
   embute o payload RSC em `<script>`, e as mesmas classes aparecem lá.
   Conte só o que está entre `<tbody>`.
2. **React separa nós de texto com `<!-- -->`.** Regex de conteúdo
   (`/1–50 de 133/`) falha por causa disso. Tire os comentários antes.
3. **E-mail que "funciona" no teste e não funciona pra ninguém.** A Resend
   entrega o remetente `onboarding@resend.dev` só pro dono da conta; todo
   o resto volta 403. Como `sendEmail` engole erro de propósito, o sintoma
   é silêncio. Por isso `emailConfigurado()` trata esse caso como NÃO
   configurado.
