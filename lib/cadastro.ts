import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

/**
 * CADASTRO DE COMUNIDADE PELO PAINEL — STORY-009, frente A.
 *
 * O caminho "criar comunidade nova", que a spec deixa livre pra qualquer conta
 * logada (decisão 1). O outro caminho — reivindicar comunidade que já existe —
 * **não mora aqui e não pode morar**: ele exige aprovação do admin sempre, e
 * misturar os dois num arquivo só é como a assimetria se perde.
 *
 * Três invariantes que este arquivo existe pra garantir:
 *
 * 1. **A comunidade nasce `pendente` NA APLICAÇÃO.** O default da coluna é
 *    `aprovada` de propósito (senão o deploy sumiria com tudo que já está no
 *    ar). Quem vem pelo painel nasce pendente porque está escrito aqui — se
 *    esta linha sumir, o cadastro público passa a publicar direto, sem
 *    aprovação, e nada quebra visivelmente.
 *
 * 2. **Quem cadastra vira organizador na MESMA transação.** Comunidade criada
 *    sem o vínculo é comunidade órfã: ninguém consegue administrar e o admin
 *    precisa consertar no banco. Por isso os três `create` são atômicos.
 *
 * 3. **O texto de autorização gravado é o daqui, nunca o que o cliente
 *    mandou.** É prova documental (regra 3 do projeto): se viesse do formulário
 *    dava pra forjar o aceite de um texto que ninguém leu.
 *
 * ATENÇÃO: este arquivo importa Prisma, então é SERVER-ONLY. O formulário
 * cliente recebe o texto de autorização por prop, vindo da página (server
 * component) — ver `app/painel/nova/page.tsx`.
 */

/**
 * O TEXTO QUE A PESSOA ACEITA. Fonte única, e é isto que vai pro banco.
 *
 * Guardamos o texto inteiro em `Community.autorizacaoTexto`, e não um booleano,
 * porque a redação muda com o tempo e o que vale juridicamente é a que a pessoa
 * leu. Um `true` num banco não prova nada sobre o que foi prometido.
 *
 * Se você mudar esta constante, os aceites antigos continuam guardando a
 * redação antiga — que é exatamente o comportamento desejado. Não faça
 * "migration" pra atualizar o texto de aceites já gravados: isso destrói a
 * prova.
 */
export const TEXTO_AUTORIZACAO =
  "Declaro que sou responsável por esta comunidade e que tenho legitimidade " +
  "para representá-la. Autorizo a MUNAY a publicar o nome, a descrição, os " +
  "horários e o local informados aqui na plataforma e nos canais dela. " +
  "Confirmo que as informações são verdadeiras e que posso solicitar a " +
  "remoção da comunidade a qualquer momento.";

/** Estado do formulário. Mesmo formato do admin (`AdminFormState`). */
export type CadastroFormState = { error: string } | null;

// Vazio vira undefined (a action grava null) — não fica "" no banco.
// Mesmo helper do `lib/admin.ts`; duplicado de propósito porque `lib/admin.ts`
// é do admin interno e este arquivo é da frente A — acoplar os dois faria uma
// mudança de regra do admin mexer no cadastro público sem ninguém perceber.
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const cadastroComunidadeSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Conta pra gente o nome da comunidade")
    .max(120, "Nome muito longo"),
  modalidade: z
    .string()
    .trim()
    .min(2, "Informe a modalidade (corrida, yoga, jiu-jitsu…)")
    .max(80),
  regiao: z.string().trim().min(2, "Escolha a região").max(80),
  city: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v || "Brasília"),
  descricao: textoOpcional(2000),
  horarios: textoOpcional(200),
  local: textoOpcional(200),
  nivel: textoOpcional(80),

  /**
   * O checkbox da decisão 2 da spec. `literal(true)` e não `boolean()`: o Zod
   * precisa REPROVAR o desmarcado, não aceitar `false` e deixar a regra pra
   * um `if` que alguém pode esquecer de escrever.
   */
  autorizacao: z.literal(true, {
    errorMap: () => ({
      message:
        "Pra publicar a comunidade a gente precisa da sua confirmação de que você responde por ela.",
    }),
  }),
});

export type CadastroComunidadeInput = z.infer<typeof cadastroComunidadeSchema>;

export type ResultadoCadastro =
  | { ok: true; slug: string; communityId: string; organizationId: string }
  | { ok: false; error: string };

