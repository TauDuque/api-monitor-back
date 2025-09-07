import { Router } from "express";
import * as monitoredUrlController from "../controllers/monitoredUrlController";
import { validateCreateMonitoredURL } from "../middlewares/validation"; // Importe o middleware

const router = Router();

router.post("/", validateCreateMonitoredURL, monitoredUrlController.createUrl); // Aplique a validação aqui
router.get("/", monitoredUrlController.getUrls);
router.get("/:id", monitoredUrlController.getUrlById);
router.put("/:id", monitoredUrlController.updateUrl);
router.delete("/:id", monitoredUrlController.deleteUrl);

export default router;
