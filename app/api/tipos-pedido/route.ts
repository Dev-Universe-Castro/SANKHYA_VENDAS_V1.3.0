import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { tiposPedidoService } from '@/lib/tipos-pedido-service'

// GET - Listar tipos de pedido
export async function GET(request: NextRequest) {
  try {
    // Obter ID da empresa do usuário logado
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userData = JSON.parse(decodeURIComponent(userCookie.value))
    const idEmpresa = userData.ID_EMPRESA

    if (!idEmpresa) {
      return NextResponse.json(
        { error: 'Empresa não identificada' },
        { status: 400 }
      )
    }

    // Tentar buscar do Redis cache primeiro
    const { redisCacheService } = await import('@/lib/redis-cache-service')
    const cacheKey = `tipos_pedido:empresa:${idEmpresa}`
    const cachedTipos = await redisCacheService.get(cacheKey)

    if (cachedTipos) {
      console.log('✅ Tipos de pedido carregados do cache Redis')
      return NextResponse.json({
        success: true,
        tiposPedido: cachedTipos
      })
    }

    // Se não houver cache, buscar do banco
    console.log('🔄 Cache vazio, buscando tipos de pedido do banco...')
    const tipos = await tiposPedidoService.listarPorEmpresa(idEmpresa)

    // Salvar no cache (4 horas - dados que raramente mudam)
    if (tipos && tipos.length > 0) {
      await redisCacheService.set(cacheKey, tipos, 4 * 60 * 60 * 1000)
      console.log('💾 Tipos de pedido salvos no cache Redis')
    }

    // Normalização de chaves para garantir que o frontend receba o que espera
    const normalizeKey = (obj: any, key: string) => {
      const upper = key.toUpperCase();
      const lower = key.toLowerCase();
      return obj[upper] !== undefined ? obj[upper] : obj[lower];
    };

    const tiposMapeados = (tipos || []).map((t: any) => ({
      CODTIPOPEDIDO: normalizeKey(t, 'CODTIPOPEDIDO'),
      ID_EMPRESA: normalizeKey(t, 'ID_EMPRESA'),
      CODUSUARIO_CRIADOR: normalizeKey(t, 'CODUSUARIO_CRIADOR'),
      NOME: normalizeKey(t, 'NOME'),
      DESCRICAO: normalizeKey(t, 'DESCRICAO'),
      CODTIPOPER: normalizeKey(t, 'CODTIPOPER'),
      MODELO_NOTA: normalizeKey(t, 'MODELO_NOTA'),
      TIPMOV: normalizeKey(t, 'TIPMOV'),
      CODTIPVENDA: normalizeKey(t, 'CODTIPVENDA'),
      COR: normalizeKey(t, 'COR'),
      ATIVO: normalizeKey(t, 'ATIVO') || 'S'
    }));

    return NextResponse.json({
      success: true,
      tiposPedido: tiposMapeados
    })
  } catch (error: any) {
    console.error('❌ Erro na rota GET tipos-pedido:', error)

    // Em caso de erro, tentar retornar do cache mesmo que esteja expirado
    const { redisCacheService } = await import('@/lib/redis-cache-service')
    const idEmpresaFromCookie = (JSON.parse(cookies().get('user')?.value || '{}')).ID_EMPRESA
    const cacheKey = `tipos_pedido:empresa:${idEmpresaFromCookie}`
    const cachedTipos = await redisCacheService.get(cacheKey)

    if (cachedTipos) {
      console.log('⚠️ Retornando dados em cache devido a erro de conexão')
      return NextResponse.json({
        success: true,
        tiposPedido: cachedTipos,
        fromCache: true
      })
    }

    return NextResponse.json(
      { error: error.message || 'Erro ao listar tipos de pedido', tiposPedido: [] },
      { status: 500 }
    )
  }
}

