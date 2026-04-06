import { oracleService } from './oracle-db';

export interface Lead {
  CODLEAD: string
  ID_EMPRESA: number
  NOME: string
  DESCRICAO: string
  VALOR: number
  ESTAGIO: string
  CODESTAGIO: string
  CODFUNIL: string
  DATA_VENCIMENTO: string
  TIPO_TAG: string
  COR_TAG: string
  CODPARC?: string
  NOMEPARC?: string
  CODUSUARIO?: number
  ATIVO: string
  DATA_CRIACAO: string
  DATA_ATUALIZACAO: string
  STATUS_LEAD?: 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO'
  MOTIVO_PERDA?: string
  DATA_CONCLUSAO?: string
}

export interface LeadProduto {
  CODITEM?: string
  CODLEAD: string
  ID_EMPRESA: number
  CODPROD: number
  DESCRPROD: string
  QUANTIDADE: number
  VLRUNIT: number
  VLRTOTAL: number
  ATIVO?: string
  DATA_INCLUSAO?: string
  CODVOL?: string
  PERCDESC?: number
}

export interface LeadAtividade {
  CODATIVIDADE: string
  CODLEAD: string
  ID_EMPRESA: number
  TIPO: 'LIGACAO' | 'EMAIL' | 'REUNIAO' | 'VISITA' | 'PEDIDO' | 'CLIENTE' | 'NOTA' | 'WHATSAPP' | 'PROPOSTA'
  TITULO: string
  DESCRICAO: string
  DATA_HORA: string
  DATA_INICIO: string
  DATA_FIM: string
  CODUSUARIO: number
  DADOS_COMPLEMENTARES?: string
  NOME_USUARIO?: string
  COR?: string
  ORDEM?: number
  ATIVO?: string
  STATUS?: 'AGUARDANDO' | 'ATRASADO' | 'REALIZADO'
  CODPARC?: string
}

// ==================== LEADS ====================

export async function consultarLeads(
  idEmpresa: number,
  codUsuario?: number,
  isAdmin: boolean = false,
  dataInicio?: string,
  dataFim?: string,
  codVendedor?: number,
  vendedoresEquipe?: number[],
  codFunil?: string,
  codParc?: string
): Promise<Lead[]> {
  console.log('🔍 [Oracle] Consultando leads:', { idEmpresa, codUsuario, isAdmin, dataInicio, dataFim, codVendedor, vendedoresEquipe, codFunil, codParc });

  try {
    let sql = `
      SELECT 
        TO_CHAR(CODLEAD) AS CODLEAD,
        ID_EMPRESA,
        NOME,
        DESCRICAO,
        VALOR,
        TO_CHAR(CODESTAGIO) AS CODESTAGIO,
        TO_CHAR(CODFUNIL) AS CODFUNIL,
        TO_CHAR(DATA_VENCIMENTO, 'DD/MM/YYYY') AS DATA_VENCIMENTO,
        TIPO_TAG,
        COR_TAG,
        CODPARC,
        CODUSUARIO,
        ATIVO,
        TO_CHAR(DATA_CRIACAO, 'DD/MM/YYYY') AS DATA_CRIACAO,
        TO_CHAR(DATA_ATUALIZACAO, 'DD/MM/YYYY') AS DATA_ATUALIZACAO,
        STATUS_LEAD,
        MOTIVO_PERDA,
        TO_CHAR(DATA_CONCLUSAO, 'DD/MM/YYYY') AS DATA_CONCLUSAO
      FROM AD_LEADS
      WHERE ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
    `;

    const params: any = { idEmpresa };

    // Controle de acesso baseado no perfil
    if (!isAdmin) {
      if (vendedoresEquipe && vendedoresEquipe.length > 0) {
        // Gerente: ver leads seus e da equipe
        const allVendedores = [codVendedor, ...vendedoresEquipe].filter(Boolean);
        console.log('👥 [Oracle] Filtro de equipe - Vendedores permitidos:', allVendedores);
        sql += ` AND CODUSUARIO IN (
          SELECT CODUSUARIO FROM AD_USUARIOSVENDAS 
          WHERE CODVEND IN (${allVendedores.join(',')})
        )`;
      } else if (codUsuario) {
        // Vendedor: ver apenas seus leads
        console.log('👤 [Oracle] Filtro individual - CODUSUARIO:', codUsuario);
        sql += ` AND CODUSUARIO = :codUsuario`;
        params.codUsuario = codUsuario;
      }
    } else {
      console.log('👑 [Oracle] Admin - SEM filtro de usuário');
    }

    // Filtros de data
    if (dataInicio) {
      sql += ` AND DATA_CRIACAO >= TO_DATE(:dataInicio, 'YYYY-MM-DD')`;
      params.dataInicio = dataInicio;
      console.log('📅 [Oracle] Filtro DATA_CRIACAO >=', dataInicio);
    }

    if (dataFim) {
      sql += ` AND DATA_CRIACAO <= TO_DATE(:dataFim, 'YYYY-MM-DD')`;
      params.dataFim = dataFim;
      console.log('📅 [Oracle] Filtro DATA_CRIACAO <=', dataFim);
    }

    // Filtro por funil
    if (codFunil) {
      sql += ` AND CODFUNIL = :codFunil`;
      params.codFunil = codFunil;
      console.log('🎯 [Oracle] Filtro CODFUNIL =', codFunil);
    }

    // Filtro por parceiro
    if (codParc) {
      sql += ` AND CODPARC = :codParc`;
      params.codParc = codParc;
      console.log('👥 [Oracle] Filtro CODPARC =', codParc);
    }

    sql += ` ORDER BY DATA_CRIACAO DESC`;

    console.log('📝 [Oracle] SQL Final:', sql);
    console.log('🔧 [Oracle] Params:', params);

    const result = await oracleService.executeQuery<Lead>(sql, params);
    console.log(`✅ [Oracle] ${result.length} leads encontrados`);

    return result;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao consultar leads:', error);
    throw error;
  }
}

