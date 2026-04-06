
import { accessControlService, UserAccess } from './access-control-service';

/**
 * Middleware para validar acesso do usuário em rotas protegidas
 */
export async function validateUserAccessMiddleware(
  userId: number,
  idEmpresa: number
): Promise<UserAccess> {
  try {
    const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa);
    return userAccess;
  } catch (error: any) {
    throw new Error(error.message || 'Erro ao validar acesso do usuário');
  }
}

/**
 * Valida se o usuário pode criar/editar dados
 * Lança exceção se não tiver permissão
 */
export function requireCreatePermission(userAccess: UserAccess): void {
  if (!accessControlService.canCreateOrEdit(userAccess)) {
    const errorMsg = accessControlService.getAccessDeniedMessage(userAccess);
    throw new Error(errorMsg);
  }
}

/**
 * Retorna mensagem de erro amigável para falta de vinculação
 */
export function getNoVendorMessage(): string {
  return '⚠️ Seu usuário não possui vendedor/gerente vinculado. Entre em contato com o administrador para acessar esta funcionalidade.';
}
