// src/services/checkService.ts
import axios from "axios";
import { URLCheck } from "@prisma/client"; // Importe o tipo URLCheck do Prisma

interface CheckResult {
  status: number | null;
  responseTime: number | null;
  isOnline: boolean;
  error?: string;
}

export const performUrlCheck = async (
  url: string,
  timeout: number = 5000
): Promise<CheckResult> => {
  const startTime = process.hrtime.bigint(); // High-resolution time

  try {
    const response = await axios.get(url, {
      timeout,
      validateStatus: () => true,
    }); // Não lança erro para 4xx/5xx
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    const isOnline = response.status >= 200 && response.status < 300; // Considera 2xx como online

    return {
      status: response.status,
      responseTime: Math.round(responseTime),
      isOnline,
    };
  } catch (error: any) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    // Tratamento de erros específicos (timeout, rede, etc.)
    if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
      if (error.code === "ECONNABORTED") {
        return {
          status: null,
          responseTime: Math.round(responseTime),
          isOnline: false,
          error: "Timeout",
        };
      }
      if (error.response) {
        // Erro de resposta do servidor (ex: 404, 500)
        return {
          status: error.response.status,
          responseTime: Math.round(responseTime),
          isOnline: false,
          error: `HTTP Error: ${error.response.status}`,
        };
      }
      if (error.request) {
        // Requisição feita, mas sem resposta (rede, DNS, etc.)
        return {
          status: null,
          responseTime: Math.round(responseTime),
          isOnline: false,
          error: "No response from server",
        };
      }
    }
    // Outros erros
    return {
      status: null,
      responseTime: Math.round(responseTime),
      isOnline: false,
      error: error.message || "Unknown error",
    };
  }
};
