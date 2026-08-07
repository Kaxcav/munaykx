"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";
import {
  POLITICA_VERSAO,
  dataParaBanco,
  erroDeCoerencia,
  perfilSchema,
  type PerfilEntrada,
} from "@/lib/perfil";
import { sanitizarInteresses } from "@/lib/interesses";
import { sanitizarRespostas } from "@/lib/perfil-perguntas";

export type ResultadoPerfil =
  | { ok: true }
  | { ok: false; erro: string; campo?: string };

/**
 * Salva o perfil da pessoa logada.
 *
 * ── TRÊS COISAS QUE ESTA ACTION FAZ E PARECEM PARANOIA ───────────────────
 *
 * 1. **Ignora qualquer id que venha do cliente.** O usuário é lido da
 *    sessão, sempre. Server action é endpoint HTTP público com outro nome:
 *    aceitar `userId` do corpo deixaria qualquer pessoa editar o perfil de
 *    qualquer outra com um fetch.
 *
 * 2. **Revalida no servidor mesmo já tendo validado no cliente.** O
 *    formulário roda o mesmo `perfilSchema`, mas quem chega por fetch direto
 *    não passa pelo formulário.
 *
 * 3. **Traduz violação de unicidade em mensagem, não em 500.** Hoje nenhum
 *    campo do perfil é único (o CPF, que era, saiu em 07/08), mas o
 *    tratamento fica: o dia em que alguém puser `@unique` em algo, o erro
 *    chega como texto legível em vez de "algo deu errado".
 */
export async function salvarPerfil(
  entrada: PerfilEntrada,
): Promise<ResultadoPerfil> {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return { ok: false, erro: "Sua sessão expirou. Entra de novo pra salvar." };
  }

  const parsed = perfilSchema.safeParse(entrada);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      erro: issue?.message ?? "Confere os campos aí.",
      campo: issue?.path?.[0]?.toString(),
    };
  }

  const dados = parsed.data;
  const incoerencia = erroDeCoerencia(dados);
  if (incoerencia) return { ok: false, erro: incoerencia };

  const agora = new Date();

  // Consentimento é DATA: só carimba quando passa de não-consentido pra
  // consentido. Regravar a data a cada salvamento apagaria desde quando a
  // pessoa consentiu — que é justamente o que se prova numa fiscalização.
  const atual = await prisma.user.findUnique({
    where: { id: sessao.user.id },
    select: {
      consentiuCadastro: true,
      consentiuRecomendacao: true,
      consentiuInsights: true,
    },
  });

  const carimbo = (ligado: boolean, anterior: Date | null | undefined) =>
    ligado ? (anterior ?? agora) : null;

  try {
    await prisma.user.update({
      where: { id: sessao.user.id },
      data: {
        name: dados.nome,
        apelido: dados.apelido ?? null,
        // `dataParaBanco` e não `new Date(...)`: a coluna é `@db.Date` e o
        // construtor nativo trata "2006-08-08" como meia-noite UTC, que vira
        // outro dia dependendo do fuso do servidor. Ver a nota em lib/perfil.ts.
        nascimento: dados.nascimento ? dataParaBanco(dados.nascimento) : null,
        genero: dados.genero ?? null,
        telefone: dados.telefone ?? null,
        cep: dados.cep ?? null,
        cidade: dados.cidade ?? null,
        uf: dados.uf ?? null,
        bio: dados.bio ?? null,
        perfilPublico: dados.perfilPublico,
        interesses: sanitizarInteresses(dados.interesses),
        respostas: sanitizarRespostas(dados.respostas),
        consentiuCadastro: carimbo(dados.consentiuCadastro, atual?.consentiuCadastro),
        consentiuRecomendacao: carimbo(
          dados.consentiuRecomendacao,
          atual?.consentiuRecomendacao,
        ),
        consentiuInsights: carimbo(dados.consentiuInsights, atual?.consentiuInsights),
        politicaVersao: POLITICA_VERSAO,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const alvo = Array.isArray(e.meta?.target)
        ? (e.meta?.target as string[]).join(",")
        : String(e.meta?.target ?? "");
      return {
        ok: false,
        campo: alvo || undefined,
        erro: "Esse dado já está em outra conta. Chama a gente que a gente resolve.",
      };
    }
    return {
      ok: false,
      erro: "Não deu pra salvar agora. Tenta de novo em instantes?",
    };
  }

  revalidatePath("/perfil");
  revalidatePath("/minhas-inscricoes");
  return { ok: true };
}

/**
 * Apaga os dados de perfil sem apagar a conta — o "direito de eliminação"
 * do art. 18 da LGPD aplicado à camada que a pessoa preencheu por opção.
 *
 * A conta e as inscrições ficam: elas têm outra base legal (execução do que
 * a pessoa contratou ao se inscrever num evento) e apagá-las junto tiraria
 * do organizador a lista de quem confirmou presença.
 */
export async function limparPerfil(): Promise<ResultadoPerfil> {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return { ok: false, erro: "Sua sessão expirou. Entra de novo." };
  }

  await prisma.user.update({
    where: { id: sessao.user.id },
    data: {
      nascimento: null,
      genero: null,
      telefone: null,
      cep: null,
      cidade: null,
      uf: null,
      apelido: null,
      bio: null,
      fotoUrl: null,
      perfilPublico: false,
      interesses: [],
      respostas: Prisma.DbNull,
      consentiuCadastro: null,
      consentiuRecomendacao: null,
      consentiuInsights: null,
    },
  });

  revalidatePath("/perfil");
  return { ok: true };
}
