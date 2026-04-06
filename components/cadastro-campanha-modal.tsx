"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, Trash2, Package, Flame, Boxes, TrendingUp } from "lucide-react"
import { OfflineDataService } from "@/lib/offline-data-service"
import { toast } from "sonner"

interface CadastroCampanhaModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    campanhaEdicao?: any
}

export default function CadastroCampanhaModal({ isOpen, onClose, onSuccess, campanhaEdicao }: CadastroCampanhaModalProps) {
    const [loading, setLoading] = useState(false)
    const [tipo, setTipo] = useState("COMBO")
    const [nome, setNome] = useState("")
    const [dtInicio, setDtInicio] = useState(new Date().toISOString().split('T')[0])
    const [dtFim, setDtFim] = useState("")
    const [descontoGeral, setDescontoGeral] = useState("")
    const [observacao, setObservacao] = useState("")

    // Itens da campanha
    const [itens, setItens] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            resetForm()
        } else if (campanhaEdicao) {
            // Modo Edição
            setNome(campanhaEdicao.NOME)
            setTipo(campanhaEdicao.TIPO)
            setDtInicio(campanhaEdicao.DTINICIO ? new Date(campanhaEdicao.DTINICIO).toISOString().split('T')[0] : "")
            setDtFim(campanhaEdicao.DTFIM ? new Date(campanhaEdicao.DTFIM).toISOString().split('T')[0] : "")
            setDescontoGeral(campanhaEdicao.DESCONTO_GERAL?.toString() || "")
            setObservacao(campanhaEdicao.OBSERVACAO || "")

            // Carregar itens
            const carregarItens = async () => {
                try {
                    const itensDaCamp = await OfflineDataService.getItensCampanha(campanhaEdicao.ID_CAMPANHA)
                    // Buscar descrições dos produtos para exibir corretamente
                    const produtosIds = itensDaCamp.map(i => i.CODPROD)
                    const produtosDados = await OfflineDataService.getProdutosByIds(produtosIds)

                    const itensComDescricao = itensDaCamp.map(item => ({
                        ...item,
                        DESCRPROD: produtosDados.find(p => p.CODPROD === item.CODPROD)?.DESCRPROD || "Produto não encontrado"
                    }))

                    setItens(itensComDescricao)
                } catch (error) {
                    console.error("Erro ao carregar itens da campanha:", error)
                }
            }
            carregarItens()
        }
    }, [isOpen, campanhaEdicao])

    const resetForm = () => {
        setNome("")
        setTipo("COMBO")
        setDtInicio(new Date().toISOString().split('T')[0])
        setDtFim("")
        setDescontoGeral("")
        setObservacao("")
        setItens([])
        setSearchTerm("")
        setSearchResults([])
    }

    const handleSearch = async (val: string) => {
        setSearchTerm(val)
        if (val.length < 2) {
            setSearchResults([])
            return
        }

        setSearching(true)
        try {
            const results = await OfflineDataService.getProdutos({ search: val, ativo: 'S' })
            setSearchResults(results.slice(0, 5))
        } catch (error) {
            console.error("Erro ao buscar produtos:", error)
        } finally {
            setSearching(false)
        }
    }

    const addProduto = (produto: any) => {
        if (itens.some(i => i.CODPROD === produto.CODPROD)) {
            toast.warning("Produto já adicionado")
            return
        }

        const novoItem = {
            CODPROD: produto.CODPROD,
            DESCRPROD: produto.DESCRPROD,
            QTDMIN: 1,
            DESCONTO: tipo === 'DESTAQUE' ? Number(descontoGeral) || 0 : 0
        }

        setItens([...itens, novoItem])
        setSearchTerm("")
        setSearchResults([])
    }

    const removeItem = (index: number) => {
        setItens(itens.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItens = [...itens]
        newItens[index] = { ...newItens[index], [field]: value }
        setItens(newItens)
    }

    const handleSalvar = async () => {
        if (!nome) return toast.error("Informe o nome da campanha")
        if (itens.length === 0) return toast.error("Adicione pelo menos um produto")

        setLoading(true)
        try {
            const campanha = {
                ...campanhaEdicao,
                NOME: nome,
                TIPO: tipo,
                DTINICIO: dtInicio ? new Date(dtInicio).toISOString() : null,
                DTFIM: dtFim ? new Date(dtFim).toISOString() : null,
                DESCONTO_GERAL: Number(descontoGeral) || 0,
                OBSERVACAO: observacao,
                ATIVO: campanhaEdicao?.ATIVO || 'S'
            }

            await OfflineDataService.saveCampanha(campanha, itens)
            toast.success(campanhaEdicao ? "Campanha atualizada com sucesso!" : "Campanha cadastrada com sucesso!")
            onSuccess()
            onClose()
        } catch (error) {
            toast.error("Erro ao salvar campanha")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#1E5128] flex items-center gap-2">
                        {tipo === 'DESTAQUE' && <Flame className="w-6 h-6 text-orange-600" />}
                        {campanhaEdicao ? "Editar Campanha" : "Nova Campanha"}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome da Campanha</Label>
                            <Input
                                placeholder="Ex: Combo Verão, Desconto Atacado..."
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo de Campanha</Label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="COMBO">Combo (Conjunto de Produtos)</SelectItem>
                                    <SelectItem value="QUANTIDADE">Por Quantidade (Progressivo)</SelectItem>
                                    <SelectItem value="DESTAQUE">Destaque (Preço Fixo/Banner)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data Início</Label>
                                <Input
                                    type="date"
                                    value={dtInicio}
                                    onChange={e => setDtInicio(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data Fim (Opcional)</Label>
                                <Input
                                    type="date"
                                    value={dtFim}
                                    onChange={e => setDtFim(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Desconto Geral % (Opcional)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={descontoGeral}
                                onChange={e => setDescontoGeral(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="flex items-center justify-between">
                            Produtos Participantes
                            <span className="text-[10px] text-gray-400 font-normal uppercase tracking-wider">
                                {itens.length} selecionados
                            </span>
                        </Label>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar produto por nome ou código..."
                                className="pl-9 rounded-xl"
                                value={searchTerm}
                                onChange={e => handleSearch(e.target.value)}
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-[#F2F2F2] rounded-2xl shadow-xl overflow-hidden">
                                    {searchResults.map(p => (
                                        <div
                                            key={p.CODPROD}
                                            className="p-3 hover:bg-[#F2F2F2] cursor-pointer flex items-center justify-between transition-colors border-b border-[#F2F2F2] last:border-0"
                                            onClick={() => addProduto(p)}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800">{p.DESCRPROD}</span>
                                                <span className="text-[10px] text-gray-500">CÓD: {p.CODPROD}</span>
                                            </div>
                                            <Plus className="w-4 h-4 text-[#76BA1B]" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {itens.length === 0 ? (
                                <div className="py-8 text-center border-2 border-dashed border-[#F2F2F2] rounded-2xl">
                                    <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">Nenhum produto adicionado</p>
                                </div>
                            ) : (
                                itens.map((item, index) => (
                                    <Card key={index} className="rounded-xl border-[#F2F2F2] shadow-sm">
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{item.DESCRPROD}</p>
                                                    <p className="text-[10px] text-gray-500">CÓD: {item.CODPROD}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {tipo === 'QUANTIDADE' && (
                                                        <div className="w-24">
                                                            <Label className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1 block">A partir de</Label>
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Ex: 10"
                                                                    className="h-9 text-xs rounded-lg pr-7"
                                                                    value={item.QTDMIN}
                                                                    onChange={e => updateItem(index, 'QTDMIN', Number(e.target.value))}
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">un</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {tipo !== 'DESTAQUE' && (
                                                        <div className="w-24">
                                                            <Label className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1 block">Desconto</Label>
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Ex: 5"
                                                                    className="h-9 text-xs rounded-lg pr-7"
                                                                    value={item.DESCONTO}
                                                                    onChange={e => updateItem(index, 'DESCONTO', Number(e.target.value))}
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mt-2">
                    <Label>Observações Internas (Opcional)</Label>
                    <Input
                        placeholder="Notas sobre a campanha..."
                        value={observacao}
                        onChange={e => setObservacao(e.target.value)}
                        className="rounded-xl"
                    />
                </div>

                <DialogFooter className="mt-8 gap-3 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="rounded-full px-8 h-12 border-[#F2F2F2]">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSalvar}
                        disabled={loading}
                        className="bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-full px-8 h-12 shadow-lg shadow-[#76BA1B]/20 min-w-[150px]"
                    >
                        {loading ? "Salvando..." : (campanhaEdicao ? "Salvar Alterações" : "Criar Campanha")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
