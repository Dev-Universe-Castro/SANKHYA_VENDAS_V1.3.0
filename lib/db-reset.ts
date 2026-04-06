import Dexie from 'dexie';
import { db } from './client-db';

export async function resetDatabaseIfNeeded() {
  try {
    const { db } = await import('./client-db');

    // Tentar uma operação simples para verificar se o banco está OK
    await db.produtos.limit(1).toArray();

    console.log('✅ Banco de dados OK');
    return false;
  } catch (error: any) {
    console.warn('⚠️ Erro no banco de dados detectado:', error.message);

    // Verificar se é erro de schema/versão
    if (error.name === 'VersionError' || 
        error.name === 'DatabaseClosedError' || 
        error.name === 'UpgradeError' ||
        error.message?.includes('primary key')) {

      console.log('🗑️ Deletando banco de dados corrompido...');
      await Dexie.delete('SankhyaOfflineDB');

      console.log('✅ Banco deletado, aguardando recriação...');

      // Aguardar um pouco antes de recriar
      await new Promise(resolve => setTimeout(resolve, 500));

      // Importar novamente para forçar recriação
      const { db: newDb } = await import('./client-db');
      await newDb.open();

      console.log('✅ Banco recriado com sucesso');
      return true;
    }

    throw error;
  }
}