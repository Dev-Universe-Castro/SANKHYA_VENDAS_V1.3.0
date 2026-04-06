"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Flame, Boxes, TrendingUp, Package, Plus, ShoppingCart, Info } from "lucide-react"
import { OfflineDataService } from "@/lib/offline-data-service"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

interface CampanhasPedidoAbaProps {
    onAdicionarItem: (produto: any, quantidade: number, desconto?: number) => void
    itensCarrinho: any[]
}

export function CampanhasPedidoAba({ onAdicionarItem, itensCarrinho }: CampanhasPedidoAbaProps) {
    const [campanhas, setCampanhas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const data = await OfflineDataService.getCampanhas()
                // Buscar itens de cada campanha para exibição rica
                const campanhasComItens = await Promise.all(data.map(async (c: any) => {
                    const itens = await OfflineDataService.getItensCampanha(c.ID_CAMPANHA)
                    return { ...c, itens }
                }))
                setCampanhas(campanhasComItens)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const campanhasPorTipo = (tipo: string) => campanhas.filter(c => c.TIPO === tipo)

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-white rounded-3xl border border-[#F2F2F2]">
                <div className="w-10 h-10 border-4 border-[#76BA1B] border-t-transparent rounded-full animate-spin mb-4" />
                <p>Buscando ofertas imperdíveis...</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Tabs defaultValue="combos" className="w-full">
                <TabsList className="grid grid-cols-3 bg-[#F2F2F2] p-1 rounded-2xl h-11 mb-4">
                    <TabsTrigger value="combos" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs">
                        Combos
                    </TabsTrigger>
                    <TabsTrigger value="quantidades" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs">
                        Qtd. Progressiva
                    </TabsTrigger>
                    <TabsTrigger value="destaques" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs">
                        Destaques
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="combos" className="space-y-3">
                    <CampanhaList
                        campanhas={campanhasPorTipo('COMBO')}
                        icon={<Boxes className="w-5 h-5 text-blue-600" />}
                        emptyText="Nenhum combo disponível no momento."
                        onAdicionarItem={onAdicionarItem}
                        tipo="COMBO"
                    />
                </TabsContent>

                <TabsContent value="quantidades" className="space-y-3">
                    <CampanhaList
                        campanhas={campanhasPorTipo('QUANTIDADE')}
                        icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                        emptyText="Nenhuma campanha de quantidade ativa."
                        onAdicionarItem={onAdicionarItem}
                        tipo="QUANTIDADE"
                    />
                </TabsContent>

                <TabsContent value="destaques" className="space-y-3">
                    <CampanhaList
                        campanhas={campanhasPorTipo('DESTAQUE')}
                        icon={<Flame className="w-5 h-5 text-orange-600" />}
                        emptyText="Não há produtos em destaque hoje."
                        onAdicionarItem={onAdicionarItem}
                        tipo="DESTAQUE"
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function CampanhaList({ campanhas, icon, emptyText, onAdicionarItem, tipo }: any) {
    if (campanhas.length === 0) {
        return (
            <Card className="rounded-3xl border-[#F2F2F2] border-dashed bg-white shadow-none">
                <CardContent className="py-12 flex flex-col items-center text-center">
                    <div className="opacity-20 mb-3">{icon}</div>
                    <p className="text-sm text-gray-500 font-medium">{emptyText}</p>
                </CardContent>
            </Card>
        )
    }

    const handleIncluirCampanha = async (campanha: any) => {
        if (!campanha.itens || campanha.itens.length === 0) {
            toast.warning("Esta campanha não possui produtos cadastrados.")
            return
        }

        const loadingId = toast.loading(`Adicionando itens da campanha "${campanha.NOME}"...`)

        try {
            const produtosData = await OfflineDataService.getProdutos()

            for (const item of campanha.itens) {
                const produtoCompleto = produtosData.find((p: any) => String(p.CODPROD) === String(item.CODPROD))

                if (produtoCompleto) {
                    // Se a campanha tiver preço fixo no item, usamos ele, senão usamos o preço do produto/tabela
                    const precoFinal = item.VALOR > 0 ? item.VALOR : (produtoCompleto.VLRUNIT || produtoCompleto.preco || 0)
                    const descFinal = item.DESCONTO > 0 ? item.DESCONTO : (campanha.DESCONTO_GERAL || 0)
                    const qtdFinal = tipo === 'QUANTIDADE' ? (item.QTD_MININA || 1) : 1

                    // Adicionar campos da campanha ao objeto para o handleAdicionarItemCarrinho saber a origem
                    const produtoParaCarrinho = {
                        ...produtoCompleto,
                        VLRUNIT: precoFinal,
                        preco: precoFinal,
                        CAMPAIGN_ID: campanha.ID_CAMPANHA,
                        CAMPAIGN_TYPE: campanha.TIPO
                    }

                    onAdicionarItem(produtoParaCarrinho, qtdFinal, descFinal)
                } else {
                    console.warn(`Produto ${item.CODPROD} não encontrado no catálogo local.`)
                }
            }

            toast.dismiss(loadingId)
            toast.success(`Produtos da campanha "${campanha.NOME}" adicionados!`)
        } catch (error) {
            console.error(error)
            toast.dismiss(loadingId)
            toast.error("Erro ao processar produtos da campanha.")
        }
    }

    return (
        <div className="grid grid-cols-1 gap-3">
            {campanhas.map((c: any) => (
                <Card key={c.ID_CAMPANHA} className="rounded-3xl border-[#F2F2F2] shadow-sm hover:shadow-md transition-all overflow-hidden bg-white group">
                    <CardContent className="p-0">
                        <div className="p-4 flex items-center justify-between border-b border-[#F2F2F2] bg-gradient-to-r from-gray-50/50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white border border-[#F2F2F2] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    {icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{c.NOME}</h4>
                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-none font-bold">
                                        {c.DESCONTO_GERAL ? `${c.DESCONTO_GERAL}% Desconto` : 'Ver Itens'}
                                    </Badge>
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" className="rounded-xl h-8 text-blue-600 font-bold hover:bg-blue-50">
                                <Info className="w-4 h-4 mr-1" /> Detalhes
                            </Button>
                        </div>

                        <div className="p-4 space-y-3">
                            <p className="text-xs text-gray-500 leading-relaxed">
                                {c.OBSERVACAO || "Aproveite as condições especiais desta campanha."}
                            </p>

                            {/* Detalhes dos Itens */}
                            <div className="bg-[#F2F2F2]/30 rounded-2xl p-3 border border-[#F2F2F2]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produtos Participantes</span>
                                    <Badge variant="secondary" className="text-[9px] bg-white border-transparent shadow-none">
                                        {c.itens?.length || 0} Itens
                                    </Badge>
                                </div>

                                <div className="space-y-1 mb-3">
                                    {c.itens?.slice(0, 3).map((item: any) => (
                                        <div key={item.ID_ITEM} className="flex justify-between items-center text-[11px] text-gray-600">
                                            <span>• {item.DESCRPROD} (Cód: {item.CODPROD})</span>
                                            {item.DESCONTO > 0 && <span className="text-green-600 font-bold">-{item.DESCONTO}%</span>}
                                        </div>
                                    ))}
                                    {(c.itens?.length || 0) > 3 && (
                                        <p className="text-[10px] text-gray-400 italic">E mais {c.itens.length - 3} produtos...</p>
                                    )}
                                </div>

                                <Button
                                    className="w-full bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl h-10 font-bold text-xs shadow-sm shadow-[#76BA1B]/20"
                                    onClick={() => handleIncluirCampanha(c)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Incluir itens da Campanha
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
