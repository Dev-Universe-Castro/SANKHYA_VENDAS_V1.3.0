
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth-service"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, FileText, Package, TrendingUp, User, DollarSign, Search, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subYears, isAfter, isBefore } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface NotaItem {
  SEQUENCIA: number
  CODPROD: string
  CODVOL: string
  QTDNEG: number
  VLRUNIT: number
  VLRTOT: number
  DESCRPROD?: string
}

interface Nota {
  NUNOTA: string
  DTNEG: string
  CODPARC: string
  CODVEND: string
  VLRNOTA: number
  CODTIPOPER?: string
  CODTIPVENDA?: string
  NUMNOTA?: string
  NOMEPARC?: string
  APELIDOVEND?: string
  itens: NotaItem[]
}

export default function NotasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [notas, setNotas] = useState<Nota[]>([])
  const [notasFiltradas, setNotasFiltradas] = useState<Nota[]>([])
  const [selectedNota, setSelectedNota] = useState<Nota | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterParceiro, setFilterParceiro] = useState("todos")
  const [dataInicio, setDataInicio] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()
  const [totais, setTotais] = useState({
    totalNotas: 0,
    totalItens: 0,
    valorTotal: 0
  })
  const [parceirosNomes, setParceirosNomes] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push("/")
      return
    }

    // Definir período padrão (último mês)
    const hoje = new Date()
    const umMesAtras = new Date()
    umMesAtras.setMonth(umMesAtras.getMonth() - 1)
    
    setDataFim(hoje)
    setDataInicio(umMesAtras)
    
    // Carregar nomes dos parceiros do IndexedDB
    carregarNomesParceiros()
  }, [router])

  const carregarNomesParceiros = async () => {
    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const parceiros = await OfflineDataService.getParceiros()
      
      const nomesMap = new Map<number, string>()
      parceiros.forEach((p: any) => {
        nomesMap.set(p.CODPARC, p.NOMEPARC || `Cliente ${p.CODPARC}`)
      })
      
      setParceirosNomes(nomesMap)
      console.log(`✅ ${nomesMap.size} nomes de parceiros carregados`)
    } catch (error) {
      console.error('❌ Erro ao carregar nomes dos parceiros:', error)
    }
  }

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarNotas()
    }
  }, [dataInicio, dataFim])

  useEffect(() => {
    aplicarFiltros()
  }, [searchTerm, filterParceiro, notas])

  const carregarNotas = async () => {
    setLoading(true)
    setLoadingProgress(0)
    setLoadingMessage('Iniciando...')
    
    try {
      const currentUser = authService.getCurrentUser()
      if (!currentUser) return

      if (!dataInicio || !dataFim) {
        console.warn('⚠️ Datas não definidas')
        return
      }

      const dataInicioStr = format(dataInicio, 'yyyy-MM-dd')
      const dataFimStr = format(dataFim, 'yyyy-MM-dd')

      console.log('📋 Carregando notas...', { dataInicio: dataInicioStr, dataFim: dataFimStr })

      const response = await fetch('/api/sankhya/notas/loadrecords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          idEmpresa: currentUser.idEmpresa || 1,
          dataInicio: dataInicioStr,
          dataFim: dataFimStr,
          stream: true
        })
      })

      if (!response.ok || !response.body) {
        throw new Error('Erro ao buscar notas')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let resultadoFinal: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.complete) {
              if (data.error) {
                throw new Error(data.error)
              }
              resultadoFinal = data
            } else {
              setLoadingProgress(data.progress)
              setLoadingMessage(data.message)
            }
          }
        }
      }

      if (!resultadoFinal) {
        throw new Error('Dados não recebidos')
      }

      const { cabecalhos, itens, totais } = resultadoFinal

      // Enriquecer dados localmente
      setLoadingProgress(85)
      setLoadingMessage('Enriquecendo dados...')

      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const [produtos, vendedores] = await Promise.all([
        OfflineDataService.getProdutos(),
        OfflineDataService.getVendedores()
      ])

      const produtosMap = new Map(produtos.map((p: any) => [p.CODPROD, p]))
      const vendedoresMap = new Map(vendedores.map((v: any) => [v.CODVEND, v]))

      const itensMap = new Map<string, NotaItem[]>()
      itens.forEach((item: any) => {
        const nunota = item.NUNOTA.toString()
        if (!itensMap.has(nunota)) {
          itensMap.set(nunota, [])
        }
        
        const produto = produtosMap.get(parseInt(item.CODPROD))
        itensMap.get(nunota)!.push({
          ...item,
          DESCRPROD: produto?.DESCRPROD || `Produto ${item.CODPROD}`
        })
      })

      const notasEnriquecidas = cabecalhos.map((cab: any) => {
        const vendedor = vendedoresMap.get(parseInt(cab.CODVEND))
        const nunota = cab.NUNOTA.toString()
        
        return {
          ...cab,
          NOMEPARC: parceirosNomes.get(parseInt(cab.CODPARC)) || `Cliente ${cab.CODPARC}`,
          APELIDOVEND: vendedor?.APELIDO || `Vendedor ${cab.CODVEND}`,
          itens: itensMap.get(nunota) || []
        }
      })

      setLoadingProgress(95)
      setLoadingMessage('Finalizando...')

      setNotas(notasEnriquecidas)
      setTotais(totais)
      
      setLoadingProgress(100)
      setLoadingMessage('Concluído!')
      
      console.log(`✅ ${notasEnriquecidas.length} notas carregadas`)

      await new Promise(resolve => setTimeout(resolve, 300))

    } catch (error: any) {
      console.error('❌ Erro ao carregar notas:', error)
      setLoadingMessage('Erro ao carregar notas')
    } finally {
      setLoading(false)
      setLoadingProgress(0)
      setLoadingMessage('')
    }
  }

  const aplicarFiltros = () => {
    let resultado = [...notas]

    // Filtro por termo de busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase()
      resultado = resultado.filter(nota => 
        nota.NUNOTA.toLowerCase().includes(termo) ||
        nota.NOMEPARC?.toLowerCase().includes(termo) ||
        nota.NUMNOTA?.toLowerCase().includes(termo)
      )
    }

    // Filtro por parceiro
    if (filterParceiro !== "todos") {
      resultado = resultado.filter(nota => nota.CODPARC === filterParceiro)
    }

    setNotasFiltradas(resultado)
  }

  const parceirosUnicos = Array.from(new Set(notas.map(n => n.CODPARC)))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie as notas fiscais
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={(date) => {
                        if (!date) return
                        
                        // Validar que não seja mais de 1 ano atrás
                        const umAnoAtras = subYears(new Date(), 1)
                        if (isBefore(date, umAnoAtras)) {
                          alert('A data inicial não pode ser maior que 1 ano atrás')
                          return
                        }
                        
                        // Validar que não seja após data fim
                        if (dataFim && isAfter(date, dataFim)) {
                          alert('A data inicial não pode ser posterior à data final')
                          return
                        }
                        
                        setDataInicio(date)
                      }}
                      disabled={(date) => 
                        isAfter(date, new Date()) || 
                        isBefore(date, subYears(new Date(), 1))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={(date) => {
                        if (!date) return
                        
                        // Validar que não seja mais de 1 ano atrás
                        const umAnoAtras = subYears(new Date(), 1)
                        if (isBefore(date, umAnoAtras)) {
                          alert('A data final não pode ser maior que 1 ano atrás')
                          return
                        }
                        
                        // Validar que não seja antes da data início
                        if (dataInicio && isBefore(date, dataInicio)) {
                          alert('A data final não pode ser anterior à data inicial')
                          return
                        }
                        
                        setDataFim(date)
                      }}
                      disabled={(date) => 
                        isAfter(date, new Date()) || 
                        isBefore(date, subYears(new Date(), 1)) ||
                        (dataInicio ? isBefore(date, dataInicio) : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nota, parceiro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Parceiro</label>
                <Select value={filterParceiro} onValueChange={setFilterParceiro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {parceirosUnicos.map(codParc => (
                      <SelectItem key={codParc} value={codParc}>
                        {parceirosNomes.get(parseInt(codParc)) || `Cliente ${codParc}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Notas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totais.totalNotas}</div>
              <p className="text-xs text-muted-foreground">
                {notasFiltradas.length} filtradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totais.totalItens}</div>
              <p className="text-xs text-muted-foreground">
                Produtos vendidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(totais.valorTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                No período
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Notas Fiscais</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 px-4">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{loadingMessage || 'Carregando notas...'}</p>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{loadingProgress}%</p>
                  </div>
                </div>
              </div>
            ) : notasFiltradas.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhuma nota encontrada no período
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Nota</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notasFiltradas.map((nota) => (
                      <TableRow key={nota.NUNOTA}>
                        <TableCell className="font-medium">
                          {nota.NUMNOTA || nota.NUNOTA}
                        </TableCell>
                        <TableCell>
                          {format(new Date(nota.DTNEG), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{nota.NOMEPARC}</span>
                            <span className="text-xs text-muted-foreground">
                              Cód: {nota.CODPARC}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {nota.APELIDOVEND || nota.CODVEND}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(nota.VLRNOTA)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {nota.itens.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedNota(nota)}
                          >
                            Ver Itens
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Itens */}
        {selectedNota && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Itens da Nota {selectedNota.NUMNOTA || selectedNota.NUNOTA}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedNota.NOMEPARC} - {format(new Date(selectedNota.DTNEG), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedNota(null)}>
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seq</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Vlr Unit</TableHead>
                      <TableHead className="text-right">Vlr Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedNota.itens.map((item) => (
                      <TableRow key={item.SEQUENCIA}>
                        <TableCell>{item.SEQUENCIA}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.DESCRPROD}</span>
                            <span className="text-xs text-muted-foreground">
                              Cód: {item.CODPROD}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{item.CODVOL}</TableCell>
                        <TableCell className="text-right">
                          {item.QTDNEG.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(item.VLRUNIT)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(item.VLRTOT)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
