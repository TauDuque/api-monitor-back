import { Router } from "express";
import * as alertConfigController from "../controllers/alertConfigController";
import { authenticateToken } from "../auth/middleware/authenticateToken"; // Importe o middleware de autenticação

const router = Router();

// Todas as rotas requerem autenticação (multi-tenant)
router.post("/", authenticateToken, alertConfigController.createAlertConfig);
router.get("/", authenticateToken, alertConfigController.getAllAlertConfigs);
router.get("/url/:urlId", authenticateToken, alertConfigController.getAlertConfigByUrlId);
router.put("/:id", authenticateToken, alertConfigController.updateAlertConfig);
router.delete("/:id", authenticateToken, alertConfigController.deleteAlertConfig);

export default router;
