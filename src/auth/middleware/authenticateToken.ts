// src/auth/middleware/authenticateToken.ts
// Middleware para autenticar requisições usando JWT
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../utils/jwt";

/**
 * Middleware para autenticar requisições usando JWT
 * Extrai o token do header Authorization e valida
 * Adiciona req.user com { id: string, email?: string } se válido
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: "Token de acesso não fornecido" });
      return;
    }

    // Verificar token
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(403).json({ error: "Token inválido" });
      return;
    }

    // Adicionar dados do usuário ao request
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao autenticar token";

    if (message.includes("expired")) {
      res.status(401).json({ error: "Token expirado" });
    } else if (message.includes("invalid")) {
      res.status(403).json({ error: "Token inválido" });
    } else {
      res.status(401).json({ error: message });
    }
  }
}

/**
 * Middleware opcional para autenticação
 * Não falha se não houver token, mas adiciona req.user se houver token válido
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
        };
      }
    }

    next();
  } catch (error) {
    // Se houver erro, apenas continua sem adicionar req.user
    next();
  }
}
