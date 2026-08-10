-- AlterTable
ALTER TABLE "events" ADD COLUMN     "horario_recorrente_id" TEXT;

-- CreateIndex
CREATE INDEX "events_horario_recorrente_id_idx" ON "events"("horario_recorrente_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_horario_recorrente_id_fkey" FOREIGN KEY ("horario_recorrente_id") REFERENCES "horarios_recorrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
