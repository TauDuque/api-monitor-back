import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client"; // Importe o PrismaClient
import Redis from "ioredis"; // Importe o ioredis
import { createServer } from "http"; // Importe para criar o servidor HTTP
import { Server as SocketIOServer } from "socket.io"; // Importe o Socket.io Server
import monitoredUrlRoutes from "./routes/monitoredUrlRoutes"; // Importe as rotas
import checkRoutes from "./routes/checkRoutes"; // Importe as rotas de checks
import { checkQueue, setIoInstance } from "./queue/checkQueue"; // Importe a fila e setIoInstance
import { loadAndScheduleAllUrls } from "./services/schedulerService"; // Importe o scheduler

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
  },
});

const prisma = new PrismaClient(); // Instancie o PrismaClient
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379"); // Conecta ao Redis

redis.on("connect", () => {
  console.log("Connected to Redis!");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

app.use(express.json()); // Middleware para parsear JSON no corpo das requisições

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