export async function salvarLead(lead: Partial<Lead>, idEmpresa: number, codUsuarioCriador?: number): Promise<Lead> {
  console.log('💾 [Oracle] Salvando lead:', { lead, idEmpresa, codUsuarioCriador });

  try {
    const isUpdate = !!lead.CODLEAD;

    if (isUpdate) {
      // Atualizar lead existente

      // Converter data de YYYY-MM-DD para DD/MM/YYYY se necessário
      let dataVencimentoFormatada = lead.DATA_VENCIMENTO;
      if (dataVencimentoFormatada && dataVencimentoFormatada.includes('-')) {
        const [ano, mes, dia] = dataVencimentoFormatada.split('-');
        dataVencimentoFormatada = `${dia}/${mes}/${ano}`;
      }

      const sql = `
        UPDATE AD_LEADS
        SET NOME = :nome,
            DESCRICAO = :descricao,
            VALOR = :valor,
            CODESTAGIO = :codEstagio,
            CODFUNIL = :codFunil,
            DATA_VENCIMENTO = ${dataVencimentoFormatada ? "TO_DATE(:dataVencimento, 'DD/MM/YYYY')" : 'NULL'},
            TIPO_TAG = :tipoTag,
            COR_TAG = :COR_TAG,
            CODPARC = :CODPARC
        WHERE CODLEAD = :codLead
          AND ID_EMPRESA = :idEmpresa
      `;

      const params: any = {
        nome: lead.NOME,
        descricao: lead.DESCRICAO || null,
        valor: lead.VALOR || 0,
        codEstagio: lead.CODESTAGIO || null,
        codFunil: lead.CODFUNIL || null,
        tipoTag: lead.TIPO_TAG || null,
        corTag: lead.COR_TAG || '#3b82f6',
        CODPARC: lead.CODPARC || null,
        codLead: lead.CODLEAD,
        idEmpresa
      };

      if (dataVencimentoFormatada) {
        params.dataVencimento = dataVencimentoFormatada;
      }

      await oracleService.executeQuery(sql, params);

      console.log(`✅ [Oracle] Lead ${lead.CODLEAD} atualizado`);

      // Buscar lead atualizado
      const leadAtualizado = await oracleService.executeOne<Lead>(
        `SELECT * FROM AD_LEADS WHERE CODLEAD = :codLead`,
        { codLead: lead.CODLEAD }
      );

      return leadAtualizado!;

    } else {
      // Inserir novo lead

      // Converter data de YYYY-MM-DD para DD/MM/YYYY se necessário
      let dataVencimentoFormatada = lead.DATA_VENCIMENTO;
      if (dataVencimentoFormatada && dataVencimentoFormatada.includes('-')) {
        const [ano, mes, dia] = dataVencimentoFormatada.split('-');
        dataVencimentoFormatada = `${dia}/${mes}/${ano}`;
      }

      const sql = `
        INSERT INTO AD_LEADS (
          ID_EMPRESA, NOME, DESCRICAO, VALOR, CODESTAGIO, CODFUNIL,
          DATA_VENCIMENTO, TIPO_TAG, COR_TAG, CODPARC, CODUSUARIO,
          ATIVO, STATUS_LEAD
        ) VALUES (
          :idEmpresa, :nome, :descricao, :valor, :codEstagio, :codFunil,
          ${dataVencimentoFormatada ? "TO_DATE(:dataVencimento, 'DD/MM/YYYY')" : 'NULL'}, :tipoTag, :corTag, :CODPARC,
          :codUsuario, 'S', 'EM_ANDAMENTO'
        )
      `;

      const params: any = {
        idEmpresa,
        nome: lead.NOME,
        descricao: lead.DESCRICAO || null,
        valor: lead.VALOR || 0,
        codEstagio: lead.CODESTAGIO || null,
        codFunil: lead.CODFUNIL || null,
        tipoTag: lead.TIPO_TAG || null,
        corTag: lead.COR_TAG || '#3b82f6',
        CODPARC: lead.CODPARC || null,
        codUsuario: codUsuarioCriador || null
      };

      if (dataVencimentoFormatada) {
        params.dataVencimento = dataVencimentoFormatada;
      }

      console.log('📅 Data formatada para Oracle:', dataVencimentoFormatada);
      console.log('🔍 Params enviados:', params);

      await oracleService.executeQuery(sql, params);

      console.log(`✅ [Oracle] Novo lead criado`);

      // Buscar último lead criado
      const novoLead = await oracleService.executeOne<Lead>(
        `SELECT * FROM AD_LEADS WHERE ID_EMPRESA = :idEmpresa ORDER BY CODLEAD DESC FETCH FIRST 1 ROWS ONLY`,
        { idEmpresa }
      );

      return novoLead!;
    }

  } catch (error) {
    console.error('❌ [Oracle] Erro ao salvar lead:', error);
    throw error;
  }
}

