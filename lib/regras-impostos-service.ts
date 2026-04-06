import { oracleService } from './oracle-db'

export interface RegraImposto {
  ID_REGRA?: number
  ID_SISTEMA: number
  NOME: string
  DESCRICAO?: string
  NOTA_MODELO: number
  CODIGO_EMPRESA: number
  FINALIDADE_OPERACAO: number
  CODIGO_NATUREZA: number
  ATIVO: string
  DATA_CRIACAO?: Date
  DATA_ATUALIZACAO?: Date
}

export const regrasImpostosService = {
  async listarPorEmpresa(idEmpresa: number): Promise<RegraImposto[]> {
    const sql = `
      SELECT 
        ID_REGRA, ID_SISTEMA, NOME, DESCRICAO, NOTA_MODELO, 
        CODIGO_EMPRESA, FINALIDADE_OPERACAO, CODIGO_NATUREZA, ATIVO
      FROM AS_REGRAS_IMPOSTOS
      WHERE ID_SISTEMA = :idEmpresa
        AND ATIVO = 'S'
      ORDER BY NOME
    `
    const result = await oracleService.executeQuery(sql, { idEmpresa });

    // Normalização de chaves para evitar problemas com case do Oracle
    return (result || []).map((r: any) => ({
      ID_REGRA: r.ID_REGRA || r.id_regra,
      ID_SISTEMA: r.ID_SISTEMA || r.id_sistema,
      NOME: r.NOME || r.nome,
      DESCRICAO: r.DESCRICAO || r.descricao,
      NOTA_MODELO: r.NOTA_MODELO || r.nota_modelo,
      CODIGO_EMPRESA: r.CODIGO_EMPRESA || r.codigo_empresa,
      FINALIDADE_OPERACAO: r.FINALIDADE_OPERACAO || r.finalidade_operacao,
      CODIGO_NATUREZA: r.CODIGO_NATUREZA || r.codigo_natureza,
      ATIVO: r.ATIVO || r.ativo || 'S'
    }));
  },

  async criar(regra: RegraImposto): Promise<number> {
    const sql = `
      INSERT INTO AS_REGRAS_IMPOSTOS (
        ID_SISTEMA, NOME, DESCRICAO, NOTA_MODELO, 
        CODIGO_EMPRESA, FINALIDADE_OPERACAO, CODIGO_NATUREZA, ATIVO
      ) VALUES (
        :idSistema, :nome, :descricao, :notaModelo, 
        :codigoEmpresa, :finalidadeOperacao, :codigoNatureza, 'S'
      ) RETURNING ID_REGRA INTO :idRegra
    `
    const binds = {
      idSistema: regra.ID_SISTEMA,
      nome: regra.NOME,
      descricao: regra.DESCRICAO || null,
      notaModelo: regra.NOTA_MODELO,
      codigoEmpresa: regra.CODIGO_EMPRESA,
      finalidadeOperacao: regra.FINALIDADE_OPERACAO,
      codigoNatureza: regra.CODIGO_NATUREZA,
      idRegra: { dir: oracleService.BIND_OUT, type: oracleService.NUMBER }
    }
    const result = await oracleService.executeQuery(sql, binds)
    return result.outBinds?.idRegra?.[0] || 0
  },

  async atualizar(idRegra: number, regra: Partial<RegraImposto>, idEmpresa: number): Promise<boolean> {
    const campos = []
    const binds: any = { idRegra, idEmpresa }

    if (regra.NOME !== undefined) { campos.push('NOME = :nome'); binds.nome = regra.NOME }
    if (regra.DESCRICAO !== undefined) { campos.push('DESCRICAO = :descricao'); binds.descricao = regra.DESCRICAO || null }
    if (regra.NOTA_MODELO !== undefined) { campos.push('NOTA_MODELO = :notaModelo'); binds.notaModelo = regra.NOTA_MODELO }
    if (regra.CODIGO_EMPRESA !== undefined) { campos.push('CODIGO_EMPRESA = :codigoEmpresa'); binds.codigoEmpresa = regra.CODIGO_EMPRESA }
    if (regra.FINALIDADE_OPERACAO !== undefined) { campos.push('FINALIDADE_OPERACAO = :finalidadeOperacao'); binds.finalidadeOperacao = regra.FINALIDADE_OPERACAO }
    if (regra.CODIGO_NATUREZA !== undefined) { campos.push('CODIGO_NATUREZA = :codigoNatureza'); binds.codigoNatureza = regra.CODIGO_NATUREZA }

    if (campos.length === 0) return false

    const sql = `
      UPDATE AS_REGRAS_IMPOSTOS
      SET ${campos.join(', ')}
      WHERE ID_REGRA = :idRegra AND ID_SISTEMA = :idEmpresa
    `
    const result = await oracleService.executeQuery(sql, binds)
    return (result.rowsAffected || 0) > 0
  },

  async desativar(idRegra: number, idEmpresa: number): Promise<boolean> {
    const sql = `UPDATE AS_REGRAS_IMPOSTOS SET ATIVO = 'N' WHERE ID_REGRA = :idRegra AND ID_SISTEMA = :idEmpresa`
    const result = await oracleService.executeQuery(sql, { idRegra, idEmpresa })
    return (result.rowsAffected || 0) > 0
  }
}
