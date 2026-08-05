import { PrismaClient } from "@prisma/client";

/**
 * Singleton do PrismaClient (padrão Next.js): em dev o hot-reload
 * recarrega módulos a cada mudança — guardar a instância em globalThis
 * evita abrir uma conexão nova por reload e esgotar o pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
