"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Grid3x3, List, Eye, Flame } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OfflineDataService } from "@/lib/offline-data-service"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { resolveBestPolicy, resolveAllApplicablePolicies, PolicyContext } from "@/lib/policy-engine"
import { PoliticaComercial } from "@/lib/politicas-comerciais-service"
import { ProdutoDetalhesModal } from "@/components/produto-detalhes-modal"

interface CatalogoProdutosPedidoProps {
  onAdicionarItem: (produto: any, quantidade: number, desconto?: number) => void
  tabelaPreco?: string
  tabelasPrecos?: any[]
  itensCarrinho: any[]
  onAbrirCarrinho?: () => void
  isPedidoLeadMobile?: boolean
  codParc?: string | number
  isLeadMode?: boolean
  idEmpresa?: string | number
  codEmp?: number
  codTipVenda?: number
  codVend?: number
  codEquipe?: number
}

export function CatalogoProdutosPedido({
  onAdicionarItem,
  tabelaPreco,
  tabelasPrecos = [],
  itensCarrinho = [],
  onAbrirCarrinho,
  isPedidoLeadMobile = false,
  codParc,
  isLeadMode = false,
  idEmpresa,
  codEmp,
  codTipVenda,
  codVend,
  codEquipe
}: CatalogoProdutosPedidoProps) {
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODAS")
  const [categorias, setCategorias] = useState<string[]>([])
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [produtoPrecos, setProdutoPrecos] = useState<any>(null)
  const [showPrecosModal, setShowPrecosModal] = useState(false)
  const [showProdutoDetalhes, setShowProdutoDetalhes] = useState(false)
  const [produtoDetalhes, setProdutoDetalhes] = useState<any>(null)
  const [imagensCarregadas, setImagensCarregadas] = useState<Record<string, string>>({})
  const [loadingImagens, setLoadingImagens] = useState<Record<string, boolean>>({})

  const ITENS_POR_PAGINA = 12

  useEffect(() => {
    carregarProdutos()
  }, [tabelaPreco, codParc])

  /* REMOVIDO: Carregamento antecipado de preços causava lentidão e spam de logs.
     Preço agora é carregado apenas ao clicar no produto (ConfiguracaoProdutoModal).
  const carregarPrecosEmChunks = async (produtosIniciais: any[], nutab: number) => {
    ...
  };
  */

  const carregarProdutos = async () => {
    setLoading(true)
    try {
      const produtosData = await OfflineDataService.getProdutos()

      // Buscar campanhas ativas para marcar produtos
      const campanhasAtivas = await OfflineDataService.getCampanhas()
      const itensCampanhaPromises = campanhasAtivas.map(c => OfflineDataService.getItensCampanha(c.ID_CAMPANHA))
      const todosItensCampanha = (await Promise.all(itensCampanhaPromises)).flat()

      const codsProdComCampanha = new Set(todosItensCampanha.map(i => String(i.CODPROD)))

      const produtosComDados = produtosData.map((produto: any) => ({
        ...produto,
        preco: parseFloat(produto.AD_VLRUNIT || 0),
        TEM_CAMPANHA: codsProdComCampanha.has(String(produto.CODPROD))
      }))

      setProdutos(produtosComDados)
      setLoading(false)

      const categoriasUnicas = [...new Set(produtosComDados.map(p => p.MARCA || 'SEM MARCA').filter(Boolean))] as string[]
      setCategorias(['TODAS', ...categoriasUnicas.sort()])

      // NOTA: Preços não são mais carregados antecipadamente.
      // A política e a tabela de preços serão resolvidas apenas no clique "Adicionar".

    } catch (error) {
      console.error('Erro:', error)
      setLoading(false)
    }
  }

  const normalizarTexto = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(produto => {
      const buscaNormalizada = normalizarTexto(buscaAplicada)
      const matchBusca = buscaAplicada === "" ||
        normalizarTexto(produto.DESCRPROD || '').includes(buscaNormalizada) ||
        produto.CODPROD?.toString().includes(buscaAplicada)
      const matchCategoria = categoriaFiltro === "TODAS" || (produto.MARCA || 'SEM MARCA') === categoriaFiltro
      return matchBusca && matchCategoria
    })
  }, [produtos, buscaAplicada, categoriaFiltro])

  const totalPaginas = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA)
  const produtosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA
    return produtosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [produtosFiltrados, paginaAtual])

  useEffect(() => { setPaginaAtual(1) }, [buscaAplicada, categoriaFiltro])

  const handleSelecionarProdutoConfig = async (produto: any) => {
    onAdicionarItem(produto, 1, 0)
  }

  const handleVerPrecos = async (produto: any) => {
    try {
      const tabelasConfig = await OfflineDataService.getTabelasPrecosConfig()
      const allTabelas = await OfflineDataService.getTabelasPrecos()

      // Combinar tabelas de configuração com todas as tabelas
      const tabelasParaConsultar = tabelasPrecos.length > 0 ? [...tabelasPrecos] : (tabelasConfig.length > 0 ? [...tabelasConfig] : [...allTabelas]);

      // GARANTIR que a tabela selecionada (via Política/Parceiro) esteja na lista de consulta
      if (tabelaPreco) {
        const exists = tabelasParaConsultar.find(t => String(t.NUTAB) === String(tabelaPreco));
        if (!exists) {
          const target = allTabelas.find(t => String(t.NUTAB) === String(tabelaPreco));
          if (target) {
            console.log('➕ Adicionando tabela da política à consulta de preços:', target.DESCRICAO);
            tabelasParaConsultar.push(target);
          }
        }
      }

      const precosData = await Promise.all(tabelasParaConsultar.map(async (tabela: any) => {
        const precos = await OfflineDataService.getPrecos(Number(produto.CODPROD))
        const pr = precos.find(p => Number(p.NUTAB) === Number(tabela.NUTAB))
        return {
          tabela: tabela.DESCRICAO || `Tabela ${tabela.CODTAB}`,
          preco: pr?.VLRVENDA ? parseFloat(String(pr.VLRVENDA).replace(/,/g, '.')) : 0,
          nutab: tabela.NUTAB
        }
      }))

      // Filtrar preços > 0 OU se for a tabela selecionada (Política/Parceiro)
      setProdutoPrecos({
        produto,
        precos: precosData.filter(p => p.preco > 0 || String(p.nutab) === String(tabelaPreco))
      })
      setShowPrecosModal(true)
    } catch (e) {
      console.error('Erro ao buscar preços:', e);
      toast.error('Erro ao buscar preços');
    }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const handleConfirmarProduto = (config: any) => {
    // Legado, agora handleAdicionarItem resolve
  }

  const carregarImagemProduto = async (codProd: string | number) => {
    const id = String(codProd)
    if (imagensCarregadas[id] || loadingImagens[id]) return

    setLoadingImagens(prev => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/sankhya/produtos/imagem?codProd=${id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setImagensCarregadas(prev => ({ ...prev, [id]: url }))
      } else {
        // Marca como carregado mas sem imagem (null) para não tentar de novo
        setImagensCarregadas(prev => ({ ...prev, [id]: 'null' }))
      }
    } catch (error) {
      console.error("Erro ao carregar imagem", error)
      setImagensCarregadas(prev => ({ ...prev, [id]: 'null' }))
    } finally {
      setLoadingImagens(prev => ({ ...prev, [id]: false }))
    }
  }

  // Access Control Check
  if (!codParc || !idEmpresa) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-white rounded-3xl border border-[#F2F2F2] shadow-sm p-8">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-[#F2F2F2]">
          <Grid3x3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">Catálogo Bloqueado</h3>
        <p className="text-sm text-center max-w-xs mt-2">
          Selecione um Parceiro e uma Empresa no cabeçalho para visualizar os produtos disponíveis e suas políticas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." value={busca} onChange={(e) => setBusca(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && setBuscaAplicada(busca)} className="pl-10" />
        </div>
        <Button onClick={() => setBuscaAplicada(busca)} className="bg-green-600 hover:bg-green-700">Filtrar</Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
            {produtosPaginados.map((p) => (
              <Card key={p.CODPROD} className="rounded-3xl border-[#F2F2F2] shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
                <CardContent className="p-3 flex flex-col h-full gap-3">
                  {/* Header do Card */}
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] text-muted-foreground font-mono bg-gray-100 px-1.5 py-0.5 rounded">#{p.CODPROD}</p>
                    {p.MARCA && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{p.MARCA}</span>}
                  </div>

                  {/* Selo de Campanha */}
                  {p.TEM_CAMPANHA && (
                    <div className="absolute top-8 -left-1 z-10">
                      <div className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-r-md shadow-sm flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        CAMPANHA
                      </div>
                    </div>
                  )}

                  {/* Imagem Placeholder */}
                  <div className="relative w-full aspect-video bg-gray-50 rounded-md border border-gray-100 flex items-center justify-center overflow-hidden group">
                    {imagensCarregadas[String(p.CODPROD)] && imagensCarregadas[String(p.CODPROD)] !== 'null' ? (
                      <img 
                        key={`img-${p.CODPROD}`} 
                        src={imagensCarregadas[String(p.CODPROD)]} 
                        alt={p.DESCRPROD} 
                        className="w-full h-full object-contain p-2" 
                        onError={() => {
                          console.warn(`🖼️ [CATÁLOGO] Falha ao renderizar imagem do produto ${p.CODPROD}. Revertendo para Avatar.`);
                          setImagensCarregadas(prev => ({ ...prev, [String(p.CODPROD)]: 'null' }));
                        }}
                      />
                    ) : (
                      <div key={`info-${p.CODPROD}`} className="flex flex-col items-center justify-center gap-2 text-gray-300">
                        {loadingImagens[String(p.CODPROD)] ? (
                          <div key={`load-${p.CODPROD}`} className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div key={`avatar-${p.CODPROD}`} className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shadow-sm border border-green-200">
                            <span className="text-2xl font-bold text-green-700">
                              {p.DESCRPROD?.substring(0, 1).toUpperCase() || p.nome?.substring(0, 1).toUpperCase() || 'P'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão Ver Imagem (Overlay) */}
                    {(!imagensCarregadas[String(p.CODPROD)] && !loadingImagens[String(p.CODPROD)]) && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center cursor-pointer" onClick={() => carregarImagemProduto(p.CODPROD)}>
                        <Button variant="ghost" size="sm" className="hidden group-hover:flex bg-white/80 hover:bg-white text-xs h-7 shadow-sm">
                          <Eye className="w-3 h-3 mr-1.5" /> Ver Imagem
                        </Button>
                      </div>
                    )}
                  </div>

                  <h4 className="font-semibold text-xs md:text-sm line-clamp-2 min-h-[36px] items-center flex" title={p.DESCRPROD}>
                    {p.DESCRPROD}
                  </h4>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setProdutoDetalhes(p); setShowProdutoDetalhes(true) }}
                      className="h-8 text-xs px-0"
                    >
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSelecionarProdutoConfig(p)}
                      className="bg-green-600 hover:bg-green-700 h-8 text-xs px-0"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && totalPaginas > 1 && (
          <div className="flex justify-center gap-2 mt-6 pb-4">
            <Button variant="outline" size="sm" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)}>Anterior</Button>
            <span className="text-sm self-center">Pág {paginaAtual} / {totalPaginas}</span>
            <Button variant="outline" size="sm" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </ScrollArea>

      {/* Modal removido - centralizado no PedidoVendaFromLead */}

      <Dialog open={showPrecosModal} onOpenChange={setShowPrecosModal}>
        <DialogContent><DialogHeader><DialogTitle>Tabelas de Preço</DialogTitle></DialogHeader>
          <div className="space-y-2">{produtoPrecos?.precos.map((p: any, i: number) => (<div key={i} className="flex justify-between p-2 border-b last:border-0"><span className="text-sm">{p.tabela}</span><span className="font-bold text-green-600">{formatCurrency(p.preco)}</span></div>))}</div>
        </DialogContent>
      </Dialog>

      <ProdutoDetalhesModal
        produto={produtoDetalhes}
        isOpen={showProdutoDetalhes}
        onClose={() => setShowProdutoDetalhes(false)}
      />
    </div>
  )
}
