import { Router } from "express";
import * as alertConfigController from "../controllers/alertConfigController";

const router = Router();

router.post("/", alertConfigController.createAlertConfig);
router.get("/", alertConfigController.getAllAlertConfigs);
router.get("/url/:urlId", alertConfigController.getAlertConfigByUrlId);
router.put("/:id", alertConfigController.updateAlertConfig);
router.delete("/:id", alertConfigController.deleteAlertConfig);

export default router;
