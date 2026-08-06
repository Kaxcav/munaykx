/**
 * Testes das páginas de descoberta (/descobrir/[recorte]) — SEO programático.
 *
 * O que importa provar aqui não é "a página abre", é: só existe página onde
 * existe dado, e conteúdo demo não entra no índice do Google.
 */
const BASE = "http://localhost:3000";
let ok = 0, fail = 0;
const check = (c, l) => { c ? (ok++, console.log("  ✓", l)) : (fail++, console.log("  ✗ FALHOU:", l)); };
const get = (u) => fetch(`${BASE}${u}`).then(async (r) => ({ status: r.status, body: await r.text() }));
const texto = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

console.log("\n1) Recorte com dado responde e se descreve direito");
const combo = await get("/descobrir/corrida-em-ceilandia");
check(combo.status === 200, "combinação modalidade+região responde 200");
check(/<h1[^>]*>Corrida em Ceilândia<\/h1>/.test(texto(combo.body)), "h1 é a frase que a pessoa pesquisa");
check(/<title>Corrida em Ceilândia/.test(combo.body), "title casa com o h1");
check(/rel="canonical"[^>]*\/descobrir\/corrida-em-ceilandia/.test(combo.body), "tem canonical apontando pra si");

const soModalidade = await get("/descobrir/corrida");
check(soModalidade.status === 200, "modalidade sozinha responde 200");
check(/<h1[^>]*>Corrida em Brasília<\/h1>/.test(texto(soModalidade.body)), "modalidade sozinha vira 'em Brasília'");

const soRegiao = await get("/descobrir/em-ceilandia");
check(soRegiao.status === 200, "região sozinha responde 200");
check(/<h1[^>]*>Comunidades em Ceilândia<\/h1>/.test(texto(soRegiao.body)), "região sozinha lista a região");

console.log("\n2) Recorte SEM dado é 404 — nunca página oca com 200");
for (const slug of ["surfe-em-ceilandia", "corrida-em-lago-norte", "xadrez", "em-nao-existe", "..%2F..%2Fetc"]) {
  const r = await get(`/descobrir/${slug}`);
  check(r.status === 404, `/descobrir/${slug} → 404 (${r.status})`);
}

console.log("\n3) Conteúdo demo NÃO vai pro índice do Google");
check(/name="robots"[^>]*noindex/.test(combo.body), "recorte só com demo sai noindex");
check(/name="robots"[^>]*follow/.test(combo.body), "…mas follow: o robô ainda anda pelos links");
// Asserção precisa: o que não pode aparecer é o recorte DEMO. Checar
// "nenhum /descobrir/ no sitemap" seria errado — a fixture real do grupo 4
// já põe recortes legítimos lá.
const sitemapDemo = await get("/sitemap.xml");
for (const slug of ["corrida-em-ceilandia", "em-ceilandia", "corrida"]) {
  check(
    !sitemapDemo.body.includes(`/descobrir/${slug}<`),
    `sitemap não lista /descobrir/${slug} (só tem demo)`,
  );
}

console.log("\n4) Com comunidade REAL, o recorte passa a ser indexável");
const real = await get("/descobrir/natacao-em-taguatinga");
check(real.status === 200, "recorte da comunidade real responde 200");
check(!/name="robots"[^>]*noindex/.test(real.body), "recorte com dado real NÃO é noindex");
const sitemapReal = await get("/sitemap.xml");
check(sitemapReal.body.includes("/descobrir/natacao-em-taguatinga"), "sitemap lista o recorte real");
check(sitemapReal.body.includes("/descobrir/natacao"), "sitemap lista também a modalidade sozinha");
check(!sitemapReal.body.includes("/descobrir/corrida-em-ceilandia"), "sitemap continua sem o recorte demo");

console.log("\n5) Links internos: o robô consegue chegar nas páginas");
const lista = await get("/comunidades");
check(/href="\/descobrir\/corrida-em-ceilandia"/.test(lista.body), "/comunidades linka os recortes ('buscas frequentes')");
const comFiltro = await get("/comunidades?modalidade=corrida&regiao=Ceil%C3%A2ndia");
check(/href="\/descobrir\/corrida-em-ceilandia"/.test(comFiltro.body), "filtro por querystring oferece a URL limpa equivalente");
check(/href="\/descobrir\//.test(combo.body), "a própria página linka recortes irmãos");

console.log("\n6) Não colide com a página de UMA comunidade");
const comunidade = await get("/comunidades/comunidade-004");
check(comunidade.status === 200, "/comunidades/[slug] continua de pé");
check(!/Buscas frequentes/.test(comunidade.body), "detalhe de comunidade não virou página de recorte");

console.log(`\n══ ${ok} ok, ${fail} falhas ══`);
process.exit(fail ? 1 : 0);
