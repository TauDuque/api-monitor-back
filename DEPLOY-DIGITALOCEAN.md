# 🚀 Deploy da API Monitor no DigitalOcean

Este guia completo te ajudará a fazer o deploy da aplicação API Monitor no DigitalOcean usando Docker, com custo estimado de **$5-6/mês**.

## 📋 **Pré-requisitos**

- Conta no DigitalOcean (criação gratuita)
- Cartão de crédito para verificação
- Domínio (opcional, mas recomendado)
- Conhecimento básico de Linux

## 🎯 **Arquitetura da Solução**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Nginx         │    │   Backend       │
│   (Vercel)      │◄───┤   (Reverse      │◄───┤   (Node.js)     │
│                 │    │    Proxy)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   (Database)    │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Redis         │
                       │   (Cache/Queue) │
                       └─────────────────┘
```

## 🖥️ **1. Configuração do Servidor DigitalOcean**

### **1.1 Criar Droplet**

1. Acesse [DigitalOcean](https://digitalocean.com)
2. Clique em "Create" → "Droplets"
3. Configure:
   - **Imagem**: Ubuntu 22.04 LTS
   - **Plano**: Basic ($5/mês - 1GB RAM, 1 CPU, 25GB SSD)
   - **Região**: Escolha a mais próxima do Brasil (São Paulo)
   - **Autenticação**: SSH Key (recomendado) ou Password
   - **Hostname**: `api-monitor-server`

### **1.2 Conectar ao Servidor**

```bash
# Conectar via SSH
ssh root@SEU_IP_DO_SERVIDOR

# Ou se usar chave SSH
ssh -i ~/.ssh/sua_chave root@SEU_IP_DO_SERVIDOR
```

### **1.3 Atualizar Sistema**

```bash
# Atualizar pacotes
apt update && apt upgrade -y

# Instalar dependências básicas
apt install -y curl wget git unzip software-properties-common
```

## 🐳 **2. Instalação do Docker**

### **2.1 Instalar Docker**

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Adicionar usuário ao grupo docker
usermod -aG docker $USER

# Verificar instalação
docker --version
docker-compose --version
```

### **2.2 Instalar Docker Compose**

```bash
# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Dar permissão de execução
chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker-compose --version
```

## 🔧 **3. Configuração do Projeto**

### **3.1 Clonar Repositório**

```bash
# Criar diretório do projeto
mkdir -p /opt/api-monitor
cd /opt/api-monitor

# Clonar repositório
git clone https://github.com/SEU_USUARIO/api-monitor.git .

# Ou fazer upload dos arquivos via SCP
```

### **3.2 Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp env.production.example .env

# Editar variáveis
nano .env
```

**Configuração do .env:**

```env
# Database
DATABASE_URL="postgresql://api_monitor:senha_super_segura@postgres:5432/api_monitor?schema=public"

# Redis
REDIS_URL="redis://redis:6379"

# Frontend URL (Vercel)
FRONTEND_URL="https://api-monitor-front.vercel.app"

# Email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu_email@gmail.com"
SMTP_PASS="sua_senha_app"

# Nginx
NGINX_PORT="80"
NGINX_SSL_PORT="443"

# SSL (será configurado automaticamente)
SSL_EMAIL="seu_email@gmail.com"
DOMAIN="seu_dominio.com"
```

### **3.3 Configurar Firewall**

```bash
# Configurar UFW
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Verificar status
ufw status
```

## 🚀 **4. Deploy da Aplicação**

### **4.1 Deploy Automático**

```bash
# Tornar script executável
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

### **4.2 Deploy Manual**

```bash
# Parar containers existentes
docker-compose down

# Rebuild e iniciar
docker-compose up -d --build

# Verificar status
docker-compose ps
```

### **4.3 Verificar Logs**

```bash
# Logs gerais
docker-compose logs -f

# Logs específicos
docker-compose logs -f api
docker-compose logs -f nginx
```

