"use client"

import { useState, useEffect } from "react"
import { Plus, ShoppingCart, BarChart3, MessageSquare, Clock, X, Calendar, User, Package } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import PedidoVendaRapido from "@/components/pedido-venda-rapido"
import { DashboardAnaliseClienteModal } from "@/components/dashboard-analise-cliente-modal"
import { DashboardAnaliseProdutoModal } from "@/components/dashboard-analise-produto-modal"
import { CheckCircle2, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function FloatingActionMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [showAnaliseCliente, setShowAnaliseCliente] = useState(false)
  const [showAnaliseProduto, setShowAnaliseProduto] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  // Visita Ativa tracker
  const [visitaAtiva, setVisitaAtiva] = useState<any>(null)
  
  // Checkout globally
  const [modalCheckout, setModalCheckout] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({ observacao: '', pedidoGerado: false, nunota: '', vlrTotal: '' })
  const [showPedidoCheckoutModal, setShowPedidoCheckoutModal] = useState(false)

  const fetchVisitaAtiva = async () => {
    try {
      const res = await fetch('/api/rotas/visitas?status=CHECKIN')
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          setVisitaAtiva(data[0])
        } else {
          const res2 = await fetch('/api/rotas/visitas?status=EM_ANDAMENTO')
          if (res2.ok) {
            const data2 = await res2.json()
            setVisitaAtiva(data2 && data2.length > 0 ? data2[0] : null)
          } else {
            setVisitaAtiva(null)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar visita ativa:', error)
    }
  }

  useEffect(() => {
    fetchVisitaAtiva()
    const interval = setInterval(fetchVisitaAtiva, 30000)
    return () => clearInterval(interval)
  }, [pathname])

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  // Visita em andamento (abre modais de checkout usando URL pra tela de rotas)
  const handleVisitaAction = () => {
    setIsOpen(false)
    setModalCheckout(true)
  }

  const fazerCheckoutGlobal = async () => {
    if (!visitaAtiva) return
    try {
      const payload = {
        action: 'checkout',
        codVisita: visitaAtiva.CODVISITA,
        ...checkoutForm
      }

      const res = await fetch('/api/rotas/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast({ title: "Visita finalizada", description: "Check-out realizado com sucesso." })
        setModalCheckout(false)
        setVisitaAtiva(null)
        setCheckoutForm({ observacao: '', pedidoGerado: false, nunota: '', vlrTotal: '' })
        window.dispatchEvent(new CustomEvent('visita-concluida'))
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        toast({ variant: "destructive", title: "Erro", description: errorData.error || 'Erro ao finalizar' })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Verifique sua internet." })
    }
  }

  return (
    <>
      {/* Overlay Backdrop - opcional para escurecer o fundo, mas pode conflitar se o usuário quiser clicar fora.
          Como WhatsApp não usa, vamos deixar sem. Ou com um blur suave.
      */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm transition-all"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-20 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
        {/* Menu de Opções */}
        <div
          className={cn(
            "flex flex-col gap-3 transition-all duration-300 ease-out items-end origin-bottom pointer-events-auto",
            isOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-8 scale-90 pointer-events-none"
          )}
        >


          {/* 2. Novo Pedido */}
          <div className="flex items-center gap-3 group translate-y-0 translate-x-0" style={{ transitionDelay: isOpen ? "150ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              Novo Pedido Rápido
            </span>
            <Button
              onClick={() => handleAction(() => setShowPedidoModal(true))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#1E5128] hover:bg-[#153a1c] text-white p-0"
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </div>

          {/* 3. Nova Tarefa */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "120ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              Nova Tarefa
            </span>
            <Button
              onClick={() => handleAction(() => router.push('/dashboard/calendario?novaTarefa=true'))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#0d9488] hover:bg-[#0f766e] text-white p-0"
            >
              <Calendar className="h-5 w-5" />
            </Button>
          </div>

          {/* 4. IA Assistente */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "90ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              IA Assistente (Chat)
            </span>
            <Button
              onClick={() => handleAction(() => router.push('/dashboard/chat'))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#6366f1] hover:bg-[#4f46e5] text-white p-0"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>

          {/* 5. IA Análise de Dados */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "60ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              IA Análise de Dados
            </span>
            <Button
              onClick={() => handleAction(() => router.push('/dashboard/analise'))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#8b5cf6] hover:bg-[#7c3aed] text-white p-0"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
          </div>

          {/* 6. IA Clientes */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "30ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              Análise de Giro de Cliente
            </span>
            <Button
              onClick={() => handleAction(() => setShowAnaliseCliente(true))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-emerald-500 hover:bg-emerald-600 text-white p-0"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>

          {/* 7. IA Produtos */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "0ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              Análise de Giro de Produto
            </span>
            <Button
              onClick={() => handleAction(() => setShowAnaliseProduto(true))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-emerald-500 hover:bg-emerald-600 text-white p-0"
            >
              <Package className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Visita em Curso (Sempre visível acima do FAB principal) */}
        {visitaAtiva && !isOpen && (
          <div className="flex items-center gap-3 pointer-events-auto transition-all animate-in slide-in-from-bottom-2 fade-in duration-300">
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-lg border border-amber-200 text-xs font-bold text-amber-800 whitespace-nowrap hidden sm:block">
              Check-in Ativo: {visitaAtiva.NOMEPARC}
            </span>
            <Button
              onClick={handleVisitaAction}
              className="h-[56px] w-[56px] rounded-full shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.6)] transition-all bg-amber-500 hover:bg-amber-600 text-white p-0 flex items-center justify-center border-2 border-white mt-1"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <Clock className="w-6 h-6 animate-pulse" />
                <div className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-amber-500 animate-bounce" />
              </div>
            </Button>
          </div>
        )}

        {/* Botão Principal FAB */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-[60px] w-[60px] rounded-full shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 transform pointer-events-auto",
            isOpen ? "rotate-135 bg-slate-800 hover:bg-slate-900" : "bg-[#76BA1B] hover:bg-[#6CA81A]"
          )}
          size="icon"
        >
          {isOpen ? <X className="h-7 w-7 text-white" /> : <Plus className="h-7 w-7 text-white" />}
        </Button>
      </div>

      {/* Modais Globais do FAB */}
      <PedidoVendaRapido
        isOpen={showPedidoModal}
        onClose={() => setShowPedidoModal(false)}
      />
      <DashboardAnaliseClienteModal
        isOpen={showAnaliseCliente}
        onClose={() => setShowAnaliseCliente(false)}
      />
      <DashboardAnaliseProdutoModal
        isOpen={showAnaliseProduto}
        onClose={() => setShowAnaliseProduto(false)}
      />

      {/* Modal de Checkout Global */}
      <Dialog open={modalCheckout} onOpenChange={setModalCheckout}>
        <DialogContent className="sm:max-w-lg h-full sm:h-auto flex flex-col p-0 overflow-hidden bg-white sm:rounded-2xl border-none shadow-2xl rounded-none z-[110]">
          <DialogHeader className="p-5 border-b border-[#F2F2F2] bg-transparent sticky top-0 z-10 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-[#1E5128]">
                <div className="bg-[#76BA1B]/10 p-2 rounded-xl border border-[#76BA1B]/20">
                  <CheckCircle2 className="h-6 w-6 text-[#76BA1B]" />
                </div>
                Concluir Atendimento
              </DialogTitle>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 transition-colors" onClick={() => setModalCheckout(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {visitaAtiva && (
              <div className="p-4 bg-green-50/30 border border-green-100 rounded-xl">
                <h4 className="font-bold text-sm text-green-900">{visitaAtiva.NOMEPARC}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="bg-white border-green-200 text-green-700 text-[10px] py-0 px-2">
                    Início: {visitaAtiva.HORA_CHECKIN ? format(new Date(visitaAtiva.HORA_CHECKIN), 'HH:mm') : '-'}
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">Resumo da Visita</Label>
                <Textarea
                  value={checkoutForm.observacao}
                  onChange={(e) => setCheckoutForm(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Relate brevemente o que foi conversado ou realizado..."
                  className="min-h-[120px] border-slate-200 focus:ring-green-500/10"
                />
              </div>

              {!checkoutForm.nunota ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 border-dashed border-2 border-green-200 hover:border-green-500 hover:bg-green-50 text-green-700 font-bold flex items-center justify-center gap-3 transition-all rounded-xl"
                  onClick={() => setShowPedidoCheckoutModal(true)}
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Plus className="w-4 h-4" />
                  </div>
                  Realizar Venda
                </Button>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-blue-800 uppercase leading-none mb-1">Pedido Gerado</p>
                      <p className="text-sm font-bold text-blue-700">#{checkoutForm.nunota}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-600 text-white border-none text-[10px] font-black h-6">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(checkoutForm.vlrTotal) || 0)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 bg-white border-t border-[#F2F2F2] flex flex-col sm:flex-row gap-3 mt-auto">
            <Button variant="outline" onClick={() => setModalCheckout(false)} className="h-11 rounded-xl font-bold flex-1 border-[#F2F2F2] hover:bg-slate-50 text-[#121212]">
              Continuar Visita
            </Button>
            <Button onClick={fazerCheckoutGlobal} className="rounded-xl bg-[#76BA1B] hover:bg-[#1E5128] text-white h-11 font-bold flex-1 shadow-md shadow-[#76BA1B]/20 transition-all active:scale-[0.98]">
              <Check className="h-4 w-4 mr-2" />
              Finalizar Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reutilizado de Pedido Rápido para Checkout */}
      {showPedidoCheckoutModal && visitaAtiva && (
        <PedidoVendaRapido
          isOpen={showPedidoCheckoutModal}
          onClose={() => setShowPedidoCheckoutModal(false)}
          parceiroSelecionado={{
            CODPARC: visitaAtiva.CODPARC,
            NOMEPARC: visitaAtiva.NOMEPARC,
            CGC_CPF: visitaAtiva.CGC_CPF,
            INSCESTAD: visitaAtiva.IDENTINSCESTAD || "",
            TIPPESSOA: visitaAtiva.TIPPESSOA,
            RAZAOSOCIAL: visitaAtiva.RAZAOSOCIAL || visitaAtiva.NOMEPARC
          }}
          onSuccess={(pedido) => {
            setCheckoutForm(prev => ({
              ...prev,
              pedidoGerado: true,
              nunota: pedido.NUNOTA?.toString() || '',
              vlrTotal: pedido.VLRNOT?.toString() || pedido.VLRTOTAL?.toString() || ''
            }));
            setShowPedidoCheckoutModal(false);
          }}
        />
      )}
    </>
  )
}