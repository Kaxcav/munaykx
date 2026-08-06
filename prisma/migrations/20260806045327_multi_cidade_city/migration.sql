-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "city" TEXT NOT NULL DEFAULT 'Brasília';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "city" TEXT NOT NULL DEFAULT 'Brasília';
