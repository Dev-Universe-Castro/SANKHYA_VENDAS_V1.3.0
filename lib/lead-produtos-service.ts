
import axios from 'axios';

const URL_CONSULTA_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";
const URL_SAVE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json";

const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

let cachedToken: string | null = null;

async function obterToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const resposta = await axios.post(ENDPOINT_LOGIN, {}, {
      headers: LOGIN_HEADERS,
      timeout: 10000
    });

    const token = resposta.data.bearerToken || resposta.data.token;

    if (!token) {
      throw new Error("Token não encontrado na resposta de login.");
    }

    cachedToken = token;
    return token;

  } catch (erro: any) {
    cachedToken = null;
    throw new Error(`Falha na autenticação Sankhya: ${erro.message}`);
  }
}

async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}) {
  const token = await obterToken();

  try {
    const config = {
      method: method.toLowerCase(),
      url: fullUrl,
      data: data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const resposta = await axios(config);
    return resposta.data;

  } catch (erro: any) {
    if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
      cachedToken = null;
      throw new Error("Sessão expirada. Tente novamente.");
    }

    const errorDetails = erro.response?.data || erro.message;
    console.error("❌ Erro na requisição Sankhya:", {
      url: fullUrl,
      method,
      error: errorDetails
    });

    throw new Error(`Falha na comunicação com a API Sankhya: ${JSON.stringify(errorDetails)}`);
  }
}

import { buscarPrecoProduto } from './produtos-service';

export interface LeadProduto {
  CODITEM?: string
  CODLEAD: string
  CODPROD: number
  DESCRPROD: string
  QUANTIDADE: number
  VLRUNIT: number
  VLRTOTAL: number
  ATIVO?: string
  DATA_INCLUSAO?: string
}

export async function consultarProdutosLead(codLead: string): Promise<LeadProduto[]> {
  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "AD_ADLEADSPRODUTOS",
        "includePresentationFields": "S",
        "offsetPage": "0",
        "entity": {
          "fieldset": {
            "list": "CODITEM, CODLEAD, CODPROD, DESCRPROD, QUANTIDADE, VLRUNIT, VLRTOTAL, ATIVO, DATA_INCLUSAO"
          }
        },
        "criteria": {
          "expression": {
            "$": `CODLEAD = '${codLead}'`
          }
        }
      }
    }
  };

  try {
    const resposta = await fazerRequisicaoAutenticada(URL_CONSULTA_SERVICO, 'POST', PAYLOAD);
    
    console.log('📦 Resposta da consulta de produtos:', JSON.stringify(resposta, null, 2));
    
    if (!resposta?.responseBody?.entities?.entity) {
      return [];
    }

    // Mapear resposta para array de produtos
    const entities = Array.isArray(resposta.responseBody.entities.entity) 
      ? resposta.responseBody.entities.entity 
      : [resposta.responseBody.entities.entity];

    const produtos = entities.map((e: any) => ({
      CODITEM: e.f0?.$,
      CODLEAD: e.f1?.$,
      CODPROD: Number(e.f2?.$),
      DESCRPROD: e.f3?.$,
      QUANTIDADE: Number(e.f4?.$),
      VLRUNIT: Number(e.f5?.$),
      VLRTOTAL: Number(e.f6?.$),
      ATIVO: e.f7?.$,
      DATA_INCLUSAO: e.f8?.$
    }));
    
    console.log('📋 Produtos mapeados:', produtos);
    return produtos;
  } catch (erro) {
    console.error("Erro ao consultar produtos do lead:", erro);
    return [];
  }
}

// Função para buscar e retornar preço do produto
export async function obterPrecoProdutoParaLead(codProd: number): Promise<number> {
  try {
    const preco = await buscarPrecoProduto(String(codProd));
    return preco;
  } catch (erro) {
    console.error('Erro ao buscar preço do produto:', erro);
    return 0;
  }
}