// POST - Criar tipo de pedido
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(decodeURIComponent(userCookie.value))
    const idEmpresa = user.ID_EMPRESA
    const userId = user.id

    if (!idEmpresa) {
      return NextResponse.json({
        error: 'Usuário sem empresa vinculada'
      }, { status: 400 })
    }

    const body = await request.json()

    // Validações
    if (!body.NOME || body.NOME.trim() === '') {
      return NextResponse.json({
        error: 'Nome do tipo de pedido é obrigatório'
      }, { status: 400 })
    }

    if (!body.CODTIPOPER) {
      return NextResponse.json({
        error: 'Tipo de operação é obrigatório'
      }, { status: 400 })
    }

    if (!body.MODELO_NOTA) {
      return NextResponse.json({
        error: 'Modelo da nota é obrigatório'
      }, { status: 400 })
    }

    if (!body.CODTIPVENDA) {
      return NextResponse.json({
        error: 'Condição comercial é obrigatória'
      }, { status: 400 })
    }

    const tipoPedido = {
      ID_EMPRESA: idEmpresa,
      CODUSUARIO_CRIADOR: userId,
      NOME: body.NOME,
      DESCRICAO: body.DESCRICAO,
      CODTIPOPER: Number(body.CODTIPOPER),
      MODELO_NOTA: Number(body.MODELO_NOTA),
      TIPMOV: body.TIPMOV || 'P',
      CODTIPVENDA: Number(body.CODTIPVENDA),
      COR: body.COR || '#3b82f6'
    }

    const codTipoPedido = await tiposPedidoService.criar(tipoPedido)

    // Limpar o cache após criar um novo tipo de pedido
    const { redisCacheService } = await import('@/lib/redis-cache-service')
    const cacheKey = `tipos_pedido:empresa:${idEmpresa}`
    await redisCacheService.delete(cacheKey)
    console.log(`🧹 Cache ${cacheKey} limpo após criação de tipo de pedido`)

    // Sincronizar IndexedDB com os dados atualizados
    try {
      console.log('🔄 Sincronizando tipos de pedido no IndexedDB...')
      const tiposAtualizados = await tiposPedidoService.listarPorEmpresa(idEmpresa)

      return NextResponse.json({
        success: true,
        codTipoPedido,
        message: 'Tipo de pedido criado com sucesso',
        syncData: {
          tiposPedido: tiposAtualizados
        }
      })
    } catch (syncError) {
      console.error('⚠️ Erro ao sincronizar IndexedDB, mas tipo foi criado:', syncError)
      return NextResponse.json({
        success: true,
        codTipoPedido,
        message: 'Tipo de pedido criado com sucesso'
      })
    }
  } catch (error: any) {
    console.error('Erro ao criar tipo de pedido:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar tipo de pedido' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar tipo de pedido
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(decodeURIComponent(userCookie.value))
    const idEmpresa = user.ID_EMPRESA

    if (!idEmpresa) {
      return NextResponse.json({
        error: 'Usuário sem empresa vinculada'
      }, { status: 400 })
    }

    const body = await request.json()
    console.log('📝 Dados recebidos para atualização:', body)

    if (!body.CODTIPOPEDIDO) {
      return NextResponse.json({
        error: 'Código do tipo de pedido é obrigatório'
      }, { status: 400 })
    }

    // Validações opcionais
    if (body.NOME && body.NOME.trim() === '') {
      return NextResponse.json({
        error: 'Nome do tipo de pedido não pode ser vazio'
      }, { status: 400 })
    }

    const dadosAtualizacao: any = {}

    if (body.NOME !== undefined) dadosAtualizacao.NOME = body.NOME
    if (body.DESCRICAO !== undefined) dadosAtualizacao.DESCRICAO = body.DESCRICAO
    if (body.CODTIPOPER !== undefined) dadosAtualizacao.CODTIPOPER = Number(body.CODTIPOPER)
    if (body.MODELO_NOTA !== undefined) dadosAtualizacao.MODELO_NOTA = Number(body.MODELO_NOTA)
    if (body.TIPMOV !== undefined) dadosAtualizacao.TIPMOV = body.TIPMOV
    if (body.CODTIPVENDA !== undefined) dadosAtualizacao.CODTIPVENDA = Number(body.CODTIPVENDA)
    if (body.COR !== undefined) dadosAtualizacao.COR = body.COR

    const sucesso = await tiposPedidoService.atualizar(
      Number(body.CODTIPOPEDIDO),
      dadosAtualizacao,
      idEmpresa
    )

    if (sucesso) {
      // Limpar o cache após atualizar um tipo de pedido
      const { redisCacheService } = await import('@/lib/redis-cache-service')
      const cacheKey = `tipos_pedido:empresa:${idEmpresa}`
      await redisCacheService.delete(cacheKey)
      console.log(`🧹 Cache ${cacheKey} limpo após atualização de tipo de pedido`)

      // Sincronizar IndexedDB com os dados atualizados
      try {
        console.log('🔄 Sincronizando tipos de pedido no IndexedDB...')
        const tiposAtualizados = await tiposPedidoService.listarPorEmpresa(idEmpresa)

        return NextResponse.json({
          success: true,
          message: 'Tipo de pedido atualizado com sucesso',
          syncData: {
            tiposPedido: tiposAtualizados
          }
        })
      } catch (syncError) {
        console.error('⚠️ Erro ao sincronizar IndexedDB, mas tipo foi atualizado:', syncError)
        return NextResponse.json({
          success: true,
          message: 'Tipo de pedido atualizado com sucesso'
        })
      }
    } else {
      // Se não houve erro mas também não afetou linhas, pode ser que não houve alterações
      // Retornamos sucesso para não confundir o usuário, mas buscamos os dados atuais para sync
      const tiposAtualizados = await tiposPedidoService.listarPorEmpresa(idEmpresa)
      return NextResponse.json({
        success: true,
        message: 'Tipo de pedido processado (sem alterações detectadas)',
        syncData: {
          tiposPedido: tiposAtualizados
        }
      })
    }
  } catch (error: any) {
    console.error('❌ Erro ao atualizar tipo de pedido:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar tipo de pedido' },
      { status: 500 }
    )
  }
}

