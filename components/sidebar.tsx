"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Users, ChevronLeft, ChevronRight, LogOut, UserCircle, LayoutGrid, Package, ShoppingCart, Calendar, DollarSign, Settings, Download, Loader2, Cloud, CloudOff, Menu, Route, Gavel, Flame, FileText, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { authService } from "@/lib/auth-service"
import { useState, useEffect, useMemo } from "react"
import type { User } from "@/lib/users-service"
import { useOfflineLoad } from "@/hooks/use-offline-load"
import { toast } from "sonner"
import { useUserAccess } from "@/hooks/use-user-access"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
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

  const menuItems = useMemo(() => {
    const items: { href: string; label: string; icon: any; disabled?: boolean }[] = []

    if (isAdmin || screens.telaDashboard) {
      items.push({ href: "/dashboard", label: "Início", icon: Home })
    }

    if (isAdmin || screens.telaPedidosVendas) {
      items.push({ href: "/dashboard/pedidos", label: "Portal de Vendas", icon: ShoppingCart })
    }

    if (isAdmin || screens.telaNegocios) {
      items.push({ href: "/dashboard/leads", label: "Negócios", icon: LayoutGrid, disabled: true })
    }

    if (isAdmin || screens.telaRotas) {
      items.push({ href: "/dashboard/rotas", label: "Rotas", icon: Route })
    }

    if (isAdmin || screens.telaTarefas) {
      items.push({ href: "/dashboard/calendario", label: "Tarefas", icon: Calendar })
    }

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
      items.push({ href: "/dashboard/equipe", label: "Equipe Comercial", icon: Users })
    }

    if (isAdmin || screens.telaAdministracao) {
      items.push({ href: "/dashboard/configuracoes", label: "Configurações", icon: Settings })
    }

    items.push({ href: "/dashboard/relatorios", label: "Relatórios", icon: FileText })

    return items
  }, [currentUser?.role, screens, isAdmin])

  const handleLogout = () => {
    authService.logout()
    router.push("/")
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed inset-y-0 left-0 z-50 bg-sidebar transform transition-all duration-200 ease-in-out flex-col h-screen",
        isCollapsed ? "w-20 min-w-[80px] max-w-[80px]" : "w-64 min-w-[256px] max-w-[256px]",
      )}
    >
      {/* Logo */}
      <div className="border-b border-[#F2F2F2] shrink-0 relative bg-white">
        <div
          className={cn(
            "flex items-center justify-between",
            isCollapsed ? "p-3" : "p-2",
          )}
        >
          <div className={cn("flex items-center justify-center w-full", isCollapsed ? "" : "py-0")}>
            {isCollapsed ? (
              <Image src="/Logo_Final.png" alt="PredictSales" width={48} height={48} className="object-contain" />
            ) : (
              <div className="flex items-center justify-center w-full">
                <Image
                  src="/Logo_Final.png"
                  alt="PredictSales"
                  width={140}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
            )}
          </div>
        </div>

        {/* Toggle button on the border - Desktop only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="hidden lg:flex text-sidebar-foreground hover:bg-[#F2F2F2] absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-[#F2F2F2] rounded-full w-6 h-6 p-0 z-50 shadow-sm transition-transform hover:scale-105"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Menu section */}
      <div className="flex-1 p-4 flex flex-col overflow-y-auto min-h-0 scrollbar-hide">
        <nav className="space-y-1 flex-shrink-0 pb-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap opacity-50 cursor-not-allowed bg-gray-100/50 text-gray-400",
                    isCollapsed && "justify-center",
                  )}
                  title={isCollapsed ? `${item.label} (Em breve)` : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  isCollapsed && "justify-center",
                  isActive
                    ? "bg-[#76BA1B] text-white shadow-md shadow-[#76BA1B]/20 font-bold"
                    : "text-[#121212]/80 hover:bg-[#F2F2F2] hover:text-[#1E5128]",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-[#121212]/60 hover:text-[#1E5128]")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Botão Sair - Apenas Desktop */}
      <div className="hidden lg:block p-3 border-t border-[#F2F2F2] shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 whitespace-nowrap h-9",
            isCollapsed && "justify-center px-0",
          )}
          title={isCollapsed ? "Sair" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Sair</span>}
        </Button>
      </div>
    </aside>
  )
}