"use client"

import { useState, useEffect } from "react"
import { ShoppingCart, X, ChevronUp, AlertTriangle, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface MiniCarrinhoFlutuanteProps {
  itens: any[]
  total?: number
  formatCurrency?: (value: number) => string
  removerItem?: (index: number) => void
  editarItem?: (index: number) => void
  onRemoverItem?: (index: number) => void
  onEditarItem?: (index: number) => void
  onFinalizarPedido?: () => void
  limiteCredito?: number
  titulosVencidos?: number
  clienteBloqueado?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export function MiniCarrinhoFlutuante({
  itens = [],
  total,
  formatCurrency: formatCurrencyProp,
  removerItem,
  editarItem,
  onRemoverItem,
  onEditarItem,
  onFinalizarPedido,
  limiteCredito = 0,
  titulosVencidos = 0,
  clienteBloqueado = false,
  isOpen,
  onClose
}: MiniCarrinhoFlutuanteProps) {
  const [expandido, setExpandido] = useState(false)
  const [alertas, setAlertas] = useState<string[]>([])
  const [errosImagem, setErrosImagem] = useState<Record<string, boolean>>({})

  // Se isOpen está definido, usar como modal controlado
  const isModalMode = isOpen !== undefined
  const isVisible = isModalMode ? isOpen : expandido

  // Log de debug quando componente recebe props
  useEffect(() => {
    console.log('🛒 MiniCarrinhoFlutuante atualizado:', {
      isOpen,
      totalItens: itens?.length,
      itensIsArray: Array.isArray(itens),
      itens,
      total
    })
  }, [isOpen, itens, total])

  const calcularTotal = () => {
    if (total !== undefined && total !== null) return total

    // Garantir que itens é um array
    const itensArray = Array.isArray(itens) ? itens : []
    if (itensArray.length === 0) return 0

    return itensArray.reduce((acc, item) => {
      const vlrUnit = Number(item.VLRUNIT) || 0
      const qtd = Number(item.QTDNEG) || 0
      const percdesc = Number(item.PERCDESC) || 0
      const vlrDesc = (vlrUnit * qtd * percdesc) / 100
      return acc + (vlrUnit * qtd - vlrDesc)
    }, 0)
  }

  const formatCurrency = formatCurrencyProp || ((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  })

  const handleRemoverItem = removerItem || onRemoverItem || (() => { })
  const handleEditarItem = editarItem || onEditarItem || (() => { })

  // Validações em tempo real
  useEffect(() => {
    const novosAlertas: string[] = []

    if (clienteBloqueado) {
      novosAlertas.push('⛔ Cliente BLOQUEADO - não é possível finalizar pedido')
    }

    if (titulosVencidos > 0) {
      novosAlertas.push(`⚠️ ${titulosVencidos} título(s) vencido(s)`)
    }

    const total = calcularTotal()
    if (limiteCredito > 0 && total > limiteCredito) {
      novosAlertas.push(`💳 Limite de crédito excedido! (Disponível: ${formatCurrency(limiteCredito)})`)
    }

    setAlertas(novosAlertas)
  }, [itens, limiteCredito, titulosVencidos, clienteBloqueado])

  // Garantir que itens seja sempre um array
  const itensArray = Array.isArray(itens) ? itens : []
  const totalItens = itensArray.length
  const totalValor = calcularTotal()
  const podeFinalizarPedido = totalItens > 0 && !clienteBloqueado

  console.log('🔍 Renderizando carrinho:', { totalItens, itensArray, isModalMode, isOpen })

  if ((totalItens === 0 && !isModalMode) || !isModalMode) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-[420px] max-h-[85vh] p-0 flex flex-col m-0 rounded-2xl border-none shadow-xl overflow-hidden bg-white">
        {/* Header */}
        <div className="border-b border-[#F2F2F2] px-6 py-5 flex-shrink-0 bg-white relative">
          <div className="flex items-center justify-between w-full relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-slate-600" />
                {totalItens > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-[#76BA1B] text-white text-[10px] font-bold px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center shadow-sm">
                    {totalItens}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Seu Carrinho</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {totalItens} {totalItens === 1 ? 'item adicionado' : 'itens adicionados'}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="border-b bg-yellow-50 p-3 space-y-2">
            {alertas.map((alerta, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 text-xs",
                  alerta.includes('BLOQUEADO') ? 'text-red-600 font-semibold' : 'text-yellow-800'
                )}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{alerta}</span>
              </div>
            ))}
          </div>
        )}

        {/* Lista de Itens */}
        <ScrollArea className="flex-1 p-5 max-h-[50vh] custom-scrollbar bg-slate-50/50">
          {totalItens === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-base text-slate-600 font-bold">Seu carrinho está vazio</p>
              <p className="text-sm text-slate-400 mt-1 max-w-[200px]">Adicione produtos para iniciar o seu pedido.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {itensArray.map((item, index) => (
                <div key={index} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-[#76BA1B]/30 hover:shadow-md transition-all group">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-4">
                      {/* Imagem do Produto */}
                      <div key={`img-container-${item.CODPROD}-${index}`} className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {errosImagem[String(item.CODPROD)] ? (
                          <div className="text-xl text-slate-300 font-bold">
                            {item.DESCRPROD?.charAt(0) || 'P'}
                          </div>
                        ) : (
                          <img
                            src={`/api/sankhya/produtos/imagem?codProd=${item.CODPROD}`}
                            alt={item.DESCRPROD}
                            className="w-full h-full object-contain p-1"
                            onError={() => {
                              setErrosImagem(prev => ({ ...prev, [String(item.CODPROD)]: true }))
                            }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm leading-tight line-clamp-2 text-slate-800">
                          {item.DESCRPROD}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-400">
                            Cód: {item.CODPROD}
                          </span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {item.QTDNEG}x
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total</span>
                        <div className="font-black text-lg text-[#1E5128]">
                          {formatCurrency(item.QTDNEG * item.VLRUNIT)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditarItem(index)}
                          className="h-8 w-8 p-0 text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                          title="Editar item"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoverItem(index)}
                          className="h-8 w-8 p-0 text-red-500 bg-red-50/50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Remover item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer com Total */}
        <div className="border-t border-[#F2F2F2] p-5 bg-white space-y-4 shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
          {/* Resumo do Pedido */}
          {totalItens > 0 && (
            <div className="space-y-2.5 pb-3 border-b border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Itens no carrinho</span>
                <span className="font-bold text-slate-700">{totalItens} {totalItens === 1 ? 'produto' : 'produtos'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Quantidade total</span>
                <span className="font-bold text-slate-700">
                  {itensArray.reduce((sum, item) => sum + (Number(item.QTDNEG) || 0), 0)} unidades
                </span>
              </div>
            </div>
          )}

          {/* Valor Total */}
          <div className="flex justify-between items-baseline bg-[#76BA1B]/10 p-4 rounded-xl border border-[#76BA1B]/20">
            <span className="text-sm font-bold text-[#1E5128] uppercase tracking-wider">Total</span>
            <span className="text-3xl font-black text-[#1E5128] tracking-tight">
              {formatCurrency(totalValor)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}