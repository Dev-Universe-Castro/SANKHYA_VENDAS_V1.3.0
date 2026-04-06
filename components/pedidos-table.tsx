"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import PedidoVendaRapido from "@/components/pedido-venda-rapido"

interface Pedido {
  NUNOTA: number
  PARCEIRO: string
  VENDEDOR: string
  DTNEG: string
  VLRNOTA: number
}

export default function PedidosTable() {
  const [searchNunota, setSearchNunota] = useState("")
  const [searchParceiro, setSearchParceiro] = useState("")
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [showNovoPedidoModal, setShowNovoPedidoModal] = useState(false)

  const loadPedidos = async () => {
    try {
      setLoading(true)

      // Sempre ler do IndexedDB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const pedidosLocal = await OfflineDataService.getPedidos()

      if (pedidosLocal.length > 0) {
        // Aplicar filtros no cache
        let filteredPedidos = pedidosLocal;

        if (searchNunota || searchParceiro) {
          filteredPedidos = pedidosLocal.filter(p => {
            const matchNunota = !searchNunota || p.NUNOTA?.toString().includes(searchNunota);
            const matchParceiro = !searchParceiro || p.PARCEIRO?.toLowerCase().includes(searchParceiro.toLowerCase());
            return matchNunota && matchParceiro;
          });
        }

        setPedidos(filteredPedidos);
        console.log(`✅ ${filteredPedidos.length} pedido(s) encontrado(s) no IndexedDB`);

        if (filteredPedidos.length > 0) {
          toast({
            title: "Sucesso",
            description: `${filteredPedidos.length} pedido(s) encontrado(s)`,
          });
        } else {
          toast({
            title: "Nenhum resultado",
            description: "Nenhum pedido foi encontrado com os filtros aplicados",
          });
        }
        return;
      } else {
        console.log('⚠️ Nenhum dado em cache');
        toast({
          title: "Sem dados",
          description: "Nenhum pedido encontrado. Sincronize na tela de configurações.",
          variant: "default",
        });
        setPedidos([]);
      }

    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
      toast({
        title: "Erro",
        description: "Erro ao buscar pedidos.",
        variant: "destructive",
      })
      setPedidos([])
    } finally {
      setLoading(false)
    }
  }

  // NÃO carregar dados automaticamente ao montar o componente
  useEffect(() => {
    console.log('✅ Componente de pedidos montado. Use os filtros e clique em "Buscar Pedidos".');
  }, []);

  // Remover handleSearchKeyPress - filtros só aplicam ao clicar no botão

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'

    // Se já está no formato DD/MM/YYYY, retornar direto
    if (dateString.includes('/')) {
      return dateString
    }

    // Senão, tentar converter
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('pt-BR')
  }

  const handleNovoPedidoSucesso = () => {
    setShowNovoPedidoModal(false)
    toast({
      title: "Sucesso",
      description: "Pedido criado com sucesso!",
    })
    // Recarregar pedidos se houver filtros aplicados
    loadPedidos()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Desktop */}
      <div className="hidden md:block border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pedidos de Venda</h1>
            <p className="text-muted-foreground">
              Consulta de pedidos de venda
            </p>
          </div>
          <Button
            onClick={() => setShowNovoPedidoModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </div>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">Pedidos</h1>
          <Button
            onClick={() => setShowNovoPedidoModal(true)}
            className="bg-green-600 hover:bg-green-700 h-8"
            size="sm"
          >
            <Plus className="w-3 h-3 mr-1" />
            Novo
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Consulta de pedidos de venda
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
                <Label htmlFor="searchNunota" className="text-xs md:text-sm font-medium">
                  Número do Pedido
                </Label>
                <Input
                  id="searchNunota"
                  type="text"
                  placeholder="Buscar por NUNOTA"
                  value={searchNunota}
                  onChange={(e) => setSearchNunota(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="searchParceiro" className="text-xs md:text-sm font-medium">
                  Nome do Parceiro
                </Label>
                <Input
                  id="searchParceiro"
                  type="text"
                  placeholder="Buscar por parceiro"
                  value={searchParceiro}
                  onChange={(e) => setSearchParceiro(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 md:self-end">
                <Label className="text-xs md:text-sm font-medium opacity-0 hidden md:block">Ação</Label>
                <Button
                  onClick={loadPedidos}
                  disabled={loading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Buscando...' : 'Buscar Pedidos'}
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
                  <Label htmlFor="searchNunotaMobile" className="text-xs md:text-sm font-medium">
                    Número do Pedido
                  </Label>
                  <Input
                    id="searchNunotaMobile"
                    type="text"
                    placeholder="Buscar por NUNOTA"
                    value={searchNunota}
                    onChange={(e) => setSearchNunota(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="searchParceiroMobile" className="text-xs md:text-sm font-medium">
                    Nome do Parceiro
                  </Label>
                  <Input
                    id="searchParceiroMobile"
                    type="text"
                    placeholder="Buscar por parceiro"
                    value={searchParceiro}
                    onChange={(e) => setSearchParceiro(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>

                <Button
                  onClick={loadPedidos}
                  disabled={loading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Buscando...' : 'Buscar Pedidos'}
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Lista de Pedidos - Mobile Cards / Desktop Table */}
      <div className="flex-1 overflow-auto p-0 md:p-6 mt-4 md:mt-0">
        {/* Mobile - Cards */}
        <div className="md:hidden px-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-sm font-medium text-muted-foreground">Buscando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum pedido carregado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Use os filtros acima e clique em "Buscar Pedidos"
              </p>
            </div>
          ) : (
            pedidos.map((pedido) => (
              <div
                key={pedido.NUNOTA}
                className="bg-card border rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate mb-1">
                      {pedido.PARCEIRO}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Pedido Nº {pedido.NUNOTA}
                    </p>
                  </div>
                  <div className="ml-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(pedido.VLRNOTA)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Vendedor</span>
                    <span className="text-xs font-medium text-foreground">{pedido.VENDEDOR}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Data Negociação</span>
                    <span className="text-xs font-medium text-foreground">{formatDate(pedido.DTNEG)}</span>
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
                    NUNOTA
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight">
                    Parceiro
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight hidden lg:table-cell">
                    Vendedor
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-left text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight hidden xl:table-cell">
                    Data Negociação
                  </th>
                  <th className="px-2 md:px-6 py-2 md:py-4 text-right text-[11px] md:text-sm font-semibold text-white uppercase tracking-tight">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-2 md:px-6 py-8 md:py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        <p className="text-sm font-medium text-muted-foreground">Buscando pedidos...</p>
                      </div>
                    </td>
                  </tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 md:px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-12 h-12 text-muted-foreground/50" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Nenhum pedido carregado
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use os filtros acima e clique em "Buscar Pedidos"
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pedidos.map((pedido) => (
                    <tr key={pedido.NUNOTA} className="hover:bg-muted/50 transition-colors">
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm font-medium text-foreground">{pedido.NUNOTA}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm text-foreground">{pedido.PARCEIRO}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm text-foreground hidden lg:table-cell">{pedido.VENDEDOR}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm text-foreground hidden xl:table-cell">{formatDate(pedido.DTNEG)}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-[11px] md:text-sm text-right font-semibold text-foreground">{formatCurrency(pedido.VLRNOTA)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Novo Pedido */}
      <PedidoVendaRapido
        isOpen={showNovoPedidoModal}
        onClose={() => setShowNovoPedidoModal(false)}
      />
    </div>
  )
}