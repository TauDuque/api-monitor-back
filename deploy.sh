#!/bin/bash

# API Monitor - Deploy Script para Linode
# Este script automatiza o deploy da aplicação

set -e

echo "🚀 Iniciando deploy da API Monitor..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado. Instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
    error "Docker Compose não está instalado. Instale o Docker Compose primeiro."
    exit 1
fi

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    warn "Arquivo .env não encontrado. Copiando do exemplo..."
    cp env.production.example .env
    warn "Por favor, edite o arquivo .env com suas configurações antes de continuar."
    echo -e "${BLUE}Exemplo: nano .env${NC}"
    exit 1
fi

# Criar diretórios necessários
log "Criando diretórios necessários..."
mkdir -p logs ssl

# Parar containers existentes
log "Parando containers existentes..."
docker-compose down || true

# Remover containers antigos
log "Removendo containers antigos..."
docker system prune -f

# Build e start dos containers
log "Fazendo build e iniciando containers..."
docker-compose up --build -d

# Aguardar serviços ficarem saudáveis
log "Aguardando serviços ficarem saudáveis..."
sleep 30

# Verificar status dos containers
log "Verificando status dos containers..."
docker-compose ps

# Verificar logs para erros
log "Verificando logs dos últimos 20 segundos..."
docker-compose logs --tail=50

# Testar endpoint de saúde
log "Testando endpoint de saúde..."
sleep 10

if curl -f http://localhost/health > /dev/null 2>&1; then
    log "✅ Deploy realizado com sucesso!"
    log "🌐 Aplicação disponível em: http://$(curl -s ifconfig.me)"
    log "📊 Logs: docker-compose logs -f"
    log "🔧 Parar: docker-compose down"
else
    error "❌ Falha no deploy. Verificar logs:"
    docker-compose logs --tail=20
    exit 1
fi

echo
log "🎉 Deploy concluído!"
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Configure SSL: ./setup-ssl.sh your-domain.com"
echo "2. Configure backup: ./backup.sh"
echo "3. Monitor logs: docker-compose logs -f"