// DELETE - Desativar tipo de pedido
export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(decodeURIComponent(userCookie.value))
    const idEmpresa = user.ID_EMPRESA

    if (!idEmpresa) {
      return NextResponse.json({
        error: 'Usuário sem empresa vinculada'
      }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const codTipoPedido = searchParams.get('codTipoPedido')

    if (!codTipoPedido) {
      return NextResponse.json({
        error: 'Código do tipo de pedido é obrigatório'
      }, { status: 400 })
    }

    const sucesso = await tiposPedidoService.desativar(
      Number(codTipoPedido),
      idEmpresa
    )

    if (sucesso) {
      // Limpar o cache após desativar um tipo de pedido
      const { redisCacheService } = await import('@/lib/redis-cache-service')
      const cacheKey = `tipos_pedido:empresa:${idEmpresa}`
      await redisCacheService.delete(cacheKey)
      console.log(`🧹 Cache ${cacheKey} limpo após desativação de tipo de pedido`)

      // Sincronizar IndexedDB com os dados atualizados
      try {
        console.log('🔄 Sincronizando tipos de pedido no IndexedDB...')
        const tiposAtualizados = await tiposPedidoService.listarPorEmpresa(idEmpresa)

        return NextResponse.json({
          success: true,
          message: 'Tipo de pedido desativado com sucesso',
          syncData: {
            tiposPedido: tiposAtualizados
          }
        })
      } catch (syncError) {
        console.error('⚠️ Erro ao sincronizar IndexedDB, mas tipo foi desativado:', syncError)
        return NextResponse.json({
          success: true,
          message: 'Tipo de pedido desativado com sucesso'
        })
      }
    } else {
      return NextResponse.json({
        error: 'Tipo de pedido não encontrado'
      }, { status: 404 })
    }
  } catch (error: any) {
    console.error('Erro ao desativar tipo de pedido:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao desativar tipo de pedido' },
      { status: 500 }
    )
  }
}