export async function adicionarProdutoLead(produto: Omit<LeadProduto, 'CODITEM' | 'DATA_INCLUSAO'>): Promise<void> {
  console.log('🔧 [adicionarProdutoLead] Iniciando adição de produto:', produto);

  // Validar dados obrigatórios
  if (!produto.CODLEAD) {
    throw new Error('CODLEAD é obrigatório');
  }
  if (!produto.CODPROD) {
    throw new Error('CODPROD é obrigatório');
  }
  if (!produto.DESCRPROD) {
    throw new Error('DESCRPROD é obrigatório');
  }
  if (!produto.QUANTIDADE || produto.QUANTIDADE <= 0) {
    throw new Error('QUANTIDADE deve ser maior que zero');
  }

  // Buscar preço se não fornecido
  let vlrunit = produto.VLRUNIT;
  if (!vlrunit || vlrunit === 0) {
    console.log(`🔍 Buscando preço do produto ${produto.CODPROD}...`);
    vlrunit = await obterPrecoProdutoParaLead(produto.CODPROD);
    console.log(`💰 Preço encontrado: ${vlrunit}`);
  }

  // Recalcular total com o preço correto
  const vlrtotal = produto.QUANTIDADE * vlrunit;

  // Formatar data no padrão DD/MM/YYYY
  const dataAtual = new Date();
  const dia = String(dataAtual.getDate()).padStart(2, '0');
  const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
  const ano = dataAtual.getFullYear();
  const dataFormatada = `${dia}/${mes}/${ano}`;

  const PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_ADLEADSPRODUTOS",
      "standAlone": false,
      "fields": ["CODLEAD", "CODPROD", "DESCRPROD", "QUANTIDADE", "VLRUNIT", "VLRTOTAL", "ATIVO", "DATA_INCLUSAO"],
      "records": [{
        "values": {
          "0": String(produto.CODLEAD),
          "1": String(produto.CODPROD),
          "2": String(produto.DESCRPROD),
          "3": String(produto.QUANTIDADE),
          "4": String(vlrunit),
          "5": String(vlrtotal),
          "6": "S",
          "7": dataFormatada
        }
      }]
    }
  };

  console.log('📤 [adicionarProdutoLead] Payload enviado para Sankhya:', JSON.stringify(PAYLOAD, null, 2));

  try {
    const resposta = await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD);
    console.log('✅ [adicionarProdutoLead] Produto adicionado com sucesso. Resposta:', JSON.stringify(resposta, null, 2));
    
    // Verificar se houve erro na resposta
    if (resposta.statusMessage === 'Error' || resposta.serviceResponse?.statusMessage === 'Error') {
      throw new Error(resposta.pendingPrinting?.message || 'Erro ao salvar produto no Sankhya');
    }
  } catch (erro: any) {
    console.error('❌ [adicionarProdutoLead] Erro ao adicionar produto:', {
      erro: erro.message,
      stack: erro.stack,
      payload: PAYLOAD
    });
    throw erro;
  }
}

export async function removerProdutoLead(codItem: string, codLead: string): Promise<{ novoValorTotal: number }> {
  console.log('🗑️ [removerProdutoLead] Inativando produto:', codItem);

  // 1. Inativar o produto
  const PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_ADLEADSPRODUTOS",
      "standAlone": false,
      "fields": ["ATIVO"],
      "records": [{
        "pk": { CODITEM: codItem },
        "values": {
          "0": "N"
        }
      }]
    }
  };

  console.log('📤 [removerProdutoLead] Payload enviado:', JSON.stringify(PAYLOAD, null, 2));

  try {
    const resposta = await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD);
    console.log('✅ [removerProdutoLead] Produto inativado com sucesso. Resposta:', JSON.stringify(resposta, null, 2));

    // 2. Recalcular o valor total do lead
    let novoValorTotal = 0;
    console.log('🔍 Recalculando valor total do lead:', codLead);
      
    // Consultar todos os produtos ativos do lead
    const PAYLOAD_CONSULTA = {
      "requestBody": {
        "dataSet": {
          "rootEntity": "AD_ADLEADSPRODUTOS",
          "includePresentationFields": "S",
          "offsetPage": "0",
          "entity": {
            "fieldset": {
              "list": "VLRTOTAL"
            }
          },
          "criteria": {
            "expression": {
              "$": `CODLEAD = '${codLead}' AND ATIVO = 'S'`
            }
          }
        }
      }
    };

    const responseProdutos = await fazerRequisicaoAutenticada(URL_CONSULTA_SERVICO, 'POST', PAYLOAD_CONSULTA);
    console.log('📋 Resposta da consulta de produtos:', JSON.stringify(responseProdutos, null, 2));
    
    // Calcular o valor total
    if (responseProdutos?.responseBody?.entities?.entity) {
      const entities = Array.isArray(responseProdutos.responseBody.entities.entity) 
        ? responseProdutos.responseBody.entities.entity 
        : [responseProdutos.responseBody.entities.entity];
      
      novoValorTotal = entities.reduce((sum: number, e: any) => {
        const vlr = Number(e.f0?.$ || 0);
        console.log('➕ Somando produto:', vlr);
        return sum + vlr;
      }, 0);

      console.log('💰 Valor total calculado:', novoValorTotal);
    } else {
      console.log('⚠️ Nenhum produto ativo encontrado para o lead');
    }

    // 3. Formatar data no padrão DD/MM/YYYY
    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;

    // 4. Atualizar o valor total do lead na tabela AD_LEADS
    const PAYLOAD_LEAD = {
      "serviceName": "DatasetSP.save",
      "requestBody": {
        "entityName": "AD_LEADS",
        "standAlone": false,
        "fields": ["VALOR", "DATA_ATUALIZACAO"],
        "records": [{
          "pk": { CODLEAD: String(codLead) },
          "values": {
            "0": String(novoValorTotal),
            "1": dataFormatada
          }
        }]
      }
    };

    console.log('📝 Payload para atualizar lead:', JSON.stringify(PAYLOAD_LEAD, null, 2));
    const respostaLead = await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD_LEAD);
    console.log('✅ Lead atualizado com novo valor total:', JSON.stringify(respostaLead, null, 2));

    return { novoValorTotal };
  } catch (erro: any) {
    console.error('❌ [removerProdutoLead] Erro ao inativar produto:', {
      erro: erro.message,
      stack: erro.stack,
      payload: PAYLOAD
    });
    throw erro;
  }
}
