
import { oracleService } from './oracle-db';

export interface Funil {
  CODFUNIL: string
  ID_EMPRESA: number
  NOME: string
  DESCRICAO: string
  COR: string
  ATIVO: string
  DATA_CRIACAO: string
  DATA_ATUALIZACAO: string
}

export interface EstagioFunil {
  CODESTAGIO: string
  CODFUNIL: string
  ID_EMPRESA: number
  NOME: string
  ORDEM: number
  COR: string
  ATIVO: string
}

// ==================== FUNIS ====================

export async function consultarFunis(idEmpresa: number, codUsuario?: number, isAdmin: boolean = false): Promise<Funil[]> {
  console.log('🔍 [Oracle] Consultando funis:', { idEmpresa, codUsuario, isAdmin });

  try {
    // Admin vê todos os funis da empresa
    if (isAdmin) {
      const sql = `
        SELECT 
          CODFUNIL,
          ID_EMPRESA,
          NOME,
          DESCRICAO,
          COR,
          ATIVO,
          TO_CHAR(DATA_CRIACAO, 'DD/MM/YYYY') AS DATA_CRIACAO,
          TO_CHAR(DATA_ATUALIZACAO, 'DD/MM/YYYY') AS DATA_ATUALIZACAO
        FROM AD_FUNIS
        WHERE ID_EMPRESA = :idEmpresa
          AND ATIVO = 'S'
        ORDER BY NOME
      `;

      const result = await oracleService.executeQuery<Funil>(sql, { idEmpresa });
      console.log(`✅ [Oracle] ${result.length} funis encontrados (Admin)`);
      return result;
    }

    // Usuários normais veem apenas funis permitidos
    if (!codUsuario) {
      console.log('⚠️ [Oracle] codUsuario não fornecido para usuário não-admin');
      return [];
    }

    const sql = `
      SELECT DISTINCT
        f.CODFUNIL,
        f.ID_EMPRESA,
        f.NOME,
        f.DESCRICAO,
        f.COR,
        f.ATIVO,
        TO_CHAR(f.DATA_CRIACAO, 'DD/MM/YYYY') AS DATA_CRIACAO,
        TO_CHAR(f.DATA_ATUALIZACAO, 'DD/MM/YYYY') AS DATA_ATUALIZACAO
      FROM AD_FUNIS f
      INNER JOIN AD_FUNISUSUARIOS fu ON f.CODFUNIL = fu.CODFUNIL
      WHERE f.ID_EMPRESA = :idEmpresa
        AND fu.CODUSUARIO = :codUsuario
        AND f.ATIVO = 'S'
        AND fu.ATIVO = 'S'
      ORDER BY f.NOME
    `;

    const result = await oracleService.executeQuery<Funil>(sql, { idEmpresa, codUsuario });
    console.log(`✅ [Oracle] ${result.length} funis encontrados para usuário ${codUsuario}`);
    return result;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao consultar funis:', error);
    throw error;
  }
}

export async function salvarFunil(funil: Partial<Funil>, idEmpresa: number): Promise<Funil> {
  console.log('💾 [Oracle] Salvando funil:', { funil, idEmpresa });

  try {
    const isUpdate = !!funil.CODFUNIL;

    if (isUpdate) {
      // Atualizar funil existente
      const sql = `
        UPDATE AD_FUNIS
        SET NOME = :nome,
            DESCRICAO = :descricao,
            COR = :cor,
            ATIVO = :ativo
        WHERE CODFUNIL = :codFunil
          AND ID_EMPRESA = :idEmpresa
      `;

      await oracleService.executeQuery(sql, {
        nome: funil.NOME,
        descricao: funil.DESCRICAO || null,
        cor: funil.COR || '#3b82f6',
        ativo: funil.ATIVO || 'S',
        codFunil: funil.CODFUNIL,
        idEmpresa
      });

      console.log(`✅ [Oracle] Funil ${funil.CODFUNIL} atualizado`);

      // Buscar funil atualizado
      const funilAtualizado = await oracleService.executeOne<Funil>(
        `SELECT * FROM AD_FUNIS WHERE CODFUNIL = :codFunil`,
        { codFunil: funil.CODFUNIL }
      );

      return funilAtualizado!;

    } else {
      // Inserir novo funil
      const sql = `
        INSERT INTO AD_FUNIS (ID_EMPRESA, NOME, DESCRICAO, COR, ATIVO)
        VALUES (:idEmpresa, :nome, :descricao, :cor, 'S')
      `;

      await oracleService.executeQuery(sql, {
        idEmpresa,
        nome: funil.NOME,
        descricao: funil.DESCRICAO || null,
        cor: funil.COR || '#3b82f6'
      });

      console.log(`✅ [Oracle] Novo funil criado`);

      // Buscar último funil criado
      const novoFunil = await oracleService.executeOne<Funil>(
        `SELECT * FROM AD_FUNIS WHERE ID_EMPRESA = :idEmpresa ORDER BY CODFUNIL DESC FETCH FIRST 1 ROWS ONLY`,
        { idEmpresa }
      );

      return novoFunil!;
    }

  } catch (error) {
    console.error('❌ [Oracle] Erro ao salvar funil:', error);
    throw error;
  }
}

