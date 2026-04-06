
// Wrapper para garantir que Redis só é importado no servidor
import type { RedisCacheService } from './redis-cache-service';

let redisCacheServiceInstance: any = null;
let initPromise: Promise<any> | null = null;

// Mock para o cliente
const mockCache = {
  get: async () => null,
  set: async () => {},
  delete: async () => {},
  has: async () => false,
  clear: async () => {},
  cleanup: async () => {},
  invalidatePattern: async () => 0,
  invalidateParceiros: async () => 0,
  invalidateProdutos: async () => 0,
  invalidateEstoque: async () => 0,
  invalidatePrecos: async () => 0,
  invalidatePedidos: async () => 0,
  getStats: async () => ({
    memorySize: 0,
    redisSize: 0,
    totalSize: 0,
    usingRedis: false,
    memoryKeys: [],
    redisKeys: [],
    ttlConfig: {}
  }),
  mget: async () => new Map()
};

// Função para obter o serviço de cache
export async function getCacheService() {
  // Se estiver no cliente, retorna o mock
  if (typeof window !== 'undefined') {
    return mockCache;
  }

  // Se já temos a instância, retorna
  if (redisCacheServiceInstance) {
    return redisCacheServiceInstance;
  }

  // Se está inicializando, aguarda
  if (initPromise) {
    return initPromise;
  }

  // Inicializa o serviço
  initPromise = (async () => {
    try {
      const module = await import('./redis-cache-service');
      redisCacheServiceInstance = module.redisCacheService;
      return redisCacheServiceInstance;
    } catch (error) {
      console.warn('⚠️ Redis não disponível, usando cache em memória');
      return mockCache;
    }
  })();

  return initPromise;
}
