import { config } from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import { oracleService } from './lib/oracle-db';

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), 'config.env.local') });

async function runMigration() {
  console.log('🚀 Iniciando migração de Relatórios...');
  try {
    const sqlPath = resolve(process.cwd(), 'lib', 'oracle-scripts', 'migration_relatorios.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo SQL não encontrado em: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql.split(/;\s*$/m).filter(s => s.trim() !== '');

    console.log(`Encontrados ${statements.length} comandos SQL.`);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      
      console.log(`\n📝 Executando:\n${trimmed.substring(0, 100)}${trimmed.length > 100 ? '...' : ''}`);
      await oracleService.executeQuery(trimmed);
      console.log('✅ Sucesso!');
    }

    console.log('\n✨ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error);
    process.exit(1);
  }
}

runMigration();
