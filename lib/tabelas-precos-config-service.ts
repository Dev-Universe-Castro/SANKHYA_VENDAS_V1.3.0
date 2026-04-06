
import { oracleService } from './oracle-db'

export interface TabelaPrecoConfig {
  CODCONFIG?: number
  ID_EMPRESA: number
  CODUSUARIO_CRIADOR: number
  NUTAB: number
  CODTAB: string
  DESCRICAO?: string
  ATIVO?: string
  DATA_CRIACAO?: Date
  DATA_ATUALIZACAO?: Date
}

export const tabelasPrecosConfigService = {
  // Listar tabelas de preços configuradas por empresa
  async listarPorEmpresa(idEmpresa: number): Promise<TabelaPrecoConfig[]> {
    const sql = `
      SELECT 
        CODCONFIG,
        ID_EMPRESA,
        CODUSUARIO_CRIADOR,
        NUTAB,
        CODTAB,
        DESCRICAO,
        ATIVO,
        DATA_CRIACAO,
        DATA_ATUALIZACAO
      FROM AD_TABELASPRECOSCONFIG
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
      ORDER BY CODTAB
    `

    return await oracleService.executeQuery(sql, { idEmpresa })
  },

  // Buscar configuração por código
  async buscarPorCodigo(codConfig: number, idEmpresa: number): Promise<TabelaPrecoConfig | null> {
    const sql = `
      SELECT 
        CODCONFIG,
        ID_EMPRESA,
        CODUSUARIO_CRIADOR,
        NUTAB,
        CODTAB,
        DESCRICAO,
        ATIVO,
        DATA_CRIACAO,
        DATA_ATUALIZACAO
      FROM AD_TABELASPRECOSCONFIG
      WHERE CODCONFIG = :codConfig
        AND ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
    `

    const resultado = await oracleService.executeQuery(sql, { codConfig, idEmpresa })
    return resultado.length > 0 ? resultado[0] : null
  },

  // Criar nova configuração de tabela de preços
  async criar(config: TabelaPrecoConfig): Promise<number> {
    console.log('🔍 Dados recebidos para criar configuração:', {
      ID_EMPRESA: config.ID_EMPRESA,
      CODUSUARIO_CRIADOR: config.CODUSUARIO_CRIADOR,
      NUTAB: config.NUTAB,
      CODTAB: config.CODTAB,
      DESCRICAO: config.DESCRICAO
    })

    const sql = `
      INSERT INTO AD_TABELASPRECOSCONFIG (
        ID_EMPRESA,
        CODUSUARIO_CRIADOR,
        NUTAB,
        CODTAB,
        DESCRICAO,
        ATIVO
      ) VALUES (
        :idEmpresa,
        :codUsuarioCriador,
        :nutab,
        :codtab,
        :descricao,
        'S'
      ) RETURNING CODCONFIG INTO :codConfig
    `

    const binds = {
      idEmpresa: config.ID_EMPRESA,
      codUsuarioCriador: config.CODUSUARIO_CRIADOR,
      nutab: config.NUTAB,
      codtab: config.CODTAB,
      descricao: config.DESCRICAO || null,
      codConfig: { dir: oracleService.BIND_OUT, type: oracleService.NUMBER }
    }

    console.log('🔍 Binds para INSERT:', binds)

    const resultado = await oracleService.executeQuery(sql, binds)
    return resultado.outBinds?.codConfig?.[0] || 0
  },

  // Atualizar configuração
  async atualizar(codConfig: number, config: Partial<TabelaPrecoConfig>, idEmpresa: number): Promise<boolean> {
    const campos = []
    const binds: any = { codConfig, idEmpresa }

    if (config.DESCRICAO !== undefined) {
      campos.push('DESCRICAO = :descricao')
      binds.descricao = config.DESCRICAO || null
    }

    if (config.NUTAB !== undefined) {
      campos.push('NUTAB = :nutab')
      binds.nutab = config.NUTAB
    }

    if (config.CODTAB !== undefined) {
      campos.push('CODTAB = :codtab')
      binds.codtab = config.CODTAB
    }

    if (campos.length === 0) {
      console.log('⚠️ Nenhum campo para atualizar')
      return false
    }

    campos.push('DATA_ATUALIZACAO = SYSDATE')

    const sql = `
      UPDATE AD_TABELASPRECOSCONFIG
      SET ${campos.join(', ')}
      WHERE CODCONFIG = :codConfig
        AND ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
    `

    const resultado = await oracleService.executeQuery(sql, binds)
    return (resultado.rowsAffected || 0) > 0
  },

  // Desativar configuração
  async desativar(codConfig: number, idEmpresa: number): Promise<boolean> {
    const sql = `
      UPDATE AD_TABELASPRECOSCONFIG
      SET ATIVO = 'N'
      WHERE CODCONFIG = :codConfig
        AND ID_EMPRESA = :idEmpresa
    `

    const resultado = await oracleService.executeQuery(sql, { codConfig, idEmpresa })
    return resultado.rowsAffected > 0
  }
}
