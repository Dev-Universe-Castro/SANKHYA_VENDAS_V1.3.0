
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TiposPedidoManager from "@/components/tipos-pedido-manager"
import TabelasPrecosConfigManager from "@/components/tabelas-precos-config-manager"
import ConfiguracoesGerais from "@/components/configuracoes-gerais"
import ImpostosManager from "@/components/impostos-manager"
import { toast } from "sonner"

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkAdminAccess = () => {
      try {
        // Primeiro tenta pegar do localStorage
        const storedUser = localStorage.getItem('currentUser')
        let userData = null

        if (storedUser) {
          userData = JSON.parse(storedUser)
        } else {
          // Se não tiver no localStorage, tenta pegar do cookie
          const userCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('user='))

          if (!userCookie) {
            toast.error("Acesso negado. Faça login novamente.")
            router.push('/login')
            return
          }

          const cookieValue = userCookie.split('=')[1]
          userData = JSON.parse(decodeURIComponent(cookieValue))
        }

        const role = userData.role || userData.FUNCAO || ''
        const isAdminUser = role === 'Administrador' || role === 'ADMIN'

        if (!isAdminUser) {
          toast.error("⚠️ Acesso negado. Apenas administradores podem acessar as configurações.")
          router.push('/dashboard')
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error('Erro ao verificar permissão:', error)
        toast.error("Erro ao verificar permissão. Faça login novamente.")
        router.push('/login')
      }
    }

    checkAdminAccess()
  }, [router])

  // Garantir que dados do prefetch estejam no cache
  useEffect(() => {
    if (!isAdmin) return

    const verificarCache = () => {
      const cached = sessionStorage.getItem('cached_tiposPedido')
      if (!cached) {
        console.log('⚠️ Cache de tipos de pedido não encontrado no sessionStorage')
      } else {
        console.log('✅ Cache de tipos de pedido encontrado')
      }
    }

    verificarCache()
  }, [isAdmin])

  // Mostrar loading enquanto verifica permissão
  if (isAdmin === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Verificando permissões...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Se não for admin, não renderizar nada (será redirecionado)
  if (!isAdmin) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-transparent overflow-hidden scrollbar-hide">
        {/* Header - Desktop */}
        <div className="hidden md:block p-6 bg-transparent">
          <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Configurações</h1>
          <p className="text-[#1E5128]/70 mt-1">
            Gerencie as configurações do sistema
          </p>
        </div>

        {/* Header - Mobile */}
        <div className="md:hidden px-4 py-4 bg-transparent border-b border-black/5">
          <h1 className="text-xl font-bold text-[#1E5128]">Configurações</h1>
          <p className="text-sm text-[#1E5128]/70 mt-1">
            Gerencie as configurações do sistema
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 pb-24 md:pb-6 custom-scrollbar">
          <Tabs defaultValue="tipos-pedido" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 w-full justify-start border-b border-[#F2F2F2] pb-4">
              <TabsTrigger
                value="tipos-pedido"
                className="rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 border border-[#F2F2F2] data-[state=active]:border-transparent shadow-sm hover:bg-slate-50"
              >
                Tipos de Pedido
              </TabsTrigger>
              <TabsTrigger
                value="api"
                className="rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 border border-[#F2F2F2] data-[state=active]:border-transparent shadow-sm hover:bg-slate-50"
              >
                API Remota
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tipos-pedido">
              <TiposPedidoManager />
            </TabsContent>

            <TabsContent value="api">
              <ConfiguracoesGerais />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}
