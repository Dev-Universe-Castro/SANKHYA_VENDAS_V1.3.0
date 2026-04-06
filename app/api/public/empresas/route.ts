import { NextResponse } from 'next/server';
import { oracleService } from '@/lib/oracle-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    console.log('📋 Listando empresas públicas...');

    let sql = `
      SELECT 
        CODEMP,
        NOMEFANTASIA
      FROM AS_EMPRESAS
    `;

    // Removing ATIVO filtering for AS_EMPRESAS since it might not have an ATIVO column
    // Or it might be SANKHYA_ATUAL or similar. We saw AS_EMPRESAS Columns:
    // ID_SISTEMA, CODEMP, NOMEFANTASIA, RAZAOSOCIAL, SANKHYA_ATUAL, DT_ULT_CARGA, DT_CRIACAO

    sql += ` ORDER BY CODEMP`;

    const empresas = await oracleService.executeQuery(sql);

    console.log(`✅ ${empresas.length} empresas públicas encontradas`);

    return NextResponse.json(empresas);
  } catch (error: any) {
    console.error('❌ Erro ao consultar empresas:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar empresas' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
