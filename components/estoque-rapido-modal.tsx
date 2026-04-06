"use client"

import { useState, useEffect } from "react"
import { Boxes, Package, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface EstoqueRapidoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    produto: any | null
}

export function EstoqueRapidoModal({
    open,
    onOpenChange,
    produto
}: EstoqueRapidoModalProps) {
    const [estoques, setEstoques] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (produto && open) {
            carregarEstoqueOnline()
        }
    }, [produto, open])

    const carregarEstoqueOnline = async () => {
        if (!produto?.CODPROD || !navigator.onLine) {
            setEstoques([])
            return
        }

        setLoading(true)
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
            setLoading(false)
        }
    }

    if (!produto) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[450px] w-[95vw] p-0 border-0 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Boxes className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <DialogTitle className="text-base font-bold text-slate-800 truncate">
                                Consulta de Estoque
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 truncate">
                                {produto.DESCRPROD} (Cód: {produto.CODPROD})
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-3 border-[#76BA1B] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-bold text-[#1E5128] animate-pulse">Consultando ERP...</p>
                        </div>
                    ) : estoques.length > 0 ? (
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                Disponibilidade por Local
                            </Label>
                            {estoques.map((est, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl gap-4 shadow-sm hover:border-emerald-100 hover:bg-emerald-50/10 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-white text-emerald-700 rounded border-emerald-100 font-bold">
                                                LOCAL: {est.codigoLocal}
                                            </Badge>
                                            {est.controle && est.controle.trim() && (
                                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-slate-500 border-slate-200 rounded-md font-medium">
                                                    {est.controle}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-lg font-black tracking-tight ${est.estoque > 0 ? 'text-[#76BA1B]' : 'text-red-500'}`}>
                                            {est.estoque} <span className="text-[10px] font-bold uppercase text-slate-400">un</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                            <div className="p-3 bg-slate-100 rounded-full">
                                <Package className="w-8 h-8 text-slate-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700">Sem estoque disponível</h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                                    Não encontramos saldo para este produto nos locais de estoque consultados.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="w-full h-11 bg-[#1E5128] hover:bg-black text-white font-bold rounded-xl transition-all"
                    >
                        FECHAR CONSULTA
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
