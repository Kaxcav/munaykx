-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "canceled_at" TIMESTAMP(3),
ADD COLUMN     "token" TEXT NOT NULL DEFAULT (gen_random_uuid())::text;

-- CreateIndex
CREATE UNIQUE INDEX "rsvps_token_key" ON "rsvps"("token");
