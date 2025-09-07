// src/queue/checkQueue.ts
import Queue from "bull";
import { PrismaClient, MonitoredURL, URLCheck, Incident } from "@prisma/client";
import { performUrlCheck } from "../services/checkService";
import { Server as SocketIOServer } from "socket.io"; // Importe o tipo Socket.io Server
import { sendAlertNotification } from "../services/alertService"; // Importe o novo serviço de alerta

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
        status: result.status ?? 0, // Default to 0 if null
        responseTime: result.responseTime ?? 0, // Default to 0 if null
        isOnline: result.isOnline,
        // Você pode adicionar o campo 'error' aqui se quiser persistir
      },
    });
    console.log(
      `Check for ${url} completed: Status ${result.status}, Online: ${result.isOnline}`
    );

    // **Lógica de Detecção de Incidentes**
    const previousCheck = await prisma.uRLCheck.findFirst({
      where: {
        monitoredUrlId: monitoredUrlId,
        id: { not: newCheck.id }, // Exclui o check atual
      },
      orderBy: { checkedAt: "desc" },
    });

    const monitoredUrl = await prisma.monitoredURL.findUnique({
      where: { id: monitoredUrlId },
      include: { alertConfigurations: true }, // Inclua as configurações de alerta
    });

    if (!monitoredUrl) {
      console.error(`Monitored URL with ID ${monitoredUrlId} not found.`);
      return;
    }

    // Detectar DOWN
    if (
      newCheck.isOnline === false &&
      (previousCheck?.isOnline === true || !previousCheck)
    ) {
      // URL acabou de ficar offline ou é o primeiro check e já está offline
      const incident = await prisma.incident.create({
        data: {
          monitoredUrlId: monitoredUrlId,
          type: "DOWN",
          description: `URL ${monitoredUrl.name} (${monitoredUrl.url}) está offline. Status: ${newCheck.status}.`,
          startedAt: newCheck.checkedAt,
        },
      });
      console.log(`INCIDENT: URL ${monitoredUrl.name} is DOWN!`);
      // Enviar alerta
      await sendAlertNotification(monitoredUrl, incident);
    }
    // Detectar UP (resolução de incidente)
    else if (newCheck.isOnline === true && previousCheck?.isOnline === false) {
      // URL acabou de voltar a ficar online
      const lastDownIncident = await prisma.incident.findFirst({
        where: {
          monitoredUrlId: monitoredUrlId,
          type: "DOWN",
          resolvedAt: null, // Incidente ainda aberto
        },
        orderBy: { startedAt: "desc" },
      });

      if (lastDownIncident) {
        const resolvedIncident = await prisma.incident.update({
          where: { id: lastDownIncident.id },
          data: { resolvedAt: newCheck.checkedAt },
        });
        console.log(`INCIDENT: URL ${monitoredUrl.name} is UP again!`);
        // Enviar alerta de resolução
        await sendAlertNotification(monitoredUrl, resolvedIncident, true); // true para indicar resolução
      }
    }
    // Opcional: Detectar SLOW_RESPONSE (se o tempo de resposta exceder um limite)
    // Isso exigiria uma configuração de limite no modelo MonitoredURL ou AlertConfiguration

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
