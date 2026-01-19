// src/middlewares/validation.ts
import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Função auxiliar para sanitizar strings (prevenção básica de XSS)
const sanitizeString = (value: string) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/[<>]/g, ""); // Remove caracteres perigosos básicos
};

export const validateCreateMonitoredURL = [
  body("url")
    .notEmpty()
    .withMessage("URL is required")
    .isLength({ max: 2048 })
    .withMessage("URL must be at most 2048 characters")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("URL must be a valid HTTP or HTTPS URL")
    .customSanitizer(sanitizeString),
  body("name")
    .isString()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters")
    .customSanitizer(sanitizeString)
    .trim(),
  body("interval")
    .isInt({ min: 30, max: 86400 }) // Mínimo 30 segundos, máximo 1 dia
    .withMessage("Interval must be an integer between 30 and 86400 seconds"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
