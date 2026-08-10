-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "guia_iniciante" JSONB;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "termina_em" TIMESTAMP(3);
