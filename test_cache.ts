import dotenv from 'dotenv';
dotenv.config({ path: 'config.env.local' });
import { PedidosPortalService } from './lib/pedidos-portal-service';

async function run() {
  try {
    const res = await PedidosPortalService.obterStatusEmTempoReal(1, 401, false); 
    console.log("SUCESSO:", res);
  } catch (e) {
    console.error("ERRO OCORRIDO:", e);
  }
  process.exit();
}
run();