/**
 * Slug de organização livre. A organização não tem página pública, então
 * desambiguar sozinho aqui é inofensivo — ninguém depende dessa URL.
 *
 * Para a COMUNIDADE o comportamento é o oposto de propósito: colisão vira erro
 * pra pessoa escolher outro nome, porque o slug dela É a URL pública e mudar
 * em silêncio entregaria um endereço que ela não escolheu.
 */
async function slugDeOrganizacaoLivre(base: string): Promise<string> {
  const raiz = `${base}-org`;
  for (let i = 0; i < 50; i++) {
    const tentativa = i === 0 ? raiz : `${raiz}-${i + 1}`;
    const existe = await prisma.organization.findUnique({
      where: { slug: tentativa },
      select: { id: true },
    });
    if (!existe) return tentativa;
  }
  // 50 colisões no mesmo nome é comportamento de bot, não de organizador.
  return `${raiz}-${Date.now()}`;
}

/**
 * Cria a comunidade e coloca quem cadastrou como organizador dela.
 *
 * DECISÃO DE ESCOPO (registrar no handoff): **cada cadastro cria uma
 * organização nova**, nomeada como a comunidade. A spec diz que uma conta pode
 * ter várias organizações e que a `Organization` serve pra agrupar comunidades
 * do mesmo dono — mas escolher em qual organização a comunidade entra é tela de
 * painel, que é a frente C. Enquanto ela não existe, criar uma por cadastro é o
 * comportamento previsível; anexar em silêncio à organização que já existe
 * seria mágica, e juntar duas depois é barato.
 *
 * Devolve `{ ok: false }` em vez de lançar: o chamador é uma Server Action que
 * precisa devolver mensagem pro formulário, não stack trace.
 */
export async function criarComunidade(
  userId: string,
  entrada: unknown,
): Promise<ResultadoCadastro> {
  const parsed = cadastroComunidadeSchema.safeParse(entrada);
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return { ok: false, error: primeiro?.message ?? "Dados inválidos." };
  }

  const dados = parsed.data;
  const slug = slugify(dados.nome);
  if (slug.length < 2) {
    // Nome só de emoji/pontuação passa no `min(2)` e vira slug vazio.
    return {
      ok: false,
      error: "Esse nome não gera um endereço válido. Usa letras e números.",
    };
  }

  const jaExiste = await prisma.community.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (jaExiste) {
    return {
      ok: false,
      error:
        "Já existe uma comunidade com esse nome na MUNAY. Se ela é sua, fala com a gente em vez de cadastrar de novo.",
    };
  }

  const slugOrg = await slugDeOrganizacaoLivre(slug);
  const agora = new Date();

  try {
    const criada = await prisma.$transaction(async (tx) => {
      const organizacao = await tx.organization.create({
        data: {
          nome: dados.nome,
          slug: slugOrg,
          // O vínculo nasce junto: sem ele a comunidade fica sem dono, e
          // "sem dono" no `lib/organizacao.ts` significa invisível pra todo
          // mundo — inclusive pra quem acabou de cadastrar.
          membros: { create: { userId } },
        },
        select: { id: true },
      });

      const comunidade = await tx.community.create({
        data: {
          slug,
          nome: dados.nome,
          modalidade: dados.modalidade,
          regiao: dados.regiao,
          city: dados.city,
          descricao: dados.descricao ?? null,
          horarios: dados.horarios ?? null,
          local: dados.local ?? null,
          nivel: dados.nivel ?? null,

          organizationId: organizacao.id,

          // (1) do topo do arquivo: pendente aqui, não no default da coluna.
          statusPublicacao: "pendente",

          // (3) do topo: a constante daqui, nunca `entrada`.
          autorizacaoTexto: TEXTO_AUTORIZACAO,
          autorizacaoEm: agora,

          // Não é conteúdo ilustrativo: tem organizador real por trás, que
          // assinou a autorização acima. `demo: true` é só pro seed.
          demo: false,
        },
        select: { id: true, slug: true },
      });

      return { comunidade, organizacao };
    });

    return {
      ok: true,
      slug: criada.comunidade.slug,
      communityId: criada.comunidade.id,
      organizationId: criada.organizacao.id,
    };
  } catch (error) {
    // Corrida entre o `findUnique` acima e o `create`: duas abas, dois cliques.
    // A transação já desfez a organização e o vínculo — não sobra órfão.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        error:
          "Já existe uma comunidade com esse nome na MUNAY. Tenta outro nome.",
      };
    }
    console.error(
      "[painel/nova] erro ao cadastrar comunidade:",
      error instanceof Error ? error.message : error,
    );
    return {
      ok: false,
      error: "Não foi possível cadastrar agora. Tenta de novo em instantes.",
    };
  }
}
