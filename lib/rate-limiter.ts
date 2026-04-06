
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Limpar antigas a cada minuto
    setInterval(() => this.cleanup(), 60000);
  }

  check(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Obter requisições deste identificador
    let requests = this.requests.get(identifier) || [];
    
    // Filtrar apenas requisições dentro da janela de tempo
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    const allowed = requests.length < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - requests.length);
    
    if (allowed) {
      requests.push(now);
      this.requests.set(identifier, requests);
    }
    
    return { allowed, remaining };
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }

  reset(identifier: string) {
    this.requests.delete(identifier);
  }
}

// Limitadores específicos
export const apiLimiter = new RateLimiter(60000, 100); // 100 req/min
export const authLimiter = new RateLimiter(300000, 5);  // 5 req/5min
export const searchLimiter = new RateLimiter(10000, 20); // 20 req/10s
