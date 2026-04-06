
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarFunis } from '@/lib/oracle-funis-service';

export async function GET(request: Request) {
  try {
    console.log('📡 API - Iniciando consulta de funis...');
    console.log('📡 API - URL:', request.url);
    
    // Obter usuário autenticado do cookie
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      console.error('❌ Cookie de usuário não encontrado');
      return NextResponse.json({ 
        error: 'Não autenticado',
        details: 'Cookie de sessão não encontrado'
      }, { status: 401 });
    }

    console.log('🍪 Cookie encontrado:', userCookie.name);

    let currentUser;
    try {
      currentUser = JSON.parse(userCookie.value);
      console.log('🍪 Cookie do usuário parseado:', JSON.stringify(currentUser, null, 2));
    } catch (e) {
      console.error('❌ Erro ao parsear cookie de usuário:', e);
      return NextResponse.json({ 
        error: 'Sessão inválida',
        details: 'Não foi possível processar os dados da sessão'
      }, { status: 401 });
    }

    // Verificar múltiplas variações de admin
    const isAdmin = currentUser.role === 'Administrador' || 
                    currentUser.role === 'Admin' || 
                    currentUser.role === 'admin' ||
                    currentUser.role === 'ADMINISTRADOR';
    
    const idEmpresa = currentUser.ID_EMPRESA;
    const codUsuario = parseInt(currentUser.id) || currentUser.id;

    console.log(`👤 Usuário autenticado: ${currentUser.name || 'Sem nome'} (ID: ${codUsuario}, Role: ${currentUser.role}, Admin: ${isAdmin})`);

    // Buscar funis direto do Oracle
    const funis = await consultarFunis(idEmpresa, codUsuario, isAdmin);
    console.log(`✅ API - ${funis.length} funis retornados do Oracle`);
    
    if (funis.length === 0) {
      console.log('⚠️ Nenhum funil encontrado. Verificando permissões...');
      console.log('🔍 Parâmetros usados na busca:', { idEmpresa, codUsuario, isAdmin });
    }
    
    return NextResponse.json(funis);
  } catch (error: any) {
    console.error('❌ API - Erro ao consultar funis:', error.message);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao consultar funis',
        details: 'Verifique a conexão com o banco Oracle'
      },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
