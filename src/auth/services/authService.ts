// src/auth/services/authService.ts
// Service de autenticação com lógica de negócio
import { PrismaClient } from "@prisma/client";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from "../../utils/jwt";
import { hashPassword, comparePassword, validatePasswordStrength } from "../../utils/password";
import {
  registerSchema,
  loginSchema,
  validateSchema,
  formatZodErrors,
} from "../../utils/validation";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Registra um novo usuário
   * @param email - Email do usuário
   * @param password - Senha do usuário
   * @param name - Nome do usuário
   * @returns Dados do usuário e tokens
   * @throws Error se validação falhar ou email já existir
   */
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<AuthResponse> {
    // Validar dados de entrada
    const validation = validateSchema(registerSchema, { email, password, name });
    if (!validation.success) {
      const errors = formatZodErrors(validation.errors);
      throw new Error(errors.map((e) => e.message).join(", "));
    }

    // Verificar se email já existe
    // @ts-ignore - Prisma client será gerado após migration
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Email já cadastrado");
    }

    // Validar força da senha
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(", "));
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Criar usuário
    // @ts-ignore - Prisma client será gerado após migration
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Gerar tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = await generateRefreshToken({ id: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Faz login de um usuário existente
   * @param email - Email do usuário
   * @param password - Senha do usuário
   * @returns Dados do usuário e tokens
   * @throws Error se credenciais inválidas
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Validar dados de entrada
    const validation = validateSchema(loginSchema, { email, password });
    if (!validation.success) {
      const errors = formatZodErrors(validation.errors);
      throw new Error(errors.map((e) => e.message).join(", "));
    }

    // Buscar usuário por email
    // @ts-ignore - Prisma client será gerado após migration
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Email ou senha inválidos");
    }

    // Comparar senha
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Email ou senha inválidos");
    }

    // Gerar tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = await generateRefreshToken({ id: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Renova tokens usando refresh token
   * @param refreshToken - Refresh token
   * @returns Novos tokens
   * @throws Error se refresh token inválido ou expirado
   */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    // Verificar refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error("Refresh token inválido ou expirado");
    }

    // Buscar usuário
    // @ts-ignore - Prisma client será gerado após migration
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Revogar refresh token antigo
    await revokeRefreshToken(refreshToken);

    // Gerar novos tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const newRefreshToken = await generateRefreshToken({ id: user.id });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Faz logout revogando refresh token
   * @param refreshToken - Refresh token a ser revogado
   */
  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    await revokeRefreshToken(refreshToken);
  }

  /**
   * Busca um usuário por ID
   * @param userId - ID do usuário
   * @returns Dados do usuário ou null
   */
  async getUserById(userId: string) {
    // @ts-ignore - Prisma client será gerado após migration
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
