import { Request, Response } from "express";
import * as monitoredUrlService from "../services/monitoredUrlService";

export const createUrl = async (req: Request, res: Response) => {
  try {
    const { url, name, interval } = req.body;
    const newUrl = await monitoredUrlService.createMonitoredURL({
      url,
      name,
      interval,
    });
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
    await monitoredUrlService.deleteMonitoredURL(id);
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