export async function atualizarEstagioLead(codLead: string, novoEstagio: string, idEmpresa: number): Promise<Lead | undefined> {
  console.log('🔄 [Oracle] Atualizando estágio do lead:', { codLead, novoEstagio, idEmpresa });

  try {
    const sql = `
      UPDATE AD_LEADS
      SET CODESTAGIO = :novoEstagio
      WHERE CODLEAD = :codLead
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { novoEstagio, codLead, idEmpresa });
    console.log(`✅ [Oracle] Estágio do lead ${codLead} atualizado`);

    // Buscar lead atualizado
    const leadAtualizado = await oracleService.executeOne<Lead>(
      `SELECT * FROM AD_LEADS WHERE CODLEAD = :codLead`,
      { codLead }
    );

    return leadAtualizado!;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao atualizar estágio:', error);
    throw error;
  }
}

export async function deletarLead(codLead: string, idEmpresa: number): Promise<void> {
  console.log('🗑️ [Oracle] Deletando lead:', { codLead, idEmpresa });

  try {
    const sql = `
      UPDATE AD_LEADS
      SET ATIVO = 'N'
      WHERE CODLEAD = :codLead
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { codLead, idEmpresa });
    console.log(`✅ [Oracle] Lead ${codLead} deletado`);

  } catch (error) {
    console.error('❌ [Oracle] Erro ao deletar lead:', error);
    throw error;
  }
}

