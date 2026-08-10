-- CreateTable
CREATE TABLE "excecoes_horario" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horario_recorrente_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "local_alterado" TEXT,
    "minuto_inicio_alterado" INTEGER,
    "observacao" TEXT,

    CONSTRAINT "excecoes_horario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "excecoes_horario_data_idx" ON "excecoes_horario"("data");

-- CreateIndex
CREATE UNIQUE INDEX "excecoes_horario_horario_recorrente_id_data_key" ON "excecoes_horario"("horario_recorrente_id", "data");

-- AddForeignKey
ALTER TABLE "excecoes_horario" ADD CONSTRAINT "excecoes_horario_horario_recorrente_id_fkey" FOREIGN KEY ("horario_recorrente_id") REFERENCES "horarios_recorrentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
