// src/middleware/securityHeaders.ts
// Middleware para adicionar headers de segurança
import { Request, Response, NextFunction } from "express";

/**
 * Middleware para adicionar headers de segurança HTTP
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Strict-Transport-Security (HSTS) - Força HTTPS
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // X-Frame-Options - Previne clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // X-Content-Type-Options - Previne MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection - Proteção XSS (navegadores antigos)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy - Controla informações de referrer
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy - Controla features do navegador
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // Content-Security-Policy - Previne XSS e injection attacks
  // Nota: Ajustar conforme necessário para permitir recursos externos
  // Por enquanto, não definir CSP muito restritivo para não quebrar a aplicação
  // Pode ser configurado mais tarde conforme necessário

  next();
}
