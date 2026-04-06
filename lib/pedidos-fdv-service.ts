
import { oracleService } from './oracle-db';

export interface PedidoFDV {
  ID?: number;
  ID_EMPRESA: number;
  ORIGEM: 'RAPIDO' | 'LEAD' | 'OFFLINE';
  CODLEAD?: number;
  CORPO_JSON: any;
  STATUS: 'SUCESSO' | 'ERRO' | 'PENDENTE';
  NUNOTA?: number;
  ERRO?: string;
  TENTATIVAS: number;
  CODUSUARIO: number;
  NOME_USUARIO: string;
  DATA_CRIACAO?: Date;
  DATA_ULTIMA_TENTATIVA?: Date;
  STATUS_APROVACAO?: 'PENDENTE' | 'APROVADO' | 'REPROVADO' | 'NORMAL';
  ID_APROVADOR?: number;
  JUSTIFICATIVA?: string;
  VIOLACOES?: string;
}

export interface SolicitacaoAprovacao {
  ID_APROVACAO?: number;
  ID_PEDIDO_FDV: number;
  STATUS_APROVACAO: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
  ID_APROVADOR?: number;
  DATA_SOLICITACAO?: Date;
  DATA_ANALISE?: Date;
  JUSTIFICATIVA?: string;
  VIOLACOES?: string;
}

