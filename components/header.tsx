"use client"

import { Menu, Cloud, CloudOff, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { authService } from "@/lib/auth-service"
import type { User } from "@/lib/users-service"
import ProfileModal from "./profile-modal"
import { useOfflineLoad } from "@/hooks/use-offline-load"
import { toast } from "sonner"

interface HeaderProps {
  onMenuClick: () => void
  onLogout?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const { realizarCargaOffline, isLoading } = useOfflineLoad()

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)

    // Verificar status da conexão
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

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser)
  }

  // Dados padrão enquanto carrega
  const displayUser = user || {
    id: 0,
    name: "Carregando...",
    email: "",
    role: "Vendedor" as any,
    avatar: "",
    status: "ativo" as any
  }

  const initials = displayUser.name
    ? displayUser.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "U"

  return (
    <>
      <header className="px-4 lg:px-6 py-2 flex items-center justify-between bg-[#76BA1B] outline outline-1 outline-black/5 w-full h-14 relative z-50">
        {/* Botão de Menu Móvel - Lado Esquerdo */}
        <div className="lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-white hover:bg-white/20 rounded-xl"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        {/* Logo móvel - centralizado */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center lg:hidden">
          <img src="/Logo_Final.png" alt="PredictSales" className="h-8 w-auto" />
        </div>

        {/* Espaçador no desktop para empurrar elementos à direita */}
        <div className="hidden lg:flex-1"></div>

        <div className="flex items-center gap-2 lg:gap-3 ml-auto">
          {/* Status Online/Offline */}
          <div className={`flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm ${isOnline
            ? 'bg-white/20 text-white border border-white/30'
            : 'bg-red-500 border border-red-400 text-white'
            }`}>
            {isOnline ? (
              <>
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Online</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Offline</span>
              </>
            )}
          </div>

          {/* Botão de Carga Offline - Desktop e Mobile */}
          <Button
            onClick={realizarCargaOffline}
            disabled={!isOnline || isLoading}
            size="sm"
            variant="ghost"
            className="text-white border border-white/20 hover:bg-white/20 hidden lg:flex rounded-full shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Carga Offline
              </>
            )}
          </Button>

          {/* Perfil */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 lg:gap-3 hover:bg-white/20 transition-colors bg-white/10 py-1 px-1 lg:pl-3 lg:pr-1 rounded-full border border-white/20 shadow-sm"
            disabled={!user}
          >
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-white">{displayUser.name}</p>
              <p className="text-xs text-white/80">{displayUser.email}</p>
            </div>
            <Avatar className="w-8 h-8 lg:w-9 lg:h-9 border-2 border-white flex-shrink-0 shadow-sm">
              <AvatarImage src={displayUser.avatar || "/placeholder-user.png"} alt={displayUser.name} />
              <AvatarFallback className="bg-white/20 text-white font-bold">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      {user && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onUpdate={handleProfileUpdate}
        />
      )}
    </>
  )
}