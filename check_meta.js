
import oracledb from 'oracledb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function checkMetadata() {
  let connection;
  try {
    console.log('🔗 Conectando ao Oracle...');
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING
    });

    console.log('📋 Descrevendo tabela AD_PEDIDOS_FDV...');
    const result = await connection.execute(
      "SELECT column_name, data_type FROM all_tab_columns WHERE table_name = 'AD_PEDIDOS_FDV' ORDER BY column_id"
    );
    
    console.log('Colunas encontradas:');
    result.rows.forEach(row => console.log(`- ${row[0]}: ${row[1]}`));

    if (result.rows.length === 0) {
      console.log('⚠️ Tabela AD_PEDIDOS_FDV não encontrada ou sem acesso!');
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    if (connection) {
      await connection.close();
    }
    process.exit(0);
  }
}

checkMetadata();
