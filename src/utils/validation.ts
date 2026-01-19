// src/utils/validation.ts
// Utilitários de validação usando Zod e express-validator
import { z } from "zod";

/**
 * Valida formato de email
 * @param email - Email a ser validado
 * @returns true se válido, false caso contrário
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Schemas Zod para validação de dados de autenticação
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .min(5, "Email must be at least 5 characters")
    .max(255, "Email must be at most 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be at most 255 characters")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Name must contain only letters and spaces"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .min(5, "Email must be at least 5 characters")
    .max(255, "Email must be at most 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be at most 128 characters"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * Tipos inferidos dos schemas
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;

/**
 * Valida dados usando um schema Zod
 * @param schema - Schema Zod
 * @param data - Dados a serem validados
 * @returns Objeto com success (boolean) e data/errors
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Formata erros do Zod para formato de resposta da API
 * @param errors - Erros do Zod
 * @returns Array de erros formatados
 */
export function formatZodErrors(errors: z.ZodError): Array<{
  field: string;
  message: string;
}> {
  return errors.issues.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
}
