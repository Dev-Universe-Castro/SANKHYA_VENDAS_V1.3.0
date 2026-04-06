
import { oracleService } from './oracle-db';

export interface Contrato {
  ID_EMPRESA: number;
  EMPRESA: string;
  CNPJ: string;
  SANKHYA_TOKEN?: string;
  SANKHYA_APPKEY?: string;
  SANKHYA_USERNAME?: string;
  SANKHYA_PASSWORD?: string;
  AUTH_TYPE?: string; // 'LEGACY' ou 'OAUTH2'
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
  OAUTH_X_TOKEN?: string;
  GEMINI_API_KEY?: string;
  AI_PROVEDOR?: string;
  AI_MODELO?: string;
  AI_CREDENTIAL?: string;
  ATIVO: string;
  IS_SANDBOX: string;
  LICENCAS: number;
  SYNC_ATIVO: string;
  SYNC_INTERVALO_MINUTOS: number;
  ULTIMA_SINCRONIZACAO?: Date;
  PROXIMA_SINCRONIZACAO?: Date;
  DATA_CRIACAO: Date;
  DATA_ATUALIZACAO: Date;
}

class ContratosService {

  async getContratoByEmpresa(idEmpresa: number): Promise<Contrato | null> {
    try {
      const sql = `
        SELECT * FROM AD_CONTRATOS 
        WHERE ID_EMPRESA = :idEmpresa 
          AND ATIVO = 'S'
      `;

      const contrato = await oracleService.executeOne<Contrato>(sql, { idEmpresa });

      if (!contrato) {
        console.log(`⚠️ Contrato não encontrado para empresa ${idEmpresa}`);
        return null;
      }

      console.log(`✅ Contrato encontrado para empresa: ${contrato.EMPRESA}`);
      return contrato;

    } catch (error) {
      console.error('❌ Erro ao buscar contrato:', error);
      throw error;
    }
  }

  async getSankhyaCredentials(idEmpresa: number) {
    const contrato = await this.getContratoByEmpresa(idEmpresa);

    if (!contrato) {
      throw new Error('Empresa não possui contrato ativo');
    }

    const authType = contrato.AUTH_TYPE || 'LEGACY';
    const baseUrl = contrato.IS_SANDBOX === 'S'
      ? 'https://api.sandbox.sankhya.com.br'
      : 'https://api.sankhya.com.br';

    console.log(`📋 [Contratos] Credenciais para empresa ${idEmpresa}:`);
    console.log(`   AUTH_TYPE: ${authType}`);
    console.log(`   IS_SANDBOX: ${contrato.IS_SANDBOX}`);
    console.log(`   BASE_URL: ${baseUrl}`);

    if (authType === 'OAUTH2') {
      // Validar credenciais OAuth2
      if (!contrato.OAUTH_CLIENT_ID || !contrato.OAUTH_CLIENT_SECRET || !contrato.OAUTH_X_TOKEN) {
        throw new Error('Credenciais OAuth2 incompletas para esta empresa');
      }

      return {
        authType: 'OAUTH2' as const,
        clientId: contrato.OAUTH_CLIENT_ID,
        clientSecret: contrato.OAUTH_CLIENT_SECRET,
        xToken: contrato.OAUTH_X_TOKEN,
        baseUrl,
        isSandbox: contrato.IS_SANDBOX === 'S'
      };
    } else {
      // Validar credenciais Legacy
      if (!contrato.SANKHYA_TOKEN || !contrato.SANKHYA_APPKEY ||
        !contrato.SANKHYA_USERNAME || !contrato.SANKHYA_PASSWORD) {
        throw new Error('Credenciais Legacy incompletas para esta empresa');
      }

      return {
        authType: 'LEGACY' as const,
        token: contrato.SANKHYA_TOKEN,
        appkey: contrato.SANKHYA_APPKEY,
        username: contrato.SANKHYA_USERNAME,
        password: contrato.SANKHYA_PASSWORD,
        baseUrl,
        isSandbox: contrato.IS_SANDBOX === 'S'
      };
    }
  }

  async atualizarUltimaSincronizacao(idEmpresa: number): Promise<void> {
    try {
      const agora = new Date();
      const sql = `
        UPDATE AD_CONTRATOS 
        SET ULTIMA_SINCRONIZACAO = CURRENT_TIMESTAMP,
            PROXIMA_SINCRONIZACAO = CURRENT_TIMESTAMP + NUMTODSINTERVAL(SYNC_INTERVALO_MINUTOS, 'MINUTE')
        WHERE ID_EMPRESA = :idEmpresa
      `;

      await oracleService.executeQuery(sql, { idEmpresa });
      console.log(`✅ Sincronização atualizada para empresa ${idEmpresa}`);

    } catch (error) {
      console.error('❌ Erro ao atualizar sincronização:', error);
      throw error;
    }
  }

  async listarContratos(): Promise<Contrato[]> {
    try {
      const sql = `
        SELECT * FROM AD_CONTRATOS 
        ORDER BY EMPRESA
      `;

      return await oracleService.executeQuery<Contrato>(sql);

    } catch (error) {
      console.error('❌ Erro ao listar contratos:', error);
      throw error;
    }
  }
}

export const contratosService = new ContratosService();
