
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  // TTL padrão: 5 minutos
  private defaultTTL = 5 * 60 * 1000;

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const data = this.get(key);
    return data !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Limpar entradas expiradas (otimizado)
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        toDelete.push(key);
      }
    }
    
    // Deletar em batch
    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`🧹 Cleanup: ${toDelete.length} entradas removidas`);
    }
  }

  // Cache em lote para múltiplos gets
  mget<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    const now = Date.now();
    
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry) {
        const age = now - entry.timestamp;
        if (age <= entry.ttl) {
          results.set(key, entry.data as T);
        } else {
          this.cache.delete(key);
        }
      }
    }
    
    return results;
  }

  // Set em lote
  mset<T>(entries: Map<string, T>, ttl?: number): void {
    const timestamp = Date.now();
    const cacheTTL = ttl || this.defaultTTL;
    
    for (const [key, data] of entries) {
      this.cache.set(key, {
        data,
        timestamp,
        ttl: cacheTTL
      });
    }
  }

  // Obter estatísticas do cache
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Invalidar cache por padrão (útil para invalidar todos os caches de um tipo)
  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`🗑️ Invalidados ${count} registros de cache com padrão: ${pattern}`);
    return count;
  }

  // Invalidar cache de parceiros
  invalidateParceiros(): number {
    return this.invalidatePattern('parceiros');
  }

  // Invalidar cache de produtos
  invalidateProdutos(): number {
    return this.invalidatePattern('produtos');
  }

  // Invalidar cache de estoque
  invalidateEstoque(): number {
    return this.invalidatePattern('estoque');
  }

  // Invalidar cache de preços
  invalidatePrecos(): number {
    return this.invalidatePattern('preco');
  }
}

export const cacheService = new CacheService();

// Limpar cache a cada 10 minutos
setInterval(() => {
  cacheService.cleanup();
}, 10 * 60 * 1000);
