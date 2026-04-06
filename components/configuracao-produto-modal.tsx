"use client"

import { useState, useEffect } from "react"
import { Plus, Minus, Package, ShoppingCart, ChevronRight, Check, Table, Boxes, ChevronDown, ChevronUp, Sparkles, Flame } from "lucide-react"
import { EscolherPrecoTabelaModal } from "@/components/escolher-preco-tabela-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface UnidadeVolume {
  CODVOL: string
  DESCRICAO: string
  QUANTIDADE: number
  isPadrao?: boolean
}

export interface ConfiguracaoProduto {
  quantidade: number
  desconto: number
  preco: number
  unidade: string
  tabelaPreco?: string
  nutab?: number
  acrescimo?: number
  precoBase?: number
  controle?: string
}

export interface TabelaPreco {
  CODTAB: string
  DESCRICAO: string
  NUTAB?: number
  ATIVO?: string
}

export interface ConfiguracaoProdutoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto: any | null
  imagemUrl?: string | null
  unidades: UnidadeVolume[]
  tabelasPrecos?: TabelaPreco[]
  configInicial?: Partial<ConfiguracaoProduto>
  onConfirmar: (config: ConfiguracaoProduto) => void
  onVerPrecos?: () => void
  onTabelaPrecoChange?: (codTab: string) => void
  modo?: 'adicionar' | 'editar'
  disabled?: boolean
  maxDesconto?: number
  maxAcrescimo?: number
  politicaAplicada?: any
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function ConfiguracaoProdutoModal({
  open,
  onOpenChange,
  produto,
  imagemUrl,
  unidades,
  tabelasPrecos = [],
  configInicial,
  onConfirmar,
  onVerPrecos,
  onTabelaPrecoChange,
  modo = 'adicionar',
  disabled = false,
  maxDesconto,
  maxAcrescimo,
  politicaAplicada
}: ConfiguracaoProdutoModalProps) {
  const [config, setConfig] = useState<ConfiguracaoProduto>({
    quantidade: 1,
    desconto: 0,
    acrescimo: 0, // Initialize acrescimo
    preco: 0,
    unidade: 'UN',
    tabelaPreco: 'PADRAO'
  })

  const [showEscolherPreco, setShowEscolherPreco] = useState(false)
  const [estoques, setEstoques] = useState<any[]>([])
  const [loadingEstoque, setLoadingEstoque] = useState(false)
  const [politicaAberta, setPoliticaAberta] = useState(false)
  const [estoqueAberto, setEstoqueAberto] = useState(false)
  const [campanhasAtivas, setCampanhasAtivas] = useState<any[]>([])
  const [campanhaAplicada, setCampanhaAplicada] = useState<any>(null)

  useEffect(() => {
    if (open && produto?.CODPROD) {
      const buscarCampanhas = async () => {
        try {
          const { OfflineDataService } = await import('@/lib/offline-data-service')
          const camps = await OfflineDataService.getCampanhasPorProduto(Number(produto.CODPROD))
          console.log('🔥 Campanhas encontradas para o produto:', camps)
          setCampanhasAtivas(camps)
        } catch (error) {
          console.error('Erro ao buscar campanhas para o produto:', error)
        }
      }
      buscarCampanhas()
    }
  }, [open, produto?.CODPROD])

  useEffect(() => {
    if (produto && open) {
      // Se for produto com campanha e estivermos adicionando, forçamos o preço a 0 
      // para obrigar o usuário a escolher uma tabela antes da campanha ser calculada.
      const precoInicialModal = configInicial?.preco ?? 0;

      setConfig({
        quantidade: configInicial?.quantidade ?? 1,
        desconto: configInicial?.desconto ?? 0,
        acrescimo: configInicial?.acrescimo ?? 0,
        preco: precoInicialModal,
        unidade: configInicial?.unidade || 'UN',
        tabelaPreco: configInicial?.tabelaPreco || '',
        nutab: configInicial?.nutab,
        precoBase: configInicial?.precoBase || precoInicialModal || 0,
        controle: configInicial?.controle || ''
      })
      carregarEstoqueOnline()
    }
  }, [produto, open, configInicial])

  // Efeito para aplicar desconto automático de campanha por quantidade
  useEffect(() => {
    // REGRA: Só calcula campanha se já tiver um preço base definido (via seleção de tabela)
    if (campanhasAtivas.length > 0 && config.precoBase && config.precoBase > 0) {
      const campanhasQtd = campanhasAtivas.filter(c => c.TIPO === 'QUANTIDADE')
      if (campanhasQtd.length > 0) {
        let melhorDesconto = 0
        let regraAplicada = null

        campanhasQtd.forEach(camp => {
          const itemCamp = camp.itens?.find((i: any) => Number(i.CODPROD) === Number(produto.CODPROD))
          if (itemCamp && config.quantidade >= itemCamp.QTDMIN) {
            if (itemCamp.DESCONTO > melhorDesconto) {
              melhorDesconto = itemCamp.DESCONTO
              regraAplicada = { ...camp, regra: itemCamp }
            }
          }
        })

        if (regraAplicada) {
          const idCampAplicada = (campanhaAplicada as any)?.ID_CAMPANHA;
          const idRegraNova = (regraAplicada as any).ID_CAMPANHA;
          const descAplicado = (campanhaAplicada as any)?.regra?.DESCONTO;

          const jaTinhaEssaNegociacao = Number(idCampAplicada) === Number(idRegraNova) && descAplicado === melhorDesconto

          if (!jaTinhaEssaNegociacao) {
            setCampanhaAplicada(regraAplicada)

            // Se a campanha mudou ou é a primeira aplicação, aplicamos o desconto diretamente no preço unitário
            // conforme solicitado pelo usuário. O campo 'desconto' continua guardando o desconto manual.
            const precoTabela = config.precoBase || 0
            const novoPrecoUnitario = precoTabela * (1 - melhorDesconto / 100)

            // Re-calcula o preço final mantendo o desconto manual que o usuário já tinha dado (se houver)
            const novoPrecoFinal = novoPrecoUnitario * (1 - config.desconto / 100)

            setConfig(prev => ({
              ...prev,
              preco: Number(novoPrecoFinal.toFixed(2))
            }))
          }
        } else if (campanhaAplicada?.TIPO === 'QUANTIDADE') {
          // Se não houver regra de quantidade aplicada, mas tivermos uma selecionada anteriormente, limpamos
          setCampanhaAplicada(null)
          const precoOriginal = config.precoBase || 0
          const novoPrecoFinal = precoOriginal * (1 - config.desconto / 100)

          setConfig(prev => ({
            ...prev,
            preco: Number(novoPrecoFinal.toFixed(2))
          }))
        }
      }
    }
  }, [config.quantidade, config.precoBase, campanhasAtivas, config.desconto, produto?.CODPROD])

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

  const handleUnidadeChange = (novaUnidade: string) => {
    const volume = unidades.find(u => u.CODVOL === novaUnidade)
    if (volume) {
      // Se não houver preço selecionado, mantém 0 para forçar seleção via tabela
      if (config.preco > 0) {
        const precoBase = config.precoBase ?? produto?.preco ?? produto?.VLRUNIT ?? 0
        const precoAjustado = precoBase * (volume.QUANTIDADE || 1)
        setConfig(prev => ({
          ...prev,
          unidade: novaUnidade,
          preco: precoAjustado
        }))
      } else {
        setConfig(prev => ({ ...prev, unidade: novaUnidade }))
      }
    } else {
      setConfig(prev => ({ ...prev, unidade: novaUnidade }))
    }
  }

  const handleTabelaChange = (novaTabela: string) => {
    setConfig(prev => ({ ...prev, tabelaPreco: novaTabela }))
    if (onTabelaPrecoChange) {
      onTabelaPrecoChange(novaTabela)
    }
  }

  const handlePrecoChange = (novoPreco: number) => {
    // O preco base para negociação manual agora é o preco base da tabela AJUSTADO pela campanha (se houver)
    const percCampanha = campanhaAplicada?.regra?.DESCONTO || 0;
    const precoRefCampanha = (config.precoBase || 0) * (1 - percCampanha / 100);

    let novoDesconto = 0;
    let novoAcrescimo = 0;

    if (precoRefCampanha > 0) {
      if (novoPreco < precoRefCampanha) {
        novoDesconto = ((precoRefCampanha - novoPreco) / precoRefCampanha) * 100;
      } else if (novoPreco > precoRefCampanha) {
        novoAcrescimo = ((novoPreco - precoRefCampanha) / precoRefCampanha) * 100;
      }
    }

    setConfig(prev => ({
      ...prev,
      preco: novoPreco,
      desconto: Number(novoDesconto.toFixed(2)),
      acrescimo: Number(novoAcrescimo.toFixed(2))
    }));
  }

  const handleDescontoChange = (novoDesconto: number) => {
    const percCampanha = campanhaAplicada?.regra?.DESCONTO || 0;
    const precoRefCampanha = (config.precoBase || 0) * (1 - percCampanha / 100);
    const novoPreco = precoRefCampanha * (1 - novoDesconto / 100);

    setConfig(prev => ({
      ...prev,
      desconto: novoDesconto,
      acrescimo: 0,
      preco: Number(novoPreco.toFixed(2))
    }));
  }

  const handleAcrescimoChange = (novoAcrescimo: number) => {
    const percCampanha = campanhaAplicada?.regra?.DESCONTO || 0;
    const precoRefCampanha = (config.precoBase || 0) * (1 - percCampanha / 100);
    const novoPreco = precoRefCampanha * (1 + novoAcrescimo / 100);

    setConfig(prev => ({
      ...prev,
      acrescimo: novoAcrescimo,
      desconto: 0,
      preco: Number(novoPreco.toFixed(2))
    }));
  }

  const subtotal = (config.preco || 0) * (config.quantidade || 0)
  const total = subtotal // O preco já inclui o desconto manual e o de campanha

  const isPrecoValido = config.preco > 0

  if (!produto) return null

  const tabelaSelecionada = tabelasPrecos.find(t =>
    (config.nutab && t.NUTAB && Number(t.NUTAB) === Number(config.nutab)) ||
    (!config.nutab && t.CODTAB === config.tabelaPreco)
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[700px] w-[95vw] p-0 border-0 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:h-auto max-h-[90vh]">
          <DialogTitle className="hidden">Configuração do Produto</DialogTitle>
          <DialogDescription className="hidden">Ajuste a quantidade e detalhes do produto.</DialogDescription>
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F2] bg-white sticky top-0 z-50">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                {imagemUrl ? (
                  <img
                    src={imagemUrl}
                    alt={produto.DESCRPROD}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Package className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-md">
                  {produto.DESCRPROD}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-medium">Cód: {produto.CODPROD}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                    Estoque: {parseFloat(produto.ESTOQUE || '0').toFixed(0)} {produto.UNIDADE}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-50/20">
            <div className="space-y-6">
              {/* Alerta de Campanha */}
              {produto.TEM_CAMPANHA && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-red-900 leading-tight">Campanha Ativa!</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      Este produto possui condições especiais de desconto. Confira as regras na aba de Campanhas.
                    </p>
                  </div>
                </div>
              )}

              {/* 1. SEÇÃO DE INPUTS (Prioridade) */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Quantidade */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade</Label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden h-12 bg-white shadow-sm">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={!isPrecoValido}
                        onClick={() => setConfig(prev => ({ ...prev, quantidade: Math.max(1, prev.quantidade - 1) }))}
                        className="h-full w-12 rounded-none border-r border-slate-100 hover:bg-slate-50 text-slate-500 disabled:opacity-30"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className={`flex-1 text-center font-black text-lg ${!isPrecoValido ? 'text-slate-300' : 'text-slate-800'}`}>
                        {config.quantidade}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={!isPrecoValido}
                        onClick={() => setConfig(prev => ({ ...prev, quantidade: prev.quantidade + 1 }))}
                        className="h-full w-12 rounded-none border-l border-slate-100 hover:bg-slate-50 text-slate-500 disabled:opacity-30"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preço Unitário (Editável) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preço Unitário (BRL)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!isPrecoValido}
                      value={config.preco || ''}
                      onChange={(e) => handlePrecoChange(parseFloat(e.target.value) || 0)}
                      className={`h-12 rounded-xl text-base font-bold shadow-sm border-slate-200 focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] disabled:bg-slate-50 disabled:text-slate-400 ${maxAcrescimo !== undefined &&
                        config.preco > (config.precoBase || 0) &&
                        ((config.preco - (config.precoBase || 0)) / (config.precoBase || 1)) * 100 > maxAcrescimo
                        ? 'border-red-500 bg-red-50 text-red-700' : 'bg-white text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Desconto */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desconto (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        disabled={!isPrecoValido}
                        value={config.desconto}
                        onChange={(e) => handleDescontoChange(Math.max(0, parseFloat(e.target.value) || 0))}
                        className={`h-12 rounded-xl text-base font-medium shadow-sm border-slate-200 focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] disabled:bg-slate-50 disabled:text-slate-400 ${maxDesconto !== undefined && config.desconto > maxDesconto ? 'border-red-500 bg-red-50' : 'bg-white'} ${campanhaAplicada ? 'border-[#76BA1B] border-opacity-50 ring-1 ring-[#76BA1B]/5 pr-4' : ''}`}
                        placeholder="0"
                      />
                    </div>
                    {campanhaAplicada && (
                      <p className="text-[10px] mt-1 text-[#1E5128] font-bold flex items-center gap-1 bg-green-50 p-2 rounded-lg border border-green-100">
                        <Flame className="w-3 h-3 text-red-500" />
                        O preço unitário já inclui {campanhaAplicada.regra.DESCONTO}% da Campanha.
                      </p>
                    )}
                    {maxDesconto !== undefined && (
                      <p className={`text-[9px] mt-1 ${config.desconto > maxDesconto ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                        Limite: {maxDesconto}% {config.desconto > maxDesconto && '(Excedido)'}
                      </p>
                    )}
                  </div>

                  {/* Acréscimo */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acréscimo (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={!isPrecoValido}
                      value={config.acrescimo || 0}
                      onChange={(e) => handleAcrescimoChange(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`h-12 rounded-xl text-base font-medium shadow-sm border-slate-200 focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] disabled:bg-slate-50 disabled:text-slate-400 ${maxAcrescimo !== undefined && (config.acrescimo || 0) > maxAcrescimo ? 'border-red-500 bg-red-50' : 'bg-white'}`}
                      placeholder="0"
                    />
                    {maxAcrescimo !== undefined && (
                      <p className={`text-[9px] mt-1 ${config.acrescimo !== undefined && config.acrescimo > maxAcrescimo ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        Limite: {maxAcrescimo}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Unidade */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</Label>
                    <Select
                      value={config.unidade}
                      onValueChange={handleUnidadeChange}
                      disabled={!isPrecoValido}
                    >
                      <SelectTrigger className="h-12 rounded-xl text-base font-medium shadow-sm border-slate-200 bg-white focus:ring-[#76BA1B]/20">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades && unidades.length > 0 ? (
                          unidades.map((u) => (
                            <SelectItem key={u.CODVOL} value={u.CODVOL}>
                              {u.DESCRICAO}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value={produto.UNIDADE || 'UN'}>
                            {produto.UNIDADE || 'UN'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Controle */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Controle</Label>
                    <Input
                      type="text"
                      disabled={!isPrecoValido}
                      value={config.controle || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, controle: e.target.value }))}
                      placeholder="Lote/Série"
                      className="h-12 rounded-xl text-base shadow-sm border-slate-200 bg-white focus:ring-[#76BA1B]/20 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </div>


              </div>

              {/* 2. DADOS DE ANÁLISE (Recolhíveis) */}
              <div className="space-y-3 pt-2">

                {/* 2. DADOS DE ANÁLISE (Abas) */}
                <div className="pt-2">
                  <Tabs defaultValue={campanhasAtivas.length > 0 ? "campanha" : "estoque"} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 p-1 rounded-xl h-10 border border-slate-200/50 mb-4">
                      <TabsTrigger value="campanha" className="rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Flame className={`w-3 h-3 ${campanhasAtivas.length > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                        Campanha
                      </TabsTrigger>
                      <TabsTrigger value="politica" className="rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Sparkles className={`w-3 h-3 ${politicaAplicada ? 'text-emerald-500' : 'text-slate-400'}`} />
                        Política
                      </TabsTrigger>
                      <TabsTrigger value="estoque" className="rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Boxes className="w-3 h-3 text-slate-400" />
                        Estoque
                      </TabsTrigger>
                    </TabsList>

                    {/* Aba Campanha */}
                    <TabsContent value="campanha" className="mt-0 focus-visible:ring-0">
                      {campanhasAtivas.length > 0 ? (
                        <div className="space-y-2">
                          {campanhasAtivas.map(c => (
                            <div key={c.ID_CAMPANHA} className={`p-4 border rounded-2xl flex items-center justify-between transition-all ${campanhaAplicada?.ID_CAMPANHA === c.ID_CAMPANHA ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${campanhaAplicada?.ID_CAMPANHA === c.ID_CAMPANHA ? 'text-emerald-800' : 'text-slate-800'}`}>{c.NOME}</span>
                                  {campanhaAplicada?.ID_CAMPANHA === c.ID_CAMPANHA && (
                                    <Badge className="bg-emerald-600 text-white border-none text-[8px] h-4">ATIVA NO ITEM</Badge>
                                  )}
                                </div>
                                <span className={`text-[11px] mt-1 ${campanhaAplicada?.ID_CAMPANHA === c.ID_CAMPANHA ? 'text-emerald-600' : 'text-slate-500'}`}>
                                  {c.TIPO === 'QUANTIDADE'
                                    ? (() => {
                                      const item = c.itens?.find((i: any) => Number(i.CODPROD) === Number(produto.CODPROD))
                                      return item ? `Ganhe ${item.DESCONTO}% de desconto a partir de ${item.QTDMIN} un` : 'Aproveite esta oferta!'
                                    })()
                                    : (c.OBSERVACAO || 'Aproveite esta oferta especial!')}
                                </span>
                              </div>
                              <Badge className={`${campanhaAplicada?.ID_CAMPANHA === c.ID_CAMPANHA ? 'bg-emerald-600' : 'bg-slate-100 text-slate-600'} border-none font-bold text-[9px] uppercase`}>
                                {c.TIPO === 'COMBO' ? 'COMBO' : c.TIPO === 'QUANTIDADE' ? 'PROGRESSIVA' : 'DESTAQUE'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Flame className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-medium">Nenhuma campanha ativa para este produto</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Aba Política */}
                    <TabsContent value="politica" className="mt-0 focus-visible:ring-0">
                      {politicaAplicada ? (
                        <Card className="rounded-2xl border-emerald-100 bg-emerald-50/30 shadow-none overflow-hidden">
                          <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-emerald-100/50 pb-3">
                              <span className="text-xs font-bold text-emerald-800 uppercase tracking-tight">Política Aplicada</span>
                              <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                {politicaAplicada.NOME_POLITICA}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 col-span-2">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Tabela de Preço</p>
                                <p className="text-sm font-black text-emerald-800">
                                  {tabelaSelecionada ? (tabelaSelecionada.DESCRICAO || `Tabela ${tabelaSelecionada.CODTAB}`) : (config.tabelaPreco && config.tabelaPreco !== 'PADRAO' ? `Tabela ${config.tabelaPreco}` : 'Padrão / Histórico')}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  {config.tabelaPreco && config.tabelaPreco !== 'PADRAO' && (
                                    <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-slate-200 py-0 h-4">
                                      CODTAB: {config.tabelaPreco}
                                    </Badge>
                                  )}
                                  {config.nutab !== undefined && config.nutab !== null && Number(config.nutab) > 0 && (
                                    <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-slate-200 py-0 h-4">
                                      NUTAB: {config.nutab}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {maxDesconto !== undefined && (
                                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Desc. Máximo</p>
                                  <p className="text-sm font-black text-emerald-600">{maxDesconto}%</p>
                                </div>
                              )}
                              {maxAcrescimo !== undefined && (
                                <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Acrésc. Máximo</p>
                                  <p className="text-sm font-black text-emerald-600">{maxAcrescimo}%</p>
                                </div>
                              )}
                            </div>

                            {politicaAplicada._evaluationLogs && (
                              <div className="bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                                <p className="text-[9px] font-bold text-emerald-800 uppercase mb-2">Regras Atendidas:</p>
                                <div className="space-y-1.5">
                                  {politicaAplicada._evaluationLogs.filter((log: any) => log.Resultado === '✅ SIM' || log.Score === '+1').slice(0, 3).map((log: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-600">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                      <span className="font-bold text-slate-700">{log.Campo}:</span> {log.Motivo}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ) : (
                        <div className="py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Sparkles className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-medium">Nenhuma política comercial específica encontrada</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Aba Estoque */}
                    <TabsContent value="estoque" className="mt-0 focus-visible:ring-0">
                      <div className="space-y-2">
                        {loadingEstoque ? (
                          <div className="py-8 text-center">
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          </div>
                        ) : estoques.length > 0 ? (
                          estoques.map((est, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Local: {est.codigoLocal}</span>
                                <span className="text-xs font-bold text-slate-700">{est.controle || 'Sem Controle'}</span>
                              </div>
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-xs">
                                {est.estoque} {produto.UNIDADE}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Boxes className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">Nenhum estoque online disponível</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Resumo de Valores */}
              {isPrecoValido ? (
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <div className="flex flex-col gap-1.5 px-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-4">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Preço de Tabela</span>
                      <span>{formatCurrency(config.precoBase || 0)}</span>
                    </div>
                    {(campanhaAplicada as any) && (
                      <div className="flex justify-between items-center text-[11px] font-bold text-red-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>Campanha ({(campanhaAplicada as any).regra?.DESCONTO}%)</span>
                        </div>
                        <span>- {formatCurrency((config.precoBase || 0) * ((campanhaAplicada as any).regra?.DESCONTO / 100))}</span>
                      </div>
                    )}
                    {config.desconto > 0 && (
                      <div className="flex justify-between items-center text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          <span>Desconto Manual ({config.desconto}%)</span>
                        </div>
                        <span>- {formatCurrency(((config.precoBase || 0) * (1 - ((campanhaAplicada as any)?.regra?.DESCONTO || 0) / 100)) * (config.desconto / 100))}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center bg-[#1E5128] p-5 rounded-2xl shadow-lg shadow-[#1E5128]/20">
                    <span className="text-sm font-bold text-white/80 uppercase tracking-widest">Valor do Item</span>
                    <span className="text-3xl font-black text-white tracking-tight">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-6">
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-start gap-3">
                    <Table className="w-5 h-5 text-[#76BA1B] mt-0.5" />
                    <p className="text-sm font-medium text-[#1E5128] leading-snug">
                      Selecione uma <strong>tabela de preço</strong> para calcular o valor e adicionar ao pedido.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#F2F2F2] bg-white flex-shrink-0">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-1/3 h-12 rounded-xl text-sm font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => onConfirmar(config)}
                disabled={disabled || !isPrecoValido}
                className="flex-1 h-12 rounded-xl bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold transition-all disabled:opacity-50 shadow-sm shadow-[#76BA1B]/20"
              >
                {modo === 'editar' ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Adicionar ao Pedido
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showEscolherPreco && (
        <EscolherPrecoTabelaModal
          open={showEscolherPreco}
          onOpenChange={setShowEscolherPreco}
          produto={produto}
          tabelas={tabelasPrecos}
          onSelect={(tab) => {
            handleTabelaChange(tab.CODTAB)
            // Quando seleciona tabela, definimos o PRECO e também o PRECO_BASE 
            // para que as campanhas e descontos sejam calculados a partir dele.
            const novoPreco = tab.PRECO || 0;
            setConfig(prev => ({
              ...prev,
              preco: novoPreco,
              precoBase: novoPreco,
              desconto: 0,
              acrescimo: 0,
              nutab: tab.NUTAB
            }))
            setShowEscolherPreco(false)
          }}
        />
      )}
    </>
  )
}
