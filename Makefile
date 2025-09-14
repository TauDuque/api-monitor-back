# API Monitor - Makefile para comandos rápidos (DigitalOcean)
# Use: make help para ver todos os comandos

.PHONY: help deploy start stop restart logs backup ssl clean test dev

# Cores para output
YELLOW=\033[1;33m
GREEN=\033[0;32m
RED=\033[0;31m
BLUE=\033[0;34m
NC=\033[0m # No Color

help: ## Mostra esta ajuda
	@echo -e "$(BLUE)API Monitor - Comandos Disponíveis:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(YELLOW)Exemplos:$(NC)"
	@echo "  make deploy          # Deploy completo"
	@echo "  make logs            # Ver logs em tempo real"
	@echo "  make backup          # Fazer backup do banco"
	@echo "  make ssl DOMAIN=meusite.com  # Configurar SSL"

deploy: ## Deploy completo da aplicação
	@echo -e "$(BLUE)🚀 Iniciando deploy...$(NC)"
	@chmod +x deploy.sh backup.sh setup-ssl.sh
	@./deploy.sh

start: ## Iniciar todos os serviços
	@echo -e "$(GREEN)▶️  Iniciando serviços...$(NC)"
	@docker-compose up -d

stop: ## Parar todos os serviços
	@echo -e "$(YELLOW)⏹️  Parando serviços...$(NC)"
	@docker-compose down

restart: ## Reiniciar todos os serviços
	@echo -e "$(BLUE)🔄 Reiniciando serviços...$(NC)"
	@docker-compose restart

logs: ## Ver logs em tempo real
	@echo -e "$(GREEN)📋 Logs em tempo real (Ctrl+C para sair):$(NC)"
	@docker-compose logs -f

status: ## Verificar status dos serviços
	@echo -e "$(BLUE)📊 Status dos serviços:$(NC)"
	@docker-compose ps
	@echo ""
	@echo -e "$(BLUE)🔍 Health checks:$(NC)"
	@curl -s http://localhost/health | jq . || echo "Endpoint /health não disponível"

backup: ## Fazer backup do banco de dados
	@echo -e "$(GREEN)🗄️  Fazendo backup...$(NC)"
	@chmod +x backup.sh
	@./backup.sh

ssl: ## Configurar SSL (use: make ssl DOMAIN=meusite.com)
	@if [ -z "$(DOMAIN)" ]; then \
		echo -e "$(RED)❌ Erro: DOMAIN não informado$(NC)"; \
		echo -e "$(YELLOW)Uso: make ssl DOMAIN=meusite.com$(NC)"; \
		exit 1; \
	fi
	@echo -e "$(BLUE)🔒 Configurando SSL para $(DOMAIN)...$(NC)"
	@chmod +x setup-ssl.sh
	@./setup-ssl.sh $(DOMAIN)

clean: ## Limpar containers, imagens e volumes não utilizados
	@echo -e "$(YELLOW)🧹 Limpando sistema Docker...$(NC)"
	@docker system prune -af
	@docker volume prune -f

rebuild: ## Rebuild completo (limpa cache)
	@echo -e "$(BLUE)🔨 Rebuild completo...$(NC)"
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d

dev: ## Rodar em modo desenvolvimento (com hot reload)
	@echo -e "$(GREEN)🛠️  Iniciando modo desenvolvimento...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

test: ## Executar testes (quando implementados)
	@echo -e "$(BLUE)🧪 Executando testes...$(NC)"
	@docker-compose exec api npm test || echo "Testes não implementados ainda"

migrate: ## Executar migrações do banco
	@echo -e "$(BLUE)🗃️  Executando migrações...$(NC)"
	@docker-compose exec api npx prisma migrate deploy

seed: ## Popular banco com dados de teste
	@echo -e "$(GREEN)🌱 Populando banco com dados de teste...$(NC)"
	@docker-compose exec api npx prisma db seed || echo "Seed não implementado ainda"

shell: ## Abrir shell no container da API
	@echo -e "$(GREEN)🐚 Abrindo shell no container...$(NC)"
	@docker-compose exec api /bin/sh

db-shell: ## Conectar ao PostgreSQL
	@echo -e "$(BLUE)🗃️  Conectando ao PostgreSQL...$(NC)"
	@docker-compose exec postgres psql -U postgres -d api_monitor

redis-shell: ## Conectar ao Redis
	@echo -e "$(RED)📮 Conectando ao Redis...$(NC)"
	@docker-compose exec redis redis-cli

update: ## Atualizar aplicação (git pull + rebuild)
	@echo -e "$(BLUE)🔄 Atualizando aplicação...$(NC)"
	@git pull origin main
	@make rebuild

# Comando padrão
.DEFAULT_GOAL := help
