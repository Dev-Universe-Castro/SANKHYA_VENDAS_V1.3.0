
/**
 * Este arquivo é executado automaticamente pelo Next.js quando o servidor inicia
 * Ele roda apenas UMA VEZ, antes de qualquer requisição
 * 
 * Documentação: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Carregar variáveis de ambiente primeiro
    const path = require('path');
    require('dotenv').config({ path: path.resolve(process.cwd(), 'config.env.local') });

    console.log('🚀 [INSTRUMENTATION] Iniciando servidor...');

    // Run initialization in background to avoid blocking server startup
    (async () => {
      try {
        const { initSankhyaToken } = require('./lib/init-sankhya-token');
        const { initSuperAdmin } = require('./lib/init-super-admin');

        console.log('🔄 [INSTRUMENTATION] Inicializando token Sankhya...');
        await initSankhyaToken();

        console.log('👤 [INSTRUMENTATION] Verificando super admin...');
        await initSuperAdmin();

        console.log('✅ [INSTRUMENTATION] Servidor inicializado com sucesso');
      } catch (error) {
        console.error('❌ [INSTRUMENTATION] Erro na inicialização:', error);
      }
    })();
  } else {
    console.log('[INSTRUMENTATION] Não está rodando no runtime nodejs, pulando inicialização');
  }
}
