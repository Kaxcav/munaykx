-- STORY-011 · Perfil do usuário, tags de interesse e consentimento granular
-- (briefing do PO de 07/08/2026, itens 8, 10 e 11).
--
-- Escrita À MÃO, no padrão que o Prisma geraria: o schema-engine não roda no
-- sandbox (binaries.prisma.sh bloqueado), então `migrate dev` não produz o
-- arquivo. Conferida campo a campo contra o `schema.prisma`.
--
-- Toda coluna é NULLable e nenhuma tem NOT NULL sem DEFAULT — a tabela
-- `users` já tem linhas em produção, e ALTER com NOT NULL sem default
-- falharia o deploy no meio do pre-deploy do Railway.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "nascimento" DATE,
ADD COLUMN     "genero" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "uf" CHAR(2),
ADD COLUMN     "cep" VARCHAR(9),
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "apelido" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "foto_url" TEXT,
ADD COLUMN     "perfil_publico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "respostas" JSONB,
ADD COLUMN     "consentiu_cadastro" TIMESTAMP(3),
ADD COLUMN     "consentiu_recomendacao" TIMESTAMP(3),
ADD COLUMN     "consentiu_insights" TIMESTAMP(3),
ADD COLUMN     "politica_versao" TEXT;

-- Não há índice nenhum aqui de propósito: a coluna `cpf` (com o único que ela
-- exigia) foi removida desta migração em 07/08/2026, antes de qualquer commit
-- e antes de produção. Racional completo no `schema.prisma`.
