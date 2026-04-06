// Serviço de prefetch para otimizar carregamento de dados
class PrefetchService {
  private cache: Map<string, any> = new Map()
  private pendingRequests: Map<string, Promise<any>> = new Map()

  async prefetch(key: string, fetcher: () => Promise<any>) {
    // Se já está em cache, retorna
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }

    // Se já tem uma requisição pendente, aguarda ela
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }

    // Faz a requisição
    const promise = fetcher().then(data => {
      this.cache.set(key, data)
      this.pendingRequests.delete(key)
      return data
    }).catch(error => {
      this.pendingRequests.delete(key)
      throw error
    })

    this.pendingRequests.set(key, promise)
    return promise
  }

  invalidate(key: string) {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  clear() {
    this.cache.clear()
    this.pendingRequests.clear()
  }
}

export const prefetchService = new PrefetchService()

export function setupPrefetching(router: any) {
  // Prefetch das rotas principais imediatamente
  if (typeof window !== 'undefined') {
    requestIdleCallback(() => {
      router.prefetch('/dashboard')
      router.prefetch('/dashboard/leads')
      router.prefetch('/dashboard/parceiros')
      router.prefetch('/dashboard/produtos')
      router.prefetch('/dashboard/pedidos')
      router.prefetch('/dashboard/calendario')
      router.prefetch('/dashboard/financeiro')
    }, { timeout: 1000 })
  }
}