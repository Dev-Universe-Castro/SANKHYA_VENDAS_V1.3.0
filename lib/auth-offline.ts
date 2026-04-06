import { db } from '@/lib/client-db';

export const OfflineAuth = {
  async hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async salvarCredenciais(user: any, passwordRaw: string) {
    try {
      console.log('💾 Salvando credenciais offline para:', user.email);

      if (!passwordRaw || typeof passwordRaw !== 'string' || passwordRaw.trim() === '') {
        throw new Error('Senha inválida ou vazia');
      }

      const hash = await this.hashPassword(passwordRaw);
      console.log('🔑 Hash gerado (primeiros 20 chars):', hash.substring(0, 20) + '...');

      // Limpar usuário anterior com mesmo email primeiro
      try {
        const usuariosAntigos = await db.usuarios.where('EMAIL').equals(user.email).toArray();
        if (usuariosAntigos.length > 0) {
          console.log('🗑️ Removendo', usuariosAntigos.length, 'credenciais antigas...');
          await db.usuarios.bulkDelete(usuariosAntigos.map(u => u.CODUSUARIO));
        }
      } catch (cleanError) {
        console.warn('⚠️ Erro ao limpar credenciais antigas:', cleanError);
      }

      // Criar objeto do usuário para salvar
      const usuarioOffline = {
        CODUSUARIO: user.id || user.CODUSUARIO || Date.now(),
        EMAIL: user.email,
        username: user.email,
        NOME: user.name || user.NOME,
        FUNCAO: user.role || user.FUNCAO,
        STATUS: 'ativo',
        AVATAR: user.avatar || '',
        CODVEND: user.codVendedor || user.CODVEND,
        ID_EMPRESA: user.ID_EMPRESA,
        passwordHash: hash,
        dados: {
          id: user.id || user.CODUSUARIO,
          name: user.name || user.NOME,
          email: user.email,
          role: user.role || user.FUNCAO,
          avatar: user.avatar || '',
          codVendedor: user.codVendedor || user.CODVEND,
          ID_EMPRESA: user.ID_EMPRESA
        },
        lastLogin: new Date().toISOString()
      };

      console.log('💾 Objeto a salvar:', {
        CODUSUARIO: usuarioOffline.CODUSUARIO,
        EMAIL: usuarioOffline.EMAIL,
        NOME: usuarioOffline.NOME,
        passwordHash_length: usuarioOffline.passwordHash.length
      });

      // Salvar no IndexedDB
      const result = await db.usuarios.put(usuarioOffline);
      console.log('✅ Salvo no IndexedDB com chave:', result);

      // Verificação imediata
      const verificacao = await db.usuarios.get(usuarioOffline.CODUSUARIO);

      if (!verificacao) {
        throw new Error('Falha ao verificar salvamento - usuário não encontrado');
      }

      if (!verificacao.passwordHash) {
        throw new Error('Falha ao verificar salvamento - passwordHash ausente');
      }

      console.log('✅ Verificação OK:', {
        CODUSUARIO: verificacao.CODUSUARIO,
        EMAIL: verificacao.EMAIL,
        passwordHash_exists: !!verificacao.passwordHash,
        passwordHash_length: verificacao.passwordHash.length
      });

      // Salvar também no localStorage como backup
      const backupData = {
        email: user.email,
        hash: hash,
        userData: usuarioOffline.dados,
        lastLogin: new Date().toISOString()
      };

      localStorage.setItem(`offline_user_${user.email}`, JSON.stringify(backupData));
      console.log('✅ Backup salvo no localStorage');

    } catch (error) {
      console.error('❌ Erro ao salvar credenciais offline:', error);
      throw error;
    }
  },

  async validarLoginOffline(email: string, passwordRaw: string) {
    try {
      console.log('🔐 Validando login offline para:', email);

      if (!passwordRaw || typeof passwordRaw !== 'string' || passwordRaw.trim() === '') {
        console.error('❌ Senha inválida fornecida');
        return null;
      }

      const hash = await this.hashPassword(passwordRaw);
      console.log('🔑 Hash calculado (primeiros 20 chars):', hash.substring(0, 20) + '...');

      // Buscar usuário no IndexedDB pelo email
      const usuarios = await db.usuarios.where('EMAIL').equals(email).toArray();
      console.log('📊 Usuários encontrados no IndexedDB:', usuarios.length);

      if (usuarios.length > 0) {
        const user = usuarios[0];
        console.log('👤 Usuário encontrado:', user.NOME);
        console.log('🔍 passwordHash do banco:', user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'AUSENTE');
        console.log('🔍 passwordHash calculado:', hash.substring(0, 20) + '...');

        if (user.passwordHash && hash === user.passwordHash) {
          console.log('✅ Login offline validado via IndexedDB');

          // Atualizar última data de login
          await db.usuarios.update(user.CODUSUARIO, {
            lastLogin: new Date().toISOString()
          });

          return {
            nome: user.NOME,
            dados: user.dados,
            passwordHash: user.passwordHash
          };
        } else {
          console.log('❌ Hash não corresponde');
        }
      }

      // Tentar localStorage como fallback
      console.log('🔍 Tentando localStorage como fallback...');
      const offlineData = localStorage.getItem(`offline_user_${email}`);

      if (offlineData) {
        try {
          const { hash: savedHash, userData } = JSON.parse(offlineData);
          console.log('📦 Dados encontrados no localStorage');
          console.log('🔍 Hash localStorage:', savedHash ? savedHash.substring(0, 20) + '...' : 'AUSENTE');

          if (savedHash && hash === savedHash) {
            console.log('✅ Login offline validado via localStorage');
            return {
              nome: userData.name,
              dados: userData,
              passwordHash: savedHash
            };
          }
        } catch (parseError) {
          console.error('❌ Erro ao parsear localStorage:', parseError);
        }
      }

      console.log('❌ Nenhuma credencial offline válida encontrada');
      return null;

    } catch (error) {
      console.error('❌ Erro crítico ao validar login offline:', error);
      return null;
    }
  },

  async getUsuarioOffline(email: string) {
    try {
      const usuarios = await db.usuarios.where('EMAIL').equals(email).toArray();
      return usuarios.length > 0 ? usuarios[0] : null;
    } catch (error) {
      console.error('❌ Erro ao buscar usuário offline:', error);
      return null;
    }
  },

  async limparCredenciais(email: string) {
    try {
      const usuarios = await db.usuarios.where('EMAIL').equals(email).toArray();
      if (usuarios.length > 0) {
        await db.usuarios.bulkDelete(usuarios.map(u => u.CODUSUARIO));
      }
      localStorage.removeItem(`offline_user_${email}`);
      console.log('🗑️ Credenciais offline removidas para:', email);
    } catch (error) {
      console.error('❌ Erro ao limpar credenciais:', error);
    }
  }
};