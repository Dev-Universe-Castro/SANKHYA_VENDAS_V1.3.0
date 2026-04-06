"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Plus, Trash2, Save, Pencil, User as UserIcon, ListTodo, FileText, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ProdutoSelectorModal } from "@/components/produto-selector-modal"
import PedidoVendaRapido from "@/components/pedido-venda-rapido"
import { RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { ParceiroSelectorModal } from "./parceiro-selector-modal" // Importar o novo modal

// Interfaces... (restante das interfaces)

export function LeadDetailModal({ isOpen, onClose, lead, onSave }: LeadDetailModalProps) {
  // ... (restante dos estados)
  const [isParceiroSelectorOpen, setIsParceiroSelectorOpen] = useState(false);

  const [formData, setFormData] = useState({
    NOME: "",
    DESCRICAO: "",
    VALOR: 0,
    DATA_VENCIMENTO: "",
    TIPO_TAG: "",
    CODPARC: "",
    NOMEPARC: ""
  })

  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        NOME: lead.NOME || "",
        DESCRICAO: lead.DESCRICAO || "",
        VALOR: lead.VALOR || 0,
        DATA_VENCIMENTO: lead.DATA_VENCIMENTO || "",
        TIPO_TAG: lead.TIPO_TAG || "",
        CODPARC: lead.CODPARC || "",
        NOMEPARC: lead.NOMEPARC || ""
      })
      // ... (restante do useEffect)
    }
  }, [lead, isOpen])

  // ... (restante das funções)

  const handleSelectParceiro = (parceiro: { CODPARC: number; NOMEPARC: string }) => {
    setFormData(prev => ({
      ...prev,
      CODPARC: String(parceiro.CODPARC),
      NOMEPARC: parceiro.NOMEPARC
    }));
    setIsParceiroSelectorOpen(false);
  };

  if (!lead) return null

  return (
    <>
      {/* ... (restante do JSX do modal principal) */}
      <TabsContent value="dados" className="mt-0 space-y-4">
        <Card>
          <CardHeader>
            {/* ... (cabeçalho do card) */}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ... (outros campos do formulário) */}

              {/* CAMPO PARCEIRO */}
              <div className="space-y-2 md:col-span-2">
                <Label>Parceiro Vinculado</Label>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-muted rounded text-sm min-h-[36px] border">
                      {formData.NOMEPARC || <span className="text-muted-foreground">Nenhum parceiro</span>}
                    </div>
                    <Button variant="outline" onClick={() => setIsParceiroSelectorOpen(true)}>
                      Selecionar
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm p-2 bg-muted rounded">{lead.NOMEPARC || 'Nenhum parceiro vinculado'}</p>
                )}
              </div>
            </div>
            {/* ... (restante do formulário) */}
          </CardContent>
        </Card>
        {/* ... (outros cards de ações, etc.) */}
      </TabsContent>
      {/* ... (outras abas) ... */}
      
      {/* MODAL SELETOR DE PARCEIRO */}
      <ParceiroSelectorModal
        isOpen={isParceiroSelectorOpen}
        onClose={() => setIsParceiroSelectorOpen(false)}
        onConfirm={handleSelectParceiro}
      />
      {/* ... (outros modais) ... */}
    </>
  )
}
