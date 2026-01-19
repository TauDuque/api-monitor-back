import { PrismaClient, AlertConfiguration } from "@prisma/client";

const prisma = new PrismaClient();

export const createAlertConfiguration = async (
  data: {
    monitoredUrlId: string;
    emailRecipient?: string;
    webhookUrl?: string;
    notifyOnDown?: boolean;
    notifyOnUp?: boolean;
  },
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<AlertConfiguration> => {
  // Se userId fornecido, verificar ownership via MonitoredURL
  if (userId) {
    // @ts-ignore - Prisma client será gerado após migration (userId não existe ainda)
    const monitoredUrl = await prisma.monitoredURL.findFirst({
      // @ts-ignore
      where: { id: data.monitoredUrlId, userId },
    });
    if (!monitoredUrl) {
      throw new Error("URL not found or access denied");
    }
  }

  return prisma.alertConfiguration.create({
    data,
  });
};

export const getAlertConfigurationByUrlId = async (
  monitoredUrlId: string,
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<AlertConfiguration | null> => {
  // Se userId fornecido, verificar ownership via MonitoredURL
  if (userId) {
    // @ts-ignore - Prisma client será gerado após migration (userId não existe ainda)
    const monitoredUrl = await prisma.monitoredURL.findFirst({
      // @ts-ignore
      where: { id: monitoredUrlId, userId },
    });
    if (!monitoredUrl) {
      throw new Error("URL not found or access denied");
    }
  }

  return prisma.alertConfiguration.findUnique({
    where: { monitoredUrlId },
  });
};

export const updateAlertConfiguration = async (
  id: string,
  data: Partial<AlertConfiguration>,
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<AlertConfiguration> => {
  // Se userId fornecido, verificar ownership via MonitoredURL
  if (userId) {
    const config = await prisma.alertConfiguration.findUnique({
      where: { id },
      include: { monitoredUrl: true },
    });
    if (!config || (config.monitoredUrl as any).userId !== userId) {
      throw new Error("Alert configuration not found or access denied");
    }
  }

  return prisma.alertConfiguration.update({
    where: { id },
    data,
  });
};

export const deleteAlertConfiguration = async (
  id: string,
  userId?: string // Novo parâmetro opcional para verificar ownership
): Promise<AlertConfiguration> => {
  // Se userId fornecido, verificar ownership via MonitoredURL
  if (userId) {
    const config = await prisma.alertConfiguration.findUnique({
      where: { id },
      include: { monitoredUrl: true },
    });
    if (!config || (config.monitoredUrl as any).userId !== userId) {
      throw new Error("Alert configuration not found or access denied");
    }
  }

  return prisma.alertConfiguration.delete({
    where: { id },
  });
};

export const getAllAlertConfigurations = async (
  userId?: string // Novo parâmetro opcional para filtrar por usuário
): Promise<AlertConfiguration[]> => {
  // Se userId fornecido, filtrar por usuário via MonitoredURL
  if (userId) {
    // @ts-ignore - Prisma client será gerado após migration (userId não existe ainda)
    return prisma.alertConfiguration.findMany({
      // @ts-ignore - userId será adicionado após migration
      where: {
        monitoredUrl: {
          // @ts-ignore
          userId,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  // Comportamento original (sem filtro)
  return prisma.alertConfiguration.findMany();
};
