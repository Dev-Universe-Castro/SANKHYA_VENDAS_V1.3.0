
const { oracleService } = require('./lib/oracle-db');

async function debugAtividades() {
  try {
    console.log('--- DEBUG ATIVIDADES ---');
    const res = await oracleService.executeQuery('SELECT CODATIVIDADE, TITULO, DATA_INICIO, CODUSUARIO, ID_EMPRESA, ATIVO FROM AD_ADLEADSATIVIDADES ORDER BY CODATIVIDADE DESC FETCH FIRST 10 ROWS ONLY', {});
    console.log('Resultados:', JSON.stringify(res, null, 2));
    
    if (res.length > 0) {
      const first = res[0];
      console.log('Tipo de DATA_INICIO:', typeof first.DATA_INICIO);
      console.log('Valor de DATA_INICIO:', first.DATA_INICIO);
    }
    
    console.log('--- FIM DEBUG ---');
  } catch (error) {
    console.error('Erro no debug:', error);
  } finally {
    process.exit();
  }
}

debugAtividades();
