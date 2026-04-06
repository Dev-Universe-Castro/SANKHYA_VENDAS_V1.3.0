const { oracleService } = require('./lib/oracle-db');

async function run() {
    try {
        const result = await oracleService.executeQuery("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'AD_ACESSOS_USUARIO'");
        console.log(result.map(r => r.COLUMN_NAME));
    } catch (e) {
        console.error('Erro:', e.message);
    }
    process.exit(0);
}
run();
