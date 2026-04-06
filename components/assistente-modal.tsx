
"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Sparkles } from "lucide-react"
import Image from "next/image"
import ReactMarkdown from "react-markdown"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_PROMPTS = [
  {
    label: "Melhores Leads",
    prompt: "Quais são os melhores leads para eu focar agora?"
  },
  {
    label: "Ações Urgentes",
    prompt: "Quais ações urgentes eu preciso fazer hoje?"
  },
  {
    label: "Análise Rápida",
    prompt: "Faça uma análise rápida das minhas oportunidades de venda"
  },
  {
    label: "Produtos em Falta",
    prompt: "Quais produtos estão com estoque baixo?"
  }
]

interface AssistenteModalProps {
  open: boolean
  onClose: () => void
}

export function AssistenteModal({ open, onClose }: AssistenteModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: message }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setStreamingMessage("")

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages })
      })

      if (!response.ok) throw new Error("Erro ao processar resposta")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.text) {
                  accumulatedText += parsed.text
                  setStreamingMessage(accumulatedText)
                }
              } catch (e) {
                console.error("Erro ao parsear chunk:", e)
              }
            }
          }
        }

        setMessages(prev => [...prev, { role: "assistant", content: accumulatedText }])
        setStreamingMessage("")
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua solicitação."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleChipClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full p-0 sm:max-w-3xl h-[90vh] sm:h-[80vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Assistente IA
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full py-12 space-y-6">
              <div className="flex items-center gap-2 text-primary">
                <img src="/Logo_Final.png" alt="Logo" className="w-auto h-8 object-contain" />
                <h2 className="text-xl font-semibold">Como posso ajudar?</h2>
              </div>
              <p className="text-center text-muted-foreground max-w-md text-sm">
                Sou seu assistente de vendas com IA. Posso analisar seus leads, parceiros e produtos para sugerir as melhores ações comerciais.
              </p>

              <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {SUGGESTED_PROMPTS.map((promptData) => (
                  <Button
                    key={promptData.label}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => handleChipClick(promptData.prompt)}
                  >
                    {promptData.label}
                  </Button>
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
                    className={`max-w-[80%] p-3 ${message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                      }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </Card>
                </div>
              ))}

              {streamingMessage && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%] p-3 bg-muted">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>
                        {streamingMessage}
                      </ReactMarkdown>
                    </div>
                  </Card>
                </div>
              )}

              {isLoading && !streamingMessage && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%] p-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/anigif.gif"
                        alt="Carregando..."
                        width={24}
                        height={24}
                        unoptimized
                      />
                      <span className="text-sm text-muted-foreground">Pensando...</span>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-background p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
              placeholder="Digite sua pergunta..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={() => handleSendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
