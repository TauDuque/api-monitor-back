import { Router } from "express";
import * as monitoredUrlController from "../controllers/monitoredUrlController";
import { validateCreateMonitoredURL } from "../middlewares/validation"; // Importe o middleware
import { authenticateToken } from "../auth/middleware/authenticateToken"; // Importe o middleware de autenticação

const router = Router();

// Todas as rotas requerem autenticação (multi-tenant)
router.post("/", authenticateToken, validateCreateMonitoredURL, monitoredUrlController.createUrl); // Aplique a validação aqui
router.get("/", authenticateToken, monitoredUrlController.getUrls);
router.get("/:id", authenticateToken, monitoredUrlController.getUrlById);
router.put("/:id", authenticateToken, monitoredUrlController.updateUrl);
router.delete("/:id", authenticateToken, monitoredUrlController.deleteUrl);

export default router;
