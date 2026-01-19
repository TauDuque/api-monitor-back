import { PrismaClient, MonitoredURL, URLCheck } from "@prisma/client";

const prisma = new PrismaClient();

export const createMonitoredURL = async (data: {
  url: string;
  name: string;
  interval: number;
  userId?: string; // Novo parâmetro opcional para multi-tenant
}): Promise<MonitoredURL> => {
  return prisma.monitoredURL.create({ data });
};

export const getAllMonitoredURLs = async (userId?: string): Promise<MonitoredURL[]> => {
  // Se userId fornecido, filtrar por usuário (multi-tenant)
  if (userId) {
    return prisma.monitoredURL.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
  // Comportamento original (sem filtro) - para retrocompatibilidade
  return prisma.monitoredURL.findMany();
};

export const getMonitoredURLById = async (
  id: string,
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<MonitoredURL | null> => {
  // Se userId fornecido, garantir que o recurso pertence ao usuário
  if (userId) {
    return prisma.monitoredURL.findFirst({
      where: {
        id,
        userId,
      },
    });
  }
  // Comportamento original (sem verificação de ownership)
  return prisma.monitoredURL.findUnique({ where: { id } });
};

export const updateMonitoredURL = async (
  id: string,
  data: Partial<MonitoredURL>,
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<MonitoredURL> => {
  // Se userId fornecido, garantir que o recurso pertence ao usuário
  if (userId) {
    // Verificar ownership antes de atualizar
    const existing = await prisma.monitoredURL.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error("URL not found or access denied");
    }
    return prisma.monitoredURL.update({ where: { id }, data });
  }
  // Comportamento original (sem verificação de ownership)
  return prisma.monitoredURL.update({ where: { id }, data });
};

export const deleteMonitoredURL = async (
  id: string,
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<MonitoredURL> => {
  // Se userId fornecido, garantir que o recurso pertence ao usuário
  if (userId) {
    // Verificar ownership antes de deletar
    const existing = await prisma.monitoredURL.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error("URL not found or access denied");
    }
  }

  // Deletar registros relacionados primeiro (para evitar foreign key constraint)
  await prisma.uRLCheck.deleteMany({ where: { monitoredUrlId: id } });
  await prisma.incident.deleteMany({ where: { monitoredUrlId: id } });
  await prisma.alertConfiguration.deleteMany({ where: { monitoredUrlId: id } });

  // Agora deletar a URL monitorada
  return prisma.monitoredURL.delete({ where: { id } });
};

// Função para buscar o histórico de checks de uma URL
export const getUrlChecksHistory = async (
  monitoredUrlId: string,
  startDate?: Date,
  endDate?: Date,
  take?: number, // Para paginação/limite
  skip?: number, // Para paginação
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<URLCheck[]> => {
  // Se userId fornecido, verificar ownership via MonitoredURL
  if (userId) {
    const monitoredUrl = await prisma.monitoredURL.findFirst({
      where: { id: monitoredUrlId, userId },
    });
    if (!monitoredUrl) {
      throw new Error("URL not found or access denied");
    }
  }

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
export const getLastCheckStatusForAllUrls = async (userId?: string): Promise<any[]> => {
  // Se userId fornecido, filtrar por usuário
  if (userId) {
    const latestChecks = await prisma.$queryRaw`
      SELECT DISTINCT ON (c."monitoredUrlId")
        c."monitoredUrlId", c.status, c."responseTime", c."isOnline", c."checkedAt"
      FROM "URLCheck" c
      INNER JOIN "MonitoredURL" m ON c."monitoredUrlId" = m.id
      WHERE m."userId" = ${userId}
      ORDER BY c."monitoredUrlId", c."checkedAt" DESC;
    `;
    return latestChecks as any[];
  }
  // Query SQL raw original (sem filtro de usuário)
  const latestChecks = await prisma.$queryRaw`
    SELECT DISTINCT ON ("monitoredUrlId")
      "monitoredUrlId", status, "responseTime", "isOnline", "checkedAt"
    FROM "URLCheck"
    ORDER BY "monitoredUrlId", "checkedAt" DESC;
  `;
  return latestChecks as any[];
};

// Função para obter métricas de uptime agregadas por período
export const getUptimeMetrics = async (
  monitoredUrlId: string,
  period: "hour" | "day" | "week" | "month",
  startDate: Date,
  endDate: Date,
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<any[]> => {
  // Se userId fornecido, verificar ownership via MonitoredURL
  if (userId) {
    const monitoredUrl = await prisma.monitoredURL.findFirst({
      where: { id: monitoredUrlId, userId },
    });
    if (!monitoredUrl) {
      throw new Error("URL not found or access denied");
    }
  }

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
  return result as any[];
};

// Funções para gerenciar incidentes
export const getIncidentsByUrl = async (
  monitoredUrlId: string,
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<any[]> => {
  // Se userId fornecido, verificar ownership via MonitoredURL
  if (userId) {
    const monitoredUrl = await prisma.monitoredURL.findFirst({
      where: { id: monitoredUrlId, userId },
    });
    if (!monitoredUrl) {
      throw new Error("URL not found or access denied");
    }
  }

  return prisma.incident.findMany({
    where: { monitoredUrlId },
    orderBy: { startedAt: "desc" },
  });
};

export const getAllIncidents = async (userId?: string): Promise<any[]> => {
  // Se userId fornecido, filtrar por usuário via MonitoredURL
  if (userId) {
    return prisma.incident.findMany({
      where: {
        monitoredUrl: {
          userId,
        },
      },
      orderBy: { startedAt: "desc" },
    });
  }
  // Comportamento original (sem filtro)
  return prisma.incident.findMany({
    orderBy: { startedAt: "desc" },
  });
};
