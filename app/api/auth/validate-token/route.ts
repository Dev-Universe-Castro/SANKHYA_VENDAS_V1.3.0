import { NextRequest, NextResponse } from 'next/server';
import { obterToken } from '@/lib/sankhya-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contrato } = body;

    if (!contrato) {
      return NextResponse.json({ success: false, error: 'Credenciais de contrato não fornecidas' }, { status: 400 });
    }

    console.log(`🔐 [API] Validando conexão Sankhya para empresa: ${contrato.EMPRESA}...`);
    
    // Forçar novo token usando as credenciais passadas
    const token = await obterToken(true, contrato);
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Não foi possível gerar o token com as credenciais fornecidas' });
    }

    // Calcular expiração (padrão 20 min conforme sankhya-api.ts)
    const expiry = new Date(Date.now() + (20 * 60 * 1000)).toISOString();

    return NextResponse.json({ 
      success: true, 
      token, 
      expiry 
    });
  } catch (error: any) {
    console.error('❌ [API] Erro ao validar token:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Falha na comunicação com a API Sankhya' 
    }, { status: 500 });
  }
}