// ==================== PRODUTOS DOS LEADS ====================

export async function consultarProdutosLead(codLead: string, idEmpresa: number): Promise<LeadProduto[]> {
  console.log('🔍 [Oracle] Consultando produtos do lead:', { codLead, idEmpresa });

  try {
    const sql = `
      SELECT 
        CODITEM,
        CODLEAD,
        ID_EMPRESA,
        CODPROD,
        DESCRPROD,
        QUANTIDADE,
        VLRUNIT,
        VLRTOTAL,
        ATIVO,
        TO_CHAR(DATA_INCLUSAO, 'DD/MM/YYYY') AS DATA_INCLUSAO,
        CODVOL,
        PERCDESC
      FROM AD_ADLEADSPRODUTOS
      WHERE CODLEAD = :codLead
        AND ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
    `;

    const result = await oracleService.executeQuery<LeadProduto>(sql, { codLead, idEmpresa });
    console.log(`✅ [Oracle] ${result.length} produtos encontrados`);
    return result;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao consultar produtos do lead:', error);
    throw error;
  }
}

export async function adicionarProdutoLead(produto: Omit<LeadProduto, 'CODITEM' | 'DATA_INCLUSAO'>, idEmpresa: number): Promise<LeadProduto> {
  console.log('➕ [Oracle] Adicionando produto ao lead:', { produto, idEmpresa });

  try {
    const sql = `
      INSERT INTO AD_ADLEADSPRODUTOS (
        CODLEAD, ID_EMPRESA, CODPROD, DESCRPROD, QUANTIDADE, VLRUNIT, VLRTOTAL, ATIVO, CODVOL, PERCDESC
      ) VALUES (
        :codLead, :idEmpresa, :codProd, :descrProd, :quantidade, :vlrUnit, :vlrTotal, 'S', :codVol, :percdesc
      )
    `;

    await oracleService.executeQuery(sql, {
      codLead: produto.CODLEAD,
      idEmpresa,
      codProd: produto.CODPROD,
      descrProd: produto.DESCRPROD,
      quantidade: produto.QUANTIDADE,
      vlrUnit: produto.VLRUNIT,
      vlrTotal: produto.VLRTOTAL,
      codVol: (produto as any).CODVOL || 'UN',
      percdesc: (produto as any).PERCDESC || 0
    });

    console.log(`✅ [Oracle] Produto adicionado ao lead`);

    // Atualizar valor total do lead
    const totalResult = await oracleService.executeOne<{ TOTAL: number }>(
      `SELECT NVL(SUM(VLRTOTAL), 0) AS TOTAL FROM AD_ADLEADSPRODUTOS WHERE CODLEAD = :codLead AND ID_EMPRESA = :idEmpresa AND ATIVO = 'S'`,
      { codLead: produto.CODLEAD, idEmpresa }
    );

    const novoValorTotal = totalResult?.TOTAL || 0;

    await oracleService.executeQuery(
      `UPDATE AD_LEADS SET VALOR = :valor WHERE CODLEAD = :codLead AND ID_EMPRESA = :idEmpresa`,
      { valor: novoValorTotal, codLead: produto.CODLEAD, idEmpresa }
    );

    // Buscar o produto recém-criado
    const produtos = await consultarProdutosLead(produto.CODLEAD, idEmpresa);
    return produtos[produtos.length - 1];

  } catch (error) {
    console.error('❌ [Oracle] Erro ao adicionar produto ao lead:', error);
    throw error;
  }
}