## 🔒 **5. Configuração de SSL (Opcional)**

### **5.1 Configurar Domínio**

1. **Registrar domínio** (ex: GoDaddy, Namecheap)
2. **Configurar DNS**:
   - A record: `@` → IP do servidor
   - CNAME: `www` → `@`

### **5.2 Instalar Certificado SSL**

```bash
# Tornar script executável
chmod +x setup-ssl.sh

# Executar configuração SSL
./setup-ssl.sh
```

### **5.3 Verificar SSL**

```bash
# Testar certificado
curl -I https://seu_dominio.com

# Verificar renovação automática
crontab -l
```

## 📊 **6. Monitoramento e Manutenção**

### **6.1 Comandos Úteis**

```bash
# Status dos serviços
make status

# Reiniciar aplicação
make restart

# Ver logs em tempo real
make logs

# Backup do banco
make backup

# Atualizar aplicação
make update
```

### **6.2 Monitoramento de Recursos**

```bash
# Uso de CPU e RAM
htop

# Uso de disco
df -h

# Uso de memória
free -h

# Logs do sistema
journalctl -f
```

### **6.3 Backup Automático**

```bash
# Configurar backup diário
crontab -e

# Adicionar linha:
0 2 * * * /opt/api-monitor/backup.sh
```

## 🔧 **7. Troubleshooting**

### **7.1 Problemas Comuns**

**Container não inicia:**

```bash
# Verificar logs
docker-compose logs api

# Verificar configuração
docker-compose config
```

**Banco não conecta:**

```bash
# Verificar se PostgreSQL está rodando
docker-compose ps postgres

# Verificar logs do banco
docker-compose logs postgres
```

**Nginx não funciona:**

```bash
# Verificar configuração
nginx -t

# Reiniciar Nginx
docker-compose restart nginx
```

### **7.2 Logs Importantes**

```bash
# Logs da aplicação
tail -f /var/log/api-monitor/app.log

# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs do sistema
journalctl -u docker
```

## 💰 **8. Otimização de Custos**

### **8.1 Configurações de Economia**

- **Droplet**: $5/mês (1GB RAM, 1 CPU)
- **Backup**: $1/mês (opcional)
- **Domínio**: $10-15/ano (opcional)
- **Total**: ~$6-7/mês

### **8.2 Monitoramento de Uso**

```bash
# Verificar uso de recursos
docker stats

# Verificar uso de disco
du -sh /opt/api-monitor
```

## 🎯 **9. Próximos Passos**

### **9.1 Configuração Inicial**

1. **Acessar aplicação**: `http://SEU_IP` ou `https://seu_dominio.com`
2. **Configurar primeira URL** para monitoramento
3. **Testar notificações** por email
4. **Configurar webhooks** se necessário

### **9.2 Melhorias Futuras**

- **Monitoramento avançado** (Prometheus + Grafana)
- **Backup automático** para S3
- **CDN** para assets estáticos
- **Load balancer** para alta disponibilidade

## 📞 **10. Suporte**

### **10.1 Recursos Digitais**

- **Documentação DigitalOcean**: [docs.digitalocean.com](https://docs.digitalocean.com)
- **Comunidade**: [DigitalOcean Community](https://www.digitalocean.com/community)
- **Status**: [status.digitalocean.com](https://status.digitalocean.com)

### **10.2 Comandos de Emergência**

```bash
# Parar tudo
docker-compose down

# Reiniciar servidor
reboot

# Restaurar backup
./backup.sh restore
```

---

## ✅ **Checklist de Deploy**

- [ ] Servidor DigitalOcean criado
- [ ] Docker e Docker Compose instalados
- [ ] Projeto clonado e configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Firewall configurado
- [ ] Aplicação rodando
- [ ] SSL configurado (opcional)
- [ ] Backup configurado
- [ ] Monitoramento ativo

**🎉 Parabéns! Sua aplicação está rodando no DigitalOcean!**

---

_Última atualização: $(date)_
