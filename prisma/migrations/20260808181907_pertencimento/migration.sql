-- CreateEnum
CREATE TYPE "PapelMembership" AS ENUM ('membro', 'organizador');
-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "avisar_eventos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "papel" "PapelMembership" NOT NULL DEFAULT 'membro';
