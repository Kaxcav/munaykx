import { test, expect } from "@playwright/test";
import { limparOrganizacoes, prisma } from "./fixtures";
import {
  validarSugestaoEvento,
  montarStartsAt,
  escolherComunidadeSlug,
  mediaTypeValido,
  dataISOValida,
  horaValida,
  extrairEventoDeFlyer,
  zerarTetosDoFlyer,
  MAX_BYTES_IMAGEM,
  TIPOS_IMAGEM,
} from "@/lib/ai/flyer";

/**
 * FLYER → EVENTO — o que estes testes protegem.
 *
 * 1. **A IA propõe, o humano decide.** Nada no caminho da extração escreve no
 *    banco — a extração devolve uma SUGESTÃO que pré-preenche o form; quem salva
 *    é o organizador. Se um dia alguém "agilizar" publicando direto, a regra 3
 *    (nunca publicar sem revisão/autorização) cai junto.
 * 2. **Grounded.** Modalidade só sai da lista real; data/hora só valem se forem
 *    data/hora de verdade. Campo ausente vira VAZIO (o form pede revisão), nunca
 *    chute plausível (que passa despercebido).
 * 3. **Teto de custo.** Balde próprio (mecânica testada em ai-substrato) +
 *    allowlist de formato e teto de tamanho ANTES de virar chamada paga.
 */

const FACETAS = { modalidades: ["Corrida", "Pedal", "Vôlei"] };
const resposta = (o: Record<string, unknown>) => JSON.stringify(o);

const COMPLETA = {
  titulo: "Pedal de Domingo",
  dataISO: "2026-09-06",
  hora: "06:00",
  local: "Portão do Parque da Cidade",
  modalidade: "Pedal",
  observacao: null,
};

test.beforeEach(() => zerarTetosDoFlyer());

// ── Grounded ───────────────────────────────────────────────────────────────

test("extrai os campos de um cartaz bem preenchido", () => {
  const s = validarSugestaoEvento(resposta(COMPLETA), FACETAS);
  expect(s).toMatchObject({
    titulo: "Pedal de Domingo",
    dataISO: "2026-09-06",
    hora: "06:00",
    local: "Portão do Parque da Cidade",
    modalidade: "Pedal",
  });
});

test("modalidade fora do catálogo vira VAZIO, não chute", () => {
  const s = validarSugestaoEvento(resposta({ ...COMPLETA, modalidade: "Crossfit" }), FACETAS);
  expect(s?.modalidade).toBeNull();
  expect(s?.titulo).toBe("Pedal de Domingo"); // o resto sobrevive
});

test("data inválida (formato ou 31/02) vira VAZIO", () => {
  for (const ruim of ["06/09/2026", "2026-13-01", "2026-02-31", "amanhã", "2026-9-6"]) {
    expect(validarSugestaoEvento(resposta({ ...COMPLETA, dataISO: ruim }), FACETAS)?.dataISO, ruim).toBeNull();
  }
  expect(dataISOValida("2026-09-06")).toBe("2026-09-06");
});

test("hora inválida vira VAZIO; HH:MM válido normaliza", () => {
  for (const ruim of ["6h", "25:00", "12:60", "seis da manhã"]) {
    expect(horaValida(ruim), ruim).toBeNull();
  }
  expect(horaValida("6:15")).toBe("06:15"); // completa o dígito
  expect(horaValida("19:00")).toBe("19:00");
});

test("campos ausentes ficam nulos (form em branco), não invenções", () => {
  const s = validarSugestaoEvento(
    resposta({ titulo: "Aulão", dataISO: null, hora: null, local: null, modalidade: null, observacao: "Cartaz não tinha data nem local." }),
    FACETAS,
  );
  expect(s?.titulo).toBe("Aulão");
  expect(s?.dataISO).toBeNull();
  expect(s?.hora).toBeNull();
  expect(s?.local).toBeNull();
  expect(s?.modalidade).toBeNull();
  expect(s?.observacao).toContain("não tinha data");
});

test("JSON quebrado devolve null, não explode", () => {
  for (const lixo of ["", "não é json", "{quebrado", "[]", "null"]) {
    expect(validarSugestaoEvento(lixo, FACETAS), lixo).toBeNull();
  }
});

test("aguenta markdown em volta e corta título longo demais", () => {
  const s = validarSugestaoEvento(
    "```json\n" + resposta({ ...COMPLETA, titulo: "x".repeat(200) }) + "\n```",
    FACETAS,
  );
  expect(s?.modalidade).toBe("Pedal");
  expect((s?.titulo ?? "").length).toBeLessThanOrEqual(160);
});

// ── Pré-preenchimento (o que vai pro form) ──────────────────────────────────

test("montarStartsAt combina data+hora; sem hora usa 00:00; sem data fica vazio", () => {
  expect(montarStartsAt("2026-09-06", "06:00")).toBe("2026-09-06T06:00");
  expect(montarStartsAt("2026-09-06", null)).toBe("2026-09-06T00:00");
  expect(montarStartsAt(null, "06:00")).toBe("");
});

test("escolherComunidadeSlug casa por modalidade (case-insensitive), senão null", () => {
  const coms = [
    { slug: "pedal-df", modalidade: "Pedal" },
    { slug: "corre-sul", modalidade: "Corrida" },
  ];
  expect(escolherComunidadeSlug("Pedal", coms)).toBe("pedal-df");
  expect(escolherComunidadeSlug("pedal", coms)).toBe("pedal-df");
  expect(escolherComunidadeSlug("Natação", coms)).toBeNull(); // sem comunidade dessa
  expect(escolherComunidadeSlug(null, coms)).toBeNull();
});

// ── Teto de custo: guardas pré-chamada ──────────────────────────────────────

test("allowlist de formato e teto de tamanho existem", () => {
  for (const t of TIPOS_IMAGEM) expect(mediaTypeValido(t)).toBe(true);
  for (const t of ["application/pdf", "image/svg+xml", "text/html", ""]) {
    expect(mediaTypeValido(t), t).toBe(false);
  }
  expect(MAX_BYTES_IMAGEM).toBe(5 * 1024 * 1024);
});

test("formato inválido é barrado ANTES de qualquer chamada (fail-safe)", async () => {
  // mediaType fora da allowlist → null sem tocar a API (a guarda vem antes do
  // provedor.gerar). Determinístico com ou sem chave.
  const r = await extrairEventoDeFlyer({
    base64: "QUJD",
    mediaType: "application/pdf",
    facetas: FACETAS,
    ip: "1.1.1.1",
    hojeISO: "2026-08-10",
  });
  expect(r).toBeNull();
});

// ── A IA propõe, o humano decide (não auto-publica) ─────────────────────────

test("a EXTRAÇÃO não cria evento nenhum no banco", async () => {
  await limparOrganizacoes();
  const antes = await prisma.event.count();

  // Caminho de guarda (formato inválido) → null, sem escrita. Mesmo no caminho
  // feliz (com chave), a extração devolveria SÓ uma sugestão: não há Prisma de
  // escrita neste módulo. O ponto é o banco não ser tocado.
  const r = await extrairEventoDeFlyer({
    base64: "QUJD",
    mediaType: "application/pdf",
    facetas: FACETAS,
    ip: "1.1.1.1",
    hojeISO: "2026-08-10",
  });
  expect(r === null || typeof r === "object").toBe(true);

  const depois = await prisma.event.count();
  expect(depois).toBe(antes); // nada foi publicado
  await prisma.$disconnect();
});
