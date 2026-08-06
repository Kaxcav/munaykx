/**
 * Testes das melhorias de listagem do admin: paginação, busca, período,
 * dropdown de evento e a regra do CSV (exporta o recorte, não a página).
 */
const BASE = "http://localhost:3000";
const AUTH = "Basic " + Buffer.from("munay:senha-de-teste-longa").toString("base64");
let ok = 0, fail = 0;
const check = (c, l) => { c ? (ok++, console.log("  ✓", l)) : (fail++, console.log("  ✗ FALHOU:", l)); };
const get = (u) => fetch(`${BASE}${u}`, { headers: { Authorization: AUTH } }).then(async (r) => ({ status: r.status, body: await r.text() }));
/**
 * Conta as linhas REAIS da tabela. Contar no HTML inteiro dava o dobro: o
 * App Router embute o payload RSC em <script>, e as mesmas classes aparecem
 * lá. Então só o que está entre <tbody> conta.
 */
const linhas = (html) => {
  const corpo = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  return (corpo.match(/<tr/g) ?? []).length;
};
/** React separa nós de texto com <!-- --> — atrapalha regex de conteúdo. */
const texto = (html) => html.replace(/<!--[\s\S]*?-->/g, "");
const linhasCsv = (csv) => csv.trim().split("\r\n").length - 1;

console.log("\n1) Paginação: a lista para nos 50, não despeja 130");
const p1 = await get("/admin/leads");
check(linhas(p1.body) === 50, `página 1 traz 50 linhas (${linhas(p1.body)})`);
check(/1–50 de 13\d/.test(texto(p1.body)), "rodapé diz o intervalo e o total");
check(p1.body.includes("Próxima"), "tem link de próxima página");

const p3 = await get("/admin/leads?p=3");
check(linhas(p3.body) > 0 && linhas(p3.body) <= 50, `página 3 traz ${linhas(p3.body)} linhas`);
check(!/1–50 de/.test(texto(p3.body)), "página 3 não repete o intervalo da página 1");

console.log("\n2) Página inventada não quebra nem mente");
const p99 = await get("/admin/leads?p=99");
check(p99.status === 200, "p=99 responde 200");
check(/Essa página não existe nesse recorte/.test(p99.body), "avisa que a página não existe (em vez de 'nenhum lead')");
const p0 = await get("/admin/leads?p=0");
check(linhas(p0.body) === 50, "p=0 cai na página 1, não em offset negativo");
const plixo = await get("/admin/leads?p=abc");
check(linhas(plixo.body) === 50, "p=abc cai na página 1");

console.log("\n3) Busca por nome e por e-mail");
const busca = await get("/admin/leads?q=Pessoa%2077");
check(busca.body.includes("Pessoa 77"), "acha por nome");
check(linhas(busca.body) === 1, `traz só o que casa (${linhas(busca.body)})`);
const buscaEmail = await get("/admin/leads?q=pag42%40exemplo");
check(buscaEmail.body.includes("Pessoa 42"), "acha por e-mail");
const buscaCaixa = await get("/admin/leads?q=PESSOA%2077");
check(buscaCaixa.body.includes("Pessoa 77"), "busca ignora maiúscula/minúscula");
const buscaVazia = await get("/admin/leads?q=zzzznaoexiste");
check(/Nenhum lead com esse recorte/.test(buscaVazia.body), "busca sem resultado diz 'nenhum lead'");

console.log("\n4) Período de 7 dias corta o histórico");
const semana = await get("/admin/leads?periodo=7");
check(linhas(semana.body) < linhas(p1.body), `7 dias traz menos que o total (${linhas(semana.body)} < ${linhas(p1.body)})`);
check(!semana.body.includes("Pessoa 100"), "lead de 100 dias atrás fica fora");
const periodoLixo = await get("/admin/leads?periodo=999");
check(linhas(periodoLixo.body) === 50, "período inválido é ignorado (não vira filtro fantasma)");

console.log("\n5) Filtros se combinam sem se apagar");
const combo = await get("/admin/leads?tipo=participante&periodo=7&q=Pessoa");
check(combo.status === 200, "tipo + período + busca respondem juntos");
check(combo.body.includes('name="tipo"') && combo.body.includes('name="periodo"'), "o form de busca carrega os filtros ativos em campos ocultos");
check(combo.body.includes("periodo=7") && combo.body.includes("tipo=participante"), "os chips preservam os outros filtros na URL");

console.log("\n6) CSV leva o recorte inteiro, NUNCA só a página");
const csvTudo = await get("/admin/leads/export");
check(linhasCsv(csvTudo.body) > 50, `export sem filtro passa de 50 linhas (${linhasCsv(csvTudo.body)})`);
const csvSemana = await get("/admin/leads/export?periodo=7");
check(linhasCsv(csvSemana.body) < linhasCsv(csvTudo.body), `export respeita o período (${linhasCsv(csvSemana.body)} < ${linhasCsv(csvTudo.body)})`);
const csvBusca = await get("/admin/leads/export?q=pag42");
check(linhasCsv(csvBusca.body) === 1, `export respeita a busca (${linhasCsv(csvBusca.body)} linha)`);
const csvPagina = await get("/admin/leads/export?p=3");
check(linhasCsv(csvPagina.body) === linhasCsv(csvTudo.body), "export ignora ?p= de propósito");

console.log("\n7) Evento vira dropdown e slug inventado não mente");
const rsvps = await get("/admin/rsvps");
check(/<select[^>]+name="evento"/.test(rsvps.body), "filtro de evento é <select>, não fileira de chips");
check(rsvps.body.includes("Todos os eventos"), "select tem opção de limpar");
const rsvpEvento = await get("/admin/rsvps?evento=evento-004");
check(rsvpEvento.body.includes("Treino de Teste 004"), "filtra pelo evento escolhido");
const rsvpFantasma = await get("/admin/rsvps?evento=nao-existe-mesmo");
check(rsvpFantasma.status === 200, "slug inexistente responde 200");
check(
  linhas(rsvpFantasma.body) === linhas(rsvps.body),
  `slug inexistente é descartado, não vira filtro fantasma (${linhas(rsvpFantasma.body)} = ${linhas(rsvps.body)})`,
);
// React marca `selected` na opção que casa com o defaultValue. Como o slug
// foi descartado, quem tem que estar marcado é o "Todos os eventos" (value="").
check(
  /<option value="" selected/.test(rsvpFantasma.body),
  "o select volta pra 'Todos os eventos' quando o slug não existe",
);

console.log("\n8) Link 'ver no site' e atalhos");
const evs = await get("/admin/eventos");
check(/href="\/eventos\/evento-004"/.test(evs.body), "evento tem link pra página pública");
check(/href="\/admin\/rsvps\?evento=evento-004"/.test(evs.body), "contagem de confirmados leva pros RSVPs do evento");
const coms = await get("/admin/comunidades");
check(/href="\/comunidades\/comunidade-004"/.test(coms.body), "comunidade tem link pra página pública");
const dash = await get("/admin");
check(/href="\/admin\/leads\?periodo=7"/.test(dash.body), "dashboard tem card de leads dos últimos 7 dias");

console.log(`\n══ ${ok} ok, ${fail} falhas ══`);
process.exit(fail ? 1 : 0);
