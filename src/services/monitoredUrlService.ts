import { PrismaClient, MonitoredURL } from "@prisma/client";

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
