export interface User {
  id: number
  name: string
  email: string
  role: 'Administrador' | 'Gerente' | 'Vendedor' | 'Usuário'
  status: 'ativo' | 'bloqueado' | 'pendente'
  avatar?: string
  password?: string
  codVendedor?: number // Código do vendedor/gerente na tabela Vendedor
  codEmp?: number // Código da empresa (Sankhya AS_EMPRESAS)
  ID_EMPRESA?: number // ID do contrato/unidade no sistema Multitenant
  permissions?: any
}

export interface Vendedor {
  CODVEND: number
  APELIDO: string
  TIPVEND: 'V' | 'G' // V = Vendedor, G = Gerente
  ATIVO: 'S' | 'N'
  EMPRESA: number
  CODGER?: number // Código do gerente (apenas para vendedores)
}

export interface RotaParceiro {
  CODROTAPARC: number;
  CODROTA: number;
  CODPARC: number;
  NOMEPARC: string;
  ORDEM: number;
  LATITUDE?: number;
  LONGITUDE?: number;
  ENDERECO?: string;
  NUMERO?: string;
}

export interface Rota {
  CODROTA: number;
  DESCRICAO: string;
  TIPO_RECORRENCIA: 'SEMANAL' | 'DIARIO' | 'INTERVALO';
  INTERVALO_DIAS: number;
  DATA_INICIO: string;
  DATA_FIM: string;
  NOMEVENDEDOR?: string;
  parceiros?: RotaParceiro[];
}

export interface Visita {
  CODVISITA: number;
  CODPARC: number;
  NOMEPARC: string;
  DHVISITA: string;
  STATUS: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | 'CHECKIN';
  CIDADE?: string;
  HORA_CHECKIN?: string;
  HORA_CHECKOUT?: string;
  duracao?: number;
  PEDIDO_GERADO?: 'S' | 'N';
  NUNOTA?: number;
  NOMEVENDEDOR?: string;
  LATITUDE?: number;
  LONGITUDE?: number;
  ENDERECO?: string;
  NUMERO?: string;
}
