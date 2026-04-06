require('dotenv').config({ path: require('path').resolve(process.cwd(), 'config.env.local') });
require('ts-node').register({ transpileOnly: true });

const { oracleService } = require('./lib/oracle-db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Iniciando migração de Relatórios (JS + ts-node/register)...');
  try {
    const sqlPath = path.resolve(process.cwd(), 'lib', 'oracle-scripts', 'migration_relatorios.sql');
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
