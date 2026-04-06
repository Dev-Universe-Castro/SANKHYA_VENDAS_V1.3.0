"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus, Search, MapPin, Navigation, Clock, Calendar,
  Check, X, Route, Trash2, Edit, AlertCircle, RefreshCw,
  WifiOff, Cloud, CheckCircle2, Filter, ChevronDown, ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { format, parseISO, isSameDay, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false })

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  })
}

interface Parceiro {
  CODPARC: number
  NOMEPARC: string
  CIDADE?: string
  UF?: string
  ENDERECO?: string
  NUMERO?: string
  LATITUDE?: number
  LONGITUDE?: number
  CGC_CPF?: string
  INSCESTAD?: string
  TIPPESSOA?: string
  RAZAOSOCIAL?: string
}

interface RotaParceiro extends Parceiro {
  CODROTAPARC: number
  ORDEM: number
  ORIGEM_COORD?: 'ERP' | 'DISPOSITIVO'
}

interface Visita {
  CODVISITA: number
  CODPARC: number
  NOMEPARC: string
  DHVISITA: string
  STATUS: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | 'CHECKIN'
  CIDADE?: string
  UF?: string
  ENDERECO?: string
  NUMERO?: string
  LATITUDE?: number
  LONGITUDE?: number
  HORA_CHECKIN?: string
  HORA_CHECKOUT?: string
  CODROTA?: number
  NOMEVENDEDOR?: string
  duracao?: number
  PEDIDO_GERADO?: string
  NUNOTA?: number
  CGC_CPF?: string
  IDENTINSCESTAD?: string
  TIPPESSOA?: string
  RAZAOSOCIAL?: string
}

interface Rota {
  CODROTA: number
  DESCRICAO: string
  TIPO_RECORRENCIA: string
  INTERVALO_DIAS?: number
  DATA_INICIO?: string
  DATA_FIM?: string
  DIAS_SEMANA?: string
  NOMEVENDEDOR?: string
  parceiros: RotaParceiro[]
}

import PedidoVendaRapido from './pedido-venda-rapido'

import { toast } from "sonner"
import { useToast } from "@/hooks/use-toast"

