"use client"

import { useState, useEffect } from "react"
import { X, Table, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

export interface TabelaPrecoPreco {
  NUTAB: number
  CODTAB: string
  DESCRICAO: string
  PRECO: number
}

interface EscolherPrecoTabelaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto: any
  tabelas: any[]
  onSelect: (tabela: any) => void
}

export function EscolherPrecoTabelaModal({
  open,
  onOpenChange,
  produto,
  tabelas,
  onSelect
}: EscolherPrecoTabelaModalProps) {
  const [search, setSearch] = useState("")
  const [precos, setPrecos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && produto) {
      carregarPrecos()
    }
  }, [open, produto])

  const carregarPrecos = async () => {
    if (!produto) return
    setLoading(true)
    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')

      const precosCalculados = await Promise.all(
        tabelas.map(async (tab) => {
          // Usar estritamente o NUTAB para busca offline
          const nutabParaBusca = tab.NUTAB || tab.nutab;
          const precosOffline = await OfflineDataService.getPrecos(
            Number(produto.CODPROD),
            nutabParaBusca ? Number(nutabParaBusca) : undefined
          )

          let preco = 0
          if (precosOffline && precosOffline.length > 0) {
            const itemPreco = precosOffline[0]
            const valorRaw = itemPreco.VLRVENDA !== undefined ? itemPreco.VLRVENDA :
              itemPreco.vlrVenda !== undefined ? itemPreco.vlrVenda :
                itemPreco.PRECO;

            if (valorRaw != null) {
              preco = typeof valorRaw === 'string'
                ? parseFloat(valorRaw.replace(',', '.'))
                : parseFloat(valorRaw)
            }
          }

          // Se não encontrou offline e estiver online, tentar API (fallback)
          if (preco === 0 && navigator.onLine) {
            try {
              const response = await fetch(`/api/oracle/preco?codProd=${produto.CODPROD}&tabelaPreco=${encodeURIComponent(tab.CODTAB)}`)
              if (response.ok) {
                const data = await response.json()
                preco = data.preco || 0
              }
            } catch (e) {
              console.warn(`Erro no fallback de API para CODTAB ${tab.CODTAB}:`, e)
            }
          }

          return {
            ...tab,
            PRECO: isNaN(preco) ? 0 : preco
          }
        })
      )
      setPrecos(precosCalculados)
    } catch (error) {
      console.error("Erro ao carregar preços das tabelas:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPrecos = precos.filter(p =>
    (p.DESCRICAO || '').toLowerCase().includes(search.toLowerCase()) ||
    String(p.CODTAB || '').includes(search) ||
    String(p.NUTAB || '').includes(search)
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[600px] w-[95vw] sm:w-full p-0 border-0 bg-slate-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex flex-col bg-white border-b border-[#F2F2F2] px-6 py-5 sticky top-0 z-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">Escolher Tabela de Preço</DialogTitle>
              {produto && (
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="font-semibold text-sm text-slate-600 truncate max-w-[280px]">{produto.DESCRPROD}</span>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md w-fit">Cód: {produto.CODPROD}</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500 -mr-2 -mt-1">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar tabela por nome ou código..."
              className="pl-11 h-12 rounded-xl text-sm font-medium shadow-sm border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 sm:p-6 custom-scrollbar">
          <div className="space-y-3 pb-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-3 border-[#76BA1B] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-slate-500">Calculando preços disponíveis...</p>
              </div>
            ) : filteredPrecos.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-medium text-slate-500">Nenhuma tabela encontrada para esta busca.</p>
              </div>
            ) : (
              filteredPrecos.map((p) => (
                <div
                  key={`${p.NUTAB}-${p.CODTAB}`}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${p.PRECO > 0
                    ? 'bg-white border-slate-200 hover:border-[#76BA1B]/50 hover:shadow-md cursor-pointer group'
                    : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  onClick={() => p.PRECO > 0 && onSelect(p)}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                      {(p.DESCRICAO || '').replace(' (Parceiro)', '')}
                    </h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 border-slate-200 font-mono">
                        Cód: {p.CODTAB}
                      </Badge>
                      {p.NUTAB && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 border-slate-200 font-mono">
                          Ref: {p.NUTAB}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Preço Final</span>
                      {p.PRECO > 0 ? (
                        <span className="font-black text-lg text-[#1E5128]">{formatCurrency(p.PRECO)}</span>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 italic">Indisponível</span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      disabled={p.PRECO === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(p);
                      }}
                      className={`h-10 px-4 rounded-lg font-bold text-xs transition-all ${p.PRECO > 0
                        ? 'bg-slate-100 text-slate-700 hover:bg-[#76BA1B] hover:text-white group-hover:bg-[#76BA1B] group-hover:text-white'
                        : 'bg-slate-100 text-slate-400'
                        }`}
                    >
                      Selecionar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
