# Migration: Add Users and Authentication

## ⚠️ Importante: Migração de Dados Existentes

Esta migration adiciona o sistema de autenticação multi-tenant. Se você tiver dados existentes na tabela `MonitoredURL`, será necessário migrar esses dados antes de tornar a coluna `userId` obrigatória.

## Passos para Aplicar a Migration

### 1. Se você NÃO tem dados existentes:
```bash
cd back
npx prisma migrate deploy
```

### 2. Se você TEM dados existentes:

#### Opção A: Criar um usuário padrão e associar todos os registros
```sql
-- 1. Aplicar a migration (userId será nullable temporariamente)
-- 2. Criar um usuário padrão para dados existentes
INSERT INTO "User" (id, email, password, name, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'migrated@example.com',
  '$2a$10$temporary.password.hash',
  'Migrated User',
  NOW(),
  NOW()
);

-- 3. Associar todos os MonitoredURL existentes ao usuário padrão
UPDATE "MonitoredURL"
SET "userId" = '00000000-0000-0000-0000-000000000000'
WHERE "userId" IS NULL;

-- 4. Tornar userId obrigatório
ALTER TABLE "MonitoredURL" ALTER COLUMN "userId" SET NOT NULL;
```

#### Opção B: Deletar dados existentes (se não forem necessários)
```sql
-- Deletar todos os dados existentes
DELETE FROM "URLCheck";
DELETE FROM "Incident";
DELETE FROM "AlertConfiguration";
DELETE FROM "MonitoredURL";

-- Aplicar migration normalmente
```

## Estrutura Adicionada

- **Tabela User**: Usuários do sistema
- **Tabela RefreshToken**: Tokens de refresh para autenticação JWT
- **Campo userId em MonitoredURL**: Para isolamento multi-tenant
- **Índices**: Para otimização de queries
- **Constraints**: Unique constraint em (userId, url) para evitar URLs duplicadas por usuário

## Rollback

Se precisar fazer rollback:
```sql
-- Remover foreign keys
ALTER TABLE "MonitoredURL" DROP CONSTRAINT IF EXISTS "MonitoredURL_userId_fkey";
ALTER TABLE "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";

-- Remover coluna
ALTER TABLE "MonitoredURL" DROP COLUMN IF EXISTS "userId";

-- Restaurar unique constraint original
CREATE UNIQUE INDEX "MonitoredURL_url_key" ON "public"."MonitoredURL"("url");

-- Deletar tabelas
DROP TABLE IF EXISTS "RefreshToken";
DROP TABLE IF EXISTS "User";
```
