"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth-service"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, ArrowLeft, BarChart3, TrendingUp, Package, Users, Calendar as CalendarIcon, Loader2, Sparkles, Copy, Check } from "lucide-react"
import Image from "next/image"
import { WidgetRenderer } from "@/components/widget-renderer"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Widget {
  tipo: "card" | "grafico_barras" | "grafico_linha" | "grafico_pizza" | "tabela" | "explicacao"
  titulo: string
  dados: any
  metadados?: any
}

const SUGGESTED_PROMPTS = [
  {
    label: "Performance de Vendas",
    prompt: "Analise o desempenho de vendas dos últimos 3 meses com evolução temporal e mostre os top 5 produtos mais vendidos",
    icon: TrendingUp
  },
  {
    label: "Análise de Leads",
    prompt: "Mostre uma análise completa dos meus leads: distribuição por estágio ao longo do tempo, taxa de conversão e evolução mensal",
    icon: BarChart3
  },
  {
    label: "Estoque Crítico",
    prompt: "Identifique produtos com estoque baixo, mostre a evolução do estoque nos últimos meses e sugira ações de reposição",
    icon: Package
  },
  {
    label: "Análise de Clientes",
    prompt: "Analise o perfil dos meus clientes com evolução temporal, identifique padrões de compra e correlações entre valor e frequência",
    icon: Users
  }
]

