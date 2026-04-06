"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface KPIWidgetProps {
  data: {
    title: string
    value: number
    unit: string
    trend?: 'up' | 'down' | 'neutral'
    icon?: 'trending-up' | 'trending-down' | 'activity'
  }
}

export default function KPIWidget({ data }: KPIWidgetProps) {
  const formatValue = (value: number) => {
    if (data.unit === 'R$') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }
    return value.toLocaleString('pt-BR')
  }

  const getIcon = () => {
    switch (data.icon) {
      case 'trending-up':
        return <TrendingUp className="h-8 w-8 text-primary" />
      case 'trending-down':
        return <TrendingDown className="h-8 w-8 text-destructive" />
      case 'activity':
        return <Activity className="h-8 w-8 text-primary" />
      default:
        return <Activity className="h-8 w-8 text-primary" />
    }
  }

  const getTrendColor = () => {
    switch (data.trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-slate-600'
    }
  }

  return (
    <Card className="h-full flex flex-col border shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {data.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-slate-800">
              {formatValue(data.value)}
            </div>
            {data.unit !== 'R$' && (
              <div className="text-sm text-slate-500 mt-1">{data.unit}</div>
            )}
          </div>
          <div className="bg-primary/10 p-3 rounded-xl">
            {getIcon()}
          </div>
        </div>
        {data.trend && (
          <div className={`mt-4 flex items-center gap-1 text-sm font-semibold ${getTrendColor()}`}>
            {data.trend === 'up' && <TrendingUp className="h-4 w-4" />}
            {data.trend === 'down' && <TrendingDown className="h-4 w-4" />}
            {data.trend === 'up' ? 'Em crescimento' : data.trend === 'down' ? 'Em queda' : 'Estável'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
