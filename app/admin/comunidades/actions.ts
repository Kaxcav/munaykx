"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { communityAdminSchema, type AdminFormState } from "@/lib/admin";

/**
 * Cria/edita comunidade. Padrão do admin: Server Actions + useActionState
 * (o middleware de Basic Auth cobre o POST, que também bate em /admin/*).
 */
export async function salvarComunidade(
  id: string | null,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  // "?? \"\"": campo ausente no POST vira vazio — o Zod responde com a
  // mensagem de negócio em vez de "expected string, received null".
  const parsed = communityAdminSchema.safeParse({
    nome: formData.get("nome") ?? "",
    slug: formData.get("slug") ?? "",
    modalidade: formData.get("modalidade") ?? "",
    regiao: formData.get("regiao") ?? "",
    city: formData.get("city") ?? "",
    descricao: formData.get("descricao") ?? "",
    horarios: formData.get("horarios") ?? "",
    local: formData.get("local") ?? "",
    nivel: formData.get("nivel") ?? "",
    demo: formData.get("demo") === "on",
    ativo: formData.get("ativo") === "on",
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dados inválidos." };
  }

  const data = {
    ...parsed.data,
    descricao: parsed.data.descricao ?? null,
    horarios: parsed.data.horarios ?? null,
    local: parsed.data.local ?? null,
    nivel: parsed.data.nivel ?? null,
  };

  try {
    if (id) {
      await prisma.community.update({ where: { id }, data });
    } else {
      await prisma.community.create({ data });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Já existe uma comunidade com esse slug." };
    }
    console.error(
      "[admin/comunidades] erro ao salvar:",
      error instanceof Error ? error.message : error,
    );
    return { error: "Não foi possível salvar. Tenta de novo em instantes." };
  }

  revalidatePath("/comunidades");
  revalidatePath(`/comunidades/${parsed.data.slug}`);
  redirect("/admin/comunidades");
}
