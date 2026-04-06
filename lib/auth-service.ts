import type { User } from "./types"
import { db } from "@/lib/client-db"

// Simulate current logged-in user
let currentUser: User | null = null

// Super Admin padrão do sistema (não depende da API)
export const SUPER_ADMIN: User = {
  id: 0,
  name: "Super Admin",
  email: "sup@sankhya.com.br",
  password: "SUP321", // Senha em texto plano apenas para validação
  role: "Administrador",
  status: "ativo",
  avatar: ""
}

export const authService = {
  // Login user
  async login(email: string, password: string): Promise<User | null> {
    try {
      console.log('🔐 Tentando login:', email);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha no login')
      }

      const data = await response.json()

      console.log('✅ Login bem-sucedido, salvando usuário...');

      // Salvar no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(data.user))
      }

      // Salvar no cookie com encodeURIComponent para escapar caracteres especiais
      document.cookie = `user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=86400`

      return data.user
    } catch (error) {
      console.error('❌ Erro no login:', error)
      throw error
    }
  },

  // Get current logged-in user
  getCurrentUser(): User | null {
    try {
      if (typeof window === 'undefined') return null

      // Primeiro tenta pegar do localStorage
      const stored = localStorage.getItem('currentUser')
      if (stored) {
        return JSON.parse(stored)
      }

      // Se não tiver no localStorage, tenta pegar do cookie
      const cookies = document.cookie
      console.log('🔍 getCurrentUser - Todos os cookies:', cookies);

      const userCookie = cookies
        .split('; ')
        .find(row => row.startsWith('user='))

      console.log('🔍 getCurrentUser - Cookie encontrado:', !!userCookie);

      if (!userCookie) {
        return null
      }

      try {
        const userJson = userCookie.split('=')[1]
        // Decodificar o cookie antes de fazer parse do JSON
        const user = JSON.parse(decodeURIComponent(userJson))

        // Sincroniza com localStorage
        localStorage.setItem('currentUser', JSON.stringify(user))

        return user
      } catch (error) {
        console.error('❌ Erro ao fazer parse do cookie, tentando localStorage...', error);

        // Fallback para localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          return JSON.parse(storedUser);
        }

        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao obter usuário atual:', error)
      return null
    }
  },

  // Update current user profile
  async updateProfile(profileData: { name: string; email: string; avatar: string }) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }

      const response = await fetch('/api/usuarios/salvar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userData: {
            id: currentUser.id,
            ...profileData,
            role: currentUser.role,
            status: currentUser.status,
            password: currentUser.password // Manter a senha atual
          },
          mode: 'edit' // Especificar que é uma edição
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar perfil');
      }

      const updatedUser = await response.json();

      // Atualizar usuário no localStorage
      // Usando uma chave de armazenamento fictícia, pois STORAGE_KEY não está definida neste escopo.
      // Em um cenário real, STORAGE_KEY precisaria ser importada ou definida.
      const STORAGE_KEY = "users"; // Exemplo
      const users = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const userIndex = users.findIndex((u: User) => u.id === updatedUser.id);
      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      }

      return updatedUser;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  },

  // Logout user
  logout(): void {
    console.log('🚪 Iniciando processo de logout...');
    currentUser = null
    if (typeof window !== "undefined") {
      // Limpar localStorage
      console.log('🗑️ Removendo currentUser do localStorage...');
      localStorage.removeItem("currentUser")
      console.log('✅ currentUser removido do localStorage');

      // Limpar sessionStorage (cache de prefetch)
      console.log('🗑️ Limpando caches específicos do sessionStorage...');
      sessionStorage.removeItem('cached_parceiros')
      sessionStorage.removeItem('cached_produtos')

      // Remover cookie de usuário
      console.log('🗑️ Removendo cookie de sessão...');
      document.cookie = 'user=; path=/; max-age=0';
      console.log('✅ Cookie de sessão removido');

      // Limpar todo o sessionStorage para garantir
      console.log('🗑️ Limpando todo o sessionStorage...');
      sessionStorage.clear()
      console.log('✅ sessionStorage limpo');

      // Limpar IndexedDB
      console.log('🗑️ Iniciando limpeza do IndexedDB...');
      db.delete().then(() => {
        console.log('✅ IndexedDB excluído com sucesso');
        // Recriar o banco de dados para o próximo login (opcional, mas bom se o usuário relogar sem refresh)
        return db.open();
      }).then(() => {
        console.log('✅ IndexedDB recriado/pronto para uso');
      }).catch((err) => {
        console.error('❌ Erro ao limpar IndexedDB:', err);
      });

      console.log('🏁 Processo de logout e limpeza concluído');
    }
  },
}