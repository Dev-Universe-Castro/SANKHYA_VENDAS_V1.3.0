
"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Wifi, WifiOff } from "lucide-react"

export default function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Estado inicial
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      toast.success("Conexão restaurada", {
        icon: <Wifi className="h-4 w-4" />,
        description: "Você está online novamente"
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning("Modo Offline", {
        icon: <WifiOff className="h-4 w-4" />,
        description: "Você está trabalhando offline. Os dados serão sincronizados quando a conexão voltar.",
        duration: 5000
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="fixed top-16 right-4 z-50">
      {!isOnline && (
        <div className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      )}
    </div>
  )
}
