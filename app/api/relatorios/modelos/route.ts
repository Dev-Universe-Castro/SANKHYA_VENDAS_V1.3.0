import { NextResponse } from 'next/server';
import { relatoriosService } from '@/lib/relatorios-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idEmpresa = searchParams.get('idEmpresa');
    const codUsuario = searchParams.get('codUsuario');

    if (!idEmpresa) {
      return NextResponse.json({ error: 'idEmpresa é obrigatório' }, { status: 400 });
    }

    const modelos = await relatoriosService.getAll(
      Number(idEmpresa), 
      codUsuario ? Number(codUsuario) : undefined
    );

    return NextResponse.json(modelos);
  } catch (error: any) {
    console.error('❌ Erro ao listar modelos de relatórios:', error);
    return NextResponse.json({ error: 'Erro interno ao listar modelos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idEmpresa, codUsuario, nome, estrutura, descricao, cabecalho, rodape, logo } = body;

    if (!idEmpresa || !codUsuario || !nome || !estrutura) {
      return NextResponse.json({ error: 'Campos obrigatórios: idEmpresa, codUsuario, nome e estrutura' }, { status: 400 });
    }

    const novoModelo = await relatoriosService.create({
      ID_EMPRESA: Number(idEmpresa),
      CODUSUARIO: Number(codUsuario),
      NOME: nome,
      DESCRICAO: descricao,
      ESTRUTURA_JSON: typeof estrutura === 'string' ? estrutura : JSON.stringify(estrutura),
      CABECALHO_JSON: typeof cabecalho === 'string' ? cabecalho : JSON.stringify(cabecalho),
      RODAPE_JSON: typeof rodape === 'string' ? rodape : JSON.stringify(rodape),
      LOGO_URL: logo
    });

    return NextResponse.json(novoModelo, { status: 201 });
  } catch (error: any) {
    console.error('❌ Erro ao criar modelo de relatório:', error);
    return NextResponse.json({ error: 'Erro interno ao criar modelo' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...dados } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do modelo é obrigatório para atualização' }, { status: 400 });
    }

    const atualizado = await relatoriosService.update(Number(id), {
      ...dados,
      ESTRUTURA_JSON: dados.estrutura ? (typeof dados.estrutura === 'string' ? dados.estrutura : JSON.stringify(dados.estrutura)) : undefined,
      CABECALHO_JSON: dados.cabecalho ? (typeof dados.cabecalho === 'string' ? dados.cabecalho : JSON.stringify(dados.cabecalho)) : undefined,
      RODAPE_JSON: dados.rodape ? (typeof dados.rodape === 'string' ? dados.rodape : JSON.stringify(dados.rodape)) : undefined,
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    console.error('❌ Erro ao atualizar modelo de relatório:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar modelo' }, { status: 500 });
  }
}