export default function AnalisePage() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [showInitial, setShowInitial] = useState(true)
  const [isOnline, setIsOnline] = useState(true)

  const [trintaDiasAtras] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const [hoje] = useState(new Date())

  const [filtro, setFiltro] = useState({
    dataInicio: trintaDiasAtras,
    dataFim: hoje
  })

  // Adicionar estados de progresso na análise
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copiado para a área de transferência!")
  }

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push("/")
    }

    // Verificar status de conexão
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [router])

  const startAnalysisFlow = (prompt: string) => {
    if (!prompt.trim() || isLoading) return
    confirmDateAndAnalyze(prompt)
  }

  const confirmDateAndAnalyze = async (prompt: string) => {
    const dataInicioStr = format(filtro.dataInicio, 'yyyy-MM-dd')
    const dataFimStr = format(filtro.dataFim, 'yyyy-MM-dd')

    // Validar intervalo de 3 meses
    const diffTime = Math.abs(filtro.dataFim.getTime() - filtro.dataInicio.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 90) {
      toast.error("O intervalo máximo permitido é de 3 meses (90 dias)")
      return
    }

    // Iniciar análise propriamente dita
    setInput("")
    setIsLoading(true)
    setShowInitial(false)
    setWidgets([])
    setLoadingProgress(0);
    setLoadingMessage('Iniciando análise...');
    setIsLoadingData(true);

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 300);

    try {
      setLoadingMessage('Carregando dados do período...');
      const response = await fetch(`/api/gemini/analise?t=${Date.now()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({
          prompt,
          dataInicio: dataInicioStr,
          dataFim: dataFimStr
        })
      })

      clearInterval(progressInterval);
      setLoadingProgress(95);
      setLoadingMessage('Processando análise com IA...');

      if (!response.ok) {
        let errMessage = "Erro na análise";
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch (e) {
          console.error("Erro ao ler JSON de erro:", e);
        }
        throw new Error(errMessage);
      }

      setLoadingProgress(100);
      setLoadingMessage('Análise concluída!');

      const data = await response.json()

      if (data.widgets && data.widgets.length > 0) {
        const temExplicacao = data.widgets.some((w: any) => w.tipo === 'explicacao')
        if (!temExplicacao) {
          setWidgets([
            {
              tipo: 'explicacao',
              titulo: 'Análise Realizada',
              dados: {
                texto: `Análise do período de ${format(filtro.dataInicio, 'dd/MM/yyyy')} a ${format(filtro.dataFim, 'dd/MM/yyyy')}`
              }
            },
            ...data.widgets
          ])
        } else {
          setWidgets(data.widgets)
        }

        setTimeout(() => {
          setIsLoadingData(false);
        }, 500);
      } else {
        setIsLoadingData(false);
        toast("Nenhum dado encontrado para análise.")
      }
    } catch (error: any) {
      console.error("Erro ao analisar dados:", error)
      
      let friendlyMessage = error.message || "Não foi possível analisar seus dados. Tente novamente.";
      if (friendlyMessage.includes("503") || friendlyMessage.includes("Service Unavailable") || friendlyMessage.includes("demand")) {
        friendlyMessage = "Os servidores de IA do Google estão sob alta demanda. Por favor, aguarde alguns instantes e tente novamente.";
      }

      toast.error(friendlyMessage)
      clearInterval(progressInterval);
      setIsLoadingData(false);
      setLoadingProgress(0);
      setLoadingMessage('');
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOnline) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">IA Análise Indisponível Offline</h3>
                <p className="text-sm text-muted-foreground">
                  A Análise de Dados com IA requer conexão com a internet para funcionar. Por favor, conecte-se à internet para acessar esta funcionalidade.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-2 text-[#121212]/60 hover:text-[#1E5128] hover:bg-[#76BA1B]/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Button>

          {/* Filtro de Data - Estilo Pill (como no Chat) */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#F2F2F2] rounded-full px-4 py-1.5 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-[#76BA1B]" />
            <div className="flex items-center gap-2">
              <Input
                id="dataInicio"
                type="date"
                value={format(filtro.dataInicio, "yyyy-MM-dd")}
                onChange={(e) => {
                  const novaDataInicio = new Date(e.target.value);
                  const dataFimAtual = filtro.dataFim;
                  const tresMesesDepois = new Date(novaDataInicio);
                  tresMesesDepois.setMonth(tresMesesDepois.getMonth() + 3);

                  if (dataFimAtual > tresMesesDepois) {
                    toast.error('O intervalo máximo permitido é de 3 meses');
                    return;
                  }

                  setFiltro(prev => ({ ...prev, dataInicio: novaDataInicio }));
                }}
                className="w-36 h-8 text-xs md:text-sm border-none shadow-none focus-visible:ring-0 bg-transparent text-[#1E5128] font-medium"
                disabled={isLoading}
              />
              <span className="text-xs text-[#1E5128]/50">até</span>
              <Input
                id="dataFim"
                type="date"
                value={format(filtro.dataFim, "yyyy-MM-dd")}
                onChange={(e) => {
                  const novaDataFim = new Date(e.target.value);
                  const dataInicioAtual = filtro.dataInicio;
                  const tresMesesDepois = new Date(dataInicioAtual);
                  tresMesesDepois.setMonth(tresMesesDepois.getMonth() + 3);

                  if (novaDataFim > tresMesesDepois) {
                    toast.error('O intervalo máximo permitido é de 3 meses');
                    return;
                  }

                  setFiltro(prev => ({ ...prev, dataFim: novaDataFim }));
                }}
                className="w-36 h-8 text-xs md:text-sm border-none shadow-none focus-visible:ring-0 bg-transparent text-[#1E5128] font-medium"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Área Principal */}
        <div className={`flex-1 px-4 py-6 ${!showInitial ? 'overflow-y-auto scrollbar-hide' : ''}`}>
          {showInitial ? (
            <div className="flex flex-col items-center justify-center min-h-60 mb-12 px-4">
              <div className="relative w-40 h-16 mb-4">
                <Image
                  src="/Logo_Final.png"
                  alt="PredictSales Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1E5128] mb-2 text-center">
                Como posso ajudar com seus dados hoje?
              </h1>
              <p className="text-center text-muted-foreground max-w-md mb-8">
                Explore insights, identifique tendências e visualize o desempenho do seu negócio em tempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-w-7xl mx-auto">
              {isLoadingData && (
                <Card className="p-8 border-[#F2F2F2] rounded-2xl shadow-sm">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#76BA1B]" />
                    <div className="w-full max-w-md space-y-2">
                      <Progress value={loadingProgress} className="w-full h-2 bg-[#76BA1B]/10 [&>div]:bg-[#76BA1B]" />
                      <p className="text-sm text-center text-[#1E5128]/70 font-medium">
                        {loadingMessage} ({loadingProgress}%)
                      </p>
                    </div>
                  </div>
                </Card>
              )}
              {!isLoadingData && widgets.map((widget, index) => (
                <WidgetRenderer key={index} widget={widget} />
              ))}
            </div>
          )}
        </div>

        {/* Barra de Input Fixa */}
        <div className="bg-transparent p-4 md:p-6 flex-shrink-0">
          <div className="flex flex-col items-center gap-4 max-w-7xl mx-auto w-full">
            {showInitial && (
              <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
                {SUGGESTED_PROMPTS.map((promptData) => (
                  <div key={promptData.label} className="relative group">
                    <Button
                      variant="outline"
                      className="rounded-full border-[#F2F2F2] shadow-sm bg-white hover:border-[#76BA1B] hover:text-[#76BA1B] text-[#121212]/80 transition-all font-medium py-6 px-6"
                      onClick={() => startAnalysisFlow(promptData.prompt)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {promptData.label}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white border border-[#F2F2F2] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(promptData.prompt);
                      }}
                      title="Copiar prompt"
                    >
                      <Copy className="h-3.5 w-3.5 text-[#76BA1B]" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 p-1.5 md:p-2 bg-white/80 backdrop-blur-md border border-[#F2F2F2] shadow-lg rounded-full w-full focus-within:ring-2 focus-within:ring-[#76BA1B]/20 focus-within:border-[#76BA1B] transition-all">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && startAnalysisFlow(input)}
                placeholder="Pergunte em linguagem natural aos seus dados..."
                disabled={isLoading || isLoadingData}
                className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm md:text-base px-4 h-10 md:h-12 bg-transparent"
              />
              <Button
                onClick={() => startAnalysisFlow(input)}
                disabled={!input.trim() || isLoading || isLoadingData}
                size="icon"
                className="bg-[#76BA1B] hover:bg-[#65A017] rounded-full w-10 h-10 md:w-12 md:h-12 flex-shrink-0 transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