export const pedidosFDVService = {

  async registrarPedido(pedido: PedidoFDV): Promise<number> {
    try {
      const sql = `
        INSERT INTO AD_PEDIDOS_FDV (
          ID_EMPRESA,
          ORIGEM,
          CODLEAD,
          CORPO_JSON,
          STATUS,
          NUNOTA,
          ERRO,
          TENTATIVAS,
          CODUSUARIO,
          NOME_USUARIO,
          DATA_CRIACAO,
          DATA_ULTIMA_TENTATIVA
        ) VALUES (
          :idEmpresa,
          :origem,
          :codLead,
          :corpoJson,
          :status,
          :nunota,
          :erro,
          :tentativas,
          :codUsuario,
          :nomeUsuario,
          SYSTIMESTAMP,
          SYSTIMESTAMP
        ) RETURNING ID INTO :id
      `;

      const result = await oracleService.executeQuery(sql, {
        idEmpresa: pedido.ID_EMPRESA,
        origem: pedido.ORIGEM,
        codLead: pedido.CODLEAD || null,
        corpoJson: JSON.stringify(pedido.CORPO_JSON),
        status: pedido.STATUS,
        nunota: pedido.NUNOTA || null,
        erro: pedido.ERRO ? JSON.stringify(pedido.ERRO) : null,
        tentativas: pedido.TENTATIVAS,
        codUsuario: pedido.CODUSUARIO,
        nomeUsuario: pedido.NOME_USUARIO,
        id: { dir: oracleService.BIND_OUT, type: oracleService.NUMBER }
      });

      const idGerado = result.outBinds.id[0];
      console.log('✅ Pedido FDV registrado com ID:', idGerado);
      return idGerado;
    } catch (error) {
      console.error('❌ Erro ao registrar pedido FDV:', error);
      throw error;
    }
  },

  async atualizarStatus(id: number, status: 'SUCESSO' | 'ERRO', nunota?: number, erro?: string): Promise<void> {
    try {
      const sql = `
        UPDATE AD_PEDIDOS_FDV
        SET STATUS = :status,
            NUNOTA = :nunota,
            ERRO = :erro,
            TENTATIVAS = TENTATIVAS + 1,
            DATA_ULTIMA_TENTATIVA = SYSTIMESTAMP
        WHERE ID = :id
      `;

      await oracleService.executeQuery(sql, {
        id,
        status,
        nunota: nunota || null,
        erro: erro || null
      });

      console.log('✅ Status do pedido FDV atualizado:', id);
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }
  },

  async buscarPorId(id: number): Promise<PedidoFDV | null> {
    try {
      const sql = `
        SELECT 
          ID,
          ID_EMPRESA as "ID_EMPRESA",
          ORIGEM,
          CODLEAD,
          CORPO_JSON as "CORPO_JSON",
          STATUS,
          NUNOTA,
          ERRO,
          TENTATIVAS,
          CODUSUARIO,
          NOME_USUARIO as "NOME_USUARIO",
          DATA_CRIACAO as "DATA_CRIACAO",
          DATA_ULTIMA_TENTATIVA as "DATA_ULTIMA_TENTATIVA"
        FROM AD_PEDIDOS_FDV
        WHERE ID = :id
      `;

      const result = await oracleService.executeQuery<PedidoFDV>(sql, { id });

      if (result.length === 0) return null;

      const pedido = result[0];
      // Parse do JSON
      if (pedido.CORPO_JSON) {
        pedido.CORPO_JSON = JSON.parse(pedido.CORPO_JSON as any);
      }

      return pedido;
    } catch (error) {
      console.error('❌ Erro ao buscar pedido FDV:', error);
      throw error;
    }
  },

  async listarPedidosFDV(idEmpresa: number, filtros?: {
    origem?: any;
    status?: any;
    dataInicio?: string | Date;
    dataFim?: string | Date;
    parceiro?: string;
  }): Promise<PedidoFDV[]> {
    try {
      console.log('🔍 Iniciando busca de pedidos FDV para empresa:', idEmpresa);
      console.log('📋 Filtros recebidos:', filtros);

      let sql = `
        SELECT 
          ID,
          ID_EMPRESA as "ID_EMPRESA",
          ORIGEM,
          CODLEAD,
          CORPO_JSON as "CORPO_JSON",
          STATUS,
          NUNOTA,
          ERRO as "ERRO",
          TENTATIVAS,
          CODUSUARIO,
          NOME_USUARIO as "NOME_USUARIO",
          DATA_CRIACAO as "DATA_CRIACAO",
          DATA_ULTIMA_TENTATIVA as "DATA_ULTIMA_TENTATIVA"
        FROM AD_PEDIDOS_FDV
        WHERE ID_EMPRESA = :idEmpresa
      `;

      const binds: any = { idEmpresa };

      if (filtros?.origem && filtros.origem !== 'TODOS') {
        sql += ` AND ORIGEM = :origem`;
        binds.origem = filtros.origem;
      }

      if (filtros?.status && filtros.status !== 'TODOS') {
        sql += ` AND STATUS = :status`;
        binds.status = filtros.status;
      }

      if (filtros?.dataInicio) {
        sql += ` AND TRUNC(DATA_CRIACAO) >= TRUNC(:dataInicio)`;
        binds.dataInicio = typeof filtros.dataInicio === 'string' ? new Date(filtros.dataInicio) : filtros.dataInicio;
      }

      if (filtros?.dataFim) {
        sql += ` AND TRUNC(DATA_CRIACAO) <= TRUNC(:dataFim)`;
        binds.dataFim = typeof filtros.dataFim === 'string' ? new Date(filtros.dataFim) : filtros.dataFim;
      }

      if (filtros?.parceiro) {
        sql += ` AND (UPPER(DBMS_LOB.SUBSTR(CORPO_JSON, 4000, 1)) LIKE UPPER(:parceiro) OR UPPER(NOME_USUARIO) LIKE UPPER(:parceiro))`;
        binds.parceiro = `%${filtros.parceiro}%`;
      }

      sql += ` ORDER BY DATA_CRIACAO DESC`;

      console.log('📝 SQL gerado:', sql);
      console.log('🔢 Binds:', binds);

      const result = await oracleService.executeQuery<PedidoFDV>(sql, binds);

      console.log(`✅ ${result.length} registros encontrados no banco`);

      // Parse do JSON em cada registro e criar objeto limpo totalmente serializável
      const pedidos = await Promise.all(result.map(async (row: PedidoFDV) => {
        let corpoJson = null;
        if (row.CORPO_JSON && typeof row.CORPO_JSON === 'string') {
          try {
            corpoJson = JSON.parse(row.CORPO_JSON);
          } catch (e) {
            console.error('❌ Erro ao fazer parse do CORPO_JSON:', e);
            console.error('📄 Conteúdo do CORPO_JSON:', row.CORPO_JSON);
            corpoJson = row.CORPO_JSON;
          }
        }

        // Parse do campo ERRO - já vem como string devido ao fetchAsString
        let erroJson: any = undefined;
        if (row.ERRO) {
          const erroStr = String(row.ERRO);

          try {
            // Tentar fazer parse do JSON
            erroJson = JSON.parse(erroStr);
          } catch (e) {
            // Se falhar no parse, criar objeto com mensagem
            erroJson = { mensagem: erroStr };
          }
        }

        // Criar objeto completamente novo sem nenhuma referência do Oracle
        return {
          ID: Number(row.ID),
          ID_EMPRESA: Number(row.ID_EMPRESA),
          ORIGEM: String(row.ORIGEM),
          CODLEAD: row.CODLEAD ? Number(row.CODLEAD) : undefined,
          CORPO_JSON: corpoJson,
          STATUS: String(row.STATUS),
          NUNOTA: row.NUNOTA ? Number(row.NUNOTA) : undefined,
          ERRO: erroJson,
          TENTATIVAS: Number(row.TENTATIVAS),
          CODUSUARIO: Number(row.CODUSUARIO),
          NOME_USUARIO: String(row.NOME_USUARIO),
          DATA_CRIACAO: row.DATA_CRIACAO ? new Date(row.DATA_CRIACAO) : undefined,
          DATA_ULTIMA_TENTATIVA: row.DATA_ULTIMA_TENTATIVA ? new Date(row.DATA_ULTIMA_TENTATIVA) : undefined
        } as PedidoFDV;
      }));

      return pedidos;
    } catch (error) {
      console.error('❌ Erro ao listar pedidos FDV:', error);
      throw error;
    }
  },

  async registrarSolicitacaoAprovacao(aprovacao: SolicitacaoAprovacao): Promise<number> {
    try {
      const sql = `
        INSERT INTO AD_PEDIDOS_APROVACAO (
          ID_PEDIDO_FDV,
          STATUS_APROVACAO,
          ID_APROVADOR,
          DATA_SOLICITACAO,
          JUSTIFICATIVA,
          VIOLACOES
        ) VALUES (
          :idPedido,
          :status,
          :idAprovador,
          SYSTIMESTAMP,
          :justificativa,
          :violacoes
        ) RETURNING ID_APROVACAO INTO :id
      `;

      const result = await oracleService.executeQuery(sql, {
        idPedido: aprovacao.ID_PEDIDO_FDV,
        status: aprovacao.STATUS_APROVACAO,
        idAprovador: aprovacao.ID_APROVADOR || null,
        justificativa: aprovacao.JUSTIFICATIVA || null,
        violacoes: aprovacao.VIOLACOES || null,
        id: { dir: oracleService.BIND_OUT, type: oracleService.NUMBER }
      });

      return result.outBinds.id[0];
    } catch (error) {
      console.error('❌ Erro ao registrar aprovação:', error);
      throw error;
    }
  },

  async listarAprovacoesPendentes(idEmpresa: number): Promise<any[]> {
    try {
      const sql = `
        SELECT 
          A.ID_APROVACAO,
          A.ID_PEDIDO_FDV,
          A.STATUS_APROVACAO,
          A.DATA_SOLICITACAO,
          A.JUSTIFICATIVA,
          A.VIOLACOES,
          F.CORPO_JSON,
          F.NOME_USUARIO as NOME_VENDEDOR,
          F.ORIGEM
        FROM AD_PEDIDOS_APROVACAO A
        JOIN AD_PEDIDOS_FDV F ON A.ID_PEDIDO_FDV = F.ID
        WHERE F.ID_EMPRESA = :idEmpresa
          AND A.STATUS_APROVACAO = 'PENDENTE'
        ORDER BY A.DATA_SOLICITACAO DESC
      `;

      const result = await oracleService.executeQuery<any>(sql, { idEmpresa });

      return result.map((row: any) => ({
        ...row,
        CORPO_JSON: row.CORPO_JSON ? JSON.parse(row.CORPO_JSON) : null
      }));
    } catch (error) {
      console.error('❌ Erro ao listar aprovações:', error);
      throw error;
    }
  },

  async responderAprovacao(idAprovacao: number, status: 'APROVADO' | 'REPROVADO', idAprovador: number, justificativa?: string): Promise<void> {
    try {
      // 1. Iniciar transação/atualizar a tabela de aprovações
      const sqlAprov = `
        UPDATE AD_PEDIDOS_APROVACAO
        SET STATUS_APROVACAO = :status,
            ID_APROVADOR = :idAprovador,
            DATA_ANALISE = SYSTIMESTAMP,
            JUSTIFICATIVA = NVL(:justificativa, JUSTIFICATIVA)
        WHERE ID_APROVACAO = :idAprovacao
      `;

      await oracleService.executeQuery(sqlAprov, {
        idAprovacao,
        status,
        idAprovador,
        justificativa: justificativa || null
      });

      // 2. Se reprovado, marcar o pedido como ERRO (ou manter PENDENTE mas com status REPROVADO)
      // Se aprovado, o status do pedido na AD_PEDIDOS_FDV deve mudar de PENDENTE para outro
      // para que o sincronizador possa pegá-lo (ou o próprio responderAprovacao pode disparar a sync)

      const aprovacao = await oracleService.executeOne<any>(
        'SELECT ID_PEDIDO_FDV FROM AD_PEDIDOS_APROVACAO WHERE ID_APROVACAO = :id',
        { id: idAprovacao }
      );

      if (aprovacao) {
        const sqlPedido = `
          UPDATE AD_PEDIDOS_FDV
          SET STATUS = :novoStatus,
              STATUS_APROVACAO = :statusAprov,
              ID_APROVADOR = :idAprovador,
              DT_ANALISE = SYSDATE
          WHERE ID = :idPedido
        `;

        await oracleService.executeQuery(sqlPedido, {
          idPedido: aprovacao.ID_PEDIDO_FDV,
          novoStatus: status === 'APROVADO' ? 'SUCESSO' : 'ERRO', // SUCESSO aqui significa "Pronto para Sync"
          statusAprov: status,
          idAprovador: idAprovador
        });
      }

    } catch (error) {
      console.error('❌ Erro ao responder aprovação:', error);
      throw error;
    }
  }
};
