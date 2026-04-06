"use client"

import { useState, useEffect } from "react"
import { Plus, Settings, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Funil, EstagioFunil } from "@/lib/funis-service"
import { FunilModal } from "./funil-modal"
import { EstagiosModal } from "./estagios-modal"
import type { User } from "@/lib/auth-service"
import { authService } from "@/lib/auth-service"

interface FunilManagerProps {
  onSelectFunil: (funil: Funil) => void
  selectedFunilId?: string
  onCreateFunil?: () => void
}

export function FunilManager({ onSelectFunil, selectedFunilId, onCreateFunil }: FunilManagerProps) {
  const [funis, setFunis] = useState<Funil[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFunilModalOpen, setIsFunilModalOpen] = useState(false)
  const [isEstagiosModalOpen, setIsEstagiosModalOpen] = useState(false)
  const [selectedFunil, setSelectedFunil] = useState<Funil | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const user = authService.getCurrentUser()
    setCurrentUser(user)
    loadFunis()
  }, [])

  const loadFunis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/funis')
      if (!response.ok) throw new Error('Falha ao carregar funis')
      const data = await response.json()
      setFunis(data)

      // Selecionar o primeiro funil automaticamente
      if (data.length > 0 && !selectedFunilId) {
        onSelectFunil(data[0])
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao carregar funis",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFunil = () => {
    if (!currentUser?.isAdmin) {
      toast({
        title: "Acesso Negado",
        description: "Somente administradores podem criar funis.",
        variant: "destructive",
      })
      return
    }
    if (onCreateFunil) {
      onCreateFunil()
    } else {
      setSelectedFunil(null)
      setIsFunilModalOpen(true)
    }
  }

  const handleEditFunil = (funil: Funil) => {
    if (!currentUser?.isAdmin) {
      toast({
        title: "Acesso Negado",
        description: "Somente administradores podem editar funis.",
        variant: "destructive",
      })
      return
    }
    setSelectedFunil(funil)
    requestAnimationFrame(() => {
      setIsFunilModalOpen(true)
    })
  }

  const handleDeleteFunil = async (codFunil: string) => {
    if (!confirm('Tem certeza que deseja inativar este funil?')) {
      return
    }

    try {
      const response = await fetch('/api/funis/deletar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codFunil })
      })

      if (!response.ok) throw new Error('Falha ao inativar funil')

      toast({
        title: "Sucesso",
        description: "Funil inativado com sucesso!",
      })

      loadFunis()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao inativar funil",
        variant: "destructive",
      })
    }
  }

  const handleConfigureEstagios = (funil: Funil) => {
    if (!currentUser?.isAdmin) {
      toast({
        title: "Acesso Negado",
        description: "Somente administradores podem configurar estágios.",
        variant: "destructive",
      })
      return
    }
    setSelectedFunil(funil)
    requestAnimationFrame(() => {
      setIsEstagiosModalOpen(true)
    })
  }

  const handleFunilSaved = async () => {
    await loadFunis()
    setIsFunilModalOpen(false)
    toast({
      title: "Sucesso",
      description: selectedFunil ? "Funil atualizado!" : "Funil criado!",
    })
  }

  const handleEstagiosSaved = async () => {
    setIsEstagiosModalOpen(false)
    toast({
      title: "Sucesso",
      description: "Estágios atualizados!",
    })
  }

  // Define a ordem desejada para os funis
  const orderedFunis = [...funis].sort((a, b) => {
    const order: { [key: string]: number } = {
      "Início": 1,
      "Leads": 2,
      "Parceiros": 3,
      "Usuários": 4,
    };
    return (order[a.NOME] || 99) - (order[b.NOME] || 99);
  });

  return (
    <>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {orderedFunis.map((funil) => (
          <div key={funil.CODFUNIL} className="flex items-center gap-1">
            <Button
              variant={selectedFunilId === funil.CODFUNIL ? "default" : "outline"}
              onClick={() => onSelectFunil(funil)}
              className="whitespace-nowrap"
              style={{
                backgroundColor: selectedFunilId === funil.CODFUNIL ? funil.COR : 'transparent',
                borderColor: funil.COR,
                color: selectedFunilId === funil.CODFUNIL ? 'white' : funil.COR
              }}
            >
              {funil.NOME}
            </Button>
            {currentUser?.isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleConfigureEstagios(funil)}
                  className="h-8 w-8 p-0"
                  title="Configurar Estágios"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditFunil(funil)}
                  className="h-8 w-8 p-0"
                  title="Editar Funil"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteFunil(funil.CODFUNIL)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  title="Inativar Funil"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        ))}
        {currentUser?.isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateFunil}
            className="whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo Funil
          </Button>
        )}
      </div>

      <FunilModal
        isOpen={isFunilModalOpen}
        onClose={() => setIsFunilModalOpen(false)}
        funil={selectedFunil}
        onSave={handleFunilSaved}
      />

      <EstagiosModal
        isOpen={isEstagiosModalOpen}
        onClose={() => setIsEstagiosModalOpen(false)}
        funil={selectedFunil}
        onSave={handleEstagiosSaved}
      />
    </>
  )
}