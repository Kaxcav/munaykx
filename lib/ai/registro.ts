import { prisma } from "@/lib/db";

/**
 * REGISTRO ANÔNIMO DE BUSCAS — o gravador (enabler da ideia #5).
 *
 * Guarda o que a cidade PROCURA, pra um dia responder "o que Brasília pede e a
 * MUNAY ainda não tem". Autorizado pelo dono em 09/08/2026.
 *
 * ── É SÓ O GRAVADOR ─────────────────────────────────────────────────────
 *
 * Nada aqui agrupa, classifica ou interpreta. A parte inteligente da #5
 * (clusterização, dossiê de demanda) é onda posterior e **não** foi construída
 * — este arquivo escreve linhas e conta linhas, e mais nada. Custo de IA:
 * ZERO. Nenhuma chamada a modelo acontece neste caminho.
 *
 * ── ANONIMATO: estrutural, não por disciplina ───────────────────────────
 *
 * A função de gravar **não recebe** userId, IP, sessão ou cookie — não é que
 * ela escolha não usar: ela não tem acesso. E a tabela não tem coluna pra isso
 * (ver `BuscaRegistro` no schema). Duas camadas, e a de baixo é a que vale:
 * mesmo que alguém passe a identidade adiante um dia, não existe onde gravar.
 *
 * Nem hash de IP — hash de IP continua sendo pseudônimo, e pseudônimo
 * identifica. A ausência é o ponto.
 *
 * ── O texto é sensível ──────────────────────────────────────────────────
 *
 * Gente escreve desabafo em campo de busca. O texto fica porque é o valor do
 * registro, mas nunca é exibido individualmente no /admin (só contagem), nunca
 * sai em export, e o uso previsto é agregado.
 *
 * ── Nunca atrasa nem derruba a busca ────────────────────────────────────
 *
 * `registrarBusca` é fire-and-forget e engole erro, mesmo espírito do
 * `dispararEmail()`: gravar estatística não pode fazer a pessoa esperar, e
 * banco fora do ar não pode transformar uma busca boa em erro.
 */

/** Só a data — sem hora. Hora + região começa a virar rastro de uma pessoa. */
function hoje(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const MAX_TEXTO = 300;

export type EntradaRegistro = {
  /** O que a pessoa escreveu. Cortado antes de gravar. */
  texto: string;
  /** O que a IA entendeu — `null` quando não deu. */
  modalidade: string | null;
  /** Região MENCIONADA na busca. A MUNAY não geolocaliza ninguém. */
  regiao: string | null;
  /** Houve o que oferecer? `false` é o registro mais valioso: demanda sem oferta. */
  teveResultado: boolean;
};

/**
 * Grava uma busca. Fire-and-forget: quem chama não espera e não trata erro.
 *
 * Repare na assinatura — não há parâmetro de identidade. Se um dia alguém
 * quiser ligar busca a pessoa, vai ter que mudar esta assinatura E o schema,
 * e as duas mudanças são visíveis em review.
 */
export function registrarBusca(entrada: EntradaRegistro): void {
  const texto = entrada.texto.trim().slice(0, MAX_TEXTO);
  if (!texto) return;

  void prisma.buscaRegistro
    .create({
      data: {
        dia: hoje(),
        texto,
        modalidade: entrada.modalidade,
        regiao: entrada.regiao,
        teveResultado: entrada.teveResultado,
      },
    })
    .catch((e) =>
      console.error(
        "[registro-busca] falha ao gravar:",
        e instanceof Error ? e.message : e,
      ),
    );
}

export type ResumoBuscas = {
  total: number;
  ultimos30: number;
  semResultado30: number;
};

/**
 * Contagem AGREGADA pro /admin — números, nunca textos.
 *
 * Exibir busca individual é justamente o que a sensibilidade do campo proíbe;
 * a contagem prova que o gravador funciona sem expor ninguém. Quando a #5
 * chegar de verdade, ela lê daqui — com agregação e corte mínimo.
 */
export async function resumoBuscas(): Promise<ResumoBuscas> {
  const corte = new Date();
  corte.setUTCDate(corte.getUTCDate() - 30);

  const [total, ultimos30, semResultado30] = await Promise.all([
    prisma.buscaRegistro.count(),
    prisma.buscaRegistro.count({ where: { dia: { gte: corte } } }),
    prisma.buscaRegistro.count({
      where: { dia: { gte: corte }, teveResultado: false },
    }),
  ]);

  return { total, ultimos30, semResultado30 };
}
