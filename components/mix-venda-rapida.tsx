
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TrendingUp, Package, ShoppingCart } from "lucide-react"

interface MixProduto {
  codProd: string
  descricao: string
  tipo: 'novo' | 'expansao' | 'recorrente'
  ultimaCompra?: string
  potencial: number
}

export function MixVendaRapida() {
  const [produtos, setProdutos] = useState<MixProduto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarMixVenda()
  }, [])

  const carregarMixVenda = async () => {
    try {
      // Aqui você faria a requisição real
      // const response = await fetch('/api/gemini/mix-venda')
      
      // Mock data por enquanto
      setProdutos([
        {
          codProd: '1001',
          descricao: 'Produto A - Alta Demanda',
          tipo: 'novo',
          potencial: 85
        },
        {
          codProd: '1002',
          descricao: 'Produto B - Complementar',
          tipo: 'expansao',
          ultimaCompra: '15/12/2024',
          potencial: 70
        },
        {
          codProd: '1003',
          descricao: 'Produto C - Recompra',
          tipo: 'recorrente',
          ultimaCompra: '20/11/2024',
          potencial: 95
        }
      ])
    } catch (error) {
      console.error('Erro ao carregar mix de venda:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'novo':
        return <Badge className="bg-blue-500">Novo</Badge>
      case 'expansao':
        return <Badge className="bg-orange-500">Expansão</Badge>
      case 'recorrente':
        return <Badge className="bg-green-500">Recorrente</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-5 w-5 text-purple-600" />
          Mix de Venda Rápida
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Produtos recomendados com base em análise de compras
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {produtos.map((produto) => (
                <Card key={produto.codProd} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{produto.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          Cód: {produto.codProd}
                        </p>
                      </div>
                      {getTipoBadge(produto.tipo)}
                    </div>
                    
                    {produto.ultimaCompra && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Última compra: {produto.ultimaCompra}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${produto.potencial}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{produto.potencial}%</span>
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
