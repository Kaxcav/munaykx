-- AlterTable
ALTER TABLE "events" ADD COLUMN     "destino" TEXT,
ADD COLUMN     "modo_rota" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "origem" TEXT,
ADD COLUMN     "percurso_obs" TEXT;
