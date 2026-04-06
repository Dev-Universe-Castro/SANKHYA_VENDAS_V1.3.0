
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sparkles, Send } from "lucide-react"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

interface IAMessage {
  tipo: 'usuario' | 'ia'
  mensagem: string
  timestamp: Date
}

export function AskAIButton() {
  const [open, setOpen] = useState(false)
  const [mensagem, setMensagem] = useState("")
  const [conversas, setConversas] = useState<IAMessage[]>([])
  const [loading, setLoading] = useState(false)

  const promptsSugeridos = [
    "Prepare meu roteiro de hoje",
    "Quem são os clientes com maior chance de compra agora?",
    "Mostre leads que precisam de atenção urgente",
    "Qual o melhor horário para contatar o Lead X?"
  ]

  const enviarMensagem = async () => {
    if (!mensagem.trim()) return

    const novaMensagem: IAMessage = {
      tipo: 'usuario',
      mensagem: mensagem,
      timestamp: new Date()
    }

    setConversas([...conversas, novaMensagem])
    setMensagem("")
    setLoading(true)

    try {
      // Aqui você chamaria a API do Gemini
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: novaMensagem.mensagem })
      })

      if (response.ok) {
        const data = await response.json()
        const respostaIA: IAMessage = {
          tipo: 'ia',
          mensagem: data.resposta,
          timestamp: new Date()
        }
        setConversas(prev => [...prev, respostaIA])
      } else {
        throw new Error('Erro ao processar')
      }
    } catch (error) {
      toast.error('Erro ao processar sua solicitação')
    } finally {
      setLoading(false)
    }
  }

  const usarPromptSugerido = (prompt: string) => {
    setMensagem(prompt)
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 z-50"
        size="icon"
      >
        <Sparkles className="h-6 w-6 animate-pulse" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              IA Sales Assistant
            </DialogTitle>
          </DialogHeader>

          {conversas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <Sparkles className="h-16 w-16 text-purple-600 animate-pulse" />
              <h3 className="text-lg font-semibold">Como posso ajudar você hoje?</h3>
              <p className="text-sm text-muted-foreground text-center">
                Faça perguntas sobre seus leads, clientes ou atividades
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 w-full">
                {promptsSugeridos.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto py-3 px-4 text-left justify-start"
                    onClick={() => usarPromptSugerido(prompt)}
                  >
                    <span className="text-xs">{prompt}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {conversas.map((conversa, index) => (
                  <div
                    key={index}
                    className={`flex ${conversa.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        conversa.tipo === 'usuario'
                          ? 'bg-purple-600 text-white'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{conversa.mensagem}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {conversa.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Input
              placeholder="Digite sua pergunta..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
              disabled={loading}
            />
            <Button 
              onClick={enviarMensagem} 
              disabled={loading || !mensagem.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
