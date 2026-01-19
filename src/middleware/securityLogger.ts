// src/middleware/securityLogger.ts
// Middleware para logging de eventos de segurança
import { Request, Response, NextFunction } from "express";

interface SecurityEvent {
  type: string;
  message: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  timestamp: string;
  path?: string;
  method?: string;
}

/**
 * Middleware para registrar eventos de segurança
 */
export function securityLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Capturar eventos de segurança
  const originalJson = res.json.bind(res);
  
  res.json = function (body: any) {
    // Log de tentativas de acesso não autorizado
    if (res.statusCode === 401 || res.statusCode === 403) {
      const event: SecurityEvent = {
        type: res.statusCode === 401 ? "UNAUTHORIZED_ACCESS" : "FORBIDDEN_ACCESS",
        message: body?.error || "Access denied",
        userId: (req as any).user?.id,
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("user-agent"),
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      };
      
      console.warn("[SECURITY]", JSON.stringify(event));
    }
    
    // Log de rate limiting
    if (res.statusCode === 429) {
      const event: SecurityEvent = {
        type: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
        userId: (req as any).user?.id,
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("user-agent"),
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      };
      
      console.warn("[SECURITY]", JSON.stringify(event));
    }
    
    return originalJson(body);
  };
  
  next();
}

/**
 * Função para registrar tentativas de login falhadas
 */
export function logFailedLogin(email: string, ip: string, reason: string): void {
  const event: SecurityEvent = {
    type: "FAILED_LOGIN_ATTEMPT",
    message: `Failed login attempt for ${email}: ${reason}`,
    ip: ip || "unknown",
    timestamp: new Date().toISOString(),
    path: "/auth/login",
    method: "POST",
  };
  
  console.warn("[SECURITY]", JSON.stringify(event));
}

/**
 * Função para registrar tokens inválidos
 */
export function logInvalidToken(ip: string, reason: string): void {
  const event: SecurityEvent = {
    type: "INVALID_TOKEN",
    message: `Invalid token attempt: ${reason}`,
    ip: ip || "unknown",
    timestamp: new Date().toISOString(),
  };
  
  console.warn("[SECURITY]", JSON.stringify(event));
}
