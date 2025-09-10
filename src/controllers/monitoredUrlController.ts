import { Request, Response } from "express";
import * as monitoredUrlService from "../services/monitoredUrlService";
import {
  scheduleUrlCheck,
  removeScheduledUrlCheck,
} from "../services/schedulerService"; // Importe o scheduler
import { performUrlCheck } from "../services/checkService"; // Importe o checkService
import { PrismaClient } from "@prisma/client"; // Importe o PrismaClient

const prisma = new PrismaClient();

export const createUrl = async (req: Request, res: Response) => {
  try {
    const { url, name, interval } = req.body;
    const newUrl = await monitoredUrlService.createMonitoredURL({
      url,
      name,
      interval,
    });

    // Fazer verificação imediata
    try {
      console.log(`Executando verificação imediata para: ${url}`);
      const checkResult = await performUrlCheck(url, 5000);

      // Salvar o resultado da verificação imediata
      await prisma.uRLCheck.create({
        data: {
          monitoredUrlId: newUrl.id,
          status: checkResult.status ?? 0,
          responseTime: checkResult.responseTime ?? 0,
          isOnline: checkResult.isOnline,
        },
      });

      console.log(
        `Verificação imediata concluída: Status ${checkResult.status}, Online: ${checkResult.isOnline}`
      );
    } catch (immediateCheckError) {
      console.error(
        `Erro na verificação imediata para ${url}:`,
        immediateCheckError
      );
      // Não falha a criação da URL se a verificação imediata der erro
    }

    await scheduleUrlCheck(newUrl); // Agende o check recorrente para a nova URL
    res.status(201).json(newUrl);
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("url")) {
      return res.status(409).json({ message: "URL already exists." });
    }
    res
      .status(500)
      .json({ message: "Error creating URL", error: error.message });
  }
};

export const getUrls = async (req: Request, res: Response) => {
  try {
    const urls = await monitoredUrlService.getAllMonitoredURLs();
    res.status(200).json(urls);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching URLs", error: error.message });
  }
};

export const getUrlById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const url = await monitoredUrlService.getMonitoredURLById(id);
    if (!url) {
      return res.status(404).json({ message: "URL not found" });
    }
    res.status(200).json(url);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching URL", error: error.message });
  }
};

export const updateUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedUrl = await monitoredUrlService.updateMonitoredURL(
      id,
      req.body
    );
    // Se o intervalo ou status 'active' mudar, reagende
    if (req.body.interval !== undefined || req.body.active !== undefined) {
      await removeScheduledUrlCheck(updatedUrl); // Remove o antigo
      if (updatedUrl.active) {
        // Apenas reagenda se estiver ativa
        await scheduleUrlCheck(updatedUrl); // Agende o novo
      }
    }
    res.status(200).json(updatedUrl);
  } catch (error: any) {
    if (error.code === "P2025") {
      // Record not found
      return res.status(404).json({ message: "URL not found for update." });
    }
    res
      .status(500)
      .json({ message: "Error updating URL", error: error.message });
  }
};

export const deleteUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const urlToDelete = await monitoredUrlService.getMonitoredURLById(id);
    if (!urlToDelete) {
      return res.status(404).json({ message: "URL not found for deletion." });
    }
    await monitoredUrlService.deleteMonitoredURL(id);
    await removeScheduledUrlCheck(urlToDelete); // Remova o agendamento ao deletar
    res.status(204).send(); // No content
  } catch (error: any) {
    if (error.code === "P2025") {
      // Record not found
      return res.status(404).json({ message: "URL not found for deletion." });
    }
    res
      .status(500)
      .json({ message: "Error deleting URL", error: error.message });
  }
};
