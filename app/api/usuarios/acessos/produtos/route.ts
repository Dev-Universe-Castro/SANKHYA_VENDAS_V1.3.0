import { NextRequest, NextResponse } from 'next/server';
import { accessControlService } from '@/lib/access-control-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { codUsuario, produtos } = body;

        if (!codUsuario) {
            return NextResponse.json({ error: 'codUsuario é obrigatório' }, { status: 400 });
        }

        await accessControlService.updateManualProdutos(codUsuario, produtos || []);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Erro ao salvar produtos manuais:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
