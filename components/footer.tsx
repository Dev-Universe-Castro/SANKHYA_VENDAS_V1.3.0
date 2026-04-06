
"use client"

import { Home, Route, ShoppingCart, LayoutGrid, Menu, Table } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useMemo } from "react"
import { MenuBottomSheet } from "./menu-bottom-sheet"
import { useUserAccess } from "@/hooks/use-user-access"

export default function Footer() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const { screens, isAdmin } = useUserAccess()

  const navigationItems = useMemo(() => {
    const items = []

    if (isAdmin || screens.telaRotas) {
      items.push({
        icon: Route,
        label: "Rotas",
        href: "/dashboard/rotas",
        isActive: pathname === "/dashboard/rotas",
        action: () => router.push("/dashboard/rotas")
      })
    }

    items.push({
      icon: Home,
      label: "Início",
      href: "/dashboard",
      isActive: pathname === "/dashboard",
      action: () => router.push("/dashboard")
    })

    if (isAdmin || screens.telaPedidosVendas) {
      items.push({
        icon: ShoppingCart,
        label: "Pedidos",
        href: "/dashboard/pedidos",
        isActive: pathname === "/dashboard/pedidos",
        action: () => router.push("/dashboard/pedidos")
      })
    }

    if (isAdmin || screens.telaClientes) {
      items.push({
        icon: Table,
        label: "Clientes",
        href: "/dashboard/parceiros",
        isActive: pathname === "/dashboard/parceiros",
        action: () => router.push("/dashboard/parceiros")
      })
    }

    return items
  }, [pathname, router, screens, isAdmin])

  return (
    <>
      <footer className="border-t border-black/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:relative fixed bottom-0 left-0 right-0 z-40 bg-[#76BA1B] w-full transition-all duration-300">
        {/* Mobile Navigation */}
        <nav className="lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className={cn(
            "grid gap-0 px-1 py-1.5",
            navigationItems.length === 4 ? "grid-cols-4" :
              navigationItems.length === 3 ? "grid-cols-3" :
                navigationItems.length === 2 ? "grid-cols-2" : "grid-cols-1"
          )}>
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={item.action}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-xl transition-all min-h-[56px]",
                    item.isActive
                      ? "bg-white/20 text-white shadow-sm font-bold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] font-bold font-montserrat leading-tight text-center">{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Desktop Footer */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3 text-xs text-white/80">
          <p>© 2026 - Todos Direitos Reservados</p>
          <p>versão 1.2.2</p>
        </div>
      </footer>

      {/* Menu Bottom Sheet - Mobile Only */}
      <MenuBottomSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  )
}
