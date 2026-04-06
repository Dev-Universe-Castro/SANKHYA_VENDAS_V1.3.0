"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ChevronLeft, ChevronRight, Package, Eye, ChevronDown, ChevronUp, WifiOff, X, RefreshCw, Boxes, Scale, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { OfflineDataService } from '@/lib/offline-data-service'
import { ProdutoDetalhesModal } from "@/components/produto-detalhes-modal"
import { EstoqueRapidoModal } from "@/components/estoque-rapido-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


interface Produto {
  _id: string
  CODPROD: string
  DESCRPROD: string
  ATIVO: string
  LOCAL?: string
  MARCA?: string
  CARACTERISTICAS?: string
  UNIDADE?: string
  VLRCOMERC?: string
  ESTOQUE?: string
  estoqueTotal?: number // Adicionado para o modal
  preco?: number       // Adicionado para o modal
  estoques?: any[]     // Adicionado para o modal
}

interface PaginatedResponse {
  produtos: Produto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ITEMS_PER_PAGE = 10

export default function ProductsTable() {
  const [produtos, setProdutos] = useState<any[]>([])
  const [produtosFiltrados, setProdutosFiltrados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState("")
  const [searchCode, setSearchCode] = useState("")
  const [appliedSearchName, setAppliedSearchName] = useState("") // Estado para o nome de busca aplicado
  const [appliedSearchCode, setAppliedSearchCode] = useState("") // Estado para o código de busca aplicado
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const { toast } = useToast()
  const loadingRef = useRef(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false) // Estado para controlar filtros colapsáveis
  const [isOffline, setIsOffline] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [showEstoqueModal, setShowEstoqueModal] = useState(false)


  useEffect(() => {
    // Inicializar o estado offline apenas no cliente para evitar hydration mismatch
    setIsOffline(!navigator.onLine)

    const handleOnline = () => {
      console.log("✅ Conexão restabelecida!")
      setIsOffline(false)
      // Tenta recarregar os produtos quando a conexão volta
      loadProducts().finally(() => {
        toast({
          title: "Conectado",
          description: "Sua conexão foi restabelecida. Os dados foram atualizados.",
          variant: "default",
        });
      })
    }
    const handleOffline = () => {
      console.log("⚠️ Modo Offline!")
      setIsOffline(true)
      // Ao ficar offline, carrega os dados do cache local
      loadProducts().finally(() => {
        toast({
          title: "Modo Offline",
          description: "Você está sem conexão. Exibindo dados em cache.",
          variant: "default",
        });
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verifica o estado inicial da conexão ao montar o componente
    if (navigator.onLine) {
      handleOnline()
    } else {
      handleOffline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])


  useEffect(() => {
    if (loadingRef.current) {
      console.log('⏭️ Pulando requisição duplicada (Strict Mode)')
      return
    }

    loadingRef.current = true
    loadProducts().finally(() => {
      loadingRef.current = false
    })
  }, [currentPage, isOffline]) // Requisita novamente se a página ou o status offline mudar


  // Carregar produtos do cache ao montar o componente (apenas se já estiver offline)
  useEffect(() => {
    if (isOffline) {
      const cached = sessionStorage.getItem('cached_produtos');
      if (cached) {
        try {
          const parsedData = JSON.parse(cached)
          const allProdutos = Array.isArray(parsedData) ? parsedData : (parsedData.produtos || [])

          if (allProdutos.length > 0) {
            console.log('✅ Carregando produtos iniciais do cache (offline):', allProdutos.length)
            setProdutos(allProdutos.slice(0, ITEMS_PER_PAGE));
            setTotalPages(Math.ceil(allProdutos.length / ITEMS_PER_PAGE));
            setTotalRecords(allProdutos.length);
            setLoading(false); // Altera o estado de loading
          }
        } catch (e) {
          console.error('Erro ao carregar cache inicial de produtos (offline):', e)
          sessionStorage.removeItem('cached_produtos');
        }
      } else {
        // Se não houver cache e estiver offline, tenta carregar do serviço offline
        loadProductsOfflineFallback();
      }
    }
  }, [isOffline]); // Executa apenas uma vez ao montar o componente ou quando o status offline muda para true





  // Função para aplicar filtros ao clicar no botão
  const handleSearch = () => {
    setAppliedSearchName(searchName)
    setAppliedSearchCode(searchCode)
    setCurrentPage(1)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }


  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
    }
  }

  // Estado para gerenciar o carregamento e URL das imagens
  const [produtoImagens, setProdutoImagens] = useState<{ [key: string]: { url: string | null, loading: boolean, loaded: boolean } }>({})

  const buscarImagemProduto = async (codProd: string) => {
    if (produtoImagens[codProd]?.loaded || produtoImagens[codProd]?.loading) return;

    setProdutoImagens(prev => ({
      ...prev,
      [codProd]: { url: null, loading: true, loaded: false }
    }))

    try {
      const response = await fetch(`/api/sankhya/produtos/imagem?codProd=${codProd}`)
      if (response.ok) {
        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        setProdutoImagens(prev => ({
          ...prev,
          [codProd]: { url: imageUrl, loading: false, loaded: true }
        }))
      } else {
        setProdutoImagens(prev => ({
          ...prev,
          [codProd]: { url: null, loading: false, loaded: true }
        }))
      }
    } catch (error) {
      setProdutoImagens(prev => ({
        ...prev,
        [codProd]: { url: null, loading: false, loaded: true }
      }))
    }
  }

  // Função para carregar produtos do IndexedDB e aplicar filtros
  const loadProducts = async (retryCount = 0) => {
    try {
      setLoading(true)

      console.log('📦 Carregando produtos do IndexedDB...')

      // Buscar TODOS os produtos do IndexedDB
      const todosProdutos = await OfflineDataService.getProdutos()

      if (todosProdutos.length === 0) {
        if (retryCount < 3) {
          console.warn(`⚠️ Nenhum produto encontrado. Tentativa ${retryCount + 1} de 3...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return loadProducts(retryCount + 1)
        }
        console.warn('⚠️ Nenhum produto encontrado no IndexedDB após retentativas')
        setProdutos([])
        setTotalRecords(0)
        setTotalPages(0)
        setProdutosFiltrados([])
        return
      }

      // Carregar produtos
      setProdutos(todosProdutos)
      console.log(`✅ ${todosProdutos.length} produtos carregados do IndexedDB`)

      // Aplicar filtros localmente com base nos termos aplicados
      aplicarFiltros(todosProdutos, currentPage)

    } catch (error) {
      console.error('❌ Erro ao carregar produtos do IndexedDB:', error)
      setProdutos([])
      setProdutosFiltrados([])
    } finally {
      setLoading(false)
    }
  }

  // Fallback para carregar produtos do serviço offline (se aplicável)
  const loadProductsOfflineFallback = async () => {
    console.warn("⚠️ Tentando carregar produtos do serviço offline como fallback...")
    // Implemente a lógica de carregamento do serviço offline aqui, se necessário
    // Por enquanto, apenas exibe um aviso
    toast({
      title: "Modo Offline",
      description: "Não foi possível carregar dados do cache. Verifique sua conexão.",
      variant: "destructive",
    });
  }

  // Nova função para aplicar filtros localmente e gerenciar paginação
  const aplicarFiltros = (todosProdutos: any[], page: number) => {
    let produtosFiltrados = [...todosProdutos]

    // Filtrar por nome aplicado
    if (appliedSearchName.trim()) {
      const searchLower = appliedSearchName.toLowerCase()
      produtosFiltrados = produtosFiltrados.filter(p =>
        p.DESCRPROD?.toLowerCase().includes(searchLower)
      )
    }

    // Filtrar por código aplicado
    if (appliedSearchCode.trim()) {
      produtosFiltrados = produtosFiltrados.filter(p =>
        p.CODPROD?.toString().includes(appliedSearchCode)
      )
    }

    // Paginação
    const total = produtosFiltrados.length
    const totalPgs = Math.ceil(total / ITEMS_PER_PAGE)
    const startIdx = (page - 1) * ITEMS_PER_PAGE
    const endIdx = startIdx + ITEMS_PER_PAGE
    const produtosPaginados = produtosFiltrados.slice(startIdx, endIdx)

    setProdutosFiltrados(produtosPaginados)
    setTotalRecords(total)
    setTotalPages(totalPgs)
    setCurrentPage(page)

    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, total)

    console.log(`📊 Filtros aplicados: ${total} produtos encontrados (exibindo ${produtosPaginados.length})`)
  }

  // Carrega produtos iniciais ao montar o componente
  useEffect(() => {
    loadProducts()
  }, []) // Executa apenas uma vez ao montar

  // Aplica filtros quando os termos de busca ATUAIS (aplicados) mudam
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (produtos.length > 0) {
        // Aplica filtros com base nos termos JÁ DEFINIDOS (appliedSearchName, appliedSearchCode)
        aplicarFiltros(produtos, 1) // Reseta para a página 1 ao mudar filtros aplicados
      } else {
        loadProducts() // Carrega produtos se a lista estiver vazia
      }
    }, 500) // Atraso de 500ms para debounce

    return () => clearTimeout(delayDebounceFn)
  }, [appliedSearchName, appliedSearchCode]) // Depende dos termos de busca aplicados

  // Atualiza a lista de produtos exibidos quando a paginação muda
  useEffect(() => {
    // Só aplica filtros se houver produtos carregados
    if (produtos.length > 0) {
      aplicarFiltros(produtos, currentPage)
    }
  }, [currentPage, produtos.length]) // Depende da página e do tamanho da lista de produtos

  const abrirModal = (produto: any) => {
    setProdutoSelecionado(produto)
    setShowDetalhesModal(true)
  }

  const abrirEstoqueRapido = (produto: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setProdutoSelecionado(produto)
    setShowEstoqueModal(true)
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
      '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
      '#A855F7', '#EC4899', '#F43F5E'
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  }

  // Filtra produtos com base no termo de busca, considerando todos os campos relevantes
  // Esta parte parece redundante com aplicarFiltros, mas pode ser usada para pré-visualização
  const filteredProducts = searchName || searchCode
    ? produtosFiltrados.filter(produto =>
      (searchCode ? produto.CODPROD?.toString().includes(searchCode) : true) &&
      (searchName ? produto.DESCRPROD?.toLowerCase().includes(searchName.toLowerCase()) : true)
    )
    : produtosFiltrados; // Usa a lista já filtrada e paginada

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden scrollbar-hide">

      {/* Header - Desktop */}
      <div className="hidden md:block p-6 bg-transparent">
        <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Produtos</h1>
        <p className="text-[#1E5128]/70 mt-1">
          Consulte o catálogo de produtos e disponibilidade de estoque
        </p>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden px-4 py-4 bg-transparent border-b border-black/5">
        <h1 className="text-xl font-bold text-[#1E5128]">Produtos</h1>
        <p className="text-sm text-[#1E5128]/70 mt-1">
          Controle de produtos e pesos
        </p>
      </div>

      <Tabs defaultValue="produtos" className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs Row */}
        <div className="px-4 md:px-6 py-2">
          <TabsList className="grid w-full md:w-[200px] grid-cols-1 h-11 p-1 bg-white border border-[#F2F2F2] rounded-full shadow-sm">
            <TabsTrigger 
              value="produtos" 
              className="text-xs sm:text-sm font-semibold transition-all rounded-full data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Package className="w-4 h-4 mr-2 hidden sm:inline" />
              Produtos
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="produtos" className="h-full flex flex-col m-0 border-none shadow-none outline-none data-[state=inactive]:hidden">
            {/* Filtros de Busca - Desktop */}
            <div className="hidden md:block px-4 md:px-6 py-2">
              <Card className="rounded-2xl border-[#F2F2F2] shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-[#F2F2F2] bg-slate-50/50 py-3">
                  <CardTitle className="text-sm font-bold text-[#1E5128]">Filtros de Busca</CardTitle>
                </CardHeader>
                <CardContent className="p-4 bg-white grid gap-4 md:grid-cols-3 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="searchCode" className="text-xs font-bold text-slate-500 uppercase">
                      Código
                    </Label>
                    <Input
                      id="searchCode"
                      type="text"
                      placeholder="Ex: 1234..."
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="h-10 border-[#F2F2F2] bg-slate-50/50 focus-visible:ring-[#76BA1B]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="searchName" className="text-xs font-bold text-slate-500 uppercase">
                      Nome ou Descrição
                    </Label>
                    <Input
                      id="searchName"
                      type="text"
                      placeholder="Buscar por descrição..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="h-10 border-[#F2F2F2] bg-slate-50/50 focus-visible:ring-[#76BA1B]"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Button onClick={handleSearch} disabled={loading} className="w-full h-10 bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold rounded-xl shadow-md transition-all">
                      <Search className="w-4 h-4 mr-2" /> {loading ? 'Buscando...' : 'Buscar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros de Busca - Mobile (Colapsável) */}
            <div className="md:hidden">
              <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#F2F2F2]">
                  <span className="text-sm font-bold text-[#1E5128]">Filtros de Busca</span>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-50">
                      {filtrosAbertos ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="border-b border-[#F2F2F2] bg-slate-50/50">
                  <div className="p-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="searchCodeMobile" className="text-xs font-bold text-slate-500 uppercase">
                        Código
                      </Label>
                      <div className="relative">
                        <Input
                          id="searchCodeMobile"
                          type="text"
                          placeholder="Buscar por código"
                          value={searchCode}
                          onChange={(e) => setSearchCode(e.target.value)}
                          onKeyPress={handleSearchKeyPress}
                          className="h-10 pr-9 text-sm bg-white border-[#F2F2F2] rounded-xl"
                        />
                        {searchCode && (
                          <button
                            onClick={() => setSearchCode("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="searchNameMobile" className="text-xs font-bold text-slate-500 uppercase">
                        Descrição
                      </Label>
                      <div className="relative">
                        <Input
                          id="searchNameMobile"
                          type="text"
                          placeholder="Buscar por descrição..."
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          onKeyPress={handleSearchKeyPress}
                          className="h-10 pr-9 text-sm bg-white border-[#F2F2F2] rounded-xl"
                        />
                        {searchName && (
                          <button
                            onClick={() => setSearchName("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchName("")
                          setSearchCode("")
                          setAppliedSearchName("")
                          setAppliedSearchCode("")
                          setCurrentPage(1)
                          setFiltrosAbertos(false)
                        }}
                        className="flex-1 h-10 text-sm font-bold border-[#F2F2F2] rounded-xl hover:bg-slate-50"
                      >
                        Limpar
                      </Button>
                      <Button
                        onClick={() => {
                          handleSearch()
                          setFiltrosAbertos(false)
                        }}
                        disabled={loading}
                        className="flex-[2] h-10 text-sm font-bold bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md transition-all"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        {loading ? 'Buscando...' : 'Aplicar Filtros'}
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {(appliedSearchName || appliedSearchCode) && (
              <div className="md:hidden flex items-center gap-2 p-2 bg-green-50/50 border-b overflow-x-auto whitespace-nowrap scrollbar-hide">
                <span className="text-[10px] font-bold text-green-700 uppercase ml-2">Ativos:</span>
                {appliedSearchCode && (
                  <Badge variant="secondary" className="bg-white text-green-700 border-green-200 text-[10px] py-0 px-2 flex items-center gap-1">
                    Cód: {appliedSearchCode}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        setSearchCode("")
                        setAppliedSearchCode("")
                        setCurrentPage(1)
                      }}
                    />
                  </Badge>
                )}
                {appliedSearchName && (
                  <Badge variant="secondary" className="bg-white text-green-700 border-green-200 text-[10px] py-0 px-2 flex items-center gap-1">
                    Ref: {appliedSearchName}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        setSearchName("")
                        setAppliedSearchName("")
                        setCurrentPage(1)
                      }}
                    />
                  </Badge>
                )}
              </div>
            )}

            {/* Lista de Produtos - Grid Responsivo */}
            <div className="flex-1 overflow-auto p-4 md:p-6 mt-4 md:mt-0">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-sm font-medium text-muted-foreground">Carregando produtos...</p>
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4 text-center px-6">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <WifiOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Nenhum produto encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      {isOffline
                        ? "Você está offline e o cache local está vazio. É necessária uma primeira carga com internet para acessar os dados."
                        : "Não foi possível encontrar nenhum produto no sistema."}
                    </p>
                  </div>
                  {isOffline && (
                    <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Tentar Recarregar
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Grid Desktop */}
                  <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {produtosFiltrados.map((product) => {
                      const avatarColor = getAvatarColor(product.DESCRPROD || 'P');
                      const initials = (product.DESCRPROD || 'P')
                        .split(' ')
                        .filter((word: string) => word.length > 0)
                        .slice(0, 2)
                        .map((word: string) => word[0])
                        .join('')
                        .toUpperCase();

                      return (
                        <Card key={product._id || product.CODPROD} className="group hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl border-[#F2F2F2]">
                          <div className="relative">
                            {/* Imagem do Produto ou Placeholder */}
                            <div className="w-full h-32 bg-slate-50 border-b border-[#F2F2F2] flex flex-col items-center justify-center overflow-hidden">
                              {produtoImagens[product.CODPROD]?.url ? (
                                <img
                                  key={`img-${product.CODPROD}`}
                                  src={produtoImagens[product.CODPROD].url!}
                                  alt={product.DESCRPROD}
                                  className="w-full h-full object-contain p-2"
                                />
                              ) : produtoImagens[product.CODPROD]?.loading ? (
                                <div key={`loading-${product.CODPROD}`} className="w-6 h-6 border-2 border-[#76BA1B] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <div key={`placeholder-${product.CODPROD}`} className="flex flex-col items-center">
                                  <div className="text-4xl text-slate-300 font-bold">
                                    {product.DESCRPROD?.charAt(0).toUpperCase() || 'P'}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => buscarImagemProduto(product.CODPROD)}
                                    className="text-[10px] text-[#1E5128] hover:text-[#1E5128] hover:bg-[#76BA1B]/10 h-auto py-1 px-2 mt-1 rounded-full font-bold"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Abrir imagem
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <CardContent className="p-3 space-y-2 relative">
                            {/* Status Badge */}
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-1.5 h-1.5 bg-[#76BA1B] rounded-full shadow-sm shadow-[#76BA1B]/40"></div>
                              <span className="text-[9px] font-bold text-[#1E5128]/70 uppercase tracking-wider">Ativo</span>
                            </div>

                            {/* Nome e Código */}
                            <div>
                              <h3 className="font-bold text-xs text-[#1E5128] line-clamp-2 min-h-[2rem] leading-tight title-text-shadow">
                                {product.DESCRPROD}
                              </h3>
                              <p className="text-[10px] font-mono text-slate-400 mt-1">
                                Ref: {product.CODPROD}
                              </p>
                            </div>

                            {/* Informações adicionais */}
                            {(product.MARCA || product.UNIDADE) && (
                              <div className="text-[10px] font-medium text-slate-500 space-y-0.5 bg-slate-50 p-1.5 rounded-lg border border-[#F2F2F2]">
                                {product.MARCA && <p><span className="text-slate-400">Marca:</span> {product.MARCA}</p>}
                                {product.UNIDADE && <p><span className="text-slate-400">UN:</span> {product.UNIDADE}</p>}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => abrirEstoqueRapido(product, e)}
                                className="h-8 text-[11px] font-bold border-[#76BA1B] text-[#76BA1B] hover:bg-[#76BA1B]/10 rounded-xl transition-all"
                              >
                                <Boxes className="w-3.5 h-3.5 mr-1" />
                                ESTOQUE
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => abrirModal(product)}
                                className="h-8 text-[11px] font-bold bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md transition-all"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                DETALHES
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Lista Mobile */}
                  <div className="md:hidden space-y-3 pb-10">
                    {produtosFiltrados.map((product) => {
                      const avatarColor = getAvatarColor(product.DESCRPROD || 'P');
                      const initials = (product.DESCRPROD || 'P')
                        .split(' ')
                        .filter((word: string) => word.length > 0)
                        .slice(0, 2)
                        .map((word: string) => word[0])
                        .join('')
                        .toUpperCase();

                      return (
                        <div
                          key={product._id || product.CODPROD}
                          className="bg-white border border-[#F2F2F2] rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex gap-3">
                            {/* Placeholder com inicial */}
                            <div className="w-14 h-14 bg-slate-50 border border-[#F2F2F2] rounded-xl flex items-center justify-center flex-shrink-0">
                                <div className="text-xl text-slate-300 font-bold">
                                    {product.DESCRPROD?.charAt(0).toUpperCase() || 'P'}
                                </div>
                            </div>

                            {/* Informações do Produto */}
                            <div className="flex-1 min-w-0">
                              {/* Status Badge */}
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-1.5 h-1.5 bg-[#76BA1B] rounded-full shadow-sm shadow-[#76BA1B]/40"></div>
                                <span className="text-[9px] font-bold text-[#1E5128]/70 uppercase tracking-wider">Ativo</span>
                              </div>

                              {/* Nome do Produto */}
                              <h3 className="font-bold text-[#1E5128] text-sm line-clamp-2 mb-0.5 leading-tight">
                                {product.DESCRPROD}
                              </h3>

                              {/* Código do Produto */}
                              <p className="text-xs font-mono text-slate-400">
                                Ref: {product.CODPROD}
                              </p>
                            </div>
                          </div>

                          {/* Botões de Ação Mobile */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => abrirEstoqueRapido(product, e)}
                              className="h-9 flex-1 bg-white border-[#76BA1B] text-[#76BA1B] text-[10px] font-bold hover:bg-[#76BA1B]/5 rounded-xl"
                            >
                              <Boxes className="w-3.5 h-3.5 mr-1" />
                              ESTOQUE
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => abrirModal(product)}
                              className="h-9 flex-1 bg-[#76BA1B] hover:bg-[#1E5128] text-white text-[10px] font-bold rounded-xl shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              DETALHES
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalRecords > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-[#F2F2F2] shadow-sm p-4 mx-4 md:mx-6 mb-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center md:text-left">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)} de {totalRecords} Produtos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 h-9 rounded-xl border-[#F2F2F2] text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  <div className="text-xs font-bold text-[#1E5128] bg-[#76BA1B]/10 px-3 py-1.5 rounded-lg border border-[#76BA1B]/20">
                    Página {currentPage} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 h-9 rounded-xl border-[#F2F2F2] text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

        </div>
      </Tabs>

      <ProdutoDetalhesModal
        produto={produtoSelecionado}
        isOpen={showDetalhesModal}
        onClose={() => setShowDetalhesModal(false)}
      />

      <EstoqueRapidoModal
        open={showEstoqueModal}
        onOpenChange={setShowEstoqueModal}
        produto={produtoSelecionado}
      />
    </div>
  )
}