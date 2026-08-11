import { test, expect } from "@playwright/test";
import { AUTH_ADMIN, limparFixtures, prisma } from "./fixtures";

/**
 * LOTE 4 — o /admin dentro do design system.
 *
 * O que estes testes seguram (e por quê):
 *
 * 1. **Um `<main>` por tela, e ele é o `<Pagina>`.** O `app/admin/layout.tsx`
 *    desenhava o próprio `<main>` e cada página entregava um fragmento com
 *    `<p class="eyebrow">` + `<h1>` copiados à mão. Agora o container é o
 *    `<PaginaAdmin>` (o `<Pagina>` do L1 na densidade do admin), e o layout
 *    NÃO pode voltar a ter `<main>`: dois aninhados é HTML inválido e o leitor
 *    de tela passa a ver duas regiões principais. O teste conta.
 *
 * 2. **Lista vazia oferece saída.** Antes, recorte sem resultado devolvia uma
 *    frase seca ("Nenhum lead com esse recorte.") e a pessoa ficava presa com
 *    os filtros que ela mesma pôs. Agora é `<EstadoVazio>` com CTA. **Este
 *    assert é vermelho no código anterior** — é ele que prova que o lote
 *    mudou comportamento de tela, não só classe.
 *
 * 3. **Chip de filtro continua LINK, e o estado continua na URL.** As pílulas
 *    de filtro do admin eram três ternários de classe escritos à mão em três
 *    arquivos; viraram `<Chip>`. Se alguém trocar por `<button onClick>` (a
 *    tentação óbvia ao "componentizar"), o recorte deixa de ser
 *    compartilhável e o voltar do navegador para de funcionar — e é
 *    exatamente isso que o item 10 do checklist da rodada proíbe. O teste
 *    exige `role=link` e o parâmetro na URL.
 *
 * Rodam com o banco em qualquer estado: os recortes usados são impossíveis de
 * propósito (`q=` com um termo que nenhuma fixture cria), então não dependem
 * de seed nem de ordem — a armadilha "verde por acidente de ambiente" do
 * CLAUDE.md.
 */

test.use({ extraHTTPHeaders: AUTH_ADMIN });

test.afterAll(async () => {
  await limparFixtures();
  await prisma.$disconnect();
});

/** Termo que nenhuma fixture, seed ou dado real produz. */
const NADA = "zzt-recorte-impossivel-xyz";

const ROTAS = [
  { url: "/admin", h1: "Dashboard" },
  { url: "/admin/comunidades", h1: "Comunidades" },
  { url: "/admin/comunidades/nova", h1: "Nova comunidade" },
  { url: "/admin/comunidades/assistido", h1: "Cadastro assistido" },
  { url: "/admin/aprovacoes", h1: "Fila de aprovação" },
  { url: "/admin/eventos", h1: "Eventos" },
  { url: "/admin/eventos/novo", h1: "Novo evento" },
  { url: "/admin/avisos", h1: "Avisos" },
  { url: "/admin/conteudo", h1: "Conteúdo do site" },
  { url: "/admin/leads", h1: "Leads" },
  { url: "/admin/rsvps", h1: "RSVPs" },
];

for (const rota of ROTAS) {
  test(`${rota.url} abre com UM <main> e o h1 do <Pagina>`, async ({ page }) => {
    await page.goto(rota.url);
    // Um só: o layout entrega a barra escura, a tela entrega o <main>.
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText(rota.h1);
  });
}

test("recorte sem resultado no /admin/leads oferece saída, não um beco", async ({
  page,
}) => {
  await page.goto(`/admin/leads?q=${NADA}`);
  await expect(page.getByText("Nenhum lead com esse recorte.")).toBeVisible();
  // O CTA é o que não existia antes da migração.
  const limpar = page.getByRole("link", { name: "Limpar filtros" });
  await expect(limpar).toBeVisible();
  await limpar.click();
  await expect(page).toHaveURL(/\/admin\/leads$/);
});

test("recorte sem resultado no /admin/rsvps oferece saída, não um beco", async ({
  page,
}) => {
  await page.goto(`/admin/rsvps?q=${NADA}`);
  await expect(page.getByText("Nenhum RSVP com esse recorte.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Limpar filtros" })).toBeVisible();
});

test("o chip de filtro do /admin/leads é LINK e preserva os outros filtros", async ({
  page,
}) => {
  await page.goto(`/admin/leads?periodo=7&q=${NADA}`);
  // Link, não botão: recorte de admin também é URL compartilhável.
  const organizador = page.getByRole("link", { name: "organizador", exact: true });
  await expect(organizador).toBeVisible();
  await organizador.click();

  await expect(page).toHaveURL(/tipo=organizador/);
  // O período e a busca sobrevivem ao clique — o chip troca UM filtro, não
  // zera o recorte.
  await expect(page).toHaveURL(/periodo=7/);
  await expect(page).toHaveURL(new RegExp(`q=${NADA}`));
});

test("o filtro de avisos virou chip e continua vivendo na URL", async ({ page }) => {
  await page.goto("/admin/avisos");
  const soOcultos = page.getByRole("link", { name: "Só ocultos" });
  await expect(soOcultos).toBeVisible();
  await soOcultos.click();
  await expect(page).toHaveURL(/filtro=ocultos/);
  await expect(page.locator("h1")).toContainText("Avisos");
});

test("os campos do formulário de comunidade continuam ligados ao rótulo", async ({
  page,
}) => {
  // Prova que a troca de `<input className={campo}>` por `<Input>` não perdeu
  // o par `<Label htmlFor>` ↔ `id` — que é o que faz clicar no rótulo focar o
  // campo e o leitor de tela anunciar o nome certo.
  await page.goto("/admin/comunidades/nova");
  await expect(page.getByLabel("Nome")).toBeVisible();
  await expect(page.getByLabel("Modalidade")).toBeVisible();
  await expect(page.getByLabel("Região (RA oficial)")).toBeVisible();
  await expect(page.getByLabel("Descrição")).toBeVisible();
});
