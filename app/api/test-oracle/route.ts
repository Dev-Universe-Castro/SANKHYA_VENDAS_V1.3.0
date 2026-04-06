
import { NextResponse } from 'next/server';
import { oracleService } from '@/lib/oracle-db';

export async function GET() {
  try {
    console.log('🔍 Testando conexão Oracle...');
    
    // Testar conexão
    await oracleService.initialize();
    
    // Executar query de teste
    const result = await oracleService.executeQuery(
      'SELECT SYSDATE AS DATA_ATUAL FROM DUAL'
    );

    console.log('✅ Conexão Oracle estabelecida com sucesso!');
    
    return NextResponse.json({
      success: true,
      message: 'Conexão Oracle estabelecida com sucesso',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro ao conectar com Oracle:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao conectar com Oracle',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
