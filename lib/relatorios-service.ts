import { oracleService } from './oracle-db';

export interface RelatorioModelo {
  ID_MODELO?: number;
  ID_EMPRESA: number;
  CODUSUARIO: number;
  NOME: string;
  DESCRICAO?: string;
  ESTRUTURA_JSON: string;
  CABECALHO_JSON?: string;
  RODAPE_JSON?: string;
  LOGO_URL?: string;
  ATIVO?: 'S' | 'N';
  DATA_CRIACAO?: Date;
  DATA_ATUALIZACAO?: Date;
}

export const relatoriosService = {
  async getAll(idEmpresa: number, codUsuario?: number): Promise<RelatorioModelo[]> {
    try {
      let sql = `
        SELECT 
          ID_MODELO, 
          ID_EMPRESA, 
          CODUSUARIO, 
          NOME, 
          DESCRICAO, 
          ESTRUTURA_JSON, 
          CABEÇALHO_JSON as CABECALHO_JSON, 
          RODAPE_JSON, 
          LOGO_URL, 
          ATIVO, 
          DATA_CRIACAO, 
          DATA_ATUALIZACAO
        FROM AD_RELATORIOS_MODELOS
        WHERE ID_EMPRESA = :idEmpresa
      `;
      
      const binds: any = { idEmpresa };
      
      if (codUsuario) {
        sql += ` AND CODUSUARIO = :codUsuario`;
        binds.codUsuario = codUsuario;
      }
      
      sql += ` ORDER BY NOME`;

      const resultados = await oracleService.executeQuery(sql, binds);
      return resultados.map((r: any) => ({
        ...r,
        ID_MODELO: parseInt(r.ID_MODELO)
      }));
    } catch (error) {
      console.error("❌ Erro ao buscar modelos de relatórios:", error);
      return [];
    }
  },

  async getById(id: number): Promise<RelatorioModelo | null> {
    try {
      const sql = `
        SELECT 
          ID_MODELO, 
          ID_EMPRESA, 
          CODUSUARIO, 
          NOME, 
          DESCRICAO, 
          ESTRUTURA_JSON, 
          CABEÇALHO_JSON as CABECALHO_JSON, 
          RODAPE_JSON, 
          LOGO_URL, 
          ATIVO, 
          DATA_CRIACAO, 
          DATA_ATUALIZACAO
        FROM AD_RELATORIOS_MODELOS
        WHERE ID_MODELO = :id
      `;

      const result = await oracleService.executeOne(sql, { id });
      if (result) {
        return {
          ...result,
          ID_MODELO: parseInt(result.ID_MODELO)
        };
      }
      return null;
    } catch (error) {
      console.error(`❌ Erro ao buscar modelo de relatório ${id}:`, error);
      return null;
    }
  },

  async create(modelo: RelatorioModelo): Promise<RelatorioModelo | null> {
    try {
      const sql = `
        INSERT INTO AD_RELATORIOS_MODELOS (
          ID_EMPRESA, CODUSUARIO, NOME, DESCRICAO, ESTRUTURA_JSON, CABEÇALHO_JSON, RODAPE_JSON, LOGO_URL
        ) VALUES (
          :idEmpresa, :codUsuario, :nome, :descricao, :estrutura, :cabecalho, :rodape, :logo
        )
      `;

      await oracleService.executeQuery(sql, {
        idEmpresa: modelo.ID_EMPRESA,
        codUsuario: modelo.CODUSUARIO,
        nome: modelo.NOME,
        descricao: modelo.DESCRICAO || '',
        estrutura: modelo.ESTRUTURA_JSON,
        cabecalho: modelo.CABECALHO_JSON || '',
        rodape: modelo.RODAPE_JSON || '',
        logo: modelo.LOGO_URL || ''
      });

      // Buscar o último ID inserido (no Oracle 12c+ podemos usar IDENTITY)
      const lastInsertSql = `SELECT MAX(ID_MODELO) as LAST_ID FROM AD_RELATORIOS_MODELOS WHERE CODUSUARIO = :codUsuario`;
      const lastIdRes = await oracleService.executeOne(lastInsertSql, { codUsuario: modelo.CODUSUARIO });
      
      if (lastIdRes && lastIdRes.LAST_ID) {
        return await this.getById(parseInt(lastIdRes.LAST_ID));
      }
      return null;
    } catch (error) {
      console.error("❌ Erro ao criar modelo de relatório:", error);
      throw error;
    }
  },

  async update(id: number, modelo: Partial<RelatorioModelo>): Promise<RelatorioModelo | null> {
    try {
      let sql = `UPDATE AD_RELATORIOS_MODELOS SET DATA_ATUALIZACAO = SYSTIMESTAMP`;
      const binds: any = { id };

      if (modelo.NOME) { sql += `, NOME = :nome`; binds.nome = modelo.NOME; }
      if (modelo.DESCRICAO !== undefined) { sql += `, DESCRICAO = :descricao`; binds.descricao = modelo.DESCRICAO; }
      if (modelo.ESTRUTURA_JSON) { sql += `, ESTRUTURA_JSON = :estrutura`; binds.estrutura = modelo.ESTRUTURA_JSON; }
      if (modelo.CABECALHO_JSON !== undefined) { sql += `, CABEÇALHO_JSON = :cabecalho`; binds.cabecalho = modelo.CABECALHO_JSON; }
      if (modelo.RODAPE_JSON !== undefined) { sql += `, RODAPE_JSON = :rodape`; binds.rodape = modelo.RODAPE_JSON; }
      if (modelo.LOGO_URL !== undefined) { sql += `, LOGO_URL = :logo`; binds.logo = modelo.LOGO_URL; }
      if (modelo.ATIVO) { sql += `, ATIVO = :ativo`; binds.ativo = modelo.ATIVO; }

      sql += ` WHERE ID_MODELO = :id`;

      await oracleService.executeQuery(sql, binds);
      return await this.getById(id);
    } catch (error) {
      console.error(`❌ Erro ao atualizar modelo de relatório ${id}:`, error);
      throw error;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      const sql = `UPDATE AD_RELATORIOS_MODELOS SET ATIVO = 'N' WHERE ID_MODELO = :id`;
      await oracleService.executeQuery(sql, { id });
      return true;
    } catch (error) {
      console.error(`❌ Erro ao desativar modelo de relatório ${id}:`, error);
      return false;
    }
  }
};
