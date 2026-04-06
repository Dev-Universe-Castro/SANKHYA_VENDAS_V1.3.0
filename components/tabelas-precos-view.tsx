"use client"

import { useState, useEffect } from "react"
import { Search, ChevronRight, Table, Package, DollarSign, ArrowLeft, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OfflineDataService } from "@/lib/offline-data-service"
import { toast } from "sonner"

export default function TabelasPrecosView() {
  const [tabelas, setTabelas] = useState<any[]>([])
  const [parceirosMap, setParceirosMap] = useState<Record<number, any[]>>({})
  const [tabelaSelecionada, setTabelaSelecionada] = useState<any>(null)
  const [precos, setPrecos] = useState<any[]>([])
  const [produtosMap, setProdutosMap] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [buscaTabela, setBuscaTabela] = useState("")
  const [buscaPreco, setBuscaPreco] = useState("")

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = async () => {
    setLoading(true)
    try {
      const [tabelasData, produtosData, parceirosData] = await Promise.all([
        OfflineDataService.getTabelasPrecos(),
        OfflineDataService.getProdutos(),
        OfflineDataService.getParceiros()
      ])

      setTabelas(tabelasData)

      const pMap: Record<number, any> = {}
      produtosData.forEach((p: any) => {
        const cod = Number(p.CODPROD)
        if (!isNaN(cod)) {
          pMap[cod] = p
        }
      })
      setProdutosMap(pMap)

      // Mapear parceiros por CODTAB
      const parcMap: Record<number, any[]> = {}
      console.log("DEBUG: Iniciando mapeamento. Total parceiros:", parceirosData.length)
      parceirosData.forEach((parc: any) => {
        // Log para os primeiros parceiros para ver a estrutura
        const codTab = Number(parc.CODTAB)
        if (!isNaN(codTab) && codTab > 0) {
          if (!parcMap[codTab]) parcMap[codTab] = []
          parcMap[codTab].push(parc)
        }
      })
      console.log("DEBUG: Mapeamento concluído. Chaves no mapa:", Object.keys(parcMap))
      setParceirosMap(parcMap)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar informações")
    } finally {
      setLoading(false)
    }
  }

  const selecionarTabela = async (tabela: any) => {
    setTabelaSelecionada(tabela)
    setLoading(true)
    try {
      const allPrecos = await OfflineDataService.getExcecoesPrecos()
      const precosFiltrados = allPrecos.filter((p: any) => Number(p.NUTAB) === Number(tabela.NUTAB))
      setPrecos(precosFiltrados)
    } catch (error) {
      console.error("Erro ao carregar preços:", error)
      toast.error("Erro ao carregar preços da tabela")
    } finally {
      setLoading(false)
    }
  }

  const tabelasFiltradas = tabelas.filter(t =>
    String(t.CODTAB).includes(buscaTabela) ||
    (t.DESCRICAO && t.DESCRICAO.toLowerCase().includes(buscaTabela.toLowerCase()))
  )

  const precosFiltrados = precos.filter(p => {
    const produto = produtosMap[Number(p.CODPROD)]
    const termo = buscaPreco.toLowerCase()
    return String(p.CODPROD).includes(termo) ||
      (produto?.DESCRPROD && produto.DESCRPROD.toLowerCase().includes(termo))
  })

  if (tabelaSelecionada) {
    return (
      <div className="h-full flex flex-col bg-transparent overflow-hidden scrollbar-hide">
        <div className="flex-shrink-0 p-4 md:p-6 border-b border-[#F2F2F2] flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 bg-white md:bg-transparent">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setTabelaSelecionada(null)} className="h-10 w-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-base md:text-2xl font-bold truncate text-[#1E5128]">Tabela: {tabelaSelecionada.CODTAB}</h2>
              <p className="text-xs md:text-sm text-slate-500 truncate">{tabelaSelecionada.DESCRICAO || 'Detalhes dos Preços'}</p>
            </div>
          </div>
          <div className="relative w-full md:w-80 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={buscaPreco}
              onChange={(e) => setBuscaPreco(e.target.value)}
              className="pl-9 h-10 bg-white border-[#F2F2F2] rounded-xl text-sm focus-visible:ring-[#76BA1B]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#76BA1B] border-t-transparent"></div>
              <p className="text-sm text-slate-500 font-bold">Carregando catálogo de preços...</p>
            </div>
          ) : (
            <div className="p-4 md:p-6 pb-24 md:pb-6">
              <div className="bg-white md:rounded-2xl md:border border-[#F2F2F2] md:shadow-sm overflow-hidden">
                {/* Tabela Desktop */}
                <div className="hidden md:block">
                  <UITable>
                    <TableHeader className="bg-slate-50/50 border-b border-[#F2F2F2]">
                      <TableRow className="hover:bg-transparent border-0">
                        <TableHead className="w-24 md:w-32 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11">Cód. Prod</TableHead>
                        <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11">Descrição do Produto</TableHead>
                        <TableHead className="text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11 w-32 md:w-40">Preço de Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {precosFiltrados.length > 0 ? (
                        precosFiltrados.map((p, idx) => {
                          const produto = produtosMap[Number(p.CODPROD)]
                          return (
                            <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-[#F2F2F2]">
                              <TableCell className="font-mono text-xs md:text-sm text-slate-500">{p.CODPROD}</TableCell>
                              <TableCell className="text-sm md:text-base text-slate-700">{produto?.DESCRPROD || 'Produto não encontrado'}</TableCell>
                              <TableCell className="text-right font-medium text-base md:text-lg text-[#1E5128]">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.VLRVENDA)}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-20 text-slate-400 font-medium">
                            Nenhum preço encontrado nesta tabela.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </UITable>
                </div>

                {/* Lista Mobile */}
                <div className="md:hidden flex flex-col gap-3 mt-2">
                  {precosFiltrados.length > 0 ? (
                    precosFiltrados.map((p, idx) => {
                      const produto = produtosMap[Number(p.CODPROD)]
                      return (
                        <div key={idx} className="p-4 bg-white border border-[#F2F2F2] rounded-2xl shadow-sm flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-mono tracking-wider">
                              CÓD: {p.CODPROD}
                            </span>
                            <p className="text-sm text-slate-700 line-clamp-2 leading-tight mt-1">
                              {produto?.DESCRPROD || 'Produto não encontrado'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Venda</p>
                            <div className="bg-[#76BA1B]/10 border border-[#76BA1B]/20 text-[#1E5128] px-2 py-1 rounded-lg">
                              <p className="text-sm font-semibold whitespace-nowrap">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.VLRVENDA)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Package className="w-10 h-10 opacity-20" />
                      <p className="text-sm font-bold">Nenhum preço listado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por descrição da tabela..."
              value={buscaTabela}
              onChange={(e) => setBuscaTabela(e.target.value)}
              className="pl-9 h-10 bg-white border border-[#F2F2F2] rounded-xl text-sm focus-visible:ring-[#76BA1B]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
            {tabelasFiltradas.map((tabela) => {
              const parceiros = parceirosMap[Number(tabela.CODTAB)] || []
              const parceiroPrincipal = parceiros[0]

              return (
                <Card
                  key={tabela.NUTAB}
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer border-[#F2F2F2] flex flex-col h-auto shadow-sm rounded-2xl group relative overflow-hidden"
                  onClick={() => selecionarTabela(tabela)}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#76BA1B]"></div>
                  <CardHeader className="p-4 md:p-5 flex-1 pl-5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="bg-[#76BA1B]/10 text-[#1E5128] px-2 py-0.5 rounded border border-[#76BA1B]/20 font-mono text-[10px] md:text-xs font-bold w-fit">
                        Cód: {tabela.CODTAB}
                      </div>
                      <Table className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                    <CardTitle className="text-sm md:text-base mt-2 line-clamp-2 leading-tight font-bold text-[#1E5128]">
                      {tabela.DESCRICAO || `Tabela Básica ${tabela.CODTAB}`}
                    </CardTitle>
                    <CardDescription className="text-[10px] md:text-10 mt-1 text-slate-400">NUTAB: {tabela.NUTAB}</CardDescription>

                    <div className="mt-3">
                      {parceiroPrincipal ? (
                        <div className="text-[9px] md:text-[11px] font-medium text-slate-700 bg-slate-50 p-2 md:p-3 rounded-xl border border-[#F2F2F2]">
                          <p className="flex items-center gap-1.5 mb-1 text-slate-400">
                            <Users className="w-3 h-3 text-[#1E5128]" />
                            <span className="font-bold uppercase tracking-wider text-[8px] md:text-[9px]">Vínculo do Cliente</span>
                          </p>
                          <p className="text-[10px] md:text-xs font-bold text-[#1E5128] leading-snug line-clamp-2">
                            {parceiroPrincipal.NOMEPARC}
                          </p>
                        </div>
                      ) : (
                        <div className="text-[9px] md:text-[11px] font-medium text-slate-400 bg-slate-50/50 p-2 md:p-3 rounded-xl border border-transparent flex items-center gap-1.5">
                          <Users className="w-3 h-3 opacity-40" />
                          <span className="line-clamp-1 italic">Sem cliente vinculado</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 md:px-5 py-3 border-t border-[#F2F2F2] bg-slate-50/50 mt-auto group-hover:bg-[#76BA1B]/10 transition-colors">
                    <div className="flex items-center justify-between text-[11px] text-[#76BA1B] font-bold uppercase tracking-wider">
                      <span>Ver lista de preços</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {tabelasFiltradas.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Table className="w-10 h-10 opacity-20" />
                <p className="text-sm font-semibold">Nenhuma tabela de preço localizada.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
