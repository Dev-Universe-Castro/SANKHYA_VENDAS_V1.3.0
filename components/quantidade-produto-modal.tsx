"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Boxes } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface QuantidadeProdutoModalProps {
    isOpen: boolean
    onClose: () => void
    product: any
    onConfirm?: (product: any, preco: number, quantidade: number, tabela?: string, desconto?: number, controle?: string, localEstoque?: number, maxDesconto?: number, maxAcrescimo?: number, precoBase?: number, politicaAplicada?: any) => void
    preco?: number
    quantidadeInicial?: number // Quantidade inicial ao editar
    viewMode?: boolean // Modo de visualização (somente leitura)
    maxDesconto?: number
    maxAcrescimo?: number
    precoBase?: number
    politicaAplicada?: any
}

export function QuantidadeProdutoModal({ isOpen, onClose, product, onConfirm, preco: precoInicial, quantidadeInicial, viewMode = false, maxDesconto, maxAcrescimo, precoBase: precoBaseProp, politicaAplicada }: QuantidadeProdutoModalProps) {
    const [preco, setPreco] = useState<number>(precoInicial || 0)
    const [quantidade, setQuantidade] = useState<number>(quantidadeInicial || 1)
    const [controle, setControle] = useState<string>("007")

    const [estoques, setEstoques] = useState<any[]>([])
    const [loadingEstoque, setLoadingEstoque] = useState(false)

    useEffect(() => {
        if (isOpen && product) {
            setPreco(precoInicial || 0)
            setQuantidade(quantidadeInicial || 1)
            carregarEstoqueOnline()
        }
    }, [isOpen, product, precoInicial, quantidadeInicial])

    const carregarEstoqueOnline = async () => {
        if (!product?.CODPROD || !navigator.onLine) {
            setEstoques([])
            return
        }

        setLoadingEstoque(true)
        try {
            const response = await fetch(`/api/sankhya/estoque/live?codProd=${product.CODPROD}`)
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

    const handleConfirm = () => {
        if (quantidade <= 0) {
            alert('A quantidade deve ser maior que zero')
            return
        }
        if (onConfirm) {
            onConfirm(product, preco, quantidade, undefined, undefined, controle, 0, maxDesconto, maxAcrescimo, precoBaseProp !== undefined ? precoBaseProp : precoInicial, politicaAplicada)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const calcularTotal = () => {
        return preco * quantidade
    }

    if (!product) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 flex flex-col h-full">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle>{viewMode ? 'Detalhes do Produto' : 'Adicionar Produto'}</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">{product.CODPROD} - {product.DESCRPROD}</p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                                <Label className="text-xs text-muted-foreground">Marca</Label>
                                <p className="font-medium">{product.MARCA || '-'}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Unidade</Label>
                                <p className="font-medium">{product.UNIDADE || 'MM'}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Preço Unit.</Label>
                                <p className="font-medium text-green-700">
                                    {formatCurrency(preco)}
                                </p>
                            </div>
                        </div>

                        {(loadingEstoque || estoques.length > 0) && (
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                                <Label className="text-sm font-bold text-orange-700 flex items-center gap-2 mb-3">
                                    <Boxes className="w-4 h-4" />
                                    Estoque Online (ERP)
                                </Label>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                    {loadingEstoque ? (
                                        <div className="flex items-center justify-center p-2">
                                            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : estoques.map((est, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-orange-100 rounded-md gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-800 rounded border-orange-200">Local: {est.codigoLocal}</Badge>
                                                    {est.controle && est.controle.trim() && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-600 rounded">Controle: {est.controle}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`font-bold text-sm whitespace-nowrap bg-white px-2 py-1 rounded border shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${est.estoque > 0 ? 'text-[#76BA1B] border-green-100' : 'text-red-500 border-red-100'}`}>
                                                Qtd: {est.estoque}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {maxDesconto !== undefined && maxDesconto !== null && (
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-700 font-medium">
                                POLÍTICA COMERCIAL: Limite de desconto de {maxDesconto}%
                            </div>
                        )}

                        {!viewMode && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="quantidade">Quantidade *</Label>
                                    <Input
                                        id="quantidade"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={quantidade}
                                        onChange={(e) => setQuantidade(Number(e.target.value))}
                                        placeholder="Digite a quantidade"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="controle">Controle (Lote/Série) *</Label>
                                    <Input
                                        id="controle"
                                        value={controle}
                                        onChange={(e) => setControle(e.target.value)}
                                    />
                                </div>

                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <Label className="text-sm text-muted-foreground">Total</Label>
                                    <p className="text-2xl font-bold text-green-700">
                                        {formatCurrency(calcularTotal())}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {quantidade} × {formatCurrency(preco)}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="flex-shrink-0 pt-4 border-t mt-auto flex gap-2">
                        {viewMode ? (
                            <Button onClick={onClose} className="w-full">
                                Fechar
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={onClose} className="flex-1">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleConfirm}
                                    className="bg-green-600 hover:bg-green-700 flex-1"
                                    disabled={quantidade <= 0}
                                >
                                    ADICIONAR PRODUTO
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
