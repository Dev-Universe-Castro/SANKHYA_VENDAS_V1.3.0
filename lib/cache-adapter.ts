
// Adapter para usar o cache apropriado baseado no ambiente
import { cacheService } from './cache-service';

// Exportar cache service para compatibilidade
// Em produção, você pode substituir por redisCacheService
export const cache = cacheService;

export default cache;
