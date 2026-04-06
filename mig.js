const { oracleService } = require('./lib/oracle-db');
async function run() {
    try {
        await oracleService.executeQuery("ALTER TABLE AD_ACESSOS_USUARIO ADD TELA_DASHBOARD VARCHAR2(1) DEFAULT 'S'");
        console.log('Sucesso');
    } catch (e) {
        if (e.message.includes('ORA-01430')) {
            console.log('Column already exists');
        } else {
            console.error('Erro:', e.message);
        }
    }
    process.exit(0);
}
run();
