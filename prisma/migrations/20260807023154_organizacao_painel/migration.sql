-- CreateEnum
CREATE TYPE "StatusPublicacao" AS ENUM ('pendente', 'aprovada', 'recusada');
-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "autorizacao_em" TIMESTAMP(3),
ADD COLUMN     "autorizacao_texto" TEXT,
ADD COLUMN     "codigo_convite" TEXT,
ADD COLUMN     "organization_id" TEXT,
ADD COLUMN     "status_publicacao" "StatusPublicacao" NOT NULL DEFAULT 'aprovada';
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "cancelado_em" TIMESTAMP(3);
-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "checkin_em" TIMESTAMP(3);
-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "organization_invites" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "aceito_em" TIMESTAMP(3),
    "convidado_por_id" TEXT,
    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");
-- CreateIndex
CREATE UNIQUE INDEX "organization_members_user_id_organization_id_key" ON "organization_members"("user_id", "organization_id");
-- CreateIndex
CREATE UNIQUE INDEX "organization_invites_token_key" ON "organization_invites"("token");
-- CreateIndex
CREATE INDEX "organization_invites_organization_id_idx" ON "organization_invites"("organization_id");
-- CreateIndex
CREATE UNIQUE INDEX "organization_invites_organization_id_email_key" ON "organization_invites"("organization_id", "email");
-- CreateIndex
CREATE INDEX "memberships_community_id_idx" ON "memberships"("community_id");
-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_community_id_key" ON "memberships"("user_id", "community_id");
-- CreateIndex
CREATE UNIQUE INDEX "communities_codigo_convite_key" ON "communities"("codigo_convite");
-- CreateIndex
CREATE INDEX "communities_organization_id_idx" ON "communities"("organization_id");
-- CreateIndex
CREATE INDEX "communities_status_publicacao_idx" ON "communities"("status_publicacao");
-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
