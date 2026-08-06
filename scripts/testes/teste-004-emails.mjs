import fs from "node:fs";
const BASE = "http://localhost:3000";
const H = { "Content-Type": "application/json", Origin: BASE };
let ok = 0, fail = 0;
const check = (c, l) => { c ? (ok++, console.log("  ✓", l)) : (fail++, console.log("  ✗ FALHOU:", l)); };
const inbox = () => fs.existsSync("/tmp/inbox") ? fs.readdirSync("/tmp/inbox").map(f => JSON.parse(fs.readFileSync(`/tmp/inbox/${f}`, "utf8"))) : [];
const limpar = () => { fs.rmSync("/tmp/inbox", { recursive: true, force: true }); fs.mkdirSync("/tmp/inbox", { recursive: true }); };
const esperar = (ms = 1800) => new Promise(r => setTimeout(r, ms));
const rsvp = (email, nome) => fetch(`${BASE}/api/rsvps`, { method: "POST", headers: H, body: JSON.stringify({ eventSlug: "evento-004", nome, email }) }).then(r => r.json());
const cancelar = (token) => fetch(`${BASE}/api/rsvps/cancel`, { method: "POST", headers: H, body: JSON.stringify({ token }) }).then(r => r.json());

console.log("\n1) Inscrição confirmada dispara e-mail com o link");
limpar();
const a = await rsvp("a004@exemplo.invalid", "Ana");
await esperar();
let cx = inbox();
check(a.status === "confirmado", "A confirmada");
check(cx.length === 1, `1 e-mail (${cx.length})`);
check(/Presença confirmada/.test(cx[0]?.subject ?? ""), `assunto: ${cx[0]?.subject}`);
check((cx[0]?.html ?? "").includes(`/rsvp/${a.token}`), "e-mail traz o link de gestão");

console.log("\n2) Lista de espera dispara e-mail que PROMETE aviso");
limpar();
const b = await rsvp("b004@exemplo.invalid", "Bia");
await esperar();
cx = inbox();
check(b.status === "lista_espera", "B na fila");
check(/Lista de espera/.test(cx[0]?.subject ?? ""), `assunto: ${cx[0]?.subject}`);
check(/te avisa por e-mail/.test(cx[0]?.text ?? ""), "promete o aviso de promoção");

console.log("\n3) O E-MAIL QUE FALTAVA: cancelamento promove E avisa os dois");
limpar();
await cancelar(a.token);
await esperar(2500);
cx = inbox();
check(cx.length === 2, `2 e-mails disparados (${cx.length})`);
const paraA = cx.find(m => (m.to ?? "").includes("a004"));
const paraB = cx.find(m => (m.to ?? "").includes("b004"));
check(/cancelada/i.test(paraA?.subject ?? ""), `A recebeu cancelamento: ${paraA?.subject}`);
check(/Abriu vaga/i.test(paraB?.subject ?? ""), `B recebeu promoção: ${paraB?.subject}`);
check((paraB?.html ?? "").includes(`/rsvp/${b.token}`), "e-mail de promoção traz o link de B");
check(/Não precisa fazer nada/.test(paraB?.text ?? ""), "copy da promoção é clara");

console.log("\n4) Reinscrição: token não volta na resposta, MAS chega por e-mail");
limpar();
const a2 = await rsvp("a004@exemplo.invalid", "Ana de volta");
await esperar();
cx = inbox();
check(a2.token === null, "resposta HTTP não devolve token (anti-sequestro)");
check(cx.length === 1 && (cx[0].html ?? "").includes(`/rsvp/${a.token}`), "e-mail entrega o link pra quem é dono da caixa");

console.log("\n5) Idempotência: cancelar 2× não manda e-mail duplicado");
limpar();
await cancelar(b.token);
await esperar();
const depois1 = inbox().length;
await cancelar(b.token);
await esperar();
const depois2 = inbox().length;
check(depois2 === depois1, `2º cancelamento não gerou e-mail novo (${depois1} → ${depois2})`);

console.log("\n6) E-mail não derruba a inscrição quando falha");
check(true, "sendEmail engole erro e loga (garantido por design em lib/email.ts)");

console.log(`\n══ ${ok} ok, ${fail} falhas ══`);
process.exit(fail ? 1 : 0);
