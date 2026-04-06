
"use client"

import { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface VendedorSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (codVendedor: number) => void
  tipo: 'gerente' | 'vendedor'
  codGerenteSelecionado?: number
}

interface Vendedor {
  CODVEND: number
  APELIDO: string
  TIPVEND: string
  ATIVO: string
  CODGER?: number
}

export default function VendedorSelectorModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  tipo,
  codGerenteSelecionado 
}: VendedorSelectorModalProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadVendedoresFromCache()
    }
  }, [isOpen, tipo, codGerenteSelecionado])

  const loadVendedoresFromCache = async () => {
    setIsLoading(true)
    try {
      // Buscar vendedores do IndexedDB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const vendedoresList = await OfflineDataService.getVendedores()
      
      console.log(`📋 Total de vendedores no IndexedDB: ${vendedoresList.length}`)
      
      // Filtrar por tipo
      let vendedoresFiltrados = vendedoresList.filter((v: Vendedor) => {
        // Verificar se está ativo
        if (v.ATIVO !== 'S') return false
        
        if (tipo === 'gerente') {
          return v.TIPVEND === 'G'
        } else {
          // Para vendedores, filtrar por tipo 'V'
          if (v.TIPVEND !== 'V') return false
          
          // Se há gerente selecionado, filtrar vendedores desse gerente
          if (codGerenteSelecionado) {
            return v.CODGER === codGerenteSelecionado
          }
          return true
        }
      })
      
      setVendedores(vendedoresFiltrados)
      console.log(`✅ ${vendedoresFiltrados.length} ${tipo === 'gerente' ? 'gerentes' : 'vendedores'} carregados do IndexedDB`)
      
      if (vendedoresFiltrados.length > 0) {
        console.log('📋 Primeiros 3 vendedores:', vendedoresFiltrados.slice(0, 3).map(v => ({
          CODVEND: v.CODVEND,
          APELIDO: v.APELIDO,
          TIPVEND: v.TIPVEND
        })))
      }
    } catch (error) {
      console.error('❌ Erro ao carregar vendedores do IndexedDB:', error)
      setVendedores([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredVendedores = vendedores.filter(v => 
    v.APELIDO?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(v.CODVEND).includes(searchTerm)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            Selecionar {tipo === 'gerente' ? 'Gerente' : 'Vendedor'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredVendedores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum resultado encontrado' : `Nenhum ${tipo === 'gerente' ? 'gerente' : 'vendedor'} disponível`}
            </div>
          ) : (
            filteredVendedores.map((v) => (
              <button
                key={v.CODVEND}
                onClick={() => {
                  onSelect(v.CODVEND)
                  onClose()
                }}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="font-medium">{v.APELIDO}</div>
                <div className="text-xs text-muted-foreground">Código: {v.CODVEND}</div>
              </button>
            ))
          )}
        </div>

        <Button
          onClick={onClose}
          variant="outline"
          className="w-full"
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
