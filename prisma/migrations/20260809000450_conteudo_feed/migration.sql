-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "avisar_posts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultimo_aviso_post_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "community_id" TEXT NOT NULL,
    "autor_id" TEXT,
    "corpo" TEXT NOT NULL,
    "oculto_em" TIMESTAMP(3),
    "oculto_motivo" TEXT,
    "oculto_por" TEXT,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_community_id_created_at_idx" ON "posts"("community_id", "created_at");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
