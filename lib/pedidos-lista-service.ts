import axios from 'axios';
import { redisCacheService } from './redis-cache-service';

const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";
const URL_LOADRECORDS_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

import { getSankhyaToken } from './sankhya-token-manager';

async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}, retryCount = 0) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  try {
    const token = await getSankhyaToken();

    const config = {
      method: method.toLowerCase(),
      url: fullUrl,
      data: data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    };

    const resposta = await axios(config);
    return resposta.data;

  } catch (erro: any) {
    if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
      cachedToken = null;

      if (retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
      }

      throw new Error("Sessão expirada. Tente novamente.");
    }

    if ((erro.code === 'ECONNABORTED' || erro.code === 'ENOTFOUND' || erro.response?.status >= 500) && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
    }

    const errorDetails = erro.response?.data || erro.message;
    console.error("❌ Erro na requisição Sankhya:", {
      url: fullUrl,
      method,
      error: errorDetails
    });

    throw new Error(erro.response?.data?.statusMessage || erro.message || "Erro na comunicação com o servidor");
  }
}

function mapearEntidades(entities: any[]): any[] {
  if (!entities || !Array.isArray(entities) || entities.length === 0) {
    return [];
  }

  const fieldMetadata = entities[0].fieldset?.list || [];
  const registros = entities.slice(1);

  return registros.map(entity => {
    const obj: any = {};
    entity.f?.forEach((valor: any, index: number) => {
      const campo = fieldMetadata[index];
      if (campo) {
        obj[campo] = valor.$;
      }
    });
    return obj;
  });
}

export interface PedidoListagem {
  NUNOTA: string;
  CODPARC: string;
  NOMEPARC: string;
  CODVEND: string;
  NOMEVEND: string;
  VLRNOTA: number;
  DTNEG: string;
}

// Listar pedidos com filtro opcional por vendedor usando loadRecords
export async function listarPedidos(
  codVend?: string,
  dataInicio?: string,
  dataFim?: string,
  numeroPedido?: string,
  nomeCliente?: string
): Promise<PedidoListagem[]> {
  const cacheKey = `pedidos:list:${codVend}:${dataInicio}:${dataFim}:${numeroPedido}:${nomeCliente}`;
  const cached = await redisCacheService.get<PedidoListagem[]>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando pedidos do cache');
    return cached;
  }

  try {
    console.log('🔍 Buscando pedidos...');
    const criterios: string[] = ["TIPMOV = 'P'"];

    if (codVend) {
      criterios.push(`CODVEND = ${codVend}`);
    }

    if (dataInicio) {
      criterios.push(`DTNEG >= TO_DATE('${dataInicio}', 'YYYY-MM-DD')`);
    }

    if (dataFim) {
      criterios.push(`DTNEG <= TO_DATE('${dataFim}', 'YYYY-MM-DD')`);
    }

    // Busca otimizada por número do pedido (exata/numérica)
    if (numeroPedido && numeroPedido.trim()) {
      criterios.push(`NUNOTA = ${numeroPedido.trim()}`);
    }

    // Busca otimizada por código do cliente (numérica)
    if (nomeCliente && nomeCliente.trim()) {
      criterios.push(`CODPARC = ${nomeCliente.trim()}`);
    }

    const criterioFinal = criterios.join(' AND ');

    const PAYLOAD = {
      "serviceName": "CRUDServiceProvider.loadRecords",
      "requestBody": {
        "dataSet": {
          "rootEntity": "CabecalhoNota",
          "includePresentationFields": "S",
          "offsetPage": null,
          "disableRowsLimit": true,
          "entity": {
            "fieldset": {
              "list": "NUNOTA, CODPARC, CODVEND, VLRNOTA, DTNEG"
            }
          },
          "criteria": {
            "expression": {
              "$": criterioFinal
            }
          },
          "ordering": {
            "expression": {
              "$": "DTNEG DESC, NUNOTA DESC"
            }
          }
        }
      }
    };

    const resposta = await fazerRequisicaoAutenticada(URL_LOADRECORDS_SERVICO, 'POST', PAYLOAD);

    console.log('📦 Resposta Sankhya (listarPedidos):', JSON.stringify(resposta, null, 2));

    if (!resposta.responseBody?.entities?.entity) {
      console.log('⚠️ Nenhuma entidade encontrada na resposta');
      return [];
    }

    const entities = resposta.responseBody.entities;
    const fieldNames = entities.metadata?.fields?.field?.map((f: any) => f.name) || [];

    const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

    const pedidos: PedidoListagem[] = entityArray.map((rawEntity: any) => {
      const cleanObject: any = {};

      // Mapear campos usando os índices f0, f1, f2, etc.
      for (let i = 0; i < fieldNames.length; i++) {
        const fieldKey = `f${i}`;
        const fieldName = fieldNames[i];

        if (rawEntity[fieldKey]) {
          cleanObject[fieldName] = rawEntity[fieldKey].$;
        }
      }

      return {
        NUNOTA: cleanObject.NUNOTA || '',
        CODPARC: cleanObject.CODPARC || '',
        NOMEPARC: cleanObject.Parceiro_NOMEPARC || 'N/A',
        CODVEND: cleanObject.CODVEND || '',
        NOMEVEND: cleanObject.Vendedor_APELIDO || 'N/A',
        VLRNOTA: parseFloat(cleanObject.VLRNOTA || '0'),
        DTNEG: cleanObject.DTNEG || ''
      };
    });

    console.log(`✅ ${pedidos.length} pedidos encontrados`);

    // Salvar no cache (2 minutos - dados dinâmicos)
    await redisCacheService.set(cacheKey, pedidos);

    return pedidos;
  } catch (erro) {
    console.error("Erro ao listar pedidos:", erro);
    throw erro;
  }
}

