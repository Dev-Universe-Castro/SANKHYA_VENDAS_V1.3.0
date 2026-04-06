import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, XCircle, AlertTriangle, User } from "lucide-react"
import { db } from "@/lib/client-db"
import { toast } from "sonner"
import { PedidoSyncService } from "@/lib/pedido-sync"

export function ApprovalsTab() {
    const [pendingOrders, setPendingOrders] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        loadPendingApprovals()
    }, [])

    const loadPendingApprovals = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/pedidos-fdv?type=APROVACOES')
            const result = await response.json()
            setPendingOrders(result.data || [])
        } catch (error) {
            console.error("Erro ao carregar aprovações:", error)
            toast.error("Erro ao carregar lista de aprovações")
        } finally {
            setIsLoading(false)
        }
    }

    const handleApprove = async (orderId: number, idAprovacao: number, payload: any) => {
        try {
            toast.loading("Processando aprovação...")

            // 1. Enviar resposta para o servidor
            const response = await fetch('/api/pedidos-fdv', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idAprovacao,
                    status: 'APROVADO'
                })
            });

            if (!response.ok) throw new Error("Erro ao aprovar no servidor");

            toast.success("Pedido aprovado online!")

            // 2. Disparar a sincronização (criação do pedido no Sankhya)
            // Usamos o payload que já temos na lista
            toast.promise(fetch('/api/sankhya/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json()), {
                loading: 'Gerando pedido no Sankhya...',
                success: (data) => {
                    if (data.nunota || data.NUNOTA) {
                        return `Sucesso! NUNOTA: ${data.nunota || data.NUNOTA}`;
                    }
                    return 'Pedido aprovado, mas erro na geração da nota.';
                },
                error: 'Erro ao gerar nota no Sankhya.'
            });

            loadPendingApprovals()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao aprovar pedido")
        }
    }

    const handleReject = async (idAprovacao: number) => {
        try {
            const response = await fetch('/api/pedidos-fdv', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idAprovacao,
                    status: 'REPROVADO'
                })
            });

            if (!response.ok) throw new Error("Erro ao reprovar no servidor");

            toast.info("Pedido reprovado.")
            loadPendingApprovals()
        } catch (error) {
            toast.error("Erro ao reprovar pedido")
        }
    }

    if (isLoading) return <div className="p-4">Carregando...</div>

    return (
        <div className="space-y-4 h-full">
            <Card className="border-[#F2F2F2] rounded-2xl shadow-sm bg-white">
                <CardHeader className="pb-4 border-b border-[#F2F2F2]">
                    <CardTitle className="text-xl font-bold text-[#1E5128]">Aprovações Pendentes</CardTitle>
                    <CardDescription className="text-slate-500">
                        Gerencie pedidos que violaram regras comerciais e aguardam liberação.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
                        <div className="p-4 md:p-6">
                            {pendingOrders.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 font-bold">
                                    <CheckCircle2 className="mx-auto h-12 w-12 text-[#76BA1B] mb-3 opacity-80" />
                                    <p>Nenhuma pendência de aprovação no momento.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingOrders.map((order) => {
                                        const violations = order.VIOLACOES ? JSON.parse(order.VIOLACOES) : [];
                                        const payload = order.CORPO_JSON;

                                        return (
                                            <Card key={order.ID_APROVACAO} className="border border-[#F2F2F2] border-l-4 border-l-amber-400 rounded-2xl shadow-sm bg-white hover:shadow-md transition-all duration-300">
                                                <CardContent className="p-4 md:p-5">
                                                    <div className="flex flex-col md:flex-row md:justify-between items-start mb-4 gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold uppercase text-[9px] md:text-[10px] px-2 tracking-wider">
                                                                    Aguardando Aprovação
                                                                </Badge>
                                                                <span className="text-xs font-mono font-medium text-slate-400">
                                                                    {new Date(order.DATA_SOLICITACAO).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-lg text-[#1E5128] leading-tight flex flex-col md:flex-row md:items-center gap-1">
                                                                {payload.RAZAO_SOCIAL || payload.NOMEPARC}
                                                                <span className="text-xs font-bold text-slate-400 md:ml-2">Ref: {payload.VLRNOTA ? 'Ped.' : ''} {order.ID_PEDIDO_FDV}</span>
                                                            </h4>
                                                            <div className="text-sm text-slate-500 mt-1">
                                                                <span className="font-bold text-slate-700">{order.NOME_VENDEDOR}</span>
                                                                <span className="mx-2 text-slate-300">•</span>
                                                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded textxs font-bold">{order.ORIGEM}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                                                            <div className="text-right w-full md:w-auto">
                                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Total do Pedido</p>
                                                                <p className="text-xl font-black text-[#1E5128]">
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload.VLRNOTA || 0)}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2 w-full md:w-auto">
                                                                <Button size="sm" variant="outline" className="flex-1 md:flex-none text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-xl font-bold h-9" onClick={() => handleReject(order.ID_APROVACAO)}>
                                                                    <XCircle className="w-4 h-4 mr-1.5" />
                                                                    Reprovar
                                                                </Button>
                                                                <Button size="sm" className="flex-1 md:flex-none bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md font-bold h-9 transition-all" onClick={() => handleApprove(order.ID_PEDIDO_FDV, order.ID_APROVACAO, payload)}>
                                                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                                    Aprovar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100/50 mt-4 relative overflow-hidden">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-200"></div>
                                                        <div className="flex items-center gap-2 mb-2.5 text-amber-800 font-bold text-sm ml-2">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            Motivos do Bloqueio:
                                                        </div>
                                                        <ul className="list-disc list-inside text-xs md:text-sm text-amber-700/80 space-y-1.5 ml-2 font-medium">
                                                            {violations.map((v: string, i: number) => (
                                                                <li key={i}>{v}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {order.JUSTIFICATIVA && (
                                                        <div className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-[#F2F2F2]">
                                                            <span className="font-bold text-[#1E5128] block mb-1 text-xs uppercase tracking-wider">Justificativa do Vendedor:</span>
                                                            <span className="italic">{order.JUSTIFICATIVA}</span>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
