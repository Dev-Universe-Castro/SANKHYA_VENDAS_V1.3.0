"use client"

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/lib/auth-service';

export interface UserScreenAccess {
  telaPedidosVendas: boolean;
  telaRotas: boolean;
  telaTarefas: boolean;
  telaNegocios: boolean;
  telaClientes: boolean;
  telaProdutos: boolean;
  telaPoliticas: boolean;
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

export interface FullUserAccess {
  userId: number;
  idEmpresa: number;
  role: string;
  codVendedor: number | null;
  isAdmin: boolean;
  screens: UserScreenAccess;
  data: UserDataAccess;
}

const STORAGE_KEY = 'userAccess';

const defaultScreens: UserScreenAccess = {
  telaPedidosVendas: true,
  telaRotas: true,
  telaTarefas: true,
  telaNegocios: true,
  telaClientes: true,
  telaProdutos: true,
  telaPoliticas: true,
  telaTabelaPrecos: false,
  telaUsuarios: false,
  telaAdministracao: false,
  telaDashboard: true
};

const defaultData: UserDataAccess = {
  acessoClientes: 'VINCULADO',
  acessoProdutos: 'TODOS',
  acessoTarefas: 'VINCULADO',
  acessoAdministracao: false,
  acessoUsuarios: false
};

export function useUserAccess() {
  const [access, setAccess] = useState<FullUserAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccess = useCallback(async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        setAccess(null);
        setLoading(false);
        return;
      }

      const idEmpresa = (currentUser as any).ID_EMPRESA || (currentUser as any).idEmpresa || 1;

      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.userId === currentUser.id && parsed.idEmpresa === idEmpresa) {
          setAccess(parsed);
          setLoading(false);

          fetchFreshAccess(currentUser.id, idEmpresa);
          return;
        }
      }

      await fetchFreshAccess(currentUser.id, idEmpresa);
    } catch (err: any) {
      console.error('Erro ao carregar acessos:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const fetchFreshAccess = async (userId: number, idEmpresa: number) => {
    try {
      const response = await fetch(`/api/usuarios/acessos/completo?codUsuario=${userId}&idEmpresa=${idEmpresa}`);

      if (!response.ok) {
        throw new Error('Falha ao buscar acessos');
      }

      const data = await response.json();
      setAccess(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err: any) {
      console.error('Erro ao buscar acessos do servidor:', err);
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const isAdmin = currentUser.role === 'Administrador';
        setAccess({
          userId: currentUser.id,
          idEmpresa: 1,
          role: currentUser.role,
          codVendedor: currentUser.codVendedor || null,
          isAdmin,
          screens: {
            ...defaultScreens,
            telaUsuarios: isAdmin,
            telaAdministracao: isAdmin,
            telaDashboard: true
          },
          data: {
            ...defaultData,
            acessoAdministracao: isAdmin,
            acessoUsuarios: isAdmin
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  const canAccessScreen = useCallback((screen: keyof UserScreenAccess): boolean => {
    if (!access) return true;
    if (access.isAdmin) return true;
    return access.screens[screen] ?? true;
  }, [access]);

  const refreshAccess = useCallback(async () => {
    setLoading(true);
    localStorage.removeItem(STORAGE_KEY);
    await loadAccess();
  }, [loadAccess]);

  return {
    access,
    loading,
    error,
    canAccessScreen,
    refreshAccess,
    screens: access?.screens || defaultScreens,
    data: access?.data || defaultData,
    isAdmin: access?.isAdmin || false
  };
}