export async function deletarFunil(codFunil: string, idEmpresa: number): Promise<void> {
  console.log('🗑️ [Oracle] Deletando funil:', { codFunil, idEmpresa });

  try {
    const sql = `
      UPDATE AD_FUNIS
      SET ATIVO = 'N'
      WHERE CODFUNIL = :codFunil
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { codFunil, idEmpresa });
    console.log(`✅ [Oracle] Funil ${codFunil} deletado`);

  } catch (error) {
    console.error('❌ [Oracle] Erro ao deletar funil:', error);
    throw error;
  }
}

// ==================== ESTÁGIOS ====================

export async function consultarEstagiosFunil(codFunil: string, idEmpresa: number): Promise<EstagioFunil[]> {
  console.log('🔍 [Oracle] Consultando estágios do funil:', { codFunil, idEmpresa });

  try {
    const sql = `
      SELECT 
        CODESTAGIO,
        CODFUNIL,
        ID_EMPRESA,
        NOME,
        ORDEM,
        COR,
        ATIVO
      FROM AD_FUNISESTAGIOS
      WHERE CODFUNIL = :codFunil
        AND ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
      ORDER BY ORDEM ASC
    `;

    const result = await oracleService.executeQuery<EstagioFunil>(sql, { codFunil, idEmpresa });
    console.log(`✅ [Oracle] ${result.length} estágios encontrados`);
    return result;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao consultar estágios:', error);
    throw error;
  }
}

export async function salvarEstagio(estagio: Partial<EstagioFunil>, idEmpresa: number): Promise<EstagioFunil> {
  console.log('💾 [Oracle] Salvando estágio:', { estagio, idEmpresa });

  try {
    const isUpdate = !!estagio.CODESTAGIO && !String(estagio.CODESTAGIO || '').startsWith('temp-');

    if (isUpdate) {
      // Atualizar estágio existente
      const sql = `
        UPDATE AD_FUNISESTAGIOS
        SET NOME = :nome,
            ORDEM = :ordem,
            COR = :cor
        WHERE CODESTAGIO = :codEstagio
          AND ID_EMPRESA = :idEmpresa
      `;

      const result = await oracleService.executeQuery(sql, {
        nome: estagio.NOME,
        ordem: estagio.ORDEM,
        cor: estagio.COR || '#3b82f6',
        codEstagio: estagio.CODESTAGIO,
        idEmpresa
      });

      console.log(`✅ [Oracle] Estágio ${estagio.CODESTAGIO} atualizado`);

      // Buscar estágio atualizado
      const estagioAtualizado = await oracleService.executeOne<EstagioFunil>(
        `SELECT * FROM AD_FUNISESTAGIOS WHERE CODESTAGIO = :codEstagio`,
        { codEstagio: estagio.CODESTAGIO }
      );

      if (!estagioAtualizado) {
        throw new Error('Estágio não encontrado após atualização');
      }

      return estagioAtualizado;

    } else {
      // Inserir novo estágio
      const sql = `
        INSERT INTO AD_FUNISESTAGIOS (CODFUNIL, ID_EMPRESA, NOME, ORDEM, COR, ATIVO)
        VALUES (:codFunil, :idEmpresa, :nome, :ordem, :cor, 'S')
      `;

      await oracleService.executeQuery(sql, {
        codFunil: estagio.CODFUNIL,
        idEmpresa,
        nome: estagio.NOME,
        ordem: estagio.ORDEM,
        cor: estagio.COR || '#3b82f6'
      });

      console.log(`✅ [Oracle] Novo estágio criado`);

      // Buscar último estágio criado
      const novoEstagio = await oracleService.executeOne<EstagioFunil>(
        `SELECT * FROM AD_FUNISESTAGIOS WHERE CODFUNIL = :codFunil AND ID_EMPRESA = :idEmpresa ORDER BY CODESTAGIO DESC FETCH FIRST 1 ROWS ONLY`,
        { codFunil: estagio.CODFUNIL, idEmpresa }
      );

      return novoEstagio!;
    }

  } catch (error) {
    console.error('❌ [Oracle] Erro ao salvar estágio:', error);
    throw error;
  }
}

export async function deletarEstagio(codEstagio: string, idEmpresa: number): Promise<void> {
  console.log('🗑️ [Oracle] Deletando estágio:', { codEstagio, idEmpresa });

  try {
    const sql = `
      UPDATE AD_FUNISESTAGIOS
      SET ATIVO = 'N'
      WHERE CODESTAGIO = :codEstagio
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { codEstagio, idEmpresa });
    console.log(`✅ [Oracle] Estágio ${codEstagio} deletado`);

  } catch (error) {
    console.error('❌ [Oracle] Erro ao deletar estágio:', error);
    throw error;
  }
}

