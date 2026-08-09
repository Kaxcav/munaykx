import { z } from "zod";
import { prisma } from "@/lib/db";
import { PUBLICO } from "@/lib/communities";
import { comunidadeDoUsuario } from "@/lib/organizacao";

/**
 * FEED DE AVISOS (STORY-010 · C5) — fonte única.
 *
 * O problema real: quando o treino muda de local ou cai por chuva, o aviso só
 * existe no grupo de WhatsApp — e quem não está no grupo é justamente o
 * iniciante que a MUNAY trouxe. Ele aparece no lugar errado, no pior momento
 * possível da jornada.
 *
 * Contrato de segurança, o mesmo do resto do painel: `userId` SEMPRE vem da
 * sessão lida no servidor, NUNCA do formulário — a assinatura (userId como
 * primeiro argumento) é a barreira. "Não é seu" e "não existe" devolvem o
 * mesmo motivo, e a página vira 404, nunca 403.
 *
 * XSS: o corpo é **texto puro**, guardado cru e escapado em TODA saída. Na
 * página, quem escapa é o React (nada de `dangerouslySetInnerHTML`); no
 * e-mail, `escaparHtml` aqui embaixo. Link vira `<a>` por segmentação — a
 * marcação nunca é interpretada, nem filtrada: ela simplesmente não é lida
 * como marcação em lugar nenhum.
 */

/** Janela do feed público da comunidade (decisão 5: validade é visual). */
export const DIAS_FEED_COMUNIDADE = 30;
/** Janela do feed na agenda — mais curta: ali é "o que importa agora". */
export const DIAS_FEED_AGENDA = 7;
export const POSTS_POR_PAGINA = 10;

export const postSchema = z.object({
  corpo: z
    .string()
    .trim()
    .min(3, "Escreva o aviso (mínimo 3 caracteres).")
    .max(1000, "O aviso passa de 1000 caracteres."),
});
export type PostInput = z.infer<typeof postSchema>;

export type ResultadoPost<T = undefined> =
  | { ok: true; dados: T }
  | {
      ok: false;
      motivo: "nao-dono" | "invalido" | "nao-publicavel";
      erro?: string;
    };

const naoDono = { ok: false, motivo: "nao-dono" } as const;

export type AvisoPublico = {
  id: string;
  createdAt: Date;
  corpo: string;
  /** `null` quando a conta do autor foi apagada — o aviso fica, o nome sai. */
  autorNome: string | null;
  comunidade: { slug: string; nome: string };
};

const SELECT_PUBLICO = {
  id: true,
  createdAt: true,
  corpo: true,
  autor: { select: { name: true } },
  community: { select: { slug: true, nome: true } },
} as const;

type LinhaPublica = {
  id: string;
  createdAt: Date;
  corpo: string;
  autor: { name: string } | null;
  community: { slug: string; nome: string };
};

function paraPublico(p: LinhaPublica): AvisoPublico {
  return {
    id: p.id,
    createdAt: p.createdAt,
    corpo: p.corpo,
    autorNome: p.autor?.name ?? null,
    comunidade: p.community,
  };
}

function desdeDias(dias: number): Date {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

/** Só o que o público pode ver: não oculto, dentro da janela, comunidade viva. */
const VISIVEL = { ocultoEm: null } as const;

// ── Escrita ────────────────────────────────────────────────────────────────

/**
 * Publica um aviso na comunidade da pessoa.
 *
 * Comunidade que ainda não foi aprovada não publica (critério de pronto da
 * spec). A recusa é explícita aqui em vez de só sumir na listagem: o
 * organizador precisa entender por que o aviso dele não apareceria — sumiço
 * silencioso é o que faz gente publicar três vezes e depois abrir chamado.
 */
export async function publicarAviso(
  userId: string,
  comunidadeSlug: string,
  entrada: unknown,
): Promise<ResultadoPost<{ id: string; communityId: string }>> {
  const com = await comunidadeDoUsuario(userId, comunidadeSlug);
  if (!com) return naoDono;

  if (com.statusPublicacao !== "aprovada" || !com.ativo) {
    return {
      ok: false,
      motivo: "nao-publicavel",
      erro:
        "Esta comunidade ainda não está publicada no site, então o aviso não teria quem ler.",
    };
  }

  const parsed = postSchema.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, motivo: "invalido", erro: parsed.error.issues[0]?.message };
  }

  const post = await prisma.post.create({
    data: { communityId: com.id, autorId: userId, corpo: parsed.data.corpo },
    select: { id: true, communityId: true },
  });
  return { ok: true, dados: post };
}

