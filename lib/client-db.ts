
import Dexie, { Table } from 'dexie';

class SankhyaOfflineDB extends Dexie {
  produtos!: Table<any>;
  parceiros!: Table<any>;
  financeiro!: Table<any>;
  tiposNegociacao!: Table<any>;
  tiposOperacao!: Table<any>;
  tiposPedido!: Table<any>;
  precos!: Table<any>;
  tabelasPrecos!: Table<any>;
  tabelasPrecosConfig!: Table<any>;
  pedidosPendentes!: Table<any>;
  pedidos!: Table<any>;
  usuarios!: Table<any>;
  vendedores!: Table<any>;
  volumes!: Table<any>;
  metadados!: Table<any>;
  rotas!: Table<any>;
  rotasParceiros!: Table<any>;
  visitasPendentes!: Table<any>;
  visitas!: Table<any>;
  visitaIdMappings!: Table<any>;
  regrasImpostos!: Table<any>;
  acessosUsuario!: Table<any>;
  acessosClientes!: Table<any>;
  acessosProdutos!: Table<any>;
  equipes!: Table<any>;
  equipesMembros!: Table<any>;
  bairros!: Table<any>;
  cidades!: Table<any>;
  empresas!: Table<any>;
  estados!: Table<any>;
  gruposProdutos!: Table<any>;
  marcas!: Table<any>;
  regioes!: Table<any>;
  politicasComerciais!: Table<any>;
  campanhas!: Table<any>;
  campanhaItens!: Table<any>;
  regrasIcmsParceiroEmpresa!: Table<any>;

  constructor() {
    super('SankhyaOfflineDB');

    // Versão 12 - adiciona tabelas de acessos e equipes
    this.version(12).stores({
      produtos: 'CODPROD, DESCRPROD, ATIVO',
      parceiros: 'CODPARC, NOMEPARC, CODVEND, CGC_CPF, CODTAB',
      financeiro: 'NUFIN, CODPARC, DTVENC, RECDESP',
      tiposNegociacao: 'CODTIPVENDA',
      tiposOperacao: 'CODTIPOPER',
      tiposPedido: 'CODTIPOPEDIDO, CODTIPOPER',
      estoque: '[CODPROD+CODLOCAL], CODPROD, CODLOCAL',
      precos: '[CODPROD+NUTAB], CODPROD, NUTAB',
      tabelasPrecos: 'NUTAB, CODTAB',
      tabelasPrecosConfig: 'CODCONFIG, NUTAB',
      pedidosPendentes: '++id, synced, createdAt',
      pedidos: 'NUNOTA, CODPARC, CODVEND, DTNEG',
      usuarios: 'CODUSUARIO, &EMAIL, username, NOME, FUNCAO, STATUS, passwordHash',
      vendedores: 'CODVEND, APELIDO, ATIVO',
      volumes: '[CODPROD+CODVOL], CODPROD, CODVOL, ATIVO',
      metadados: 'chave',
      rotas: 'CODROTA, CODVEND, ATIVO',
      rotasParceiros: '++id, CODROTA, CODPARC, ORDEM',
      visitasPendentes: '++id, synced, createdAt, action, CODPARC, localVisitaId',
      visitas: 'CODVISITA, CODROTA, CODPARC, CODVEND, DATA_VISITA, STATUS',
      visitaIdMappings: '&localVisitaId, codVisita, createdAt',
      regrasImpostos: 'ID_REGRA, NOME, ATIVO',
      acessosUsuario: 'CODUSUARIO',
      acessosClientes: '++id, CODUSUARIO, CODPARC',
      acessosProdutos: '++id, CODUSUARIO, CODPROD',
      equipes: 'CODEQUIPE, CODUSUARIO_GESTOR, ATIVO',
      equipesMembros: '++id, CODEQUIPE, CODUSUARIO'
    });

    // Versão 13 - Novas tabelas de referência
    this.version(13).stores({
      bairros: 'CODBAI, NOMEBAI, CODREG',
      cidades: 'CODCID, NOMECID, UFNOMECID, CODREG',
      empresas: 'CODEMP, NOMEFANTASIA',
      estados: 'CODUF, UF',
      gruposProdutos: 'CODGRUPOPROD, DESCRGRUPOPROD',
      marcas: 'CODIGO, DESCRICAO',
      regioes: 'CODREG, NOMEREG'
    });

    // Versão 14 - Políticas Comerciais
    this.version(14).stores({
      politicasComerciais: 'ID_POLITICA, ID_EMPRESA, ATIVO'
    });

    // Versão 15 - Correção Bairros Index
    this.version(15).stores({
      bairros: 'CODBAI, NOMEBAI, CODCID, CODREG'
    });

    // Versão 16 - Campos de Aprovação em Pedidos Pendentes
    this.version(16).stores({
      pedidosPendentes: '++id, synced, createdAt, statusAprovacao, idAprovador'
    }).upgrade(trans => {
      // Opcional: Migrar dados existentes se necessário
      return trans.table('pedidosPendentes').toCollection().modify(pedido => {
        if (!pedido.statusAprovacao) {
          pedido.statusAprovacao = 'NORMAL'; // Valor padrão
        }
      });
    });
    // Versão 17 - Campos para política comercial em parceiros
    this.version(17).stores({
      parceiros: 'CODPARC, NOMEPARC, CODVEND, CGC_CPF, CODTAB, CODMARCA, CODGRUPOPROD'
    });

    // Versão 18 - Adiciona CODREG aos parceiros
    this.version(18).stores({
      parceiros: 'CODPARC, NOMEPARC, CODVEND, CGC_CPF, CODTAB, CODMARCA, CODGRUPOPROD, CODREG'
    });

    // Versão 19 - Corrige campos: Marca e Grupo são de Produtos. Região é de Parceiros.
    this.version(19).stores({
      parceiros: 'CODPARC, NOMEPARC, CODVEND, CGC_CPF, CODTAB, CODREG',
      produtos: 'CODPROD, DESCRPROD, ATIVO, CODMARCA, CODGRUPOPROD'
    });

    // Versão 20 - Suporte offline para Pedidos FDV (ID como chave primária)
    this.version(20).stores({
      pedidos: 'ID, NUNOTA, CODPARC, CODVEND, DTNEG'
    });

    // Versão 21 - Políticas Comerciais (re-adicionado para forçar upgrade em clientes que já estavam na v20)
    // Atualizado v21b implícita para incluir RESULT_CODTAB na sincronização (mantendo índices)
    this.version(21).stores({
      politicasComerciais: 'ID_POLITICA, ID_EMPRESA, ATIVO, RESULT_CODTAB'
    });

    // Versão 22 - Remove Estoque (Table dropped)
    this.version(22).stores({
      estoque: null
    });

    // Versão 23 - Sistema de Campanhas
    this.version(23).stores({
      campanhas: 'ID_CAMPANHA, ID_EMPRESA, NOME, TIPO, ATIVO',
      campanhaItens: '++id, ID_CAMPANHA, CODPROD'
    });

    // Versão 24 - Regras de ICMS por Parceiro e Empresa
    this.version(24).stores({
      regrasIcmsParceiroEmpresa: '[ID_SISTEMA+CODEMP+CODPARC], ID_SISTEMA, CODEMP, CODPARC, CODTAB'
    });

    // Versão 25 - Adiciona PREF_PARCEIRO_EMPRESA às Políticas Comerciais
    this.version(25).stores({
      politicasComerciais: 'ID_POLITICA, ID_EMPRESA, ATIVO, RESULT_CODTAB, PREF_PARCEIRO_EMPRESA'
    });
  }
}

export const db = new SankhyaOfflineDB();
