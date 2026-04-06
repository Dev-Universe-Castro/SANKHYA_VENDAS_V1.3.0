import { oracleService } from './oracle-db';

export interface UserAccess {
  userId: number;
  idEmpresa: number;
  role: string;
  codVendedor: number | null;
  codGerente: number | null;
  isAdmin: boolean;
  vendedoresEquipe: number[];
}

export interface UserScreenAccess {
  telaPedidosVendas: boolean;
  telaRotas: boolean;
  telaTarefas: boolean;
  telaNegocios: boolean;
  telaClientes: boolean;
  telaProdutos: boolean;
  telaTabelaPrecos: boolean;
  telaUsuarios: boolean;
  telaAdministracao: boolean;
  telaDashboard: boolean;
}

export interface UserDataAccess {
  acessoClientes: 'VINCULADO' | 'EQUIPE' | 'MANUAL' | 'TODOS';
  acessoProdutos: 'TODOS' | 'MARCA' | 'GRUPO' | 'MANUAL';
  acessoTarefas: 'VINCULADO' | 'EQUIPE' | 'TODOS';
  acessoAdministracao: boolean;
  acessoUsuarios: boolean;
}

export interface FullUserAccess extends UserAccess {
  screens: UserScreenAccess;
  data: UserDataAccess;
  clientesManuais?: number[];
  produtosManuais?: number[];
  marcasPermitidas?: number[];
  gruposPermitidos?: number[];
}

export class AccessControlService {
  /**
   * Valida se o usuário tem vendedor/gerente vinculado
   * Retorna erro se não for admin e não tiver vinculação
   */
  async validateUserAccess(userId: number, idEmpresa: number): Promise<UserAccess> {
    console.log('🔐 Validando acesso do usuário:', { userId, idEmpresa });

    const sql = `
      SELECT 
        u.CODUSUARIO,
        u.FUNCAO,
        u.CODVEND,
        v.TIPVEND,
        v.CODGER
      FROM AD_USUARIOSVENDAS u
      LEFT JOIN AS_VENDEDORES v ON u.CODVEND = v.CODVEND AND v.ID_SISTEMA = :idEmpresa
      WHERE u.CODUSUARIO = :userId
        AND u.ID_EMPRESA = :idEmpresa
    `;

    const result = await oracleService.executeOne<any>(sql, { userId, idEmpresa });

    if (!result) {
      console.warn(`⚠️ Usuário ${userId} da empresa ${idEmpresa} não encontrado em AD_USUARIOSVENDAS. Retornando acesso básico.`);
      return {
        userId,
        idEmpresa,
        role: 'Vendedor',
        codVendedor: null,
        codGerente: null,
        isAdmin: false,
        vendedoresEquipe: []
      };
    }

    const isAdmin = result.FUNCAO === 'Administrador' || result.FUNCAO === 'ADMIN';
    const codVendedor = result.CODVEND ? Number(result.CODVEND) : null;

    // Verificar se precisa de vinculação
    if (!isAdmin && !codVendedor) {
      console.warn(`⚠️ Usuário ${userId} não possui vendedor vinculado, permitindo acesso básico.`);
    }

    // Buscar vendedores da equipe via AD_EQUIPES (nova estrutura)
    let vendedoresEquipe: number[] = [];

    // Verificar se usuário é gestor de alguma equipe na AD_EQUIPES
    const equipesSql = `
      SELECT e.CODEQUIPE, m.CODUSUARIO
      FROM AD_EQUIPES e
      JOIN AD_EQUIPES_MEMBROS m ON e.CODEQUIPE = m.CODEQUIPE AND m.ATIVO = 'S'
      WHERE e.CODUSUARIO_GESTOR = :userId
        AND e.ID_EMPRESA = :idEmpresa
        AND e.ATIVO = 'S'
    `;
    const membrosEquipe = await oracleService.executeQuery<any>(equipesSql, { userId, idEmpresa });

    if (membrosEquipe.length > 0) {
      // Buscar codVendedor dos membros da equipe
      const usuariosIds = membrosEquipe.map((m: any) => Number(m.CODUSUARIO));
      const vendedoresMembros = await oracleService.executeQuery<any>(`
        SELECT CODVEND FROM AD_USUARIOSVENDAS 
        WHERE CODUSUARIO IN (${usuariosIds.join(',')})
          AND ID_EMPRESA = :idEmpresa
          AND CODVEND IS NOT NULL
      `, { idEmpresa });
      vendedoresEquipe = vendedoresMembros.map((v: any) => Number(v.CODVEND));
    }

    const userAccess: UserAccess = {
      userId,
      idEmpresa,
      role: result.FUNCAO,
      codVendedor,
      codGerente: result.CODGER ? Number(result.CODGER) : null,
      isAdmin,
      vendedoresEquipe
    };

    console.log('✅ Acesso validado:', userAccess);
    return userAccess;
  }

