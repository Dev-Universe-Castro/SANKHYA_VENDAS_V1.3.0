"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { OfflineDataService } from '@/lib/offline-data-service'

interface Titulo {
  nroTitulo: string
  parceiro: string
  valor: number
  dataVencimento: string
  dataNegociacao: string
  tipo: string
  status: string
  numeroParcela: number
  CODPARC?: string | number
  NOMEPARC?: string
  DTVENC?: string
}

export default function TitulosReceberTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchNroTitulo, setSearchNroTitulo] = useState("")
  const [titulos, setTitulos] = useState<Titulo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  // Carregar títulos do banco interno ao montar o componente
  useEffect(() => {
    loadTitulosFromDB()
  }, [])

  // Função para carregar títulos do banco interno SEM filtros
  const loadTitulosFromDB = async () => {
    try {
      setIsLoading(true)
      console.log('📦 Carregando títulos do IndexedDB...')

      const titulosLocal = await OfflineDataService.getTitulos()
      setTitulos(titulosLocal)

      console.log(`✅ ${titulosLocal.length} títulos carregados do IndexedDB`)

      if (titulosLocal.length === 0) {
        toast({
          title: "Sem dados",
          description: "Nenhum título encontrado. Execute o prefetch para sincronizar.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error('❌ Erro ao carregar títulos:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar títulos do banco local.",
        variant: "destructive",
      })
      setTitulos([])
    } finally {
      setIsLoading(false)
    }
  }

  // Função para aplicar filtros - chamada APENAS ao clicar no botão
  const aplicarFiltros = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 Aplicando filtros:', { searchTerm, searchNroTitulo })

      const titulosFiltrados = await OfflineDataService.getTitulos({
        searchTerm: searchTerm.trim(),
        searchNroTitulo: searchNroTitulo.trim()
      })

      setTitulos(titulosFiltrados)

      console.log(`✅ ${titulosFiltrados.length} títulos encontrados com os filtros`)

      toast({
        title: "Filtros aplicados",
        description: `${titulosFiltrados.length} título(s) encontrado(s).`,
      })
    } catch (error) {
      console.error('❌ Erro ao filtrar títulos:', error)
      toast({
        title: "Erro",
        description: "Erro ao aplicar filtros.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Desktop */}
      <div className="hidden md:block border-b p-6">
        <h1 className="text-3xl font-bold tracking-tight">Títulos a Receber</h1>
        <p className="text-muted-foreground">
          Consulta de títulos financeiros a receber
        </p>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b px-3 py-3">
        <h1 className="text-lg font-bold">Financeiro</h1>
        <p className="text-xs text-muted-foreground">
          Títulos a receber
        </p>
      </div>

      {/* Filtros de Busca - Desktop */}
      <div className="hidden md:block border-b p-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Busca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="searchTerm" className="text-xs md:text-sm font-medium">
                  Nome do Parceiro / Código
                </Label>
                <Input
                  id="searchTerm"
                  type="text"
                  placeholder="Buscar por nome ou código"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="searchNroTitulo" className="text-xs md:text-sm font-medium">
                  Número do Título
                </Label>
                <Input
                  id="searchNroTitulo"
                  type="text"
                  placeholder="Buscar por número"
                  value={searchNroTitulo}
                  onChange={(e) => setSearchNroTitulo(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                />
              </div>

              <div className="space-y-1.5 md:self-end">
                <Label className="text-xs md:text-sm font-medium opacity-0 hidden md:block">Ação</Label>
                <Button
                  onClick={aplicarFiltros}
                  disabled={isLoading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Filtrar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de Busca - Mobile (Colapsável) */}
      <div className="md:hidden border-b">
        <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
            >
              <span className="font-medium">Filtros de Busca</span>
              {filtrosAbertos ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card>
              <CardContent className="p-4 space-y-4 bg-muted/30">
                <div className="space-y-1.5">
                  <Label htmlFor="searchTermMobile" className="text-xs md:text-sm font-medium">
                    Nome do Parceiro / Código
                  </Label>
                  <Input
                    id="searchTermMobile"
                    type="text"
                    placeholder="Buscar por nome ou código"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="searchNroTituloMobile" className="text-xs md:text-sm font-medium">
                    Número do Título
                  </Label>
                  <Input
                    id="searchNroTituloMobile"
                    type="text"
                    placeholder="Buscar por número"
                    value={searchNroTitulo}
                    onChange={(e) => setSearchNroTitulo(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                  />
                </div>

                <Button
                  onClick={aplicarFiltros}
                  disabled={isLoading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Filtrar'}
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Lista de Títulos - Mobile Cards / Desktop Table */}
      <div className="flex-1 overflow-auto p-0 md:p-6 mt-4 md:mt-0">
        {/* Mobile - Cards */}
        <div className="md:hidden px-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-sm font-medium text-muted-foreground">Carregando títulos...</p>
            </div>
          ) : titulos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum título encontrado. Use os filtros acima para buscar.
            </div>
          ) : (
            titulos.map((titulo, index) => (
              <div
                key={`titulo-${titulo.nroTitulo}-${titulo.numeroParcela}-${index}`}
                className="bg-card border rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate mb-1">
                      {titulo.parceiro}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Nº {titulo.nroTitulo}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end ml-2">
                    <Badge className={`text-[10px] px-1.5 py-0.5 ${titulo.tipo === 'Real' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                      {titulo.tipo}
                    </Badge>
                    <Badge className={`text-[10px] px-1.5 py-0.5 ${titulo.status === 'Baixado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {titulo.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valor</span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(titulo.valor)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Vencimento</span>
                    <span className="text-xs font-medium text-foreground">{formatDate(titulo.dataVencimento)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop - Table */}
        <div className="hidden md:block md:rounded-lg md:border md:shadow md:bg-card">
          <div className="overflow-x-auto md:overflow-y-auto md:max-h-[calc(100vh-400px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                <tr>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight">
                    Nº Título
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight">
                    Parceiro
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight">
                    Valor
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight hidden lg:table-cell">
                    Vencimento
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight hidden xl:table-cell">
                    Negociação
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight">
                    Tipo
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-2 md:px-6 py-8 md:py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        <p className="text-sm font-medium text-muted-foreground">Carregando títulos...</p>
                      </div>
                    </td>
                  </tr>
                ) : titulos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 md:px-6 py-8 text-center text-sm text-muted-foreground">
                      Nenhum título encontrado. Use os filtros acima para buscar.
                    </td>
                  </tr>
                ) : (
                  titulos.map((titulo, index) => (
                    <tr key={`titulo-${titulo.nroTitulo}-${titulo.numeroParcela}-${index}`} className="hover:bg-muted/50 transition-colors">
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm font-medium text-foreground">{titulo.nroTitulo}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm text-foreground max-w-[200px] truncate">{titulo.parceiro}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm font-semibold text-foreground">{formatCurrency(titulo.valor)}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm text-foreground hidden lg:table-cell">{formatDate(titulo.dataVencimento)}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm text-foreground hidden xl:table-cell">{formatDate(titulo.dataNegociacao)}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm">
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${titulo.tipo === 'Real' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                          {titulo.tipo}
                        </Badge>
                      </td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm">
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${titulo.status === 'Baixado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {titulo.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}