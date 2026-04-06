"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Plus, Search, Edit, Trash2, RefreshCw, Calendar as CalendarIcon, User as UserIcon, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Lead } from "@/lib/leads-service"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { CatalogoProdutosPedido } from "@/components/catalogo-produtos-pedido"
import VendedorSelectorModal from "@/components/vendedor-selector-modal"

interface LeadCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  funilSelecionado?: any
}

interface Partner {
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
}

interface Produto {
  CODPROD: string
  DESCRPROD: string
  QTDNEG: number
  VLRUNIT: number
  PERCDESC: number
  VLRCOMERC?: string
  ESTOQUE?: string
  quantidade?: number; // Adicionado para compatibilidade com a estrutura esperada no save
  VLRTOTAL?: number; // Adicionado para compatibilidade com a estrutura esperada no save
}

const TIPOS_TAG = [
  'Ads Production',
  'Landing Page',
  'Dashboard',
  'UX Design',
  'Video Production',
  'Typeface',
  'Web Design'
]

export function LeadCreateModal({ isOpen, onClose, onSave, funilSelecionado }: LeadCreateModalProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({
    NOME: "",
    DESCRICAO: "",
    VALOR: 0,
    CODESTAGIO: "",
    DATA_VENCIMENTO: new Date().toISOString().split('T')[0],
    TIPO_TAG: "",
    COR_TAG: "#3b82f6",
    CODPARC: undefined,
    CODFUNIL: undefined,
    CODVEND: undefined
  })
  const [isSaving, setIsSaving] = useState(false)
  const [parceiros, setParceiros] = useState<Partner[]>([])
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [estagios, setEstagios] = useState<any[]>([])
  const { toast } = useToast()
  const [partnerSearch, setPartnerSearch] = useState("")
  const [vendedorSearch, setVendedorSearch] = useState("")
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
  const [dataConclusao, setDataConclusao] = useState("")
  const [produtosSelecionados, setProdutosSelecionados] = useState<Produto[]>([])
  const [showItemModal, setShowItemModal] = useState(false)
  const [showVendedorModal, setShowVendedorModal] = useState(false)
  const [showCatalogo, setShowCatalogo] = useState(false)
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null)
  const [itemAtual, setItemAtual] = useState<Produto>({
    CODPROD: '',
    DESCRPROD: '',
    QTDNEG: 1,
    VLRUNIT: 0,
    PERCDESC: 0
  })
  const [valorUnitarioProduto, setValorUnitarioProduto] = useState<number>(0)

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setFormData({
        NOME: "",
        DESCRICAO: "",
        VALOR: 0,
        CODESTAGIO: "",
        DATA_VENCIMENTO: new Date().toISOString().split('T')[0],
        TIPO_TAG: "",
        COR_TAG: "#3b82f6",
        CODPARC: undefined,
        CODFUNIL: undefined,
        CODVEND: undefined,
      })
      setDataInicio(new Date().toISOString().split('T')[0])
      setDataConclusao("")
      setPartnerSearch("")
      setVendedorSearch("")
      setProdutosSelecionados([])
      setValorUnitarioProduto(0)
      setShowCatalogo(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      loadPartners()
      if (funilSelecionado) {
        console.log('🔍 Funil selecionado:', funilSelecionado)
        console.log('🔍 Estágios do funil:', funilSelecionado.estagios)
        
        setEstagios(funilSelecionado.estagios || [])
        
        // Sempre definir CODFUNIL
        setFormData(prev => {
          const newData = {
            ...prev,
            CODFUNIL: String(funilSelecionado.CODFUNIL)
          }
          
          // Se houver estágios, definir o primeiro
          if (funilSelecionado.estagios && funilSelecionado.estagios.length > 0) {
            newData.CODESTAGIO = String(funilSelecionado.estagios[0].CODESTAGIO)
            console.log('✅ Estágio inicial definido:', newData.CODESTAGIO)
          } else {
            console.warn('⚠️ Funil sem estágios cadastrados!')
          }
          
          console.log('📋 FormData atualizado:', newData)
          return newData
        })
      }
    }
  }, [isOpen, funilSelecionado])

  const loadPartners = async (searchTerm: string = "") => {
    try {
      setIsLoadingPartners(true)

      const { OfflineDataService } = await import('@/lib/offline-data-service')
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        setParceiros([])
        setIsLoadingPartners(false)
        return
      }

      // Buscar parceiros filtrados diretamente no IndexedDB
      const searchTrimmed = searchTerm.trim();
      const filtered = await OfflineDataService.getParceiros({ search: searchTrimmed })
      
      setParceiros(filtered)
    } catch (error: any) {
      console.error('❌ Erro ao carregar parceiros:', error)
      setParceiros([])
    } finally {
      setIsLoadingPartners(false)
    }
  }

  const handlePartnerSearch = async (value: string) => {
    setPartnerSearch(value)

    if (value.length < 2) {
      setParceiros([])
      return
    }

    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      // Busca direta filtrada no IndexedDB é muito mais rápida
      const filtered = await OfflineDataService.getParceiros({ search: value.trim() })
      setParceiros(filtered)
    } catch (e) {
      console.error('Erro na busca de parceiros:', e)
    }
  }

  const selecionarParceiro = (codParc: string, nomeParc: string) => {
    setFormData({ ...formData, CODPARC: String(codParc) })
    setPartnerSearch(nomeParc)
    setParceiros([]) // Limpar lista após seleção
    console.log('✅ Parceiro selecionado:', nomeParc)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('📝 Iniciando criação de lead')
    console.log('   - formData:', formData)
    console.log('   - funilSelecionado:', funilSelecionado)
    console.log('   - dataInicio:', dataInicio)

    if (!formData.NOME) {
      toast({
        title: "Atenção",
        description: "Nome do negócio é obrigatório.",
        variant: "destructive",
      })
      return
    }

    if (!dataInicio) {
      toast({
        title: "Atenção",
        description: "Data de criação é obrigatória.",
        variant: "destructive",
      })
      return
    }

    // Garantir que CODFUNIL está definido
    const codFunilFinal = formData.CODFUNIL || funilSelecionado?.CODFUNIL
    
    if (!codFunilFinal) {
      toast({
        title: "Atenção",
        description: "Nenhum funil foi selecionado.",
        variant: "destructive",
      })
      return
    }

    // Garantir que CODESTAGIO está definido
    if (!formData.CODESTAGIO) {
      // Tentar pegar o primeiro estágio do funil
      if (estagios && estagios.length > 0) {
        setFormData(prev => ({
          ...prev,
          CODESTAGIO: String(estagios[0].CODESTAGIO)
        }))
        
        toast({
          title: "Atenção",
          description: "Estágio definido automaticamente. Tente salvar novamente.",
        })
        return
      }
      
      toast({
        title: "Atenção",
        description: "Este funil não possui estágios cadastrados. Por favor, configure os estágios do funil primeiro.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Calcular valor total dos produtos
      const valorTotalProdutos = produtosSelecionados.reduce((total, p) => total + calcularTotalProduto(p), 0)

      // Mapear produtos com campos corretos
      const produtosParaSalvar = produtosSelecionados.map(p => ({
        CODPROD: p.CODPROD,
        DESCRPROD: p.DESCRPROD,
        QUANTIDADE: p.QTDNEG, // Mapear QTDNEG para QUANTIDADE
        VLRUNIT: p.VLRUNIT,
        VLRTOTAL: p.VLRTOTAL || calcularTotalProduto(p),
        CODVOL: (p as any).CODVOL || 'UN',
        PERCDESC: p.PERCDESC || 0
      }));

      const codFunilParaSalvar = formData.CODFUNIL || funilSelecionado?.CODFUNIL
      const codEstagioParaSalvar = formData.CODESTAGIO || (estagios && estagios.length > 0 ? estagios[0].CODESTAGIO : null)

      console.log('🚀 Enviando requisição para salvar lead')
      console.log('   - CODFUNIL:', codFunilParaSalvar)
      console.log('   - CODESTAGIO:', codEstagioParaSalvar)
      console.log('   - FormData completo:', formData)

      if (!codFunilParaSalvar || !codEstagioParaSalvar) {
        toast({
          title: "Erro",
          description: "Funil ou estágio inválido. Por favor, tente novamente.",
          variant: "destructive",
        })
        return
      }

      const dataToSave = {
        NOME: String(formData.NOME),
        DESCRICAO: String(formData.DESCRICAO || ""),
        VALOR: Number(valorTotalProdutos || formData.VALOR || 0),
        CODESTAGIO: String(codEstagioParaSalvar),
        CODFUNIL: String(codFunilParaSalvar),
        DATA_VENCIMENTO: String(dataConclusao || formData.DATA_VENCIMENTO || ""),
        TIPO_TAG: String(formData.TIPO_TAG || ""),
        COR_TAG: String(formData.COR_TAG || "#3b82f6"),
        CODPARC: formData.CODPARC ? String(formData.CODPARC) : undefined,
        PRODUTOS: produtosParaSalvar
      }

      console.log('📦 Dados enviados para salvar:', dataToSave)
      console.log('📦 Produtos a salvar:', dataToSave.PRODUTOS)
      console.log('📦 Total de produtos:', dataToSave.PRODUTOS.length)

      if (!dataToSave.NOME) {
        toast({
          title: "Erro",
          description: "Nome do negócio é obrigatório",
          variant: "destructive",
        })
        setIsSaving(false)
        return
      }

      if (!dataToSave.CODESTAGIO) {
        toast({
          title: "Erro",
          description: "Estágio é obrigatório",
          variant: "destructive",
        })
        setIsSaving(false)
        return
      }


      const response = await fetch('/api/leads/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro ao salvar lead:', errorData)
        throw new Error(errorData.error || 'Falha ao salvar lead')
      }

      const result = await response.json()
      console.log('✅ Lead salvo com sucesso:', result)

      toast({
        title: "Sucesso",
        description: "Negócio criado com sucesso!",
      })

      onSave()
      onClose()
    } catch (error: any) {
      console.error('❌ Erro completo:', error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar lead",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const parceiroSelecionado = parceiros.find(p => p.CODPARC === formData.CODPARC)

  const calcularTotalProduto = (produto: Produto) => {
    return (produto.QTDNEG * produto.VLRUNIT) * (1 - (produto.PERCDESC / 100));
  };

  const calcularValorTotal = () => {
    return produtosSelecionados.reduce((total, p) => total + calcularTotalProduto(p), 0);
  };

  const abrirModalEditarProduto = (index: number) => {
    const produto = produtosSelecionados[index];
    setItemAtual({ ...produto });
    setCurrentItemIndex(index);
    setValorUnitarioProduto(produto.VLRUNIT); // Set the unit price from the selected product
    setShowItemModal(true);
  };

  const removerProduto = (index: number) => {
    setProdutosSelecionados(produtosSelecionados.filter((_, i) => i !== index));
  };

  const confirmarProduto = () => {
    if (!itemAtual.DESCRPROD || itemAtual.QTDNEG <= 0 || valorUnitarioProduto <= 0) { // Use valorUnitarioProduto here
      toast({
        title: "Atenção",
        description: "Por favor, preencha todos os campos obrigatórios do produto.",
        variant: "destructive",
      });
      return;
    }

    const produtoCalculado = {
      ...itemAtual,
      VLRUNIT: valorUnitarioProduto, // Use the state value for VLRUNIT
      VLRTOTAL: calcularTotalProduto({ ...itemAtual, VLRUNIT: valorUnitarioProduto }) // Calculate VLRTOTAL here
    };

    if (currentItemIndex !== null) {
      const newProdutos = [...produtosSelecionados];
      newProdutos[currentItemIndex] = produtoCalculado;
      setProdutosSelecionados(newProdutos);
    } else {
      setProdutosSelecionados([...produtosSelecionados, produtoCalculado]);
    }
    setShowItemModal(false);
  };



  const handleConfirmarProdutoEstoque = async (produto: any, preco: number, quantidade: number) => {
    const vlrtotal = preco * quantidade
    const produtoCalculado = {
      CODPROD: produto.CODPROD,
      DESCRPROD: produto.DESCRPROD,
      QTDNEG: quantidade,
      VLRUNIT: preco,
      PERCDESC: 0,
      VLRTOTAL: vlrtotal
    };

    setProdutosSelecionados([...produtosSelecionados, produtoCalculado]);

    toast({
      title: "Sucesso",
      description: "Produto adicionado com sucesso!",
    });
  };



  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl md:max-h-[90vh] h-screen md:h-auto w-screen md:w-auto max-w-full md:max-w-2xl m-0 md:m-4 p-0 flex flex-col rounded-none md:rounded-lg">
        <DialogHeader className="px-4 md:px-6 py-3 md:py-4 border-b flex-shrink-0">
          <DialogTitle>Adicionar novo negócio</DialogTitle>
        </DialogHeader>
        <form id="lead-create-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide px-4 md:px-6 py-4 pb-6 min-h-0">
            {/* Dados básicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Dados básicos</h3>

              <div className="space-y-2">
                <Label htmlFor="NOME">
                  Nome do negócio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="NOME"
                  value={formData.NOME}
                  onChange={(e) => setFormData({ ...formData, NOME: e.target.value })}
                  placeholder="Digite o nome do negócio"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parceiro">Cliente (opcional)</Label>
                <div className="relative">
                  <Input
                    id="parceiro"
                    type="text"
                    placeholder="Digite para buscar cliente..."
                    value={partnerSearch}
                    onChange={(e) => {
                      setPartnerSearch(e.target.value)
                      handlePartnerSearch(e.target.value)
                    }}
                  />
                  {partnerSearch.length >= 2 && !formData.CODPARC && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {isLoadingPartners ? (
                        <div className="p-3 text-sm text-center text-muted-foreground">Carregando...</div>
                      ) : parceiros.length === 0 ? (
                        <div className="p-3 text-sm text-center text-muted-foreground">
                          Nenhum cliente encontrado
                        </div>
                      ) : (
                        parceiros.map((partner) => (
                          <div
                            key={partner.CODPARC}
                            onClick={() => selecionarParceiro(partner.CODPARC, partner.NOMEPARC)}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                          >
                            <div className="font-medium">{partner.NOMEPARC}</div>
                            <div className="text-xs text-muted-foreground">{partner.CGC_CPF}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {formData.CODPARC && parceiroSelecionado && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Selecionado: {parceiroSelecionado.NOMEPARC}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendedor">Responsável</Label>
                  <div className="relative">
                    <Input
                      id="vendedor"
                      type="text"
                      placeholder="Selecione o vendedor..."
                      value={vendedorSearch || (formData.CODVEND ? `Vendedor ${formData.CODVEND}` : "")}
                      onClick={() => setShowVendedorModal(true)}
                      readOnly
                      className="cursor-pointer"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="CODFUNIL">Funil</Label>
                  <Select
                    value={formData.CODFUNIL || funilSelecionado?.CODFUNIL}
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={funilSelecionado?.NOME || "Selecione um funil"} />
                    </SelectTrigger>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">
                    Data de criação <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataConclusao">Data de conclusão</Label>
                  <Input
                    id="dataConclusao"
                    type="date"
                    value={dataConclusao}
                    onChange={(e) => {
                      setDataConclusao(e.target.value)
                      setFormData({ ...formData, DATA_VENCIMENTO: e.target.value })
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="DESCRICAO">Descrição</Label>
                <Textarea
                  id="DESCRICAO"
                  value={formData.DESCRICAO}
                  onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
                  rows={3}
                  placeholder="Escreva detalhes importantes sobre esse cliente"
                />
              </div>
            </div>

            {/* Produtos e serviços */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Produtos e serviços</h3>
              <p className="text-sm text-muted-foreground">
                Adicione produtos ou serviços com valor e quantidade na sua oportunidade de venda.
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log('Botão Adicionar clicado. showCatalogo atual:', showCatalogo);
                  setShowCatalogo(true);
                }}
                className="w-full flex items-center justify-center gap-2 border-dashed h-24 text-muted-foreground hover:text-foreground hover:border-foreground transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Adicionar produto ou serviço</span>
              </Button>

              {produtosSelecionados.length > 0 && (
                <div className="space-y-3">
                  {produtosSelecionados.map((produto, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{produto.DESCRPROD}</p>
                          <p className="text-xs text-muted-foreground">
                            {produto.QTDNEG} x {formatCurrency(produto.VLRUNIT)}
                            {produto.PERCDESC > 0 && ` (-${produto.PERCDESC}%)`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-sm">
                            {formatCurrency(calcularTotalProduto(produto))}
                          </span>
                          <div className="flex items-center gap-1 border-l pl-2 ml-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-blue-600 hover:bg-blue-50"
                              onClick={() => abrirModalEditarProduto(index)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-red-600 hover:bg-red-50"
                              onClick={() => removerProduto(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(calcularValorTotal())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-4 md:px-6 py-4 border-t flex-shrink-0 bg-slate-50">
            <div className="flex w-full gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Criar negócio"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Modal de Item (Quantidade/Desconto) */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{currentItemIndex !== null ? 'Editar Item' : 'Configurar Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <div className="p-3 bg-muted rounded-md text-sm font-medium">
                {itemAtual.DESCRPROD}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qtd">Quantidade</Label>
                <Input
                  id="qtd"
                  type="number"
                  min="1"
                  value={itemAtual.QTDNEG}
                  onChange={(e) => setItemAtual({ ...itemAtual, QTDNEG: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vlr">Valor Unitário</Label>
                <Input
                  id="vlr"
                  type="number"
                  step="0.01"
                  value={valorUnitarioProduto}
                  onChange={(e) => setValorUnitarioProduto(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Desconto (%)</Label>
              <Input
                id="desc"
                type="number"
                min="0"
                max="100"
                value={itemAtual.PERCDESC}
                onChange={(e) => setItemAtual({ ...itemAtual, PERCDESC: Number(e.target.value) })}
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center font-bold">
                <span>Total do Item:</span>
                <span className="text-green-600">
                  {formatCurrency(calcularTotalProduto({ ...itemAtual, VLRUNIT: valorUnitarioProduto }))}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemModal(false)}>Cancelar</Button>
            <Button onClick={confirmarProduto} className="bg-green-600 hover:bg-green-700">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Seleção de Produto - Usando CatalogoProdutosPedido */}
      <Dialog open={showCatalogo} onOpenChange={setShowCatalogo}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Catálogo de Produtos</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-4">
            <CatalogoProdutosPedido
              onAdicionarItem={(produto, quantidade, desconto) => {
                console.log('✅ Produto recebido do catálogo:', produto);
                handleConfirmarProdutoEstoque(produto, produto.preco || produto.VLRUNIT, quantidade);
              }}
              tabelaPreco={""}
              tabelasPrecos={tabelasPrecos}
              itensCarrinho={[]}
              codParc={formData.CODPARC}
              isLeadMode={true}
            />
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setShowCatalogo(false)}>
              Fechar Catálogo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Seleção de Vendedor */}
      <VendedorSelectorModal
        isOpen={showVendedorModal}
        onClose={() => setShowVendedorModal(false)}
        onSelect={(vendedor) => {
          setFormData({ ...formData, CODVEND: Number(vendedor.CODVEND) })
          setVendedorSearch(vendedor.NOMEVEND)
          setShowVendedorModal(false)
        }}
      />
    </Dialog>
  )
}
