// src/auth/middleware/authorizeResource.ts
// Middleware para autorizar acesso a recursos específicos
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

// Obter Prisma do request (injetado pelo middleware no server.ts)
const getPrisma = (req: Request): PrismaClient => {
  return (req as any).prisma;
};

/**
 * Middleware para verificar se um MonitoredURL pertence ao usuário autenticado
 * Usa o parâmetro :id da rota para buscar o recurso e verificar ownership
 */
export function authorizeMonitoredURL(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "ID do recurso não fornecido" });
      return;
    }

    const prisma = getPrisma(req);
    const userId = req.user.id;

    // Verificar ownership de forma assíncrona
    prisma.monitoredURL
      .findFirst({
        where: {
          id,
          userId,
        },
      })
      .then((monitoredUrl) => {
        if (!monitoredUrl) {
          res.status(403).json({
            error: "Acesso negado: recurso não pertence ao usuário",
          });
          return;
        }

        // Adicionar o recurso ao request para uso posterior
        (req as any).monitoredUrl = monitoredUrl;
        next();
      })
      .catch((error) => {
        console.error("Error authorizing resource:", error);
        res.status(500).json({ error: "Erro ao verificar autorização" });
      });
  } catch (error) {
    console.error("Error in authorizeMonitoredURL:", error);
    res.status(500).json({ error: "Erro ao verificar autorização" });
  }
}
