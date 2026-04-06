import dotenv from 'dotenv';
dotenv.config({ path: 'config.env.local' });
import { oracleService } from './lib/oracle-db';

async function run(){
  try {
    const res = await oracleService.executeQuery("SELECT DADOS_JSON, TO_CHAR(DATA_ATUALIZACAO, 'YYYY-MM-DD\"T\"HH24:MI:SS') as DATA_ISO FROM AD_PEDIDOS_STATUS_CACHE WHERE ID_PEDIDO_FDV = 401");
    console.log('CACHE DB:', res);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
