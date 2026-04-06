require('dotenv').config();
const oracledb = require('oracledb');

async function run() {
    let connection;
    try {
        oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR });
        connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STRING,
        });
        console.log('Connected to Oracle Database');

        await connection.execute('ALTER TABLE AD_POLITICASCOMERCIAIS ADD RESULT_CODTAB NUMBER');
        console.log('Column RESULT_CODTAB added successfully.');
    } catch (err) {
        if (err.message && err.message.includes('ORA-01430')) {
            console.log('Column RESULT_CODTAB already exists.');
        } else {
            console.error(err);
        }
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
