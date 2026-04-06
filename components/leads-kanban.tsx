"use client"

import { useState, useEffect } from "react"
import { Search, Plus, MoreHorizontal, Calendar, DollarSign, ChevronRight, Settings, User as UserIcon, Pencil, Check, CheckCircle, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadDetailModal } from "@/components/lead-detail-modal"
import { LeadCreateModal } from "./lead-create-modal"
import { FunilModal } from "@/components/funil-modal"
import { EstagiosModal } from "@/components/estagios-modal"
import { useToast } from "@/hooks/use-toast"
import type { Funil, EstagioFunil } from "@/lib/oracle-funis-service"
import type { User } from "@/lib/types"
import { authService } from "@/lib/auth-service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"

// Tipos importados localmente para evitar importar o módulo oracle
export interface Lead {
  CODLEAD: string
  ID_EMPRESA: number
  NOME: string
  DESCRICAO: string
  VALOR: number
  ESTAGIO: string
  CODESTAGIO: string
  CODFUNIL: string
  DATA_VENCIMENTO: string
  TIPO_TAG: string
  COR_TAG: string
  CODPARC?: string
  NOMEPARC?: string
  CODUSUARIO?: number
  ATIVO: string
  DATA_CRIACAO: string
  DATA_ATUALIZACAO: string
  STATUS_LEAD?: 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO'
  MOTIVO_PERDA?: string
  DATA_CONCLUSAO?: string
  NUNOTA?: number
}

const TAG_COLORS: Record<string, string> = {
  'Ads Production': 'bg-blue-100 text-blue-700',
  'Landing Page': 'bg-red-100 text-red-700',
  'Dashboard': 'bg-green-100 text-green-700',
  'UX Design': 'bg-pink-100 text-pink-700',
  'Video Production': 'bg-amber-100 text-amber-700',
  'Typeface': 'bg-cyan-100 text-cyan-700',
  'Web Design': 'bg-purple-100 text-purple-700'
}

