-- CreateTable
CREATE TABLE "conteudo_site" (
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "versao_schema" INTEGER NOT NULL DEFAULT 1,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "atualizado_por" TEXT NOT NULL,

    CONSTRAINT "conteudo_site_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "conteudo_versoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "versao_schema" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por" TEXT NOT NULL,
    "publicado_em" TIMESTAMP(3),

    CONSTRAINT "conteudo_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conteudo_versoes_chave_criado_em_idx" ON "conteudo_versoes"("chave", "criado_em");