// Listar pedidos por gerente (vendedores da equipe)
export async function listarPedidosPorGerente(
  codGerente: string,
  dataInicio?: string,
  dataFim?: string,
  numeroPedido?: string,
  nomeCliente?: string
): Promise<PedidoListagem[]> {
  const cacheKey = `pedidos:gerente:${codGerente}:${dataInicio}:${dataFim}:${numeroPedido}:${nomeCliente}`;
  const cached = await redisCacheService.get<PedidoListagem[]>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando pedidos da equipe do cache');
    return cached;
  }

  try {
    console.log(`🔍 Buscando pedidos da equipe do gerente ${codGerente}...`);
    const criterios: string[] = [
      "TIPMOV = 'P'",
      `CODVEND IN (SELECT CODVEND FROM TGFVEN WHERE CODGER = ${codGerente})`
    ];

    if (dataInicio) {
      criterios.push(`DTNEG >= TO_DATE('${dataInicio}', 'YYYY-MM-DD')`);
    }

    if (dataFim) {
      criterios.push(`DTNEG <= TO_DATE('${dataFim}', 'YYYY-MM-DD')`);
    }

    // Busca otimizada por número do pedido (exata/numérica)
    if (numeroPedido && numeroPedido.trim()) {
      criterios.push(`NUNOTA = ${numeroPedido.trim()}`);
    }

    // Busca otimizada por código do cliente (numérica)
    if (nomeCliente && nomeCliente.trim()) {
      criterios.push(`CODPARC = ${nomeCliente.trim()}`);
    }

    const criterioFinal = criterios.join(' AND ');

    const PAYLOAD = {
      "serviceName": "CRUDServiceProvider.loadRecords",
      "requestBody": {
        "dataSet": {
          "rootEntity": "CabecalhoNota",
          "includePresentationFields": "S",
          "offsetPage": null,
          "disableRowsLimit": true,
          "entity": {
            "fieldset": {
              "list": "NUNOTA, CODPARC, CODVEND, VLRNOTA, DTNEG"
            }
          },
          "criteria": {
            "expression": {
              "$": criterioFinal
            }
          },
          "ordering": {
            "expression": {
              "$": "DTNEG DESC, NUNOTA DESC"
            }
          }
        }
      }
    };

    const resposta = await fazerRequisicaoAutenticada(URL_LOADRECORDS_SERVICO, 'POST', PAYLOAD);

    if (!resposta.responseBody?.entities?.entity) {
      return [];
    }

    const entities = resposta.responseBody.entities;
    const fieldNames = entities.metadata?.fields?.field?.map((f: any) => f.name) || [];

    const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

    const pedidos: PedidoListagem[] = entityArray.map((rawEntity: any) => {
      const cleanObject: any = {};

      // Mapear campos usando os índices f0, f1, f2, etc.
      for (let i = 0; i < fieldNames.length; i++) {
        const fieldKey = `f${i}`;
        const fieldName = fieldNames[i];

        if (rawEntity[fieldKey]) {
          cleanObject[fieldName] = rawEntity[fieldKey].$;
        }
      }

      return {
        NUNOTA: cleanObject.NUNOTA || '',
        CODPARC: cleanObject.CODPARC || '',
        NOMEPARC: cleanObject.Parceiro_NOMEPARC || 'N/A',
        CODVEND: cleanObject.CODVEND || '',
        NOMEVEND: cleanObject.Vendedor_APELIDO || 'N/A',
        VLRNOTA: parseFloat(cleanObject.VLRNOTA || '0'),
        DTNEG: cleanObject.DTNEG || ''
      };
    });

    console.log(`✅ ${pedidos.length} pedidos da equipe encontrados`);

    // Salvar no cache (2 minutos)
    await redisCacheService.set(cacheKey, pedidos);

    return pedidos;
  } catch (erro) {
    console.error("Erro ao listar pedidos do gerente:", erro);
    throw erro;
  }
}