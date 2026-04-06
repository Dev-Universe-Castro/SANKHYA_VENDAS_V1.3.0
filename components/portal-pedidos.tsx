"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Plus, 
  MoreHorizontal,
  Truck,
  FileText,
  Eye,
  Copy,
  LayoutGrid,
  List,
  Calendar,
  User,
  ExternalLink,
  Scissors,
  Scale,
  XCircle,
  AlertTriangle,
  UserCheck,
  Warehouse,
  Receipt,
  FileCheck
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import PedidoVendaRapido from "./pedido-venda-rapido"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OfflineDataService } from "@/lib/offline-data-service"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PedidoPortal {
  ID: number;
  DATA_CRIACAO: string;
  STATUS: string;
  NUNOTA?: number;
  statusERP?: string;
  percentualFaturado?: number;
  itensResumo?: any[];
  notasFaturamento?: any[];
  ultimaAtualizacao?: string;
  NOME_PARCEIRO_DB?: string;
  CORPO_JSON: any;
  temCorte?: boolean;
  temPesoVariavel?: boolean;
  ORIGEM?: string;
  TENTATIVAS?: number;
  NOME_USUARIO?: string;
}

const getStatusConfig = (status?: string) => {
  switch (status) {
    case 'AGUARDANDO_APROVACAO': return { label: 'Aprovação', icon: Clock, color: 'bg-orange-100 text-orange-700 border-orange-200' };
    case 'INTEGRADO': return { label: 'Integrado', icon: FileCheck, color: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'MONTANDO_CARGA': return { label: 'Em Carga', icon: Package, color: 'bg-purple-100 text-purple-700 border-purple-200' };
    case 'EM_FATURAMENTO': return { label: 'Faturando', icon: Truck, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    case 'FATURADO': return { label: 'Faturado', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-200' };
    case 'ERRO':
    case 'ERRO_INTEGRACAO': return { label: 'Cancelado', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200' };
    default: return { label: 'Sincronizando', icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
};

const OrderProgressStepper = ({ pedido, className, isSyncing }: { pedido: PedidoPortal; className?: string; isSyncing?: boolean }) => {
  const steps = [
    { id: 'apr', label: 'Aprov.', icon: UserCheck },
    { id: 'int', label: 'Integ.', icon: Warehouse },
    { id: 'car', label: 'Carga', icon: Truck },
    { id: 'fat', label: 'Fatur.', icon: Receipt },
    { id: 'ok', label: 'Fim', icon: CheckCircle2 }
  ];

  let currentPos = -1;
  const s = pedido.statusERP;
  const ps = pedido.STATUS;

  if (s === 'FATURADO') currentPos = 4;
  else if (s === 'EM_FATURAMENTO') currentPos = 3;
  else if (s === 'MONTANDO_CARGA') currentPos = 2;
  else if (s === 'INTEGRADO') currentPos = 1;
  else if (s) currentPos = 0;
  else currentPos = -1;
  
  const isAprovPendente = ps === 'PENDENTE';
  const isErro = ps === 'ERRO' || s === 'ERRO_INTEGRACAO';

  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      {steps.map((step, idx) => {
        const isPast = currentPos > idx;
        const isCurrent = currentPos === idx;
        
        let bgColor = "bg-slate-100";
        let iconColor = "text-slate-300";
        let ringColor = "";

        if (isSyncing) {
           bgColor = "bg-slate-100 text-slate-300";
           iconColor = "text-slate-300";
           ringColor = "";
        } else if (isErro && (idx === 1 || isCurrent)) {
           bgColor = "bg-red-50";
           iconColor = "text-red-500";
           ringColor = "ring-1 ring-red-200";
        } else if (isAprovPendente && idx === 0) {
           bgColor = "bg-amber-50";
           iconColor = "text-amber-500";
           ringColor = "ring-1 ring-amber-200";
        } else if (isPast || (currentPos === 4 && idx === 4)) {
           bgColor = "bg-[#76BA1B]";
           iconColor = "text-white";
        } else if (isCurrent) {
           bgColor = "bg-blue-500";
           iconColor = "text-white shadow-sm shadow-blue-200";
           ringColor = "ring-2 ring-blue-100 ring-offset-1";
        }

        return (
          <div key={step.id} className={`flex items-center ${idx < steps.length - 1 ? 'flex-1' : ''}`}>
            <div 
              className={`w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${bgColor} ${ringColor}`}
              title={step.label}
            >
              {isErro && (idx === 1 || isCurrent) ? (
                <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : isAprovPendente && idx === 0 ? (
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <step.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${iconColor}`} />
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-[2px] transition-colors duration-700 ${(isPast && !isSyncing) ? 'bg-[#76BA1B]' : 'bg-slate-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function PortalPedidos() {
  const [pedidos, setPedidos] = useState<PedidoPortal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const limit = 10
  const [loadingStatus, setLoadingStatus] = useState<Record<number, boolean>>({})
  const [selectedPedido, setSelectedPedido] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showNovoPedidoModal, setShowNovoPedidoModal] = useState(false)
  const [pedidoDuplicar, setPedidoDuplicar] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const handler = setTimeout(() => {
      carregarPedidos(page)
    }, page === 1 ? 300 : 0)

    return () => clearTimeout(handler)
  }, [page, searchTerm])

  const carregarPedidos = async (targetPage: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString(),
      })
      if (searchTerm) params.append('parceiro', searchTerm)

      const response = await fetch(`/api/pedidos-fdv?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`)
      }

      const result = await response.json()
      const data = Array.isArray(result.data) ? result.data : [];

      const { db } = await import('@/lib/client-db')
      const pedidosComNome = await Promise.all(data.map(async (p: PedidoPortal) => {
        const dados = typeof p.CORPO_JSON === 'string' ? JSON.parse(p.CORPO_JSON) : p.CORPO_JSON;
        let nomeExistente = dados?.cabecalho?.RAZAOSOCIAL || dados?.cabecalho?.NOMEPARC || dados?.RAZAO_SOCIAL || dados?.NOMEPARC || dados?.RAZAO || p.NOME_PARCEIRO_DB;
        const codParc = dados?.cabecalho?.CODPARC || dados?.CODPARC;

        if (codParc) {
          try {
            let parceiro = await db.parceiros.get(String(codParc));
            if (parceiro) {
              return { ...p, NOME_PARCEIRO_DB: parceiro.RAZAOSOCIAL || parceiro.NOMEPARC };
            }
          } catch (e) {}
        }
        return { ...p, NOME_PARCEIRO_DB: nomeExistente };
      }));

      setPedidos(pedidosComNome)
      setTotalPages(result.totalPages || 1)
      setTotalItems(result.total || 0)

      if (pedidosComNome.length > 0) {
        setTimeout(() => sincronizarPaginaAtual(pedidosComNome), 500);
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar pedidos:", error)
      toast.error("Não foi possível carregar os pedidos")
      setPedidos([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  };

  const sincronizarPaginaAtual = async (pedidosData: PedidoPortal[]) => {
    for (const pedido of pedidosData) {
      if ((pedido.NUNOTA && pedido.statusERP !== 'FATURADO') || !pedido.statusERP) {
        await atualizarStatusERP(pedido.ID, false);
      }
    }
  };

  const duplicarPedido = (pedido: PedidoPortal) => {
    if (pedido.CORPO_JSON) {
      const corpo = typeof pedido.CORPO_JSON === 'string' ? JSON.parse(pedido.CORPO_JSON) : pedido.CORPO_JSON
      setPedidoDuplicar(corpo)
      setShowNovoPedidoModal(true)
    } else {
      toast.error("Não foi possível duplicar o pedido: dados não encontrados")
    }
  };

  const exportarPedidoPDF = (pedido: PedidoPortal) => {
    try {
      const doc = new jsPDF()
      const dados = typeof pedido.CORPO_JSON === 'string' ? JSON.parse(pedido.CORPO_JSON) : pedido.CORPO_JSON
      const cabecalho = dados.cabecalho || dados
      const itens = dados.itens || []

      doc.setFontSize(22)
      doc.setFont("helvetica", "bold")
      doc.text("PEDIDO DE VENDA", 105, 20, { align: "center" })

      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      doc.text(`Data: ${format(new Date(pedido.DATA_CRIACAO), "dd/MM/yyyy", { locale: ptBR })}`, 105, 30, { align: "center" })

      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("DADOS DO CLIENTE", 14, 45)
      doc.setFontSize(10); doc.setFont("helvetica", "normal")
      doc.text(`Código: ${cabecalho.CODPARC || '-'}`, 14, 55)
      doc.text(`Tipo: ${cabecalho.TIPO_CLIENTE || cabecalho.TIPOPARC || 'PJ'}`, 120, 55)
      doc.text(`Razão Social: ${cabecalho.RAZAO_SOCIAL || cabecalho.RAZAOSOCIAL || cabecalho.NOMEPARC || '-'}`, 14, 62)
      doc.text(`CPF/CNPJ: ${cabecalho.CPF_CNPJ || cabecalho.CGC_CPF || '-'}`, 14, 69)
      doc.text(`IE/RG: ${cabecalho.IE_RG || cabecalho.IDENTIDADE || '-'}`, 120, 69)

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
        startY: 110,
        head: [['Produto', 'Qtd', 'Vlr. Unit.', 'Desc %', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 81, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
        foot: [[{ content: 'TOTAL DO PEDIDO:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(totalPedido), styles: { fontStyle: 'bold' } }]],
      })

      doc.save(`pedido_${pedido.ID}.pdf`)
      toast.success("PDF gerado com sucesso!")
    } catch (error) {
       toast.error("Erro ao gerar PDF")
    }
  };

  const atualizarStatusERP = async (idPedidoFdv: number, forceRefresh = false) => {
    setLoadingStatus(prev => ({ ...prev, [idPedidoFdv]: true }))

    try {
      const response = await fetch(`/api/pedidos-portal/status?id=${idPedidoFdv}${forceRefresh ? '&forceRefresh=true' : ''}`)
      if (!response.ok) throw new Error()
      const statusData = await response.json()
      
      if (statusData.itensResumo && statusData.itensResumo.length > 0) {
        const corpoItens = pedidos.find(p => p.ID === idPedidoFdv)?.CORPO_JSON?.itens || [];
        for (const item of statusData.itensResumo) {
          if (item.descrProd === 'Produto não identificado') {
             const orig = corpoItens.find((oi: any) => Number(oi.CODPROD || oi.codProd || oi.codigo) === Number(item.codProd));
             if (orig) {
                item.descrProd = orig.DESCRPROD || orig.descrProd || orig.NOMEPROD || orig.DESCRICAO || orig.nome || item.descrProd;
             }
          }
          if (item.descrProd === 'Produto não identificado') {
            try {
              const resNum = await OfflineDataService.getProdutos({ codProd: Number(item.codProd) });
              const resStr = resNum.length === 0 ? await OfflineDataService.getProdutos({ codProd: String(item.codProd) }) : resNum;
              if (resStr && resStr.length > 0) {
                item.descrProd = resStr[0].DESCRPROD || resStr[0].NOMEPROD || item.descrProd;
              }
            } catch (err) {}
          }
        }
      }
      
      setPedidos(prev => prev.map(p => 
        p.ID === idPedidoFdv ? { 
          ...p, 
          statusERP: statusData.status, 
          percentualFaturado: statusData.percentualFaturado,
          itensResumo: statusData.itensResumo,
          notasFaturamento: statusData.notasFaturamento,
          temPesoVariavel: statusData.temPesoVariavel,
          temCorte: statusData.temCorte,
          ultimaAtualizacao: statusData.ultimaAtualizacao
        } : p
      ))
    } catch (error) {
    } finally {
      setLoadingStatus(prev => ({ ...prev, [idPedidoFdv]: false }))
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Buscar pedido ou cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 w-full md:w-64 rounded-full border-gray-200 bg-white"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => carregarPedidos(page)} disabled={loading} className="rounded-full h-11 w-11 bg-white border-gray-200">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <div className="flex bg-white border border-gray-200 rounded-full p-1 h-11">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className={`rounded-full h-full w-9 ${viewMode === 'grid' ? 'bg-slate-100 text-[#1E5128]' : 'text-gray-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="icon" 
              onClick={() => setViewMode('list')}
              className={`rounded-full h-full w-9 ${viewMode === 'list' ? 'bg-slate-100 text-[#1E5128]' : 'text-gray-400'}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowNovoPedidoModal(true)} 
          className="w-full md:w-auto bg-[#76BA1B] hover:bg-[#1E5128] text-white h-11 font-bold rounded-full shadow-md shadow-[#76BA1B]/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse border-slate-100 rounded-2xl h-48 bg-slate-50/50" />
            ))}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Nenhum pedido encontrado</h3>
            <p className="text-xs text-gray-500 max-w-[200px] mt-1">Tente ajustar seus filtros ou buscar por outro termo.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 items-start">
            {pedidos.map((pedido: any) => {
              const statusERP = pedido.statusERP || (pedido.STATUS === 'PENDENTE' ? 'AGUARDANDO_APROVACAO' : pedido.STATUS);
              const config = getStatusConfig(statusERP);
              const nomeCliente = (() => {
                if (pedido.NOME_PARCEIRO_DB) return pedido.NOME_PARCEIRO_DB;
                const dados = typeof pedido.CORPO_JSON === 'string' ? JSON.parse(pedido.CORPO_JSON) : pedido.CORPO_JSON;
                const nome = dados?.RAZAO_SOCIAL || dados?.RAZAOSOCIAL || dados?.cabecalho?.RAZAOSOCIAL || dados?.cabecalho?.NOMEPARC || dados?.cliente?.nome || dados?.parceiro?.nome || dados?.nomeCliente;
                return nome || 'Cliente não identificado';
              })();

              return (
                <Card key={pedido.ID} className="group hover:shadow transition-all duration-300 border-slate-100 shadow-sm overflow-hidden rounded-[0.75rem] bg-white flex flex-col">
                  {/* Header compactado */}
                  <div className="px-3 py-1.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 h-5.5">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{pedido.ID}</span>
                      <Badge className={`${config.color} border-none font-bold text-[10px] h-4.5 px-2 rounded-full`}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-medium text-slate-400">
                         {format(new Date(pedido.DATA_CRIACAO), "dd/MM/yy HH:mm")}
                       </span>
                       {pedido.NUNOTA && (
                         <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                           Nº {pedido.NUNOTA}
                         </span>
                       )}
                    </div>
                  </div>

                  {/* Conteúdo Principal */}
                  <div className="px-3 py-1.5 flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-4">
                       <h3 className="text-[14px] font-black text-[#1E5128] leading-tight line-clamp-1 flex-1">
                         {nomeCliente}
                       </h3>
                       <div className="flex items-center gap-2 min-w-[30px] justify-end pb-0.5">
                          {pedido.temCorte && <Scissors className="w-3.5 h-3.5 text-red-500" />}
                          {pedido.temPesoVariavel && <Scale className="w-3.5 h-3.5 text-sky-500" />}
                          <span className="text-[10px] font-bold text-slate-300 uppercase">
                            {pedido.NOME_USUARIO?.split(' ')[0] || '-'}
                          </span>
                       </div>
                    </div>

                    <div className="space-y-1">
                       <div className="flex items-center gap-3">
                         <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#76BA1B] rounded-full transition-all duration-1000 ease-out" style={{ width: `${pedido.percentualFaturado || 0}%` }} />
                         </div>
                         <span className="text-[11px] font-black text-[#76BA1B] min-w-[28px] text-right">{pedido.percentualFaturado || 0}%</span>
                       </div>
                       
                       <div className="py-0">
                         <OrderProgressStepper pedido={pedido} isSyncing={loadingStatus[pedido.ID]} />
                       </div>
                    </div>
                  </div>

                  {/* Footer sem fundo ou borda */}
                  <div className="px-3 py-1 pb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedPedido(pedido); setShowDetailsModal(true); }} className="h-6.5 w-6.5 p-0 text-[#76BA1B] hover:bg-[#76BA1B]/10 rounded-full" title="Detalhes">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => duplicarPedido(pedido)} className="h-6.5 w-6.5 p-0 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all" title="Duplicar">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => exportarPedidoPDF(pedido)} className="h-6.5 w-6.5 p-0 text-blue-500 hover:bg-white rounded-full transition-all" title="Gerar PDF">
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => atualizarStatusERP(pedido.ID, true)}
                      disabled={loadingStatus[pedido.ID]}
                      className={`h-6.5 px-2 gap-1 rounded-full text-[9px] font-bold transition-all shadow-sm ${
                        loadingStatus[pedido.ID] ? 'bg-slate-100 text-slate-400' : 'bg-white hover:bg-slate-50 border border-slate-200 text-[#76BA1B]'
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingStatus[pedido.ID] ? 'animate-spin' : ''}`} />
                      {loadingStatus[pedido.ID] ? '...' : 'Sinc.'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="w-[80px] text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Pedido</TableHead>
                    <TableHead className="w-[110px] text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Data</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Cliente</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Vendedor</TableHead>
                    <TableHead className="w-[100px] text-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Indicadores</TableHead>
                    <TableHead className="w-[120px] text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Faturamento</TableHead>
                    <TableHead className="w-[140px] text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Status</TableHead>
                    <TableHead className="w-[180px] text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((pedido: any) => {
                    const statusERP = pedido.statusERP || (pedido.STATUS === 'PENDENTE' ? 'AGUARDANDO_APROVACAO' : pedido.STATUS);
                    const config = getStatusConfig(statusERP);
                    const nomeCliente = (() => {
                      if (pedido.NOME_PARCEIRO_DB) return pedido.NOME_PARCEIRO_DB;
                      const dados = typeof pedido.CORPO_JSON === 'string' ? JSON.parse(pedido.CORPO_JSON) : pedido.CORPO_JSON;
                      const nome = dados?.RAZAO_SOCIAL || dados?.RAZAOSOCIAL || dados?.cabecalho?.RAZAOSOCIAL || dados?.cabecalho?.NOMEPARC || dados?.cliente?.nome || dados?.parceiro?.nome || dados?.nomeCliente;
                      return nome || 'Cliente não identificado';
                    })();

                    return (
                      <TableRow key={pedido.ID} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800">#{pedido.ID}</span>
                            {pedido.NUNOTA && <span className="text-[9px] font-mono text-slate-400 leading-none mt-0.5">Nº{pedido.NUNOTA}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                            {format(new Date(pedido.DATA_CRIACAO), "dd/MM/yy HH:mm")}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm font-bold text-[#1E5128] truncate max-w-[200px] block">
                            {nomeCliente}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-xs text-slate-500 font-medium">
                            {pedido.NOME_USUARIO?.split(' ')[0] || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {pedido.temCorte && <Scissors className="w-3.5 h-3.5 text-red-500" />}
                            {pedido.temPesoVariavel && <Scale className="w-3.5 h-3.5 text-sky-500" />}
                            {!pedido.temCorte && !pedido.temPesoVariavel && (pedido.statusERP === 'FATURADO' || pedido.percentualFaturado === 100) && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            )}
                            {!pedido.temCorte && !pedido.temPesoVariavel && statusERP !== 'FATURADO' && pedido.percentualFaturado !== 100 && (
                              <div className="w-3.5 h-3.5 border-2 border-slate-100 rounded-full" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#76BA1B] transition-all duration-1000" style={{ width: `${pedido.percentualFaturado || 0}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-[#76BA1B]">{pedido.percentualFaturado || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge className={`${config.color} border-none font-bold text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap`}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedPedido(pedido); setShowDetailsModal(true); }} className="h-8 w-8 text-[#76BA1B] hover:bg-[#76BA1B]/10 rounded-full">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => duplicarPedido(pedido)} className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => exportarPedidoPDF(pedido)} className="h-8 w-8 text-blue-500 hover:text-blue-600 rounded-full">
                              <FileText className="w-4 h-4" />
                            </Button>
                            <div className="ml-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => atualizarStatusERP(pedido.ID, true)}
                                disabled={loadingStatus[pedido.ID]}
                                className={`h-8 px-3 gap-1.5 rounded-full text-[10px] font-bold transition-all ${
                                  loadingStatus[pedido.ID] ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white hover:bg-slate-50 border-slate-200 text-[#76BA1B]'
                                }`}
                              >
                                <RefreshCw className={`w-3 h-3 ${loadingStatus[pedido.ID] ? 'animate-spin' : ''}`} />
                                {loadingStatus[pedido.ID] ? '...' : 'Sinc.'}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6 border-t border-slate-50 mb-20 sm:mb-0">
        <p className="text-xs text-slate-400 font-medium hidden sm:block">
          Mostrando {pedidos.length} de {totalItems} pedidos
        </p>
        <div className="flex items-center justify-center gap-2 w-full sm:w-auto pr-0 sm:pr-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="rounded-xl border-slate-200 h-10 px-4"
          >
            Anterior
          </Button>
          <div className="text-xs font-bold text-slate-600 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 min-w-[100px] text-center">
            Pág. {page} de {totalPages || 1}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="rounded-xl border-slate-200 h-10 px-4"
          >
            Próximo
          </Button>
        </div>
      </div>

      <PedidoVendaRapido
        isOpen={showNovoPedidoModal}
        onClose={() => { 
          setShowNovoPedidoModal(false); 
          setPedidoDuplicar(null); 
          carregarPedidos(1); 
        }}
        pedidoBase={pedidoDuplicar}
      />

      {selectedPedido && (() => {
        const pDet = pedidos.find(p => p.ID === selectedPedido.ID) || selectedPedido;
        const confD = getStatusConfig(pDet.statusERP);
        
        return (
          <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl p-0">
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Conferência do Pedido #{pDet.ID}</h2>
                    <p className="text-gray-500 font-medium">Visualização detalhada do faturamento no ERP.</p>
                  </div>
                  <div className="flex gap-2">
                     <Badge className={`${confD.color} border-none font-bold px-4 py-1.5 rounded-full text-sm`}>
                        {pDet.statusERP === 'FATURADO' && !pDet.temCorte && !pDet.temPesoVariavel ? 'Faturado Total' : confD.label}
                     </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">NUNOTA Pedido</span>
                     <span className="text-xl font-bold text-slate-800">{pDet.NUNOTA || 'N/A'}</span>
                  </div>
                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                     <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Status Logístico</span>
                     <span className="text-xl font-bold text-blue-800">{pDet.statusERP === 'MONTANDO_CARGA' ? 'Em Carga' : 'Liberado'}</span>
                  </div>
                  <div className="bg-[#76BA1B]/5 p-5 rounded-2xl border border-[#76BA1B]/10">
                     <span className="text-[10px] font-black text-[#76BA1B] uppercase tracking-widest block mb-1">Progresso Total</span>
                     <span className="text-2xl font-black text-[#1E5128]">{pDet.percentualFaturado || 0}%</span>
                  </div>
                </div>

                {pDet.temCorte && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
                    <div className="bg-red-100 p-3 rounded-xl">
                      <Scissors className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="text-red-900 font-bold text-lg">Pedido Finalizado com Cortes</h4>
                      <p className="text-red-700 text-sm">Este pedido foi marcado como faturado no ERP, mas alguns itens não foram atendidos integralmente.</p>
                    </div>
                  </div>
                )}

                {pDet.temPesoVariavel && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <Scale className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-blue-900 font-bold text-lg">Pedido Finalizado (Pesos Variáveis)</h4>
                      <p className="text-blue-700 text-sm">Este pedido possui produtos de peso variável.</p>
                    </div>
                  </div>
                )}

                {pDet.notasFaturamento && pDet.notasFaturamento.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <FileCheck className="w-4 h-4" /> Notas Fiscais
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {pDet.notasFaturamento.map((nota: any) => (
                        <div key={nota.nunota} className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm flex flex-col gap-1 items-start">
                           <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">NF: {nota.numnota}</span>
                           <span className="font-bold text-slate-800 text-lg">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.vlrnota)}
                           </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-4 h-4" /> Depara de Itens
                  </h3>
                  
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Produto</th>
                          <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Pedido</th>
                          <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Faturado</th>
                          <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pDet.itensResumo && pDet.itensResumo.length > 0 ? (
                          pDet.itensResumo.map((item: any) => {
                            const sld = item.qtdPedida - item.qtdFaturada;
                            const isTot = item.qtdFaturada >= (item.qtdPedida * 0.999);
                            return (
                              <tr key={item.codProd} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{item.descrProd}</span>
                                    <span className="text-[10px] font-bold text-slate-400">Código: {item.codProd}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-center font-bold text-slate-700">{item.qtdPedida} <span className="text-[10px] text-gray-400 font-medium">{item.unidade}</span></td>
                                <td className="px-5 py-4 text-center">
                                  <Badge className={`${isTot ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} border-none font-bold px-2 rounded-lg`}>
                                    {item.qtdFaturada} <span className="text-[9px] opacity-70 ml-1">{item.unidade}</span>
                                  </Badge>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className={`font-black tracking-tighter ${sld > 0 ? (item.isPesoVariavel || pDet.temPesoVariavel ? 'text-blue-500' : 'text-red-500') : 'text-slate-300'}`}>
                                    {sld > 0 ? (item.registrarPeso ? `-${sld} (${item.registrarPeso})` : (item.isPesoVariavel || pDet.temPesoVariavel ? `-${sld} (P.V)` : `-${sld}`)) : 'OK'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm font-medium">Buscando detalhes...</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="w-full h-14 rounded-2xl font-bold border-slate-200 text-slate-500 hover:bg-slate-50">
                    Fechar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