// ==================== PERMISSÕES ====================

export async function consultarFunisUsuario(codUsuario: number, idEmpresa: number): Promise<string[]> {
  console.log('🔍 [Oracle] Consultando funis do usuário:', { codUsuario, idEmpresa });

  try {
    const sql = `
      SELECT CODFUNIL
      FROM AD_FUNISUSUARIOS
      WHERE CODUSUARIO = :codUsuario
        AND ID_EMPRESA = :idEmpresa
        AND ATIVO = 'S'
    `;

    const result = await oracleService.executeQuery<{ CODFUNIL: string }>(sql, { codUsuario, idEmpresa });
    const codFunis = result.map(r => r.CODFUNIL);
    console.log(`✅ [Oracle] ${codFunis.length} funis permitidos para usuário ${codUsuario}`);
    return codFunis;

  } catch (error) {
    console.error('❌ [Oracle] Erro ao consultar funis do usuário:', error);
    throw error;
  }
}

export async function atribuirFunilUsuario(codFunil: string, codUsuario: number, idEmpresa: number): Promise<void> {
  console.log('➕ [Oracle] Atribuindo funil ao usuário:', { codFunil, codUsuario, idEmpresa });

  try {
    // Converter para números para garantir tipo correto
    const codFunilNum = parseInt(codFunil.toString());
    const codUsuarioNum = parseInt(codUsuario.toString());

    // Verificar se já existe
    const existe = await oracleService.executeOne(
      `SELECT COUNT(*) AS COUNT FROM AD_FUNISUSUARIOS WHERE CODFUNIL = :codFunil AND CODUSUARIO = :codUsuario AND ID_EMPRESA = :idEmpresa`,
      { codFunil: codFunilNum, codUsuario: codUsuarioNum, idEmpresa }
    );

    if (existe && existe.COUNT > 0) {
      // Reativar se existir
      console.log('🔄 [Oracle] Reativando permissão existente');
      await oracleService.executeQuery(
        `UPDATE AD_FUNISUSUARIOS SET ATIVO = 'S' WHERE CODFUNIL = :codFunil AND CODUSUARIO = :codUsuario AND ID_EMPRESA = :idEmpresa`,
        { codFunil: codFunilNum, codUsuario: codUsuarioNum, idEmpresa }
      );
    } else {
      // Inserir novo
      console.log('➕ [Oracle] Inserindo nova permissão');
      await oracleService.executeQuery(
        `INSERT INTO AD_FUNISUSUARIOS (CODFUNIL, CODUSUARIO, ID_EMPRESA, ATIVO) VALUES (:codFunil, :codUsuario, :idEmpresa, 'S')`,
        { codFunil: codFunilNum, codUsuario: codUsuarioNum, idEmpresa }
      );
    }

    console.log(`✅ [Oracle] Funil ${codFunilNum} atribuído ao usuário ${codUsuarioNum}`);

  } catch (error: any) {
    console.error('❌ [Oracle] Erro ao atribuir funil ao usuário:', error);
    console.error('Stack:', error.stack);
    throw new Error(`Erro ao atribuir funil: ${error.message}`);
  }
}

export async function removerFunilUsuario(codFunil: string, codUsuario: number, idEmpresa: number): Promise<void> {
  console.log('➖ [Oracle] Removendo funil do usuário:', { codFunil, codUsuario, idEmpresa });

  try {
    // Converter para números para garantir tipo correto
    const codFunilNum = parseInt(codFunil.toString());
    const codUsuarioNum = parseInt(codUsuario.toString());

    const sql = `
      UPDATE AD_FUNISUSUARIOS
      SET ATIVO = 'N'
      WHERE CODFUNIL = :codFunil
        AND CODUSUARIO = :codUsuario
        AND ID_EMPRESA = :idEmpresa
    `;

    await oracleService.executeQuery(sql, { codFunil: codFunilNum, codUsuario: codUsuarioNum, idEmpresa });
    console.log(`✅ [Oracle] Permissão de funil ${codFunilNum} removida do usuário ${codUsuarioNum}`);

  } catch (error: any) {
    console.error('❌ [Oracle] Erro ao remover funil do usuário:', error);
    console.error('Stack:', error.stack);
    throw new Error(`Erro ao remover funil: ${error.message}`);
  }
}
