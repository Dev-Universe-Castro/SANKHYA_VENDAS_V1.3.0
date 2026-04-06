
import oracledb from 'oracledb';

// Configuração do Oracle Client
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;
oracledb.fetchAsString = [oracledb.CLOB]; // Retornar CLOBs como strings automaticamente

interface OracleConfig {
  user: string;
  password: string;
  connectString: string;
}

class OracleService {
  private config: OracleConfig;
  private pool: oracledb.Pool | null = null;

  constructor() {
    this.config = {
      user: process.env.ORACLE_USER || 'SYSTEM',
      password: process.env.ORACLE_PASSWORD || '',
      connectString: process.env.ORACLE_CONNECT_STRING || ''
    };
  }

  async initialize() {
    try {
      if (!this.pool) {
        this.pool = await oracledb.createPool({
          user: this.config.user,
          password: this.config.password,
          connectString: this.config.connectString,
          poolMin: 2,
          poolMax: 10,
          poolIncrement: 2,
          poolTimeout: 60,
          // Aumentar timeouts para evitar NJS-510 em conexões instáveis
          transportConnectTimeout: 60000,
          connectTimeout: 60000
        });
        console.log('✅ Pool de conexões Oracle criado com sucesso');
      }
      return this.pool;
    } catch (error) {
      console.error('❌ Erro ao criar pool Oracle:', error);
      throw error;
    }
  }

  async getConnection(): Promise<oracledb.Connection> {
    try {
      if (!this.pool) {
        await this.initialize();
      }
      const connection = await this.pool!.getConnection();
      return connection;
    } catch (error) {
      console.error('❌ Erro ao obter conexão Oracle:', error);
      throw error;
    }
  }

  async executeQuery<T = any>(sql: string, binds: any = {}, options: any = {}): Promise<any> {
    let connection: oracledb.Connection | null = null;
    try {
      connection = await this.getConnection();
      const result = await connection.execute(sql, binds, options);

      // Se houver outBinds, retornar o resultado completo
      if (result.outBinds) {
        return result;
      }

      // Para UPDATE/DELETE/INSERT, retornar objeto com rowsAffected
      if (result.rowsAffected !== undefined) {
        return {
          rows: (result.rows as T[]) || [],
          rowsAffected: result.rowsAffected
        };
      }

      return (result.rows as T[]) || [];
    } catch (error) {
      console.error('❌ Erro ao executar query:', error);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error('Erro ao fechar conexão:', error);
        }
      }
    }
  }

  get BIND_OUT() {
    return oracledb.BIND_OUT;
  }

  get NUMBER() {
    return oracledb.NUMBER;
  }

  async executeOne<T = any>(sql: string, binds: any = {}): Promise<T | null> {
    const results = await this.executeQuery<T>(sql, binds);
    return results.length > 0 ? results[0] : null;
  }

  async close() {
    if (this.pool) {
      await this.pool.close(10);
      this.pool = null;
      console.log('✅ Pool de conexões Oracle fechado');
    }
  }
}

// Singleton para evitar múltiplas conexões em ambiente de desenvolvimento (Hot Reloading)
const globalForOracle = globalThis as unknown as {
  oracleService: OracleService | undefined;
};

export const oracleService = globalForOracle.oracleService ?? new OracleService();

if (process.env.NODE_ENV !== 'production') {
  globalForOracle.oracleService = oracleService;
}
