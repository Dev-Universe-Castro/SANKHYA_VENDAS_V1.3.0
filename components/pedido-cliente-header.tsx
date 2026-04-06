"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Clock, CreditCard, History, TrendingUp, TrendingDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PedidoClienteHeaderProps {
  codParc: string
  nomeParc: string
  onRepetirPedido?: (produtos: any[]) => void
}

interface ClienteInfo {
  limiteCredito: number
  saldoDevedor: number
  limiteDisponivel: number
  titulosVencidos: number
  valorVencido: number
  status: 'ATIVO' | 'BLOQUEADO' | 'INADIMPLENTE'
  diasAtraso: number
}

interface ClienteFinanceiro {
  limiteCredito: number
  titulosVencidos: number
  clienteBloqueado: boolean
}

export function PedidoClienteHeader({ 
  codParc, 
  nomeParc,
  onRepetirPedido,
  onDadosFinanceiros
}: PedidoClienteHeaderProps & { 
  onDadosFinanceiros?: (dados: ClienteFinanceiro) => void 
}) {
  const [clienteInfo, setClienteInfo] = useState<ClienteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)
  const [historicoCompras, setHistoricoCompras] = useState<any[]>([])

  useEffect(() => {
    if (codParc && codParc !== "0") {
      carregarInfoCliente()
    }
  }, [codParc])

  const carregarInfoCliente = async () => {
    try {
      setLoading(true)
      // Buscar informações financeiras do cliente
      const response = await fetch(`/api/sankhya/parceiros/complemento?codParc=${codParc}`)
      const data = await response.json()

      const limiteCredito = parseFloat(data.LIMCRED || 0)
      const saldoDevedor = parseFloat(data.SALDODEVEDOR || 0)
      const limiteDisponivel = limiteCredito - saldoDevedor

      // Buscar títulos em aberto/vencidos
      const titulosResponse = await fetch(`/api/sankhya/titulos-receber?codParc=${codParc}&status=vencido`)
      const titulosData = await titulosResponse.json()

      const titulosVencidos = titulosData.length || 0
      const valorVencido = titulosData.reduce((sum: number, t: any) => sum + parseFloat(t.VLRDESDOB || 0), 0)

      // Calcular dias de atraso
      const diasAtraso = titulosVencidos > 0 
        ? Math.max(...titulosData.map((t: any) => {
            const vencimento = new Date(t.DTVENC)
            const hoje = new Date()
            return Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24))
          }))
        : 0

      // Determinar status
      let status: 'ATIVO' | 'BLOQUEADO' | 'INADIMPLENTE' = 'ATIVO'
      const bloqueado = data.ATIVO === 'N'
      if (bloqueado) {
        status = 'BLOQUEADO'
      } else if (titulosVencidos > 0 && diasAtraso > 15) {
        status = 'INADIMPLENTE'
      }

      setClienteInfo({
        limiteCredito,
        saldoDevedor,
        limiteDisponivel,
        titulosVencidos,
        valorVencido,
        status,
        diasAtraso
      })

      // Notificar componente pai
      if (onDadosFinanceiros) {
        onDadosFinanceiros({
          limiteCredito: limiteCredito,
          titulosVencidos: titulosVencidos,
          clienteBloqueado: bloqueado
        })
      }
    } catch (error) {
      console.error('Erro ao carregar info do cliente:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarHistoricoCompras = async () => {
    try {
      setLoading(true)
      // Buscar últimos pedidos (15 dias)
      const dataInicio = new Date()
      dataInicio.setDate(dataInicio.getDate() - 15)

      const response = await fetch(
        `/api/sankhya/pedidos/listar?codParc=${codParc}&dataInicio=${dataInicio.toISOString().split('T')[0]}`
      )
      const data = await response.json()

      setHistoricoCompras(data.pedidos || [])
      setShowHistorico(true)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (!codParc || codParc === "0") {
    return null
  }

  return (
    <>
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Informações do Cliente */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm md:text-base font-bold text-gray-900">{nomeParc}</h3>
                <Badge 
                  variant={
                    clienteInfo?.status === 'BLOQUEADO' ? 'destructive' :
                    clienteInfo?.status === 'INADIMPLENTE' ? 'secondary' :
                    'default'
                  }
                  className="text-[10px] md:text-xs"
                >
                  {clienteInfo?.status || 'CARREGANDO...'}
                </Badge>
              </div>

              {loading ? (
                <div className="text-xs text-muted-foreground">Carregando informações...</div>
              ) : clienteInfo ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  {/* Limite Disponível */}
                  <div className="flex items-center gap-1.5">
                    <CreditCard className={`w-4 h-4 ${
                      clienteInfo.limiteDisponivel < 0 ? 'text-red-600' :
                      clienteInfo.limiteDisponivel < clienteInfo.limiteCredito * 0.2 ? 'text-orange-500' :
                      'text-green-600'
                    }`} />
                    <div>
                      <div className="text-[10px] text-gray-500">Limite Disponível</div>
                      <div className={`text-xs md:text-sm font-bold ${
                        clienteInfo.limiteDisponivel < 0 ? 'text-red-600' :
                        clienteInfo.limiteDisponivel < clienteInfo.limiteCredito * 0.2 ? 'text-orange-500' :
                        'text-green-700'
                      }`}>
                        {formatCurrency(clienteInfo.limiteDisponivel)}
                      </div>
                    </div>
                  </div>

                  {/* Saldo Devedor */}
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-[10px] text-gray-500">Saldo Devedor</div>
                      <div className="text-xs md:text-sm font-bold text-gray-700">
                        {formatCurrency(clienteInfo.saldoDevedor)}
                      </div>
                    </div>
                  </div>

                  {/* Títulos Vencidos */}
                  {clienteInfo.titulosVencidos > 0 && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
                      <div>
                        <div className="text-[10px] text-gray-500">Títulos Vencidos</div>
                        <div className="text-xs md:text-sm font-bold text-red-600">
                          {clienteInfo.titulosVencidos} ({formatCurrency(clienteInfo.valorVencido)})
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dias em Atraso */}
                  {clienteInfo.diasAtraso > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <div>
                        <div className="text-[10px] text-gray-500">Dias em Atraso</div>
                        <div className="text-xs md:text-sm font-bold text-orange-600">
                          {clienteInfo.diasAtraso} dias
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={carregarHistoricoCompras}
                disabled={loading}
                className="text-xs"
              >
                <History className="w-3 h-3 mr-1" />
                Últimas Compras
              </Button>
            </div>
          </div>

          {/* Alertas Críticos */}
          {clienteInfo?.status === 'BLOQUEADO' && (
            <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <strong>CLIENTE BLOQUEADO:</strong> Não é possível realizar vendas para este cliente. Entre em contato com o financeiro.
              </div>
            </div>
          )}

          {clienteInfo?.status === 'INADIMPLENTE' && (
            <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-orange-800">
                <strong>ATENÇÃO:</strong> Cliente com {clienteInfo.titulosVencidos} título(s) vencido(s) há {clienteInfo.diasAtraso} dias. Total: {formatCurrency(clienteInfo.valorVencido)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Histórico */}
      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Últimas Compras (15 dias)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {historicoCompras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma compra nos últimos 15 dias
              </div>
            ) : (
              historicoCompras.map((pedido) => (
                <Card key={pedido.NUNOTA} className="hover:bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">Pedido #{pedido.NUNOTA}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(pedido.DTNEG).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700">
                          {formatCurrency(pedido.VLRNOTA)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (onRepetirPedido && pedido.itens) {
                              onRepetirPedido(pedido.itens)
                              setShowHistorico(false)
                            }
                          }}
                          className="text-xs mt-1"
                        >
                          Repetir Pedido
                        </Button>
                      </div>
                    </div>
                    {pedido.itens && pedido.itens.length > 0 && (
                      <div className="text-xs text-gray-600">
                        {pedido.itens.length} item(ns)
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}