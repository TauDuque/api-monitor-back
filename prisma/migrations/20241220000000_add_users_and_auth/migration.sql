-- CreateTable: User
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RefreshToken
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: User email (unique)
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex: User email (for queries)
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex: RefreshToken userId
CREATE INDEX "RefreshToken_userId_idx" ON "public"."RefreshToken"("userId");

-- CreateIndex: RefreshToken token (unique)
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "public"."RefreshToken"("token");

-- CreateIndex: RefreshToken token (for queries)
CREATE INDEX "RefreshToken_token_idx" ON "public"."RefreshToken"("token");

-- AddColumn: Add userId to MonitoredURL (nullable first for existing data)
ALTER TABLE "public"."MonitoredURL" ADD COLUMN "userId" TEXT;

-- NOTE: Se houver dados existentes, você precisa:
-- 1. Criar um usuário padrão ou migrar dados existentes
-- 2. Popular a coluna userId para todos os registros existentes
-- 3. Depois executar o comando abaixo para tornar NOT NULL

-- Se não houver dados existentes, pode executar diretamente:
-- ALTER TABLE "public"."MonitoredURL" ALTER COLUMN "userId" SET NOT NULL;

-- DropIndex: Remove unique constraint on url (will be replaced by composite)
DROP INDEX IF EXISTS "public"."MonitoredURL_url_key";

-- CreateIndex: MonitoredURL userId (for queries)
CREATE INDEX "MonitoredURL_userId_idx" ON "public"."MonitoredURL"("userId");

-- CreateIndex: MonitoredURL composite unique (userId + url)
CREATE UNIQUE INDEX "MonitoredURL_userId_url_key" ON "public"."MonitoredURL"("userId", "url");

-- AddForeignKey: RefreshToken -> User
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: MonitoredURL -> User (nullable first, will be NOT NULL after data migration)
ALTER TABLE "public"."MonitoredURL" ADD CONSTRAINT "MonitoredURL_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
