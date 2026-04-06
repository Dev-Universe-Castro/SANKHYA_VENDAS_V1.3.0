
import { obterToken } from './sankhya-api';

/**
 * Gerenciador centralizado de token Sankhya
 * Todos os serviços devem usar esta função para obter o token
 * O token é gerenciado globalmente via Redis
 */
export async function getSankhyaToken(forceRefresh = false): Promise<string> {
  return obterToken(forceRefresh);
}

/**
 * Headers padrão para autenticação nas requisições Sankhya
 */
export async function getSankhyaAuthHeaders(): Promise<{ Authorization: string; 'Content-Type': string }> {
  const token = await getSankhyaToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}
