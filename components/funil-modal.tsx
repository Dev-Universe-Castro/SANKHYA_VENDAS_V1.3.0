"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Funil } from "@/lib/funis-service"
import { useToast } from "@/hooks/use-toast"

interface FunilModalProps {
  isOpen: boolean
  onClose: () => void
  funil: Funil | null
  onSave: () => void
}

const CORES_PREDEFINIDAS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", 
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
]

export function FunilModal({ isOpen, onClose, funil, onSave }: FunilModalProps) {
  const [formData, setFormData] = useState({
    NOME: "",
    DESCRICAO: "",
    COR: "#3b82f6",
    ATIVO: "S"
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true)

      if (funil) {
        setFormData({
          NOME: funil.NOME || "",
          DESCRICAO: funil.DESCRICAO || "",
          COR: funil.COR || "#3b82f6",
          ATIVO: funil.ATIVO || "S"
        })
      } else {
        setFormData({
          NOME: "",
          DESCRICAO: "",
          COR: "#3b82f6",
          ATIVO: "S"
        })
      }

      // Garantir que os dados foram completamente carregados
      requestAnimationFrame(() => {
        setIsInitializing(false)
      })
    }
  }, [funil, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch('/api/funis/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(funil && { CODFUNIL: funil.CODFUNIL }),
          ...formData
        })
      })

      if (!response.ok) throw new Error('Falha ao salvar funil')

      toast({
        title: "Sucesso",
        description: funil ? "Funil atualizado com sucesso!" : "Funil criado com sucesso!",
      })

      onSave()
      onClose()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar funil",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Loading Overlay */}
      {(isSaving || isInitializing) && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">
              {isInitializing ? "Carregando dados..." : "Salvando..."}
            </p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isSaving && !isInitializing ? onClose : undefined} />

      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {funil ? "Editar Funil" : "Novo Funil"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="NOME">Nome do Funil *</Label>
            <Input
              id="NOME"
              value={formData.NOME}
              onChange={(e) => setFormData({ ...formData, NOME: e.target.value })}
              placeholder="Ex: Funil de Vendas B2B"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="DESCRICAO">Descrição</Label>
            <Textarea
              id="DESCRICAO"
              value={formData.DESCRICAO}
              onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
              placeholder="Descreva o propósito deste funil..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor do Funil</Label>
            <div className="flex gap-2 flex-wrap">
              {CORES_PREDEFINIDAS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setFormData({ ...formData, COR: cor })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.COR === cor ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          {funil && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <Label htmlFor="ATIVO" className="text-sm font-bold">Status do Funil</Label>
                <p className="text-xs text-muted-foreground">Inativar funil oculta ele das telas de seleção</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ATIVO: formData.ATIVO === 'S' ? 'N' : 'S' })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.ATIVO === 'S' ? 'bg-green-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.ATIVO === 'S' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs font-bold w-12">
                  {formData.ATIVO === 'S' ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? "Salvando..." : (funil ? "Atualizar" : "Criar")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}