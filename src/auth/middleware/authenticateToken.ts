// src/auth/middleware/authenticateToken.ts
// Middleware para autenticar requisições usando JWT
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../utils/jwt";
import { logInvalidToken } from "../../middleware/securityLogger";

/**
 * Middleware para autenticar requisições usando JWT
 * Extrai o token do header Authorization e valida
 * Adiciona req.user com { id: string, email?: string } se válido
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  return (async () => {
    try {
      // Extrair token do header Authorization
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

      if (!token) {
        res.status(401).json({ error: "Token de acesso não fornecido" });
        return;
      }

      // Verificar token (agora é assíncrono)
      let decoded;
      try {
        decoded = await verifyToken(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Invalid token";
        logInvalidToken(req.ip || req.socket.remoteAddress || "unknown", errorMessage);
        
        if (errorMessage.includes("revoked")) {
          res.status(401).json({ error: "Token revogado" });
        } else if (errorMessage.includes("expired")) {
          res.status(401).json({ error: "Token expirado" });
        } else {
          res.status(403).json({ error: "Token inválido" });
        }
        return;
      }

      if (!decoded) {
        logInvalidToken(req.ip || req.socket.remoteAddress || "unknown", "Invalid token");
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
        logInvalidToken(req.ip || req.socket.remoteAddress || "unknown", "Token expired");
        res.status(401).json({ error: "Token expirado" });
      } else if (message.includes("invalid")) {
        logInvalidToken(req.ip || req.socket.remoteAddress || "unknown", "Invalid token");
        res.status(403).json({ error: "Token inválido" });
      } else {
        logInvalidToken(req.ip || req.socket.remoteAddress || "unknown", message);
        res.status(401).json({ error: message });
      }
    }
  })();
}

/**
 * Middleware opcional para autenticação
 * Não falha se não houver token, mas adiciona req.user se houver token válido
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  return (async () => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        try {
          const decoded = await verifyToken(token);
          if (decoded) {
            req.user = {
              id: decoded.id,
              email: decoded.email,
            };
          }
        } catch (error) {
          // Se houver erro ao verificar token, apenas continua sem adicionar req.user
        }
      }

      next();
    } catch (error) {
      // Se houver erro, apenas continua sem adicionar req.user
      next();
    }
  })();
}
