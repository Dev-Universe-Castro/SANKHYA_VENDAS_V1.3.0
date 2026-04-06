import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { regrasImpostosService } from '@/lib/regras-impostos-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')
    if (!userCookie) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const user = JSON.parse(decodeURIComponent(userCookie.value))
    const idEmpresa = user.ID_EMPRESA

    const { oracleService } = await import('@/lib/oracle-db')
    const result = await oracleService.executeQuery(`
      SELECT ID_REGRA, NOME, DESCRICAO, NOTA_MODELO, CODIGO_EMPRESA, 
             FINALIDADE_OPERACAO, CODIGO_NATUREZA, ATIVO, ID_SISTEMA
      FROM AS_REGRAS_IMPOSTOS
      WHERE ID_SISTEMA = :idEmpresa
      ORDER BY ID_REGRA DESC
    `, { idEmpresa });

    console.log(`🔍 DEBUG: Regras brutas do Oracle para empresa ${idEmpresa}:`, result);

    // Normalizar chaves para garantir que o frontend receba exatamente o que espera
    const normalizeKey = (obj: any, key: string) => {
      const upper = key.toUpperCase();
      const lower = key.toLowerCase();
      return obj[upper] !== undefined ? obj[upper] : obj[lower];
    };

    const regrasMapeadas = (result || []).map((r: any) => ({
      ID_REGRA: normalizeKey(r, 'ID_REGRA'),
      NOME: normalizeKey(r, 'NOME'),
      DESCRICAO: normalizeKey(r, 'DESCRICAO') || '',
      NOTA_MODELO: normalizeKey(r, 'NOTA_MODELO'),
      CODIGO_EMPRESA: normalizeKey(r, 'CODIGO_EMPRESA'),
      FINALIDADE_OPERACAO: normalizeKey(r, 'FINALIDADE_OPERACAO'),
      CODIGO_NATUREZA: normalizeKey(r, 'CODIGO_NATUREZA'),
      ATIVO: normalizeKey(r, 'ATIVO') || 'S',
      ID_SISTEMA: normalizeKey(r, 'ID_SISTEMA')
    }));

    console.log(`✅ DEBUG: Regras mapeadas enviadas:`, regrasMapeadas);

    return NextResponse.json({ success: true, regras: regrasMapeadas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')
    if (!userCookie) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const user = JSON.parse(decodeURIComponent(userCookie.value))
    const idEmpresa = user.ID_EMPRESA
    const body = await request.json()

    const idRegra = await regrasImpostosService.criar({ ...body, ID_SISTEMA: idEmpresa })

    const { redisCacheService } = await import('@/lib/redis-cache-service')
    await redisCacheService.delete(`regras_impostos:empresa:${idEmpresa}`)

    const regrasAtualizadas = await regrasImpostosService.listarPorEmpresa(idEmpresa)
    return NextResponse.json({ success: true, idRegra, syncData: { regrasImpostos: regrasAtualizadas } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')
    if (!userCookie) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const user = JSON.parse(decodeURIComponent(userCookie.value))
    const idEmpresa = user.ID_EMPRESA
    const body = await request.json()

    await regrasImpostosService.atualizar(body.ID_REGRA, body, idEmpresa)

    const { redisCacheService } = await import('@/lib/redis-cache-service')
    await redisCacheService.delete(`regras_impostos:empresa:${idEmpresa}`)

    const regrasAtualizadas = await regrasImpostosService.listarPorEmpresa(idEmpresa)
    return NextResponse.json({ success: true, syncData: { regrasImpostos: regrasAtualizadas } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')
    if (!userCookie) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const user = JSON.parse(decodeURIComponent(userCookie.value))
    const idEmpresa = user.ID_EMPRESA
    const { searchParams } = new URL(request.url)
    const idRegra = searchParams.get('idRegra')

    await regrasImpostosService.desativar(Number(idRegra), idEmpresa)

    const { redisCacheService } = await import('@/lib/redis-cache-service')
    await redisCacheService.delete(`regras_impostos:empresa:${idEmpresa}`)

    const regrasAtualizadas = await regrasImpostosService.listarPorEmpresa(idEmpresa)
    return NextResponse.json({ success: true, syncData: { regrasImpostos: regrasAtualizadas } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
