# API Monitor - Backend

Sistema de monitoramento de APIs e websites com métricas em tempo real.

## Configuração Inicial

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar banco de dados PostgreSQL

Execute o Docker Compose para subir o PostgreSQL:

```bash
# Na raiz do projeto (api-monitor)
docker-compose up -d postgres
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (copie do env.example):

```bash
cp env.example .env
```

O arquivo `.env` deve conter:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/monitoringdb?schema=public&connection_limit=3"

# Server
PORT=3000

# Redis
REDIS_URL="redis://localhost:6379"
```

### 4. Configurar banco de dados

```bash
# Gerar e aplicar migrations
npx prisma migrate dev --name init_monitored_url

# Gerar cliente Prisma
npx prisma generate
```

### 5. Executar o servidor

```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm run build
npm start
```

## Estrutura do Projeto

- `src/server.ts` - Servidor Express principal
- `prisma/schema.prisma` - Schema do banco de dados
- `prisma/migrations/` - Migrations do banco

## Tecnologias

- Node.js + TypeScript
- Express.js
- PostgreSQL + Prisma ORM
- Redis (ioredis)
- Railway (deploy)
