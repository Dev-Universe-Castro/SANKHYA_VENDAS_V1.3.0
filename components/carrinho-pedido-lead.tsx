"use client"

import { useState, useEffect } from "react"
import { ShoppingCart, X, Edit, Package, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfiguracaoProdutoModal, ConfiguracaoProduto, UnidadeVolume } from "@/components/configuracao-produto-modal"
import { OfflineDataService } from "@/lib/offline-data-service"
import { toast } from "sonner"

interface CarrinhoPedidoLeadProps {
  itens: any[]
  total?: number
  formatCurrency?: (value: number) => string
  removerItem: (index: number) => void
  editarItem: (index: number, updatedItem: any) => void
  onCancelar: () => void
  onCriarPedido: () => void
  isOpen: boolean
  onClose: () => void
  loading?: boolean
  totalImpostos?: number
}

export function CarrinhoPedidoLead({
  itens = [],
  total,
  formatCurrency: formatCurrencyProp,
  removerItem,
  editarItem,
  onCancelar,
  onCriarPedido,
  isOpen,
  onClose,
  loading = false,
  totalImpostos = 0
}: CarrinhoPedidoLeadProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<any>(null)
  const [indexEditando, setIndexEditando] = useState<number | null>(null)
  const [unidadesProduto, setUnidadesProduto] = useState<UnidadeVolume[]>([])
  const [configInicial, setConfigInicial] = useState<Partial<ConfiguracaoProduto>>({})
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [errosImagem, setErrosImagem] = useState<Record<string, boolean>>({})

  const calcularTotal = () => {
    if (total !== undefined && total !== null) return total

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

  const itensArray = Array.isArray(itens) ? itens : []
  const totalItens = itensArray.length
  const totalValor = calcularTotal()

  const handleEditarClick = async (item: any, index: number) => {
    setLoadingEdit(true)
    try {
      const volumes = await OfflineDataService.getVolumes(item.CODPROD)
      const unidades: UnidadeVolume[] = [
        {
          CODVOL: item.UNIDADE || item.CODVOL || 'UN',
          DESCRICAO: `${item.UNIDADE || item.CODVOL || 'UN'} - Unidade Padrão`,
          QUANTIDADE: 1,
          isPadrao: true
        },
        ...volumes.filter((v: any) => v.ATIVO === 'S').map((v: any) => ({
          CODVOL: v.CODVOL,
          DESCRICAO: v.DESCRDANFE || v.CODVOL,
          QUANTIDADE: v.QUANTIDADE || 1,
          isPadrao: false
        }))
      ]

      setUnidadesProduto(unidades)
      setProdutoEditando(item)
      setIndexEditando(index)
      setConfigInicial({
        quantidade: Number(item.QTDNEG) || 1,
        desconto: Number(item.PERCDESC) || 0,
        unidade: item.CODVOL || item.UNIDADE || 'UN',
        preco: Number(item.VLRUNIT) || 0
      })
      setShowEditModal(true)
    } catch (error) {
      console.error('Erro ao carregar dados para edição:', error)
      toast.error('Erro ao carregar dados do produto')
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleConfirmEdit = (config: ConfiguracaoProduto) => {
    if (indexEditando !== null && produtoEditando) {
      const vlrSubtotal = config.preco * config.quantidade
      const vlrDesconto = (vlrSubtotal * config.desconto) / 100
      const vlrTotal = vlrSubtotal - vlrDesconto

      const updatedItem = {
        ...produtoEditando,
        CODVOL: config.unidade,
        UNIDADE: config.unidade,
        VLRUNIT: config.preco,
        QTDNEG: config.quantidade,
        PERCDESC: config.desconto,
        VLRDESC: vlrDesconto,
        VLRTOT: vlrTotal,
        politicaAplicada: produtoEditando.politicaAplicada
      }
      editarItem(indexEditando, updatedItem)
      toast.success("Item atualizado com sucesso")
    }
    setShowEditModal(false)
    setProdutoEditando(null)
    setIndexEditando(null)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setProdutoEditando(null)
    setIndexEditando(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-full w-full h-full md:max-w-md md:max-h-[90vh] p-0 flex flex-col m-0 rounded-none md:rounded-[2rem] border-none shadow-2xl overflow-hidden bg-white">
        {/* Header */}
        <DialogHeader className="border-b border-[#F2F2F2] px-6 py-5 flex-shrink-0 bg-white relative">
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
                <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">Seu Carrinho</DialogTitle>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {totalItens} {totalItens === 1 ? 'item adicionado' : 'itens adicionados'}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Lista de Itens */}
        <ScrollArea className="flex-1 p-5 md:max-h-[50vh] custom-scrollbar bg-slate-50/50">
          {totalItens === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-[2rem] border border-[#F2F2F2] shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-[#F2F2F2]">
                <ShoppingCart className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-base text-slate-600 font-bold">Seu carrinho está vazio</p>
              <p className="text-sm text-slate-400 mt-1 max-w-[200px]">Adicione produtos para iniciar o seu pedido.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {itensArray.map((item, index) => (
                <div key={index} className="bg-white rounded-3xl border border-[#F2F2F2] p-4 shadow-sm hover:border-[#76BA1B]/30 hover:shadow-md transition-all group">
                  <div className="flex gap-4">
                    {/* Imagem do Produto */}
                    <div key={`img-container-${item.CODPROD}-${index}`} className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {errosImagem[String(item.CODPROD)] ? (
                        <div className="text-2xl text-slate-300 font-bold">
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

                    {/* Informações do Produto */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm leading-tight line-clamp-2 text-slate-800">
                          {item.DESCRPROD}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {item.MARCA || 'Diversos'}
                          </span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-xs font-semibold text-slate-500">
                            {item.QTDNEG} un
                          </span>
                        </div>
                        <p className="text-lg font-black text-[#1E5128] mt-1.5">
                          {formatCurrency(item.VLRUNIT)}
                        </p>
                      </div>

                      {/* Controles */}
                      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-50">
                        {/* Botão Editar */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditarClick(item, index)}
                          className="h-8 px-3 text-xs font-semibold text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                          title="Editar item"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" />
                          Editar
                        </Button>

                        {/* Botão Remover */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removerItem(index)}
                          className="h-8 px-3 text-xs font-semibold text-red-500 bg-red-50/50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Remover item"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer com Total e Botões */}
        <div className="border-t border-[#F2F2F2] p-5 bg-white space-y-4 flex-shrink-0 z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
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

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Base</span>
              <span className="text-xl font-bold text-slate-700">
                {formatCurrency(totalValor)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#1E5128] uppercase tracking-wider">Total com Impostos</span>
                {totalImpostos > 0 ? (
                  <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                    <Info className="w-3 h-3" /> Estimativa online
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Impostos não calculados</span>
                )}
              </div>
              <span className="text-2xl font-black text-[#1E5128] tracking-tight">
                {formatCurrency(totalValor + (totalImpostos || 0))}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onCancelar}
              className="w-full h-12 font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              disabled={loading}
            >
              Voltar
            </Button>
          </div>
        </div>
      </DialogContent>
      {produtoEditando && (
        <ConfiguracaoProdutoModal
          open={showEditModal}
          onOpenChange={handleCloseEditModal}
          produto={produtoEditando}
          unidades={unidadesProduto}
          configInicial={configInicial}
          onConfirmar={handleConfirmEdit}
          modo="editar"
          disabled={loadingEdit}
          maxDesconto={produtoEditando.MAX_DESC_PERMITIDO}
          maxAcrescimo={produtoEditando.MAX_ACRE_PERMITIDO}
          politicaAplicada={produtoEditando.politicaAplicada}
        />
      )}
    </Dialog>
  )
}