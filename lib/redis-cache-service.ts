
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class RedisCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redisClient: any = null;
  private useRedis: boolean = false;
  private redisPromise: Promise<void> | null = null;
  private isInitializing: boolean = false;
  private isServer: boolean = typeof window === 'undefined';
  
  // TTLs otimizados para alta concorrência - mais agressivos
  private readonly TTL = {
    PARCEIROS: 30 * 60 * 1000,      // 30 minutos
    PRODUTOS: 45 * 60 * 1000,       // 45 minutos
    ESTOQUE: 15 * 60 * 1000,        // 15 minutos
    PRECO: 15 * 60 * 1000,          // 15 minutos
    PEDIDOS: 8 * 60 * 1000,         // 8 minutos
    TIPOS: 240 * 60 * 1000,         // 240 minutos (4h - raramente muda)
    VENDEDORES: 120 * 60 * 1000,    // 120 minutos (2h)
    TITULOS: 15 * 60 * 1000,        // 15 minutos
    SEARCH: 10 * 60 * 1000,         // 10 minutos (buscas)
    LOGS: 7 * 24 * 60 * 60 * 1000,  // 7 dias (histórico persistente)
    TOKEN: 20 * 60 * 1000,          // 20 minutos
    DEFAULT: 20 * 60 * 1000         // 20 minutos
  };

  constructor() {
    if (this.isServer) {
      this.initializeRedis();
      this.startCleanupInterval();
    }
  }

  private async initializeRedis() {
    if (this.isInitializing || this.useRedis || !this.isServer) return;
    
    if (process.env.REPLIT_DEPLOYMENT && process.env.REDIS_URL) {
      this.isInitializing = true;
      this.redisPromise = (async () => {
        try {
          // Importação dinâmica apenas no servidor
          const redis = await import('redis');
          this.redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            socket: {
              reconnectStrategy: (retries) => {
                if (retries > 10) return false;
                return Math.min(retries * 100, 2000);
              },
              connectTimeout: 5000,
              keepAlive: 5000,
              noDelay: true
            },
            isolationPoolOptions: {
              min: 2,
              max: 10
            }
          });
          
          this.redisClient.on('error', (err: any) => {
            console.warn('⚠️ Redis error:', err.message);
          });

          this.redisClient.on('ready', () => {
            console.log('✅ Redis pronto para operações');
          });

          await this.redisClient.connect();
          this.useRedis = true;
          console.log('✅ Redis conectado - Cache persistente ativo');
        } catch (error) {
          console.warn('⚠️ Redis não disponível, usando cache em memória');
          this.useRedis = false;
        } finally {
          this.isInitializing = false;
        }
      })();
      
      await this.redisPromise;
    } else {
      console.log('ℹ️ Modo desenvolvimento - Cache em memória');
    }
  }

  private async ensureRedis() {
    if (!this.isServer) return;
    if (this.redisPromise && this.isInitializing) {
      await this.redisPromise;
    }
  }

  private startCleanupInterval() {
    if (!this.isServer) return;
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private getTTLForKey(key: string): number {
    if (key.includes('api_logs')) return this.TTL.LOGS;
    if (key.includes('sankhya:token')) return this.TTL.TOKEN;
    if (key.includes('parceiros')) return this.TTL.PARCEIROS;
    if (key.includes('produtos')) return this.TTL.PRODUTOS;
    if (key.includes('estoque')) return this.TTL.ESTOQUE;
    if (key.includes('preco')) return this.TTL.PRECO;
    if (key.includes('pedidos')) return this.TTL.PEDIDOS;
    if (key.includes('tipos') || key.includes('negociacao') || key.includes('operacao')) return this.TTL.TIPOS;
    if (key.includes('vendedores')) return this.TTL.VENDEDORES;
    if (key.includes('titulos')) return this.TTL.TITULOS;
    if (key.includes('search')) return this.TTL.SEARCH;
    return this.TTL.DEFAULT;
  }

  async set<T>(key: string, data: T, customTTL?: number): Promise<void> {
    const ttl = customTTL || this.getTTLForKey(key);
    const entry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    this.memoryCache.set(key, entry);

    if (!this.isServer) return;

    await this.ensureRedis();
    if (this.useRedis && this.redisClient) {
      setImmediate(async () => {
        try {
          const ttlSeconds = Math.floor(ttl / 1000);
          await Promise.race([
            this.redisClient.setEx(key, ttlSeconds, JSON.stringify(entry)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 300))
          ]);
        } catch (error: any) {
          // Falhar silenciosamente
        }
      });
    }
  }

  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    const missingKeys: string[] = [];
    for (const key of keys) {
      const memEntry = this.memoryCache.get(key);
      if (memEntry) {
        const age = Date.now() - memEntry.timestamp;
        if (age <= memEntry.ttl) {
          results.set(key, memEntry.data);
          continue;
        }
      }
      missingKeys.push(key);
    }

    if (!this.isServer) return results;

    if (missingKeys.length > 0 && this.useRedis && this.redisClient) {
      try {
        await this.ensureRedis();
        const redisResults = await Promise.race([
          this.redisClient.mGet(missingKeys),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 500))
        ]) as (string | null)[];

        for (let i = 0; i < missingKeys.length; i++) {
          const cached = redisResults[i];
          if (cached) {
            const entry = JSON.parse(cached) as CacheEntry<T>;
            const age = Date.now() - entry.timestamp;
            if (age <= entry.ttl) {
              results.set(missingKeys[i], entry.data);
              setImmediate(() => {
                this.memoryCache.set(missingKeys[i], entry);
              });
            }
          }
        }
      } catch (error) {
        // Falhar silenciosamente
      }
    }

    return results;
  }

  async get<T>(key: string): Promise<T | null> {
    const isTokenKey = key.includes('sankhya:token');
    
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      const age = Date.now() - memEntry.timestamp;
      if (age <= memEntry.ttl) {
        if (isTokenKey) {
          console.log('✅ [Redis L1] Token encontrado na memória');
        }
        return memEntry.data as T;
      }
      this.memoryCache.delete(key);
      if (isTokenKey) {
        console.log('⚠️ [Redis L1] Token expirado na memória, buscando no Redis...');
      }
    }

    if (!this.isServer) return null;

    await this.ensureRedis();
    if (this.useRedis && this.redisClient) {
      try {
        if (isTokenKey) {
          console.log('🔍 [Redis L2] Buscando token do Redis...');
        }
        
        const cached = await Promise.race([
          this.redisClient.get(key),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
        ]) as string;
        
        if (cached) {
          const entry = JSON.parse(cached) as CacheEntry<T>;
          const age = Date.now() - entry.timestamp;

          if (age <= entry.ttl) {
            if (isTokenKey) {
              console.log('✅ [Redis L2] Token encontrado e válido no Redis');
            }
            setImmediate(() => {
              this.memoryCache.set(key, entry);
            });
            return entry.data as T;
          }
          
          if (isTokenKey) {
            console.log('⚠️ [Redis L2] Token expirado no Redis');
          }
          
          setImmediate(() => {
            this.redisClient?.del(key).catch(() => {});
          });
        } else if (isTokenKey) {
          console.log('⚠️ [Redis L2] Token não encontrado no Redis');
        }
      } catch (error: any) {
        if (isTokenKey) {
          console.error('❌ [Redis L2] Erro ao buscar token:', error.message);
        }
      }
    } else if (isTokenKey) {
      console.log('⚠️ [Redis] Redis não disponível');
    }

    return null;
  }

  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    if (!this.isServer) return;
    
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error('❌ Erro ao deletar do Redis:', error);
      }
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (!this.isServer) return;
    
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.flushDb();
        console.log('🗑️ Cache Redis limpo completamente');
      } catch (error) {
        console.error('❌ Erro ao limpar Redis:', error);
      }
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: ${cleaned} entradas expiradas removidas`);
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;

    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    if (!this.isServer) return count;

    if (this.useRedis && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          count += keys.length;
        }
      } catch (error) {
        console.error('❌ Erro ao invalidar padrão no Redis:', error);
      }
    }

    if (count > 0) {
      console.log(`🗑️ Invalidados ${count} registros de cache com padrão: ${pattern}`);
    }
    return count;
  }

  async invalidateParceiros(): Promise<number> {
    return this.invalidatePattern('parceiros');
  }

  async invalidateProdutos(): Promise<number> {
    return this.invalidatePattern('produtos');
  }

  async invalidateEstoque(): Promise<number> {
    return this.invalidatePattern('estoque');
  }

  async invalidatePrecos(): Promise<number> {
    return this.invalidatePattern('preco');
  }

  async invalidatePedidos(): Promise<number> {
    return this.invalidatePattern('pedidos');
  }

  async getStats() {
    const memorySize = this.memoryCache.size;
    const memoryKeys = Array.from(this.memoryCache.keys());
    
    let redisSize = 0;
    let redisKeys: string[] = [];

    if (this.isServer && this.useRedis && this.redisClient) {
      try {
        redisSize = await this.redisClient.dbSize();
        redisKeys = await this.redisClient.keys('*');
      } catch (error) {
        console.error('❌ Erro ao obter stats do Redis:', error);
      }
    }

    return {
      memorySize,
      redisSize,
      totalSize: memorySize + redisSize,
      usingRedis: this.useRedis,
      memoryKeys: memoryKeys.slice(0, 50),
      redisKeys: redisKeys.slice(0, 50),
      ttlConfig: this.TTL
    };
  }
}

export const redisCacheService = new RedisCacheService();
