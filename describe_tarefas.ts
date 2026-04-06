const { oracleService } = require('./lib/oracle-db.ts');

async function check() {
    try {
        const res = await oracleService.executeQuery("SELECT column_name, data_type FROM user_tab_columns WHERE table_name = 'AD_TAREFAS'", {});
        console.table(res);
    } catch (e) {
        console.error(e);
    }
}
check();
