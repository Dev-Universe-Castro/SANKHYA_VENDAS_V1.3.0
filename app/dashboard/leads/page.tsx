"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import LeadsKanban from "@/components/leads-kanban"
import { Card, CardContent } from "@/components/ui/card"
import { WifiOff } from "lucide-react"
import { RouteGuard } from "@/components/route-guard"

export default function LeadsPage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Verificar status de conexão
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOnline) {
    return (
      <RouteGuard requiredScreen="telaNegocios">
        <DashboardLayout>
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <Card className="max-w-md">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <WifiOff className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Negócios Indisponível Offline</h3>
                  <p className="text-sm text-muted-foreground">
                    A gestão de Negócios (Leads) requer conexão com a internet para funcionar. Por favor, conecte-se à internet para acessar esta funcionalidade.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredScreen="telaNegocios">
      <DashboardLayout>
        <div className="flex flex-col h-full bg-background overflow-hidden scrollbar-hide">
          <div className="flex-1 overflow-hidden">
            <LeadsKanban />
          </div>
        </div>
      </DashboardLayout>
    </RouteGuard>
  )
}
