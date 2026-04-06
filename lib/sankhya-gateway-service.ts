
import { sankhyaDynamicAPI } from './sankhya-dynamic-api';

export interface SankhyaEntityResponse {
  data: any[];
  count: number;
  totalPages?: number;
}

export class SankhyaGatewayService {
  /**
   * Realiza uma consulta genérica utilizando o EntityFacadeManager.loadRecords do Sankhya.
   * 
   * @param idEmpresa ID da empresa para autenticação
   * @param entityName Nome da entidade (ex: 'CabecalhoNota')
   * @param fields Lista de campos a retornar
   * @param criteria Filtro (cláusula WHERE SQL)
   * @param options Opções adicionais (ordenação, limite)
   */
  static async loadRecords(
    idEmpresa: number,
    entityName: string,
    fields: string[],
    criteria: string = '',
    options: { orderBy?: string, limit?: number, offset?: number } = {}
  ): Promise<SankhyaEntityResponse> {
    // Para o Sandbox do Sankhya, o path exige o prefixo /gateway/v1
    const endpoint = `/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json`;
    
    // Construir o corpo da requisição JSON conforme padrão CRUDServiceProvider
    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: entityName,
          includePresentationFields: 'N',
          offsetPage: options.offset ? Math.floor(options.offset / (options.limit || 500)) : 0,
          offset: (options.limit || 500).toString(),
          entity: {
            fieldset: {
              list: fields.join(',')
            }
          },
          criteria: {
            expression: {
              $: criteria
            }
          }
        }
      }
    };

    try {
      const response = await sankhyaDynamicAPI.fazerRequisicao(idEmpresa, endpoint, 'POST', data);
      
      const responseBody = response?.responseBody;
      const entities = responseBody?.entities;
      
      const rawEntityStr = JSON.stringify(responseBody?.entities?.entity || []);
      console.log(`📡 [Gateway] Resposta para ${entityName}:`, rawEntityStr.substring(0, 300) + (rawEntityStr.length > 300 ? '...' : ''));
      
      const entityList = entities?.entity;

      if (entityList) {
        // Garantir que entityList seja um array
        const records = Array.isArray(entityList) ? entityList : [entityList];
        const count = parseInt(entities.total || "0");
        
        // Extrair mapeamento real do metadata se disponível
        const metadataFields = responseBody?.entities?.metadata?.fields?.field;
        const fieldMapping: Record<string, string> = {};
        
        if (Array.isArray(metadataFields)) {
          metadataFields.forEach((f: any, idx: number) => {
            fieldMapping[`f${idx}`] = f.name;
          });
        } else if (metadataFields) {
          fieldMapping['f0'] = metadataFields.name;
        }

        // Mapear records usando o mapeamento do Sankhya ou o fallback de ordem
        const mappedData = records.map((record: any) => {
          const item: any = {};
          
          // Tentar mapear por todas as chaves fX presentes no record
          Object.keys(record).forEach(key => {
            if (key.startsWith('f')) {
              const fieldName = fieldMapping[key];
              if (fieldName) {
                const valueObj = record[key];
                item[fieldName] = valueObj ? valueObj['$'] : null;
              }
            }
          });

          // Fallback: se algum campo solicitado não foi mapeado (Sankhya pode omitir ou mudar metadata),
          // garantimos que os campos originais solicitados existam no objeto (mesmo que nulos)
          fields.forEach((field, index) => {
            if (item[field] === undefined) {
              const valueObj = record[`f${index}`];
              item[field] = valueObj ? valueObj['$'] : null;
            }
          });

          return item;
        });

        return {
          data: mappedData,
          count
        };
      }

      return { data: [], count: 0 };
    } catch (error: any) {
      console.error(`❌ Erro ao carregar registros da entidade ${entityName}:`, error.message);
      throw error;
    }
  }
}

export const sankhyaGateway = SankhyaGatewayService;
