import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { oracleService } from '@/lib/oracle-db';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA;

    if (!idEmpresa) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const codEquipe = searchParams.get('codEquipe');

    if (codEquipe) {
      const equipe = await oracleService.executeOne(`
        SELECT 
          e.CODEQUIPE,
          e.ID_EMPRESA,
          e.NOME,
          e.DESCRICAO,
          e.CODUSUARIO_GESTOR,
          g.NOME AS NOME_GESTOR,
          e.ATIVO,
          TO_CHAR(e.DATA_CRIACAO, 'DD/MM/YYYY') AS DATA_CRIACAO
        FROM AD_EQUIPES e
        LEFT JOIN AD_USUARIOSVENDAS g ON e.CODUSUARIO_GESTOR = g.CODUSUARIO
        WHERE e.CODEQUIPE = :codEquipe AND e.ID_EMPRESA = :idEmpresa
      `, { codEquipe, idEmpresa });

      if (!equipe) {
        return NextResponse.json({ error: 'Equipe não encontrada' }, { status: 404 });
      }

      const membros = await oracleService.executeQuery(`
        SELECT 
          m.CODMEMBRO,
          m.CODUSUARIO,
          u.NOME,
          u.EMAIL,
          u.CODVENDEDOR,
          u.PERFIL,
          m.ATIVO,
          TO_CHAR(m.DATA_ENTRADA, 'DD/MM/YYYY') AS DATA_ENTRADA
        FROM AD_EQUIPES_MEMBROS m
        JOIN AD_USUARIOSVENDAS u ON m.CODUSUARIO = u.CODUSUARIO
        WHERE m.CODEQUIPE = :codEquipe AND m.ID_EMPRESA = :idEmpresa
        ORDER BY u.NOME
      `, { codEquipe, idEmpresa });

      return NextResponse.json({ equipe, membros });
    }

    const equipes = await oracleService.executeQuery(`
      SELECT 
        e.CODEQUIPE,
        e.NOME,
        e.DESCRICAO,
        e.CODUSUARIO_GESTOR,
        g.NOME AS NOME_GESTOR,
        e.ATIVO,
        TO_CHAR(e.DATA_CRIACAO, 'DD/MM/YYYY') AS DATA_CRIACAO,
        (SELECT COUNT(*) FROM AD_EQUIPES_MEMBROS m WHERE m.CODEQUIPE = e.CODEQUIPE AND m.ATIVO = 'S') AS TOTAL_MEMBROS
      FROM AD_EQUIPES e
      LEFT JOIN AD_USUARIOSVENDAS g ON e.CODUSUARIO_GESTOR = g.CODUSUARIO
      WHERE e.ID_EMPRESA = :idEmpresa
      ORDER BY e.NOME
    `, { idEmpresa });

    return NextResponse.json({ equipes });
  } catch (error: any) {
    console.error('❌ Erro ao buscar equipes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA;

    if (!idEmpresa) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
    }

    if (user.role !== 'Administrador') {
      return NextResponse.json({ error: 'Apenas administradores podem criar equipes' }, { status: 403 });
    }

    const body = await request.json();
    const { nome, descricao, codUsuarioGestor, membros } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome da equipe é obrigatório' }, { status: 400 });
    }

    const result = await oracleService.executeQuery(`
      INSERT INTO AD_EQUIPES (ID_EMPRESA, NOME, DESCRICAO, CODUSUARIO_GESTOR)
      VALUES (:idEmpresa, :nome, :descricao, :codUsuarioGestor)
      RETURNING CODEQUIPE INTO :codEquipe
    `, {
      idEmpresa,
      nome,
      descricao: descricao || null,
      codUsuarioGestor: codUsuarioGestor || null,
      codEquipe: { dir: oracleService.BIND_OUT, type: oracleService.NUMBER }
    });

    const codEquipe = result?.outBinds?.codEquipe?.[0] || result?.outBinds?.codEquipe;

    if (membros && Array.isArray(membros) && membros.length > 0 && codEquipe) {
      for (const codUsuario of membros) {
        await oracleService.executeQuery(`
          INSERT INTO AD_EQUIPES_MEMBROS (CODEQUIPE, CODUSUARIO, ID_EMPRESA)
          VALUES (:codEquipe, :codUsuario, :idEmpresa)
        `, { codEquipe, codUsuario, idEmpresa });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Equipe criada com sucesso',
      codEquipe
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar equipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA;

    if (!idEmpresa) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
    }

    if (user.role !== 'Administrador') {
      return NextResponse.json({ error: 'Apenas administradores podem editar equipes' }, { status: 403 });
    }

    const body = await request.json();
    const { codEquipe, nome, descricao, codUsuarioGestor, membros, ativo } = body;

    if (!codEquipe) {
      return NextResponse.json({ error: 'Código da equipe é obrigatório' }, { status: 400 });
    }

    await oracleService.executeQuery(`
      UPDATE AD_EQUIPES 
      SET NOME = :nome,
          DESCRICAO = :descricao,
          CODUSUARIO_GESTOR = :codUsuarioGestor,
          ATIVO = :ativo,
          DATA_ATUALIZACAO = SYSDATE
      WHERE CODEQUIPE = :codEquipe AND ID_EMPRESA = :idEmpresa
    `, {
      codEquipe,
      nome,
      descricao: descricao || null,
      codUsuarioGestor: codUsuarioGestor || null,
      ativo: ativo || 'S',
      idEmpresa
    });

    if (membros && Array.isArray(membros)) {
      await oracleService.executeQuery(`
        UPDATE AD_EQUIPES_MEMBROS SET ATIVO = 'N' 
        WHERE CODEQUIPE = :codEquipe AND ID_EMPRESA = :idEmpresa
      `, { codEquipe, idEmpresa });

      for (const codUsuario of membros) {
        const existing = await oracleService.executeOne(`
          SELECT CODMEMBRO FROM AD_EQUIPES_MEMBROS 
          WHERE CODEQUIPE = :codEquipe AND CODUSUARIO = :codUsuario
        `, { codEquipe, codUsuario });

        if (existing) {
          await oracleService.executeQuery(`
            UPDATE AD_EQUIPES_MEMBROS SET ATIVO = 'S'
            WHERE CODEQUIPE = :codEquipe AND CODUSUARIO = :codUsuario
          `, { codEquipe, codUsuario });
        } else {
          await oracleService.executeQuery(`
            INSERT INTO AD_EQUIPES_MEMBROS (CODEQUIPE, CODUSUARIO, ID_EMPRESA)
            VALUES (:codEquipe, :codUsuario, :idEmpresa)
          `, { codEquipe, codUsuario, idEmpresa });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Equipe atualizada com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar equipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const idEmpresa = user.ID_EMPRESA;

    if (user.role !== 'Administrador') {
      return NextResponse.json({ error: 'Apenas administradores podem excluir equipes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const codEquipe = searchParams.get('codEquipe');

    if (!codEquipe) {
      return NextResponse.json({ error: 'Código da equipe é obrigatório' }, { status: 400 });
    }

    await oracleService.executeQuery(`
      UPDATE AD_EQUIPES SET ATIVO = 'N', DATA_ATUALIZACAO = SYSDATE
      WHERE CODEQUIPE = :codEquipe AND ID_EMPRESA = :idEmpresa
    `, { codEquipe, idEmpresa });

    return NextResponse.json({ 
      success: true, 
      message: 'Equipe desativada com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao excluir equipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
