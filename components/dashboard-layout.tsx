"use client"

import { useState, useEffect } from "react"
import { OfflineDataService } from "@/lib/offline-data-service"
import { Loader2, Menu } from "lucide-react"
import Sidebar from "./sidebar"
import Header from "./header"
import Footer from "./footer"
import FloatingActionMenu from "./floating-action-menu"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MenuBottomSheet } from "./menu-bottom-sheet"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // Iniciar minimizado
  const [menuOpen, setMenuOpen] = useState(false) // Estado para o BottomSheet mobile
  const [mounted, setMounted] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Subscribe to persistent sync state
  useEffect(() => {
    const unsubscribe = OfflineDataService.subscribeToSync((syncing) => {
      console.log(`[LAYOUT] Status de sincronização alterado para: ${syncing}`);
      setIsSyncing(syncing);
    })
    return () => unsubscribe()
  }, [])


  // Blocking Sync Overlay - Apenas após montagem no cliente
  if (mounted && isSyncing) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2 animate-pulse">
          <h2 className="text-2xl font-bold tracking-tight">Sincronizando Dados</h2>
          <p className="text-muted-foreground">Preparando seu ambiente de trabalho...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        {/* Mobile sidebar backdrop - This will be removed as per the intention to remove the sidebar */}
        {/* {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )} */}

        {/* Sidebar - This component is kept but its mobile interaction is removed */}
        <Sidebar
          isOpen={sidebarOpen} // This will likely be managed by the new menu overlay logic, or kept for desktop
          onClose={() => setSidebarOpen(false)} // This handler might be repurposed or removed for mobile
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main content */}
        <div className={cn(
          "flex-1 flex flex-col min-h-screen relative",
          !sidebarCollapsed && "lg:ml-64",
          sidebarCollapsed && "lg:ml-20"
        )}>
          <div className="fixed top-0 right-0 z-30 transition-all duration-300 w-full lg:w-auto"
            style={{ left: sidebarCollapsed ? '80px' : '256px' }}>
            <Header
              onMenuClick={() => {
                if (window.innerWidth < 1024) {
                  setMenuOpen(true)
                } else {
                  setSidebarOpen(!sidebarOpen)
                }
              }}
            />
          </div>
          <main className="flex-1 p-4 lg:p-6 bg-[#F2F2F2] pb-44 lg:pb-24 pt-16 lg:pt-16 page-transition overflow-y-auto scrollbar-hide">
            <div>
              {children}
            </div>
          </main>
          <div className="fixed bottom-0 right-0 z-30 transition-all duration-300 w-full lg:w-auto"
            style={{ left: sidebarCollapsed ? '80px' : '256px' }}>
            <Footer />
          </div>
        </div>
      </div>

      {/* Menu Bottom Sheet - Mobile Only */}
      <MenuBottomSheet open={menuOpen} onOpenChange={setMenuOpen} />

      {/* Floating Action Menu - Global Quick Actions & Visit Status */}
      <FloatingActionMenu />
    </div>
  )
}