export default function RotasManager() {
  const { toast: uiToast } = useToast()
  const [modalPedidoRapido, setModalPedidoRapido] = useState(false)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [parceirosDisponiveis, setParceirosDisponiveis] = useState<Parceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [visitasPendentesCount, setVisitasPendentesCount] = useState(0)

  const [modalNovaRota, setModalNovaRota] = useState(false)
  const [modalDetalhesRota, setModalDetalhesRota] = useState(false)
  const [modalCheckin, setModalCheckin] = useState(false)
  const [modalCheckout, setModalCheckout] = useState(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const [modalMapaVisita, setModalMapaVisita] = useState(false)
  const [visitaParaMapa, setVisitaParaMapa] = useState<Visita | null>(null)

  const [rotaSelecionada, setRotaSelecionada] = useState<Rota | null>(null)
  const [parceiroCheckin, setParceiroCheckin] = useState<Visita | RotaParceiro | null>(null)
  const [visitaAtiva, setVisitaAtiva] = useState<Visita | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState<number | null>(null)
  const [bloquearAcoes, setBloquearAcoes] = useState(false)
  const [modalAtividade, setModalAtividade] = useState(false)
  const [modalAtalhoTarefa, setModalAtalhoTarefa] = useState(false)
  const [novaAtividadeForm, setNovaAtividadeForm] = useState({
    tipo: 'NOTA',
    titulo: '',
    descricao: '',
    dataHora: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  })

  const criarAtividadeVinculada = async () => {
    try {
      const res = await fetch('/api/leads/atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...novaAtividadeForm,
          codParc: visitaAtiva?.CODPARC || (parceiroCheckin as any)?.CODPARC,
          codRota: visitaAtiva?.CODROTA || rotaSelecionada?.CODROTA,
          codVisita: visitaAtiva?.CODVISITA,
          idEmpresa: 1
        })
      })
      if (res.ok) {
        setModalAtividade(false)
        setNovaAtividadeForm({
          tipo: 'NOTA',
          titulo: '',
          descricao: '',
          dataHora: format(new Date(), "yyyy-MM-dd'T'HH:mm")
        })
        alert('Atividade registrada com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao criar atividade:', error)
    }
  }

  useEffect(() => {
    setBloquearAcoes(!!visitaAtiva)

    // Se temos uma visita ativa e viemos pelo redirecionamento, abre o modal
    if (visitaAtiva && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('openAction') === 'checkout') {
        setModalCheckout(true)
        // Limpa a URL sem recarregar a página
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    // Modal checkout trigger manual via Floating Menu
    const handleOpenCheckoutModal = () => {
      if (visitaAtiva) {
        setModalCheckout(true)
      }
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('open-checkout-modal', handleOpenCheckoutModal)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-checkout-modal', handleOpenCheckoutModal)
      }
    }
  }, [visitaAtiva])

  const [filtroDataInicio, setFiltroDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filtroDataFim, setFiltroDataFim] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [buscaParceiroVisita, setBuscaParceiroVisita] = useState('')

  // Nova Rota Form State
  const [novaRotaForm, setNovaRotaForm] = useState({
    descricao: '',
    codVend: '',
    tipoRecorrencia: 'SEMANAL',
    diasSemana: [] as number[],
    intervaloDias: 7,
    dataInicio: format(new Date(), 'yyyy-MM-dd'),
    dataFim: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    parceiros: [] as { codParc: number; ordem: number; latitude?: number; longitude?: number; origemCoord?: 'ERP' | 'DISPOSITIVO' }[],
    adicionarCalendario: false
  })

  const [checkoutForm, setCheckoutForm] = useState({
    observacao: '',
    pedidoGerado: false,
    nunota: '',
    vlrTotal: ''
  })

  const [buscaParceiro, setBuscaParceiro] = useState('')
  const [localizacaoAtual, setLocalizacaoAtual] = useState<{ lat: number; lng: number } | null>(null)

  const [vendedores, setVendedores] = useState<any[]>([])
  const [criandoRota, setCriandoRota] = useState(false)

  useEffect(() => {
    fetchDados()
    fetchVendedores()
    setIsOnline(window.navigator.onLine)

    // Verificar se há uma ação pendente via URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('openAction') === 'checkout') {
        // O fetchDados já deve carregar a visitaAtiva, então o modal abrirá via useEffect abaixo
      }
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    const handleVisitaConcluidaGlobally = () => {
      fetchDados()
      setVisitaAtiva(null)
      setParceiroCheckin(null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('visita-concluida', handleVisitaConcluidaGlobally)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocalizacaoAtual({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Erro ao obter localização:', err)
      )
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('visita-concluida', handleVisitaConcluidaGlobally)
    }
  }, [])

  useEffect(() => {
    const searchParceiros = async () => {
      if (!buscaParceiro || buscaParceiro.length < 2) {
        // Se a busca estiver vazia ou for curta, recarregar os iniciais (opcional)
        return
      }

      try {
        const { OfflineDataService } = await import('@/lib/offline-data-service')
        const resultados = await OfflineDataService.getParceiros({ search: buscaParceiro })
        if (resultados) {
          setParceirosDisponiveis(resultados)
        }
      } catch (error) {
        console.error('Erro ao buscar parceiros offline:', error)
      }
    }

    const timer = setTimeout(() => {
      searchParceiros()
    }, 400)

    return () => clearTimeout(timer)
  }, [buscaParceiro])

  const fetchDados = async () => {
    try {
      setLoading(true)
      console.log('🔄 Buscando dados de rotas e visitas...')
      const [rotasRes, parceirosRes, visitasRes] = await Promise.all([
        fetch('/api/rotas'),
        fetch('/api/sankhya/parceiros?limit=100'),
        fetch('/api/rotas/visitas')
      ])

      if (rotasRes.ok) {
        const data = await rotasRes.json()
        console.log('✅ Rotas carregadas:', data.length)
        setRotas(data)
      }

      if (parceirosRes.ok) {
        const data = await parceirosRes.json()
        setParceirosDisponiveis(data.parceiros || [])
      }

      if (visitasRes.ok) {
        const data = await visitasRes.json()
        console.log('✅ Visitas carregadas bruto:', data.length, data)
        // Mapear campos da API para os campos esperados pelo componente
        const mappedData = data.map((v: any) => ({
          ...v,
          // Se a API retorna DATA_VISITA, mapeia para DHVISITA se estiver vazio
          DHVISITA: v.DHVISITA || v.DATA_VISITA || v.DTCAD
        }))
        setVisitas(mappedData)
        const ativa = mappedData.find((v: Visita) => v.STATUS === 'EM_ANDAMENTO' || v.STATUS === 'CHECKIN')
        if (ativa) setVisitaAtiva(ativa)
      } else {
        console.error('❌ Erro ao buscar visitas:', visitasRes.status)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVendedores = async () => {
    try {
      const res = await fetch('/api/vendedores?tipo=vendedores')
      if (res.ok) {
        const data = await res.json()
        setVendedores(Array.isArray(data) ? data : (data.vendedores || []))
      }
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error)
    }
  }

  const criarRota = async () => {
    try {
      setCriandoRota(true)
      const res = await fetch('/api/rotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaRotaForm)
      })

      if (res.ok) {
        setModalNovaRota(false)
        fetchDados()
        setNovaRotaForm({
          descricao: '',
          codVend: '',
          tipoRecorrencia: 'SEMANAL',
          diasSemana: [] as number[],
          intervaloDias: 7,
          dataInicio: format(new Date(), 'yyyy-MM-dd'),
          dataFim: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
          parceiros: [] as { codParc: number; ordem: number; latitude?: number; longitude?: number }[],
          adicionarCalendario: false
        })
      }
    } catch (error) {
      console.error('Erro ao criar rota:', error)
    } finally {
      setCriandoRota(false)
    }
  }

  const desativarRota = async (codRota: number) => {
    if (!confirm('Deseja realmente desativar esta rota? Visitas pendentes e suas tarefas serão canceladas. Visitas já iniciadas ou concluídas serão mantidas.')) return
    try {
      const res = await fetch(`/api/rotas?codRota=${codRota}`, { method: 'DELETE' })
      if (res.ok) {
        fetchDados()
        toast.success('Rota desativada com sucesso. Visitas pendentes foram canceladas.')
      } else {
        const errorData = await res.json()
        toast.error(`Erro ao desativar rota: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Erro ao desativar rota:', error)
      toast.error('Erro ao conectar ao servidor')
    }
  }

  const fazerCheckin = async () => {
    if (!parceiroCheckin) return

    // Determinar se estamos fazendo check-in em uma visita pré-agendada ou em um parceiro da rota
    const isVisita = 'CODVISITA' in parceiroCheckin

    try {
      setIsCheckingIn(isVisita ? (parceiroCheckin as Visita).CODVISITA : (parceiroCheckin as RotaParceiro).CODROTAPARC)

      console.log('🚀 Iniciando Check-in...', { action: 'checkin', parceiroCheckin });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const payload = isVisita
        ? {
          action: 'checkin',
          codVisita: (parceiroCheckin as Visita).CODVISITA,
          codParc: (parceiroCheckin as Visita).CODPARC,
          latitude: localizacaoAtual?.lat,
          longitude: localizacaoAtual?.lng,
          origemCoord: (parceiroCheckin as any).ORIGEM_COORD
        }
        : {
          action: 'checkin',
          codParc: (parceiroCheckin as RotaParceiro).CODPARC,
          codRota: rotaSelecionada?.CODROTA,
          latitude: localizacaoAtual?.lat,
          longitude: localizacaoAtual?.lng,
          origemCoord: (parceiroCheckin as RotaParceiro).ORIGEM_COORD
        }

      const res = await fetch('/api/rotas/visitas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          adicionarCalendario: novaRotaForm.adicionarCalendario
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId);

      const responseData = await res.json().catch((err) => {
        console.error('❌ Erro ao parsear JSON da resposta:', err);
        return { error: 'Resposta inválida do servidor (não é JSON)' };
      })

      if (res.ok) {
        console.log('✅ Check-in realizado com sucesso:', responseData);
        uiToast({
          title: "Check-in realizado",
          description: "Visita iniciada com sucesso.",
        })
        setModalCheckin(false)
        await fetchDados()
      } else {
        console.error('❌ Erro na API de Check-in:', res.status, responseData)
        uiToast({
          variant: "destructive",
          title: "Erro no Check-in",
          description: responseData.error || `Erro ${res.status} ao fazer check-in`,
        })
      }
    } catch (error: any) {
      console.error('❌ Erro de conexão/rede no check-in:', error)
      let errorMsg = "Erro de conexão ao tentar falar com o servidor. Verifique sua internet.";

      if (error.name === 'AbortError') {
        errorMsg = "A conexão com o servidor demorou muito tempo (timeout). Tente novamente.";
      } else if (error.message) {
        errorMsg = error.message;
      }

      uiToast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: errorMsg,
      })
    } finally {
      setIsCheckingIn(null)
    }
  }

  const fazerCheckout = async () => {
    if (!visitaAtiva) return
    try {
      console.log('🚀 Iniciando Check-out...', { action: 'checkout', codVisita: visitaAtiva.CODVISITA });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const payload = {
        action: 'checkout',
        codVisita: visitaAtiva.CODVISITA,
        ...checkoutForm,
        latitude: localizacaoAtual?.lat,
        longitude: localizacaoAtual?.lng
      }

      const res = await fetch('/api/rotas/visitas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          adicionarCalendario: novaRotaForm.adicionarCalendario
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId);

      if (res.ok) {
        uiToast({
          title: "Visita finalizada",
          description: "Check-out realizado com sucesso.",
        })
        setModalCheckout(false)
        setVisitaAtiva(null) // Limpa o botão flutuante
        setParceiroCheckin(null) // Limpa o parceiro em checkin
        await fetchDados()
        setCheckoutForm({ observacao: '', pedidoGerado: false, nunota: '', vlrTotal: '' })
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Resposta inválida do servidor' }))
        console.error('❌ Erro na API de Check-out:', errorData)
        uiToast({
          variant: "destructive",
          title: "Erro no Check-out",
          description: errorData.error || 'Erro desconhecido ao finalizar visita',
        })
      }
    } catch (error: any) {
      console.error('Erro ao fazer check-out:', error)
      let errorMsg = "Erro ao tentar finalizar visita. Verifique sua internet.";

      if (error.name === 'AbortError') {
        errorMsg = "A conexão com o servidor demorou muito tempo (timeout).";
      }

      uiToast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: errorMsg,
      })
    }
  }

  const sincronizarVisitas = () => {
    fetchDados()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE': return <Badge variant="outline" className="bg-slate-100 text-slate-600">Pendente</Badge>
      case 'CHECKIN':
      case 'EM_ANDAMENTO': return <Badge className="bg-green-500 text-white border-none">Em Andamento</Badge>
      case 'CONCLUIDA': return <Badge className="bg-green-600 text-white border-none">Concluída</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const diasSemanaLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const mapCenter = useMemo(() => {
    if (localizacaoAtual) return localizacaoAtual
    if (rotaSelecionada?.parceiros?.[0]?.LATITUDE) {
      return { lat: rotaSelecionada.parceiros[0].LATITUDE, lng: rotaSelecionada.parceiros[0].LONGITUDE }
    }
    return { lat: -23.5505, lng: -46.6333 }
  }, [localizacaoAtual, rotaSelecionada])

  const rotaParceirosCoordenadas = useMemo(() => {
    return rotaSelecionada?.parceiros
      ?.filter(p => p.LATITUDE && p.LONGITUDE)
      ?.map(p => [p.LATITUDE!, p.LONGITUDE!] as [number, number]) || []
  }, [rotaSelecionada])

  const visitasFiltradas = useMemo(() => {
    console.log('🔍 Filtrando visitas...', {
      total: visitas.length,
      inicio: filtroDataInicio,
      fim: filtroDataFim,
      busca: buscaParceiroVisita
    })

    const dataInicio = parseISO(filtroDataInicio)
    const dataFim = parseISO(filtroDataFim)

    // Ajustar dataFim para incluir o dia inteiro
    dataFim.setHours(23, 59, 59, 999)
    dataInicio.setHours(0, 0, 0, 0)

    const filtradas = visitas.filter(v => {
      if (!v.DHVISITA) return false

      // Lidar com formatos diferentes de data (ISO ou Sankhya)
      let dataVisitaStr = v.DHVISITA;
      if (dataVisitaStr.includes(' ')) {
        dataVisitaStr = dataVisitaStr.replace(' ', 'T');
      }

      const dataVisita = parseISO(dataVisitaStr)
      if (isNaN(dataVisita.getTime())) {
        console.warn('⚠️ Data inválida para visita:', v.DHVISITA);
        return false;
      }

      const matchData = dataVisita >= dataInicio && dataVisita <= dataFim
      const matchParceiro = !buscaParceiroVisita ||
        v.NOMEPARC?.toLowerCase().includes(buscaParceiroVisita.toLowerCase()) ||
        v.CODPARC?.toString().includes(buscaParceiroVisita)

      return matchData && matchParceiro
    })

    console.log('✅ Visitas filtradas:', filtradas.length)
    return filtradas
  }, [visitas, filtroDataInicio, filtroDataFim, buscaParceiroVisita])

  if (loading && rotas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
        <p className="text-sm font-medium text-muted-foreground">Carregando rotas...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden scrollbar-hide">
      {/* Header - Desktop */}
      <div className="hidden md:block p-6 bg-transparent">
        <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Rotas</h1>
        <p className="text-[#1E5128]/70 mt-1">
          Gerencie suas rotas de visitas e acompanhe o progresso
        </p>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden px-4 py-4 bg-transparent border-b border-black/5">
        <h1 className="text-xl font-bold text-[#1E5128]">Rotas</h1>
        <p className="text-sm text-[#1E5128]/70 mt-1">
          Gerencie suas rotas e progresso
        </p>
      </div>

      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">
            Modo Offline: Os dados exibidos são do cache local.
          </span>
        </div>
      )}

      <Tabs defaultValue="rotas" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 md:px-6 py-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2 h-11 p-1 bg-white border border-[#F2F2F2] rounded-full shadow-sm mx-auto md:mx-0">
              <TabsTrigger value="rotas" className="rounded-full text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=active]:shadow-md">
                <span className="hidden sm:inline">Minhas Rotas</span>
                <span className="sm:hidden">ROTAS</span>
              </TabsTrigger>
              <TabsTrigger value="visitas" className="rounded-full text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=active]:shadow-md">
                <span className="hidden sm:inline">Minhas Visitas</span>
                <span className="sm:hidden">VISITAS</span>
              </TabsTrigger>
            </TabsList>

            <Button onClick={() => setModalNovaRota(true)} className="w-full md:w-auto bg-[#76BA1B] hover:bg-[#1E5128] text-white h-11 font-bold rounded-full shadow-md shadow-[#76BA1B]/20 transition-all active:scale-[0.98]">
              <Plus className="w-5 h-5 mr-2" />
              Nova Rota
            </Button>
          </div>
        </div>

        <TabsContent value="rotas" className="flex-1 overflow-auto m-0">
          <div className="px-4 md:px-6 py-4 space-y-4 md:space-y-6 pb-24 md:pb-6">
            {rotas.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-[#F2F2F2]">
                <Route className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Você ainda não tem rotas cadastradas.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rotas.map((rota) => (
                  <Card key={rota.CODROTA} className="rounded-2xl border-[#F2F2F2] shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-white">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-base truncate">{rota.DESCRICAO}</h3>
                          <div className="flex flex-col gap-1.5 mt-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-[#F2F2F2] text-[10px] font-bold rounded-lg px-2">
                                {rota.TIPO_RECORRENCIA === 'SEMANAL'
                                  ? `Semanal (${rota.DIAS_SEMANA || ''})`
                                  : `A cada ${rota.INTERVALO_DIAS} d`}
                              </Badge>
                              <Badge variant="outline" className="bg-[#76BA1B]/10 text-[#1E5128] border-[#76BA1B]/20 text-[10px] font-bold rounded-lg px-2">
                                {rota.parceiros?.length || 0} parceiros
                              </Badge>
                            </div>

                            <div className="flex flex-col gap-1 mt-1">
                              {rota.NOMEVENDEDOR && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 border border-slate-200 uppercase">
                                    {rota.NOMEVENDEDOR.charAt(0)}
                                  </div>
                                  <span className="font-bold text-slate-700">{rota.NOMEVENDEDOR}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span className="font-medium">Início:</span>
                                <span className="text-slate-700 font-semibold">
                                  {rota.DATA_INICIO ? format(parseISO(rota.DATA_INICIO), 'dd/MM/yyyy') : '-'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span className="font-medium">Fim:</span>
                                <span className="text-slate-700 font-semibold">
                                  {rota.DATA_FIM ? format(parseISO(rota.DATA_FIM), 'dd/MM/yyyy') : '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 shrink-0"
                          title="Desativar Rota"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            desativarRota(rota.CODROTA);
                          }}
                        >
                          <WifiOff className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        className="w-full bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md shadow-[#76BA1B]/20 h-10 font-bold text-sm mt-2 transition-transform active:scale-[0.98]"
                        onClick={() => {
                          setRotaSelecionada(rota);
                          setModalDetalhesRota(true);
                        }}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Acessar Rota
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="visitas" className="flex-1 overflow-auto m-0">
          <div className="px-4 md:px-6 py-4 space-y-4 pb-24 md:pb-6">
            <Card className="rounded-2xl border border-[#F2F2F2] shadow-sm bg-white overflow-hidden">
              <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-none h-14"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-[#76BA1B]/10 p-2 rounded-lg border border-[#76BA1B]/20">
                        <Filter className="h-4 w-4 text-[#76BA1B]" />
                      </div>
                      <span className="font-bold text-sm text-[#1E5128]">Filtros de Busca</span>
                    </div>
                    {filtrosAbertos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-4 pt-0 bg-muted/30 border-t space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Data Inicial</Label>
                        <Input
                          type="date"
                          value={filtroDataInicio}
                          onChange={(e) => setFiltroDataInicio(e.target.value)}
                          className="h-10 border-slate-200 focus:border-green-500 focus:ring-green-500/10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Data Final</Label>
                        <Input
                          type="date"
                          value={filtroDataFim}
                          onChange={(e) => setFiltroDataFim(e.target.value)}
                          className="h-10 border-slate-200 focus:border-green-500 focus:ring-green-500/10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Buscar Parceiro</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="Nome ou Código..."
                            value={buscaParceiroVisita}
                            onChange={(e) => setBuscaParceiroVisita(e.target.value)}
                            className="pl-9 h-10 border-slate-200 focus:border-green-500 focus:ring-green-500/10 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hoje = format(new Date(), 'yyyy-MM-dd')
                          setFiltroDataInicio(hoje)
                          setFiltroDataFim(hoje)
                          setBuscaParceiroVisita('')
                        }}
                        className="h-8 border-slate-200 text-slate-600 font-bold text-xs"
                      >
                        Limpar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hoje = format(new Date(), 'yyyy-MM-dd')
                          setFiltroDataInicio(hoje)
                          setFiltroDataFim(hoje)
                        }}
                        className="h-8 border-slate-200 text-green-600 font-bold text-xs"
                      >
                        Hoje
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            <div className="space-y-3">
              {visitasFiltradas.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma visita encontrada para esta data</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visitasFiltradas.map((visita) => {
                    const isVisitaEmAndamento = visita.STATUS === 'EM_ANDAMENTO' || visita.STATUS === 'CHECKIN';
                    const isVisitaAtivaDesteCard = visitaAtiva?.CODVISITA === visita.CODVISITA;

                    return (
                      <Card key={visita.CODVISITA} className={`rounded-2xl overflow-hidden border-[#F2F2F2] transition-all shadow-sm ${isVisitaEmAndamento ? 'ring-2 ring-[#76BA1B] border-transparent bg-[#76BA1B]/5' : 'hover:shadow-md bg-white'}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0 flex gap-3">
                              <div className={`w-10 h-10 rounded-xl ${isVisitaEmAndamento ? 'bg-[#76BA1B] text-white shadow-md shadow-[#76BA1B]/30' : 'bg-slate-100 text-slate-500'} flex items-center justify-center font-bold shrink-0 text-sm`}>
                                {visita.NOMEPARC?.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-bold text-slate-900 text-sm truncate">{visita.NOMEPARC}</h3>
                                  <div className="shrink-0 scale-90 origin-right">
                                    {getStatusBadge(visita.STATUS)}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    <span className="font-medium">{visita.DHVISITA ? format(parseISO(visita.DHVISITA.replace(' ', 'T')), "dd/MM '•' EEEE", { locale: ptBR }) : '-'}</span>
                                  </div>
                                  {visita.NOMEVENDEDOR && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                                      <div className="w-3.5 h-3.5 rounded-full bg-slate-100 flex items-center justify-center text-[7px] font-black text-slate-500 border border-slate-200 uppercase shrink-0">
                                        {visita.NOMEVENDEDOR.charAt(0)}
                                      </div>
                                      <span className="font-bold text-slate-700 truncate">{visita.NOMEVENDEDOR}</span>
                                    </div>
                                  )}
                                  {visita.STATUS === 'CONCLUIDA' && (
                                    <>
                                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        <span className="font-bold text-slate-700">{visita.duracao ? `${visita.duracao} min` : '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        {visita.PEDIDO_GERADO === 'S' ? (
                                          <>
                                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                                            <span className="font-bold text-green-700">Pedido: #{visita.NUNOTA}</span>
                                          </>
                                        ) : (
                                          <>
                                            <X className="h-3 w-3 text-slate-400" />
                                            <span className="font-medium text-slate-400">Sem pedido</span>
                                          </>
                                        )}
                                      </div>
                                      <div className="col-span-2 flex items-center gap-3 mt-1 pt-1 border-t border-slate-50">
                                        <div className="flex flex-col">
                                          <span className="text-[8px] text-slate-400 uppercase font-black">Check-in</span>
                                          <span className="text-[10px] font-bold text-slate-600">{visita.HORA_CHECKIN ? format(new Date(visita.HORA_CHECKIN), 'HH:mm') : '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-[8px] text-slate-400 uppercase font-black">Check-out</span>
                                          <span className="text-[10px] font-bold text-slate-600">{visita.HORA_CHECKOUT ? format(new Date(visita.HORA_CHECKOUT), 'HH:mm') : '-'}</span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2.5 mt-2">
                            {isVisitaEmAndamento ? (
                              <Button
                                className="flex-1 bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md shadow-[#76BA1B]/20 h-10 font-bold text-xs transition-transform active:scale-[0.98]"
                                onClick={() => {
                                  setVisitaAtiva(visita);
                                  setModalCheckout(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                Checkout
                              </Button>
                            ) : (
                              <Button
                                className="flex-1 bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md shadow-[#76BA1B]/20 h-10 font-bold text-xs transition-transform active:scale-[0.98]"
                                disabled={bloquearAcoes || visita.STATUS === 'CONCLUIDA' || visita.STATUS === 'CANCELADA'}
                                onClick={() => {
                                  setParceiroCheckin(visita)
                                  setModalCheckin(true)
                                }}
                              >
                                <MapPin className="h-4 w-4 mr-1.5" />
                                Check-in
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-[#F2F2F2] rounded-xl shrink-0 hover:bg-slate-50 transition-colors"
                              onClick={() => {
                                setVisitaParaMapa(visita)
                                setModalMapaVisita(true)
                              }}
                            >
                              <Navigation className="h-4 w-4 text-slate-600" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modais - Premium Clean */}
      <Dialog open={modalDetalhesRota} onOpenChange={setModalDetalhesRota}>
        <DialogContent className="sm:max-w-5xl h-full sm:h-[90vh] flex flex-col p-0 overflow-hidden bg-white sm:rounded-2xl border-none shadow-2xl rounded-none">
          <DialogHeader className="p-5 border-b border-[#F2F2F2] bg-transparent sticky top-0 z-10 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-[#1E5128]">
                <div className="bg-[#76BA1B]/10 p-2 rounded-xl border border-[#76BA1B]/20">
                  <Route className="w-5 h-5 text-[#76BA1B]" />
                </div>
                {rotaSelecionada?.DESCRICAO}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row">
            <div className="w-full md:w-2/3 h-[300px] md:h-auto border-b md:border-b-0 md:border-r relative z-0">
              {typeof window !== 'undefined' && (
                <MapContainer
                  bounds={rotaParceirosCoordenadas.length > 0 ? L.latLngBounds(rotaParceirosCoordenadas) : undefined}
                  center={rotaParceirosCoordenadas.length === 0 ? [mapCenter.lat, mapCenter.lng] : undefined}
                  zoom={rotaParceirosCoordenadas.length === 0 ? 12 : undefined}
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
                  {rotaSelecionada?.parceiros?.filter(p => p.LATITUDE && p.LONGITUDE).map((p, idx) => (
                    <Marker key={p.CODROTAPARC} position={[p.LATITUDE!, p.LONGITUDE!]}>
                      <Popup>
                        <div className="p-1">
                          <p className="font-bold">{p.NOMEPARC}</p>
                          <p className="text-xs text-muted-foreground">Ordem: {p.ORDEM}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {rotaParceirosCoordenadas.length > 1 && (
                    <Polyline
                      positions={rotaParceirosCoordenadas as any}
                      color="#16a34a"
                      weight={4}
                      opacity={0.7}
                    />
                  )}
                </MapContainer>
              )}
            </div>

            <div className="w-full md:w-1/3 flex flex-col bg-slate-50/30 overflow-hidden">
              <div className="p-4 border-b bg-white">
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">Informações da Rota</h4>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Agendadas</p>
                    <p className="text-sm font-black text-slate-800 leading-none">
                      {visitas.filter(v =>
                        (v as any).CODROTA === rotaSelecionada?.CODROTA ||
                        rotaSelecionada?.parceiros?.some(p => p.CODPARC === v.CODPARC)
                      ).length}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-center">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-0.5">Realizadas</p>
                    <p className="text-sm font-black text-blue-700 leading-none">
                      {visitas.filter(v => v.STATUS === 'CONCLUIDA' && rotaSelecionada?.parceiros.some(p => p.CODPARC === v.CODPARC)).length}
                    </p>
                  </div>
                  <div className="p-2 bg-green-50 border border-green-100 rounded-lg text-center">
                    <p className="text-[9px] font-black text-green-400 uppercase mb-0.5">Pedidos</p>
                    <p className="text-sm font-black text-green-700 leading-none">
                      {visitas.filter(v => v.STATUS === 'CONCLUIDA' && (v as any).NUNOTA && rotaSelecionada?.parceiros.some(p => p.CODPARC === v.CODPARC)).length}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Recorrência:</span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {rotaSelecionada?.TIPO_RECORRENCIA === 'SEMANAL'
                        ? `Semanal (${rotaSelecionada?.DIAS_SEMANA || ''})`
                        : `A cada ${rotaSelecionada?.INTERVALO_DIAS} dias`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Período:</span>
                    <span className="font-semibold text-[10px] text-slate-700">
                      {rotaSelecionada?.DATA_INICIO && format(new Date(rotaSelecionada.DATA_INICIO), 'dd/MM/yy')} - {rotaSelecionada?.DATA_FIM && format(new Date(rotaSelecionada.DATA_FIM), 'dd/MM/yy')}
                    </span>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Parceiros ({rotaSelecionada?.parceiros?.length || 0})</h4>
                  {rotaSelecionada?.parceiros?.map((p, i) => (
                    <div key={p.CODROTAPARC} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                      <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">{p.NOMEPARC}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {p.CODPARC}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 bg-white border-t sticky bottom-0">
                <Button
                  className="w-full bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl h-11 font-bold shadow-md shadow-[#76BA1B]/20 transition-all active:scale-[0.98]"
                  onClick={() => {
                    setModalDetalhesRota(false);
                    setModalNovaRota(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Rota
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalNovaRota} onOpenChange={setModalNovaRota}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-white sm:rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-5 border-b border-[#F2F2F2] bg-transparent">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-[#1E5128]">
                <div className="bg-[#76BA1B]/10 p-2 rounded-xl border border-[#76BA1B]/20">
                  <Route className="w-5 h-5 text-[#76BA1B]" />
                </div>
                Configurar Nova Rota
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Nome da Rota</Label>
                  <Input
                    placeholder="Ex: Rota Centro"
                    value={novaRotaForm.descricao}
                    onChange={(e) => setNovaRotaForm(prev => ({ ...prev, descricao: e.target.value }))}
                    className="h-10 border-slate-200 focus:border-green-500 focus:ring-green-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Vendedor</Label>
                  <Select
                    value={novaRotaForm.codVend}
                    onValueChange={(v) => setNovaRotaForm(prev => ({ ...prev, codVend: v }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200 bg-white">
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v: any) => (
                        <SelectItem key={v.CODVEND} value={v.CODVEND.toString()}>
                          {v.APELIDO || v.NOMEVEND || `Vendedor ${v.CODVEND}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Tipo de Recorrência</Label>
                  <Select
                    value={novaRotaForm.tipoRecorrencia}
                    onValueChange={(v) => setNovaRotaForm(prev => ({ ...prev, tipoRecorrencia: v }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEMANAL">Dias da Semana</SelectItem>
                      <SelectItem value="INTERVALO">Intervalo de Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {novaRotaForm.tipoRecorrencia === 'INTERVALO' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">A cada quantos dias?</Label>
                    <Input
                      type="number"
                      min="1"
                      value={novaRotaForm.intervaloDias}
                      onChange={(e) => setNovaRotaForm(prev => ({ ...prev, intervaloDias: parseInt(e.target.value) || 1 }))}
                      className="h-10 border-slate-200"
                    />
                  </div>
                )}

                {novaRotaForm.tipoRecorrencia === 'SEMANAL' && (
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Dias da Semana</Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {diasSemanaLabels.map((dia, idx) => {
                        const isSelected = novaRotaForm.diasSemana.includes(idx)
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNovaRotaForm(prev => ({
                                ...prev,
                                diasSemana: prev.diasSemana.includes(idx)
                                  ? prev.diasSemana.filter(d => d !== idx)
                                  : [...prev.diasSemana, idx]
                              }))
                            }}
                            className={`h-8 px-2.5 rounded-lg border text-[10px] font-bold transition-all ${isSelected
                              ? 'bg-green-600 border-green-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-green-300'
                              }`}
                          >
                            {dia}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Data Início <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={novaRotaForm.dataInicio}
                    onChange={(e) => setNovaRotaForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                    className="h-10 border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Data Fim <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={novaRotaForm.dataFim}
                    onChange={(e) => setNovaRotaForm(prev => ({ ...prev, dataFim: e.target.value }))}
                    className="h-10 border-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-100">
                <Checkbox
                  id="adicionarCalendario"
                  checked={novaRotaForm.adicionarCalendario}
                  onCheckedChange={(checked) => setNovaRotaForm(prev => ({ ...prev, adicionarCalendario: !!checked }))}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="adicionarCalendario"
                    className="text-xs font-bold text-green-900 leading-none cursor-pointer"
                  >
                    Adicionar ao calendário de tarefas?
                  </label>
                  <p className="text-[10px] text-green-700 font-medium">
                    As visitas geradas serão salvas como tarefas para acompanhamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 uppercase">Selecionar Parceiros</Label>
                <Badge variant="secondary" className="bg-green-100 text-green-700 font-bold text-[10px]">
                  {novaRotaForm.parceiros.length} Selecionados
                </Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar por nome ou código..."
                  value={buscaParceiro}
                  onChange={(e) => setBuscaParceiro(e.target.value)}
                  className="pl-9 h-10 border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <ScrollArea className="h-[200px]">
                  <div className="divide-y divide-slate-100">
                    {parceirosDisponiveis
                      .filter(p => !buscaParceiro || p.NOMEPARC?.toLowerCase().includes(buscaParceiro.toLowerCase()) || p.CODPARC.toString().includes(buscaParceiro))
                      .slice(0, 50).map(parceiro => {
                        const isSelected = novaRotaForm.parceiros.some(p => p.codParc === parceiro.CODPARC)
                        const ordem = novaRotaForm.parceiros.findIndex(p => p.codParc === parceiro.CODPARC) + 1

                        return (
                          <div
                            key={parceiro.CODPARC}
                            className={`flex items-center justify-between p-3 cursor-pointer transition-all ${isSelected ? 'bg-green-50/60' : 'hover:bg-slate-50'
                              }`}
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
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-green-600 border-green-600 shadow-sm' : 'border-slate-300 bg-white'
                                }`}>
                                {isSelected && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-xs font-bold truncate ${isSelected ? 'text-green-900' : 'text-slate-800'}`}>
                                  {parceiro.NOMEPARC}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Cód: {parceiro.CODPARC} {parceiro.CIDADE ? `• ${parceiro.CIDADE}` : ''}
                                </span>
                                {isSelected && (
                                  <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[9px] font-black uppercase text-slate-400">Coordenadas:</span>
                                    <Select
                                      value={novaRotaForm.parceiros.find(p => p.codParc === parceiro.CODPARC)?.origemCoord || 'ERP'}
                                      onValueChange={(val: 'ERP' | 'DISPOSITIVO') => {
                                        setNovaRotaForm(prev => ({
                                          ...prev,
                                          parceiros: prev.parceiros.map(p =>
                                            p.codParc === parceiro.CODPARC ? { ...p, origemCoord: val } : p
                                          )
                                        }))
                                      }}
                                    >
                                      <SelectTrigger className="h-6 min-w-[100px] text-[10px] font-bold border-slate-200 bg-white py-0 px-2 rounded-md">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="ERP" className="text-[10px] font-bold">ERP</SelectItem>
                                        <SelectItem value="DISPOSITIVO" className="text-[10px] font-bold">DISPOSITIVO</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 font-black text-[9px] h-5 shrink-0">
                                #{ordem}
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter className="p-5 border-t border-[#F2F2F2] bg-white sticky bottom-0 z-10">
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" onClick={() => setModalNovaRota(false)} className="h-11 rounded-xl px-6 border-[#F2F2F2] font-bold text-slate-600 bg-white hover:bg-slate-50">
                Cancelar
              </Button>
              <Button
                onClick={criarRota}
                disabled={!novaRotaForm.descricao || novaRotaForm.parceiros.length === 0 || criandoRota}
                className="h-11 px-8 rounded-xl bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold shadow-md shadow-[#76BA1B]/20 transition-all active:scale-[0.98]"
              >
                {criandoRota ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Confirmar Rota'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCheckin} onOpenChange={setModalCheckin}>
        <DialogContent className="sm:max-w-md h-full sm:h-auto flex flex-col p-0 overflow-hidden bg-white sm:rounded-2xl border-none shadow-2xl rounded-none">
          <DialogHeader className="p-5 border-b border-[#F2F2F2] bg-transparent sticky top-0 z-10 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-[#1E5128]">
                <div className="bg-[#76BA1B]/10 p-2 rounded-xl border border-[#76BA1B]/20">
                  <Navigation className="h-6 w-6 text-[#76BA1B]" />
                </div>
                Confirmar Visita
              </DialogTitle>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 transition-colors" onClick={() => setModalCheckin(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center text-slate-400">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase leading-none mb-1">Nova Atividade</p>
                  <p className="text-sm font-bold text-slate-700">Adicionar Atalho?</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-black uppercase border-slate-200 text-blue-600 border-blue-100 hover:bg-blue-50"
                onClick={() => setModalAtividade(true)}
              >
                Adicionar
              </Button>
            </div>

            {parceiroCheckin && (
              <div className="p-4 bg-green-50/50 border border-green-100 rounded-xl space-y-1">
                <h4 className="font-bold text-green-900">{parceiroCheckin.NOMEPARC}</h4>
                {parceiroCheckin.ENDERECO && (
                  <p className="text-xs text-green-700 font-medium">{parceiroCheckin.ENDERECO}, {parceiroCheckin.NUMERO}</p>
                )}
                {parceiroCheckin.CIDADE && (
                  <p className="text-[10px] text-green-600 uppercase font-black">{parceiroCheckin.CIDADE}/{parceiroCheckin.UF}</p>
                )}
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Ao realizar o check-in, sua localização atual será registrada e o tempo de visita começará a ser contabilizado.
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 bg-white border-t border-[#F2F2F2] flex flex-col sm:flex-row gap-3 mt-auto">
            <Button variant="outline" onClick={() => setModalCheckin(false)} className="h-11 rounded-xl font-bold flex-1 border-[#F2F2F2] hover:bg-slate-50 text-[#121212]">
              Agora não
            </Button>
            <Button onClick={fazerCheckin} className="rounded-xl bg-[#76BA1B] hover:bg-[#1E5128] text-white h-11 font-bold flex-1 shadow-md shadow-[#76BA1B]/20 transition-all active:scale-[0.98]">
              <MapPin className="h-4 w-4 mr-2" />
              Fazer Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCheckout} onOpenChange={setModalCheckout}>
        <DialogContent className="sm:max-w-lg h-full sm:h-auto flex flex-col p-0 overflow-hidden bg-white sm:rounded-2xl border-none shadow-2xl rounded-none">
          <DialogHeader className="p-5 border-b border-[#F2F2F2] bg-transparent sticky top-0 z-10 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-[#1E5128]">
                <div className="bg-[#76BA1B]/10 p-2 rounded-xl border border-[#76BA1B]/20">
                  <CheckCircle2 className="h-6 w-6 text-[#76BA1B]" />
                </div>
                Concluir Atendimento
              </DialogTitle>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 transition-colors" onClick={() => setModalCheckout(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center text-slate-400">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase leading-none mb-1">Nova Atividade</p>
                  <p className="text-sm font-bold text-slate-700">Adicionar Atalho?</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-black uppercase border-slate-200 text-blue-600 border-blue-100 hover:bg-blue-50"
                onClick={() => setModalAtividade(true)}
              >
                Adicionar
              </Button>
            </div>

            {visitaAtiva && (
              <div className="p-4 bg-green-50/30 border border-green-100 rounded-xl">
                <h4 className="font-bold text-sm text-green-900">{visitaAtiva.NOMEPARC}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="bg-white border-green-200 text-green-700 text-[10px] py-0 px-2">
                    Início: {visitaAtiva.HORA_CHECKIN ? format(new Date(visitaAtiva.HORA_CHECKIN), 'HH:mm') : '-'}
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">Resumo da Visita</Label>
                <Textarea
                  value={checkoutForm.observacao}
                  onChange={(e) => setCheckoutForm(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Relate brevemente o que foi conversado ou realizado..."
                  className="min-h-[120px] border-slate-200 focus:ring-green-500/10"
                />
              </div>

              {!checkoutForm.nunota ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 border-dashed border-2 border-green-200 hover:border-green-500 hover:bg-green-50 text-green-700 font-bold flex items-center justify-center gap-3 transition-all rounded-xl"
                  onClick={() => setModalPedidoRapido(true)}
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Plus className="w-4 h-4" />
                  </div>
                  Realizar Venda
                </Button>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-blue-800 uppercase leading-none mb-1">Pedido Gerado</p>
                      <p className="text-sm font-bold text-blue-700">#{checkoutForm.nunota}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-600 text-white border-none text-[10px] font-black h-6">
                    {formatCurrency(parseFloat(checkoutForm.vlrTotal) || 0)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 bg-white border-t border-[#F2F2F2] flex flex-col sm:flex-row gap-3 mt-auto">
            <Button variant="outline" onClick={() => setModalCheckout(false)} className="h-11 rounded-xl font-bold flex-1 border-[#F2F2F2] hover:bg-slate-50 text-[#121212]">
              Continuar Visita
            </Button>
            <Button onClick={fazerCheckout} className="rounded-xl bg-[#76BA1B] hover:bg-[#1E5128] text-white h-11 font-bold flex-1 shadow-md shadow-[#76BA1B]/20 transition-all active:scale-[0.98]">
              <Check className="h-4 w-4 mr-2" />
              Finalizar Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Pedido Rápido */}
      {modalPedidoRapido && visitaAtiva && (
        <PedidoVendaRapido
          isOpen={modalPedidoRapido}
          onClose={() => setModalPedidoRapido(false)}
          parceiroSelecionado={{
            CODPARC: visitaAtiva.CODPARC,
            NOMEPARC: visitaAtiva.NOMEPARC,
            CGC_CPF: visitaAtiva.CGC_CPF,
            INSCESTAD: visitaAtiva.IDENTINSCESTAD || "",
            TIPPESSOA: visitaAtiva.TIPPESSOA,
            RAZAOSOCIAL: visitaAtiva.RAZAOSOCIAL || visitaAtiva.NOMEPARC
          }}
          onSuccess={(pedido) => {
            console.log('✅ Pedido gerado com sucesso no checkout:', pedido);
            setCheckoutForm(prev => ({
              ...prev,
              pedidoGerado: true,
              nunota: pedido.NUNOTA?.toString() || '',
              vlrTotal: pedido.VLRNOT?.toString() || pedido.VLRTOTAL?.toString() || ''
            }));
            setModalPedidoRapido(false);
            // Se for um checkout em andamento, garante que a visita ativa seja atualizada se necessário
            // ou apenas mantenha o modal de checkout aberto para finalização
          }}
        />
      )}
      {/* Modal de Mapa do Cliente */}
      <Dialog open={modalMapaVisita} onOpenChange={setModalMapaVisita}>
        <DialogContent className="sm:max-w-3xl h-full sm:h-[80vh] flex flex-col p-0 overflow-hidden bg-white sm:rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-5 border-b border-[#F2F2F2] bg-transparent shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold flex items-center gap-3 text-[#1E5128]">
                <div className="bg-[#76BA1B]/10 p-2 rounded-xl border border-[#76BA1B]/20">
                  <MapPin className="w-5 h-5 text-[#76BA1B]" />
                </div>
                Localização: {visitaParaMapa?.NOMEPARC}
              </DialogTitle>
              <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setModalMapaVisita(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 relative z-0">
            {typeof window !== 'undefined' && visitaParaMapa && visitaParaMapa.LATITUDE && visitaParaMapa.LONGITUDE ? (
              <MapContainer
                center={[visitaParaMapa.LATITUDE, visitaParaMapa.LONGITUDE]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[visitaParaMapa.LATITUDE, visitaParaMapa.LONGITUDE]}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-sm">{visitaParaMapa.NOMEPARC}</p>
                      <p className="text-xs text-muted-foreground">{visitaParaMapa.ENDERECO}, {visitaParaMapa.NUMERO}</p>
                      <p className="text-xs text-muted-foreground">{visitaParaMapa.CIDADE}/{visitaParaMapa.UF}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800">Coordenadas não encontradas</h3>
                  <p className="text-sm text-slate-600 mt-1 max-w-[250px]">
                    Cadastre a longitude e latitude para ver o mapa.
                  </p>
                  <Button
                    className="mt-4 bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md transition-all active:scale-[0.98]"
                    onClick={() => {
                      if (visitaParaMapa) {
                        const address = `${visitaParaMapa.ENDERECO}, ${visitaParaMapa.NUMERO}, ${visitaParaMapa.CIDADE} - ${visitaParaMapa.UF}`
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
                      }
                    }}
                  >
                    Ver no Google Maps
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 bg-white border-t flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col flex-1 gap-1 min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase">Endereço Completo</p>
              <p className="text-sm text-slate-800 truncate">
                {visitaParaMapa?.ENDERECO}, {visitaParaMapa?.NUMERO} - {visitaParaMapa?.CIDADE}/{visitaParaMapa?.UF}
              </p>
            </div>
            <Button variant="outline" onClick={() => setModalMapaVisita(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Atividade Avulsa */}
      <Dialog open={modalAtividade} onOpenChange={setModalAtividade}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl border-none shadow-2xl p-0">
          <DialogHeader className="p-5 border-b border-[#F2F2F2] bg-transparent">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-[#1E5128]">
              <div className="bg-[#76BA1B]/10 p-2 rounded-xl border border-[#76BA1B]/20">
                <Plus className="w-5 h-5 text-[#76BA1B]" />
              </div>
              Registrar Atividade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">Tipo</Label>
              <Select
                value={novaAtividadeForm.tipo}
                onValueChange={(v) => setNovaAtividadeForm(prev => ({ ...prev, tipo: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTA">Nota/Observação</SelectItem>
                  <SelectItem value="LIGACAO">Ligação</SelectItem>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="REUNIAO">Reunião</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">Título</Label>
              <Input
                value={novaAtividadeForm.titulo}
                onChange={(e) => setNovaAtividadeForm(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Conversa sobre novos produtos"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">Descrição</Label>
              <Textarea
                value={novaAtividadeForm.descricao}
                onChange={(e) => setNovaAtividadeForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Detalhes da atividade..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="p-5 border-t border-[#F2F2F2] bg-white flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setModalAtividade(false)} className="rounded-xl border-[#F2F2F2] hover:bg-slate-50">Cancelar</Button>
            <Button onClick={criarAtividadeVinculada} className="rounded-xl bg-[#76BA1B] hover:bg-[#1E5128] text-white shadow-md transition-all active:scale-[0.98]">Salvar Atividade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
