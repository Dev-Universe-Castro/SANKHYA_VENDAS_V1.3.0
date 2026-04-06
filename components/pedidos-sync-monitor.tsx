
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PedidoSyncService, PedidoPendenteDetalhado } from "@/lib/pedido-sync"
import { RefreshCw, Trash2, CheckCircle, XCircle, Clock, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function PedidosSyncMonitor() {
  const [pedidos, setPedidos] = useState<PedidoPendenteDetalhado[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [pedidoParaRemover, setPedidoParaRemover] = useState<number | null>(null)

  // Paginação
  const [page, setPage] = useState(1)
  const limit = 10

  useEffect(() => {
    carregarPedidos()

    // Verificar status online
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

  const carregarPedidos = async () => {
    try {
      const pedidosPendentes = await PedidoSyncService.getPedidosPendentes()
      setPedidos(pedidosPendentes.sort((a, b) => b.createdAt - a.createdAt))
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSincronizar = async () => {
    if (!isOnline) {
      toast.error('⚠️ Sem conexão com a internet')
      return
    }

    setSyncing(true)
    try {
      await PedidoSyncService.processarFila()
      await carregarPedidos()
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      toast.error('Erro ao sincronizar pedidos')
    } finally {
      setSyncing(false)
    }
  }

  const handleRetentar = async (id: number) => {
    await PedidoSyncService.retentarPedido(id)
    await carregarPedidos()
  }

  const handleRemover = async () => {
    if (pedidoParaRemover === null) return

    await PedidoSyncService.removerPedido(pedidoParaRemover)
    await carregarPedidos()
    setPedidoParaRemover(null)
  }

  const handleLimparSincronizados = async () => {
    await PedidoSyncService.limparSincronizados()
    await carregarPedidos()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>
      case 'SINCRONIZANDO':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sincronizando</Badge>
      case 'SUCESSO':
        return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sucesso</Badge>
      case 'ERRO':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAmbienteBadge = (ambiente: string) => {
    return ambiente === 'OFFLINE'
      ? <Badge variant="secondary">Offline</Badge>
      : <Badge variant="default">Online</Badge>
  }

  const pedidosFiltrados = pedidos
  const totalPages = Math.ceil(pedidosFiltrados.length / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const pedidosPaginados = pedidosFiltrados.slice(startIndex, endIndex)

  const pedidosPendentes = pedidos.filter(p => p.synced === 0)
  const pedidosSucesso = pedidos.filter(p => p.status === 'SUCESSO')
  const pedidosErro = pedidos.filter(p => p.status === 'ERRO')

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div>
              <CardTitle className="text-base md:text-xl">Sincronização de Pedidos</CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                Acompanhe o status dos pedidos criados offline e online
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={carregarPedidos}
                disabled={loading}
                className="text-xs h-9 rounded-xl border-[#F2F2F2]"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span className="ml-1.5 hidden sm:inline">Atualizar</span>
              </Button>
              {pedidosSucesso.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLimparSincronizados}
                  className="text-xs h-8"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="ml-1.5 hidden sm:inline">Limpar Sincronizados</span>
                </Button>
              )}
              {isOnline && pedidosPendentes.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleSincronizar}
                  disabled={syncing}
                  className="bg-[#76BA1B] hover:bg-[#1E5128] text-white text-xs h-9 rounded-xl shadow-sm"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="ml-1.5">Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      <span className="ml-1.5">Sincronizar</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="rounded-2xl shadow-sm border border-[#F2F2F2]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#1E5128]/70 uppercase tracking-tight">Total</p>
                    <p className="text-2xl font-bold text-[#121212]">{pedidos.length}</p>
                  </div>
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm border border-[#F2F2F2]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#1E5128]/70 uppercase tracking-tight">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600">{pedidosPendentes.length}</p>
                  </div>
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm border border-[#F2F2F2]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#1E5128]/70 uppercase tracking-tight">Sucesso</p>
                    <p className="text-2xl font-bold text-[#76BA1B]">{pedidosSucesso.length}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-[#76BA1B]" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm border border-[#F2F2F2]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#1E5128]/70 uppercase tracking-tight">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{pedidosErro.length}</p>
                  </div>
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status da Conexão */}
          <div className="mb-4 p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isOnline ? 'Online - Sincronização automática ativada' : 'Offline - Pedidos serão sincronizados quando houver conexão'}
              </span>
            </div>
          </div>

          {/* Tabela de Pedidos */}
          {pedidos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum pedido na fila de sincronização</p>
            </div>
          ) : (
            <>
              {/* Mobile - Cards */}
              <div className="md:hidden space-y-2">
                {pedidosPaginados.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="bg-card border rounded-lg p-3 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs text-foreground truncate mb-0.5">
                          {pedido.payload?.RAZAO_SOCIAL || pedido.payload?.RAZAOSOCIAL || 'N/A'}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(pedido.createdAt), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                      <div className="ml-2 flex flex-col gap-1 items-end">
                        {getStatusBadge(pedido.status)}
                        {getAmbienteBadge(pedido.ambiente)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">CPF/CNPJ</span>
                        <span className="text-[10px] font-medium text-foreground">{pedido.payload?.CPF_CNPJ || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Itens</span>
                        <span className="text-[10px] font-medium text-foreground">{pedido.payload?.itens?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Valor</span>
                        <span className="text-[10px] font-medium text-foreground">R$ {pedido.payload?.VLRNOTA?.toFixed(2) || '0.00'}</span>
                      </div>
                      {pedido.nunotaGerado && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">NUNOTA</span>
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                            {pedido.nunotaGerado}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Tentativas</span>
                        <span className="text-[10px] font-medium text-foreground">{pedido.tentativas || 0}</span>
                      </div>
                      {pedido.erro && (
                        <div className="p-1.5 bg-red-50 border border-red-200 rounded mt-1">
                          <p className="text-[10px] text-red-600 break-words">{pedido.erro}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-2">
                      {pedido.status === 'ERRO' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetentar(pedido.id!)}
                          disabled={!isOnline}
                          className="flex-1"
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Retentar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPedidoParaRemover(pedido.id!)}
                        className={pedido.status === 'ERRO' ? 'flex-1' : 'w-full'}
                      >
                        <Trash2 className="w-3 h-3 mr-2 text-red-600" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop - Table */}
              <div className="hidden md:block border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Ambiente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>NUNOTA</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidosPaginados.map((pedido) => (
                      <TableRow key={pedido.id}>
                        <TableCell className="text-xs">
                          {formatDistanceToNow(new Date(pedido.createdAt), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {pedido.payload?.RAZAO_SOCIAL || pedido.payload?.RAZAOSOCIAL || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pedido.payload?.CPF_CNPJ || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {pedido.payload?.itens?.length || 0}
                        </TableCell>
                        <TableCell>
                          R$ {pedido.payload?.VLRNOTA?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          {getAmbienteBadge(pedido.ambiente)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(pedido.status)}
                          {pedido.erro && (
                            <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={pedido.erro}>
                              {pedido.erro}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {pedido.nunotaGerado ? (
                            <Badge variant="outline" className="font-mono">
                              {pedido.nunotaGerado}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {pedido.tentativas || 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {pedido.status === 'ERRO' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetentar(pedido.id!)}
                                disabled={!isOnline}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPedidoParaRemover(pedido.id!)}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 mt-4">
                <p className="text-xs text-muted-foreground order-2 sm:order-1">
                  Página {page} de {totalPages} ({pedidos.length} pedidos no total)
                </p>
                <div className="flex gap-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={pedidoParaRemover !== null} onOpenChange={() => setPedidoParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este pedido da fila de sincronização?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemover} className="bg-red-600 hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
