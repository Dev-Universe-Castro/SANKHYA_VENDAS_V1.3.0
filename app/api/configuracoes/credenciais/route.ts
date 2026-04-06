import { NextRequest, NextResponse } from 'next/server';
import { contratosService } from '@/lib/contratos-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idEmpresaStr = searchParams.get('idEmpresa');

    if (!idEmpresaStr) {
      return NextResponse.json({ error: 'ID da empresa não fornecido' }, { status: 400 });
    }

    const idEmpresa = parseInt(idEmpresaStr);
    
    console.log(`🔍 [API] Buscando credenciais para empresa ${idEmpresa}...`);
    const contrato = await contratosService.getContratoByEmpresa(idEmpresa);

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado para esta empresa' }, { status: 404 });
    }

    return NextResponse.json({ success: true, contrato });
  } catch (error: any) {
    console.error('❌ [API] Erro ao buscar credenciais:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar credenciais' }, { status: 500 });
  }
}
