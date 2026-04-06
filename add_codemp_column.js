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

        await connection.execute(`ALTER TABLE AD_USUARIOSVENDAS ADD CODEMP NUMBER`);
        console.log("Column CODEMP added successfully to AD_USUARIOSVENDAS!");
    } catch (err) {
        if (err.message.includes("ORA-01430") || err.message.includes("column being added already exists")) {
            console.log("Column CODEMP already exists in AD_USUARIOSVENDAS.");
        } else {
            console.error("Error adding column:", err);
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
