// src/auth/controllers/authController.ts
// Controller de autenticação
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "../services/authService";

// Obter Prisma do request (injetado pelo middleware no server.ts)
const getPrisma = (req: Request): PrismaClient => {
  return (req as any).prisma;
};

/**
 * Registra um novo usuário
 * POST /auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    const prisma = getPrisma(req);
    const authService = new AuthService(prisma);

    const result = await authService.register(email, password, name);

    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar usuário";
    
    if (message.includes("já cadastrado") || message.includes("already")) {
      res.status(409).json({ error: message });
    } else if (message.includes("Password") || message.includes("Email") || message.includes("Name")) {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
};

/**
 * Faz login de um usuário
 * POST /auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const prisma = getPrisma(req);
    const authService = new AuthService(prisma);

    const result = await authService.login(email, password);

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao fazer login";
    
    if (message.includes("inválidos") || message.includes("invalid")) {
      res.status(401).json({ error: message });
    } else if (message.includes("Email") || message.includes("Password")) {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
};

/**
 * Renova tokens usando refresh token
 * POST /auth/refresh
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token é obrigatório" });
      return;
    }

    const prisma = getPrisma(req);
    const authService = new AuthService(prisma);

    const result = await authService.refresh(refreshToken);

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao renovar tokens";
    
    if (message.includes("inválido") || message.includes("expirado") || message.includes("invalid") || message.includes("expired")) {
      res.status(401).json({ error: message });
    } else if (message.includes("required")) {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
};

/**
 * Faz logout revogando refresh token
 * POST /auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token é obrigatório" });
      return;
    }

    const prisma = getPrisma(req);
    const authService = new AuthService(prisma);

    await authService.logout(refreshToken);

    res.status(200).json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao fazer logout";
    
    if (message.includes("required")) {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
};
