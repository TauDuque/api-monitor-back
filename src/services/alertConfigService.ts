import { PrismaClient, AlertConfiguration } from "@prisma/client";

const prisma = new PrismaClient();

export const createAlertConfiguration = async (data: {
  monitoredUrlId: string;
  emailRecipient?: string;
  webhookUrl?: string;
  notifyOnDown?: boolean;
  notifyOnUp?: boolean;
}): Promise<AlertConfiguration> => {
  return prisma.alertConfiguration.create({
    data,
  });
};

export const getAlertConfigurationByUrlId = async (
  monitoredUrlId: string
): Promise<AlertConfiguration | null> => {
  return prisma.alertConfiguration.findUnique({
    where: { monitoredUrlId },
  });
};

export const updateAlertConfiguration = async (
  id: string,
  data: Partial<AlertConfiguration>
): Promise<AlertConfiguration> => {
  return prisma.alertConfiguration.update({
    where: { id },
    data,
  });
};

export const deleteAlertConfiguration = async (
  id: string
): Promise<AlertConfiguration> => {
  return prisma.alertConfiguration.delete({
    where: { id },
  });
};

export const getAllAlertConfigurations = async (): Promise<
  AlertConfiguration[]
> => {
  return prisma.alertConfiguration.findMany();
};
