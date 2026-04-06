"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface TabelaPrecoConfig {
  CODCONFIG?: number
  NUTAB: number
  CODTAB: string
  DESCRICAO?: string
  ATIVO?: string
}

export default function TabelasPrecosConfigManager() {
  const [configs, setConfigs] = useState<TabelaPrecoConfig[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service');
      const storedConfigs = await OfflineDataService.getTabelasPrecosConfig();

      if (storedConfigs && storedConfigs.length > 0) {
        setConfigs(storedConfigs);
      } else {
        // Fallback or empty
        setConfigs([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Placeholder simplified component to revert complex changes
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Configurações de Tabelas de Preços</CardTitle>
          <Button disabled size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nova Regra (Em manutenção)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Funcionalidade movida para "Políticas Comerciais".
          </div>
        </CardContent>
      </Card>
    </div>
  )
}