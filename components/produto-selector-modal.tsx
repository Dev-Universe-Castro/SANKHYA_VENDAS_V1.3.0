"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { QuantidadeProdutoModal } from "@/components/quantidade-produto-modal"
import { toast } from "sonner"
import { OfflineDataService } from "@/lib/offline-data-service"; // Import OfflineDataService
import { Eye } from "lucide-react"
import { ProdutoDetalhesModal } from "@/components/produto-detalhes-modal"
import { Button } from "@/components/ui/button"
import { resolveBestPolicy, PolicyContext } from "@/lib/policy-engine"
import { PoliticaComercial } from "@/lib/politicas-comerciais-service"

interface ProdutoSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (produto: any, preco: number, quantidade: number, tabela?: string, desconto?: number, controle?: string, localEstoque?: number, maxDesconto?: number, maxAcrescimo?: number, precoBase?: number, politicaAplicada?: PoliticaComercial) => void
  titulo?: string
  idEmpresa?: string | number
  codParc?: string | number
  codEmp?: number
  codVend?: number
  codTipVenda?: number
  codEquipe?: number
}

interface TabelaPreco {
  NUTAB: number
  CODTAB: number
  DTVIGOR?: string
  PERCENTUAL?: number
  DESCRICAO?: string
  ATIVO?: string
}

interface Produto {
  CODPROD?: string;
  DESCRPROD?: string;
  MARCA?: string;
  CODMARCA?: number;
  CODGRUPOPROD?: number;
  ATIVO?: string;
  AD_VLRUNIT?: number;
  VLRVENDA?: number; // Adicionado para buscar preço base diretamente do produto
  PRECO?: number; // Adicionado para buscar preço base diretamente do produto
}

