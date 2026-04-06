// script to describe AD_USUARIOSVENDAS
const oracledb = require('oracledb');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'config.env.local' });

async function run() {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECT_STRING
        });

        const result = await connection.execute(
            `SELECT column_name, data_type 
       FROM user_tab_cols 
       WHERE table_name = 'AD_USUARIOSVENDAS'`
        );

        console.log("Columns of AD_USUARIOSVENDAS:");
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

run();
