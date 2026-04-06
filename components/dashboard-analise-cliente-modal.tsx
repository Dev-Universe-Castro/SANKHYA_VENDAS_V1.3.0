"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    X, User, Sparkles, BarChart3, TrendingUp, Package, Search, History
} from "lucide-react"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { OfflineDataService } from "@/lib/offline-data-service"

interface DashboardAnaliseClienteModalProps {
    isOpen: boolean
    onClose: () => void
}

interface Parceiro {
    CODPARC: number;
    NOMEPARC: string;
    CGC_CPF: string;
}

interface AnaliseGiro {
    totalQuantidade: number
    totalValor: number
    totalNotas: number
    ticketMedio: number
    mediaQtdDiaria: number
    periodo: string
    graficoBarras: { data: string; quantidade: number; valor: number }[]
    tabelaProdutos: { produto: string; quantidade: number; valor: number }[]
}

export function DashboardAnaliseClienteModal({ isOpen, onClose }: DashboardAnaliseClienteModalProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [parceirosResult, setParceirosResult] = useState<Parceiro[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedCliente, setSelectedCliente] = useState<Parceiro | null>(null)

    const [mesesAnalise, setMesesAnalise] = useState(1)
    const [loadingAnalise, setLoadingAnalise] = useState(false)
    const [analiseGiro, setAnaliseGiro] = useState<AnaliseGiro | null>(null)

    // Reseta estado ao abrir
    useEffect(() => {
        if (isOpen) {
            setSearchTerm("")
            setParceirosResult([])
            setSelectedCliente(null)
            setAnaliseGiro(null)
            setMesesAnalise(1)
        }
    }, [isOpen])

    // Função de busca de parceiros
    const buscarParceiros = async (termo: string) => {
        if (termo.length < 2) {
            setParceirosResult([]);
            return;
        }

        setIsSearching(true);
        try {
            const parceiros = await OfflineDataService.getParceiros({ search: termo });
            setParceirosResult(parceiros || []);
        } catch (error) {
            console.error("Erro ao buscar parceiros:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const buscarParceirosComDebounce = (() => {
        let timer: NodeJS.Timeout;
        return (termo: string) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                buscarParceiros(termo);
            }, 500);
        };
    })();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const getInitials = (name: string) => {
        if (!name) return '??'
        const words = name.trim().split(' ')
        return (words[0][0] + (words[words.length - 1]?.[0] || '')).toUpperCase()
    }

    const carregarAnaliseGiro = async () => {
        if (!selectedCliente?.CODPARC) return

        setLoadingAnalise(true)

        try {
            const response = await fetch('/api/giro-cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codParc: selectedCliente.CODPARC, meses: mesesAnalise })
            })

            if (!response.ok) throw new Error('Erro ao buscar análise')

            const data = await response.json()

            if (data.analise) {
                setAnaliseGiro(data.analise)
            } else {
                toast.info(`Nenhum dado de venda encontrado nos últimos ${mesesAnalise} meses.`)
                setAnaliseGiro(null)
            }
        } catch (error: unknown) {
            console.error('Erro ao carregar análise:', error)
            toast.error('Erro ao carregar análise de giro')
        } finally {
            setLoadingAnalise(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[800px] w-[95vw] h-[90vh] md:h-[85vh] p-0 border-0 rounded-2xl overflow-hidden flex flex-col bg-slate-50">

                {/* Header Fixo */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F2] bg-white sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#76BA1B]/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#76BA1B]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#1E5128] tracking-tight">Análise Preditiva de Cliente</h2>
                            <p className="text-xs text-slate-500 font-medium">Histórico e insights de vendas por parceiro</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
                        <X className="w-5 h-5 text-slate-400" />
                    </Button>
                </div>

                {/* Content Area com Scroll */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

                    {/* Section 1: Seleção de Cliente */}
                    <Card className="rounded-2xl border-[#F2F2F2] shadow-sm bg-white overflow-visible">
                        <CardContent className="p-5">
                            {!selectedCliente ? (
                                <div className="space-y-4">
                                    <Label className="text-sm font-bold text-[#1E5128] flex items-center gap-2">
                                        <User className="w-4 h-4" /> Qual cliente deseja analisar?
                                    </Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <Input
                                            placeholder="Digite nome ou CNPJ/CPF..."
                                            className="pl-10 h-12 text-sm border-slate-200 focus-visible:ring-[#76BA1B] rounded-xl bg-slate-50"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value)
                                                buscarParceirosComDebounce(e.target.value)
                                            }}
                                        />

                                        {/* Resultados Buscados */}
                                        {searchTerm.length >= 2 && (
                                            <div className="absolute top-[calc(100%+8px)] left-0 w-full z-50 bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                {isSearching ? (
                                                    <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-[#76BA1B] border-t-transparent rounded-full animate-spin" />
                                                        Buscando...
                                                    </div>
                                                ) : parceirosResult.length > 0 ? (
                                                    <div className="max-h-60 overflow-y-auto flex flex-col divide-y divide-slate-50">
                                                        {parceirosResult.map((p) => (
                                                            <button
                                                                key={p.CODPARC}
                                                                className="text-left p-3 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                                onClick={() => {
                                                                    setSelectedCliente(p)
                                                                    setSearchTerm("")
                                                                }}
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                                                                    {getInitials(p.NOMEPARC)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold text-sm text-[#1E5128] truncate">{p.NOMEPARC}</p>
                                                                    <p className="text-[11px] text-slate-400">Cód: {p.CODPARC} {p.CGC_CPF ? `| Doc: ${p.CGC_CPF}` : ''}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center text-sm text-slate-500">
                                                        Nenhum cliente encontrado.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-[#76BA1B]/10 p-4 rounded-xl border border-[#76BA1B]/20">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-full bg-[#76BA1B] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
                                            {getInitials(selectedCliente.NOMEPARC)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#1E5128] truncate">{selectedCliente.NOMEPARC}</h3>
                                            <p className="text-xs text-[#1E5128]/70 font-medium">Cód: {selectedCliente.CODPARC}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedCliente(null)
                                            setAnaliseGiro(null)
                                        }}
                                        className="text-[#1E5128] hover:text-[#153a1c] hover:bg-[#76BA1B]/20 rounded-lg text-xs"
                                    >
                                        Trocar
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Section 2: Controles e Ação */}
                    {selectedCliente && (
                        <Card className="rounded-2xl border-[#F2F2F2] shadow-sm bg-white">
                            <CardContent className="p-5 flex flex-col md:flex-row items-center gap-4">
                                <div className="flex-1 w-full space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                        <History className="w-3.5 h-3.5" /> Período em Meses ({mesesAnalise})
                                    </Label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="3"
                                        value={mesesAnalise}
                                        onChange={(e) => setMesesAnalise(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#76BA1B]"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                                        <span>1M</span>
                                        <span>2M</span>
                                        <span>3M</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={carregarAnaliseGiro}
                                    disabled={loadingAnalise}
                                    className="w-full md:w-auto h-12 px-8 bg-[#76BA1B] hover:bg-[#6CA81A] text-white font-bold rounded-xl shadow-md shadow-[#76BA1B]/20 transition-all flex-shrink-0"
                                >
                                    {loadingAnalise ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Gerando...</>
                                    ) : (
                                        <><BarChart3 className="w-4 h-4 mr-2" /> Gerar Análise</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Section 3: Resultados */}
                    {loadingAnalise && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-dashed border-[#76BA1B]/30">
                            <div className="w-10 h-10 border-4 border-[#76BA1B] border-t-transparent rounded-full animate-spin shadow-sm" />
                            <p className="text-sm font-bold text-[#1E5128]">A IA está processando o histórico de vendas...</p>
                        </div>
                    )}

                    {analiseGiro && !loadingAnalise && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white rounded-2xl p-4 border border-[#76BA1B]/10 shadow-sm flex flex-col justify-center items-center text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Valor Total</p>
                                    <p className="text-sm md:text-xl font-bold text-[#1E5128]">{formatCurrency(analiseGiro.totalValor)}</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-[#76BA1B]/10 shadow-sm flex flex-col justify-center items-center text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Qtd. Itens</p>
                                    <p className="text-sm md:text-xl font-bold text-[#1E5128]">{analiseGiro.totalQuantidade}</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-[#76BA1B]/10 shadow-sm flex flex-col justify-center items-center text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Notas</p>
                                    <p className="text-sm md:text-xl font-bold text-[#1E5128]">{analiseGiro.totalNotas}</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-[#76BA1B]/10 shadow-sm flex flex-col justify-center items-center text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Ticket Médio</p>
                                    <p className="text-sm md:text-xl font-bold text-[#1E5128]">{formatCurrency(analiseGiro.ticketMedio)}</p>
                                </div>
                            </div>

                            {/* Chart */}
                            {analiseGiro.graficoBarras.length > 0 && (
                                <div className="bg-white rounded-2xl p-5 border border-[#76BA1B]/10 shadow-sm">
                                    <p className="text-sm font-bold text-[#1E5128] mb-6 flex items-center gap-2 uppercase tracking-wide">
                                        <TrendingUp className="w-4 h-4" /> Evolução de Compras
                                    </p>
                                    <div className="h-56">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analiseGiro.graficoBarras}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis
                                                    dataKey="data"
                                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    dy={10}
                                                    tickFormatter={(val) => val.split('/').slice(0, 2).join('/')}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                                    width={40}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                                                />
                                                <Tooltip
                                                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                                />
                                                <Bar dataKey="valor" fill="#76BA1B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Tabela TOP Produtos */}
                            {analiseGiro.tabelaProdutos.length > 0 && (
                                <Card className="rounded-2xl border-[#76BA1B]/10 shadow-sm overflow-hidden bg-white">
                                    <div className="bg-[#76BA1B]/5 px-5 py-3 border-b border-[#76BA1B]/10">
                                        <p className="text-sm font-bold text-[#1E5128] flex items-center gap-2">
                                            <Package className="w-4 h-4 text-[#76BA1B]" /> Top Produtos Comprados
                                        </p>
                                    </div>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-50">
                                            {analiseGiro.tabelaProdutos.map((prod, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${idx === 0 ? 'bg-[#76BA1B] text-white' :
                                                            idx === 1 ? 'bg-[#76BA1B]/80 text-white' :
                                                                idx === 2 ? 'bg-[#76BA1B]/60 text-white' :
                                                                    'bg-[#76BA1B]/20 text-[#1E5128]'
                                                            }`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate">{prod.produto}</p>
                                                            <p className="text-xs text-slate-500 font-medium mt-0.5">{prod.quantidade} unidades compradas</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-black text-[#1E5128] whitespace-nowrap">{formatCurrency(prod.valor)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    )
}
