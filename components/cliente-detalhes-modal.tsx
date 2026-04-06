"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, User, Building2, ChevronDown, ChevronUp, Sparkles, BarChart3, TrendingUp, Package, MapPin, Phone, Mail, FileText, Globe, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dynamic from "next/dynamic"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-muted rounded-md flex items-center justify-center">Carregando mapa...</div>
})

interface ClienteDetalhesModalProps {
  cliente: any
  isOpen: boolean
  onClose: () => void
}

interface AnaliseGiro {
  totalQuantidade: number
  totalValor: number
  totalNotas: number
  ticketMedio: number
  mediaQtdDiaria: number
  periodo: string
  graficoBarras: { data: string; quantidade: number; valor: number }[]
  tabelaProdutos: { produto: string; quantidade: number; valor: number }[]
}

export function ClienteDetalhesModal({ cliente, isOpen, onClose }: ClienteDetalhesModalProps) {
  const [loadingAnalise, setLoadingAnalise] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(window.navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  const [analiseGiro, setAnaliseGiro] = useState<AnaliseGiro | null>(null)

  useEffect(() => {
    if (isOpen && cliente?.CODPARC) {
      setAnaliseGiro(null)
    }
  }, [isOpen, cliente?.CODPARC])

  const carregarAnaliseGiro = async () => {
    if (!cliente?.CODPARC) return

    setLoadingAnalise(true)

    try {
      const response = await fetch('/api/giro-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codParc: cliente.CODPARC, meses: 1 })
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar análise de giro')
      }

      const data = await response.json()

      if (data.analise) {
        setAnaliseGiro(data.analise)
      } else {
        toast.info('Nenhum dado de vendas encontrado para este cliente no último mês')
      }
    } catch (error: any) {
      console.error('Erro ao carregar análise de giro:', error)
      toast.error('Erro ao carregar análise de giro')
    } finally {
      setLoadingAnalise(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatCPFCNPJ = (value: string) => {
    if (!value) return '-'
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return value
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
      '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6'
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  }

  const getInitials = (name: string) => {
    if (!name) return '??'
    const words = name.trim().split(' ')
    return (words[0][0] + (words[words.length - 1]?.[0] || '')).toUpperCase()
  }

  const [localizacao, setLocalizacao] = useState({
    bairro: '-',
    cidade: '-',
    uf: '-',
    regiao: '-'
  })

  useEffect(() => {
    async function carregarLocalizacao() {
      if (!cliente) return

      try {
        const { OfflineDataService } = await import('@/lib/offline-data-service')

        const [cidade, bairro, regiao] = await Promise.all([
          cliente.CODCID ? OfflineDataService.getCidade(Number(cliente.CODCID)) : null,
          cliente.CODBAI ? OfflineDataService.getBairrosByIds([Number(cliente.CODBAI)]) : null,
          cliente.CODREG ? OfflineDataService.getRegioesByIds([Number(cliente.CODREG)]) : null
        ])

        const bData = bairro?.[0]
        const rData = regiao?.[0]

        setLocalizacao({
          bairro: bData?.NOMEBAI || cliente.BAIRRO || '-',
          cidade: cidade?.NOMECID || cliente.CIDADE || '-',
          uf: cidade?.UF || cidade?.UFSIGLA || cliente.UF || '-',
          regiao: rData?.NOMEREG || (cliente.CODREG ? `Região ${cliente.CODREG}` : '-')
        })
      } catch (error) {
        console.error('Erro ao carregar localização do parceiro:', error)
      }
    }

    if (isOpen && cliente) {
      carregarLocalizacao()
    }
  }, [isOpen, cliente])

  if (!cliente) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-full gap-0 flex flex-col w-full h-full md:h-[90vh] md:w-[800px] overflow-hidden p-0 border-none md:border"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F2] bg-white relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#76BA1B]/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-2 relative z-10">
            <Badge className="bg-[#1E5128] text-white">
              {cliente.CODPARC}
            </Badge>
            <Badge className={cliente.ATIVO === 'S' ? "bg-[#76BA1B] text-white" : "bg-slate-200 text-slate-500"}>
              {cliente.ATIVO === 'S' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-slate-50 text-slate-400 relative z-10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Hero Section */}
        <div className="flex items-center gap-4 p-6 border-b border-[#F2F2F2] bg-white">
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0 bg-gradient-to-br from-[#76BA1B] to-[#1E5128]"
          >
            {getInitials(cliente.NOMEPARC || 'Cliente')}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-[#1E5128] truncate">
              {cliente.NOMEPARC}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {formatCPFCNPJ(cliente.CGC_CPF)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="detalhes" className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
          <div className="px-6 py-4 flex flex-shrink-0">
            <TabsList className="flex bg-white border border-[#F2F2F2] rounded-full p-1 shadow-sm mx-auto overflow-x-auto scrollbar-hide">
              <TabsTrigger value="detalhes" className="rounded-full text-xs font-semibold px-4 transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white text-slate-500 data-[state=active]:shadow-md">Detalhes</TabsTrigger>
              <TabsTrigger value="fiscal" className="rounded-full text-xs font-semibold px-4 transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white text-slate-500 data-[state=active]:shadow-md">Fiscal</TabsTrigger>
              <TabsTrigger value="mapa" className="rounded-full text-xs font-semibold px-4 transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white text-slate-500 data-[state=active]:shadow-md">Mapa</TabsTrigger>
              <TabsTrigger value="giro" className="rounded-full text-xs font-semibold px-4 transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-500 data-[state=active]:shadow-md">Giro IA</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-0">
            <TabsContent value="detalhes" className="mt-0 space-y-4 outline-none">
              <Card className="rounded-2xl border-[#F2F2F2] shadow-sm">
                <CardContent className="p-4 md:p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400 font-bold flex items-center gap-1 uppercase">
                        <User className="w-3.5 h-3.5" /> Nome / Razão Social
                      </Label>
                      <p className="text-sm font-bold text-[#1E5128]">{cliente.NOMEPARC}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-400 font-bold flex items-center gap-1 uppercase">
                        <FileText className="w-3.5 h-3.5" /> CPF / CNPJ
                      </Label>
                      <p className="text-sm font-bold text-slate-700">{formatCPFCNPJ(cliente.CGC_CPF)}</p>
                    </div>
                  </div>

                  <div className="border-t border-[#F2F2F2] pt-6">
                    <Label className="text-xs text-[#76BA1B] font-bold mb-4 block uppercase tracking-wide">Endereço</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-1.5 lg:col-span-2">
                        <Label className="text-xs text-slate-400 font-bold uppercase">Logradouro</Label>
                        <p className="text-sm font-bold text-slate-700">{cliente.ENDERECO || cliente.NOMELOG || '-'}{cliente.NROEND ? `, ${cliente.NROEND}` : ''}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400 font-bold uppercase">Bairro</Label>
                        <p className="text-sm font-bold text-slate-700">{localizacao.bairro}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400 font-bold uppercase">Cidade / UF</Label>
                        <p className="text-sm font-bold text-slate-700">{localizacao.cidade}{localizacao.uf !== '-' ? ` / ${localizacao.uf}` : ''}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400 font-bold uppercase">CEP</Label>
                        <p className="text-sm font-bold text-slate-700">{cliente.CEP || '-'}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400 font-bold uppercase">Região</Label>
                        <p className="text-sm font-bold text-slate-700">{localizacao.regiao}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#F2F2F2] pt-6">
                    <Label className="text-xs text-[#76BA1B] font-bold mb-4 block uppercase tracking-wide">Contato</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400 font-bold flex items-center gap-1 uppercase">
                          <Phone className="w-3.5 h-3.5" /> Telefone
                        </Label>
                        <p className="text-sm font-bold text-slate-700">{cliente.TELEFONE || '-'}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400 font-bold flex items-center gap-1 uppercase">
                          <Mail className="w-3.5 h-3.5" /> E-mail
                        </Label>
                        <p className="text-sm font-bold text-slate-700 break-all">{cliente.EMAIL || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fiscal" className="mt-0 outline-none">
              <Card className="rounded-2xl border-[#F2F2F2] shadow-sm">
                <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-bold uppercase">Inscrição Estadual</Label>
                    <p className="text-sm font-bold text-slate-700">{cliente.INSCRICAOESTADUAL || '-'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-bold uppercase">Tabela de Preço</Label>
                    <p className="text-sm font-bold text-slate-700">{cliente.CODTAB || '-'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-bold uppercase">Vendedor</Label>
                    <p className="text-sm font-bold text-slate-700">{cliente.CODVEND || '-'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400 font-bold uppercase">Limite de Crédito</Label>
                    <p className="text-sm font-bold text-[#76BA1B]">{formatCurrency(parseFloat(cliente.LIMCRED || 0))}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mapa" className="mt-0 outline-none">
              <Card className="rounded-2xl border-[#F2F2F2] shadow-sm overflow-hidden p-1">
                <div className="h-[400px] w-full rounded-xl overflow-hidden">
                  <MapComponent
                    latitude={parseFloat(cliente.LATITUDE || "0")}
                    longitude={parseFloat(cliente.LONGITUDE || "0")}
                    partnerName={cliente.NOMEPARC || "Cliente"}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="giro" className="mt-0 outline-none">
              {!isOnline ? (
                <div className="text-center py-12 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <WifiOff className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">IA Indisponível Offline</h3>
                    <p className="text-xs text-amber-700 px-8 mt-1">A Análise de Giro Inteligente requer conexão com a internet para processar os dados históricos.</p>
                  </div>
                </div>
              ) : !analiseGiro && !loadingAnalise && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#F2F2F2] flex flex-col items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E5128]">Análise de Giro Inteligente</h3>
                    <p className="text-xs text-slate-500 font-medium px-8 mt-1">Veja o comportamento de compra deste cliente no último mês.</p>
                  </div>
                  <Button
                    onClick={carregarAnaliseGiro}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md font-bold transition-all"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Gerar Análise
                  </Button>
                </div>
              )}

              {loadingAnalise && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-[#F2F2F2] shadow-sm">
                  <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Analisando histórico de compras...</p>
                </div>
              )}

              {analiseGiro && !loadingAnalise && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Valor Total</p>
                      <p className="text-sm md:text-xl font-bold text-purple-600">{formatCurrency(analiseGiro.totalValor)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Qtd. Itens</p>
                      <p className="text-sm md:text-xl font-bold text-purple-600">{analiseGiro.totalQuantidade}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Notas</p>
                      <p className="text-sm md:text-xl font-bold text-purple-600">{analiseGiro.totalNotas}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Ticket Médio</p>
                      <p className="text-sm md:text-xl font-bold text-purple-600">{formatCurrency(analiseGiro.ticketMedio)}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-sm">
                    <p className="text-xs font-bold text-purple-600 mb-6 flex items-center gap-2 uppercase tracking-wide">
                      <BarChart3 className="w-4 h-4" /> Histórico Diário de Compras
                    </p>
                    <div className="h-48 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analiseGiro.graficoBarras}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis
                            dataKey="data"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            width={40}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `R$${val}`}
                          />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'Valor']}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #f3e8ff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="valor" fill="#9333ea" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <Card className="rounded-2xl border-purple-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-white text-xs font-bold flex items-center gap-2 tracking-wider">
                      <Package className="w-4 h-4" /> TOP 5 PRODUTOS MAIS COMPRADOS
                    </div>
                    <CardContent className="p-0">
                      <div className="divide-y divide-purple-50">
                        {analiseGiro.tabelaProdutos.map((prod, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 hover:bg-purple-50/50 transition-colors">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-bold text-slate-800 truncate">{prod.produto}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{prod.quantidade} unidades</p>
                            </div>
                            <p className="text-sm font-bold text-purple-600 whitespace-nowrap">{formatCurrency(prod.valor)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
