
import { usersService } from './users-service';

export async function initSuperAdmin() {
  try {
    await usersService.ensureSuperAdmin();
  } catch (error) {
    console.error('Erro ao inicializar superadmin:', error);
  }
}
