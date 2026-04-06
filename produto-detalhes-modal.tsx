
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Download, X, Package, Boxes } from "lucide-react"
import { toast } from "sonner"
import { OfflineDataService } from "@/lib/offline-data-service"

interface ProdutoDetalhesModalProps {
  produto: any
  isOpen: boolean
  onClose: () => void
}

export function ProdutoDetalhesModal({ produto, isOpen, onClose }: ProdutoDetalhesModalProps) {
  const [imagemUrl, setImagemUrl] = useState<string | null>(null)
  const [loadingImagem, setLoadingImagem] = useState(false)
  const [unidadesAlternativas, setUnidadesAlternativas] = useState<any[]>([])
  const [tabelasPrecos, setTabelasPrecos] = useState<any[]>([])
  const [estoques, setEstoques] = useState<any[]>([])
  const [loadingEstoque, setLoadingEstoque] = useState(false)
  const [localSelecionado, setLocalSelecionado] = useState<string>('')

  useEffect(() => {
    if (isOpen && produto?.CODPROD) {
      carregarDadosProduto()
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
      carregarEstoque()
    ])
  }

  const carregarEstoque = async () => {
    if (!produto?.CODPROD) return

    setLoadingEstoque(true)
    try {
      const response = await fetch(`/api/oracle/estoque?codProd=${produto.CODPROD}`)
      
      if (response.ok) {
        const data = await response.json()
        setEstoques(data.estoques || [])
        // Selecionar o primeiro local automaticamente se houver
        if (data.estoques && data.estoques.length > 0) {
          setLocalSelecionado(data.estoques[0].CODLOCAL)
        }
      } else {
        setEstoques([])
      }
    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
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
      const tabelas = await OfflineDataService.getTabelasPrecosConfig()
      const precosPromises = tabelas.map(async (tabela: any) => {
        const precos = await OfflineDataService.getPrecos(Number(produto.CODPROD), Number(tabela.NUTAB))
        let preco = 0
        if (precos.length > 0 && precos[0].VLRVENDA != null) {
          preco = parseFloat(String(precos[0].VLRVENDA).replace(/,/g, '.'))
        }
        return {
          tabela: tabela.DESCRICAO || tabela.CODTAB || `Tabela ${tabela.NUTAB}`,
          nutab: tabela.NUTAB,
          codtab: tabela.CODTAB,
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
        className="max-w-full gap-0 flex flex-col w-full h-[85vh] md:h-[90vh] md:w-full overflow-hidden p-0"
        showCloseButton={false}
      >
        {/* Header com Badge - Fixo no topo */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b bg-green-50 flex-shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <Badge className="bg-green-600 text-white px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm">
              {produto.CODPROD}
            </Badge>
            <Badge variant={produto.ATIVO === 'S' ? "default" : "secondary"} className="text-xs md:text-sm">
              {produto.ATIVO === 'S' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 md:h-10 md:w-10">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6 overflow-y-auto flex-1">
          {/* Imagem - Mobile: colapsada, Desktop: coluna esquerda */}
          <div className="flex items-center justify-center flex-shrink-0">
            <div className="relative w-full h-64 md:h-[calc(100vh-200px)] bg-white rounded-lg border-2 border-gray-100 flex items-center justify-center overflow-hidden">
              {loadingImagem ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs md:text-sm font-medium text-green-600">Carregando...</p>
                </div>
              ) : (
                <>
                  {/* Sempre mostra a inicial primeiro */}
                  <div className={`flex items-center justify-center w-full h-full ${imagemUrl ? 'absolute inset-0' : ''}`}>
                    <div
                      className="w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center text-white font-bold text-4xl md:text-6xl"
                      style={{ backgroundColor: getAvatarColor(produto.DESCRPROD || 'P') }}
                    >
                      {(produto.DESCRPROD || 'P')
                        .split(' ')
                        .filter(word => word.length > 0)
                        .slice(0, 2)
                        .map(word => word[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Se tiver imagem, sobrepõe a inicial */}
                  {imagemUrl && (
                    <img 
                      src={imagemUrl} 
                      alt={produto.DESCRPROD}
                      className="w-full h-full object-contain p-4 md:p-6 relative z-10"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                        setImagemUrl(null)
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Informações - Mobile e Desktop */}
          <div className="flex flex-col space-y-3 md:space-y-4 md:overflow-y-auto md:pr-2">
            {/* Descrição do Produto */}
            <Card className="flex-shrink-0">
              <CardContent className="p-3 md:p-4">
                <Label className="text-xs text-green-600 font-semibold mb-2 block">Descrição do Produto</Label>
                <p className="text-sm md:text-sm font-medium leading-relaxed">{produto.DESCRPROD}</p>
              </CardContent>
            </Card>

            {/* Estoque */}
            <Card className="flex-shrink-0">
              <CardContent className="p-3 md:p-4">
                <Label className="text-xs text-green-600 font-semibold mb-2 md:mb-3 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Estoque Atual
                </Label>
                {loadingEstoque ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : estoques.length > 0 ? (
                  <div className="space-y-2">
                    {/* Seletor de Local */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] md:text-xs text-muted-foreground">Local de Estoque:</Label>
                      <select
                        value={localSelecionado}
                        onChange={(e) => setLocalSelecionado(e.target.value)}
                        className="w-full text-xs md:text-sm p-2 border rounded bg-white"
                      >
                        {estoques.map((est, idx) => (
                          <option key={idx} value={est.CODLOCAL}>
                            {est.CODLOCAL} - Qtd: {parseFloat(est.ESTOQUE || '0').toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Exibição do Estoque Selecionado */}
                    {localSelecionado && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">Local</p>
                            <p className="text-sm md:text-base font-semibold text-green-700">{localSelecionado}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] md:text-xs text-muted-foreground">Quantidade</p>
                            <p className="text-lg md:text-xl font-bold text-green-600">
                              {parseFloat(estoques.find(e => e.CODLOCAL === localSelecionado)?.ESTOQUE || '0').toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Estoque Total */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="font-medium text-muted-foreground">Estoque Total (todos os locais):</span>
                        <span className="font-bold text-green-600">
                          {estoques.reduce((sum, est) => sum + parseFloat(est.ESTOQUE || '0'), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3 text-xs md:text-sm text-muted-foreground">
                    Nenhum estoque disponível
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unidades Alternativas */}
            {unidadesAlternativas.length > 0 && (
              <Card className="flex-shrink-0">
                <CardContent className="p-3 md:p-4">
                  <Label className="text-xs text-green-600 font-semibold mb-2 md:mb-3 flex items-center gap-2">
                    <Boxes className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Unidades Alternativas
                  </Label>
                  <div className="space-y-2 max-h-32 md:max-h-40 overflow-y-auto">
                    {unidadesAlternativas.map((unidade, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs md:text-sm p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{unidade.CODVOL}</span>
                          {unidade.isPadrao && (
                            <Badge variant="outline" className="ml-2 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">Padrão</Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">Qtd: {unidade.QUANTIDADE}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabelas de Preços */}
            {tabelasPrecos.length > 0 && (
              <Card className="flex-shrink-0">
                <CardContent className="p-3 md:p-4">
                  <Label className="text-xs text-green-600 font-semibold mb-2 md:mb-3 block">Tabelas de Vendas Vinculadas</Label>
                  <div className="space-y-2 max-h-40 md:max-h-48 overflow-y-auto">
                    {tabelasPrecos.map((preco, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs md:text-sm p-2 bg-gray-50 rounded gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{preco.tabela}</p>
                          <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">NUTAB: {preco.nutab} | CODTAB: {preco.codtab}</p>
                        </div>
                        <span className="font-semibold text-green-600 text-xs md:text-sm whitespace-nowrap">
                          {preco.preco > 0 ? formatCurrency(preco.preco) : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botão Voltar - Fixo no bottom */}
            <div className="flex gap-2 pt-4 flex-shrink-0 border-t bg-white mt-auto">
              <Button 
                variant="outline" 
                className="w-full text-xs md:text-sm h-9 md:h-10"
                onClick={onClose}
              >
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
