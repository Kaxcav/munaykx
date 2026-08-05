-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('confirmado', 'lista_espera');

-- CreateTable
CREATE TABLE "rsvps" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT,
    "status" "RsvpStatus" NOT NULL DEFAULT 'confirmado',

    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rsvps_event_id_idx" ON "rsvps"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "rsvps_event_id_email_key" ON "rsvps"("event_id", "email");

-- AddForeignKey
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
