const oracledb = require('oracledb');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'config.env.local' });
(async () => {
  let c = await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING
  });
  const r = await c.execute(`SELECT column_name FROM user_tab_cols WHERE table_name = 'AD_VISITAS'`);
  fs.writeFileSync('tmp/cols.txt', "COLUMNS: " + r.rows.map(x => x[0]).join(', '));
  await c.close();
})();