export async function removerProdutoLead(codItem: string, codLead: string, idEmpresa: number): Promise<{ novoValorTotal: number }> {
  console.log('➖ [Oracle] Removendo produto do lead:', { codItem, codLead, idEmpresa });

  try {
    // Inativar produto
    await oracleService.executeQuery(
      `UPDATE AD_ADLEADSPRODUTOS SET ATIVO = 'N' WHERE CODITEM = :codItem AND ID_EMPRESA = :idEmpresa`,
      { codItem, idEmpresa }
    );

    // Recalcular valor total
    const totalResult = await oracleService.executeOne<{ TOTAL: number }>(
      `SELECT NVL(SUM(VLRTOTAL), 0) AS TOTAL FROM AD_ADLEADSPRODUTOS WHERE CODLEAD = :codLead AND ID_EMPRESA = :idEmpresa AND ATIVO = 'S'`,
      { codLead, idEmpresa }
    );

    const novoValorTotal = totalResult?.TOTAL || 0;

    // Atualizar valor do lead
    await oracleService.executeQuery(
      `UPDATE AD_LEADS SET VALOR = :valor WHERE CODLEAD = :codLead AND ID_EMPRESA = :idEmpresa`,
      { valor: novoValorTotal, codLead, idEmpresa }
    );

    console.log(`✅ [Oracle] Produto removido e valor atualizado`);
    return { novoValorTotal };

  } catch (error) {
    console.error('❌ [Oracle] Erro ao remover produto do lead:', error);
    throw error;
  }
}

// ==================== ATIVIDADES DOS LEADS ====================

