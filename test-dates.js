const oracledb = require('oracledb');
require('dotenv').config({ path: 'config.env.local' });

async function checkData() {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECT_STRING
        });

        // Pega as últimas 5 datas distintas de notas da base
        const result = await connection.execute(`
      SELECT TO_CHAR(DTNEG, 'YYYY-MM-DD') as DATA, COUNT(*) as QTD
      FROM AS_CABECALHO_NOTA
      WHERE TIPMOV = 'V'
      GROUP BY TO_CHAR(DTNEG, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(DTNEG, 'YYYY-MM-DD') DESC
      FETCH FIRST 5 ROWS ONLY
    `);

        console.log("Últimas datas com movimento:");
        console.log(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}
checkData();
