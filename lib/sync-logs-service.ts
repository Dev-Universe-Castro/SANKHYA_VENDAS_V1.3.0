
import { oracleService } from './oracle-db'

export interface SyncLog {
  id?: number
  idEmpresa: number
  userId: number
  userName: string
  tipoOperacao: 'PEDIDO' | 'PARCEIRO' | 'PRODUTO'
  status: 'SUCESSO' | 'ERRO' | 'PENDENTE'
  dadosEnviados: any
  resposta?: any
  erro?: string
  dataHora: Date
  numeroDocumento?: string
}

export const syncLogsService = {
  async registrarLog(log: SyncLog): Promise<void> {
    try {
      const sql = `
        INSERT INTO AD_LOGS_SINCRONIZACAO (
          ID_EMPRESA,
          CODUSUARIO,
          NOME_USUARIO,
          TIPO_OPERACAO,
          STATUS,
          DADOS_ENVIADOS,
          RESPOSTA,
          ERRO,
          DATA_HORA,
          NUMERO_DOCUMENTO
        ) VALUES (
          :idEmpresa,
          :userId,
          :userName,
          :tipoOperacao,
          :status,
          :dadosEnviados,
          :resposta,
          :erro,
          SYSDATE,
          :numeroDocumento
        )
      `

      await oracleService.executeQuery(sql, {
        idEmpresa: log.idEmpresa,
        userId: log.userId,
        userName: log.userName,
        tipoOperacao: log.tipoOperacao,
        status: log.status,
        dadosEnviados: JSON.stringify(log.dadosEnviados),
        resposta: log.resposta ? JSON.stringify(log.resposta) : null,
        erro: log.erro || null,
        numeroDocumento: log.numeroDocumento || null
      })

      console.log('✅ Log de sincronização registrado')
    } catch (error) {
      console.error('❌ Erro ao registrar log:', error)
    }
  },

  async buscarLogs(idEmpresa: number, filtros?: {
    dataInicio?: Date
    dataFim?: Date
    status?: string
    userId?: number
  }): Promise<SyncLog[]> {
    try {
      let sql = `
        SELECT 
          ID,
          ID_EMPRESA as "idEmpresa",
          CODUSUARIO as "userId",
          NOME_USUARIO as "userName",
          TIPO_OPERACAO as "tipoOperacao",
          STATUS as "status",
          DADOS_ENVIADOS as "dadosEnviados",
          RESPOSTA as "resposta",
          ERRO as "erro",
          DATA_HORA as "dataHora",
          NUMERO_DOCUMENTO as "numeroDocumento"
        FROM AD_LOGS_SINCRONIZACAO
        WHERE ID_EMPRESA = :idEmpresa
      `

      const binds: any = { idEmpresa }

      if (filtros?.dataInicio) {
        sql += ` AND DATA_HORA >= :dataInicio`
        binds.dataInicio = filtros.dataInicio
      }

      if (filtros?.dataFim) {
        sql += ` AND DATA_HORA <= :dataFim`
        binds.dataFim = filtros.dataFim
      }

      if (filtros?.status) {
        sql += ` AND STATUS = :status`
        binds.status = filtros.status
      }

      if (filtros?.userId) {
        sql += ` AND CODUSUARIO = :userId`
        binds.userId = filtros.userId
      }

      sql += ` ORDER BY DATA_HORA DESC`

      const logs = await oracleService.executeQuery(sql, binds)

      return logs.map((log: any) => ({
        ...log,
        dadosEnviados: log.dadosEnviados ? JSON.parse(log.dadosEnviados) : null,
        resposta: log.resposta ? JSON.parse(log.resposta) : null
      }))
    } catch (error) {
      console.error('❌ Erro ao buscar logs:', error)
      return []
    }
  }
}
