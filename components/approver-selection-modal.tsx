import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { OfflineDataService } from "@/lib/offline-data-service"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"

interface ApproverSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (idAprovador: number, justificativa?: string) => void
    violations: string[]
}

export function ApproverSelectionModal({ isOpen, onClose, onConfirm, violations }: ApproverSelectionModalProps) {
    const [approvers, setApprovers] = useState<any[]>([])
    const [selectedApprover, setSelectedApprover] = useState<string>("")
    const [justification, setJustification] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadApprovers()
        }
    }, [isOpen])

    const loadApprovers = async () => {
        setIsLoading(true)
        try {
            const users = await OfflineDataService.getUsuarios()
            // Filter logic: usually managers/admins. 
            const potentialApprovers = users.filter((u: any) => u.FUNCAO === 'GERENTE' || u.FUNCAO === 'SUPERVISOR' || u.FUNCAO === 'ADMIN');

            setApprovers(potentialApprovers.length === 0 ? users : potentialApprovers);

            // Buscar gestor automático do usuário logado
            const currentUser = authService.getCurrentUser();
            if (currentUser && currentUser.id) {
                const gestor = await OfflineDataService.getGestorUsuarioLogado(currentUser.id);
                if (gestor) {
                    console.log('👔 Gestor automático identificado:', gestor.NOME);
                    setSelectedApprover(String(gestor.CODUSUARIO));
                }
            }

        } catch (error) {
            console.error("Erro ao carregar aprovadores:", error)
            toast.error("Erro ao carregar lista de aprovadores")
        } finally {
            setIsLoading(false)
        }
    }

    const handleConfirm = () => {
        if (!selectedApprover) {
            toast.error("Selecione um aprovador")
            return
        }
        onConfirm(Number(selectedApprover), justification)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-red-600">⚠️ Aprovação Necessária</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="bg-red-50 p-3 rounded-md border border-red-100">
                        <h4 className="font-semibold text-red-800 text-sm mb-2">Violações de Política Detectadas:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            {violations.map((v, i) => (
                                <li key={i} className="text-xs text-red-700">{v}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Label>Selecione o Gestor para Aprovação</Label>
                        <Select value={selectedApprover} onValueChange={setSelectedApprover}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um aprovador..." />
                            </SelectTrigger>
                            <SelectContent>
                                {approvers.map((user) => (
                                    <SelectItem key={user.CODUSUARIO} value={String(user.CODUSUARIO)}>
                                        {user.NOME} ({user.FUNCAO || 'Usuario'})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Justificativa (Opcional)</Label>
                        <Textarea
                            placeholder="Explique o motivo da exceção..."
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700 text-white">
                        Solicitar Aprovação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
