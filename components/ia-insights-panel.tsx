
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, AlertTriangle, Target } from "lucide-react"
import { toast } from "sonner"

interface IAInsight {
  id: string
  tipo: 'oportunidade' | 'risco' | 'meta'
  titulo: string
  descricao: string
  valor?: string
  acao: string
  acaoUrl?: string
  prioridade: 'alta' | 'media' | 'baixa'
}

export function IAInsightsPanel() {
  const [insights, setInsights] = useState<IAInsight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarInsights()
  }, [])

  const carregarInsights = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/gemini/insights-diarios')
      
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights || gerarInsightsPadrao())
      } else {
        setInsights(gerarInsightsPadrao())
      }
    } catch (error) {
      console.error('Erro ao carregar insights:', error)
      setInsights(gerarInsightsPadrao())
    } finally {
      setLoading(false)
    }
  }

  const gerarInsightsPadrao = (): IAInsight[] => {
    return [
      {
        id: '1',
        tipo: 'oportunidade',
        titulo: 'Oportunidade Quente',
        descricao: 'Cliente X tem lead de R$ 50k parado há 5 dias. Produto Y em estoque pode facilitar.',
        valor: 'R$ 50.000',
        acao: 'Ver Lead',
        prioridade: 'alta'
      },
      {
        id: '2',
        tipo: 'risco',
        titulo: 'Risco Detectado',
        descricao: 'Cliente Z possui 2 títulos vencidos. Verifique antes da próxima visita.',
        valor: 'R$ 12.500',
        acao: 'Ver Títulos',
        prioridade: 'alta'
      },
      {
        id: '3',
        tipo: 'meta',
        titulo: 'Foco do Dia',
        descricao: 'Você tem 3 leads em "Proposta" sem contato há 48h. Priorize retorno.',
        acao: 'Ver Leads',
        prioridade: 'media'
      }
    ]
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'oportunidade':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'risco':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'meta':
        return <Target className="h-5 w-5 text-blue-600" />
      default:
        return <Sparkles className="h-5 w-5 text-purple-600" />
    }
  }

  const getBorderColor = (tipo: string) => {
    switch (tipo) {
      case 'oportunidade':
        return 'border-l-green-600'
      case 'risco':
        return 'border-l-red-600'
      case 'meta':
        return 'border-l-blue-600'
      default:
        return 'border-l-purple-600'
    }
  }

  const executarAcao = (insight: IAInsight) => {
    toast.info(`Executando: ${insight.acao}`)
    // Aqui você pode adicionar navegação ou abrir modais
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-muted"></CardHeader>
            <CardContent className="h-24 bg-muted/50"></CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
        <h2 className="text-lg font-semibold">Foque Nisso Hoje</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.slice(0, 3).map((insight) => (
          <Card 
            key={insight.id} 
            className={`border-l-4 ${getBorderColor(insight.tipo)} hover:shadow-lg transition-shadow`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {insight.titulo}
              </CardTitle>
              {getIcon(insight.tipo)}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                {insight.descricao}
              </p>
              {insight.valor && (
                <p className="text-lg font-bold text-green-600 mb-2">
                  {insight.valor}
                </p>
              )}
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm"
                onClick={() => executarAcao(insight)}
              >
                {insight.acao} →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
