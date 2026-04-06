
import { oracleService } from './oracle-db';

export async function initializeOracle() {
  try {
    console.log('🔄 Inicializando conexão Oracle...');
    await oracleService.initialize();
    console.log('✅ Oracle Database inicializado com sucesso!');
    
    // Testar consulta
    const result = await oracleService.executeQuery(
      'SELECT COUNT(*) AS TOTAL FROM AD_USUARIOSVENDAS'
    );
    
    console.log(`📊 Total de usuários cadastrados: ${result[0]?.TOTAL || 0}`);
    
  } catch (error) {
    console.error('❌ Erro ao inicializar Oracle:', error);
    throw error;
  }
}
