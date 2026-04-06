import axios from 'axios';
import { getCacheService } from './cache-adapter';
import { apiLogger } from './api-logger';
import oracledb from 'oracledb';
import { oracleService } from './oracle-db';

const URL_LOGIN = 'https://api.sandbox.sankhya.com.br/login';
const URL_CONSULTA_SERVICO = 'https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr';
const URL_CREATE_SERVICO = 'https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr';
const URL_UPDATE_SERVICO = 'https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr';
const USUARIO = 'developer.castro@outlook.com';
const SENHA = 'senha';

let tokenCache: string | null = null;
let tokenExpiry: number | null = null;

// Função auxiliar para fazer login e obter token
export async function obterToken(forceNew = false, customCreds?: any): Promise<string> {
  if (!forceNew && !customCreds && tokenCache && tokenExpiry && Date.now() < tokenExpiry) {
    return tokenCache;
  }

  console.log('🔐 Solicitando novo token de autenticação...');

  const USUARIO_SANKHYA = customCreds?.SANKHYA_USERNAME || process.env.SANKHYA_USERNAME || USUARIO;
  const SENHA_SANKHYA = customCreds?.SANKHYA_PASSWORD || process.env.SANKHYA_PASSWORD || SENHA;
  const APPKEY_SANKHYA = customCreds?.SANKHYA_APPKEY || process.env.SANKHYA_APPKEY;
  const IS_SANDBOX = customCreds?.IS_SANDBOX || process.env.SANKHYA_IS_SANDBOX || 'S';
  const AUTH_TYPE = customCreds?.AUTH_TYPE || 'LEGACY';

  const BASE_URL = IS_SANDBOX === 'S' 
    ? 'https://api.sandbox.sankhya.com.br'
    : 'https://api.sankhya.com.br';

  try {
    if (AUTH_TYPE === 'OAUTH2') {
      console.log('🔑 Usando autenticação OAuth2');
      const authenticateUrl = `${BASE_URL}/authenticate`;
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', customCreds?.OAUTH_CLIENT_ID || '');
      params.append('client_secret', customCreds?.OAUTH_CLIENT_SECRET || '');

      const response = await axios.post(authenticateUrl, params, {
        headers: {
          'X-Token': customCreds?.OAUTH_X_TOKEN || '',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      const token = response.data.access_token || response.data.bearerToken || response.data.token;
      if (!token) throw new Error('Token OAuth2 não retornado');
      
      if (!customCreds) {
        tokenCache = token;
        tokenExpiry = Date.now() + (20 * 60 * 1000);
      }
      return token;
    } else {
      console.log('🔑 Usando autenticação Legacy');
      const loginUrl = `${BASE_URL}/login`;
      
      // Conforme sankhya-dynamic-api.ts: Legacy usa headers para credenciais
      const response = await axios.post(loginUrl, {}, {
        headers: {
          'token': customCreds?.SANKHYA_TOKEN || '',
          'appkey': APPKEY_SANKHYA || '',
          'username': USUARIO_SANKHYA,
          'password': SENHA_SANKHYA,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const token = response.data.bearerToken || response.data.token;
      if (!token) throw new Error('Token Legacy não retornado');

      if (!customCreds) {
        tokenCache = token;
        tokenExpiry = Date.now() + (20 * 60 * 1000);
      }
      return token;
    }
  } catch (erro: any) {
    const errorMsg = erro.response?.data?.error || erro.message;
    console.error('❌ Erro ao obter token:', errorMsg);
    throw new Error(`Falha na autenticação: ${errorMsg}`);
  }
}

// Função para validar e renovar token se necessário
async function validarToken(): Promise<string> {
  if (tokenCache && tokenExpiry && Date.now() < tokenExpiry) {
    return tokenCache;
  }
  return obterToken();
}

// Função genérica para fazer requisições autenticadas
async function fazerRequisicaoAutenticada(
  url: string,
  method: 'GET' | 'POST' | 'PUT' = 'POST',
  payload?: any
): Promise<any> {
  const token = await validarToken();

  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    let response;
    if (method === 'GET') {
      response = await axios.get(url, config);
    } else if (method === 'PUT') {
      response = await axios.put(url, payload, config);
    } else {
      response = await axios.post(url, payload, config);
    }

    await apiLogger.logSuccess(method, url, USUARIO);
    return response.data;
  } catch (erro: any) {
    await apiLogger.logError(method, url, USUARIO, erro);
    throw erro;
  }
}

// Função para obter o token da Sankhya (exportada para uso externo se necessário)
export async function getSankhyaToken(): Promise<string> {
  return validarToken();
}


// NOTA: Todas as funções de consulta foram removidas pois usaremos apenas Oracle
// Mantemos apenas as funções de criação/atualização que ainda podem usar a API

// Criar parceiro (mantido pois é criação)
export async function criarParceiro(parceiro: any) {
  const URL_CREATE_SERVICO = 'https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json';

  const CREATE_PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "Parceiro",
        "includePresentationFields": "N",
        "entity": {
          "NOMEPARC": parceiro.NOMEPARC,
          "CGC_CPF": parceiro.CGC_CPF,
          "CODCID": parceiro.CODCID,
          "CLIENTE": parceiro.CLIENTE,
          "ATIVO": parceiro.ATIVO,
          "TIPPESSOA": parceiro.TIPPESSOA,
          "IDENTINSCESTAD": parceiro.IDENTINSCESTAD || "",
          "EMAIL": parceiro.EMAIL || "",
          "TELEFONE": parceiro.TELEFONE || "",
          "NOMEBAI": parceiro.NOMEBAI || "",
          "NUMEND": parceiro.NUMEND || "",
          "CODEND": parceiro.CODEND || "",
          "COMPLEMENTO": parceiro.COMPLEMENTO || "",
          "CEP": parceiro.CEP || "",
          "fields": {
            "13": parceiro.LATITUDE || "",
            "15": parceiro.LONGITUDE || ""
          }
        }
      }
    }
  };

  try {
    console.log("📤 Enviando requisição para criar parceiro");
    const resposta = await fazerRequisicaoAutenticada(URL_CREATE_SERVICO, 'POST', CREATE_PAYLOAD);
    console.log("✅ Parceiro criado com sucesso");
    return resposta;
  } catch (erro: any) {
    console.error("❌ Erro ao criar Parceiro:", erro.message);
    throw erro;
  }
}

// Atualizar parceiro (mantido pois é atualização)
export async function atualizarParceiro(parceiro: any) {
  const URL_UPDATE_SERVICO = 'https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json';

  const UPDATE_PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "Parceiro",
        "includePresentationFields": "N",
        "entity": {
          "CODPARC": parceiro.CODPARC,
          "NOMEPARC": parceiro.NOMEPARC,
          "CGC_CPF": parceiro.CGC_CPF,
          "CODCID": parceiro.CODCID,
          "CLIENTE": parceiro.CLIENTE,
          "ATIVO": parceiro.ATIVO,
          "TIPPESSOA": parceiro.TIPPESSOA,
          "IDENTINSCESTAD": parceiro.IDENTINSCESTAD || "",
          "EMAIL": parceiro.EMAIL || "",
          "TELEFONE": parceiro.TELEFONE || "",
          "NOMEBAI": parceiro.NOMEBAI || "",
          "NUMEND": parceiro.NUMEND || "",
          "CODEND": parceiro.CODEND || "",
          "COMPLEMENTO": parceiro.COMPLEMENTO || "",
          "CEP": parceiro.CEP || "",
          "fields": {
            "13": parceiro.LATITUDE || "",
            "15": parceiro.LONGITUDE || ""
          }
        }
      }
    }
  };

  try {
    console.log("📤 Atualizando parceiro");
    const resposta = await fazerRequisicaoAutenticada(URL_UPDATE_SERVICO, 'POST', UPDATE_PAYLOAD);
    console.log("✅ Parceiro atualizado com sucesso");
    return resposta;
  } catch (erro: any) {
    console.error("❌ Erro ao atualizar Parceiro:", erro.message);
    throw erro;
  }
}

// Buscar parceiros do Oracle
export async function consultarParceiros(
  page: number,
  pageSize: number,
  searchName: string = '',
  searchCode: string = '',
  codVendedor?: number,
  codVendedoresEquipe?: number[]
) {
  try {
    console.log('🔍 Buscando parceiros do Oracle')

    // Esta função será implementada no Oracle
    throw new Error('Use a rota /api/sankhya/parceiros que busca do Oracle')
  } catch (error) {
    console.error('❌ Erro ao buscar parceiros:', error)
    throw error
  }
}