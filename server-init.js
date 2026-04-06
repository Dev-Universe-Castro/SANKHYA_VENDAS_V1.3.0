
/**
 * Script de inicialização do servidor
 * A inicialização do token agora é feita via instrumentation.ts
 */

console.log('🔥 [SERVER-INIT] Carregando variáveis de ambiente...');

// Carregar variáveis de ambiente
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'config.env.local') });

// Verificar variáveis críticas
const criticalVars = ['ORACLE_USER', 'ORACLE_PASSWORD', 'ORACLE_CONNECT_STRING'];
const missing = criticalVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error('❌ [SERVER-INIT] Variáveis críticas faltando:', missing.join(', '));
  process.exit(1);
}

console.log('✅ [SERVER-INIT] Variáveis carregadas. Next.js iniciará em seguida...');
