-- CreateTable
CREATE TABLE "busca_registros" (
    "id" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "texto" TEXT NOT NULL,
    "modalidade" TEXT,
    "regiao" TEXT,
    "teve_resultado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "busca_registros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "busca_registros_dia_idx" ON "busca_registros"("dia");