export async function consultarAtividades(
  codLead: string | number = '',
  idEmpresa: number = 1,
  ativo: string = 'S',
  codUsuario?: number,
  usuariosPermitidos?: number[],
  isAdminByCookie: boolean = false,
  dataInicio?: string,
  dataFim?: string
): Promise<any[]> {
  console.log('🔍 [Oracle] Consultando atividades:', { codLead, idEmpresa, ativo, codUsuario, usuariosPermitidos, isAdminByCookie, dataInicio, dataFim });

  let query = `
      SELECT 
        a.CODATIVIDADE,
        a.CODLEAD,
        a.TIPO,
        a.TITULO,
        a.DESCRICAO,
        TO_CHAR(a.DATA_HORA, 'DD/MM/YYYY HH24:MI:SS') AS DATA_HORA,
        TO_CHAR(a.DATA_INICIO, 'DD/MM/YYYY HH24:MI:SS') AS DATA_INICIO,
        TO_CHAR(a.DATA_FIM, 'DD/MM/YYYY HH24:MI:SS') AS DATA_FIM,
        a.COR,
        a.ATIVO,
        a.DADOS_COMPLEMENTARES,
        a.STATUS,
        TO_CHAR(a.DATA_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DATA_CRIACAO,
        a.CODUSUARIO,
        a.CODPARC,
        u.NOME AS NOME_USUARIO,
        p.NOMEPARC
      FROM AD_ADLEADSATIVIDADES a
      LEFT JOIN AD_USUARIOSVENDAS u ON a.CODUSUARIO = u.CODUSUARIO AND a.ID_EMPRESA = u.ID_EMPRESA
      LEFT JOIN AS_PARCEIROS p ON a.CODPARC = p.CODPARC AND a.ID_EMPRESA = p.ID_SISTEMA AND p.SANKHYA_ATUAL = 'S'
      WHERE a.ID_EMPRESA = :idEmpresa
        AND a.ATIVO = :ativo
    `;

  const params: any = { idEmpresa, ativo };

  if (codLead && codLead !== 'all' && codLead !== '') {
    query += ` AND a.CODLEAD = :codLead`;
    params.codLead = codLead;
  }

  if (dataInicio) {
    query += ` AND a.DATA_INICIO >= TO_DATE(:dataInicio, 'YYYY-MM-DD')`;
    params.dataInicio = dataInicio;
  }

  if (dataFim) {
    query += ` AND a.DATA_INICIO <= TO_DATE(:dataFim, 'YYYY-MM-DD') + 0.99999`;
    params.dataFim = dataFim;
  }

  // Lógica de filtragem por usuário
  if (!isAdminByCookie) {
    if (usuariosPermitidos && usuariosPermitidos.length > 0) {
      query += ` AND a.CODUSUARIO IN (${usuariosPermitidos.join(',')})`;
      console.log(`🔐 Filtrando atividades para usuários: ${usuariosPermitidos.join(', ')}`);
    } else if (codUsuario && codUsuario !== 0 && Number(codUsuario) !== 0) {
      query += ` AND a.CODUSUARIO = :codUsuario`;
      params.codUsuario = codUsuario;
    }
  } else {
    console.log('🔓 Sem filtro de usuário para atividades (Admin)');
  }

  query += ` ORDER BY a.DATA_INICIO ASC, a.DATA_HORA DESC`;

  console.log('📝 [Oracle] SQL Final:', query);
  console.log('🔧 [Oracle] Binds Finais:', params);

  const result = await oracleService.executeQuery<any>(query, params);
  console.log('📊 [Oracle] Rows retornadas:', result.length);

  const atividades = (result || []).map((row: any) => {
    let dadosComplementares: any = {};
    try {
      if (row.DADOS_COMPLEMENTARES) {
        const content = typeof row.DADOS_COMPLEMENTARES === 'string'
          ? row.DADOS_COMPLEMENTARES.trim()
          : row.DADOS_COMPLEMENTARES;

        if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
          dadosComplementares = JSON.parse(content);
        } else {
          dadosComplementares = { nota: content };
        }
      }
    } catch (e) {
      console.warn('⚠️ Erro ao parsear DADOS_COMPLEMENTARES:', e);
      dadosComplementares = { bruto: row.DADOS_COMPLEMENTARES };
    }

    const converterDataOracleParaISO = (dataOracle: string) => {
      if (!dataOracle) return new Date().toISOString();
      try {
        const partes = dataOracle.split(' ');
        const [dia, mes, ano] = partes[0].split('/');
        const hora = partes[1] || '00:00:00';
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${hora}`;
      } catch (e) {
        return new Date().toISOString();
      }
    };

    return {
      CODATIVIDADE: row.CODATIVIDADE?.toString() || '',
      CODLEAD: row.CODLEAD?.toString() || '',
      TIPO: row.TIPO || 'TAREFA',
      TITULO: row.TITULO || '',
      DESCRICAO: row.DESCRICAO || '',
      DATA_HORA: converterDataOracleParaISO(row.DATA_HORA),
      DATA_INICIO: converterDataOracleParaISO(row.DATA_INICIO),
      DATA_FIM: converterDataOracleParaISO(row.DATA_FIM),
      CODUSUARIO: row.CODUSUARIO,
      DADOS_COMPLEMENTARES: dadosComplementares,
      NOME_USUARIO: row.NOME_USUARIO || '',
      NOMEPARC: row.NOMEPARC || '',
      CODPARC: row.CODPARC,
      COR: row.COR || '#22C55E',
      ATIVO: row.ATIVO || 'S',
      STATUS: row.STATUS || 'AGUARDANDO'
    };
  });

  return atividades;
}


export async function criarAtividade(atividade: Partial<LeadAtividade>, idEmpresa: number): Promise<LeadAtividade> {
  console.log('➕ [Oracle] Criando atividade:', { atividade, idEmpresa });

  try {
    // Buscar maior ordem
    const ordemResult = await oracleService.executeOne<{ ORDEM: number }>(
      atividade.CODLEAD
        ? `SELECT NVL(MAX(ORDEM), 0) AS ORDEM FROM AD_ADLEADSATIVIDADES WHERE CODLEAD = :codLead AND ID_EMPRESA = :idEmpresa`
        : `SELECT NVL(MAX(ORDEM), 0) AS ORDEM FROM AD_ADLEADSATIVIDADES WHERE ID_EMPRESA = :idEmpresa`,
      atividade.CODLEAD ? { codLead: atividade.CODLEAD, idEmpresa } : { idEmpresa }
    );

    const novaOrdem = (ordemResult?.ORDEM || 0) + 1;

    // Determinar status
    const dataInicio = atividade.DATA_INICIO ? new Date(atividade.DATA_INICIO) : new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataInicio.setHours(0, 0, 0, 0);
    const statusInicial = dataInicio < hoje ? 'ATRASADO' : 'AGUARDANDO';

    // Formatar datas para o padrão Oracle DD/MM/YYYY HH24:MI:SS
    const formatarDataParaOracle = (dataISO: string | undefined) => {
      if (!dataISO) return null;
      // Forçar interpretação da data mantendo o fuso horário local ou tratando como UTC para evitar deslocamento de 1 dia
      // Quando recebemos '2026-01-01', o construtor Date pode interpretar como UTC e subtrair o fuso local (ex: -3h), 
      // resultando em '2025-12-31 21:00:00'.

      let date;
      if (dataISO.length === 10) { // Formato YYYY-MM-DD
        const [ano, mes, dia] = dataISO.split('-').map(Number);
        date = new Date(ano, mes - 1, dia, 12, 0, 0); // Meio-dia para evitar problemas de fuso
      } else {
        date = new Date(dataISO);
      }

      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const ano = date.getFullYear();
      const hora = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const seg = String(date.getSeconds()).padStart(2, '0');
      return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
    };

    const dataInicioFormatada = formatarDataParaOracle(atividade.DATA_INICIO);
    const dataFimFormatada = formatarDataParaOracle(atividade.DATA_FIM);

    console.log('📅 Datas formatadas:', { dataInicioFormatada, dataFimFormatada });

    // Sempre incluir CODLEAD no INSERT, mas pode ser NULL
    const sql = `
      INSERT INTO AD_ADLEADSATIVIDADES (
        CODLEAD, ID_EMPRESA, TIPO, TITULO, DESCRICAO, DATA_HORA, 
        DATA_INICIO, DATA_FIM, CODUSUARIO, DADOS_COMPLEMENTARES, 
        COR, ORDEM, ATIVO, STATUS, CODPARC
      ) VALUES (
        :codLead, :idEmpresa, :tipo, :titulo, :descricao, 
        TO_TIMESTAMP(:dataHora, 'DD/MM/YYYY HH24:MI:SS'), 
        TO_TIMESTAMP(:dataInicio, 'DD/MM/YYYY HH24:MI:SS'), 
        TO_TIMESTAMP(:dataFim, 'DD/MM/YYYY HH24:MI:SS'), 
        :codUsuario, :dadosComplementares, :cor, :ordem, 'S', :status, :codParc
      )
    `;

    const params: any = {
      codLead: atividade.CODLEAD || null,
      idEmpresa,
      tipo: (atividade.TIPO as any) || 'TAREFA',
      titulo: atividade.TITULO || 'Sem título',
      descricao: atividade.DESCRICAO || '',
      dataHora: formatarDataParaOracle(new Date().toISOString()),
      dataInicio: dataInicioFormatada,
      dataFim: dataFimFormatada,
      codUsuario: atividade.CODUSUARIO || null,
      dadosComplementares: atividade.DADOS_COMPLEMENTARES || null,
      cor: atividade.COR || '#22C55E',
      ordem: novaOrdem,
      status: (statusInicial as any),
      codParc: atividade.CODPARC || null
    };

    await oracleService.executeQuery(sql, params);

    console.log(`✅ [Oracle] Atividade criada`);

    // Buscar a atividade criada
    const atividadeCriada = await oracleService.executeOne<any>(
      `SELECT 
        CODATIVIDADE,
        CODLEAD,
        TIPO,
        TITULO,
        DESCRICAO,
        TO_CHAR(DATA_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DATA_CRIACAO,
        TO_CHAR(DATA_INICIO, 'DD/MM/YYYY HH24:MI:SS') AS DATA_INICIO,
        TO_CHAR(DATA_FIM, 'DD/MM/YYYY HH24:MI:SS') AS DATA_FIM,
        CODUSUARIO,
        DADOS_COMPLEMENTARES,
        COR,
        ORDEM,
        ATIVO,
        STATUS
      FROM AD_ADLEADSATIVIDADES 
      WHERE ID_EMPRESA = :idEmpresa 
      ORDER BY CODATIVIDADE DESC 
      FETCH FIRST 1 ROWS ONLY`,
      { idEmpresa }
    );

    return atividadeCriada;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao criar atividade:', error);
    throw error;
  }
}

export async function atualizarAtividade(atividade: Partial<LeadAtividade>, idEmpresa: number): Promise<void> {
  console.log('🔄 [Oracle] Atualizando atividade:', { atividade, idEmpresa });

  try {
    let sql = `UPDATE AD_ADLEADSATIVIDADES SET `;
    const updates: string[] = [];
    const params: any = { codAtividade: atividade.CODATIVIDADE, idEmpresa };

    if (atividade.TITULO !== undefined) { updates.push(`TITULO = :titulo`); params.titulo = atividade.TITULO; }
    if (atividade.DESCRICAO !== undefined) { updates.push(`DESCRICAO = :descricao`); params.descricao = atividade.DESCRICAO; }
    if (atividade.TIPO !== undefined) { updates.push(`TIPO = :tipo`); params.tipo = atividade.TIPO; }
    if (atividade.COR !== undefined) { updates.push(`COR = :cor`); params.cor = atividade.COR; }
    if (atividade.ATIVO !== undefined) { updates.push(`ATIVO = :ativo`); params.ativo = atividade.ATIVO; }

    const formatarData = (d: string) => {
      let date = d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    };

    if (atividade.DATA_INICIO) { updates.push(`DATA_INICIO = TO_TIMESTAMP(:dataInicio, 'DD/MM/YYYY HH24:MI:SS')`); params.dataInicio = formatarData(atividade.DATA_INICIO); }
    if (atividade.DATA_FIM) { updates.push(`DATA_FIM = TO_TIMESTAMP(:dataFim, 'DD/MM/YYYY HH24:MI:SS')`); params.dataFim = formatarData(atividade.DATA_FIM); }

    if (updates.length === 0) return;

    sql += updates.join(', ') + ` WHERE CODATIVIDADE = :codAtividade AND ID_EMPRESA = :idEmpresa`;

    await oracleService.executeQuery(sql, params);
    console.log(`✅ [Oracle] Atividade ${atividade.CODATIVIDADE} atualizada`);

  } catch (error) {
    console.error('❌ [Oracle] Erro ao atualizar atividade:', error);
    throw error;
  }
}

export async function atualizarStatusAtividade(codAtividade: string, status: string, idEmpresa: number): Promise<void> {
  console.log('🔄 [Oracle] Atualizando status da atividade:', { codAtividade, status, idEmpresa });

  try {
    const sql = `
      UPDATE AD_ADLEADSATIVIDADES
      SET STATUS = :status
      WHERE CODATIVIDADE = :codAtividade
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { status, codAtividade, idEmpresa });
    console.log(`✅ [Oracle] Status da atividade ${codAtividade} atualizado para ${status}`);

  } catch (error) {
    console.error('❌ [Oracle] Erro ao atualizar status da atividade:', error);
    throw error;
  }
}

export async function deletarAtividade(codAtividade: string, idEmpresa: number): Promise<void> {
  console.log('🗑️ [Oracle] Deletando atividade:', { codAtividade, idEmpresa });

  try {
    const sql = `
      UPDATE AD_ADLEADSATIVIDADES
      SET ATIVO = 'N'
      WHERE CODATIVIDADE = :codAtividade
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { codAtividade, idEmpresa });
    console.log(`✅ [Oracle] Atividade ${codAtividade} deletada`);

  } catch (error) {
    console.error('❌ [Oracle] Erro ao deletar atividade:', error);
    throw error;
  }
}
