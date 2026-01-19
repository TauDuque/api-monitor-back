import { Request, Response } from "express";
import * as alertConfigService from "../services/alertConfigService";

export const createAlertConfig = async (req: Request, res: Response) => {
  try {
    const {
      monitoredUrlId,
      emailRecipient,
      webhookUrl,
      notifyOnDown,
      notifyOnUp,
    } = req.body;
    // Obter userId se autenticado (multi-tenant)
    const userId = req.user?.id;
    const newConfig = await alertConfigService.createAlertConfiguration(
      {
        monitoredUrlId,
        emailRecipient,
        webhookUrl,
        notifyOnDown,
        notifyOnUp,
      },
      userId
    );
    res.status(201).json(newConfig);
  } catch (error: any) {
    if (error.message && error.message.includes("access denied")) {
      return res.status(403).json({ message: error.message });
    }
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("monitoredUrlId")
    ) {
      return res
        .status(409)
        .json({ message: "Alert configuration already exists for this URL." });
    }
    res.status(500).json({
      message: "Error creating alert configuration",
      error: error.message,
    });
  }
};

export const getAlertConfigByUrlId = async (req: Request, res: Response) => {
  try {
    const { urlId } = req.params;
    // Obter userId se autenticado (multi-tenant)
    const userId = req.user?.id;
    const config = await alertConfigService.getAlertConfigurationByUrlId(urlId, userId);
    if (!config) {
      return res.status(404).json({ message: "Alert configuration not found" });
    }
    res.status(200).json(config);
  } catch (error: any) {
    if (error.message && error.message.includes("access denied")) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({
      message: "Error fetching alert configuration",
      error: error.message,
    });
  }
};

export const updateAlertConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Obter userId se autenticado (multi-tenant)
    const userId = req.user?.id;
    const updatedConfig = await alertConfigService.updateAlertConfiguration(
      id,
      req.body,
      userId
    );
    res.status(200).json(updatedConfig);
  } catch (error: any) {
    if (error.message && error.message.includes("access denied")) {
      return res.status(403).json({ message: error.message });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Alert configuration not found for update." });
    }
    res.status(500).json({
      message: "Error updating alert configuration",
      error: error.message,
    });
  }
};

export const deleteAlertConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Obter userId se autenticado (multi-tenant)
    const userId = req.user?.id;
    await alertConfigService.deleteAlertConfiguration(id, userId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message && error.message.includes("access denied")) {
      return res.status(403).json({ message: error.message });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Alert configuration not found for deletion." });
    }
    res.status(500).json({
      message: "Error deleting alert configuration",
      error: error.message,
    });
  }
};

export const getAllAlertConfigs = async (req: Request, res: Response) => {
  try {
    // Obter userId se autenticado (multi-tenant)
    const userId = req.user?.id;
    const configs = await alertConfigService.getAllAlertConfigurations(userId);
    res.status(200).json(configs);
  } catch (error: any) {
    res.status(500).json({
      message: "Error fetching alert configurations",
      error: error.message,
    });
  }
};
