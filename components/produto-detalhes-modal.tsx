
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { X, Package, Boxes, ChevronDown, ChevronUp, Sparkles, BarChart3, TrendingUp, Users } from "lucide-react"
import { toast } from "sonner"
import { OfflineDataService } from "@/lib/offline-data-service"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ProdutoDetalhesModalProps {
  produto: any
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
  tabelaParceiros: { parceiro: string; quantidade: number; valor: number }[]
}

export function ProdutoDetalhesModal({ produto, isOpen, onClose }: ProdutoDetalhesModalProps) {
  const [imagemUrl, setImagemUrl] = useState<string | null>(null)
  const [loadingImagem, setLoadingImagem] = useState(false)
  const [unidadesAlternativas, setUnidadesAlternativas] = useState<any[]>([])
  const [tabelasPrecos, setTabelasPrecos] = useState<any[]>([])
  const [descricaoAberta, setDescricaoAberta] = useState(true)
  const [unidadesAberta, setUnidadesAberta] = useState(false)
  const [tabelasAberta, setTabelasAberta] = useState(false)
  const [analiseAberta, setAnaliseAberta] = useState(false)
  const [estoqueAberto, setEstoqueAberto] = useState(true)

  const [estoques, setEstoques] = useState<any[]>([])
  const [loadingEstoque, setLoadingEstoque] = useState(false)

  const [loadingAnalise, setLoadingAnalise] = useState(false)
  const [analiseGiro, setAnaliseGiro] = useState<AnaliseGiro | null>(null)

  useEffect(() => {
    if (isOpen && produto?.CODPROD) {
      carregarDadosProduto()
      setAnaliseGiro(null)
      setAnaliseAberta(false)
    }

    return () => {
      if (imagemUrl) {
        URL.revokeObjectURL(imagemUrl)
      }
    }
  }, [isOpen, produto?.CODPROD])

  const carregarDadosProduto = async () => {
    await Promise.all([
      carregarImagem(),
      carregarUnidadesAlternativas(),
      carregarTabelasPrecos(),
      carregarEstoqueOnline()
    ])
  }

  const carregarAnaliseGiro = async () => {
    if (!produto?.CODPROD) return

    setLoadingAnalise(true)
    setAnaliseAberta(true)

    try {
      const response = await fetch('/api/giro-produto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codProd: produto.CODPROD, meses: 1 })
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar análise de giro')
      }

      const data = await response.json()

      if (data.analise) {
        setAnaliseGiro(data.analise)
      } else {
        toast.info('Nenhum dado de vendas encontrado para este produto no último mês')
      }
    } catch (error: any) {
      console.error('Erro ao carregar análise de giro:', error)
      toast.error('Erro ao carregar análise de giro')
    } finally {
      setLoadingAnalise(false)
    }
  }

  const carregarEstoqueOnline = async () => {
    if (!produto?.CODPROD || !navigator.onLine) {
      setEstoques([])
      return
    }

    setLoadingEstoque(true)
    try {
      const response = await fetch(`/api/sankhya/estoque/live?codProd=${produto.CODPROD}`)
      if (!response.ok) throw new Error('Erro ao buscar estoque live')

      const data = await response.json()
      if (data.estoque && Array.isArray(data.estoque)) {
        setEstoques(data.estoque)
      } else {
        setEstoques([])
      }
    } catch (error) {
      console.error('Erro no carregarEstoqueOnline:', error)
      setEstoques([])
    } finally {
      setLoadingEstoque(false)
    }
  }



  const carregarImagem = async () => {
    if (!produto?.CODPROD) return

    setLoadingImagem(true)
    try {
      const response = await fetch(`/api/sankhya/produtos/imagem?codProd=${produto.CODPROD}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setImagemUrl(url)
      } else {
        setImagemUrl(null)
      }
    } catch (error) {
      console.error('Erro ao carregar imagem:', error)
      setImagemUrl(null)
    } finally {
      setLoadingImagem(false)
    }
  }

  const carregarUnidadesAlternativas = async () => {
    if (!produto?.CODPROD) return

    try {
      const volumes = await OfflineDataService.getVolumes(produto.CODPROD)
      const unidades = [
        {
          CODVOL: produto.UNIDADE || 'UN',
          DESCRICAO: `${produto.UNIDADE || 'UN'} - Unidade Padrão`,
          QUANTIDADE: 1,
          isPadrao: true
        },
        ...volumes.filter((v: any) => v.ATIVO === 'S').map((v: any) => ({
          CODVOL: v.CODVOL,
          DESCRICAO: v.DESCRDANFE || v.CODVOL,
          QUANTIDADE: v.QUANTIDADE || 1,
          isPadrao: false
        }))
      ]
      setUnidadesAlternativas(unidades)
    } catch (error) {
      console.error('Erro ao carregar unidades alternativas:', error)
      setUnidadesAlternativas([])
    }
  }

  const carregarTabelasPrecos = async () => {
    if (!produto?.CODPROD) return

    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')

      const tabelasSankhya = await OfflineDataService.getTabelasPrecos()
      const tabelasConfig = await OfflineDataService.getTabelasPrecosConfig()

      let nutabParceiro: number | null = null
      try {
        const orderHeader = sessionStorage.getItem('novo_pedido_header')
        if (orderHeader) {
          const headerData = JSON.parse(orderHeader)
          const codParc = headerData?.CODPARC

          if (codParc) {
            const parceiros = await OfflineDataService.getParceiros()
            const parceiro = parceiros.find(p => String(p.CODPARC) === String(codParc))

            if (parceiro?.CODTAB) {
              const tabelaVinculada = tabelasSankhya.find(t => Number(t.CODTAB) === Number(parceiro.CODTAB))
              if (tabelaVinculada) {
                nutabParceiro = Number(tabelaVinculada.NUTAB)
              }
            }
          }
        }
      } catch (e) {
        console.error('Erro ao ler parceiro selecionado:', e)
      }

      let tabelasParaExibir: any[] = []

      if (nutabParceiro) {
        const dadosTabela = tabelasSankhya.find((t: any) => Number(t.NUTAB) === nutabParceiro)
        if (dadosTabela) {
          tabelasParaExibir.push({
            ...dadosTabela,
            DESCRICAO: `Tabela ${dadosTabela.CODTAB}`
          })
        }
      }

      tabelasConfig.forEach((config: any) => {
        const jaNaLista = tabelasParaExibir.some((t: any) => Number(t.NUTAB) === Number(config.NUTAB))
        if (!jaNaLista) {
          const dadosTabela = tabelasSankhya.find((t: any) => Number(t.NUTAB) === Number(config.NUTAB))
          if (dadosTabela) {
            tabelasParaExibir.push(dadosTabela)
          }
        }
      })

      if (tabelasParaExibir.length === 0) {
        tabelasParaExibir = tabelasSankhya
      }

      const precosPromises = tabelasParaExibir.map(async (tabela: any) => {
        const nutabParaBusca = tabela.NUTAB || tabela.nutab;
        const precos = await OfflineDataService.getPrecos(
          Number(produto.CODPROD),
          nutabParaBusca ? Number(nutabParaBusca) : undefined
        )

        let preco = 0
        if (precos && precos.length > 0) {
          const itemPreco = precos[0]
          const valorRaw = itemPreco.VLRVENDA !== undefined ? itemPreco.VLRVENDA :
            itemPreco.vlrVenda !== undefined ? itemPreco.vlrVenda :
              itemPreco.PRECO;

          if (valorRaw != null) {
            preco = typeof valorRaw === 'string'
              ? parseFloat(valorRaw.replace(',', '.'))
              : parseFloat(valorRaw)
          }
        }

        return {
          tabela: tabela.DESCRICAO || `Tabela ${tabela.CODTAB || nutabParaBusca}`,
          nutab: nutabParaBusca,
          codtab: tabela.CODTAB || tabela.codtab,
          preco: isNaN(preco) ? 0 : preco
        }
      })

      const precosData = await Promise.all(precosPromises)
      setTabelasPrecos(precosData)
    } catch (error) {
      console.error('Erro ao carregar tabelas de preços:', error)
      setTabelasPrecos([])
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
      '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6'
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  }

  if (!produto) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[900px] w-[95vw] p-0 border-0 bg-white/95 md:bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-[80vh]"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F2] bg-white sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#1E5128] tracking-tight truncate max-w-[200px] sm:max-w-md">
              Detalhes do Produto
            </h2>
            <Badge className="bg-[#76BA1B] hover:bg-[#1E5128] text-white border-0 font-mono text-xs shadow-sm">
              {produto.CODPROD}
            </Badge>
            {produto.ATIVO === 'S' ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 text-xs font-semibold">
                Ativo
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-0 text-xs font-semibold">
                Inativo
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-[1fr_1.5fr] gap-6 p-6 overflow-y-auto bg-slate-50/30 flex-1">
          <div className="flex items-start justify-center flex-shrink-0">
            <div className="relative w-full aspect-square md:aspect-auto md:h-full min-h-[300px] bg-white rounded-2xl border border-[#F2F2F2] shadow-sm flex items-center justify-center overflow-hidden">
              {loadingImagem ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-3 border-[#76BA1B] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-slate-500">Carregando imagem...</p>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div
                    key={`avatar-modal-${produto.CODPROD}`}
                    className={`flex items-center justify-center w-full h-full ${imagemUrl ? 'absolute inset-0' : ''}`}
                  >
                    <div
                      className="w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center text-white font-bold text-4xl md:text-6xl"
                      style={{ backgroundColor: getAvatarColor(produto.DESCRPROD || 'P') }}
                    >
                      {(produto.DESCRPROD || 'P')
                        .split(' ')
                        .filter((word: string) => word.length > 0)
                        .slice(0, 2)
                        .map((word: string) => word[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                  </div>

                  {imagemUrl && (
                    <img
                      key={`img-modal-${produto.CODPROD}`}
                      src={imagemUrl}
                      alt={produto.DESCRPROD}
                      className="w-full h-full object-contain p-4 md:p-6 relative z-10"
                      onError={() => {
                        setImagemUrl(null)
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-4 md:overflow-y-auto md:pr-2 scrollbar-none">
            <Collapsible open={descricaoAberta} onOpenChange={setDescricaoAberta}>
              <Card className="flex-shrink-0 rounded-2xl border-[#F2F2F2] shadow-sm bg-white overflow-hidden transition-all duration-200">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-[#1E5128] flex items-center gap-2 cursor-pointer">
                        <Package className="w-4 h-4" />
                        Descrição do Produto
                      </Label>
                      {descricaoAberta ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-4 pb-5">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{produto.DESCRPROD}</p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>



            {unidadesAlternativas.length > 0 && (
              <Collapsible open={unidadesAberta} onOpenChange={setUnidadesAberta}>
                <Card className="flex-shrink-0 rounded-2xl border-[#F2F2F2] shadow-sm bg-white overflow-hidden transition-all duration-200">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold text-[#1E5128] flex items-center gap-2 cursor-pointer">
                          <Package className="w-4 h-4" />
                          Unidades Alternativas
                        </Label>
                        {unidadesAberta ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-5">
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {unidadesAlternativas.map((unidade, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl mt-1">
                            <div>
                              <span className="font-bold text-slate-700 text-sm">{unidade.CODVOL}</span>
                              {unidade.isPadrao && (
                                <Badge variant="outline" className="ml-2.5 bg-white border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-md">Padrão</Badge>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">
                              Qtd: {unidade.QUANTIDADE}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {tabelasPrecos.length > 0 && (
              <Collapsible open={tabelasAberta} onOpenChange={setTabelasAberta}>
                <Card className="flex-shrink-0 rounded-2xl border-[#F2F2F2] shadow-sm bg-white overflow-hidden transition-all duration-200">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold text-[#1E5128] flex items-center gap-2 cursor-pointer">
                          <TrendingUp className="w-4 h-4" />
                          Tabelas em Vigor
                        </Label>
                        {tabelasAberta ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-5">
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {tabelasPrecos.map((preco, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl mt-1 gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-700 text-sm truncate">{preco.tabela}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-200 text-slate-600 rounded">NUTAB: {preco.nutab}</Badge>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-200 text-slate-600 rounded">CODTAB: {preco.codtab}</Badge>
                              </div>
                            </div>
                            <span className="font-black text-[#76BA1B] text-base whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                              {preco.preco > 0 ? formatCurrency(preco.preco) : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {(loadingEstoque || estoques.length > 0) && (
              <Collapsible open={estoqueAberto} onOpenChange={setEstoqueAberto}>
                <Card className="flex-shrink-0 rounded-2xl border-orange-100 bg-gradient-to-r from-orange-50/50 to-amber-50/50 shadow-sm overflow-hidden transition-all duration-200">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-orange-50/80 transition-colors">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold text-orange-700 flex items-center gap-2 cursor-pointer">
                          <Boxes className="w-4 h-4" />
                          Estoque Online (ERP)
                        </Label>
                        {estoqueAberto ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-orange-400" />}
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-5">
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {loadingEstoque ? (
                          <div className="flex items-center justify-center p-4">
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : estoques.map((est, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-white border border-orange-100 rounded-xl mt-1 gap-3 shadow-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-700 text-sm">Empresa: {est.codigoEmpresa || '-'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-800 rounded border-orange-200">Local: {est.codigoLocal}</Badge>
                                {est.controle && est.controle.trim() && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-600 rounded">Controle: {est.controle}</Badge>
                                )}
                              </div>
                            </div>
                            <span className={`font-black text-base whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border shadow-sm ${est.estoque > 0 ? 'text-[#76BA1B] border-green-100' : 'text-red-500 border-red-100'}`}>
                              Qtd: {est.estoque}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            <Collapsible open={analiseAberta} onOpenChange={setAnaliseAberta}>
              <Card className="flex-shrink-0 rounded-2xl border-purple-100 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 shadow-sm overflow-hidden transition-all duration-200">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-purple-50/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-purple-700 flex items-center gap-2 cursor-pointer">
                        <Sparkles className="w-4 h-4" />
                        Análise Preditiva (IA)
                      </Label>
                      {analiseAberta ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-4 pb-5">
                    {!analiseGiro && !loadingAnalise && (
                      <div className="text-center py-6 bg-white/60 rounded-xl border border-purple-100/50 backdrop-blur-sm">
                        <Button
                          onClick={carregarAnaliseGiro}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all shadow-purple-200"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Gerar Análise de Giro
                        </Button>
                        <p className="text-xs text-purple-600/70 font-medium mt-3">
                          Analisa comportamento de vendas do último mês
                        </p>
                      </div>
                    )}

                    {loadingAnalise && (
                      <div className="flex flex-col items-center justify-center py-10 bg-white/60 rounded-xl border border-purple-100/50">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
                        <p className="text-sm text-purple-700 font-bold">Processando dados avançados...</p>
                      </div>
                    )}

                    {analiseGiro && !loadingAnalise && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                              <span className="text-xs font-bold text-purple-600/70 uppercase tracking-wider">Total Vendido</span>
                            </div>
                            <p className="text-base font-black text-purple-800">{formatCurrency(analiseGiro.totalValor)}</p>
                          </div>
                          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Package className="w-3.5 h-3.5 text-purple-500" />
                              <span className="text-xs font-bold text-purple-600/70 uppercase tracking-wider">Volume</span>
                            </div>
                            <p className="text-base font-black text-purple-800">{analiseGiro.totalQuantidade} <span className="text-xs font-medium text-purple-400">un</span></p>
                          </div>
                          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                              <span className="text-xs font-bold text-purple-600/70 uppercase tracking-wider">Notas Emit.</span>
                            </div>
                            <p className="text-base font-black text-purple-800">{analiseGiro.totalNotas}</p>
                          </div>
                          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Users className="w-3.5 h-3.5 text-purple-500" />
                              <span className="text-xs font-bold text-purple-600/70 uppercase tracking-wider">Ticket M.</span>
                            </div>
                            <p className="text-base font-black text-purple-800">{formatCurrency(analiseGiro.ticketMedio)}</p>
                          </div>
                        </div>

                        {analiseGiro.graficoBarras.length > 0 && (
                          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
                            <p className="text-sm font-bold text-purple-800 mb-4">Evolução Diária</p>
                            <div className="h-44 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analiseGiro.graficoBarras} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis
                                    dataKey="data"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                                    tickFormatter={(value) => value.split('/').slice(0, 2).join('/')}
                                    dy={10}
                                  />
                                  <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                                  />
                                  <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600, color: '#334155' }}
                                    formatter={(value: number) => [value.toFixed(2), 'Qtd.']}
                                    labelFormatter={(label) => `${label}`}
                                  />
                                  <Bar dataKey="quantidade" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {analiseGiro.tabelaParceiros.length > 0 && (
                          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
                            <p className="text-sm font-bold text-purple-800 mb-3">Top Compradores</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {analiseGiro.tabelaParceiros.slice(0, 5).map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                                      {idx + 1}
                                    </span>
                                    <span className="truncate text-xs font-bold text-slate-700">{p.parceiro}</span>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-3">
                                    <p className="font-black text-purple-600 text-xs">{formatCurrency(p.valor)}</p>
                                    <p className="text-[9px] font-bold text-slate-400">{p.quantidade} un</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 text-center">
                          <span className="inline-flex px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Período: {analiseGiro.periodo}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <div className="pt-6 mt-auto">
              <Button
                variant="outline"
                className="w-full text-sm font-bold h-12 rounded-xl border-[#F2F2F2] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                onClick={onClose}
              >
                Fechar Detalhes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
