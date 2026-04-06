import { NextRequest, NextResponse } from 'next/server';
import { sankhyaDynamicAPI } from '@/lib/sankhya-dynamic-api';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const codProd = searchParams.get('codProd');

        if (!codProd) {
            return NextResponse.json({ error: 'codigoProduto não fornecido' }, { status: 400 });
        }

        const cookieStore = cookies();
        const userCookie = cookieStore.get('user');

        if (!userCookie) {
            return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
        }

        const user = JSON.parse(decodeURIComponent(userCookie.value));
        const idEmpresa = user.ID_EMPRESA || user.id_empresa;

        if (!idEmpresa) {
            return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
        }

        // Endpoint REST (importante: sankhyaDynamicAPI junta baseUrl com o endpoint passado)
        const endpoint = `/v1/estoque/produtos/${codProd}`;

        const data = await sankhyaDynamicAPI.fazerRequisicao(Number(idEmpresa), endpoint, 'GET');

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Erro ao buscar estoque live:', error);
        return NextResponse.json({ error: 'Erro ao buscar estoque na API', details: error.message }, { status: 500 });
    }
}
