import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client"; // Importe o PrismaClient
import Redis from "ioredis"; // Importe o ioredis
import { createServer } from "http"; // Importe para criar o servidor HTTP
import { Server as SocketIOServer } from "socket.io"; // Importe o Socket.io Server
import monitoredUrlRoutes from "./routes/monitoredUrlRoutes"; // Importe as rotas
import checkRoutes from "./routes/checkRoutes"; // Importe as rotas de checks
import alertConfigRoutes from "./routes/alertConfigRoutes"; // Importe as rotas de configuração de alertas
import { checkQueue, setIoInstance } from "./queue/checkQueue"; // Importe a fila e setIoInstance
import { loadAndScheduleAllUrls } from "./services/schedulerService"; // Importe o scheduler
import { apiRateLimiter, urlCheckRateLimiter } from "./middleware/rateLimiter";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de CORS para permitir requisições do frontend
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://api-monitor-front.vercel.app",
      "https://*.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Crie um servidor HTTP a partir do app Express
const httpServer = createServer(app);

// Socket.io completamente desabilitado para economia máxima
const io = null;

// Otimização de custo: Pool de conexões ultra-limitado
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "?connection_limit=1&pool_timeout=30",
    },
  },
});
// Otimização de custo: Redis com configurações ultra-econômicas
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  connectTimeout: 15000,
  commandTimeout: 10000,
  enableReadyCheck: false,
});

redis.on("connect", () => {
  console.log("Connected to Redis!");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

app.use(express.json()); // Middleware para parsear JSON no corpo das requisições

// Otimização de custo: Rate limiting para reduzir carga
app.use(apiRateLimiter);

// Cache simples para reduzir requisições ao banco
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutos (cache mais longo)

// Sistema de hibernação para economizar recursos
let lastActivity = Date.now();
const HIBERNATION_TIMEOUT = 10 * 60 * 1000; // 10 minutos sem atividade

app.use((req, res, next) => {
  // Registrar atividade para hibernação
  lastActivity = Date.now();

  // Cache para GET requests
  if (req.method === "GET") {
    const cacheKey = req.originalUrl;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Interceptar resposta para cachear
    const originalJson = res.json;
    res.json = function (data) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      // Limpar cache antigo (manter apenas 20 entradas para economizar RAM)
      if (cache.size > 20) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return originalJson.call(this, data);
    };
  }

  next();
});

// Hibernação automática para economizar recursos
setInterval(() => {
  const timeSinceLastActivity = Date.now() - lastActivity;

  if (timeSinceLastActivity > HIBERNATION_TIMEOUT) {
    console.log("🔥 Sistema hibernando para economizar recursos...");
    // Limpar cache para liberar memória
    cache.clear();
    // Forçar garbage collection se disponível
    if (global.gc) {
      global.gc();
    }
  }
}, 60000); // Verificar a cada minuto

// Middleware para disponibilizar Prisma, Redis e IO nas requisições (útil para controllers)
app.use((req, res, next) => {
  (req as any).prisma = prisma;
  (req as any).redis = redis;
  (req as any).io = io; // Adicione o objeto io ao request (pode ser null em produção)
  next();
});

// Conexão e teste inicial (pode ser removido após a validação)
app.get("/", async (req, res) => {
  try {
    // Teste a conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      message: "Monitoring API is running and connected to DB!",
      status: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.error("Failed to connect to DB:", error);
    res.status(500).json({
      message: "Monitoring API is running but failed to connect to DB.",
      status: "unhealthy",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Use as rotas de URLs monitoradas
app.use("/api/monitored-urls", monitoredUrlRoutes);

// Use as rotas de checks e dados históricos
app.use("/api/checks", checkRoutes);

// Use as rotas de configuração de alertas
app.use("/api/alert-configurations", alertConfigRoutes);

// Health check simples
app.get("/health", (req, res) => {
  res.json({
    message: "API Monitor Backend",
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Socket.io completamente removido para economia máxima
console.log("🚀 Socket.io desabilitado para economia de recursos");

// Tratamento de erros genérico (Middleware de tratamento de erros)
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err.stack);
    console.error("Request URL:", req.url);
    console.error("Request Method:", req.method);

    res.status(500).json({
      error: "Internal Server Error",
      message: err.message || "Something went wrong",
      status: 500,
    });
  }
);

// Iniciar o servidor HTTP (agora usando httpServer.listen) e o scheduler
httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL via Prisma!");
    await loadAndScheduleAllUrls(); // Carrega e agenda URLs existentes
  } catch (error) {
    console.error("Failed to connect to DB or schedule URLs:", error);
  }
});

// Garanta que o PrismaClient se desconecte ao fechar a aplicação
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
