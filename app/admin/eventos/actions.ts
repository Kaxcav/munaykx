"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  eventAdminSchema,
  parseDataBrasilia,
  type AdminFormState,
} from "@/lib/admin";

export async function salvarEvento(
  id: string | null,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  // "?? \"\"": campo ausente no POST vira vazio — o Zod responde com a
  // mensagem de negócio em vez de "expected string, received null".
  const parsed = eventAdminSchema.safeParse({
    communityId: formData.get("communityId") ?? "",
    titulo: formData.get("titulo") ?? "",
    slug: formData.get("slug") ?? "",
    startsAt: formData.get("startsAt") ?? "",
    city: formData.get("city") ?? "",
    local: formData.get("local") ?? "",
    capacidade: formData.get("capacidade") ?? "",
    gratuito: formData.get("gratuito") === "on",
    demo: formData.get("demo") === "on",
    ativo: formData.get("ativo") === "on",
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dados inválidos." };
  }

  const startsAt = parseDataBrasilia(parsed.data.startsAt);
  if (!startsAt) {
    return { error: "Data e hora inválidas." };
  }

  const data = {
    communityId: parsed.data.communityId,
    titulo: parsed.data.titulo,
    slug: parsed.data.slug,
    startsAt,
    city: parsed.data.city,
    local: parsed.data.local ?? null,
    capacidade: parsed.data.capacidade,
    gratuito: parsed.data.gratuito,
    demo: parsed.data.demo,
    ativo: parsed.data.ativo,
  };

  try {
    if (id) {
      await prisma.event.update({ where: { id }, data });
    } else {
      await prisma.event.create({ data });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Já existe um evento com esse slug." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { error: "Comunidade não encontrada." };
    }
    console.error(
      "[admin/eventos] erro ao salvar:",
      error instanceof Error ? error.message : error,
    );
    return { error: "Não foi possível salvar. Tenta de novo em instantes." };
  }

  revalidatePath(`/eventos/${parsed.data.slug}`);
  redirect("/admin/eventos");
}