// ── Leitura pública ────────────────────────────────────────────────────────

/**
 * Avisos da comunidade pro site público: últimos 30 dias, paginado, sem os
 * ocultos. Devolve `temMais` em vez de total — contar toda vez custa e a UI
 * só precisa saber se existe próxima página.
 */
export async function avisosDaComunidade(
  communityId: string,
  opts: { pagina?: number } = {},
): Promise<{ avisos: AvisoPublico[]; pagina: number; temMais: boolean }> {
  const pagina = Math.max(1, Math.floor(opts.pagina ?? 1));
  const linhas = await prisma.post.findMany({
    where: {
      communityId,
      ...VISIVEL,
      createdAt: { gte: desdeDias(DIAS_FEED_COMUNIDADE) },
      community: PUBLICO,
    },
    orderBy: { createdAt: "desc" },
    skip: (pagina - 1) * POSTS_POR_PAGINA,
    take: POSTS_POR_PAGINA + 1, // +1 só pra saber se tem próxima
    select: SELECT_PUBLICO,
  });

  const temMais = linhas.length > POSTS_POR_PAGINA;
  return {
    avisos: linhas.slice(0, POSTS_POR_PAGINA).map(paraPublico),
    pagina,
    temMais,
  };
}

/**
 * Avisos pra AGENDA: últimos 7 dias das comunidades que a pessoa segue. É onde
 * o aviso realmente é visto — a página da comunidade a pessoa só abre quando
 * já foi procurar.
 */
export async function avisosDaAgenda(userId: string): Promise<AvisoPublico[]> {
  const seguidas = await prisma.membership.findMany({
    where: { userId },
    select: { communityId: true },
  });
  if (seguidas.length === 0) return [];

  const linhas = await prisma.post.findMany({
    where: {
      communityId: { in: seguidas.map((s) => s.communityId) },
      ...VISIVEL,
      createdAt: { gte: desdeDias(DIAS_FEED_AGENDA) },
      community: PUBLICO,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: SELECT_PUBLICO,
  });
  return linhas.map(paraPublico);
}

// ── Leitura do organizador ─────────────────────────────────────────────────

export type AvisoDoPainel = AvisoPublico & {
  ocultoEm: Date | null;
  ocultoMotivo: string | null;
};

/**
 * Os avisos da comunidade da pessoa — INCLUINDO os ocultos, e sem janela de
 * dias. O organizador precisa ver que algo foi ocultado (e por quê); descobrir
 * moderação pela ausência é pior que ler o motivo.
 */
export async function avisosDoPainel(
  userId: string,
  comunidadeSlug: string,
): Promise<AvisoDoPainel[] | null> {
  const com = await comunidadeDoUsuario(userId, comunidadeSlug);
  if (!com) return null;

  const linhas = await prisma.post.findMany({
    where: { communityId: com.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { ...SELECT_PUBLICO, ocultoEm: true, ocultoMotivo: true },
  });
  return linhas.map((p) => ({
    ...paraPublico(p),
    ocultoEm: p.ocultoEm,
    ocultoMotivo: p.ocultoMotivo,
  }));
}

// ── Moderação (admin) ──────────────────────────────────────────────────────

export const ocultarSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, "Escreva o motivo de ocultar.")
    .max(300, "Motivo longo demais."),
});

/**
 * Oculta um aviso. Motivo OBRIGATÓRIO e registro de quem ocultou — ocultar sem
 * motivo escrito vira decisão sem dono três meses depois. Reversível por
 * `reexibirAviso`: apagar não existe nesta superfície.
 */
export async function ocultarAviso(
  postId: string,
  entrada: unknown,
  por: string,
): Promise<ResultadoPost> {
  const parsed = ocultarSchema.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, motivo: "invalido", erro: parsed.error.issues[0]?.message };
  }
  await prisma.post.updateMany({
    where: { id: postId },
    data: { ocultoEm: new Date(), ocultoMotivo: parsed.data.motivo, ocultoPor: por },
  });
  return { ok: true, dados: undefined };
}

