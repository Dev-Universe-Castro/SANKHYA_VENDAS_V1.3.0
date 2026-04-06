
"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Funil, EstagioFunil } from "@/lib/oracle-funis-service"
import { useToast } from "@/hooks/use-toast"

interface EstagiosModalProps {
  isOpen: boolean
  onClose: () => void
  funil: Funil | null
  onSave: () => void
}

const CORES_PREDEFINIDAS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", 
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
]

export function EstagiosModal({ isOpen, onClose, funil, onSave }: EstagiosModalProps) {
  const [estagios, setEstagios] = useState<EstagioFunil[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (funil && isOpen) {
      setEstagios([])
      setIsLoading(true)
      loadEstagios()
    } else if (!isOpen) {
      setEstagios([])
      setIsLoading(false)
    }
  }, [funil, isOpen])

  const loadEstagios = async () => {
    if (!funil) return
    try {
      const response = await fetch(`/api/funis/estagios?codFunil=${funil.CODFUNIL}`)
      if (!response.ok) throw new Error('Falha ao carregar estágios')
      const data = await response.json()
      
      // Garantir que os dados foram completamente processados antes de atualizar
      requestAnimationFrame(() => {
        setEstagios(data)
        setIsLoading(false)
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleAddEstagio = () => {
    const novoEstagio: Partial<EstagioFunil> = {
      CODESTAGIO: `temp-${Date.now()}`,
      CODFUNIL: funil?.CODFUNIL || "",
      NOME: "",
      ORDEM: estagios.length + 1,
      COR: CORES_PREDEFINIDAS[estagios.length % CORES_PREDEFINIDAS.length],
      ATIVO: "S"
    }
    setEstagios([...estagios, novoEstagio as EstagioFunil])
  }

  const handleUpdateEstagio = (index: number, field: keyof EstagioFunil, value: any) => {
    const updated = [...estagios]
    updated[index] = { ...updated[index], [field]: value }
    setEstagios(updated)
  }

  const handleRemoveEstagio = async (index: number) => {
    const estagio = estagios[index]
    
    // Se for um estágio temporário (não salvo ainda), apenas remove da lista
    if (estagio.CODESTAGIO.startsWith('temp-')) {
      setEstagios(estagios.filter((_, i) => i !== index))
      return
    }

    // Confirmar antes de inativar
    if (!confirm(`Tem certeza que deseja inativar o estágio "${estagio.NOME}"?`)) {
      return
    }

    try {
      const response = await fetch('/api/funis/estagios/deletar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codEstagio: estagio.CODESTAGIO })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Falha ao inativar estágio')
      }

      // Remove da lista local após inativar com sucesso
      setEstagios(estagios.filter((_, i) => i !== index))
      
      toast({
        title: "Sucesso",
        description: "Estágio inativado com sucesso!",
      })

      // Notificar o componente pai para atualizar o kanban
      onSave()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao inativar estágio",
        variant: "destructive",
      })
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newEstagios = [...estagios]
    const draggedItem = newEstagios[draggedIndex]
    
    // Remove o item da posição original
    newEstagios.splice(draggedIndex, 1)
    // Insere na nova posição
    newEstagios.splice(index, 0, draggedItem)
    
    // Atualiza as ordens de TODOS os estágios
    const estagiosComOrdemAtualizada = newEstagios.map((est, idx) => ({
      ...est,
      ORDEM: idx + 1
    }))
    
    setEstagios(estagiosComOrdemAtualizada)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSave = async () => {
    if (!funil) return

    // Validar se todos os estágios têm nomes preenchidos
    const estagiosVazios = estagios.filter(e => !e.NOME || e.NOME.trim() === '')
    if (estagiosVazios.length > 0) {
      toast({
        title: "Atenção",
        description: "Por favor, preencha o nome de todos os estágios antes de salvar.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Atualiza as ordens antes de salvar
      const estagiosComOrdem = estagios.map((estagio, index) => ({
        ...estagio,
        ORDEM: index + 1
      }))
      
      for (const estagio of estagiosComOrdem) {
        const response = await fetch('/api/funis/estagios/salvar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            CODESTAGIO: estagio.CODESTAGIO,
            CODFUNIL: funil.CODFUNIL,
            NOME: estagio.NOME.trim(),
            ORDEM: estagio.ORDEM,
            COR: estagio.COR
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Falha ao salvar estágio')
        }
      }

      // Recarregar os estágios com os códigos reais do banco
      await loadEstagios()

      toast({
        title: "Sucesso",
        description: "Estágios salvos com sucesso!",
      })

      onSave()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar estágios",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !funil) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Loading Overlay */}
      {(isLoading || isSaving) && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">
              {isLoading ? "Carregando estágios..." : "Salvando..."}
            </p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isLoading && !isSaving ? onClose : undefined} />
      
      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Configurar Estágios</h2>
            <p className="text-sm text-muted-foreground">{funil.NOME}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" disabled={isLoading || isSaving}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {estagios.sort((a, b) => a.ORDEM - b.ORDEM).map((estagio, index) => (
            <div 
              key={estagio.CODESTAGIO} 
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex flex-col gap-3 p-3 bg-muted/30 rounded-lg transition-all ${
                draggedIndex === index ? 'opacity-50 scale-95' : ''
              } ${draggedIndex !== null && draggedIndex !== index ? 'border-2 border-dashed border-primary/30' : ''}`}
            >
              {/* Linha 1: Drag handle e input do nome */}
              <div className="flex items-center gap-2 w-full">
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />
                <Input
                  value={estagio.NOME}
                  onChange={(e) => handleUpdateEstagio(index, 'NOME', e.target.value)}
                  placeholder="Nome do estágio *"
                  className={`flex-1 ${!estagio.NOME || estagio.NOME.trim() === '' ? 'border-red-300' : ''}`}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveEstagio(index)}
                  className="text-destructive flex-shrink-0 h-9 w-9 p-0"
                  title="Inativar Estágio"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Linha 2: Seletor de cores */}
              <div className="flex gap-2 justify-center flex-wrap">
                {CORES_PREDEFINIDAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => handleUpdateEstagio(index, 'COR', cor)}
                    className={`w-8 h-8 rounded border-2 transition-all flex-shrink-0 ${
                      estagio.COR === cor ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleAddEstagio}
          className="w-full"
          disabled={isLoading || isSaving}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Estágio
        </Button>

        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isLoading || isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={isLoading || isSaving}>
            {isSaving ? "Salvando..." : "Salvar Estágios"}
          </Button>
        </div>
      </div>
    </div>
  )
}
