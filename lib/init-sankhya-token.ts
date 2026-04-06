
import { obterToken } from './sankhya-api';
import { adicionarLog } from './api-logger';

/**
 * Inicializa o token do Sankhya automaticamente ao iniciar o servidor
 */
export async function initSankhyaToken() {
  try {
    console.log('🔐 [INIT-TOKEN] Iniciando autenticação automática com Sankhya...');
    adicionarLog('INFO', 'Iniciando autenticação automática com Sankhya');
    
    const token = await obterToken();
    
    console.log('✅ [INIT-TOKEN] Token Sankhya obtido com sucesso na inicialização do servidor');
    console.log('📅 [INIT-TOKEN] Token gerado em:', new Date().toISOString());
    
    adicionarLog('SUCCESS', 'Token Sankhya obtido com sucesso na inicialização', {
      geradoEm: new Date().toISOString()
    });
    
    return token;
  } catch (erro: any) {
    console.error('❌ [INIT-TOKEN] Erro ao obter token inicial do Sankhya:', erro.message);
    console.log('⚠️ [INIT-TOKEN] O sistema continuará, mas o token será obtido na primeira requisição');
    
    adicionarLog('ERROR', 'Erro ao obter token inicial do Sankhya', {
      erro: erro.message
    });
    
    return null;
  }
}