export async function reexibirAviso(postId: string): Promise<void> {
  await prisma.post.updateMany({
    where: { id: postId },
    data: { ocultoEm: null, ocultoMotivo: null, ocultoPor: null },
  });
}

export type AvisoDoAdmin = AvisoDoPainel & { ocultoPor: string | null };

/** Todos os avisos recentes pro /admin — ocultos inclusive, com o motivo. */
export async function avisosDoAdmin(
  opts: { apenasOcultos?: boolean; limite?: number } = {},
): Promise<AvisoDoAdmin[]> {
  const linhas = await prisma.post.findMany({
    where: opts.apenasOcultos ? { ocultoEm: { not: null } } : {},
    orderBy: { createdAt: "desc" },
    take: opts.limite ?? 100,
    select: {
      ...SELECT_PUBLICO,
      ocultoEm: true,
      ocultoMotivo: true,
      ocultoPor: true,
    },
  });
  return linhas.map((p) => ({
    ...paraPublico(p),
    ocultoEm: p.ocultoEm,
    ocultoMotivo: p.ocultoMotivo,
    ocultoPor: p.ocultoPor,
  }));
}

// ── Preferência de aviso por e-mail (opt-in) ───────────────────────────────

/**
 * Liga/desliga o aviso de POSTS daquela comunidade, escopado ao dono.
 *
 * Mora aqui, e não em `lib/membership.ts`, porque `avisarPosts` é da STORY-010
 * inteira — a 008 continua dona do aviso de evento. Separar mantém cada story
 * com uma superfície própria e evita que uma mexa no arquivo da outra.
 */
export async function definirAvisoPosts(
  userId: string,
  communityId: string,
  avisar: boolean,
): Promise<void> {
  await prisma.membership.updateMany({
    where: { userId, communityId },
    data: { avisarPosts: avisar },
  });
}

/** Quais comunidades a pessoa quer receber por e-mail. `Set` de communityId. */
export async function comunidadesComAvisoDePost(
  userId: string,
): Promise<Set<string>> {
  const linhas = await prisma.membership.findMany({
    where: { userId, avisarPosts: true },
    select: { communityId: true },
  });
  return new Set(linhas.map((l) => l.communityId));
}

// ── Renderização segura do corpo ───────────────────────────────────────────

export type Segmento = { tipo: "texto" | "link"; valor: string };

// http/https apenas. `javascript:` e `data:` não entram por construção — não é
// filtro que precisa acertar, é alfabeto que não os contém.
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;

/**
 * Quebra o corpo em texto e links pra UI renderizar sem `innerHTML`. Pontuação
 * final grudada no link (`ponto`, vírgula, parênteses) volta pro texto — senão
 * "veja em https://x.com/a." leva o ponto pra dentro da URL e o link quebra.
 */
export function segmentarCorpo(corpo: string): Segmento[] {
  const saida: Segmento[] = [];
  let fim = 0;
  for (const m of corpo.matchAll(URL_RE)) {
    const inicio = m.index ?? 0;
    let url = m[0];
    let sobra = "";
    const cauda = /[.,;:!?)\]}]+$/.exec(url);
    if (cauda) {
      sobra = cauda[0];
      url = url.slice(0, -sobra.length);
    }
    if (inicio > fim) saida.push({ tipo: "texto", valor: corpo.slice(fim, inicio) });
    if (url) saida.push({ tipo: "link", valor: url });
    if (sobra) saida.push({ tipo: "texto", valor: sobra });
    fim = inicio + m[0].length;
  }
  if (fim < corpo.length) saida.push({ tipo: "texto", valor: corpo.slice(fim) });
  return saida;
}

/** Escape de HTML pro corpo do e-mail, onde não existe React pra escapar. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Corpo pronto pro HTML do e-mail: tudo escapado, quebra de linha vira `<br>`
 * e link vira `<a rel="nofollow ugc noopener">` — `nofollow ugc` porque é
 * conteúdo de terceiro e a MUNAY não empresta reputação de domínio pra ele.
 */
export function corpoParaEmailHtml(corpo: string): string {
  return segmentarCorpo(corpo)
    .map((s) =>
      s.tipo === "link"
        ? `<a href="${escaparHtml(s.valor)}" rel="nofollow ugc noopener" target="_blank">${escaparHtml(s.valor)}</a>`
        : escaparHtml(s.valor),
    )
    .join("")
    .replace(/\r?\n/g, "<br>");
}
