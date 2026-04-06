
import axios from 'axios';
import { oracleService } from './oracle-db';
import { contratosService } from './contratos-service';

interface SyncResult {
  success: boolean;
  produtosSync: number;
  parceirosSync: number;
  errors: string[];
}

class SyncService {
  
  private async obterTokenEmpresa(idEmpresa: number): Promise<string> {
    const credentials = await contratosService.getSankhyaCredentials(idEmpresa);

    if (credentials.authType === 'OAUTH2') {
      // OAuth2 usa endpoint /authenticate
      const authenticateUrl = `${credentials.baseUrl}/authenticate`;
      
      // OAuth2 usa x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', credentials.clientId);
      params.append('client_secret', credentials.clientSecret);

      const response = await axios.post(authenticateUrl, params, {
        headers: {
          'X-Token': credentials.xToken,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return response.data.access_token || response.data.bearerToken || response.data.token;
    } else {
      // Legacy usa endpoint /login com JSON
      const loginUrl = `${credentials.baseUrl}/login`;
      
      const response = await axios.post(loginUrl, {}, {
        headers: {
          'token': credentials.token,
          'appkey': credentials.appkey,
          'username': credentials.username,
          'password': credentials.password,
          'Content-Type': 'application/json'
        }
      });
      return response.data.bearerToken || response.data.token;
    }
  }

  async sincronizarProdutos(idEmpresa: number): Promise<number> {
    try {
      console.log(`🔄 Iniciando sincronização de produtos para empresa ${idEmpresa}`);
      
      const credentials = await contratosService.getSankhyaCredentials(idEmpresa);
      const token = await this.obterTokenEmpresa(idEmpresa);
      
      const url = `${credentials.baseUrl}/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json`;
      
      const payload = {
        requestBody: {
          dataSet: {
            rootEntity: "Produto",
            includePresentationFields: "N",
            offsetPage: null,
            disableRowsLimit: true,
            entity: {
              fieldset: {
                list: "CODPROD,DESCRPROD,ATIVO,LOCAL,MARCA,CARACTERISTICAS,UNIDADE,VLRCOMERC,ESTOQUE,REFERENCIA,CODVOL,CODEANBARRA,DESCRCOMPLETA,CODGRUPOPROD,COMPRADOR,PESO,PESOLIQ,ALTURA,LARGURA,COMPRIMENTO,NCMSH,ORIGPROD,CONTROLE,USOPROD"
              }
            }
          }
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const entities = response.data.responseBody?.entities;
      if (!entities || !entities.entity) {
        console.log('⚠️ Nenhum produto encontrado');
        return 0;
      }

      // Marcar todos produtos como não atuais
      await oracleService.executeQuery(
        `UPDATE AS_PRODUTOS SET SANKHYA_ATUAL = 'N' WHERE ID_SISTEMA = :idEmpresa`,
        { idEmpresa }
      );

      const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
      const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

      let count = 0;
      for (const rawEntity of entityArray) {
        const produto: any = {};
        for (let i = 0; i < fieldNames.length; i++) {
          const fieldKey = `f${i}`;
          const fieldName = fieldNames[i];
          if (rawEntity[fieldKey]) {
            produto[fieldName] = rawEntity[fieldKey].$;
          }
        }

        // MERGE (insert ou update)
        const sql = `
          MERGE INTO AS_PRODUTOS p
          USING (SELECT :idEmpresa AS ID_SISTEMA, :codProd AS CODPROD FROM DUAL) s
          ON (p.ID_SISTEMA = s.ID_SISTEMA AND p.CODPROD = s.CODPROD)
          WHEN MATCHED THEN
            UPDATE SET 
              DESCRPROD = :descrProd,
              ATIVO = :ativo,
              LOCAL = :local,
              MARCA = :marca,
              CARACTERISTICAS = :caracteristicas,
              UNIDADE = :unidade,
              VLRCOMERC = :vlrComerc,
              ESTOQUE = :estoque,
              REFERENCIA = :referencia,
              CODVOL = :codVol,
              CODEANBARRA = :codEanBarra,
              DESCRCOMPLETA = :descrCompleta,
              CODGRUPOPROD = :codGrupoProd,
              COMPRADOR = :comprador,
              PESO = :peso,
              PESOLIQ = :pesoLiq,
              ALTURA = :altura,
              LARGURA = :largura,
              COMPRIMENTO = :comprimento,
              NCMSH = :ncmSh,
              ORIGPROD = :origProd,
              CONTROLE = :controle,
              USOPROD = :usoProd,
              SANKHYA_ATUAL = 'S',
              DT_ULT_CARGA = CURRENT_TIMESTAMP
          WHEN NOT MATCHED THEN
            INSERT (ID_SISTEMA, CODPROD, DESCRPROD, ATIVO, LOCAL, MARCA, CARACTERISTICAS, UNIDADE, VLRCOMERC, ESTOQUE, REFERENCIA, CODVOL, CODEANBARRA, DESCRCOMPLETA, CODGRUPOPROD, COMPRADOR, PESO, PESOLIQ, ALTURA, LARGURA, COMPRIMENTO, NCMSH, ORIGPROD, CONTROLE, USOPROD, SANKHYA_ATUAL)
            VALUES (:idEmpresa, :codProd, :descrProd, :ativo, :local, :marca, :caracteristicas, :unidade, :vlrComerc, :estoque, :referencia, :codVol, :codEanBarra, :descrCompleta, :codGrupoProd, :comprador, :peso, :pesoLiq, :altura, :largura, :comprimento, :ncmSh, :origProd, :controle, :usoProd, 'S')
        `;

        await oracleService.executeQuery(sql, {
          idEmpresa,
          codProd: produto.CODPROD,
          descrProd: produto.DESCRPROD || null,
          ativo: produto.ATIVO || null,
          local: produto.LOCAL || null,
          marca: produto.MARCA || null,
          caracteristicas: produto.CARACTERISTICAS || null,
          unidade: produto.UNIDADE || null,
          vlrComerc: produto.VLRCOMERC || null,
          estoque: produto.ESTOQUE || null,
          referencia: produto.REFERENCIA || null,
          codVol: produto.CODVOL || null,
          codEanBarra: produto.CODEANBARRA || null,
          descrCompleta: produto.DESCRCOMPLETA || null,
          codGrupoProd: produto.CODGRUPOPROD || null,
          comprador: produto.COMPRADOR || null,
          peso: produto.PESO || null,
          pesoLiq: produto.PESOLIQ || null,
          altura: produto.ALTURA || null,
          largura: produto.LARGURA || null,
          comprimento: produto.COMPRIMENTO || null,
          ncmSh: produto.NCMSH || null,
          origProd: produto.ORIGPROD || null,
          controle: produto.CONTROLE || null,
          usoProd: produto.USOPROD || null
        });

        count++;
      }

      console.log(`✅ ${count} produtos sincronizados para empresa ${idEmpresa}`);
      return count;

    } catch (error) {
      console.error('❌ Erro ao sincronizar produtos:', error);
      throw error;
    }
  }

  async sincronizarParceiros(idEmpresa: number): Promise<number> {
    try {
      console.log(`🔄 Iniciando sincronização de parceiros para empresa ${idEmpresa}`);
      
      const credentials = await contratosService.getSankhyaCredentials(idEmpresa);
      const token = await this.obterTokenEmpresa(idEmpresa);
      
      const url = `${credentials.baseUrl}/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json`;
      
      const payload = {
        requestBody: {
          dataSet: {
            rootEntity: "Parceiro",
            includePresentationFields: "N",
            offsetPage: null,
            disableRowsLimit: true,
            entity: {
              fieldset: {
                list: "CODPARC,NOMEPARC,CGC_CPF,CODCID,ATIVO,TIPPESSOA,RAZAOSOCIAL,IDENTINSCESTAD,CEP,CODEND,NUMEND,COMPLEMENTO,CODBAI,LATITUDE,LONGITUDE,CLIENTE,CODVEND"
              }
            },
            criteria: {
              expression: { $: "CLIENTE = 'S'" }
            }
          }
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const entities = response.data.responseBody?.entities;
      if (!entities || !entities.entity) {
        console.log('⚠️ Nenhum parceiro encontrado');
        return 0;
      }

      // Marcar todos parceiros como não atuais
      await oracleService.executeQuery(
        `UPDATE AS_PARCEIROS SET SANKHYA_ATUAL = 'N' WHERE ID_SISTEMA = :idEmpresa`,
        { idEmpresa }
      );

      const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
      const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

      let count = 0;
      for (const rawEntity of entityArray) {
        const parceiro: any = {};
        for (let i = 0; i < fieldNames.length; i++) {
          const fieldKey = `f${i}`;
          const fieldName = fieldNames[i];
          if (rawEntity[fieldKey]) {
            parceiro[fieldName] = rawEntity[fieldKey].$;
          }
        }

        const sql = `
          MERGE INTO AS_PARCEIROS p
          USING (SELECT :idEmpresa AS ID_SISTEMA, :codParc AS CODPARC FROM DUAL) s
          ON (p.ID_SISTEMA = s.ID_SISTEMA AND p.CODPARC = s.CODPARC)
          WHEN MATCHED THEN
            UPDATE SET 
              NOMEPARC = :nomeParc,
              CGC_CPF = :cgcCpf,
              CODCID = :codCid,
              ATIVO = :ativo,
              TIPPESSOA = :tipPessoa,
              RAZAOSOCIAL = :razaoSocial,
              IDENTINSCESTAD = :identInscEstad,
              CEP = :cep,
              CODEND = :codEnd,
              NUMEND = :numEnd,
              COMPLEMENTO = :complemento,
              CODBAI = :codBai,
              LATITUDE = :latitude,
              LONGITUDE = :longitude,
              CLIENTE = :cliente,
              CODVEND = :codVend,
              SANKHYA_ATUAL = 'S',
              DT_ULT_CARGA = CURRENT_TIMESTAMP
          WHEN NOT MATCHED THEN
            INSERT (ID_SISTEMA, CODPARC, NOMEPARC, CGC_CPF, CODCID, ATIVO, TIPPESSOA, RAZAOSOCIAL, IDENTINSCESTAD, CEP, CODEND, NUMEND, COMPLEMENTO, CODBAI, LATITUDE, LONGITUDE, CLIENTE, CODVEND, SANKHYA_ATUAL)
            VALUES (:idEmpresa, :codParc, :nomeParc, :cgcCpf, :codCid, :ativo, :tipPessoa, :razaoSocial, :identInscEstad, :cep, :codEnd, :numEnd, :complemento, :codBai, :latitude, :longitude, :cliente, :codVend, 'S')
        `;

        await oracleService.executeQuery(sql, {
          idEmpresa,
          codParc: parceiro.CODPARC,
          nomeParc: parceiro.NOMEPARC || null,
          cgcCpf: parceiro.CGC_CPF || null,
          codCid: parceiro.CODCID || null,
          ativo: parceiro.ATIVO || null,
          tipPessoa: parceiro.TIPPESSOA || null,
          razaoSocial: parceiro.RAZAOSOCIAL || null,
          identInscEstad: parceiro.IDENTINSCESTAD || null,
          cep: parceiro.CEP || null,
          codEnd: parceiro.CODEND || null,
          numEnd: parceiro.NUMEND || null,
          complemento: parceiro.COMPLEMENTO || null,
          codBai: parceiro.CODBAI || null,
          latitude: parceiro.LATITUDE || null,
          longitude: parceiro.LONGITUDE || null,
          cliente: parceiro.CLIENTE || null,
          codVend: parceiro.CODVEND || null
        });

        count++;
      }

      console.log(`✅ ${count} parceiros sincronizados para empresa ${idEmpresa}`);
      return count;

    } catch (error) {
      console.error('❌ Erro ao sincronizar parceiros:', error);
      throw error;
    }
  }

  async sincronizarEmpresa(idEmpresa: number): Promise<SyncResult> {
    const errors: string[] = [];
    let produtosSync = 0;
    let parceirosSync = 0;

    try {
      produtosSync = await this.sincronizarProdutos(idEmpresa);
    } catch (error: any) {
      errors.push(`Produtos: ${error.message}`);
    }

    try {
      parceirosSync = await this.sincronizarParceiros(idEmpresa);
    } catch (error: any) {
      errors.push(`Parceiros: ${error.message}`);
    }

    // Atualizar timestamp de sincronização
    if (errors.length === 0) {
      await contratosService.atualizarUltimaSincronizacao(idEmpresa);
    }

    return {
      success: errors.length === 0,
      produtosSync,
      parceirosSync,
      errors
    };
  }
}

export const syncService = new SyncService();
