#!/bin/bash

# API Monitor - Script de Backup
# Faz backup do banco PostgreSQL e dados do Redis

set -e

# Configurações
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="api-monitor-db"
REDIS_CONTAINER="api-monitor-redis"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Criar diretório de backup
mkdir -p $BACKUP_DIR

log "🗄️  Iniciando backup da API Monitor..."

# Backup do PostgreSQL
log "Fazendo backup do PostgreSQL..."
if docker exec $DB_CONTAINER pg_dump -U postgres api_monitor > "$BACKUP_DIR/postgres_backup_$DATE.sql"; then
    log "✅ Backup PostgreSQL criado: postgres_backup_$DATE.sql"
else
    error "❌ Falha no backup do PostgreSQL"
    exit 1
fi

# Backup do Redis
log "Fazendo backup do Redis..."
if docker exec $REDIS_CONTAINER redis-cli BGSAVE; then
    # Aguardar o BGSAVE completar
    sleep 5
    docker cp $REDIS_CONTAINER:/data/dump.rdb "$BACKUP_DIR/redis_backup_$DATE.rdb"
    log "✅ Backup Redis criado: redis_backup_$DATE.rdb"
else
    warn "⚠️  Falha no backup do Redis (não crítico)"
fi

# Compactar backups
log "Compactando backups..."
tar -czf "$BACKUP_DIR/api_monitor_backup_$DATE.tar.gz" -C "$BACKUP_DIR" \
    "postgres_backup_$DATE.sql" "redis_backup_$DATE.rdb" 2>/dev/null || \
tar -czf "$BACKUP_DIR/api_monitor_backup_$DATE.tar.gz" -C "$BACKUP_DIR" \
    "postgres_backup_$DATE.sql"

# Limpar arquivos individuais
rm -f "$BACKUP_DIR/postgres_backup_$DATE.sql" "$BACKUP_DIR/redis_backup_$DATE.rdb" 2>/dev/null || true

# Limpar backups antigos (manter apenas os 7 mais recentes)
log "Limpando backups antigos..."
cd $BACKUP_DIR
ls -t api_monitor_backup_*.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null || true

log "🎉 Backup concluído!"
log "📁 Arquivo: $BACKUP_DIR/api_monitor_backup_$DATE.tar.gz"
log "📊 Tamanho: $(du -h "$BACKUP_DIR/api_monitor_backup_$DATE.tar.gz" | cut -f1)"

# Mostrar backups disponíveis
echo
log "📋 Backups disponíveis:"
ls -lh $BACKUP_DIR/api_monitor_backup_*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"
