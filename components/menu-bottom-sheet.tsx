"use client"

import { Home, Users, Calendar, ShoppingCart, DollarSign, Package, UserCircle, Settings, Download, Loader2, Cloud, CloudOff, LogOut, LayoutGrid, Route, Gavel, Table, FileText, Flame } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import Image from "next/image"
import { authService } from "@/lib/auth-service"
import { useState, useEffect, useMemo } from "react"
import type { User } from "@/lib/users-service"
import { useOfflineLoad } from "@/hooks/use-offline-load"
import { toast } from "sonner"
import { useUserAccess } from "@/hooks/use-user-access"

interface MenuBottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MenuBottomSheet({ open, onOpenChange }: MenuBottomSheetProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const { realizarCargaOffline, isLoading } = useOfflineLoad()
  const { screens, isAdmin } = useUserAccess()

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser())

    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning("Você está offline. Os dados serão salvos localmente.")
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const allMenuItems = useMemo(() => {
    const items: { href: string; label: string; icon: any; disabled?: boolean }[] = [
      { href: "/dashboard", label: "Início", icon: Home },
    ]

    if (isAdmin || screens.telaNegocios) {
      items.push({ href: "/dashboard/leads", label: "Negócios", icon: LayoutGrid, disabled: true })
    }

    if (isAdmin || screens.telaRotas) {
      items.push({ href: "/dashboard/rotas", label: "Rotas", icon: Route })
    }

    if (isAdmin || screens.telaTarefas) {
      items.push({ href: "/dashboard/calendario", label: "Tarefas", icon: Calendar })
    }

    if (isAdmin || screens.telaPedidosVendas) {
      items.push({ href: "/dashboard/pedidos", label: "Portal de Vendas", icon: ShoppingCart })
    }

    items.push({ href: "/dashboard/financeiro", label: "Financeiro", icon: DollarSign })

    if (isAdmin || screens.telaClientes) {
      items.push({ href: "/dashboard/parceiros", label: "Clientes", icon: Users })
    }

    if (isAdmin || screens.telaProdutos) {
      items.push({ href: "/dashboard/produtos", label: "Produtos", icon: Package })
    }

    if (isAdmin || screens.telaTabelaPrecos) {
      items.push({ href: "/dashboard/tabelas-precos", label: "Políticas", icon: Gavel })
    }

    if (isAdmin || screens.telaAdministracao || screens.telaPoliticas || screens.telaProdutos) {
      items.push({ href: "/dashboard/campanhas", label: "Campanhas", icon: Flame })
    }

    if (isAdmin || screens.telaUsuarios) {
      items.push({ href: "/dashboard/usuarios", label: "Usuários", icon: UserCircle })
    }

    if (currentUser?.role === "Gerente") {
      items.push({ href: "/dashboard/equipe", label: "Equipe", icon: Users })
    }

    if (isAdmin || screens.telaAdministracao) {
      items.push({ href: "/dashboard/configuracoes", label: "Configurações", icon: Settings })
    }

    items.push({ href: "/dashboard/relatorios", label: "Relatórios", icon: FileText })

    return items
  }, [currentUser?.role, screens, isAdmin])

  const handleNavigation = (href: string) => {
    router.push(href)
    onOpenChange(false)
  }

  const handleLogout = () => {
    authService.logout()
    router.push("/")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-screen border-0 p-0 shadow-2xl lg:hidden"
      >
        <div className="flex flex-col h-full bg-white">
          {/* Header com Logo e Status */}
          <div className="flex-shrink-0 px-6 pt-8 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center justify-center flex-1">
                <img
                  src="/Logo_Final.png"
                  alt="Logo"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-1 bg-gray-300 rounded-full absolute right-6"
              />
            </div>

            {/* Status Online/Offline */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mb-3",
              isOnline
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-orange-50 text-orange-700 border border-orange-200',
            )}>
              {isOnline ? (
                <>
                  <Cloud className="w-5 h-5 flex-shrink-0" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-5 h-5 flex-shrink-0" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Botão Carga Offline */}
            <Button
              onClick={realizarCargaOffline}
              disabled={!isOnline || isLoading}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-medium border-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Carga Offline</span>
                </>
              )}
            </Button>
          </div>

          {/* Grid de Menu Items - Launchpad Style */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 px-2">
              Menu
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {allMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all opacity-50 cursor-not-allowed bg-gray-100"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-gray-200 text-gray-400"
                      )}
                      >
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className={cn(
                        "text-xs font-medium text-center leading-tight text-gray-400"
                      )}
                      >
                        {item.label}
                      </span>
                    </div>
                  )
                }

                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all",
                      isActive
                        ? "bg-[#76BA1B]/10"
                        : "bg-[#F2F2F2] hover:bg-[#F2F2F2]/80 active:scale-95"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                      isActive
                        ? "bg-[#76BA1B] text-white shadow-[#76BA1B]/20"
                        : "bg-white text-[#121212]"
                    )}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className={cn(
                      "text-xs font-medium text-center leading-tight",
                      isActive
                        ? "text-[#1E5128]"
                        : "text-[#121212]/80"
                    )}
                    >
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer com Logout */}
          <div className="flex-shrink-0 p-6 border-t border-gray-200">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-medium border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}