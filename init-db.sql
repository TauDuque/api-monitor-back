-- Inicialização do banco de dados API Monitor
-- Este script é executado automaticamente quando o container PostgreSQL é criado

-- Criar database se não existir (redundante, mas seguro)
SELECT 'CREATE DATABASE api_monitor'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'api_monitor')\gexec

-- Conectar ao database
\c api_monitor;

-- Criar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Configurações de performance para servidor pequeno
ALTER SYSTEM SET shared_buffers = '128MB';
ALTER SYSTEM SET effective_cache_size = '512MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Reload configuration
SELECT pg_reload_conf();

-- Log de inicialização
DO $$
BEGIN
    RAISE NOTICE 'API Monitor Database initialized successfully!';
    RAISE NOTICE 'Extensions created: uuid-ossp, pg_stat_statements';
    RAISE NOTICE 'Performance settings optimized for small server';
END $$;
