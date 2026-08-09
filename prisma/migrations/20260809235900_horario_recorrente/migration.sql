-- FASE 0 do mapa: o eixo de tempo.
--
-- ADITIVA POR CONSTRUÇÃO — e isto é o que a torna segura no deploy automático
-- do Railway (`migrate deploy` roda no boot, sem ninguém olhando):
--   · CREATE TABLE de uma tabela que não existe;
--   · dois índices e uma FK, todos dessa tabela nova;
--   · NENHUM ALTER em tabela existente, nenhum DROP, nenhum RENAME.
-- Nenhuma linha aqui consegue apagar ou reescrever dado de produção. O pior
-- caso possível é a tabela nascer vazia — que é exatamente como ela nasce.
--
-- Reverter é `DROP TABLE "horarios_recorrentes"`, e o site volta ao estado
-- anterior: sem horário estruturado, o mapa simplesmente não acende ninguém.

-- CreateTable
CREATE TABLE "horarios_recorrentes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "community_id" TEXT NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "minuto_inicio" INTEGER NOT NULL,
    "minuto_fim" INTEGER,
    "regiao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "horarios_recorrentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "horarios_recorrentes_dia_semana_minuto_inicio_idx" ON "horarios_recorrentes"("dia_semana", "minuto_inicio");

-- CreateIndex
CREATE INDEX "horarios_recorrentes_community_id_idx" ON "horarios_recorrentes"("community_id");

-- AddForeignKey
ALTER TABLE "horarios_recorrentes" ADD CONSTRAINT "horarios_recorrentes_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
