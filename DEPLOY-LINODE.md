# 🚀 Deploy da API Monitor no Linode

Este guia te ajuda a fazer deploy da aplicação API Monitor em um servidor Linode de $5/mês.

## 📋 **Pré-requisitos**

- ✅ Servidor Linode (Nanode 1GB - $5/mês)
- ✅ Domínio próprio (opcional, para SSL)
- ✅ Conta de email (Gmail) para alertas

## 🖥️ **1. Configurar Servidor Linode**

### **1.1 Criar Servidor**

```bash
# No painel Linode:
# - Escolha: Nanode 1GB ($5/mês)
# - Imagem: Ubuntu 22.04 LTS
# - Região: Mais próxima de você
# - Root password: senha forte
```

### **1.2 Conectar via SSH**

```bash
ssh root@SEU_IP_AQUI
```

### **1.3 Atualizar Sistema**

```bash
apt update && apt upgrade -y
apt install -y curl wget git nano htop
```

### **1.4 Instalar Docker**

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version
```

## 📁 **2. Deploy da Aplicação**

### **2.1 Clonar Repositório**

```bash
git clone https://github.com/SEU_USUARIO/api-monitor-back.git
cd api-monitor-back
git checkout deploy/linode-docker
```

### **2.2 Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env

# Editar configurações
nano .env
```

**Configurações importantes no `.env`:**

```bash
# Senha segura para o banco
DB_PASSWORD=sua_senha_super_segura_123

# IP do seu servidor (ou domínio)
FRONTEND_URL=http://SEU_IP_AQUI

# Email para alertas (Gmail)
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=sua_senha_de_app_gmail
EMAIL_FROM="API Monitor <seuemail@gmail.com>"
```

### **2.3 Executar Deploy**

```bash
# Dar permissões aos scripts
chmod +x *.sh

# Executar deploy
./deploy.sh
```

### **2.4 Verificar Deploy**

```bash
# Ver status dos containers
docker-compose ps

# Ver logs
docker-compose logs -f

# Testar aplicação
curl http://localhost/health
```

## 🌐 **3. Configurar Acesso Externo**

### **3.1 Configurar Firewall**

```bash
# Instalar UFW
apt install -y ufw

# Configurar regras
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Verificar status
ufw status
```

### **3.2 Testar Acesso**

```bash
# Descobrir seu IP público
curl ifconfig.me

# Testar no navegador
# http://SEU_IP_AQUI/health
```

## 🔒 **4. Configurar SSL (Opcional)**

### **4.1 Configurar Domínio**

```bash
# No seu provedor de domínio, adicione:
# Tipo A: @ -> SEU_IP_AQUI
# Tipo A: www -> SEU_IP_AQUI
```

### **4.2 Instalar SSL**

```bash
./setup-ssl.sh seu-dominio.com
```

## 📊 **5. Comandos Úteis**

### **5.1 Usando Makefile**

```bash
make help          # Ver todos os comandos
make logs          # Ver logs em tempo real
make backup        # Fazer backup do banco
make restart       # Reiniciar aplicação
make status        # Ver status dos serviços
```

### **5.2 Comandos Docker**

```bash
# Ver containers rodando
docker-compose ps

# Ver logs específicos
docker-compose logs api
docker-compose logs postgres
docker-compose logs nginx

# Reiniciar serviço específico
docker-compose restart api

# Entrar no container
docker-compose exec api /bin/sh
docker-compose exec postgres psql -U postgres -d api_monitor
```

## 🔧 **6. Manutenção**

### **6.1 Backup Automático**

```bash
# Fazer backup manual
./backup.sh

# Configurar backup automático (diário às 2h)
crontab -e
# Adicionar linha:
0 2 * * * cd /root/api-monitor-back && ./backup.sh
```

### **6.2 Monitoramento**

```bash
# Ver uso de recursos
htop
docker stats

# Ver logs do sistema
journalctl -f

# Ver espaço em disco
df -h
```

### **6.3 Atualizações**

```bash
# Atualizar código
git pull origin main
make rebuild

# Atualizar sistema
apt update && apt upgrade -y
```

## 🆘 **7. Troubleshooting**

### **7.1 Aplicação não inicia**

```bash
# Ver logs detalhados
docker-compose logs --tail=100

# Verificar se portas estão livres
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# Reiniciar tudo
docker-compose down
docker-compose up -d
```

### **7.2 Banco de dados com problemas**

```bash
# Conectar ao PostgreSQL
docker-compose exec postgres psql -U postgres -d api_monitor

# Verificar tabelas
\dt

# Ver migrações
SELECT * FROM _prisma_migrations;
```

### **7.3 Pouco espaço em disco**

```bash
# Limpar Docker
make clean

# Limpar logs antigos
docker-compose exec api sh -c "rm -rf logs/*.log"

# Ver uso de espaço
du -sh /var/lib/docker/
```

## 💰 **8. Otimização de Custos**

### **8.1 Configurações Econômicas**

```bash
# No arquivo .env:
MAX_CONCURRENT_CHECKS=2
DEFAULT_CHECK_INTERVAL=900  # 15 minutos
MAX_RETRY_ATTEMPTS=1
```

### **8.2 Monitorar Uso**

```bash
# Ver uso de CPU/RAM
htop

# Ver uso de rede
iftop

# Ver uso de disco
df -h
```

## 🎉 **Pronto!**

Sua aplicação está rodando no Linode por apenas **$5/mês**!

- 🌐 **URL**: http://SEU_IP_AQUI (ou https://seu-dominio.com)
- 📊 **Health**: http://SEU_IP_AQUI/health
- 🔧 **Logs**: `make logs`
- 💾 **Backup**: `make backup`

### **Próximos Passos:**

1. Testar todas as funcionalidades
2. Configurar monitoramento de algumas URLs
3. Testar alertas por email
4. Fazer backup regular
5. Documentar no seu portfólio! 🚀
