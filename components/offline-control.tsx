
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useOfflineLoad } from "@/hooks/use-offline-load"
import { Cloud, CloudOff, Download, Calendar, Loader2, Upload } from "lucide-react"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PedidoSyncService } from "@/lib/pedido-sync"

export function OfflineControl() {
  const { realizarCargaOffline, isLoading, lastSync } = useOfflineLoad()
  const [isOnline, setIsOnline] = useState(true)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Atualizar contagem ao voltar online
      updatePendentesCount()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verificar pedidos pendentes ao montar
    updatePendentesCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updatePendentesCount = async () => {
    const count = await PedidoSyncService.getPendentesCount()
    setPedidosPendentes(count)
  }

  const handleSyncPedidos = async () => {
    setIsSyncing(true)
    await PedidoSyncService.processarFila()
    await updatePendentesCount()
    setIsSyncing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="w-5 h-5 text-green-500" />
            ) : (
              <CloudOff className="w-5 h-5 text-orange-500" />
            )}
            Modo Offline
          </CardTitle>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isOnline 
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        <CardDescription>
          Sincronize os dados para trabalhar offline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Última sincronização: {formatDistanceToNow(new Date(lastSync), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        )}

        <Button
          onClick={realizarCargaOffline}
          disabled={!isOnline || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Sincronizar Dados Offline
            </>
          )}
        </Button>

        {pedidosPendentes > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {pedidosPendentes} pedido{pedidosPendentes > 1 ? 's' : ''} pendente{pedidosPendentes > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            {isOnline && (
              <Button
                onClick={handleSyncPedidos}
                disabled={isSyncing}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Pedidos Agora
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {!isOnline && (
          <p className="text-xs text-muted-foreground text-center">
            Você está trabalhando offline. Conecte-se à internet para sincronizar.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