export default function LeadsKanban() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFunilModalOpen, setIsFunilModalOpen] = useState(false)
  const [isEstagiosModalOpen, setIsEstagiosModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedFunilForEdit, setSelectedFunilForEdit] = useState<Funil | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [selectedFunil, setSelectedFunil] = useState<Funil | null>(null)
  const [funis, setFunis] = useState<Funil[]>([])
  const [estagios, setEstagios] = useState<EstagioFunil[]>([])
  const [selectedEstagioTab, setSelectedEstagioTab] = useState<string>("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO'>('EM_ANDAMENTO')
  const [dataInicio, setDataInicio] = useState<string>("")
  const [dataFim, setDataFim] = useState<string>("")
  const [parceirosMap, setParceirosMap] = useState<Record<string, string>>({})
  const [usuariosMap, setUsuariosMap] = useState<Record<number, string>>({})
  const { toast } = useToast()
  const isMobile = useIsMobile()

  useEffect(() => {
    const user = authService.getCurrentUser()
    setCurrentUser(user)
    loadFunis()
  }, [])

  useEffect(() => {
    if (selectedFunil) {
      setIsLoading(true)
      Promise.all([loadEstagios(), loadLeads()])
        .finally(() => {
          requestAnimationFrame(() => {
            setIsLoading(false)
          })
        })
    }
  }, [selectedFunil])

  const loadFunis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/funis', {
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao carregar funis')
      }

      const data = await response.json()
      setFunis(data)

      if (data.length === 0) {
        console.warn("⚠️ Nenhum funil retornado da API")
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar funis:", error)
      toast({
        title: "Erro ao conectar com a API",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadEstagios = async () => {
    if (!selectedFunil) return
    try {
      const response = await fetch(`/api/funis/estagios?codFunil=${selectedFunil.CODFUNIL}`)
      if (!response.ok) throw new Error('Falha ao carregar estágios')
      const data = await response.json()
      setEstagios(data)
      if (data.length > 0 && !selectedEstagioTab) {
        const sortedEstagios = [...data].sort((a, b) => a.ORDEM - b.ORDEM)
        setSelectedEstagioTab(sortedEstagios[0].CODESTAGIO)
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const loadLeads = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ t: Date.now().toString() })
      if (dataInicio) params.append('dataInicio', dataInicio)
      if (dataFim) params.append('dataFim', dataFim)
      if (selectedFunil) params.append('codFunil', selectedFunil.CODFUNIL)

      const response = await fetch(`/api/leads?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-store' }
      })

      if (!response.ok) throw new Error('Falha ao carregar leads')
      const data = await response.json()
      setLeads(Array.isArray(data) ? data : [])
      await loadParceirosNomes(data)
      await loadUsuariosNomes(data)
    } catch (error: any) {
      console.error("Erro ao carregar leads:", error)
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  };

  const loadParceirosNomes = async (leadsData: Lead[]) => {
    try {
      const codParcs = [...new Set(leadsData.map(l => l.CODPARC).filter(Boolean))]
      if (codParcs.length === 0) return
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      if (cachedParceiros) {
        const parsedCache = JSON.parse(cachedParceiros)
        const allParceiros = parsedCache.parceiros || parsedCache
        const map: Record<string, string> = {}
        codParcs.forEach(codParc => {
          if (codParc) {
            const parceiro = allParceiros.find((p: any) => p.CODPARC === codParc)
            if (parceiro) map[codParc] = parceiro.NOMEPARC
          }
        })
        setParceirosMap(map)
      }
    } catch (error) { console.error(error) }
  }

  const loadUsuariosNomes = async (leadsData: Lead[]) => {
    try {
      const codUsuarios = [...new Set(leadsData.map(l => l.CODUSUARIO).filter(Boolean))]
      if (codUsuarios.length === 0) return
      const response = await fetch('/api/usuarios')
      if (!response.ok) return
      const usuarios = await response.json()
      const map: Record<number, string> = {}
      codUsuarios.forEach(codUsuario => {
        if (codUsuario !== undefined) {
          const usuario = usuarios.find((u: any) => u.id === codUsuario)
          if (usuario) map[codUsuario] = usuario.name
        }
      })
      setUsuariosMap(map)
    } catch (error) { console.error(error) }
  }

  const handleCreate = () => {
    setSelectedLead(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead)
    requestAnimationFrame(() => setIsModalOpen(true))
  }

  const handleSave = async () => {
    try {
      await loadLeads()
      setIsModalOpen(false)
      setIsCreateModalOpen(false)
      toast({ title: "Sucesso", description: "Dados atualizados!" })
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" })
    }
  }

  const handleFunilSaved = async () => {
    setIsFunilModalOpen(false)
    await loadFunis()
  }

  const handleEstagiosSaved = async () => {
    setIsEstagiosModalOpen(false)
    if (selectedFunil) await loadEstagios()
  }

  const handleDragStart = (lead: Lead) => {
    if (lead.STATUS_LEAD === 'GANHO' || lead.STATUS_LEAD === 'PERDIDO') return
    setDraggedLead(lead)
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = async (codEstagio: string, nomeEstagio: string) => {
    if (!draggedLead || draggedLead.CODESTAGIO === codEstagio) {
      setDraggedLead(null)
      return
    }
    const leadOriginal = draggedLead
    setDraggedLead(null)
    try {
      const response = await fetch('/api/leads/atualizar-estagio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codLeed: leadOriginal.CODLEAD, novoEstagio: codEstagio })
      })
      if (!response.ok) throw new Error('Erro ao mover')
      setLeads(prev => prev.map(l => l.CODLEAD === leadOriginal.CODLEAD ? { ...l, CODESTAGIO: codEstagio } : l))
      toast({ title: "Sucesso", description: `Movido para ${nomeEstagio}` })
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    }
  }

  const getLeadsByEstagio = (codEstagio: string) => {
    return leads.filter(lead => {
      const matchesSearch = searchTerm === '' || (lead.NOME && lead.NOME.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesFunil = selectedFunil && String(lead.CODFUNIL) === String(selectedFunil.CODFUNIL)
      const matchesEstagio = String(lead.CODESTAGIO) === String(codEstagio)
      const matchesStatus = statusFilter === 'TODOS' || (statusFilter === 'EM_ANDAMENTO' && (!lead.STATUS_LEAD || lead.STATUS_LEAD === 'EM_ANDAMENTO')) || lead.STATUS_LEAD === statusFilter
      return matchesSearch && matchesFunil && matchesEstagio && matchesStatus
    })
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sem data'
    try {
      // Tentar converter ISO ou outros formatos comuns
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        // Fallback para datas que podem vir no formato DD/MM/YYYY ou similar do Oracle
        if (typeof dateString === 'string' && dateString.includes('/')) {
          return dateString;
        }
        return 'Data inválida'
      }
      return date.toLocaleDateString('pt-BR')
    } catch (e) {
      return 'Data inválida'
    }
  }

  const handleCreateFunil = () => {
    setSelectedFunilForEdit(null)
    setIsFunilModalOpen(true)
  }

  if (!selectedFunil) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Negócios</h1>
            {currentUser?.role === "Administrador" && (
              <Button onClick={handleCreateFunil} className="flex gap-2">
                <Plus className="w-4 h-4" /> Novo Funil
              </Button>
            )}
          </div>
          {isLoading ? <p>Carregando funis...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {funis.map((funil) => (
                <div 
                  key={funil.CODFUNIL} 
                  className="group bg-card p-6 rounded-lg border hover:shadow-md cursor-pointer relative" 
                  onClick={() => setSelectedFunil(funil)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: funil.COR }} />
                      <h3 className="font-semibold">{funil.NOME}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {currentUser?.role === "Administrador" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFunilForEdit(funil);
                            setIsFunilModalOpen(true);
                          }}
                        >
                          <Settings className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <FunilModal isOpen={isFunilModalOpen} onClose={() => setIsFunilModalOpen(false)} funil={selectedFunilForEdit} onSave={handleFunilSaved} />
      </>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedFunil.NOME}</h1>
            <Button variant="link" onClick={() => setSelectedFunil(null)} className="p-0 h-auto text-xs">← Voltar para Funis</Button>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-64" />
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-1" /> Novo</Button>
            {currentUser?.role === "Administrador" && (
              <Button variant="outline" onClick={() => { setSelectedFunilForEdit(selectedFunil); setIsEstagiosModalOpen(true); }}><Settings className="w-4 h-4" /></Button>
            )}
          </div>
        </div>

        {/* Filtros Adicionais */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-lg border">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-9 w-[150px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="GANHO">Ganho</SelectItem>
                <SelectItem value="PERDIDO">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Início</label>
            <Input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className="h-9 w-[140px] bg-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Fim</label>
            <Input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className="h-9 w-[140px] bg-white"
            />
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-5 text-slate-500 hover:text-red-500"
            onClick={() => {
              setDataInicio("");
              setDataFim("");
              setStatusFilter("EM_ANDAMENTO");
            }}
          >
            Limpar
          </Button>
          
          <Button 
            variant="secondary" 
            size="sm" 
            className="mt-5 ml-auto md:ml-0"
            onClick={loadLeads}
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'lista' ? (
          <div className="border rounded-lg bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Valor</th><th className="p-3 text-left">Status</th></tr>
              </thead>
              <tbody>
                {leads.filter(l => l.CODFUNIL === selectedFunil.CODFUNIL).map(lead => (
                  <tr key={lead.CODLEAD} className="border-t hover:bg-muted/50 cursor-pointer" onClick={() => handleEdit(lead)}>
                    <td className="p-3">{lead.NOME}</td>
                    <td className="p-3">{formatCurrency(lead.VALOR)}</td>
                    <td className="p-3">{lead.STATUS_LEAD}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isMobile ? (
          <Tabs value={selectedEstagioTab} onValueChange={setSelectedEstagioTab} className="h-full flex flex-col">
            <div className="overflow-x-auto pb-2 scrollbar-hide">
              <TabsList className="bg-slate-100/50 p-1 rounded-xl w-max min-w-full">
                {estagios.sort((a, b) => a.ORDEM - b.ORDEM).map((estagio) => (
                  <TabsTrigger 
                    key={estagio.CODESTAGIO} 
                    value={estagio.CODESTAGIO}
                    className="rounded-lg font-bold text-[11px] uppercase py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500 transition-all gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: estagio.COR }} />
                    {estagio.NOME}
                    <Badge variant="secondary" className="bg-slate-200/50 text-slate-600 font-black text-[9px] h-4 px-1 ml-1">
                      {getLeadsByEstagio(estagio.CODESTAGIO).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {estagios.map((estagio) => {
              const leadsList = getLeadsByEstagio(estagio.CODESTAGIO)
              const totalValor = leadsList.reduce((sum, lead) => sum + (Number(lead.VALOR) || 0), 0)
              
              return (
                <TabsContent key={estagio.CODESTAGIO} value={estagio.CODESTAGIO} className="flex-1 mt-4 focus-visible:outline-none">
                  <div className="mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total em Negócios</span>
                    <span className="text-base font-black text-slate-900">{formatCurrency(totalValor)}</span>
                  </div>
                  
                  <div className="space-y-3 pb-20">
                    {leadsList.map((lead) => {
                      const isLeadPerdido = lead.STATUS_LEAD === 'PERDIDO'
                      const isLeadGanho = lead.STATUS_LEAD === 'GANHO'
                      const isLeadDisabled = isLeadPerdido || isLeadGanho
                      
                      return (
                      <div 
                        key={lead.CODLEAD}
                        onClick={() => handleEdit(lead)}
                        className={`p-4 rounded-xl shadow-sm border active:scale-[0.98] transition-all relative ${
                          isLeadPerdido 
                            ? 'bg-red-50/50 border-red-200 opacity-70' 
                            : isLeadGanho 
                              ? 'bg-green-50/50 border-green-200' 
                              : 'bg-white border-slate-200'
                        }`}
                      >
                        {isLeadDisabled && (
                          <div className={`absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isLeadPerdido ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {isLeadPerdido ? 'Perdido' : 'Ganho'}
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{lead.CODLEAD}</span>
                                  {lead.DATA_CRIACAO && (
                                      <span className="text-[10px] font-bold text-slate-400">{formatDate(lead.DATA_CRIACAO)}</span>
                                  )}
                              </div>
                              <p className={`font-bold text-sm leading-tight ${isLeadDisabled ? 'text-slate-500' : 'text-slate-900'}`}>{lead.NOME}</p>
                          </div>
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${isLeadDisabled ? 'hidden' : 'bg-slate-50 border-slate-100'}`}>
                              <UserIcon className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                        
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 font-medium leading-relaxed">{lead.DESCRICAO || 'Sem descrição detalhada'}</p>
                        
                        <div className="space-y-2 mb-3">
                          {lead.CODPARC && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100/50">
                                  <Navigation className="w-3 h-3" />
                                  <span className="truncate">{parceirosMap[lead.CODPARC] || `Parceiro: ${lead.CODPARC}`}</span>
                              </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                          <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Valor</span>
                              <span className="text-sm font-black text-slate-900">{formatCurrency(lead.VALOR)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                              <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Vencimento</span>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {formatDate(lead.DATA_VENCIMENTO)}
                              </div>
                          </div>
                        </div>
                      </div>
                    )})}
                    {leadsList.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                          <Plus className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Nenhum Lead</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        ) : (
          <div className="flex gap-4 h-full min-h-[600px] overflow-x-auto pb-4 scrollbar-hide">
            {estagios.sort((a, b) => a.ORDEM - b.ORDEM).map((estagio) => {
              const leadsList = getLeadsByEstagio(estagio.CODESTAGIO)
              const totalValor = leadsList.reduce((sum, lead) => sum + (Number(lead.VALOR) || 0), 0)
              
              return (
                <div 
                  key={estagio.CODESTAGIO} 
                  className="flex-1 min-w-[320px] max-w-[400px] bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col overflow-hidden"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(estagio.CODESTAGIO, estagio.NOME)}
                >
                  <div className="p-4 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm uppercase flex items-center gap-2 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: estagio.COR }} />
                        {estagio.NOME}
                      </h3>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-black text-[10px] h-5">
                        {leadsList.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total em Negócios</span>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(totalValor)}</span>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 px-3 py-4">
                    <div className="space-y-3">
                      {leadsList.map((lead) => {
                        const isLeadPerdido = lead.STATUS_LEAD === 'PERDIDO'
                        const isLeadGanho = lead.STATUS_LEAD === 'GANHO'
                        const isLeadDisabled = isLeadPerdido || isLeadGanho
                        
                        return (
                        <div 
                          key={lead.CODLEAD}
                          draggable={!isLeadDisabled}
                          onDragStart={() => !isLeadDisabled && handleDragStart(lead)}
                          onClick={() => handleEdit(lead)}
                          className={`p-4 rounded-xl shadow-md border cursor-pointer transition-all group relative ${
                            isLeadPerdido 
                              ? 'bg-red-50/50 border-red-200 opacity-70' 
                              : isLeadGanho 
                                ? 'bg-green-50/50 border-green-200' 
                                : 'bg-white border-slate-200 cursor-grab active:cursor-grabbing hover:border-green-500 hover:shadow-lg'
                          }`}
                        >
                          {isLeadDisabled && (
                            <div className={`absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isLeadPerdido ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {isLeadPerdido ? 'Perdido' : 'Ganho'}
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{lead.CODLEAD}</span>
                                    {lead.DATA_CRIACAO && (
                                        <span className="text-[10px] font-bold text-slate-400">Criado em: {formatDate(lead.DATA_CRIACAO)}</span>
                                    )}
                                </div>
                                <p className={`font-bold text-sm leading-tight transition-colors ${isLeadDisabled ? 'text-slate-500' : 'text-slate-900 group-hover:text-green-700'}`}>{lead.NOME}</p>
                            </div>
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${isLeadDisabled ? 'hidden' : 'bg-slate-50 border-slate-100'}`}>
                                <UserIcon className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                          
                          <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 font-medium leading-relaxed">{lead.DESCRICAO || 'Sem descrição detalhada'}</p>
                          
                          <div className="space-y-2 mb-3">
                            {lead.CODPARC && (
                                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100/50">
                                    <Navigation className="w-3 h-3" />
                                    <span className="truncate">{parceirosMap[lead.CODPARC] || `Parceiro: ${lead.CODPARC}`}</span>
                                </div>
                            )}
                            
                            {lead.CODUSUARIO && (
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/50">
                                    <UserIcon className="w-3 h-3" />
                                    <span className="truncate">Vendedor: {usuariosMap[lead.CODUSUARIO] || lead.CODUSUARIO}</span>
                                </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Valor do Lead</span>
                                <span className="text-sm font-black text-slate-900">{formatCurrency(lead.VALOR)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Vencimento</span>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {formatDate(lead.DATA_VENCIMENTO)}
                                </div>
                            </div>
                          </div>
                        </div>
                      )})}
                      {leadsList.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                            <Plus className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Nenhum Lead</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      <LeadCreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleSave} funilSelecionado={selectedFunil ? { CODFUNIL: selectedFunil.CODFUNIL, estagios } : undefined} />
      <LeadDetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} lead={selectedLead} onSave={handleSave} />
      <FunilModal isOpen={isFunilModalOpen} onClose={() => setIsFunilModalOpen(false)} funil={selectedFunilForEdit} onSave={handleFunilSaved} />
      <EstagiosModal isOpen={isEstagiosModalOpen} onClose={() => setIsEstagiosModalOpen(false)} funil={selectedFunilForEdit} onSave={handleEstagiosSaved} />
    </div>
  )
}