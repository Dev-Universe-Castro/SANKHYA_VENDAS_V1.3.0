
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth-service"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts"

interface DashboardData {
  kpis: {
    totalVendas: number
    totalPedidos: number
    ticketMedio: number
    totalClientes: number
  }
  vendasMensais: Array<{
    data: string
    valor: number
  }>
  topParceiros: Array<{
    nome: string
    valor: number
    pedidos: number
  }>
  atividades: Array<{
    id: number
    tipo: string
    titulo: string
    descricao: string
    dataInicio: string
    status: string
    leadId?: number
    nomeCliente?: string
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function DashboardVendasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push("/")
      return
    }

    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const user = authService.getCurrentUser()
      if (!user) return

      // Buscar dados da API Sankhya (Notas dos últimos 30 dias)
      const dataInicio = new Date()
      dataInicio.setDate(dataInicio.getDate() - 30)
      const dataInicioStr = dataInicio.toISOString().split('T')[0]
      const dataFimStr = new Date().toISOString().split('T')[0]

      const pedidosResponse = await fetch(
        `/api/sankhya/pedidos/listar?userId=${user.id}&dataInicio=${dataInicioStr}&dataFim=${dataFimStr}`
      )
      const pedidos = await pedidosResponse.json()

      // Buscar parceiros do IndexedDB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const parceiros = await OfflineDataService.getParceiros()

      // Buscar produtos do IndexedDB
      const produtos = await OfflineDataService.getProdutos({ ativo: 'S' })

      // Buscar atividades do Oracle
      const atividadesResponse = await fetch('/api/leads/atividades')
      const todasAtividades = await atividadesResponse.json()

      // Filtrar atividades atrasadas e aguardando
      const atividadesPendentes = todasAtividades.filter((a: any) => 
        a.STATUS === 'ATRASADO' || a.STATUS === 'AGUARDANDO'
      ).slice(0, 10)

      // Calcular KPIs
      const totalVendas = pedidos.reduce((sum: number, p: any) => 
        sum + (parseFloat(p.VLRNOTA) || 0), 0
      )
      const totalPedidos = pedidos.length
      const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0
      const clientesUnicos = new Set(pedidos.map((p: any) => p.CODPARC)).size

      // Agrupar vendas por data
      const vendasPorData: { [key: string]: number } = {}
      pedidos.forEach((p: any) => {
        const data = p.DTNEG || ''
        if (data) {
          vendasPorData[data] = (vendasPorData[data] || 0) + parseFloat(p.VLRNOTA || 0)
        }
      })

      const vendasMensais = Object.entries(vendasPorData)
        .map(([data, valor]) => ({ data, valor }))
        .sort((a, b) => a.data.localeCompare(b.data))

      // Top 5 parceiros
      const vendasPorParceiro: { [key: string]: { valor: number, pedidos: number } } = {}
      pedidos.forEach((p: any) => {
        const codParc = p.CODPARC
        if (codParc) {
          if (!vendasPorParceiro[codParc]) {
            vendasPorParceiro[codParc] = { valor: 0, pedidos: 0 }
          }
          vendasPorParceiro[codParc].valor += parseFloat(p.VLRNOTA || 0)
          vendasPorParceiro[codParc].pedidos += 1
        }
      })

      const topParceiros = Object.entries(vendasPorParceiro)
        .map(([codParc, dados]) => {
          const parceiro = parceiros.find((p: any) => p.CODPARC?.toString() === codParc)
          return {
            nome: parceiro?.NOMEPARC || `Cliente ${codParc}`,
            valor: dados.valor,
            pedidos: dados.pedidos
          }
        })
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5)

      setDashboardData({
        kpis: {
          totalVendas,
          totalPedidos,
          ticketMedio,
          totalClientes: clientesUnicos
        },
        vendasMensais,
        topParceiros,
        atividades: atividadesPendentes.map((a: any) => ({
          id: a.CODATIVIDADE,
          tipo: a.TIPO,
          titulo: a.TITULO,
          descricao: a.DESCRICAO,
          dataInicio: a.DATA_INICIO,
          status: a.STATUS,
          leadId: a.CODLEAD,
          nomeCliente: a.NOMECLIENTE
        }))
      })

    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error)
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [dia, mes, ano] = dateStr.split('/')
    return `${dia}/${mes}`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Dashboard de Vendas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Erro ao carregar dados do dashboard</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard de Vendas</h2>
          <p className="text-muted-foreground">
            Análise completa de vendas dos últimos 30 dias
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboardData.kpis.totalVendas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                Total de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.kpis.totalPedidos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pedidos fechados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(dashboardData.kpis.ticketMedio)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Por pedido
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                Clientes Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {dashboardData.kpis.totalClientes}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes únicos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras - Vendas por Dia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Vendas dos Últimos 30 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.vendasMensais}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={formatDate}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="valor" fill="#0088FE" name="Vendas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Top 5 Parceiros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Top 5 Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.topParceiros}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nome, valor, percent }) => 
                        `${nome.substring(0, 15)}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="valor"
                    >
                      {dashboardData.topParceiros.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {dashboardData.topParceiros.map((parceiro, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{parceiro.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(parceiro.valor)}</p>
                      <p className="text-xs text-muted-foreground">{parceiro.pedidos} pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Atividades Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Atividades Pendentes
              <Badge variant="destructive" className="ml-2">
                {dashboardData.atividades.length}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Atividades atrasadas e aguardando ação
            </p>
          </CardHeader>
          <CardContent>
            {dashboardData.atividades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mb-2" />
                <p className="text-muted-foreground">Nenhuma atividade pendente!</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {dashboardData.atividades.map((atividade) => (
                    <Card 
                      key={atividade.id}
                      className={`border-l-4 ${
                        atividade.status === 'ATRASADO' 
                          ? 'border-l-red-500' 
                          : 'border-l-yellow-500'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={atividade.status === 'ATRASADO' ? 'destructive' : 'default'}>
                                {atividade.status}
                              </Badge>
                              <Badge variant="outline">{atividade.tipo}</Badge>
                            </div>
                            <h4 className="font-semibold">{atividade.titulo}</h4>
                            {atividade.descricao && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {atividade.descricao}
                              </p>
                            )}
                          </div>
                          {atividade.leadId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/dashboard/leads?leadId=${atividade.leadId}`)}
                            >
                              Ver Lead
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{atividade.dataInicio}</span>
                          </div>
                          {atividade.nomeCliente && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{atividade.nomeCliente}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
