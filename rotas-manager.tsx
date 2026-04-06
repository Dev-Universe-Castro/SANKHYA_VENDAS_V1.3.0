"use client"

import { useState, useEffect, useCallback } from "react"
import { authService } from "@/lib/auth-service"
import "leaflet/dist/leaflet.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Route, MapPin, Clock, Calendar, Users, Plus, Play, Check, X,
  RefreshCw, ChevronRight, Navigation, CheckCircle2, XCircle,
  Edit, Trash2, Timer, DollarSign, Package, Target, WifiOff, Cloud
} from "lucide-react"
import { toast } from "sonner"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import dynamic from 'next/dynamic'
import { RotasSyncService, VisitaPendenteOffline } from "@/lib/rotas-sync"
import { db } from "@/lib/client-db"

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false })

interface Rota {
  CODROTA: number
  ID_EMPRESA: number
  DESCRICAO: string
  CODVEND: number
  NOMEVENDEDOR?: string
  TIPO_RECORRENCIA: string
  DIAS_SEMANA?: string
  INTERVALO_DIAS?: number
  DATA_INICIO?: string
  DATA_FIM?: string
  ATIVO: string
  parceiros?: RotaParceiro[]
}

interface RotaParceiro {
  CODROTAPARC?: number
  CODROTA: number
  CODPARC: number
  NOMEPARC?: string
  ORDEM: number
  LATITUDE?: number
  LONGITUDE?: number
  TEMPO_ESTIMADO?: number
  ENDERECO?: string
  CIDADE?: string
  UF?: string
}

interface Visita {
  CODVISITA: number
  CODROTA?: number
  CODPARC: number
  NOMEPARC?: string
  CODVEND: number
  NOMEVENDEDOR?: string
  DATA_VISITA: string
  HORA_CHECKIN?: string
  HORA_CHECKOUT?: string
  LAT_CHECKIN?: number
  LNG_CHECKIN?: number
  LAT_CHECKOUT?: number
  LNG_CHECKOUT?: number
  STATUS: string
  OBSERVACAO?: string
  PEDIDO_GERADO: string
  NUNOTA?: number
  VLRTOTAL?: number
  duracao?: number
  NOME_ROTA?: string
}

interface Estatisticas {
  totalVisitas: number
  visitasConcluidas: number
  visitasCanceladas: number
  visitasEmAndamento: number
  pedidosGerados: number
  valorTotalPedidos: number
  tempoMedioVisita: number
  taxaConversao: number
  taxaConclusao: number
}

interface Parceiro {
  CODPARC: number
  NOMEPARC: string
  ENDERECO?: string
  CIDADE?: string
  UF?: string
  LATITUDE?: number
  LONGITUDE?: number
}

const diasSemanaLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function RotasManager() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('rotas')
  const [isOnline, setIsOnline] = useState(true)
  const [visitasPendentesCount, setVisitasPendentesCount] = useState(0)
  
  const [rotas, setRotas] = useState<Rota[]>([])
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [parceirosDisponiveis, setParceirosDisponiveis] = useState<Parceiro[]>([])
  
  const [rotaSelecionada, setRotaSelecionada] = useState<Rota | null>(null)
  const [visitaAtiva, setVisitaAtiva] = useState<Visita | null>(null)
  const [visitaAtivaLocal, setVisitaAtivaLocal] = useState<VisitaPendenteOffline | null>(null)
  const [modalNovaRota, setModalNovaRota] = useState(false)
  const [modalCheckin, setModalCheckin] = useState(false)
  const [modalCheckout, setModalCheckout] = useState(false)
  const [parceiroCheckin, setParceiroCheckin] = useState<RotaParceiro | null>(null)
  
  const [novaRotaForm, setNovaRotaForm] = useState({
    descricao: '',
    tipoRecorrencia: 'SEMANAL',
    diasSemana: [] as number[],
    intervaloDias: 7,
    dataInicio: '',
    dataFim: '',
    parceiros: [] as { codParc: number; ordem: number; latitude?: number; longitude?: number }[]
  })
  
  const [checkoutForm, setCheckoutForm] = useState({
    observacao: '',
    pedidoGerado: false,
    nunota: '',
    vlrTotal: ''
  })
  
  const [buscaParceiro, setBuscaParceiro] = useState('')
  
  const [filtroData, setFiltroData] = useState({
    dataInicio: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd')
  })

  const [isMobile, setIsMobile] = useState(false)
  const [localizacaoAtual, setLocalizacaoAtual] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const user = authService.getCurrentUser()
    if (user) {
      setCurrentUser(user)
    }
    setIsMobile(window.innerWidth < 768)
    setIsOnline(navigator.onLine)
    
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    const handleOnline = () => {
      setIsOnline(true)
      RotasSyncService.processarFilaVisitas()
      RotasSyncService.sincronizarRotas()
    }
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocalizacaoAtual({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Erro ao obter localização:', err)
      )
    }
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      carregarDados()
    }
  }, [currentUser])

  const carregarDados = async () => {
    setLoading(true)
    try {
      await Promise.all([
        carregarRotas(),
        carregarVisitas(),
        carregarEstatisticas(),
        carregarParceiros()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarRotas = async () => {
    try {
      if (navigator.onLine) {
        const response = await fetch('/api/rotas')
        if (response.ok) {
          const data = await response.json()
          setRotas(Array.isArray(data) ? data : [])
          await RotasSyncService.sincronizarRotas()
        }
      } else {
        const rotasOffline = await RotasSyncService.getRotasOffline()
        setRotas(rotasOffline as any)
      }
    } catch (error) {
      console.error('Erro ao carregar rotas, tentando offline:', error)
      const rotasOffline = await RotasSyncService.getRotasOffline()
      setRotas(rotasOffline as any)
    }
  }

  const carregarVisitas = async () => {
    try {
      const codVend = currentUser?.CODVEND || currentUser?.codVend
      
      const visitaLocal = await RotasSyncService.getVisitaAtivaLocal(codVend)
      setVisitaAtivaLocal(visitaLocal)
      
      const pendentes = await RotasSyncService.getVisitasPendentes()
      setVisitasPendentesCount(pendentes.length)
      
      if (navigator.onLine) {
        const params = new URLSearchParams({
          dataInicio: filtroData.dataInicio,
          dataFim: filtroData.dataFim
        })
        const response = await fetch(`/api/rotas/visitas?${params}`)
        if (response.ok) {
          const data = await response.json()
          setVisitas(Array.isArray(data) ? data : [])
          
          const ativa = data.find((v: Visita) => v.STATUS === 'CHECKIN')
          setVisitaAtiva(ativa || null)
        }
      } else {
        const visitasOffline = await RotasSyncService.getVisitasOffline()
        setVisitas(visitasOffline as any)
      }
    } catch (error) {
      console.error('Erro ao carregar visitas:', error)
      const visitasOffline = await RotasSyncService.getVisitasOffline()
      setVisitas(visitasOffline as any)
    }
  }

  const carregarEstatisticas = async () => {
    try {
      const params = new URLSearchParams({
        dataInicio: filtroData.dataInicio,
        dataFim: filtroData.dataFim
      })
      const response = await fetch(`/api/rotas/estatisticas?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEstatisticas(data)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const carregarParceiros = async () => {
    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const parceiros = await OfflineDataService.getParceiros()
      setParceirosDisponiveis(parceiros)
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error)
    }
  }

  const obterLocalizacao = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  const criarRota = async () => {
    try {
      const response = await fetch('/api/rotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: novaRotaForm.descricao,
          tipoRecorrencia: novaRotaForm.tipoRecorrencia,
          diasSemana: novaRotaForm.tipoRecorrencia === 'SEMANAL' ? novaRotaForm.diasSemana.join(',') : null,
          intervaloDias: novaRotaForm.tipoRecorrencia === 'INTERVALO' ? novaRotaForm.intervaloDias : null,
          dataInicio: novaRotaForm.dataInicio || null,
          dataFim: novaRotaForm.dataFim || null,
          parceiros: novaRotaForm.parceiros
        })
      })

      if (response.ok) {
        toast.success('Rota criada com sucesso!')
        setModalNovaRota(false)
        setNovaRotaForm({
          descricao: '',
          tipoRecorrencia: 'SEMANAL',
          diasSemana: [],
          intervaloDias: 7,
          dataInicio: '',
          dataFim: '',
          parceiros: []
        })
        carregarRotas()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao criar rota')
      }
    } catch (error) {
      toast.error('Erro ao criar rota')
    }
  }

  const fazerCheckin = async () => {
    if (!parceiroCheckin) return
    
    try {
      let localizacao = { lat: 0, lng: 0 }
      try {
        localizacao = await obterLocalizacao()
      } catch (err) {
        console.warn('Não foi possível obter localização')
      }
      
      const codVend = currentUser?.CODVEND || currentUser?.codVend
      
      const result = await RotasSyncService.fazerCheckinOffline({
        codRota: rotaSelecionada?.CODROTA,
        codParc: parceiroCheckin.CODPARC,
        codVend,
        latitude: localizacao.lat,
        longitude: localizacao.lng
      })

      if (result.success) {
        setModalCheckin(false)
        setParceiroCheckin(null)
        carregarVisitas()
      }
    } catch (error: any) {
      toast.error('Erro ao fazer check-in: ' + error.message)
    }
  }

  const fazerCheckout = async () => {
    if (!visitaAtiva && !visitaAtivaLocal) return
    
    try {
      let localizacao = { lat: 0, lng: 0 }
      try {
        localizacao = await obterLocalizacao()
      } catch (err) {
        console.warn('Não foi possível obter localização')
      }
      
      const codVend = currentUser?.CODVEND || currentUser?.codVend
      
      const result = await RotasSyncService.fazerCheckoutOffline({
        codVisita: visitaAtiva?.CODVISITA,
        localVisitaId: visitaAtivaLocal?.localVisitaId,
        codParc: visitaAtiva?.CODPARC || visitaAtivaLocal?.codParc || 0,
        codVend,
        latitude: localizacao.lat,
        longitude: localizacao.lng,
        observacao: checkoutForm.observacao,
        pedidoGerado: checkoutForm.pedidoGerado,
        nunota: checkoutForm.nunota ? parseInt(checkoutForm.nunota) : undefined,
        vlrTotal: checkoutForm.vlrTotal ? parseFloat(checkoutForm.vlrTotal) : undefined
      })

      if (result.success) {
        setModalCheckout(false)
        setCheckoutForm({ observacao: '', pedidoGerado: false, nunota: '', vlrTotal: '' })
        setVisitaAtiva(null)
        setVisitaAtivaLocal(null)
        carregarVisitas()
        carregarEstatisticas()
      }
    } catch (error: any) {
      toast.error('Erro ao fazer check-out: ' + error.message)
    }
  }

  const sincronizarVisitas = async () => {
    if (!navigator.onLine) {
      toast.error('Sem conexão com a internet')
      return
    }
    await RotasSyncService.processarFilaVisitas()
    carregarVisitas()
    carregarEstatisticas()
  }

  const excluirRota = async (codRota: number) => {
    if (!confirm('Tem certeza que deseja excluir esta rota?')) return
    
    try {
      const response = await fetch(`/api/rotas?codRota=${codRota}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Rota excluída!')
        carregarRotas()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao excluir rota')
      }
    } catch (error) {
      toast.error('Erro ao excluir rota')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECKIN':
        return <Badge className="bg-yellow-500">Em Visita</Badge>
      case 'CONCLUIDA':
        return <Badge className="bg-green-500">Concluída</Badge>
      case 'CANCELADA':
        return <Badge className="bg-red-500">Cancelada</Badge>
      default:
        return <Badge className="bg-gray-500">Pendente</Badge>
    }
  }

  const mapCenter = localizacaoAtual || { lat: -23.5505, lng: -46.6333 }
  const rotaParceirosCoordenadas = rotaSelecionada?.parceiros
    ?.filter(p => p.LATITUDE && p.LONGITUDE)
    ?.map(p => [p.LATITUDE!, p.LONGITUDE!] as [number, number]) || []

  if (loading && rotas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-24">
      {!isOnline && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Modo Offline</span>
              <span className="text-sm">- Dados locais sendo utilizados</span>
            </div>
          </CardContent>
        </Card>
      )}

      {visitasPendentesCount > 0 && isOnline && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Cloud className="h-5 w-5" />
                <span className="font-medium">{visitasPendentesCount} visita(s) pendente(s) de sincronização</span>
              </div>
              <Button onClick={sincronizarVisitas} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="h-4 w-4 mr-1" />
                Sincronizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Route className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            Rotas
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie suas rotas de visitas e acompanhe o progresso
          </p>
        </div>
        <Button onClick={() => setModalNovaRota(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          {isMobile ? '' : 'Nova Rota'}
        </Button>
      </div>

      {(visitaAtiva || visitaAtivaLocal) && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-white animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    Visita em Andamento
                    {visitaAtivaLocal && !visitaAtiva && (
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {visitaAtiva?.NOMEPARC || parceirosDisponiveis.find(p => p.CODPARC === visitaAtivaLocal?.codParc)?.NOMEPARC || `Parceiro ${visitaAtivaLocal?.codParc}`}
                  </p>
                </div>
              </div>
              <Button onClick={() => setModalCheckout(true)} className="bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4 mr-2" />
                Check-out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {estatisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Visitas</span>
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-xl md:text-2xl font-bold">{estatisticas.totalVisitas}</div>
              <div className="text-xs text-green-600">{estatisticas.taxaConclusao}% concluídas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pedidos</span>
                <Package className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-xl md:text-2xl font-bold">{estatisticas.pedidosGerados}</div>
              <div className="text-xs text-blue-600">{estatisticas.taxaConversao}% conversão</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Valor</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-lg md:text-xl font-bold">{formatCurrency(estatisticas.valorTotalPedidos)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tempo Médio</span>
                <Timer className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-xl md:text-2xl font-bold">{estatisticas.tempoMedioVisita} min</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rotas">Minhas Rotas</TabsTrigger>
          <TabsTrigger value="visitas">Visitas</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
        </TabsList>

        <TabsContent value="rotas" className="space-y-4">
          {rotas.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma rota cadastrada</p>
                <Button onClick={() => setModalNovaRota(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Rota
                </Button>
              </CardContent>
            </Card>
          ) : (
            rotas.map(rota => (
              <Card key={rota.CODROTA} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{rota.DESCRICAO}</h3>
                        <Badge variant="outline">
                          {rota.TIPO_RECORRENCIA === 'SEMANAL' ? 'Semanal' : `A cada ${rota.INTERVALO_DIAS} dias`}
                        </Badge>
                      </div>
                      
                      {rota.TIPO_RECORRENCIA === 'SEMANAL' && rota.DIAS_SEMANA && (
                        <div className="flex gap-1 mb-2">
                          {rota.DIAS_SEMANA.split(',').map(d => (
                            <Badge key={d} variant="secondary" className="text-xs">
                              {diasSemanaLabels[parseInt(d)]}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {rota.parceiros?.length || 0} parceiros
                        </span>
                        {rota.NOMEVENDEDOR && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {rota.NOMEVENDEDOR}
                          </span>
                        )}
                      </div>
                      
                      {rota.parceiros && rota.parceiros.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {rota.parceiros.slice(0, 3).map((p, i) => (
                            <div key={p.CODROTAPARC} className="flex items-center gap-2 text-sm">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                                {i + 1}
                              </div>
                              <span className="truncate">{p.NOMEPARC}</span>
                            </div>
                          ))}
                          {rota.parceiros.length > 3 && (
                            <p className="text-xs text-muted-foreground pl-7">
                              +{rota.parceiros.length - 3} parceiros
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRotaSelecionada(rota)
                          setActiveTab('mapa')
                        }}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => excluirRota(rota.CODROTA)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setRotaSelecionada(rota)
                          if (rota.parceiros && rota.parceiros.length > 0) {
                            setParceiroCheckin(rota.parceiros[0])
                            setModalCheckin(true)
                          }
                        }}
                        disabled={!!visitaAtiva}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="visitas" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Input
              type="date"
              value={filtroData.dataInicio}
              onChange={(e) => setFiltroData(prev => ({ ...prev, dataInicio: e.target.value }))}
              className="w-40"
            />
            <Input
              type="date"
              value={filtroData.dataFim}
              onChange={(e) => setFiltroData(prev => ({ ...prev, dataFim: e.target.value }))}
              className="w-40"
            />
            <Button variant="outline" onClick={carregarVisitas}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {visitas.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma visita no período</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visitas.map(visita => (
                <Card key={visita.CODVISITA}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{visita.NOMEPARC}</h4>
                          {getStatusBadge(visita.STATUS)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(visita.DATA_VISITA), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          {visita.duracao && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {visita.duracao} min
                            </span>
                          )}
                          {visita.PEDIDO_GERADO === 'S' && visita.VLRTOTAL && (
                            <span className="flex items-center gap-1 text-green-600">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(visita.VLRTOTAL)}
                            </span>
                          )}
                        </div>
                        {visita.OBSERVACAO && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {visita.OBSERVACAO}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        {visita.PEDIDO_GERADO === 'S' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : visita.STATUS === 'CONCLUIDA' ? (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mapa">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {rotaSelecionada ? rotaSelecionada.DESCRICAO : 'Mapa de Rotas'}
                </CardTitle>
                {rotaSelecionada && (
                  <Button variant="ghost" size="sm" onClick={() => setRotaSelecionada(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] md:h-[500px] w-full">
                {typeof window !== 'undefined' && (
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {localizacaoAtual && (
                      <Marker position={[localizacaoAtual.lat, localizacaoAtual.lng]}>
                        <Popup>Sua localização</Popup>
                      </Marker>
                    )}
                    
                    {rotaSelecionada?.parceiros?.map((parceiro, idx) => (
                      parceiro.LATITUDE && parceiro.LONGITUDE && (
                        <Marker
                          key={parceiro.CODROTAPARC}
                          position={[parceiro.LATITUDE, parceiro.LONGITUDE]}
                        >
                          <Popup>
                            <div className="font-semibold">{idx + 1}. {parceiro.NOMEPARC}</div>
                            {parceiro.ENDERECO && <div className="text-sm">{parceiro.ENDERECO}</div>}
                            {!visitaAtiva && (
                              <Button
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => {
                                  setParceiroCheckin(parceiro)
                                  setModalCheckin(true)
                                }}
                              >
                                Check-in
                              </Button>
                            )}
                          </Popup>
                        </Marker>
                      )
                    ))}
                    
                    {rotaParceirosCoordenadas.length > 1 && (
                      <Polyline
                        positions={rotaParceirosCoordenadas}
                        color="blue"
                        weight={3}
                        opacity={0.7}
                      />
                    )}
                  </MapContainer>
                )}
              </div>
            </CardContent>
          </Card>
          
          {rotaSelecionada?.parceiros && rotaSelecionada.parceiros.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Parceiros da Rota</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-2">
                  {rotaSelecionada.parceiros.map((p, i) => (
                    <div key={p.CODROTAPARC} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{p.NOMEPARC}</p>
                          {p.CIDADE && <p className="text-xs text-muted-foreground">{p.CIDADE}/{p.UF}</p>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!visitaAtiva}
                        onClick={() => {
                          setParceiroCheckin(p)
                          setModalCheckin(true)
                        }}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={modalNovaRota} onOpenChange={setModalNovaRota}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Rota</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nome da Rota</Label>
              <Input
                value={novaRotaForm.descricao}
                onChange={(e) => setNovaRotaForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Ex: Rota Centro"
              />
            </div>
            
            <div>
              <Label>Tipo de Recorrência</Label>
              <Select
                value={novaRotaForm.tipoRecorrencia}
                onValueChange={(v) => setNovaRotaForm(prev => ({ ...prev, tipoRecorrencia: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMANAL">Dias da Semana</SelectItem>
                  <SelectItem value="INTERVALO">Intervalo de Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {novaRotaForm.tipoRecorrencia === 'SEMANAL' && (
              <div>
                <Label>Dias da Semana</Label>
                <div className="flex gap-2 mt-2">
                  {diasSemanaLabels.map((dia, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant={novaRotaForm.diasSemana.includes(idx) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setNovaRotaForm(prev => ({
                          ...prev,
                          diasSemana: prev.diasSemana.includes(idx)
                            ? prev.diasSemana.filter(d => d !== idx)
                            : [...prev.diasSemana, idx]
                        }))
                      }}
                    >
                      {dia}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {novaRotaForm.tipoRecorrencia === 'INTERVALO' && (
              <div>
                <Label>A cada quantos dias?</Label>
                <Input
                  type="number"
                  min="1"
                  value={novaRotaForm.intervaloDias}
                  onChange={(e) => setNovaRotaForm(prev => ({ ...prev, intervaloDias: parseInt(e.target.value) || 1 }))}
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={novaRotaForm.dataInicio}
                  onChange={(e) => setNovaRotaForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                />
              </div>
              <div>
                <Label>Data Fim (opcional)</Label>
                <Input
                  type="date"
                  value={novaRotaForm.dataFim}
                  onChange={(e) => setNovaRotaForm(prev => ({ ...prev, dataFim: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label>Parceiros da Rota</Label>
              <Input
                placeholder="Pesquisar parceiro..."
                value={buscaParceiro}
                onChange={(e) => setBuscaParceiro(e.target.value)}
                className="mt-2"
              />
              <ScrollArea className="h-48 border rounded-md p-2 mt-2">
                {parceirosDisponiveis
                  .filter(p => !buscaParceiro || p.NOMEPARC?.toLowerCase().includes(buscaParceiro.toLowerCase()))
                  .slice(0, 50).map(parceiro => {
                  const isSelected = novaRotaForm.parceiros.some(p => p.codParc === parceiro.CODPARC)
                  const ordem = novaRotaForm.parceiros.findIndex(p => p.codParc === parceiro.CODPARC) + 1
                  
                  return (
                    <div
                      key={parceiro.CODPARC}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setNovaRotaForm(prev => ({
                            ...prev,
                            parceiros: prev.parceiros
                              .filter(p => p.codParc !== parceiro.CODPARC)
                              .map((p, i) => ({ ...p, ordem: i + 1 }))
                          }))
                        } else {
                          setNovaRotaForm(prev => ({
                            ...prev,
                            parceiros: [...prev.parceiros, {
                              codParc: parceiro.CODPARC,
                              ordem: prev.parceiros.length + 1,
                              latitude: parceiro.LATITUDE,
                              longitude: parceiro.LONGITUDE
                            }]
                          }))
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                            {ordem}
                          </div>
                        )}
                        <span className="text-sm">{parceiro.NOMEPARC}</span>
                      </div>
                      <Checkbox checked={isSelected} />
                    </div>
                  )
                })}
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1">
                {novaRotaForm.parceiros.length} parceiros selecionados
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovaRota(false)}>
              Cancelar
            </Button>
            <Button onClick={criarRota} disabled={!novaRotaForm.descricao || novaRotaForm.parceiros.length === 0}>
              Criar Rota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCheckin} onOpenChange={setModalCheckin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Confirmar Check-in
            </DialogTitle>
          </DialogHeader>
          
          {parceiroCheckin && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h4 className="font-semibold">{parceiroCheckin.NOMEPARC}</h4>
                {parceiroCheckin.ENDERECO && (
                  <p className="text-sm text-muted-foreground">{parceiroCheckin.ENDERECO}</p>
                )}
                {parceiroCheckin.CIDADE && (
                  <p className="text-sm text-muted-foreground">{parceiroCheckin.CIDADE}/{parceiroCheckin.UF}</p>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                Sua localização atual será registrada ao fazer o check-in.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCheckin(false)}>
              Cancelar
            </Button>
            <Button onClick={fazerCheckin} className="bg-blue-600 hover:bg-blue-700">
              <MapPin className="h-4 w-4 mr-2" />
              Fazer Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCheckout} onOpenChange={setModalCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Finalizar Visita
            </DialogTitle>
          </DialogHeader>
          
          {visitaAtiva && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h4 className="font-semibold">{visitaAtiva.NOMEPARC}</h4>
                <p className="text-sm text-muted-foreground">
                  Check-in: {visitaAtiva.HORA_CHECKIN ? format(new Date(visitaAtiva.HORA_CHECKIN), 'HH:mm', { locale: ptBR }) : '-'}
                </p>
              </div>
              
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={checkoutForm.observacao}
                  onChange={(e) => setCheckoutForm(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="O que foi realizado na visita?"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pedidoGerado"
                  checked={checkoutForm.pedidoGerado}
                  onCheckedChange={(checked) => setCheckoutForm(prev => ({ ...prev, pedidoGerado: !!checked }))}
                />
                <Label htmlFor="pedidoGerado">Pedido foi gerado?</Label>
              </div>
              
              {checkoutForm.pedidoGerado && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nº do Pedido</Label>
                    <Input
                      value={checkoutForm.nunota}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, nunota: e.target.value }))}
                      placeholder="NUNOTA"
                    />
                  </div>
                  <div>
                    <Label>Valor Total</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={checkoutForm.vlrTotal}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, vlrTotal: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCheckout(false)}>
              Cancelar
            </Button>
            <Button onClick={fazerCheckout} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Finalizar Check-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
