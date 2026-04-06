
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { tabelasPrecosConfigService } from '@/lib/tabelas-precos-config-service'

// GET - Listar configurações de tabelas de preços
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userData = JSON.parse(userCookie.value)
    const idEmpresa = userData.ID_EMPRESA

    const configs = await tabelasPrecosConfigService.listarPorEmpresa(idEmpresa)

    return NextResponse.json({ configs })
  } catch (error: any) {
    console.error('❌ Erro ao listar configurações de tabelas de preços:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar configurações' },
      { status: 500 }
    )
  }
}

// POST - Criar nova configuração
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userData = JSON.parse(userCookie.value)
    const body = await request.json()

    // Garantir que userId seja extraído corretamente do cookie
    const userId = userData.userId || userData.id || userData.CODUSUARIO

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 400 })
    }

    const config = {
      ID_EMPRESA: userData.ID_EMPRESA,
      CODUSUARIO_CRIADOR: userId,
      NUTAB: body.NUTAB,
      CODTAB: body.CODTAB,
      DESCRICAO: body.DESCRICAO
    }

    console.log('📝 Criando configuração de tabela de preços:', config)

    const codConfig = await tabelasPrecosConfigService.criar(config)

    // Sincronizar IndexedDB com os dados atualizados
    try {
      console.log('🔄 Sincronizando configurações de tabelas de preços no IndexedDB...')
      const configsAtualizadas = await tabelasPrecosConfigService.listarPorEmpresa(userData.ID_EMPRESA)
      
      return NextResponse.json({ 
        success: true, 
        codConfig,
        syncData: {
          tabelasPrecosConfig: configsAtualizadas
        }
      })
    } catch (syncError) {
      console.error('⚠️ Erro ao sincronizar IndexedDB, mas configuração foi criada:', syncError)
      return NextResponse.json({ success: true, codConfig })
    }
  } catch (error: any) {
    console.error('❌ Erro ao criar configuração:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar configuração' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configuração
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userData = JSON.parse(userCookie.value)
    const body = await request.json()

    const sucesso = await tabelasPrecosConfigService.atualizar(
      body.CODCONFIG,
      { 
        DESCRICAO: body.DESCRICAO,
        NUTAB: body.NUTAB,
        CODTAB: body.CODTAB
      },
      userData.ID_EMPRESA
    )

    if (sucesso) {
      // Sincronizar IndexedDB com os dados atualizados
      try {
        console.log('🔄 Sincronizando configurações de tabelas de preços no IndexedDB...')
        const configsAtualizadas = await tabelasPrecosConfigService.listarPorEmpresa(userData.ID_EMPRESA)
        
        return NextResponse.json({ 
          success: true,
          syncData: {
            tabelasPrecosConfig: configsAtualizadas
          }
        })
      } catch (syncError) {
        console.error('⚠️ Erro ao sincronizar IndexedDB, mas configuração foi atualizada:', syncError)
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ success: sucesso })
  } catch (error: any) {
    console.error('❌ Erro ao atualizar configuração:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar configuração' },
      { status: 500 }
    )
  }
}

// DELETE - Desativar configuração
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userData = JSON.parse(userCookie.value)
    const { searchParams } = new URL(request.url)
    const codConfig = searchParams.get('codConfig')

    if (!codConfig) {
      return NextResponse.json({ error: 'codConfig é obrigatório' }, { status: 400 })
    }

    const sucesso = await tabelasPrecosConfigService.desativar(
      Number(codConfig),
      userData.ID_EMPRESA
    )

    if (sucesso) {
      // Sincronizar IndexedDB com os dados atualizados
      try {
        console.log('🔄 Sincronizando configurações de tabelas de preços no IndexedDB...')
        const configsAtualizadas = await tabelasPrecosConfigService.listarPorEmpresa(userData.ID_EMPRESA)
        
        return NextResponse.json({ 
          success: true,
          syncData: {
            tabelasPrecosConfig: configsAtualizadas
          }
        })
      } catch (syncError) {
        console.error('⚠️ Erro ao sincronizar IndexedDB, mas configuração foi desativada:', syncError)
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ success: sucesso })
  } catch (error: any) {
    console.error('❌ Erro ao desativar configuração:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao desativar configuração' },
      { status: 500 }
    )
  }
}
