"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DollarSign,
  ShoppingCart,
  Users,
  BarChart3,
  Sparkles,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Package,
  Loader2,
  FileSpreadsheet,
  Zap,
  User
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { DashboardAnaliseClienteModal } from "@/components/dashboard-analise-cliente-modal"
import { DashboardAnaliseProdutoModal } from "@/components/dashboard-analise-produto-modal"

interface DashboardData {
  kpis: {
    faturamento: number
    ticketMedio: number
    totalPedidos: number
    totalClientesUnicos: number
  }
  chartFaturamento: { data: string; valor: number }[]
  topClientes: { nome: string; valor: number; qtd: number }[]
  topProdutos: { nome: string; valor: number; qtd: number }[]
}

export default function DashboardHome() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const [diasFiltro, setDiasFiltro] = useState<string>('7')
  const [showAnaliseCliente, setShowAnaliseCliente] = useState(false)
  const [showAnaliseProduto, setShowAnaliseProduto] = useState(false)

  const carregarDashboard = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard?dias=${diasFiltro}`)
      if (!res.ok) throw new Error('Falha ao carregar indicadores')
      const data = await res.json()
      setDashboardData(data)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar o dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const user = authService.getCurrentUser()
    if (user) {
      setCurrentUser(user)
    }

    setIsOnline(navigator.onLine)
    setIsMobile(window.innerWidth < 768)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleResize = () => setIsMobile(window.innerWidth < 768)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('resize', handleResize)

    // Iniciar carga
    carregarDashboard()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('resize', handleResize)
    }
  }, [diasFiltro])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Desktop */}
      <div className="hidden md:flex p-6 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Visão Geral</h1>
          <div className="flex items-center mt-2 space-x-2 text-[#1E5128]/70">
            <span>Acompanhe seus indicadores de</span>
            <Select value={diasFiltro} onValueChange={(val) => setDiasFiltro(val)}>
              <SelectTrigger className="w-auto h-8 border-[#F2F2F2] bg-white text-xs font-medium rounded-full hover:bg-gray-50 transition-colors focus:ring-[#76BA1B]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#F2F2F2]">
                <SelectItem value="7" className="rounded-lg text-sm cursor-pointer hover:bg-[#76BA1B]/10 hover:text-[#1E5128]">Últimos 7 dias</SelectItem>
                <SelectItem value="15" className="rounded-lg text-sm cursor-pointer hover:bg-[#76BA1B]/10 hover:text-[#1E5128]">Últimos 15 dias</SelectItem>
                <SelectItem value="30" className="rounded-lg text-sm cursor-pointer hover:bg-[#76BA1B]/10 hover:text-[#1E5128]">Últimos 30 dias</SelectItem>
                <SelectItem value="60" className="rounded-lg text-sm cursor-pointer hover:bg-[#76BA1B]/10 hover:text-[#1E5128]">Últimos 60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={() => isOnline && router.push('/dashboard/analise')}
          disabled={!isOnline}
          className="bg-[#76BA1B] hover:bg-[#65A017] shadow-sm text-white rounded-full transition-all"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Análise de Inteligência Artificial
        </Button>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1E5128]">Visão Geral</h1>
          <Button
            onClick={() => isOnline && router.push('/dashboard/analise')}
            disabled={!isOnline}
            size="sm"
            className="bg-[#76BA1B] hover:bg-[#65A017] shadow-sm text-white rounded-full px-3 h-8"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Análise IA
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-sm text-[#1E5128]/70">
          <span>Período:</span>
          <Select value={diasFiltro} onValueChange={(val) => setDiasFiltro(val)}>
            <SelectTrigger className="flex-1 h-8 border-[#F2F2F2] bg-white text-xs font-medium rounded-full focus:ring-[#76BA1B]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#F2F2F2]">
              <SelectItem value="7" className="rounded-lg text-sm cursor-pointer hover:bg-[#76BA1B]/10">7 dias</SelectItem>
              <SelectItem value="15" className="rounded-lg text-sm cursor-pointer hover:bg-[#76BA1B]/10">15 dias</SelectItem>
              <SelectItem value="30" className="rounded-lg text-sm cursor-pointer hover:bg-[#76BA1B]/10">30 dias</SelectItem>
              <SelectItem value="60" className="rounded-lg text-sm cursor-pointer hover:bg-[#76BA1B]/10">60 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>


      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-24 bg-transparent">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-[#76BA1B]" />
              <Sparkles className="h-5 w-5 text-[#76BA1B] absolute -top-1 -right-1 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-[#1E5128] opacity-80 animate-pulse">
              Carregando indicadores táticos...
            </p>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto w-full space-y-4 md:space-y-6">

            {/* Botões de Acesso Rápido para Análises Específicas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowAnaliseCliente(true)}
                disabled={!isOnline}
                className="h-14 bg-white hover:bg-[#76BA1B]/5 text-[#1E5128] border border-[#F2F2F2] hover:border-[#76BA1B]/30 font-bold rounded-2xl shadow-sm transition-all flex items-center justify-start px-6 gap-4 group"
              >
                <div className="w-8 h-8 rounded-full bg-[#76BA1B]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="w-4 h-4 text-[#76BA1B]" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm">Análise de Giro de <span className="text-[#76BA1B]">Cliente</span></p>
                  <p className="text-[10px] text-[#121212]/60 font-medium mt-0.5">Ver histórico tático do parceiro</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#121212]/30 group-hover:text-[#76BA1B]" />
              </Button>

              <Button
                onClick={() => setShowAnaliseProduto(true)}
                disabled={!isOnline}
                className="h-14 bg-white hover:bg-[#76BA1B]/5 text-[#1E5128] border border-[#F2F2F2] hover:border-[#76BA1B]/30 font-bold rounded-2xl shadow-sm transition-all flex items-center justify-start px-6 gap-4 group"
              >
                <div className="w-8 h-8 rounded-full bg-[#76BA1B]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-4 h-4 text-[#76BA1B]" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm">Análise de Giro de <span className="text-[#76BA1B]">Produto</span></p>
                  <p className="text-[10px] text-[#121212]/60 font-medium mt-0.5">Ver histórico tático do item</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#121212]/30 group-hover:text-[#76BA1B]" />
              </Button>
            </div>

            {/* Top KPIs Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="p-4 md:p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-xs md:text-sm font-medium text-[#121212]/60">Faturamento</p>
                      <p className="text-lg md:text-2xl font-bold text-[#1E5128]">
                        {formatCurrency(dashboardData?.kpis.faturamento || 0)}
                      </p>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#76BA1B]/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-[#76BA1B]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="p-4 md:p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-xs md:text-sm font-medium text-[#121212]/60">Ticket Médio</p>
                      <p className="text-lg md:text-2xl font-bold text-[#1E5128]">
                        {formatCurrency(dashboardData?.kpis.ticketMedio || 0)}
                      </p>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#76BA1B]/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#76BA1B]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="p-4 md:p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-xs md:text-sm font-medium text-[#121212]/60">Pedidos</p>
                      <p className="text-lg md:text-2xl font-bold text-[#1E5128]">
                        {dashboardData?.kpis.totalPedidos || 0}
                      </p>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#76BA1B]/10 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-[#76BA1B]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="p-4 md:p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-xs md:text-sm font-medium text-[#121212]/60">Clientes Atendidos</p>
                      <p className="text-lg md:text-2xl font-bold text-[#1E5128]">
                        {dashboardData?.kpis.totalClientesUnicos || 0}
                      </p>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#76BA1B]/10 flex items-center justify-center">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-[#76BA1B]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

              {/* Chart Section */}
              <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-[#1E5128]">Evolução de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px] w-full mt-4">
                    {dashboardData?.chartFaturamento && dashboardData.chartFaturamento.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.chartFaturamento} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#76BA1B" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#76BA1B" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis
                            dataKey="data"
                            tickFormatter={(val) => {
                              const d = new Date(val);
                              return `${String(d.getDate() + 1).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                            }}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                            width={60}
                          />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                            labelFormatter={(label) => {
                              const d = new Date(label as string);
                              return format(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), "dd 'de' MMMM");
                            }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area type="monotone" dataKey="valor" stroke="#76BA1B" strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[#121212]/40 text-sm">
                        Nenhum dado de venda no período
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Hub Duplo de IA (PredictChat & Análise) */}
              <div className="lg:col-span-1 flex flex-col gap-4 md:gap-6">

                {/* PredictChat Compacto */}
                <Card className="border-none shadow-md rounded-2xl overflow-hidden relative bg-gradient-to-br from-[#1E5128] to-[#121212] flex flex-col justify-between flex-1">
                  <CardContent className="p-5 md:p-6 relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/5">
                        <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <div className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-white/10 backdrop-blur-md text-[9px] md:text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">
                        IA Preditiva
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-black text-white leading-tight">IA Assistente</h3>
                      <p className="text-xs md:text-sm text-white/80 mt-1 md:mt-2 leading-relaxed">
                        Tire dúvidas sobre leads, pedidos e métricas do mês perguntando em linguagem natural.
                      </p>
                    </div>

                    <Button
                      onClick={() => isOnline && router.push('/dashboard/chat')}
                      disabled={!isOnline}
                      variant="outline"
                      className="w-full mt-4 md:mt-6 bg-transparent hover:bg-white/10 border-white/30 text-white hover:text-white font-bold h-9 md:h-10 text-xs md:text-sm"
                    >
                      Acessar Assistente
                      <ChevronRight className="w-4 h-4 ml-1 md:ml-2" />
                    </Button>
                  </CardContent>
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 md:w-48 md:h-48 bg-[#76BA1B]/20 rounded-full blur-3xl pointer-events-none" />
                </Card>

                {/* Análise de Desempenho AI */}
                <Card className="border-none shadow-md rounded-2xl overflow-hidden relative bg-gradient-to-br from-[#1E5128] to-[#121212] flex flex-col justify-between flex-1">
                  <CardContent className="p-5 md:p-6 relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/5">
                        <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <div className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-white/10 backdrop-blur-md text-[9px] md:text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">
                        INSIGHTS
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-black text-white leading-tight">IA Análise de Dados</h3>
                      <p className="text-xs md:text-sm text-white/80 mt-1 md:mt-2 leading-relaxed">
                        Gere relatórios executivos com padrões ocultos e detecte oportunidades nas suas vendas.
                      </p>
                    </div>

                    <Button
                      onClick={() => isOnline && router.push('/dashboard/analise')}
                      disabled={!isOnline}
                      variant="outline"
                      className="w-full mt-4 md:mt-6 bg-transparent hover:bg-white/10 border-white/30 text-white hover:text-white font-bold h-9 md:h-10 text-xs md:text-sm"
                    >
                      Gerar Relatório
                      <Sparkles className="w-4 h-4 ml-1 md:ml-2" />
                    </Button>
                  </CardContent>
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 md:w-48 md:h-48 bg-[#76BA1B]/20 rounded-full blur-3xl pointer-events-none" />
                </Card>

              </div>


              {/* Bottom Section - Top Produtos & Top Clientes */}
              <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

                {/* Top Produtos */}
                <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-[#1E5128] flex items-center gap-2">
                      <Package className="w-5 h-5 text-[#76BA1B]" />
                      Giro de Produtos (Top Vendas)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 mt-2">
                      {dashboardData?.topProdutos && dashboardData.topProdutos.length > 0 ? (
                        dashboardData.topProdutos.map((prod, i) => (
                          <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#F2F2F2] hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                              <div className="w-8 h-8 rounded-full bg-[#76BA1B]/10 flex items-center justify-center text-xs font-bold text-[#1E5128] flex-shrink-0">
                                #{i + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#121212] truncate" title={prod.nome}>{prod.nome}</p>
                                <p className="text-[11px] font-medium text-[#1E5128] uppercase">Cód: {prod.nome.split(' ')[1] || prod.nome.substring(0, 6)}</p>
                              </div>
                            </div>
                            <div className="text-right whitespace-nowrap">
                              <p className="text-sm font-bold text-[#76BA1B]">{Number.isInteger(prod.qtd) ? prod.qtd : Number(prod.qtd).toFixed(3).replace(/\.?0+$/, '')} und</p>
                              <p className="text-xs text-[#121212]/60">{formatCurrency(prod.valor)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-sm text-[#121212]/40 bg-[#F2F2F2]/50 rounded-xl">
                          Nenhum produto destacado no período
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Clientes */}
                <Card className="border-none shadow-sm rounded-2xl flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-[#1E5128] flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#76BA1B]" />
                      Top Clientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto">
                    <div className="space-y-4 mt-2">
                      {dashboardData?.topClientes && dashboardData.topClientes.length > 0 ? (
                        dashboardData.topClientes.map((cliente, i) => (
                          <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#F2F2F2] hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                              <div className="w-8 h-8 rounded-full bg-[#76BA1B]/10 flex items-center justify-center text-xs font-bold text-[#1E5128] flex-shrink-0">
                                #{i + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#121212] truncate" title={cliente.nome}>{cliente.nome}</p>
                                <p className="text-xs text-[#121212]/60">{cliente.qtd} {cliente.qtd === 1 ? 'pedido' : 'pedidos'}</p>
                              </div>
                            </div>
                            <div className="text-right whitespace-nowrap">
                              <p className="text-sm font-bold text-[#76BA1B]">{formatCurrency(cliente.valor)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-sm text-[#121212]/40">
                          Nenhum cliente no período
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>
          </div>
        )}
      </div>

      {/* Modais de Análise */}
      <DashboardAnaliseClienteModal
        isOpen={showAnaliseCliente}
        onClose={() => setShowAnaliseCliente(false)}
      />
      <DashboardAnaliseProdutoModal
        isOpen={showAnaliseProduto}
        onClose={() => setShowAnaliseProduto(false)}
      />
    </div >
  )
}

