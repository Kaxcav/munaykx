-- CreateTable
CREATE TABLE "resumos_semana" (
    "id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inicio" DATE NOT NULL,
    "texto" TEXT NOT NULL,
    "eventos" INTEGER NOT NULL,

    CONSTRAINT "resumos_semana_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resumos_semana_inicio_idx" ON "resumos_semana"("inicio");
