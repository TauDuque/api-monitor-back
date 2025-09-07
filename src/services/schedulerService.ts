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

  // Adiciona um novo job recorrente
  await checkQueue.add(
    { monitoredUrlId: url.id, url: url.url, timeout: 5000 }, // Dados do job
    {
      jobId: url.id, // Use o ID da URL como ID do job para fácil gerenciamento
      repeat: { every: url.interval * 1000 }, // Repetir a cada 'interval' segundos
      removeOnComplete: true, // Remove o job da fila após conclusão bem-sucedida
      removeOnFail: false, // Mantém o job na fila se falhar para depuração
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
