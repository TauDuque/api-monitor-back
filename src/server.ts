import express from "express";
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

// Crie um servidor HTTP a partir do app Express
const httpServer = createServer(app);

// Anexe o Socket.io ao servidor HTTP
// Configure o CORS para permitir conexões do seu frontend
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // URL do seu frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
  allowEIO3: true,
  path: "/socket.io/",
  serveClient: false,
});

// Otimização de custo: Pool de conexões limitado
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "?connection_limit=3&pool_timeout=20",
    },
  },
});
// Otimização de custo: Redis com configurações econômicas
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
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

// Middleware para disponibilizar Prisma, Redis e IO nas requisições (útil para controllers)
app.use((req, res, next) => {
  (req as any).prisma = prisma;
  (req as any).redis = redis;
  (req as any).io = io; // Adicione o objeto io ao request
  next();
});

// Conexão e teste inicial (pode ser removido após a validação)
app.get("/", async (req, res) => {
  try {
    // Teste a conexão com o banco de dados
    await prisma.$connect();
    res.send("Monitoring API is running and connected to DB!");
  } catch (error) {
    console.error("Failed to connect to DB:", error);
    res
      .status(500)
      .send("Monitoring API is running but failed to connect to DB.");
  } finally {
    await prisma.$disconnect(); // Desconecta após o teste
  }
});

// Use as rotas de URLs monitoradas
app.use("/api/monitored-urls", monitoredUrlRoutes);

// Use as rotas de checks e dados históricos
app.use("/api/checks", checkRoutes);

// Use as rotas de configuração de alertas
app.use("/api/alert-configurations", alertConfigRoutes);

// Health check específico para Socket.io
app.get("/socket.io/", (req, res) => {
  res.json({
    message: "Socket.io endpoint is available",
    status: "ready",
    transports: ["polling", "websocket"],
    path: "/socket.io/",
  });
});

// Debug endpoint para verificar configuração do Socket.io
app.get("/socket.io/debug", (req, res) => {
  res.json({
    message: "Socket.io debug info",
    server: "running",
    path: "/socket.io/",
    transports: ["polling", "websocket"],
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
    },
  });
});

// Passe a instância do io para a fila
setIoInstance(io);

// Eventos do Socket.io
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  // Você pode adicionar mais listeners aqui para comunicação cliente-servidor
  // Ex: socket.on('subscribeToUrl', (urlId) => { ... });
});

// Tratamento de erros genérico (Middleware de tratamento de erros)
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
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
