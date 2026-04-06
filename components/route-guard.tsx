"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAccess } from '@/hooks/use-user-access';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredScreen?: 'telaPedidosVendas' | 'telaRotas' | 'telaTarefas' | 'telaNegocios' | 'telaClientes' | 'telaProdutos' | 'telaTabelaPrecos' | 'telaUsuarios' | 'telaAdministracao';
  requireAuth?: boolean;
  fallbackPath?: string;
}

export function RouteGuard({ 
  children, 
  requiredScreen, 
  requireAuth = true,
  fallbackPath = '/dashboard'
}: RouteGuardProps) {
  const { access, loading, canAccessScreen } = useUserAccess();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    // Se não está autenticado e requer autenticação
    if (requireAuth && !access) {
      console.log('❌ RouteGuard: Usuário não autenticado');
      router.push('/');
      return;
    }

    // Se não há requisito de tela específica, autorizar
    if (!requiredScreen) {
      setIsAuthorized(true);
      return;
    }

    // Verificar se tem acesso à tela específica
    const hasAccess = canAccessScreen(requiredScreen);
    
    if (!hasAccess) {
      console.log(`❌ RouteGuard: Sem acesso à tela ${requiredScreen}`);
      router.push(fallbackPath);
      return;
    }

    console.log(`✅ RouteGuard: Acesso autorizado para ${requiredScreen}`);
    setIsAuthorized(true);
  }, [access, loading, requiredScreen, canAccessScreen, router, requireAuth, fallbackPath]);

  // Enquanto não estiver montado ou estiver carregando acessos, mostrar loader estável
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se montado, carregado, mas ainda não autorizado (redirecionamento)
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
