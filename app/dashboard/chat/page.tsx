"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth-service"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Sparkles, ArrowLeft, Calendar as CalendarIcon, WifiOff, Loader2, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_PROMPTS = [
  {
    label: "Quais clientes devo focar hoje?",
    prompt: "Analise a minha carteira de parceiros e notas emitidas e me diga quais clientes devo priorizar hoje para aumentar minhas chances de vendas."
  },
  {
    label: "Desempenho da minha rota",
    prompt: "Quais são as minhas rotas ativas? Resuma as visitas agendadas e identifique oportunidades de cross-sell e upsell."
  },
  {
    label: "Sugestões de produtos",
    prompt: "Gere sugestões de mix de produtos baseados no histórico de compras da minha base de clientes mais frequente."
  },
  {
    label: "Análise de performance",
    prompt: "Faça uma análise quantitativa da minha performance de vendas recentes. Mostre ticket médio, notas totais e quais pontos devo melhorar."
  }
]

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [loadingMessage, setLoadingMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Estado para filtro de data
  const [filtro, setFiltro] = useState(() => {
    const dataFim = new Date()
    const dataInicio = new Date()
    dataInicio.setDate(dataFim.getDate() - 90) // últimos 90 dias

    return {
      dataInicio: dataInicio.toISOString().split('T')[0],
      dataFim: dataFim.toISOString().split('T')[0]
    }
  })

  // Estado para rastrear se o filtro de data foi alterado e precisa de nova busca
  const [filtroAlterado, setFiltroAlterado] = useState(false);

  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const [sessionId, setSessionId] = useState<string>("")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copiado para a área de transferência!")
  }

  useEffect(() => {
    setSessionId(`session-${Date.now()}-${Math.random()}`)
  }, [])

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingMessage])

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || input
    if (!messageToSend.trim() || isLoading) return

    // Se o filtro foi alterado, limpa as mensagens e reseta o estado
    if (filtroAlterado) {
      setMessages([]);
      setIsFirstMessage(true);
      setFiltroAlterado(false); // Reseta o flag
    }

    const userMessage: Message = { role: "user", content: messageToSend }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setLoadingMessage("Analisando sua solicitação...")
    setStreamingMessage("")
    setIsFirstMessage(false)

    try {
      setLoadingMessage("Carregando dados do sistema...");
      console.log(`💬 Enviando mensagem: "${messageToSend.substring(0, 50)}..."`);

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          history: messages,
          filtro: {
            dataInicio: filtro.dataInicio,
            dataFim: filtro.dataFim
          },
          sessionId
        })
      })

      setLoadingMessage("Processando resposta da IA...");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(errorData.error || "Erro ao processar resposta")
      }

      if (!response.body) {
        throw new Error("Response body não disponível")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ""
      let buffer = ""

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log("Stream finalizado, texto acumulado:", accumulatedText.length, "caracteres")
            break
          }

          // Decodificar o chunk e adicionar ao buffer
          buffer += decoder.decode(value, { stream: true })

          // Processar linhas completas do buffer
          const lines = buffer.split("\n")
          buffer = lines.pop() || "" // Mantém a última linha incompleta no buffer

          for (const line of lines) {
            if (!line.trim()) continue

            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim()

              if (data === "[DONE]") {
                console.log("Recebido sinal [DONE]")
                continue
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.text) {
                  accumulatedText += parsed.text
                  setStreamingMessage(accumulatedText)
                } else if (parsed.error) {
                  console.error("Erro no streaming:", parsed.error)
                  throw new Error(parsed.error)
                } else if (parsed.progress !== undefined) {
                  // Atualiza o progresso da barra de carregamento
                  setLoadingProgress(parsed.progress);
                  setLoadingMessage(parsed.message || 'Processando...');
                }
              } catch (e) {
                if (data !== "[DONE]") {
                  console.error("Erro ao parsear chunk:", data, e)
                }
              }
            }
          }
        }

        // Adicionar mensagem final ao histórico
        if (accumulatedText) {
          setMessages(prev => [...prev, { role: "assistant", content: accumulatedText }])
          setStreamingMessage("")
          console.log(`✅ Resposta recebida: ${accumulatedText.length} caracteres`);
        } else {
          throw new Error("Nenhuma resposta recebida do assistente")
        }
      } catch (streamError) {
        console.error("Erro durante streaming:", streamError)
        throw streamError
      } finally {
        reader.releaseLock()
      }
    } catch (error: any) {
      console.error("❌ Erro ao enviar mensagem:", error)
      let errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      
      if (errorMessage.includes("503") || errorMessage.includes("Service Unavailable") || errorMessage.includes("demand")) {
        errorMessage = "Os servidores de IA do Google estão sob alta demanda no momento. Por favor, aguarde alguns instantes e tente novamente.";
      }
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Desculpe, ocorreu um erro ao processar sua solicitação: ${errorMessage}`
      }])
      setStreamingMessage("")
    } finally {
      setIsLoading(false)
      setLoadingMessage("")
      setLoadingProgress(0); // Reseta o progresso após o carregamento
    }
  }

  const handleChipClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const handleBackToIA = () => {
    router.push("/dashboard");
  };

  if (!isOnline) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <WifiOff className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">IA Assistente Indisponível Offline</h3>
                <p className="text-sm text-muted-foreground">
                  O Assistente de IA requer conexão com a internet para funcionar. Por favor, conecte-se à internet para acessar esta funcionalidade.
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
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Header com Botão Voltar e Filtro de Data */}
        <div className="p-4 md:p-6 flex flex-col sm:flex-col items-start sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToIA}
              className="gap-2 text-[#121212]/60 hover:text-[#1E5128] hover:bg-[#76BA1B]/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Início
            </Button>

            {/* Filtro de Data */}
            <div className="flex items-center gap-2 bg-white border border-[#F2F2F2] rounded-full px-3 py-1 shadow-sm">
              <CalendarIcon className="w-4 h-4 text-[#76BA1B]" />
              <div className="flex items-center gap-2">
                <Input
                  id="dataInicio"
                  type="date"
                  value={filtro.dataInicio}
                  onChange={(e) => {
                    const novaDataInicio = e.target.value;
                    const dataFimAtual = new Date(filtro.dataFim);
                    const tresMesesDepois = new Date(novaDataInicio);
                    tresMesesDepois.setMonth(tresMesesDepois.getMonth() + 3);

                    if (dataFimAtual > tresMesesDepois) {
                      alert('O intervalo máximo permitido é de 3 meses');
                      return;
                    }

                    setFiltro(prev => ({ ...prev, dataInicio: novaDataInicio }));
                    setFiltroAlterado(true);
                    console.log('Filtro de data alterado: dataInicio para', novaDataInicio);
                  }}
                  className="w-36 h-8 text-xs md:text-sm border-none shadow-none focus-visible:ring-0 bg-transparent text-[#1E5128] font-medium"
                  disabled={isLoading}
                />
                <span className="text-xs text-[#1E5128]/50">até</span>
                <Input
                  id="dataFim"
                  type="date"
                  value={filtro.dataFim}
                  onChange={(e) => {
                    const novaDataFim = e.target.value;
                    const dataInicioAtual = new Date(filtro.dataInicio);
                    const tresMesesDepois = new Date(dataInicioAtual);
                    tresMesesDepois.setMonth(tresMesesDepois.getMonth() + 3);
                    const dataFimNova = new Date(novaDataFim);

                    if (dataFimNova > tresMesesDepois) {
                      alert('O intervalo máximo permitido é de 3 meses');
                      return;
                    }

                    setFiltro(prev => ({ ...prev, dataFim: novaDataFim }));
                    setFiltroAlterado(true);
                    console.log('Filtro de data alterado: dataFim para', novaDataFim);
                  }}
                  className="w-36 h-8 text-xs md:text-sm border-none shadow-none focus-visible:ring-0 bg-transparent text-[#1E5128] font-medium"
                  disabled={isLoading}
                />
              </div>
              {(filtro.dataInicio !== (new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0]) || filtro.dataFim !== (new Date().toISOString().split('T')[0])) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const dataFim = new Date()
                    const dataInicio = new Date()
                    dataInicio.setDate(dataFim.getDate() - 90)
                    setFiltro({
                      dataInicio: dataInicio.toISOString().split('T')[0],
                      dataFim: dataFim.toISOString().split('T')[0]
                    })
                    setMessages([])
                    setIsFirstMessage(true)
                    setFiltroAlterado(false); // Reseta o flag ao limpar o filtro
                    console.log('Filtro de data resetado e messages limpas.');
                  }}
                  className="text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Área de Mensagens */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 md:px-6 md:py-8 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full py-12 space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-32 h-12">
                  <img src="/Logo_Final.png" alt="Logo" className="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <h1 className="text-3xl font-black text-[#1E5128] tracking-tight">Assistente PredictChat</h1>
              </div>
              <p className="text-center text-[#1E5128]/70 max-w-lg leading-relaxed">
                Posso analisar rotas, visitas, parceiros e produtos para sugerir as melhores ações comerciais. Como posso ajudar você a vender mais hoje?
              </p>

              {/* Chips de Sugestões */}
              <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
                {SUGGESTED_PROMPTS.map((promptData) => (
                  <div key={promptData.label} className="relative group">
                    <Button
                      variant="outline"
                      className="rounded-full border-[#F2F2F2] shadow-sm bg-white hover:border-[#76BA1B] hover:text-[#76BA1B] text-[#121212]/80 transition-all font-medium py-6 px-6"
                      onClick={() => handleChipClick(promptData.prompt)}
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
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`relative max-w-[85%] md:max-w-[75%] p-4 md:p-5 shadow-sm border-none group ${message.role === "user"
                      ? "bg-gradient-to-br from-[#1E5128] to-[#121212] flex flex-col justify-between text-white rounded-2xl rounded-tr-sm"
                      : "bg-white border-[#F2F2F2] text-[#121212]/90 rounded-2xl rounded-tl-sm ring-1 ring-[#F2F2F2]"
                      }`}
                  >
                    {/* Botão de Cópia da Mensagem */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute top-2 right-2 h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${message.role === 'user' ? 'hover:bg-white/10 text-white/70' : 'hover:bg-muted text-muted-foreground'}`}
                      onClick={() => copyToClipboard(message.content)}
                      title="Copiar mensagem"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>

                    {message.role === "assistant" ? (
                      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-current prose-p:leading-relaxed prose-headings:text-[#1E5128] prose-strong:text-[#1E5128] prose-a:text-[#76BA1B] prose-table:border-collapse prose-th:border prose-th:p-2 prose-td:border prose-td:p-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm md:text-base leading-relaxed font-medium pr-6">{message.content}</p>
                    )}
                  </Card>
                </div>
              ))}

              {/* Mensagem em Streaming */}
              {streamingMessage && (
                <div className="flex justify-start">
                  <Card className="max-w-[85%] md:max-w-[75%] p-4 md:p-5 shadow-sm bg-white border-none ring-1 ring-[#F2F2F2] text-[#121212]/90 rounded-2xl rounded-tl-sm">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-current prose-p:leading-relaxed prose-headings:text-[#1E5128] prose-strong:text-[#1E5128] prose-a:text-[#76BA1B] prose-table:border-collapse prose-th:border prose-th:p-2 prose-td:border prose-td:p-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamingMessage}
                      </ReactMarkdown>
                    </div>
                  </Card>
                </div>
              )}

              {isLoading && !streamingMessage && (
                <div className="flex justify-start">
                  <Card className="max-w-[85%] md:max-w-[75%] p-4 bg-white shadow-sm ring-1 ring-[#F2F2F2] rounded-2xl rounded-tl-sm border-none">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#76BA1B]/10 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-[#76BA1B] animate-spin" />
                      </div>
                      <span className="text-sm font-medium text-[#1E5128]/70">{loadingMessage || "Pensando..."}</span>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}

          {/* Barra de Progresso de Carregamento de Dados */}
          {isLoadingData && (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Loader2 className="w-6 h-6 animate-spin text-[#76BA1B] mb-3" />
              <div className="w-full max-w-md space-y-2">
                <p className="text-sm font-medium text-[#1E5128]/80 text-center">{loadingMessage || 'Carregando dados...'}</p>
                <div className="w-full bg-[#76BA1B]/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#76BA1B] h-full transition-all duration-500 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[#1E5128]/50 font-bold text-center">{loadingProgress}%</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Barra de Input Fixa Otimizada */}
        <div className="bg-transparent p-4 md:p-6 flex-shrink-0">
          <div className="flex items-center gap-2 p-1.5 md:p-2 bg-white border border-[#F2F2F2] shadow-sm rounded-full max-w-4xl mx-auto focus-within:ring-2 focus-within:ring-[#76BA1B]/20 focus-within:border-[#76BA1B] transition-all">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
              placeholder="Fale com a inteligência artificial..."
              disabled={isLoading}
              className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm md:text-base px-4 h-10 md:h-12 bg-transparent"
            />
            <Button
              onClick={() => handleSendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-[#76BA1B] hover:bg-[#65A017] rounded-full w-10 h-10 md:w-12 md:h-12 flex-shrink-0 transition-transform hover:scale-105"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}