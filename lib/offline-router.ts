// Serviço para garantir navegação offline
export class OfflineRouter {
  private static cachedRoutes = new Set<string>()

  // Pré-carregar rotas principais no cache
  static async precacheRoutes() {
    if (typeof window === 'undefined') return

    const routes = [
      '/dashboard',
      '/dashboard/parceiros',
      '/dashboard/produtos',
      '/dashboard/leads',
      '/dashboard/pedidos',
      '/dashboard/financeiro',
      '/dashboard/calendario',
      '/dashboard/chat',
      '/dashboard/analise',
      '/dashboard/equipe',
      '/dashboard/usuarios',
      '/dashboard/configuracoes',
    ]

    console.log('[CACHE] Iniciando precache de rotas (durante splash)...')

    // Abrir o cache primeiro
    const cache = await caches.open('pages-cache')

    // Cachear todas as rotas em paralelo para maior velocidade
    const cachePromises = routes.map(async (route) => {
      if (!this.cachedRoutes.has(route)) {
        try {
          // Tentar fazer fetch com timeout mais curto (2 segundos)
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 2000)

          const response = await fetch(route, {
            method: 'GET',
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            const responseClone = response.clone()
            await cache.put(route, responseClone)
            this.cachedRoutes.add(route)
            console.log(`[CACHE] Rota cacheada: ${route}`)
          }
        } catch (error) {
          this.cachedRoutes.add(route)
          console.log(`[CACHE] Marcando ${route} como cacheada (sera servida pelo SW)`)
        }
      }
    })

    // Aguardar todas as rotas (independente de sucesso/falha)
    await Promise.allSettled(cachePromises)

    // Salvar lista de rotas cacheadas
    localStorage.setItem('cached_routes', JSON.stringify([...this.cachedRoutes]))
    console.log('[CACHE] Precache de rotas concluido (PARALELO)')
    console.log(`[CACHE] ${this.cachedRoutes.size} rotas em cache concluido`)
  }

  // Verificar se uma rota está em cache
  static isRouteCached(route: string): boolean {
    // Verificar no Set ou no localStorage
    if (this.cachedRoutes.has(route)) return true

    try {
      const cached = localStorage.getItem('cached_routes')
      if (cached) {
        const routes = JSON.parse(cached)
        return routes.includes(route)
      }
    } catch (error) {
      console.error('Erro ao verificar cache:', error)
    }

    return false
  }

  // Navegar com fallback offline (sempre permite navegação)
  static async navigateWithOfflineFallback(router: any, route: string) {
    // SEMPRE permitir navegação - o service worker vai lidar com o cache
    router.push(route)
  }

  // Restaurar dados do cache após reload
  static async restoreCachedData() {
    if (typeof window === 'undefined') return

    try {
      const cache = await caches.open('api-cache')
      const keys = await cache.keys()

      console.log(`[CACHE] ${keys.length} itens no cache de API`)

      // Verificar se tem dados em sessionStorage
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      const cachedProdutos = sessionStorage.getItem('cached_produtos')
      const cachedPedidos = sessionStorage.getItem('cached_pedidos')

      if (cachedParceiros) console.log('[CACHE] Parceiros em cache')
      if (cachedProdutos) console.log('[CACHE] Produtos em cache')
      if (cachedPedidos) console.log('[CACHE] Pedidos em cache')

      return {
        hasCachedData: !!(cachedParceiros || cachedProdutos || cachedPedidos),
        cacheSize: keys.length
      }
    } catch (error) {
      console.error('Erro ao restaurar dados do cache:', error)
      return { hasCachedData: false, cacheSize: 0 }
    }
  }
}