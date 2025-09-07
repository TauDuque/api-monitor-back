// src/routes/checkRoutes.ts
import { Router } from "express";
import * as checkController from "../controllers/checkController";

const router = Router();

router.get("/:id/history", checkController.getUrlHistory); // Histórico de checks para uma URL
router.get("/latest", checkController.getLatestChecks); // Último status de todas as URLs
router.get("/:id/uptime", checkController.getUptime); // Uptime agregado

export default router;
