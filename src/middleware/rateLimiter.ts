// src/middleware/rateLimiter.ts
// Otimização de custo: Rate limiting para reduzir CPU e rede
import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

interface RateLimitOptions {
  windowMs: number; // Janela de tempo em ms
  max: number; // Máximo de requisições por janela
  keyGenerator?: (req: Request) => string;
}

export const rateLimiter = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : `rate_limit:${req.ip}`;

    try {
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
export const apiRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minuto
  max: 100, // Máximo 100 requisições por minuto por IP
  keyGenerator: (req) => `api:${req.ip}`,
});
