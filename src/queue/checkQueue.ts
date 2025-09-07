// src/queue/checkQueue.ts
import Queue from "bull";
import { PrismaClient } from "@prisma/client";
import { performUrlCheck } from "../services/checkService";
import { Server as SocketIOServer } from "socket.io"; // Importe o tipo Socket.io Server

const prisma = new PrismaClient();

// A fila agora aceitará uma instância de Socket.io
let ioInstance: SocketIOServer | null = null;

export const setIoInstance = (io: SocketIOServer) => {
  ioInstance = io;
};

// Crie uma fila para os checks de URL
// Use a URL do Redis das variáveis de ambiente
export const checkQueue = new Queue(
  "url-checks",
  process.env.REDIS_URL || "redis://localhost:6379"
);

// Processador de jobs: o que acontece quando um job é retirado da fila
checkQueue.process(async (job) => {
  const { monitoredUrlId, url, timeout } = job.data;
  console.log(`Processing check for URL ID: ${monitoredUrlId}, URL: ${url}`);

  const result = await performUrlCheck(url, timeout);

  // Salve o resultado do check no banco de dados
  try {
    const newCheck = await prisma.uRLCheck.create({
      data: {
        monitoredUrlId,
        status: result.status,
        responseTime: result.responseTime,
        isOnline: result.isOnline,
        // Você pode adicionar o campo 'error' aqui se quiser persistir
      },
    });
    console.log(
      `Check for ${url} completed: Status ${result.status}, Online: ${result.isOnline}`
    );

    // **Broadcast da atualização via Socket.io**
    if (ioInstance) {
      // Emite para todos os clientes conectados
      ioInstance.emit("urlStatusUpdate", {
        monitoredUrlId: newCheck.monitoredUrlId,
        status: newCheck.status,
        responseTime: newCheck.responseTime,
        isOnline: newCheck.isOnline,
        checkedAt: newCheck.checkedAt,
      });
      console.log(`Emitted 'urlStatusUpdate' for ${newCheck.monitoredUrlId}`);
    }
  } catch (dbError: any) {
    console.error(`Failed to save check result for ${url}:`, dbError);
    // Opcional: Re-lançar o erro para que o Bull possa tentar novamente ou marcar como falha
    throw dbError;
  }
});

// Opcional: Adicionar listeners para eventos da fila (para depuração e monitoramento)
checkQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed for ${job.data.url}`);
});

checkQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed for ${job.data.url}:`, err.message);
});
