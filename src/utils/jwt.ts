// src/utils/jwt.ts
// Utilitários para gerenciamento de tokens JWT
import jwt from "jsonwebtoken";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export interface TokenPayload {
  id: string;
  email?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";
const ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || "15m";
const REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || "7d";

/**
 * Gera um access token JWT
 * @param payload - Dados a serem incluídos no token (userId, email)
 * @returns Access token JWT
 */
export function generateAccessToken(payload: TokenPayload): string {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  return jwt.sign(payload as object, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRATION,
  });
}

/**
 * Gera um refresh token JWT e armazena no Redis
 * @param payload - Dados a serem incluídos no token (userId)
 * @returns Refresh token JWT
 */
export async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  const token = jwt.sign(payload as object, JWT_SECRET, {
    expiresIn: REFRESH_EXPIRATION,
  });

  // Calcular expiração em segundos
  const expiresInSeconds = parseExpirationToSeconds(REFRESH_EXPIRATION);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  // Armazenar token no Redis com TTL
  const redisKey = `refresh_token:${token}`;
  await redis.setex(redisKey, expiresInSeconds, JSON.stringify({
    userId: payload.id,
    expiresAt: expiresAt.toISOString(),
  }));

  return token;
}

/**
 * Valida e decodifica um token JWT
 * @param token - Token JWT a ser validado
 * @returns Payload decodificado ou null se inválido
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    return null;
  }
}

/**
 * Valida um refresh token e verifica se existe no Redis
 * @param token - Refresh token a ser validado
 * @returns Payload do token se válido, null caso contrário
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    // Verificar assinatura e expiração do token
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    // Verificar se o token existe no Redis
    const redisKey = `refresh_token:${token}`;
    const stored = await redis.get(redisKey);

    if (!stored) {
      return null; // Token não existe ou já foi revogado
    }

    const tokenData = JSON.parse(stored);
    const expiresAt = new Date(tokenData.expiresAt);

    // Verificar se ainda não expirou (double check)
    if (expiresAt < new Date()) {
      await redis.del(redisKey); // Limpar token expirado
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("Error verifying refresh token:", error);
    return null;
  }
}

/**
 * Revoga um refresh token removendo-o do Redis
 * @param token - Refresh token a ser revogado
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const redisKey = `refresh_token:${token}`;
  await redis.del(redisKey);
}

/**
 * Revoga todos os refresh tokens de um usuário
 * @param userId - ID do usuário
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  // Buscar todos os tokens do usuário
  const pattern = `refresh_token:*`;
  const keys = await redis.keys(pattern);

  for (const key of keys) {
    const stored = await redis.get(key);
    if (stored) {
      const tokenData = JSON.parse(stored);
      if (tokenData.userId === userId) {
        await redis.del(key);
      }
    }
  }
}

/**
 * Converte string de expiração (ex: "7d", "15m") para segundos
 * @param expiration - String de expiração
 * @returns Segundos
 */
function parseExpirationToSeconds(expiration: string): number {
  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Default para 7 dias se formato inválido
    return 7 * 24 * 60 * 60;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60; // Default 7 dias
  }
}
