// src/auth/routes.ts
// Rotas de autenticação
import { Router } from "express";
import * as authController from "./controllers/authController";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Rate limiters específicos para autenticação
const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas
  keyGenerator: (req) => `login:${req.ip}`, // Por IP
});

const registerRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 tentativas
  keyGenerator: (req) => `register:${req.ip}`, // Por IP
});

const refreshRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // Máximo 10 tentativas
  keyGenerator: (req) => `refresh:${req.ip}`, // Por IP
});

// POST /auth/register - Registro de novo usuário
router.post(
  "/register",
  registerRateLimiter,
  authController.register
);

// POST /auth/login - Login de usuário existente
router.post(
  "/login",
  loginRateLimiter,
  authController.login
);

// POST /auth/refresh - Renovar tokens
router.post(
  "/refresh",
  refreshRateLimiter,
  authController.refresh
);

// POST /auth/logout - Logout (revogar refresh token)
router.post(
  "/logout",
  authController.logout
);

export default router;
