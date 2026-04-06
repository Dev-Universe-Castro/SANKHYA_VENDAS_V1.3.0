
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface AtividadeIA {
  id: string
  titulo: string
  lead: string
  estagio: string
  prioridade: 'alta' | 'media' | 'baixa'
  sugestaoIA: string
  tempoSemContato: string
  tipo: 'urgente' | 'sugerida' | 'planejada'
}

export function TimelineInteligente() {
  const [atividades, setAtividades] = useState<AtividadeIA[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarAtividades()
  }, [])

  const carregarAtividades = async () => {
    try {
      // Mock data - substituir por API real
      setAtividades([
        {
          id: '1',
          titulo: 'Follow-up Proposta',
          lead: 'Lead W - Empresa ABC',
          estagio: 'Proposta',
          prioridade: 'alta',
          sugestaoIA: 'Está em proposta há 48h. Envie email de acompanhamento.',
          tempoSemContato: '48h',
          tipo: 'urgente'
        },
        {
          id: '2',
          titulo: 'Demonstração Produto',
          lead: 'Lead X - Empresa XYZ',
          estagio: 'Qualificação',
          prioridade: 'media',
          sugestaoIA: 'Cliente mostrou interesse em demo. Agende para hoje.',
          tempoSemContato: '24h',
          tipo: 'sugerida'
        },
        {
          id: '3',
          titulo: 'Reunião Contrato',
          lead: 'Lead Y - Empresa DEF',
          estagio: 'Negociação',
          prioridade: 'alta',
          sugestaoIA: 'Cliente aguarda ajuste de proposta. Finalize hoje.',
          tempoSemContato: '12h',
          tipo: 'urgente'
        }
      ])
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return 'text-red-600 bg-red-50'
      case 'media':
        return 'text-orange-600 bg-orange-50'
      case 'baixa':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'urgente':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'sugerida':
        return <Sparkles className="h-4 w-4 text-purple-600" />
      case 'planejada':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const executarAtividade = (atividade: AtividadeIA) => {
    toast.success(`Abrindo: ${atividade.titulo}`)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
          Timeline Inteligente
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Atividades priorizadas por IA
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {atividades.map((atividade, index) => (
                <Card 
                  key={atividade.id} 
                  className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        {getTipoIcon(atividade.tipo)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{atividade.titulo}</p>
                          <p className="text-xs text-muted-foreground">{atividade.lead}</p>
                        </div>
                      </div>
                      <Badge className={getPrioridadeColor(atividade.prioridade)}>
                        {atividade.prioridade}
                      </Badge>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded p-2 mb-2">
                      <p className="text-xs text-purple-900">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        {atividade.sugestaoIA}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Sem contato há {atividade.tempoSemContato}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => executarAtividade(atividade)}
                        className="h-7 text-xs"
                      >
                        Executar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