export function ProdutoSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  titulo = "Adicionar Produto",
  idEmpresa,
  codParc,
  codEmp,
  codVend,
  codTipVenda,
  codEquipe
}: ProdutoSelectorModalProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showEstoqueModal, setShowEstoqueModal] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [produtoEstoque, setProdutoEstoque] = useState<number>(0)
  const [produtoPreco, setProdutoPreco] = useState<number>(0)
  const [tabelasPreco, setTabelasPreco] = useState<any[]>([]) // Guardará CODTABs únicos
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>('') // Agora representará o CODTAB
  const [loadingPreco, setLoadingPreco] = useState(false); // State to track price loading
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [produtoDetalhes, setProdutoDetalhes] = useState<Produto | null>(null)
  const [maxDescontoPolitica, setMaxDescontoPolitica] = useState<number | undefined>(undefined)
  const [maxAcrescimoPolitica, setMaxAcrescimoPolitica] = useState<number | undefined>(undefined)
  const [politicaAplicada, setPoliticaAplicada] = useState<PoliticaComercial | undefined>(undefined)
  const [nutabSelecionado, setNutabSelecionado] = useState<number | undefined>(undefined)


  // Função para normalizar texto (remover acentos)
  const normalizarTexto = (texto: string) => {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  const buscarProdutos = async (termo: string) => {
    console.log('🔍 buscarProdutos chamado com:', termo);

    // Validar se tabela de preço foi selecionada
    if (!tabelaSelecionada || tabelaSelecionada === '') {
      toast.error("Selecione uma tabela de preço antes de buscar produtos")
      return
    }

    if (termo.length < 2) {
      console.log('⚠️ Termo muito curto, limpando lista');
      setProdutos([])
      return
    }

    try {
      setIsLoading(true)
      console.log('⏳ Iniciando busca no cache...');

      // Modo offline - buscar do IndexedDB
      // SEMPRE buscar do IndexedDB (online ou offline)
      console.log('💾 Buscando produtos do IndexedDB...');
      const produtosOffline = await OfflineDataService.getProdutos({ ativo: 'S', search: termo });

      if (produtosOffline.length > 0) {
        const filtered = produtosOffline.slice(0, 20);
        console.log('✅ Produtos encontrados no IndexedDB:', filtered.length);
        setProdutos(filtered);
      } else {
        // Modo online - buscar do cache local (sessionStorage)
        const cachedProdutos = sessionStorage.getItem('cached_produtos')
        if (cachedProdutos) {
          try {
            const parsedData = JSON.parse(cachedProdutos)
            console.log('📦 Tipo de dados do cache:', typeof parsedData, Array.isArray(parsedData))

            const allProdutos = Array.isArray(parsedData) ? parsedData : (parsedData.produtos || [])
            console.log('📊 Total de produtos no cache:', allProdutos.length)

            const termoNormalizado = normalizarTexto(termo)

            const filtered = allProdutos.filter((p: Produto) => {
              const descricaoNormalizada = normalizarTexto(p.DESCRPROD || '')
              const matchDescr = descricaoNormalizada.includes(termoNormalizado)
              const matchCod = p.CODPROD?.toString().includes(termo)
              return matchDescr || matchCod
            }).slice(0, 20)

            console.log('✅ Produtos filtrados:', filtered.length)
            setProdutos(filtered)
          } catch (e) {
            console.error('❌ Erro ao processar cache:', e);
            setProdutos([])
          }
        } else {
          console.warn('⚠️ Cache de produtos não encontrado. Tente novamente.');
          setProdutos([])
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error)
      setProdutos([])
    } finally {
      setIsLoading(false)
      console.log('🏁 Busca finalizada');
    }
  }

  const buscarProdutosComDebounce = (() => {
    let timer: NodeJS.Timeout
    return (termo: string) => {
      console.log('⏱️ Debounce chamado com:', termo);
      clearTimeout(timer)
      timer = setTimeout(() => {
        console.log('✅ Debounce executando busca para:', termo);
        buscarProdutos(termo)
      }, 500)
    }
  })()

  const handleSelecionarProduto = async (produto: Produto) => {
    console.log('🔍 Selecionando produto:', produto.CODPROD, 'Tabela Base (CODTAB):', tabelaSelecionada)
    setProdutoSelecionado(produto)
    setIsLoading(true)

    try {
      // Validar se tabela de preço foi selecionada
      if (!tabelaSelecionada || tabelaSelecionada === '' || tabelaSelecionada === '0') {
        toast.error("Selecione uma tabela de preço antes de adicionar produtos")
        setIsLoading(false)
        return
      }

      // === MOTOR DE POLÍTICAS E RESOLUÇÃO DE TABELA/NUTAB ===
      let preco = 0;
      let nutabFinal = 0;
      let codTabFinal = Number(tabelaSelecionada);

      if (codEmp && codParc) {
        try {
          const politicas = await OfflineDataService.getPoliticas(Number(codEmp));
          const parceiros = await OfflineDataService.getClientesByIds([Number(codParc)]);
          const parceiro = parceiros.length > 0 ? parceiros[0] : null;

          if (parceiro) {
            const context: PolicyContext = {
              codEmp: Number(codEmp),
              codParc: Number(codParc),
              uf: parceiro.UF,
              codCid: parceiro.CODCID,
              codBai: parceiro.CODBAIRRO || parceiro.CODBAI,
              codReg: parceiro.CODREG,
              codProd: Number(produto.CODPROD),
              marca: produto.CODMARCA || produto.MARCA,
              codVend: codVend ? Number(codVend) : Number(parceiro.CODVEND || 0),
              codEquipe: codEquipe ? Number(codEquipe) : undefined,
              grupo: Number(produto.CODGRUPOPROD || 0),
              codTipVenda: codTipVenda ? Number(codTipVenda) : undefined
            };

            const melhorPolitica = resolveBestPolicy(politicas, context);
            if (melhorPolitica) {
              console.log('🏆 [PolicyEngine] Melhor política:', melhorPolitica.NOME_POLITICA);
              setPoliticaAplicada(melhorPolitica);

              // 1. Resolver CODTAB (Regra ICMS vs Política vs Default)
              if (melhorPolitica.PREF_PARCEIRO_EMPRESA === 'S') {
                console.log('🔗 [ICMS] Buscando regra dinâmica para Parceiro/Empresa...');
                const regraIcms = await OfflineDataService.getRegraIcms(Number(codEmp), Number(codParc));
                if (regraIcms?.CODTAB) {
                  codTabFinal = Number(regraIcms.CODTAB);
                  console.log('🔗 [ICMS] CODTAB resolvido via regra ICMS:', codTabFinal);
                } else {
                  console.warn('⚠️ Regra ICMS não encontrada, usando CODTAB da política ou parceiro.');
                  codTabFinal = melhorPolitica.RESULT_CODTAB ? Number(melhorPolitica.RESULT_CODTAB) : Number(parceiro.CODTAB || tabelaSelecionada);
                }
              } else {
                codTabFinal = melhorPolitica.RESULT_CODTAB ? Number(melhorPolitica.RESULT_CODTAB) : Number(parceiro.CODTAB || tabelaSelecionada);
              }

              // 2. Definir limites
              if (melhorPolitica.RESULT_PERCDESCONTO_MAX !== undefined && melhorPolitica.RESULT_PERCDESCONTO_MAX !== null) {
                setMaxDescontoPolitica(melhorPolitica.RESULT_PERCDESCONTO_MAX);
              } else {
                setMaxDescontoPolitica(undefined);
              }

              if (melhorPolitica.RESULT_PERCACIMA_MAX !== undefined && melhorPolitica.RESULT_PERCACIMA_MAX !== null) {
                setMaxAcrescimoPolitica(melhorPolitica.RESULT_PERCACIMA_MAX);
              } else {
                setMaxAcrescimoPolitica(undefined);
              }
            } else {
              console.warn('⚠️ Nenhuma política encontrada.');
              codTabFinal = Number(parceiro.CODTAB || tabelaSelecionada);
              setMaxDescontoPolitica(undefined);
              setMaxAcrescimoPolitica(undefined);
              setPoliticaAplicada(undefined);
            }

            // 3. Resolver melhor NUTAB para o CODTAB identificado
            console.log(`📉 [Pricing] Buscando melhor NUTAB para CODTAB ${codTabFinal}...`);
            const melhorPrecoMatch = await OfflineDataService.getMelhorPreco(Number(produto.CODPROD), codTabFinal);
            
            if (melhorPrecoMatch) {
              nutabFinal = Number(melhorPrecoMatch.NUTAB);
              preco = Number(melhorPrecoMatch.VLRVENDA);
              setNutabSelecionado(nutabFinal);
              console.log(`✅ [Pricing] Selecionado NUTAB ${nutabFinal} com preço R$ ${preco.toFixed(2)}`);
            } else {
              console.warn(`⚠️ Nenhum preço encontrado para CODTAB ${codTabFinal}`);
            }
          }
        } catch (e) {
          console.error('Erro ao resolver política e preço:', e);
        }
      }

      // Se não resolveu via política ou ICMS (raro mas possível se faltar dados), tenta o fluxo manual
      if (preco === 0) {
        console.log('💰 Iniciando busca de preço manual (fallback)...');
        const codProdNumber = Number(produto.CODPROD);
        if (codProdNumber > 0 && codTabFinal > 0) {
           const melhorPrecoMatch = await OfflineDataService.getMelhorPreco(codProdNumber, codTabFinal);
           if (melhorPrecoMatch) {
             preco = Number(melhorPrecoMatch.VLRVENDA);
             nutabFinal = Number(melhorPrecoMatch.NUTAB);
             setNutabSelecionado(nutabFinal);
           }
        }
      }

      // Fallback: buscar da API se online e não encontrou no IndexedDB
      if (navigator.onLine && preco === 0) {
        console.log('🌐 Buscando preço da API como fallback...');
        try {
          const response = await fetch(`/api/oracle/preco?codProd=${produto.CODPROD}&nutab=${nutabFinal || tabelaSelecionada}`);
          if (response.ok) {
            const data = await response.json();
            const precoApi = parseFloat(data.preco || '0');
            if (precoApi > 0) {
              preco = precoApi;
              console.log('💰 Preço obtido da API: R$', preco.toFixed(2));
            }
          }
        } catch (apiError) {
          console.error('❌ Erro ao buscar preço da API:', apiError);
        }
      }

      // Se ainda não encontrou preço, mostrar aviso
      if (preco === 0) {
        console.warn('⚠️ Nenhum preço disponível para este produto/tabela');
        toast.error('Preço não encontrado para este produto na tabela selecionada', {
          description: `Produto: ${produto.CODPROD} - Tabela: ${codTabFinal}`
        })
      }


      setProdutoPreco(preco)
      setShowEstoqueModal(true)

      console.log('✅ Dados carregados - Preço: R$', preco.toFixed(2));

    } catch (error: any) {
      console.error('❌ Erro ao carregar dados do produto:', error)
      setProdutoPreco(0)
      setShowEstoqueModal(true)
      toast.error('Erro ao carregar dados do produto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmarEstoque = (produto: any, preco: number, quantidade: number, tabela?: string, desconto?: number, controle?: string, localEstoque?: number, maxDesconto?: number, maxAcrescimo?: number, precoBase?: number) => {
    setShowEstoqueModal(false)
    setProdutoSelecionado(null)

    setProdutoPreco(0)
    // Pass table and other details to parent including precoBase and politicaAplicada
    onConfirm(produto, preco, quantidade, String(nutabSelecionado || tabelaSelecionada), desconto, controle, localEstoque, maxDesconto || maxDescontoPolitica, maxAcrescimo || maxAcrescimoPolitica, precoBase, politicaAplicada)
    setProdutos([])
    onClose()
  }

  const abrirDetalhes = (e: React.MouseEvent, produto: Produto) => {
    e.stopPropagation()
    setProdutoDetalhes(produto)
    setShowDetalhesModal(true)
  }

  const handleCancelarEstoque = () => {
    setShowEstoqueModal(false)
    setProdutoSelecionado(null)

    setProdutoPreco(0)
  }

  const carregarTabelasPrecos = async () => {
    try {
      if (!navigator.onLine) {
        console.log('📱 Modo offline - carregando tabelas de preço do cache local');
        const tabelasOffline = await OfflineDataService.getTabelasPrecosConfig();

        const tabelasFormatadas = tabelasOffline.map((config: any) => ({
          NUTAB: config.NUTAB,
          CODTAB: config.CODTAB,
          DESCRICAO: config.DESCRICAO,
          ATIVO: config.ATIVO
        }));

        setTabelasPreco(tabelasFormatadas);
        console.log('✅ Tabelas de preço carregadas do cache (offline):', tabelasFormatadas.length);

        if (tabelasFormatadas.length > 0 && !tabelaSelecionada) {
          setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB));
        }
        return;
      }

      // Buscar do cache primeiro (sessionStorage)
      const cached = sessionStorage.getItem('cached_tabelasPrecosConfig')
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached)
          const configs = Array.isArray(parsedCache) ? parsedCache : (parsedCache.configs || parsedCache.data || [])

          const tabelasFormatadas = configs.map((config: any) => ({
            NUTAB: config.NUTAB,
            CODTAB: config.CODTAB,
            DESCRICAO: config.DESCRICAO,
            ATIVO: config.ATIVO
          }))

          setTabelasPreco(tabelasFormatadas)
          console.log('✅ Tabelas de preço configuradas carregadas do cache:', tabelasFormatadas.length)

          if (tabelasFormatadas.length > 0 && !tabelaSelecionada) {
            setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB))
          }
          return
        } catch (e) {
          console.warn('⚠️ Erro ao processar cache de tabelas de preços configuradas')
          sessionStorage.removeItem('cached_tabelasPrecosConfig')
        }
      }

      // Se não houver cache, buscar da API
      const response = await fetch('/api/tabelas-precos-config')
      if (!response.ok) throw new Error('Erro ao carregar tabelas de preços configuradas')
      const data = await response.json()
      const tabelas = data.configs || []

      const tabelasFormatadas = tabelas.map((config: any) => ({
        NUTAB: config.NUTAB,
        CODTAB: config.CODTAB,
        DESCRICAO: config.DESCRICAO,
        ATIVO: config.ATIVO
      }))

      setTabelasPreco(tabelasFormatadas)
      console.log('✅ Tabelas de preço configuradas carregadas:', tabelasFormatadas.length)

      // AGRUPAR POR CODTAB PARA O SELECT (Não mostrar NUTABs individuais)
      const uniqueCodTabs: any[] = [];
      const seen = new Set();
      tabelasFormatadas.forEach((t: any) => {
        if (!seen.has(t.CODTAB)) {
          seen.add(t.CODTAB);
          uniqueCodTabs.push(t);
        }
      });
      setTabelasPreco(uniqueCodTabs);

      if (uniqueCodTabs.length > 0 && !tabelaSelecionada) {
        setTabelaSelecionada(String(uniqueCodTabs[0].CODTAB))
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tabelas de preços configuradas:', error)
      toast.error("Falha ao carregar tabelas de preços. Verifique as configurações.")
      setTabelasPreco([])
    }
  }

  useEffect(() => {
    if (isOpen) {
      carregarTabelasPrecos()
    } else {
      setProdutos([])
      setProdutoSelecionado(null)
      setProdutoEstoque(0)
      setProdutoPreco(0)
      setTabelaSelecionada('')
    }
  }, [isOpen])

  const resolverPrecoPorTabela = async (codProd: string | number | undefined, codTab: string | number | undefined) => {
    if (!codProd || !codTab || codTab === '0') {
      if (produtoSelecionado) {
        console.warn('⚠️ Sem tabela de preço válida, usando preço base do produto');
        const precoBase = Number(produtoSelecionado.VLRVENDA || produtoSelecionado.PRECO || 0);
        setProdutoPreco(precoBase);
      } else {
        setProdutoPreco(0);
      }
      setLoadingPreco(false);
      return;
    }

    setLoadingPreco(true);
    try {
      console.log(`📉 [Pricing] Resolvendo melhor NUTAB para CODPROD ${codProd} e CODTAB ${codTab}...`);
      const melhorPrecoMatch = await OfflineDataService.getMelhorPreco(Number(codProd), Number(codTab));
      
      if (melhorPrecoMatch) {
        const preco = Number(melhorPrecoMatch.VLRVENDA);
        setProdutoPreco(preco);
        setNutabSelecionado(Number(melhorPrecoMatch.NUTAB));
        console.log(`✅ [Pricing] Preço resolvido: R$ ${preco.toFixed(2)} (NUTAB ${melhorPrecoMatch.NUTAB})`);
      } else {
        console.warn('⚠️ Nenhum preço encontrado offline. Tentando API...');
        // Fallback API
        const response = await fetch(`/api/oracle/preco?codProd=${codProd}&nutab=${codTab}`); // Mantendo nutab param para compatibilidade se a API aceitar CODTAB como fallback
        if (response.ok) {
          const data = await response.json();
          setProdutoPreco(Number(data.preco || 0));
        } else {
          setProdutoPreco(0);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao resolver preço:', error);
      setProdutoPreco(0);
    } finally {
      setLoadingPreco(false);
    }
  }

  return (
    <>
      <Dialog open={isOpen && !showEstoqueModal} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-produto-selector style={{ zIndex: 50 }}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription className="hidden">
              Pesquise e selecione um produto para adicionar ao pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {tabelasPreco.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tabela de Preço</Label>
                <Select
                  value={tabelaSelecionada}
                  onValueChange={(value) => {
                    setTabelaSelecionada(value);
                    if (produtoSelecionado?.CODPROD) {
                      resolverPrecoPorTabela(produtoSelecionado.CODPROD, value);
                    } else {
                      setProdutoPreco(0);
                    }
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione a tabela de preço" />
                  </SelectTrigger>
                   <SelectContent>
                     {tabelasPreco.map((tabela) => (
                       <SelectItem key={tabela.CODTAB} value={String(tabela.CODTAB)}>
                         Tabela {tabela.CODTAB} {tabela.DESCRICAO && ` - ${tabela.DESCRICAO}`}
                       </SelectItem>
                     ))}
                   </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-orange-600 font-medium">
                ⚠️ Não há tabelas de preço configuradas.
              </div>
            )}
            <Input
              placeholder={!tabelaSelecionada || tabelaSelecionada === '' || tabelaSelecionada === '0' ? "Selecione uma tabela de preço válida primeiro" : "Digite pelo menos 2 caracteres para buscar..."}
              onChange={(e) => buscarProdutosComDebounce(e.target.value)}
              className="text-sm"
              disabled={!tabelaSelecionada || tabelaSelecionada === '' || tabelaSelecionada === '0'}
              autoFocus={tabelaSelecionada !== '' && tabelaSelecionada !== '0'}
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {!tabelaSelecionada || tabelaSelecionada === '' || tabelaSelecionada === '0' ? (
                <div className="text-center py-8 text-sm text-orange-600 font-medium">
                  ⚠️ Selecione uma tabela de preço válida para buscar produtos
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Buscando produtos...</span>
                </div>
              ) : produtos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Digite pelo menos 2 caracteres para buscar produtos
                </div>
              ) : (
                produtos.map((produto) => (
                  <Card
                    key={produto.CODPROD}
                    className="cursor-pointer hover:bg-green-50 transition-colors"
                    onClick={() => handleSelecionarProduto(produto)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1 min-w-0" onClick={() => handleSelecionarProduto(produto)}>
                          <p className="font-medium text-sm truncate">{produto.CODPROD} - {produto.DESCRPROD}</p>
                          {produto.MARCA && (
                            <p className="text-xs text-muted-foreground mt-1">Marca: {produto.MARCA}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
                          onClick={(e) => abrirDetalhes(e, produto)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {produtoDetalhes && (
        <ProdutoDetalhesModal
          isOpen={showDetalhesModal}
          onClose={() => {
            setShowDetalhesModal(false)
            setProdutoDetalhes(null)
          }}
          produto={produtoDetalhes}
        />
      )}

      {showEstoqueModal && produtoSelecionado && (
        <QuantidadeProdutoModal
          isOpen={showEstoqueModal}
          onClose={handleCancelarEstoque}
          product={produtoSelecionado}
          onConfirm={handleConfirmarEstoque}
          preco={produtoPreco}
          maxDesconto={maxDescontoPolitica}
          maxAcrescimo={maxAcrescimoPolitica}
          politicaAplicada={politicaAplicada}
        />
      )}
    </>
  )
}