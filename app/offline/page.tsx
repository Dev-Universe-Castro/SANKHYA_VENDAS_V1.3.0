
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <WifiOff className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isOnline ? 'Conectado!' : 'Você está offline'}
          </CardTitle>
          <CardDescription>
            {isOnline 
              ? 'Sua conexão foi restaurada. Clique em recarregar para continuar.'
              : 'Verifique sua conexão com a internet. Algumas funcionalidades podem estar limitadas.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleReload} 
            className="w-full"
            disabled={!isOnline}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recarregar Página
          </Button>
          
          {!isOnline && (
            <div className="text-sm text-muted-foreground text-center">
              <p className="mb-2">Enquanto estiver offline, você pode:</p>
              <ul className="list-disc list-inside text-left space-y-1">
                <li>Visualizar dados já carregados</li>
                <li>Criar pedidos (serão sincronizados depois)</li>
                <li>Consultar informações em cache</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
