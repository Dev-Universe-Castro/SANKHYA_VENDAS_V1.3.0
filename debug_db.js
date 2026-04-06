
const { oracleService } = require('./lib/oracle-db');

async function checkTable() {
  try {
    console.log('🔍 Verificando estrutura da tabela AD_PEDIDOS_FDV...');
    const connectString = process.env.ORACLE_CONNECT_STRING;
    console.log('Connect String exists:', !!connectString);
    
    // Tentar um SELECT simples
    const result = await oracleService.executeQuery('SELECT count(*) as total FROM AD_PEDIDOS_FDV');
    console.log('Total registros:', result[0]?.TOTAL || result[0]?.total);

    // Tentar o SELECT completo usado no service
    const sql = `
      SELECT 
        ID,
        ID_EMPRESA,
        ORIGEM,
        DBMS_LOB.SUBSTR(CORPO_JSON, 4000, 1) as CORPO_JSON
      FROM AD_PEDIDOS_FDV
      WHERE ROWNUM <= 1
    `;
    const rows = await oracleService.executeQuery(sql);
    console.log('Amostra de dados:', JSON.stringify(rows).substring(0, 500));

  } catch (e) {
    console.error('❌ ERRO NO BANCO:', e.message);
    if (e.stack) console.error(e.stack);
  } finally {
    process.exit(0);
  }
}

checkTable();
