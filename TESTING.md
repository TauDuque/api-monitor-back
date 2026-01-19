# 🧪 Guia de Testes - API Monitor

## ⚠️ Importante: Antes de Testar

1. **Aplicar Migration do Prisma**:
   ```bash
   cd back
   npx prisma migrate deploy
   # OU em desenvolvimento:
   npx prisma migrate dev
   ```

2. **Gerar Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Configurar Variáveis de Ambiente**:
   - Copiar `.env.example` para `.env`
   - Configurar `JWT_SECRET` (mínimo 32 caracteres)
   - Configurar outras variáveis necessárias

## 📋 Testes Manuais

### 1. Teste de Autenticação

#### 1.1 Registro de Usuário
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SenhaForte123!",
    "name": "Test User"
  }'
```

**Resultado Esperado**: 
- Status 201
- Retorna `{ user: {...}, accessToken: "...", refreshToken: "..." }`

#### 1.2 Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SenhaForte123!"
  }'
```

**Resultado Esperado**: 
- Status 200
- Retorna `{ user: {...}, accessToken: "...", refreshToken: "..." }`

#### 1.3 Acesso com Token
```bash
curl -X GET http://localhost:3000/api/monitored-urls \
  -H "Authorization: Bearer <accessToken>"
```

**Resultado Esperado**: 
- Status 200
- Retorna array de URLs monitoradas (apenas do usuário autenticado)

#### 1.4 Token Expirado/Inválido
```bash
curl -X GET http://localhost:3000/api/monitored-urls \
  -H "Authorization: Bearer token_invalido"
```

**Resultado Esperado**: 
- Status 403 ou 401
- Retorna `{ error: "Token inválido" }` ou similar

#### 1.5 Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

**Resultado Esperado**: 
- Status 200
- Retorna `{ accessToken: "...", refreshToken: "..." }`

#### 1.6 Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

**Resultado Esperado**: 
- Status 200
- Retorna `{ message: "Logout realizado com sucesso" }`

### 2. Teste de Isolamento de Dados

#### 2.1 Criar 2 Usuários
```bash
# Usuário A
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "userA@test.com", "password": "SenhaForte123!", "name": "User A"}'

# Usuário B
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "userB@test.com", "password": "SenhaForte123!", "name": "User B"}'
```

#### 2.2 Usuário A cria URL
```bash
curl -X POST http://localhost:3000/api/monitored-urls \
  -H "Authorization: Bearer <tokenUserA>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api-a.com",
    "name": "API A",
    "interval": 300
  }'
```

#### 2.3 Usuário B tenta ver URLs
```bash
curl -X GET http://localhost:3000/api/monitored-urls \
  -H "Authorization: Bearer <tokenUserB>"
```

**Resultado Esperado**: 
- Status 200
- Array vazio ou URLs apenas do User B
- **NÃO deve incluir** URLs do User A

#### 2.4 Usuário B tenta acessar URL do User A
```bash
curl -X GET http://localhost:3000/api/monitored-urls/<idUrlUserA> \
  -H "Authorization: Bearer <tokenUserB>"
```

**Resultado Esperado**: 
- Status 404 ou 403
- `{ error: "URL not found" }` ou `{ error: "access denied" }`

### 3. Teste de Rate Limiting

#### 3.1 Rate Limiting no Login
```bash
# Fazer 6 tentativas de login em menos de 15 minutos
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
  echo ""
done
```

**Resultado Esperado**: 
- Primeiras 5 tentativas: Status 401 (credenciais inválidas)
- 6ª tentativa: Status 429 (Too Many Requests)
- Headers `X-RateLimit-*` presentes

### 4. Teste de Headers de Segurança

```bash
curl -I http://localhost:3000/health
```

**Resultado Esperado**: 
- Headers presentes:
  - `Strict-Transport-Security`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection`
  - `Referrer-Policy`
  - `Permissions-Policy`

### 5. Teste de CORS

```bash
curl -X OPTIONS http://localhost:3000/api/monitored-urls \
  -H "Origin: https://api-monitor-front.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization"
```

**Resultado Esperado**: 
- Status 204 (ou 200)
- Headers `Access-Control-Allow-*` presentes
- Origin permitido

## ✅ Checklist de Testes

- [ ] Registro de usuário funciona
- [ ] Login funciona
- [ ] Acesso com token funciona
- [ ] Token inválido retorna erro
- [ ] Token expirado retorna erro
- [ ] Refresh token funciona
- [ ] Logout funciona
- [ ] Isolamento de dados funciona (User A não vê dados de User B)
- [ ] Rate limiting funciona
- [ ] Headers de segurança estão presentes
- [ ] CORS configurado corretamente
- [ ] Validação de entrada funciona
- [ ] Logging de segurança está funcionando

## 🔍 Observações

1. **Prisma Client**: Os `@ts-ignore` são temporários. Após aplicar a migration e gerar o Prisma Client, esses avisos desaparecerão.

2. **Blacklist de Tokens**: A blacklist é verificada no Redis antes de validar tokens. Se Redis falhar, o sistema usa fail-open (permite requisição).

3. **Rate Limiting**: Para usuários autenticados, o rate limiting é por userId. Para não autenticados, é por IP.

4. **Logs de Segurança**: Verifique os logs do console para eventos de segurança. Eles são formatados em JSON com prefixo `[SECURITY]`.
