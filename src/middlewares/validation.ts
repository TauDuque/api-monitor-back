// src/middlewares/validation.ts
import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

export const validateCreateMonitoredURL = [
  body("url")
    .isURL()
    .withMessage("URL must be a valid URL format")
    .notEmpty()
    .withMessage("URL is required"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  body("interval")
    .isInt({ min: 10 }) // Ex: mínimo de 10 segundos para o intervalo de checagem
    .withMessage("Interval must be an integer and at least 10 seconds"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
