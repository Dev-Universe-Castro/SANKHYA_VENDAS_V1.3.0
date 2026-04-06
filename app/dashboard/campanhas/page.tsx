"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Flame, Boxes, TrendingUp, Search, MoreHorizontal, Edit, Trash2, Calendar, ShoppingCart } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OfflineDataService } from "@/lib/offline-data-service"
import { toast } from "sonner"
import CadastroCampanhaModal from "@/components/cadastro-campanha-modal"

export default function CampanhasPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [campanhas, setCampanhas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [campanhaEdicao, setCampanhaEdicao] = useState<any>(null)

    useEffect(() => {
        carregarCampanhas()
    }, [])

    const carregarCampanhas = async () => {
        setLoading(true)
        try {
            const data = await OfflineDataService.getCampanhas()
            setCampanhas(data)
        } catch (error) {
            toast.error("Erro ao carregar campanhas")
        } finally {
            setLoading(false)
        }
    }

    const filteredCampanhas = campanhas.filter(c =>
        c.NOME.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const campanhasPorTipo = (tipo: string) => filteredCampanhas.filter(c => c.TIPO === tipo)

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full bg-transparent overflow-hidden scrollbar-hide">
                {/* Header - Desktop */}
                <div className="hidden md:block p-6 bg-transparent">
                    <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">
                        Campanhas
                    </h1>
                    <p className="text-[#1E5128]/70 mt-1">
                        Gerencie seus combos, descontos progressivos e produtos em destaque.
                    </p>
                </div>

                {/* Header - Mobile */}
                <div className="md:hidden px-4 py-4 bg-transparent border-b border-black/5">
                    <h1 className="text-xl font-bold text-[#1E5128]">
                        Campanhas
                    </h1>
                    <p className="text-sm text-[#1E5128]/70 mt-1">
                        Gerencie seus combos e ofertas ativas.
                    </p>
                </div>

                {/* Stats Section - Otimizada para Mobile */}
                <div className="px-4 md:px-6 py-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Card className="rounded-2xl border-[#F2F2F2] shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                        <CardContent className="p-3 md:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Combos</p>
                                <h3 className="text-lg md:text-xl font-extrabold text-slate-900">{campanhasPorTipo('COMBO').length}</h3>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                <Boxes className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-[#F2F2F2] shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                        <CardContent className="p-3 md:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qtd. Prog.</p>
                                <h3 className="text-lg md:text-xl font-extrabold text-slate-900">{campanhasPorTipo('QUANTIDADE').length}</h3>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-50 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="col-span-2 md:col-span-1 rounded-2xl border-[#F2F2F2] shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                        <CardContent className="p-3 md:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destaques Hot</p>
                                <h3 className="text-lg md:text-xl font-extrabold text-slate-900">{campanhasPorTipo('DESTAQUE').length}</h3>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                                <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content with Tabs */}
                <Tabs defaultValue="combos" className="flex-1 flex flex-col overflow-hidden mt-4">
                    <div className="px-4 md:px-6 py-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <TabsList className="grid w-full md:w-[500px] grid-cols-3 h-10 md:h-11 p-1 bg-white border border-[#F2F2F2] rounded-full shadow-sm">
                                <TabsTrigger value="combos" className="rounded-full text-[10px] md:text-sm font-semibold transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white">
                                    Combos
                                </TabsTrigger>
                                <TabsTrigger value="quantidades" className="rounded-full text-[10px] md:text-sm font-semibold transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white">
                                    Quantidades
                                </TabsTrigger>
                                <TabsTrigger value="destaques" className="rounded-full text-[10px] md:text-sm font-semibold transition-all data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white">
                                    Destaques
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Pesquisar..."
                                        className="pl-9 h-10 rounded-full border-[#F2F2F2] bg-white text-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={() => setIsModalOpen(true)}
                                    className="hidden md:flex bg-[#76BA1B] hover:bg-[#1E5128] text-white h-11 font-bold rounded-full shadow-md transition-all"
                                >
                                    <Plus className="w-5 h-5 mr-1" />
                                    Nova
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto m-0 px-4 md:px-6 py-4 pb-32 md:pb-6">
                        <TabsContent value="combos" className="m-0">
                            <CampanhaDisplay data={campanhasPorTipo('COMBO')} loading={loading} />
                        </TabsContent>
                        <TabsContent value="quantidades" className="m-0">
                            <CampanhaDisplay data={campanhasPorTipo('QUANTIDADE')} loading={loading} />
                        </TabsContent>
                        <TabsContent value="destaques" className="m-0">
                            <CampanhaDisplay data={campanhasPorTipo('DESTAQUE')} loading={loading} />
                        </TabsContent>
                    </div>
                </Tabs>

                {/* FAB - Mobile Only */}
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#76BA1B] text-white shadow-2xl z-50 flex items-center justify-center hover:bg-[#1E5128] active:scale-95 transition-all"
                >
                    <Plus className="w-8 h-8" />
                </Button>
            </div>

            <CadastroCampanhaModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setCampanhaEdicao(null)
                }}
                onSuccess={carregarCampanhas}
                campanhaEdicao={campanhaEdicao}
            />
        </DashboardLayout>
    )

    function ActionMenu({ c }: { c: any }) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F2F2F2] rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-[#F2F2F2] p-1 shadow-lg bg-white/95 backdrop-blur-md">
                    <DropdownMenuItem
                        className="gap-2 cursor-pointer focus:bg-[#F2F2F2] rounded-xl text-xs font-medium py-2"
                        onClick={() => {
                            setCampanhaEdicao(c)
                            setIsModalOpen(true)
                        }}
                    >
                        <Edit className="w-3.5 h-3.5 text-blue-600" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-red-50 text-red-600 rounded-xl text-xs font-medium py-2">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    function CampanhaDisplay({ data, loading }: { data: any[], loading: boolean }) {
        if (loading) {
            return (
                <div className="p-12 text-center text-gray-500">
                    <div className="w-8 h-8 border-4 border-[#76BA1B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    Carregando...
                </div>
            )
        }

        if (data.length === 0) {
            return (
                <div className="p-16 text-center text-gray-400 flex flex-col items-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <ShoppingCart className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-lg font-medium text-gray-600">Nenhuma campanha</p>
                    <p className="text-xs">Clique em "Nova" para criar uma oferta.</p>
                </div>
            )
        }

        return (
            <>
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-2xl border border-[#F2F2F2] overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="pl-6 font-bold text-gray-700">Campanha</TableHead>
                                <TableHead className="font-bold text-gray-700">Status</TableHead>
                                <TableHead className="font-bold text-gray-700">Validade</TableHead>
                                <TableHead className="font-bold text-gray-700">Regra</TableHead>
                                <TableHead className="text-right pr-6 font-bold text-gray-700">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((c) => (
                                <TableRow key={c.ID_CAMPANHA} className="hover:bg-[#F2F2F2]/30 transition-colors border-[#F2F2F2]">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{c.NOME}</span>
                                            <span className="text-[10px] text-gray-500">ID: {c.ID_CAMPANHA}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={c.ATIVO === 'S' ? 'bg-green-100 text-green-700 border-none' : 'bg-red-100 text-red-700 border-none'}>
                                            {c.ATIVO === 'S' ? 'Ativa' : 'Inativa'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                        <div className="flex items-center gap-2 text-[11px]">
                                            <Calendar className="w-3 h-3" />
                                            {c.DTINICIO ? new Date(c.DTINICIO).toLocaleDateString() : '∞'} - {c.DTFIM ? new Date(c.DTFIM).toLocaleDateString() : '∞'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-semibold text-[#1E5128] bg-[#76BA1B]/10 px-2.5 py-1 rounded-lg">
                                            {c.DESCONTO_GERAL ? `${c.DESCONTO_GERAL}% OFF` : 'Item'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <ActionMenu c={c} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {data.map((c) => (
                        <Card key={c.ID_CAMPANHA} className="rounded-2xl border-[#F2F2F2] shadow-sm bg-white overflow-hidden p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{c.NOME}</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Badge className={`${c.ATIVO === 'S' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-none text-[9px] h-4 leading-none`}>
                                            {c.ATIVO === 'S' ? 'Ativa' : 'Inativa'}
                                        </Badge>
                                        <span className="text-[9px] text-[#1E5128] font-bold bg-[#76BA1B]/10 px-1.5 py-0.5 rounded">
                                            {c.DESCONTO_GERAL ? `${c.DESCONTO_GERAL}% OFF` : 'Item'}
                                        </span>
                                    </div>
                                </div>
                                <ActionMenu c={c} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-3 border-t border-slate-50 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {c.DTINICIO ? new Date(c.DTINICIO).toLocaleDateString() : 'Início ∞'} - {c.DTFIM ? new Date(c.DTFIM).toLocaleDateString() : 'Fim ∞'}
                                </div>
                                <span className="text-slate-300">ID: {c.ID_CAMPANHA}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            </>
        )
    }
}
