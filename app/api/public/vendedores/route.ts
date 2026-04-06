import { NextResponse } from 'next/server';
import { oracleService } from '@/lib/oracle-db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const idEmpresa = searchParams.get('idEmpresa');
        const activeOnly = searchParams.get('activeOnly') !== 'false';

        if (!idEmpresa) {
            return NextResponse.json(
                { error: 'Parâmetro idEmpresa é obrigatório' },
                { status: 400 }
            );
        }

        console.log(`📋 Listando vendedores públicos para empresa ${idEmpresa}...`);

        let sql = `
      SELECT 
        CODVEND,
        APELIDO,
        TIPVEND,
        ATIVO
      FROM AS_VENDEDORES
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
    `;

        if (activeOnly) {
            sql += ` AND ATIVO = 'S'`;
        }

        sql += ` ORDER BY APELIDO`;

        const vendedores = await oracleService.executeQuery(sql, { idEmpresa });

        console.log(`✅ ${vendedores.length} vendedores públicos encontrados`);

        return NextResponse.json(vendedores);
    } catch (error: any) {
        console.error('❌ Erro ao consultar vendedores:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao consultar vendedores' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
