// src/controllers/checkController.ts
import { Request, Response } from "express";
import * as monitoredUrlService from "../services/monitoredUrlService"; // Reutilizando o serviço

export const getUrlHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // monitoredUrlId
    const { startDate, endDate, take, skip } = req.query;

    const parsedStartDate = startDate
      ? new Date(startDate as string)
      : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;
    const parsedTake = take ? parseInt(take as string) : undefined;
    const parsedSkip = skip ? parseInt(skip as string) : undefined;

    const history = await monitoredUrlService.getUrlChecksHistory(
      id,
      parsedStartDate,
      parsedEndDate,
      parsedTake,
      parsedSkip
    );
    res.status(200).json(history);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching URL history", error: error.message });
  }
};

export const getLatestChecks = async (req: Request, res: Response) => {
  try {
    const latestChecks =
      await monitoredUrlService.getLastCheckStatusForAllUrls();
    res.status(200).json(latestChecks);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching latest checks", error: error.message });
  }
};

export const getUptime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // monitoredUrlId
    const { period, startDate, endDate } = req.query;

    if (!period || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Period, startDate, and endDate are required." });
    }

    const parsedStartDate = new Date(startDate as string);
    const parsedEndDate = new Date(endDate as string);

    const uptimeData = await monitoredUrlService.getUptimeMetrics(
      id,
      period as any, // 'hour' | 'day' | 'week' | 'month'
      parsedStartDate,
      parsedEndDate
    );
    res.status(200).json(uptimeData);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching uptime metrics", error: error.message });
  }
};
