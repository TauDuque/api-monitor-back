import { PrismaClient, MonitoredURL, URLCheck } from "@prisma/client";

const prisma = new PrismaClient();

export const createMonitoredURL = async (data: {
  url: string;
  name: string;
  interval: number;
}): Promise<MonitoredURL> => {
  return prisma.monitoredURL.create({ data });
};

export const getAllMonitoredURLs = async (): Promise<MonitoredURL[]> => {
  return prisma.monitoredURL.findMany();
};

export const getMonitoredURLById = async (
  id: string
): Promise<MonitoredURL | null> => {
  return prisma.monitoredURL.findUnique({ where: { id } });
};

export const updateMonitoredURL = async (
  id: string,
  data: Partial<MonitoredURL>
): Promise<MonitoredURL> => {
  return prisma.monitoredURL.update({ where: { id }, data });
};

export const deleteMonitoredURL = async (id: string): Promise<MonitoredURL> => {
  return prisma.monitoredURL.delete({ where: { id } });
};

// Função para buscar o histórico de checks de uma URL
export const getUrlChecksHistory = async (
  monitoredUrlId: string,
  startDate?: Date,
  endDate?: Date,
  take?: number, // Para paginação/limite
  skip?: number // Para paginação
): Promise<URLCheck[]> => {
  const where: any = {
    monitoredUrlId: monitoredUrlId,
  };

  if (startDate && endDate) {
    where.checkedAt = {
      gte: startDate, // Greater than or equal
      lte: endDate, // Less than or equal
    };
  } else if (startDate) {
    where.checkedAt = { gte: startDate };
  } else if (endDate) {
    where.checkedAt = { lte: endDate };
  }

  return prisma.uRLCheck.findMany({
    where,
    orderBy: {
      checkedAt: "desc", // Ordena do mais recente para o mais antigo
    },
    take, // Limite de resultados
    skip, // Offset para paginação
  });
};

// Função para obter o último status de cada URL (para o dashboard principal)
export const getLastCheckStatusForAllUrls = async (): Promise<any[]> => {
  // Query SQL raw para obter o último check de cada URL de forma eficiente
  const latestChecks = await prisma.$queryRaw`
    SELECT DISTINCT ON ("monitoredUrlId")
      "monitoredUrlId", status, "responseTime", "isOnline", "checkedAt"
    FROM "URLCheck"
    ORDER BY "monitoredUrlId", "checkedAt" DESC;
  `;
  return latestChecks;
};

// Função para obter métricas de uptime agregadas por período
export const getUptimeMetrics = async (
  monitoredUrlId: string,
  period: "hour" | "day" | "week" | "month",
  startDate: Date,
  endDate: Date
): Promise<any[]> => {
  // Query SQL raw para agregação de uptime por período
  const rawQuery = `
    SELECT
      date_trunc($1, "checkedAt") as period_start,
      COUNT(*) as total_checks,
      SUM(CASE WHEN "isOnline" = TRUE THEN 1 ELSE 0 END) as online_checks,
      (SUM(CASE WHEN "isOnline" = TRUE THEN 1 ELSE 0 END)::numeric * 100 / COUNT(*)) as uptime_percentage
    FROM "URLCheck"
    WHERE "monitoredUrlId" = $2 AND "checkedAt" BETWEEN $3 AND $4
    GROUP BY period_start
    ORDER BY period_start ASC;
  `;

  const result = await prisma.$queryRawUnsafe(
    rawQuery,
    period,
    monitoredUrlId,
    startDate,
    endDate
  );
  return result;
};
