import { oracleAuthService } from './oracle-auth-service'

// Serviço de prefetch de dados para otimizar o carregamento inicial
export async function prefetchLoginData() {
  try {
    console.log('🔄 Iniciando prefetch completo de dados...')

    // Chamar a API route de prefetch
    const response = await fetch('/api/prefetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Erro ao fazer prefetch: ${response.status}`)
    }

    const data = await response.json()

    // Salvar tipos de negociação no cache
    if (data.tiposNegociacao?.data && data.tiposNegociacao.data.length > 0) {
      sessionStorage.setItem('cached_tiposNegociacao', JSON.stringify(data.tiposNegociacao.data))
      console.log('✅ Tipos de negociação salvos no cache:', data.tiposNegociacao.count)
    }

    // Salvar tipos de pedido no cache
    if (data.tiposPedido?.data && data.tiposPedido.data.length > 0) {
      sessionStorage.setItem('cached_tiposPedido', JSON.stringify(data.tiposPedido.data))
      console.log('✅ Tipos de pedido salvos no cache:', data.tiposPedido.count)
    }

    // Salvar tipos de operação no cache
    if (data.tiposOperacao?.data && data.tiposOperacao.data.length > 0) {
      sessionStorage.setItem('cached_tiposOperacao', JSON.stringify(data.tiposOperacao.data))
      console.log('✅ Tipos de operação salvos no cache:', data.tiposOperacao.count)
    }

    // Salvar exceções de preços no cache
    if (data.excecoesPrecos?.data && data.excecoesPrecos.data.length > 0) {
      sessionStorage.setItem('cached_excecoesPrecos', JSON.stringify(data.excecoesPrecos.data))
      console.log('✅ Exceções de preços salvas no cache:', data.excecoesPrecos.count)
    } else {
      console.warn('⚠️ Nenhuma exceção de preços recebida do prefetch')
    }

    // Armazenar todos os dados no sessionStorage (garantindo arrays)
    const cacheItems = [
      {
        key: 'cached_parceiros',
        data: Array.isArray(data.parceiros?.data) ? data.parceiros.data : [],
        name: 'parceiros'
      },
      {
        key: 'cached_produtos',
        data: Array.isArray(data.produtos?.data) ? data.produtos.data : [],
        name: 'produtos'
      },
      {
        key: 'cached_tipos_negociacao',
        data: Array.isArray(data.tiposNegociacao?.data) ? data.tiposNegociacao.data : [],
        name: 'tipos de negociação'
      },
      {
        key: 'cached_tipos_operacao',
        data: Array.isArray(data.tiposOperacao?.data) ? data.tiposOperacao.data : [],
        name: 'tipos de operação'
      },
      {
        key: 'cached_pedidos',
        data: Array.isArray(data.pedidos?.data) ? data.pedidos.data : [],
        name: 'pedidos'
      },
      {
        key: 'cached_financeiro',
        data: Array.isArray(data.financeiro?.data) ? data.financeiro.data : [],
        name: 'títulos financeiros'
      },
      {
        key: 'cached_usuarios',
        data: Array.isArray(data.usuarios?.data) ? data.usuarios.data : [],
        name: 'usuários'
      },
      {
        key: 'cached_vendedores',
        data: Array.isArray(data.vendedores?.data) ? data.vendedores.data : [],
        name: 'vendedores'
      },

      {
        key: 'cached_tabelasPrecos',
        data: Array.isArray(data.tabelasPrecos?.data) ? data.tabelasPrecos.data : (Array.isArray(data.tabelasPrecos?.tabelas) ? data.tabelasPrecos.tabelas : []),
        name: 'tabelas de preços'
      },
      {
        key: 'cached_excecoes_precos',
        data: Array.isArray(data.excecoesPrecos?.data) ? data.excecoesPrecos.data : [],
        name: 'exceções de preços'
      },
      {
        key: 'cached_tabelasPrecosConfig',
        data: Array.isArray(data.tabelasPrecosConfig?.data) ? data.tabelasPrecosConfig.data : (Array.isArray(data.tabelasPrecosConfig?.configs) ? data.tabelasPrecosConfig.configs : []),
        name: 'exceções de preços'
      },
      {
        key: 'cached_regrasImpostos',
        data: Array.isArray(data.regrasImpostos?.data) ? data.regrasImpostos.data : [],
        name: 'regras de impostos'
      }
    ]

    // Sincronizar com IndexedDB também no login prefetch
    const { OfflineDataService } = await import('./offline-data-service')

    // Passar todos os dados recebidos para a sincronização
    await OfflineDataService.sincronizarTudo(data, 'PrefetchLoginService')

    let totalCached = 0
    cacheItems.forEach(item => {
      if (item.data && Array.isArray(item.data)) {
        sessionStorage.setItem(item.key, JSON.stringify(item.data))
        console.log(`💾 ${item.data.length} ${item.name} armazenados no sessionStorage`)

        // Log especial para pedidos para debug
        if (item.key === 'cached_pedidos' && item.data.length > 0) {
          console.log('📦 Estrutura do primeiro pedido em cache:', item.data[0])
        }

        totalCached += item.data.length
      } else if (item.data) {
        console.warn(`⚠️ Dados de ${item.name} não são um array:`, typeof item.data)
      } else {
        console.warn(`⚠️ Nenhum dado encontrado para ${item.name}`)
      }
    })

    console.log(`✅ Prefetch concluído - ${totalCached} registros totais em cache`)

    return {
      parceiros: data.parceiros?.count || 0,
      produtos: data.produtos?.count || 0,
      tiposNegociacao: data.tiposNegociacao?.count || 0,
      tiposOperacao: data.tiposOperacao?.count || 0,
      pedidos: data.pedidos?.count || 0,
      financeiro: data.financeiro?.count || 0,
      usuarios: data.usuarios?.count || 0,
      total: totalCached
    }
  } catch (error) {
    console.error('❌ Erro no prefetch de dados:', error)
    return {
      parceiros: 0,
      produtos: 0,
      tiposNegociacao: 0,
      tiposOperacao: 0,
      pedidos: 0,
      financeiro: 0,
      usuarios: 0,
      total: 0
    }
  }
}

// Limpar cache de prefetch (útil para forçar atualização)
export async function clearPrefetchCache() {
  try {
    // Chamar endpoint de limpeza de cache
    await fetch('/api/cache/clear', {
      method: 'POST',
    })
    console.log('🗑️ Cache de prefetch limpo')
  } catch (error) {
    console.error('❌ Erro ao limpar cache de prefetch:', error)
  }
}