  /**
   * Valida se o usuário pode criar/editar dados
   * Apenas Admin ou usuário com vendedor vinculado
   */
  canCreateOrEdit(access: UserAccess): boolean {
    return access.isAdmin || access.codVendedor !== null;
  }

  /**
   * Retorna mensagem de erro caso não possa criar/editar
   */
  getAccessDeniedMessage(access: UserAccess): string {
    if (access.isAdmin) return '';
    if (access.codVendedor) return '';
    return '⚠️ ACESSO NEGADO: Seu usuário não possui vendedor/gerente vinculado. Você não pode criar leads, pedidos, financeiro, parceiros ou usar a IA. Apenas administradores podem executar estas ações sem vínculo. Entre em contato com o administrador do sistema.';
  }

  /**
   * Valida se pode acessar funcionalidades restritas (IA, análise, etc)
   */
  canAccessRestrictedFeatures(access: UserAccess): boolean {
    return access.isAdmin || access.codVendedor !== null;
  }

  /**
   * Retorna mensagem específica para funcionalidades restritas
   */
  getRestrictedFeatureMessage(featureName: string): string {
    return `⚠️ ACESSO NEGADO À ${featureName.toUpperCase()}: Você não possui vendedor/gerente vinculado ao seu usuário. Esta funcionalidade está disponível apenas para usuários com vendedor vinculado ou administradores. Entre em contato com o administrador do sistema.`;
  }

