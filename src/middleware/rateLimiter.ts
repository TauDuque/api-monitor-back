// src/middleware/rateLimiter.ts
// Otimização de custo: Rate limiting para reduzir CPU e rede
import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

interface RateLimitOptions {
  windowMs: number; // Janela de tempo em ms
  max: number; // Máximo de requisições por janela
  keyGenerator?: (req: Request) => string;
  skipOnAuth?: boolean; // Se true, não aplica rate limit se usuário autenticado
  authenticatedMax?: number; // Limite para usuários autenticados (por userId)
}

export const rateLimiter = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Se usuário autenticado e skipOnAuth, usar limite de usuário autenticado
      if (options.skipOnAuth && req.user?.id && options.authenticatedMax) {
        const userId = req.user.id;
        const key = `rate_limit:user:${userId}`;

        const current = await redis.incr(key);

        if (current === 1) {
          await redis.expire(key, Math.ceil(options.windowMs / 1000));
        }

        if (current > options.authenticatedMax) {
          return res.status(429).json({
            error: "Too Many Requests",
            retryAfter: Math.ceil(options.windowMs / 1000),
          });
        }

        res.set({
          "X-RateLimit-Limit": options.authenticatedMax.toString(),
          "X-RateLimit-Remaining": Math.max(0, options.authenticatedMax - current).toString(),
          "X-RateLimit-Reset": new Date(
            Date.now() + options.windowMs
          ).toISOString(),
        });

        next();
        return;
      }

      // Comportamento original: rate limit por IP ou key customizada
      const key = options.keyGenerator
        ? options.keyGenerator(req)
        : `rate_limit:${req.ip}`;

      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(options.windowMs / 1000));
      }

      if (current > options.max) {
        return res.status(429).json({
          error: "Too Many Requests",
          retryAfter: Math.ceil(options.windowMs / 1000),
        });
      }

      res.set({
        "X-RateLimit-Limit": options.max.toString(),
        "X-RateLimit-Remaining": Math.max(0, options.max - current).toString(),
        "X-RateLimit-Reset": new Date(
          Date.now() + options.windowMs
        ).toISOString(),
      });

      next();
    } catch (error) {
      // Se Redis falhar, permite a requisição (fail-open)
      console.warn("Rate limiter Redis error:", error);
      next();
    }
  };
};

// Rate limiter específico para checks de URL
export const urlCheckRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minuto
  max: 10, // Máximo 10 checks por minuto por IP
  keyGenerator: (req) => `url_check:${req.ip}`,
});

// Rate limiter para API geral
// Para usuários autenticados: 200 req/min por usuário
// Para usuários não autenticados: 100 req/min por IP
export const apiRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minuto
  max: 100, // Máximo 100 requisições por minuto por IP (não autenticado)
  authenticatedMax: 200, // Máximo 200 requisições por minuto por usuário (autenticado)
  skipOnAuth: true, // Usa limite de usuário autenticado se disponível
  keyGenerator: (req) => `api:${req.ip}`,
});
