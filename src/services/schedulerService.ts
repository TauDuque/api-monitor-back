// src/services/schedulerService.ts
import { checkQueue } from "../queue/checkQueue";
import { PrismaClient, MonitoredURL } from "@prisma/client";

const prisma = new PrismaClient();

// Função para adicionar um job recorrente para uma URL
export const scheduleUrlCheck = async (url: MonitoredURL) => {
  // Remove qualquer job recorrente existente para esta URL para evitar duplicatas
  await checkQueue.removeRepeatable({
    jobId: url.id,
    every: url.interval * 1000, // Intervalo em milissegundos
  });

  // Otimização de custo: Configurações ultra-econômicas
  await checkQueue.add(
    { monitoredUrlId: url.id, url: url.url, timeout: 2000 }, // Timeout ainda menor
    {
      jobId: url.id, // Use o ID da URL como ID do job para fácil gerenciamento
      repeat: { every: Math.max(url.interval * 1000, 300000) }, // Mínimo 5 minutos entre checks
      removeOnComplete: 2, // Mantém apenas 2 jobs completos
      removeOnFail: 1, // Mantém apenas 1 job falhado
      attempts: 1, // Apenas 1 tentativa para economizar CPU
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    }
  );
  console.log(
    `Scheduled check for URL: ${url.name} (${url.url}) every ${url.interval} seconds.`
  );
};

// Função para remover um job agendado (ex: quando a URL é desativada/deletada)
export const removeScheduledUrlCheck = async (url: MonitoredURL) => {
  await checkQueue.removeRepeatable({
    jobId: url.id,
    every: url.interval * 1000,
  });
  console.log(`Removed scheduled check for URL: ${url.name} (${url.url}).`);
};

// Função para carregar e agendar todos os jobs existentes no início da aplicação
export const loadAndScheduleAllUrls = async () => {
  const activeUrls = await prisma.monitoredURL.findMany({
    where: { active: true },
  });
  console.log(`Loading and scheduling ${activeUrls.length} active URLs...`);
  for (const url of activeUrls) {
    await scheduleUrlCheck(url);
  }
  console.log("All active URLs scheduled.");
};
