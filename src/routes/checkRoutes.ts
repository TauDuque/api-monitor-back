// src/routes/checkRoutes.ts
import { Router } from "express";
import * as checkController from "../controllers/checkController";
import { authenticateToken } from "../auth/middleware/authenticateToken"; // Importe o middleware de autenticação

const router = Router();

// Todas as rotas requerem autenticação (multi-tenant)
router.get("/:id/history", authenticateToken, checkController.getUrlHistory); // Histórico de checks para uma URL
router.get("/latest", authenticateToken, checkController.getLatestChecks); // Último status de todas as URLs
router.get("/:id/uptime", authenticateToken, checkController.getUptime); // Uptime agregado
router.get("/:id/incidents", authenticateToken, checkController.getIncidents); // Incidentes por URL
router.get("/incidents", authenticateToken, checkController.getIncidents); // Todos os incidentes

export default router;