  /**
   * Retorna a cláusula WHERE para filtrar leads por permissão
   */
  getLeadsWhereClause(userAccess: UserAccess): { clause: string; binds: Record<string, any> } {
    if (userAccess.isAdmin) {
      return { clause: '', binds: {} };
    }

    // Vendedor comum: ver apenas leads criados por ele (CODUSUARIO)
    if (!userAccess.vendedoresEquipe || userAccess.vendedoresEquipe.length === 0) {
      return {
        clause: 'AND l.CODUSUARIO = :userId',
        binds: { userId: userAccess.userId }
      };
    }

    // Gerente: ver leads criados por usuários da equipe (buscar CODUSUARIOs vinculados aos CODVENDs da equipe)
    const allVendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe].filter(Boolean);
    return {
      clause: `AND l.CODUSUARIO IN (
        SELECT uv.CODUSUARIO 
        FROM AD_USUARIOSVENDAS uv 
        WHERE uv.CODVEND IN (${allVendedores.join(',')})
          AND uv.ID_EMPRESA = :idEmpresa
      )`,
      binds: { idEmpresa: userAccess.idEmpresa }
    };
  }

  /**
   * Retorna a cláusula WHERE para filtrar parceiros por permissão
   */
  getParceirosWhereClause(access: UserAccess): { clause: string; binds: any } {
    if (access.isAdmin) {
      return { clause: '', binds: {} };
    }

    if (!access.codVendedor) {
      // Sem vendedor vinculado - não deve chegar aqui devido à validação prévia
      return {
        clause: 'AND 1 = 0',
        binds: {}
      };
    }

    if (access.vendedoresEquipe.length > 0) {
      // Gerente: ver parceiros seus e da equipe
      const allVendedores = [access.codVendedor, ...access.vendedoresEquipe];
      return {
        clause: `AND CODVEND IN (${allVendedores.join(',')})`,
        binds: {}
      };
    }

    // Vendedor: ver apenas seus parceiros
    return {
      clause: 'AND CODVEND = :codVendedor',
      binds: { codVendedor: access.codVendedor }
    };
  }

  /**
   * Retorna a cláusula WHERE para filtrar pedidos por permissão
   */
  getPedidosWhereClause(userAccess: UserAccess): { clause: string; binds: Record<string, any> } {
    if (userAccess.isAdmin) {
      return { clause: '', binds: {} };
    }

    if (!userAccess.codVendedor) {
      return { clause: '', binds: {} };
    }

    // Vendedor comum: ver pedidos de parceiros vinculados ao seu CODVEND
    if (!userAccess.vendedoresEquipe || userAccess.vendedoresEquipe.length === 0) {
      return {
        clause: 'AND EXISTS (SELECT 1 FROM AS_PARCEIROS p WHERE p.CODPARC = cab.CODPARC AND p.ID_SISTEMA = cab.ID_SISTEMA AND p.SANKHYA_ATUAL = \'S\' AND p.CODVEND = :codVend)',
        binds: { codVend: userAccess.codVendedor }
      };
    }

    // Gerente: ver pedidos de parceiros vinculados aos vendedores da equipe (incluindo ele mesmo)
    const vendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe].filter(Boolean);
    return {
      clause: `AND EXISTS (SELECT 1 FROM AS_PARCEIROS p WHERE p.CODPARC = cab.CODPARC AND p.ID_SISTEMA = cab.ID_SISTEMA AND p.SANKHYA_ATUAL = 'S' AND p.CODVEND IN (${vendedores.join(',')}))`,
      binds: {}
    };
  }

  getFinanceiroWhereClause(userAccess: UserAccess): { clause: string; binds: Record<string, any> } {
    if (userAccess.isAdmin) {
      return { clause: '', binds: {} };
    }

    if (!userAccess.codVendedor) {
      return { clause: '', binds: {} };
    }

    // Vendedor comum: ver títulos de parceiros vinculados ao seu CODVEND
    if (!userAccess.vendedoresEquipe || userAccess.vendedoresEquipe.length === 0) {
      return {
        clause: 'AND EXISTS (SELECT 1 FROM AS_PARCEIROS p WHERE p.CODPARC = F.CODPARC AND p.ID_SISTEMA = F.ID_SISTEMA AND p.SANKHYA_ATUAL = \'S\' AND p.CODVEND = :codVend)',
        binds: { codVend: userAccess.codVendedor }
      };
    }

    // Gerente: ver títulos de parceiros vinculados aos vendedores da equipe (incluindo ele mesmo)
    const vendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe].filter(Boolean);
    return {
      clause: `AND EXISTS (SELECT 1 FROM AS_PARCEIROS p WHERE p.CODPARC = F.CODPARC AND p.ID_SISTEMA = F.ID_SISTEMA AND p.SANKHYA_ATUAL = 'S' AND p.CODVEND IN (${vendedores.join(',')}))`,
      binds: {}
    };
  }

  /**
   * Retorna a cláusula WHERE para filtrar atividades por permissão
   */
  getAtividadesWhereClause(userAccess: UserAccess): { clause: string; binds: Record<string, any> } {
    if (userAccess.isAdmin) {
      return { clause: '', binds: {} };
    }

    // Vendedor comum: ver apenas atividades criadas por ele (CODUSUARIO)
    if (!userAccess.vendedoresEquipe || userAccess.vendedoresEquipe.length === 0) {
      return {
        clause: 'AND a.CODUSUARIO = :userId',
        binds: { userId: userAccess.userId }
      };
    }

    // Gerente: ver atividades criadas por usuários da equipe (buscar CODUSUARIOs vinculados aos CODVENDs da equipe)
    const allVendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe].filter(Boolean);
    return {
      clause: `AND a.CODUSUARIO IN (
        SELECT uv.CODUSUARIO 
        FROM AD_USUARIOSVENDAS uv 
        WHERE uv.CODVEND IN (${allVendedores.join(',')})
          AND uv.ID_EMPRESA = :idEmpresa
      )`,
      binds: { idEmpresa: userAccess.idEmpresa }
    };
  }

  /**
   * Retorna a cláusula WHERE para filtrar rotas por permissão
   */
  getRotasWhereClause(userAccess: UserAccess): { clause: string; binds: Record<string, any> } {
    if (userAccess.isAdmin) {
      return { clause: '', binds: {} };
    }

    if (!userAccess.codVendedor) {
      return { clause: 'AND 1 = 0', binds: {} };
    }

    // Vendedor comum: ver apenas suas rotas
    if (!userAccess.vendedoresEquipe || userAccess.vendedoresEquipe.length === 0) {
      return {
        clause: 'AND r.CODVEND = :codVend',
        binds: { codVend: userAccess.codVendedor }
      };
    }

    // Gerente: ver rotas suas e da equipe
    const vendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe].filter(Boolean);
    return {
      clause: `AND r.CODVEND IN (${vendedores.join(',')})`,
      binds: {}
    };
  }

  /**
   * Retorna a cláusula WHERE para filtrar visitas por permissão
   */
  getVisitasWhereClause(userAccess: UserAccess): { clause: string; binds: Record<string, any> } {
    if (userAccess.isAdmin) {
      return { clause: '', binds: {} };
    }

    if (!userAccess.codVendedor) {
      return { clause: 'AND 1 = 0', binds: {} };
    }

    // Vendedor comum: ver apenas suas visitas
    if (!userAccess.vendedoresEquipe || userAccess.vendedoresEquipe.length === 0) {
      return {
        clause: 'AND v.CODVEND = :codVend',
        binds: { codVend: userAccess.codVendedor }
      };
    }

    // Gerente: ver visitas suas e da equipe
    const vendedores = [userAccess.codVendedor, ...userAccess.vendedoresEquipe].filter(Boolean);
    return {
      clause: `AND v.CODVEND IN (${vendedores.join(',')})`,
      binds: {}
    };
  }

  /**
   * Retorna filtros para a IA (Gemini) baseado nas permissões
   */
  getIADataFilters(access: UserAccess): {
    leads: string;
    parceiros: string;
    pedidos: string;
    financeiro: string;
    atividades: string;
    rotas: string;
    visitas: string;
  } {
    const leadsFilter = this.getLeadsWhereClause(access);
    const parceirosFilter = this.getParceirosWhereClause(access);
    const pedidosFilter = this.getPedidosWhereClause(access);
    const financeiroFilter = this.getFinanceiroWhereClause(access);
    const atividadesFilter = this.getAtividadesWhereClause(access);
    const rotasFilter = this.getRotasWhereClause(access);
    const visitasFilter = this.getVisitasWhereClause(access);

    return {
      leads: leadsFilter.clause,
      parceiros: parceirosFilter.clause,
      pedidos: pedidosFilter.clause,
      financeiro: financeiroFilter.clause,
      atividades: atividadesFilter.clause,
      rotas: rotasFilter.clause,
      visitas: visitasFilter.clause
    };
  }

  /**
   * Verifica se usuário tem permissão específica (customizada ou padrão)
   */
  async checkPermission(
    userId: number,
    idEmpresa: number,
    permissionKey: string,
    userRole: string
  ): Promise<{ allowed: boolean; dataScope?: string }> {
    try {
      const customSql = `
        SELECT ALLOWED, DATA_SCOPE 
        FROM AD_ACL_USER_RULES 
        WHERE CODUSUARIO = :userId 
          AND ID_EMPRESA = :idEmpresa 
          AND PERMISSION_KEY = :permissionKey
      `;
      const customPerm = await oracleService.executeOne<any>(customSql, {
        userId, idEmpresa, permissionKey
      });

      if (customPerm) {
        return {
          allowed: customPerm.ALLOWED === 'S',
          dataScope: customPerm.DATA_SCOPE || undefined
        };
      }

      const defaultSql = `
        SELECT 
          DEFAULT_ADMIN, DEFAULT_GERENTE, DEFAULT_VENDEDOR, CATEGORY
        FROM AD_ACL_PERMISSION_DEFS 
        WHERE PERMISSION_KEY = :permissionKey
      `;
      const defaultPerm = await oracleService.executeOne<any>(defaultSql, { permissionKey });

      if (!defaultPerm) {
        return { allowed: false };
      }

      let allowed = false;
      let dataScope = 'OWN';

      if (userRole === 'Administrador' || userRole === 'ADMIN') {
        allowed = defaultPerm.DEFAULT_ADMIN === 'S';
        dataScope = 'ALL';
      } else if (userRole === 'Gerente') {
        allowed = defaultPerm.DEFAULT_GERENTE === 'S';
        dataScope = 'TEAM';
      } else {
        allowed = defaultPerm.DEFAULT_VENDEDOR === 'S';
        dataScope = 'OWN';
      }

      return {
        allowed,
        dataScope: defaultPerm.CATEGORY === 'DATA' ? dataScope : undefined
      };
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return { allowed: false };
    }
  }

  /**
   * Verifica acesso a uma página específica
   */
  async canAccessPage(userId: number, idEmpresa: number, pageKey: string, userRole: string): Promise<boolean> {
    const result = await this.checkPermission(userId, idEmpresa, `PAGE_${pageKey}`, userRole);
    return result.allowed;
  }

  /**
   * Verifica acesso a uma funcionalidade específica
   */
  async canUseFeature(userId: number, idEmpresa: number, featureKey: string, userRole: string): Promise<boolean> {
    const result = await this.checkPermission(userId, idEmpresa, `FEATURE_${featureKey}`, userRole);
    return result.allowed;
  }

  /**
   * Retorna o escopo de dados para uma entidade
   */
  async getDataScope(userId: number, idEmpresa: number, dataKey: string, userRole: string): Promise<string> {
    const result = await this.checkPermission(userId, idEmpresa, `DATA_${dataKey}`, userRole);
    return result.dataScope || 'OWN';
  }

  /**
   * Carrega todas as permissões de um usuário (para cache no frontend)
   */
  async getAllUserPermissions(userId: number, idEmpresa: number, userRole: string): Promise<Record<string, { allowed: boolean; dataScope?: string }>> {
    try {
      const defsSql = `SELECT PERMISSION_KEY, CATEGORY, DEFAULT_ADMIN, DEFAULT_GERENTE, DEFAULT_VENDEDOR FROM AD_ACL_PERMISSION_DEFS`;
      const definitions = await oracleService.executeQuery<any>(defsSql, {});

      const customSql = `
        SELECT PERMISSION_KEY, ALLOWED, DATA_SCOPE 
        FROM AD_ACL_USER_RULES 
        WHERE CODUSUARIO = :userId AND ID_EMPRESA = :idEmpresa
      `;
      const customPerms = await oracleService.executeQuery<any>(customSql, { userId, idEmpresa });

      const customMap: Record<string, any> = {};
      customPerms.forEach((p: any) => {
        customMap[p.PERMISSION_KEY] = p;
      });

      const result: Record<string, { allowed: boolean; dataScope?: string }> = {};

      definitions.forEach((def: any) => {
        const custom = customMap[def.PERMISSION_KEY];

        if (custom) {
          result[def.PERMISSION_KEY] = {
            allowed: custom.ALLOWED === 'S',
            dataScope: custom.DATA_SCOPE || undefined
          };
        } else {
          let allowed = false;
          let dataScope = 'OWN';

          if (userRole === 'Administrador' || userRole === 'ADMIN') {
            allowed = def.DEFAULT_ADMIN === 'S';
            dataScope = 'ALL';
          } else if (userRole === 'Gerente') {
            allowed = def.DEFAULT_GERENTE === 'S';
            dataScope = 'TEAM';
          } else {
            allowed = def.DEFAULT_VENDEDOR === 'S';
            dataScope = 'OWN';
          }

          result[def.PERMISSION_KEY] = {
            allowed,
            dataScope: def.CATEGORY === 'DATA' ? dataScope : undefined
          };
        }
      });

      return result;
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      return {};
    }
  }

  /**
   * Carrega configurações de acesso da tabela AD_ACESSOS_USUARIO
   */
  async getFullUserAccess(userId: number, idEmpresa: number): Promise<FullUserAccess> {
    const baseAccess = await this.validateUserAccess(userId, idEmpresa);

    const sql = `
      SELECT 
        ACESSO_CLIENTES,
        ACESSO_PRODUTOS,
        ACESSO_TAREFAS,
        ACESSO_ADMINISTRACAO,
        ACESSO_USUARIOS,
        TELA_PEDIDOS_VENDAS,
        TELA_ROTAS,
        TELA_TAREFAS,
        TELA_NEGOCIOS,
        TELA_CLIENTES,
        TELA_PRODUTOS,
        TELA_TABELA_PRECOS,
        TELA_USUARIOS,
        TELA_ADMINISTRACAO,
        TELA_DASHBOARD
      FROM AD_ACESSOS_USUARIO
      WHERE CODUSUARIO = :userId
    `;

    try {
      const result = await oracleService.executeOne<any>(sql, { userId });

      if (!result) {
        return {
          ...baseAccess,
          screens: {
            telaPedidosVendas: true,
            telaRotas: true,
            telaTarefas: true,
            telaNegocios: true,
            telaClientes: true,
            telaProdutos: true,
            telaTabelaPrecos: true,
            telaUsuarios: baseAccess.isAdmin,
            telaAdministracao: baseAccess.isAdmin,
            telaDashboard: true
          },
          data: {
            acessoClientes: 'VINCULADO',
            acessoProdutos: 'TODOS',
            acessoTarefas: 'VINCULADO',
            acessoAdministracao: baseAccess.isAdmin,
            acessoUsuarios: baseAccess.isAdmin
          }
        };
      }

      const fullAccess: FullUserAccess = {
        ...baseAccess,
        screens: {
          telaPedidosVendas: result.TELA_PEDIDOS_VENDAS === 'S',
          telaRotas: result.TELA_ROTAS === 'S',
          telaTarefas: result.TELA_TAREFAS === 'S',
          telaNegocios: result.TELA_NEGOCIOS === 'S',
          telaClientes: result.TELA_CLIENTES === 'S',
          telaProdutos: result.TELA_PRODUTOS === 'S',
          telaTabelaPrecos: result.TELA_TABELA_PRECOS === 'S',
          telaUsuarios: result.TELA_USUARIOS === 'S',
          telaAdministracao: result.TELA_ADMINISTRACAO === 'S',
          telaDashboard: result.TELA_DASHBOARD !== 'N'
        },
        data: {
          acessoClientes: result.ACESSO_CLIENTES || 'VINCULADO',
          acessoProdutos: result.ACESSO_PRODUTOS || 'TODOS',
          acessoTarefas: result.ACESSO_TAREFAS || 'VINCULADO',
          acessoAdministracao: result.ACESSO_ADMINISTRACAO === 'S',
          acessoUsuarios: result.ACESSO_USUARIOS === 'S'
        }
      };

      if (fullAccess.data.acessoClientes === 'MANUAL') {
        const clientesSql = `SELECT CODPARC FROM AD_ACESSOS_CLIENTES_MANUAL WHERE CODUSUARIO = :userId`;
        const clientes = await oracleService.executeQuery<any>(clientesSql, { userId });
        fullAccess.clientesManuais = clientes.map((c: any) => Number(c.CODPARC));
      }

      if (fullAccess.data.acessoProdutos === 'MANUAL') {
        const produtosSql = `SELECT CODPROD FROM AD_ACESSOS_PRODUTOS_MANUAL WHERE CODUSUARIO = :userId`;
        const produtos = await oracleService.executeQuery<any>(produtosSql, { userId });
        fullAccess.produtosManuais = produtos.map((p: any) => Number(p.CODPROD));
      }

      if (fullAccess.data.acessoProdutos === 'MARCA') {
        const marcasSql = `SELECT CODMARCA FROM AD_ACESSOS_MARCAS WHERE CODUSUARIO = :userId`;
        const marcas = await oracleService.executeQuery<any>(marcasSql, { userId });
        fullAccess.marcasPermitidas = marcas.map((m: any) => Number(m.CODMARCA));
      }

      if (fullAccess.data.acessoProdutos === 'GRUPO') {
        const gruposSql = `SELECT CODGRUPOPROD FROM AD_ACESSOS_GRUPOS WHERE CODUSUARIO = :userId`;
        const grupos = await oracleService.executeQuery<any>(gruposSql, { userId });
        fullAccess.gruposPermitidos = grupos.map((g: any) => Number(g.CODGRUPOPROD));
      }

      return fullAccess;
    } catch (error) {
      console.error('Erro ao carregar acesso completo:', error);
      return {
        ...baseAccess,
        screens: {
          telaPedidosVendas: true,
          telaRotas: true,
          telaTarefas: true,
          telaNegocios: true,
          telaClientes: true,
          telaProdutos: true,
          telaTabelaPrecos: true,
          telaUsuarios: baseAccess.isAdmin,
          telaAdministracao: baseAccess.isAdmin,
          telaDashboard: true
        },
        data: {
          acessoClientes: 'VINCULADO',
          acessoProdutos: 'TODOS',
          acessoTarefas: 'VINCULADO',
          acessoAdministracao: baseAccess.isAdmin,
          acessoUsuarios: baseAccess.isAdmin
        }
      };
    }
  }

  /**
   * Retorna cláusula WHERE para filtrar clientes conforme regra de acesso
   */
  getClientesWhereClauseByAccess(fullAccess: FullUserAccess): { clause: string; binds: Record<string, any> } {
    if (fullAccess.isAdmin || fullAccess.data.acessoClientes === 'TODOS') {
      return { clause: '', binds: {} };
    }

    if (fullAccess.data.acessoClientes === 'MANUAL' && fullAccess.clientesManuais?.length) {
      return {
        clause: `AND p.CODPARC IN (${fullAccess.clientesManuais.join(',')})`,
        binds: {}
      };
    }

    if (fullAccess.data.acessoClientes === 'EQUIPE') {
      const vendedores = [fullAccess.codVendedor, ...fullAccess.vendedoresEquipe].filter(Boolean);
      if (vendedores.length === 0) {
        return { clause: 'AND 1 = 0', binds: {} };
      }
      return {
        clause: `AND p.CODVEND IN (${vendedores.join(',')})`,
        binds: {}
      };
    }

    if (!fullAccess.codVendedor) {
      return { clause: 'AND 1 = 0', binds: {} };
    }

    return {
      clause: 'AND p.CODVEND = :codVendedor',
      binds: { codVendedor: fullAccess.codVendedor }
    };
  }

  /**
   * Retorna cláusula WHERE para filtrar produtos conforme regra de acesso
   */
  getProdutosWhereClauseByAccess(fullAccess: FullUserAccess): { clause: string; binds: Record<string, any> } {
    if (fullAccess.isAdmin || fullAccess.data.acessoProdutos === 'TODOS') {
      return { clause: '', binds: {} };
    }

    if (fullAccess.data.acessoProdutos === 'MANUAL' && fullAccess.produtosManuais?.length) {
      return {
        clause: `AND p.CODPROD IN (${fullAccess.produtosManuais.join(',')})`,
        binds: {}
      };
    }

    if (fullAccess.data.acessoProdutos === 'MARCA' && fullAccess.marcasPermitidas?.length) {
      return {
        clause: `AND p.CODMARCA IN (${fullAccess.marcasPermitidas.join(',')})`,
        binds: {}
      };
    }

    if (fullAccess.data.acessoProdutos === 'GRUPO' && fullAccess.gruposPermitidos?.length) {
      return {
        clause: `AND p.CODGRUPOPROD IN (${fullAccess.gruposPermitidos.join(',')})`,
        binds: {}
      };
    }

    return { clause: '', binds: {} };
  }

  /**
   * Retorna cláusula WHERE para filtrar tarefas conforme regra de acesso
   */
  getTarefasWhereClauseByAccess(fullAccess: FullUserAccess): { clause: string; binds: Record<string, any> } {
    if (fullAccess.isAdmin || fullAccess.data.acessoTarefas === 'TODOS') {
      return { clause: '', binds: {} };
    }

    if (fullAccess.data.acessoTarefas === 'EQUIPE') {
      const vendedores = [fullAccess.codVendedor, ...fullAccess.vendedoresEquipe].filter(Boolean);
      if (vendedores.length === 0) {
        return { clause: 'AND 1 = 0', binds: {} };
      }
      return {
        clause: `AND t.CODUSUARIO IN (
          SELECT uv.CODUSUARIO 
          FROM AD_USUARIOSVENDAS uv 
          WHERE uv.CODVEND IN (${vendedores.join(',')})
            AND uv.ID_EMPRESA = :idEmpresa
        )`,
        binds: { idEmpresa: fullAccess.idEmpresa }
      };
    }

    return {
      clause: 'AND t.CODUSUARIO = :userId',
      binds: { userId: fullAccess.userId }
    };
  }

  /**
   * Salva configurações de acesso na tabela AD_ACESSOS_USUARIO
   */
  async updateFullUserAccess(userId: number, access: Partial<UserDataAccess & UserScreenAccess>): Promise<void> {
    const checkSql = `SELECT 1 FROM AD_ACESSOS_USUARIO WHERE CODUSUARIO = :userId`;
    const exists = await oracleService.executeOne(checkSql, { userId });

    const binds: any = {
      userId,
      acessoClientes: access.acessoClientes || 'VINCULADO',
      acessoProdutos: access.acessoProdutos || 'TODOS',
      acessoTarefas: access.acessoTarefas || 'VINCULADO',
      acessoAdmin: access.acessoAdministracao ? 'S' : 'N',
      acessoUsuarios: access.acessoUsuarios ? 'S' : 'N',
      telaPedidos: access.telaPedidosVendas ? 'S' : 'N',
      telaRotas: access.telaRotas ? 'S' : 'N',
      telaTarefas: access.telaTarefas ? 'S' : 'N',
      telaNegocios: access.telaNegocios ? 'S' : 'N',
      telaClientes: access.telaClientes ? 'S' : 'N',
      telaProdutos: access.telaProdutos ? 'S' : 'N',
      telaTabPrecos: access.telaTabelaPrecos ? 'S' : 'N',
      telaUsuarios: access.telaUsuarios ? 'S' : 'N',
      telaAdmin: access.telaAdministracao ? 'S' : 'N',
      telaDashboard: access.telaDashboard ? 'S' : 'N'
    };

    if (exists) {
      const sql = `
        UPDATE AD_ACESSOS_USUARIO SET
          ACESSO_CLIENTES = :acessoClientes,
          ACESSO_PRODUTOS = :acessoProdutos,
          ACESSO_TAREFAS = :acessoTarefas,
          ACESSO_ADMINISTRACAO = :acessoAdmin,
          ACESSO_USUARIOS = :acessoUsuarios,
          TELA_PEDIDOS_VENDAS = :telaPedidos,
          TELA_ROTAS = :telaRotas,
          TELA_TAREFAS = :telaTarefas,
          TELA_NEGOCIOS = :telaNegocios,
          TELA_CLIENTES = :telaClientes,
          TELA_PRODUTOS = :telaProdutos,
          TELA_TABELA_PRECOS = :telaTabPrecos,
          TELA_USUARIOS = :telaUsuarios,
          TELA_ADMINISTRACAO = :telaAdmin,
          TELA_DASHBOARD = :telaDashboard
        WHERE CODUSUARIO = :userId
      `;
      await oracleService.executeQuery(sql, binds);
    } else {
      const sql = `
        INSERT INTO AD_ACESSOS_USUARIO (
          CODUSUARIO, ACESSO_CLIENTES, ACESSO_PRODUTOS, ACESSO_TAREFAS,
          ACESSO_ADMINISTRACAO, ACESSO_USUARIOS, TELA_PEDIDOS_VENDAS,
          TELA_ROTAS, TELA_TAREFAS, TELA_NEGOCIOS, TELA_CLIENTES,
          TELA_PRODUTOS, TELA_TABELA_PRECOS, TELA_USUARIOS,
          TELA_ADMINISTRACAO, TELA_DASHBOARD
        ) VALUES (
          :userId, :acessoClientes, :acessoProdutos, :acessoTarefas,
          :acessoAdmin, :acessoUsuarios, :telaPedidos,
          :telaRotas, :telaTarefas, :telaNegocios, :telaClientes,
          :telaProdutos, :telaTabPrecos, :telaUsuarios,
          :telaAdmin, :telaDashboard
        )
      `;
      await oracleService.executeQuery(sql, binds);
    }
  }

  async updateManualClientes(userId: number, clientes: number[]): Promise<void> {
    await oracleService.executeQuery(`DELETE FROM AD_ACESSOS_CLIENTES_MANUAL WHERE CODUSUARIO = :userId`, { userId });
    for (const codParc of clientes) {
      await oracleService.executeQuery(
        `INSERT INTO AD_ACESSOS_CLIENTES_MANUAL (CODUSUARIO, CODPARC) VALUES (:userId, :codParc)`,
        { userId, codParc }
      );
    }
  }

  async updateManualProdutos(userId: number, produtos: number[]): Promise<void> {
    await oracleService.executeQuery(`DELETE FROM AD_ACESSOS_PRODUTOS_MANUAL WHERE CODUSUARIO = :userId`, { userId });
    for (const codProd of produtos) {
      await oracleService.executeQuery(
        `INSERT INTO AD_ACESSOS_PRODUTOS_MANUAL (CODUSUARIO, CODPROD) VALUES (:userId, :codProd)`,
        { userId, codProd }
      );
    }
  }

  async updateAllowedMarcas(userId: number, marcas: number[]): Promise<void> {
    await oracleService.executeQuery(`DELETE FROM AD_ACESSOS_MARCAS WHERE CODUSUARIO = :userId`, { userId });
    for (const codMarca of marcas) {
      await oracleService.executeQuery(
        `INSERT INTO AD_ACESSOS_MARCAS (CODUSUARIO, CODMARCA) VALUES (:userId, :codMarca)`,
        { userId, codMarca }
      );
    }
  }

  async updateAllowedGrupos(userId: number, grupos: number[]): Promise<void> {
    await oracleService.executeQuery(`DELETE FROM AD_ACESSOS_GRUPOS WHERE CODUSUARIO = :userId`, { userId });
    for (const codGrupoProd of grupos) {
      await oracleService.executeQuery(
        `INSERT INTO AD_ACESSOS_GRUPOS (CODUSUARIO, CODGRUPOPROD) VALUES (:userId, :codGrupoProd)`,
        { userId, codGrupoProd }
      );
    }
  }
}

export const accessControlService = new AccessControlService();