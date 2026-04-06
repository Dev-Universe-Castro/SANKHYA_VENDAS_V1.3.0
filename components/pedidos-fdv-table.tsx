"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, RefreshCw, Filter, AlertCircle, Plus, Copy, Calendar, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, FileText } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import PedidoVendaRapido from "./pedido-venda-rapido"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PedidoFDV {
  ID: number
  ORIGEM: 'RAPIDO' | 'LEAD' | 'OFFLINE'
  CODLEAD?: number
  CORPO_JSON: any
  STATUS: 'SUCESSO' | 'ERRO'
  NUNOTA?: number
  ERRO?: string | object
  TENTATIVAS: number
  NOME_USUARIO: string
  DATA_CRIACAO: string
  DATA_ULTIMA_TENTATIVA: string
}

export default function PedidosFDVTable() {
  const [pedidos, setPedidos] = useState<PedidoFDV[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | undefined>(undefined)
  const [filtroDataFim, setFiltroDataFim] = useState<Date | undefined>(undefined)
  const [filtroParceiro, setFiltroParceiro] = useState<string>('')
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoFDV | null>(null)
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [showNovoPedidoModal, setShowNovoPedidoModal] = useState(false)
  const [pedidoDuplicar, setPedidoDuplicar] = useState<any>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const limit = 10

  useEffect(() => {
    setPage(1)
    carregarPedidos(1)
  }, [filtroOrigem, filtroStatus, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      carregarPedidos(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [filtroParceiro])

  const [showFilters, setShowFilters] = useState(false)

  const carregarPedidos = async (targetPage = page) => {
    setLoading(true)
    try {
      let url = '/api/pedidos-fdv'
      const params = new URLSearchParams()
      params.append('page', targetPage.toString())
      params.append('limit', limit.toString())
      if (filtroOrigem !== 'TODOS') params.append('origem', filtroOrigem)
      if (filtroStatus !== 'TODOS') params.append('status', filtroStatus)
      if (filtroDataInicio) params.append('dataInicio', format(filtroDataInicio, "yyyy-MM-dd"))
      if (filtroDataFim) params.append('dataFim', format(filtroDataFim, "yyyy-MM-dd"))
      if (filtroParceiro) params.append('parceiro', filtroParceiro)
      if (params.toString()) url += `?${params.toString()}`

      let data;
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error('API Error')
        const result = await response.json()
        data = result.data;
        setTotalPages(result.totalPages)
        setTotalItems(result.total)
      } catch (apiError) {
        console.warn('⚠️ [OFFLINE] Falha ao carregar pedidos da API. Buscando dados locais...', apiError);
        const { db } = await import('@/lib/client-db');
        const localData = await db.pedidos.reverse().toArray();
        data = localData;
        setTotalPages(1);
        setTotalItems(localData.length);
        toast.info('📱 Visualizando dados salvos localmente');
      }

      // Buscar nomes dos parceiros no IndexedDB para pedidos que não têm
      const { db } = await import('@/lib/client-db')
      const pedidosComNome = await Promise.all(data.map(async (p: PedidoFDV) => {
        const dados = typeof p.CORPO_JSON === 'string' ? JSON.parse(p.CORPO_JSON) : p.CORPO_JSON;

        let nomeExistente = dados?.cabecalho?.RAZAOSOCIAL || dados?.cabecalho?.NOMEPARC || dados?.RAZAO_SOCIAL || dados?.NOMEPARC;
        const codParc = dados?.cabecalho?.CODPARC || dados?.CODPARC || p.CODLEAD;

        if (codParc) {
          try {
            let parceiro = await db.parceiros.get(String(codParc));
            if (!parceiro && dados?.cabecalho?.CGC_CPF) {
              parceiro = await db.parceiros.where('CGC_CPF').equals(dados.cabecalho.CGC_CPF).first();
            }

            if (parceiro) {
              const novoNome = parceiro.RAZAOSOCIAL || parceiro.NOMEPARC;
              return {
                ...p,
                NOME_PARCEIRO_DB: novoNome
              };
            }
          } catch (e) {
            console.error('Erro ao buscar parceiro no DB:', e);
          }
        }
        return p;
      }));

      setPedidos(pedidosComNome)
    } catch (error: any) {
      toast.error(`Erro ao carregar pedidos: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const abrirPedido = async (pedido: PedidoFDV) => {
    setPedidoSelecionado(pedido)
    setShowPedidoModal(true)
  }

  const duplicarPedido = (pedido: PedidoFDV) => {
    if (pedido.CORPO_JSON) {
      const corpo = typeof pedido.CORPO_JSON === 'string' ? JSON.parse(pedido.CORPO_JSON) : pedido.CORPO_JSON
      setPedidoDuplicar(corpo)
      setShowNovoPedidoModal(true)
    } else {
      toast.error("Não foi possível duplicar o pedido: dados não encontrados")
    }
  }

  const exportarPedidoPDF = (pedido: PedidoFDV) => {
    try {
      const doc = new jsPDF()
      const dados = typeof pedido.CORPO_JSON === 'string' ? JSON.parse(pedido.CORPO_JSON) : pedido.CORPO_JSON
      const cabecalho = dados.cabecalho || dados
      const itens = dados.itens || []

      // Título Centralizado
      doc.setFontSize(22)
      doc.setFont("helvetica", "bold")
      doc.text("PEDIDO DE VENDA", 105, 20, { align: "center" })

      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      doc.text(`Data: ${format(new Date(pedido.DATA_CRIACAO), "dd/MM/yyyy", { locale: ptBR })}`, 105, 30, { align: "center" })

      // Seção: DADOS DO CLIENTE
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("DADOS DO CLIENTE", 14, 45)

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Código: ${cabecalho.CODPARC || '-'}`, 14, 55)
      doc.text(`Tipo: ${cabecalho.TIPO_CLIENTE || cabecalho.TIPOPARC || 'PJ'}`, 120, 55)
      doc.text(`Razão Social: ${cabecalho.RAZAO_SOCIAL || cabecalho.RAZAOSOCIAL || cabecalho.NOMEPARC || '-'}`, 14, 62)
      doc.text(`CPF/CNPJ: ${cabecalho.CPF_CNPJ || cabecalho.CGC_CPF || '-'}`, 14, 69)
      doc.text(`IE/RG: ${cabecalho.IE_RG || cabecalho.IDENTIDADE || '-'}`, 120, 69)

      // Seção: DADOS DO PEDIDO
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("DADOS DO PEDIDO", 14, 85)

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Vendedor: ${cabecalho.CODVEND || '-'}`, 14, 95)
      doc.text(`Tipo Operação: ${cabecalho.CODTIPOPER || '-'}`, 120, 95)
      doc.text(`Condição Comercial: ${cabecalho.CODTIPVENDA || '-'}`, 14, 102)
      doc.text(`Modelo Nota: ${cabecalho.MODELO_NOTA || '-'}`, 120, 102)

      const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

      const tableData = itens.map((item: any) => [
        item.DESCRPROD || item.CODPROD,
        item.QTDNEG,
        formatCurrency(item.VLRUNIT),
        `${item.PERCDESC || 0}%`,
        formatCurrency(item.VLRTOT || (item.VLRUNIT * item.QTDNEG))
      ])

      const totalPedido = itens.reduce((acc: number, item: any) => acc + (item.VLRTOT || (item.VLRUNIT * item.QTDNEG)), 0)

      autoTable(doc, {
        startY: 115,
        head: [['Produto', 'Qtd', 'Vlr. Unit.', 'Desc %', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
        foot: [[{ content: 'TOTAL DO PEDIDO:', colSpan: 4, styles: { halign: 'right', fillColor: [20, 184, 166], textColor: [255, 255, 255], fontStyle: 'bold' } }, { content: formatCurrency(totalPedido), styles: { fillColor: [20, 184, 166], textColor: [255, 255, 255], fontStyle: 'bold' } }]],
        margin: { top: 115 },
        styles: { fontSize: 9 }
      })

      doc.save(`pedido_${pedido.ID}.pdf`)
      toast.success("PDF gerado com sucesso!")
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      toast.error("Erro ao gerar PDF do pedido")
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = { SUCESSO: 'default', ERRO: 'destructive' }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  const getOrigemBadge = (origem: string) => {
    const variants: Record<string, any> = { LEAD: 'default', RAPIDO: 'outline', OFFLINE: 'secondary' }
    return <Badge variant={variants[origem] || 'outline'}>{origem}</Badge>
  }

  return (
    <div className="h-full flex flex-col bg-transparent scrollbar-hide">
      <div className="flex-1 overflow-auto scrollbar-hide">
        <div className="p-0 md:p-6">
          <div className="bg-white md:rounded-2xl shadow-sm border border-[#F2F2F2] overflow-hidden">
            <div className="px-4 py-4 md:px-6 md:py-4 border-b bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" size="sm" onClick={() => carregarPedidos()} disabled={loading} className="h-10 px-4 text-xs font-semibold rounded-lg border-gray-200">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={`h-10 px-4 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all ${showFilters ? 'bg-green-50 border-green-200 text-green-700' : 'border-[#F2F2F2] text-gray-600'}`}>
                    <Filter className="w-4 h-4" />
                    <span>Filtros</span>
                    {(filtroOrigem !== 'TODOS' || filtroStatus !== 'TODOS' || filtroDataInicio || filtroDataFim || filtroParceiro) && <div className="w-2 h-2 rounded-full bg-[#76BA1B] animate-pulse" />}
                  </Button>
                </div>
                <Button onClick={() => setShowNovoPedidoModal(true)} className="w-full md:w-auto bg-[#76BA1B] hover:bg-[#1E5128] text-white h-12 md:h-10 font-bold rounded-xl shadow-md shadow-[#76BA1B]/20 transition-all active:scale-[0.98]">
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Pedido
                </Button>
              </div>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-white ${showFilters ? 'max-h-[500px] opacity-100 border-b border-[#F2F2F2]' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Origem</label>
                    <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                      <SelectTrigger className="h-11 w-full bg-white border-gray-200"><SelectValue placeholder="Origem" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todas Origens</SelectItem>
                        <SelectItem value="RAPIDO">Pedido Rápido</SelectItem>
                        <SelectItem value="LEAD">From Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Status</label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger className="h-11 w-full bg-white border-gray-200"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos Status</SelectItem>
                        <SelectItem value="SUCESSO">Sucesso</SelectItem>
                        <SelectItem value="ERRO">Erro</SelectItem>
                        <SelectItem value="PENDENTE">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Parceiro</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input placeholder="Buscar..." value={filtroParceiro} onChange={(e) => setFiltroParceiro(e.target.value)} className="h-11 pl-9 bg-white border-gray-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white">
              <div className="md:hidden divide-y divide-gray-100">
                {loading ? (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    <p className="text-xs font-medium text-gray-500">Carregando pedidos...</p>
                  </div>
                ) : pedidos.length === 0 ? (
                  <div className="py-20 text-center px-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-gray-300" /></div>
                    <p className="text-sm font-semibold text-gray-900">Nenhum pedido encontrado</p>
                  </div>
                ) : (
                  pedidos.map((pedido) => (
                    <div key={pedido.ID} className="p-4 active:bg-gray-50/50 hover:bg-[#F2F2F2]/50 transition-colors border-b border-[#F2F2F2] last:border-0 rounded-2xl mx-2 my-1">
                      <div onClick={() => abrirPedido(pedido)}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID #{pedido.ID}</span>
                              {pedido.NUNOTA && (
                                <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-100">
                                  NUNOTA: {pedido.NUNOTA}
                                </Badge>
                              )}
                              {getOrigemBadge(pedido.ORIGEM)}
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                              {(() => {
                                if ((pedido as any).NOME_PARCEIRO_DB) return (pedido as any).NOME_PARCEIRO_DB;
                                const dados = typeof pedido.CORPO_JSON === 'string' ? JSON.parse(pedido.CORPO_JSON) : pedido.CORPO_JSON;
                                return dados?.cabecalho?.RAZAOSOCIAL || dados?.cabecalho?.NOMEPARC || dados?.RAZAO_SOCIAL || dados?.NOMEPARC || 'Parceiro não identificado';
                              })()}
                            </h3>
                          </div>
                          <div className="ml-3 flex flex-col items-end gap-2">{getStatusBadge(pedido.STATUS)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
                        <Button variant="outline" size="sm" onClick={() => abrirPedido(pedido)} className="h-9 px-3 text-xs flex items-center gap-1.5">
                          <Eye className="w-4 h-4" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => duplicarPedido(pedido)} className="h-9 px-3 text-xs flex items-center gap-1.5">
                          <Copy className="w-4 h-4" />
                          Copiar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportarPedidoPDF(pedido)} className="h-9 px-3 text-xs flex items-center gap-1.5 text-blue-600 border-blue-100 bg-blue-50/30">
                          <FileText className="w-4 h-4" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden md:block overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-20 font-bold py-4">ID</TableHead>
                      <TableHead className="font-bold py-4">Data</TableHead>
                      <TableHead className="font-bold py-4">Origem</TableHead>
                      <TableHead className="font-bold py-4">Status</TableHead>
                      <TableHead className="font-bold py-4">NUNOTA</TableHead>
                      <TableHead className="font-bold py-4">Tentativas</TableHead>
                      <TableHead className="font-bold py-4">Usuário</TableHead>
                      <TableHead className="w-32 text-right font-bold py-4">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-12 text-[#1E5128]/70">Carregando...</TableCell></TableRow>
                    ) : pedidos.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400 font-medium">Nenhum pedido encontrado</TableCell></TableRow>
                    ) : (
                      pedidos.map((pedido) => (
                        <TableRow key={pedido.ID} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => abrirPedido(pedido)}>
                          <TableCell className="font-bold text-gray-400">#{pedido.ID}</TableCell>
                          <TableCell>{format(new Date(pedido.DATA_CRIACAO), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell>{getOrigemBadge(pedido.ORIGEM)}</TableCell>
                          <TableCell>{getStatusBadge(pedido.STATUS)}</TableCell>
                          <TableCell>{pedido.NUNOTA || '-'}</TableCell>
                          <TableCell className="text-center">{pedido.TENTATIVAS}</TableCell>
                          <TableCell>{pedido.NOME_USUARIO}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); abrirPedido(pedido); }} className="h-8 w-8 p-0 relative z-10" title="Visualizar"><Eye className="w-4 h-4 text-gray-500" /></Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); duplicarPedido(pedido); }} className="h-8 w-8 p-0 relative z-10" title="Duplicar"><Copy className="w-4 h-4 text-gray-500" /></Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); exportarPedidoPDF(pedido); }} className="h-8 w-8 p-0 relative z-10" title="Exportar PDF"><FileText className="w-4 h-4 text-blue-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="px-4 py-4 md:px-6 border-t border-[#F2F2F2] bg-white rounded-b-2xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="hidden sm:block"><p className="text-xs text-gray-500 font-medium">Mostrando {pedidos.length} de {totalItems} pedidos</p></div>
                  <div className="flex items-center gap-2 flex-1 justify-between sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => { const newPage = Math.max(1, page - 1); setPage(newPage); carregarPedidos(newPage); }} disabled={page === 1 || loading}>Anterior</Button>
                    <div className="text-xs font-bold">Página {page} de {totalPages}</div>
                    <Button variant="outline" size="sm" onClick={() => { const newPage = Math.min(totalPages, page + 1); setPage(newPage); carregarPedidos(newPage); }} disabled={page === totalPages || loading}>Próximo</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pedidoSelecionado && (
        <Dialog open={showPedidoModal} onOpenChange={setShowPedidoModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Pedido #{pedidoSelecionado.ID}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm font-medium">Status</p><p>{getStatusBadge(pedidoSelecionado.STATUS)}</p></div>
                <div><p className="text-sm font-medium">Tentativas</p><p>{pedidoSelecionado.TENTATIVAS}</p></div>
              </div>
              {pedidoSelecionado.ERRO && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{typeof pedidoSelecionado.ERRO === 'string' ? pedidoSelecionado.ERRO : JSON.stringify(pedidoSelecionado.ERRO)}</div>}
              <div><p className="text-sm font-medium mb-2">Dados do Pedido:</p><pre className="p-4 bg-slate-100 rounded-lg text-xs overflow-auto max-h-96 font-mono">{JSON.stringify(pedidoSelecionado.CORPO_JSON, null, 2)}</pre></div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <PedidoVendaRapido
        isOpen={showNovoPedidoModal}
        onClose={() => { setShowNovoPedidoModal(false); setPedidoDuplicar(null); carregarPedidos(); }}
        pedidoBase={pedidoDuplicar}
      />
    </div>
  )
}
