"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Minus, Plus } from "lucide-react"

interface ProdutoEditModalProps {
  isOpen: boolean
  onClose: () => void
  produto: any
  onConfirm?: (produto: any, preco: number, quantidade: number, desconto?: number) => void
  onSave?: (produtoAtualizado: any) => void
  formatCurrency?: (value: number) => string
}

export function ProdutoEditModal({
  isOpen,
  onClose,
  produto,
  onConfirm,
  onSave,
  formatCurrency: formatCurrencyProp
}: ProdutoEditModalProps) {
  const [quantidade, setQuantidade] = useState(1)
  const [vlrUnit, setVlrUnit] = useState(0)
  const [desconto, setDesconto] = useState(0)

  const formatCurrency = formatCurrencyProp || ((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  })

  useEffect(() => {
    if (produto) {
      setQuantidade(Number(produto.QTDNEG) || 1)
      setVlrUnit(Number(produto.VLRUNIT) || 0)
      setDesconto(Number(produto.PERCDESC) || 0)
    }
  }, [produto])

  const calcularSubtotal = () => {
    return vlrUnit * quantidade
  }

  const calcularDesconto = () => {
    return (calcularSubtotal() * desconto) / 100
  }

  const calcularTotal = () => {
    return calcularSubtotal() - calcularDesconto()
  }

  const handleConfirmar = () => {
    const produtoAtualizado = {
      ...produto,
      QTDNEG: quantidade,
      VLRUNIT: vlrUnit,
      PERCDESC: desconto,
      VLRDESC: calcularDesconto(),
      VLRTOT: calcularTotal()
    }

    if (onConfirm) {
      onConfirm(produto, vlrUnit, quantidade, desconto)
    }

    if (onSave) {
      onSave(produtoAtualizado)
    }

    onClose()
  }

  const handleQuantidadeChange = (novaQuantidade: number) => {
    if (novaQuantidade >= 1) {
      setQuantidade(novaQuantidade)
    }
  }

  const handleVlrUnitChange = (valor: string) => {
    const valorNumerico = parseFloat(valor.replace(/[^\d,.-]/g, '').replace(',', '.'))
    if (!isNaN(valorNumerico) && valorNumerico >= 0) {
      setVlrUnit(valorNumerico)
    }
  }

  const handleDescontoChange = (valor: string) => {
    const valorNumerico = parseFloat(valor.replace(/[^\d,.-]/g, '').replace(',', '.'))
    if (!isNaN(valorNumerico) && valorNumerico >= 0 && valorNumerico <= 100) {
      setDesconto(valorNumerico)
    }
  }

  if (!produto) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Produto</Label>
            <Input
              value={produto.DESCRPROD || ''}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Unidade</Label>
            <Input
              value={produto.CODVOL || produto.UNIDADE || 'UN'}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleQuantidadeChange(quantidade - 1)}
                disabled={quantidade <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={quantidade}
                onChange={(e) => handleQuantidadeChange(Number(e.target.value))}
                min={1}
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleQuantidadeChange(quantidade + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor Unitário *</Label>
            <Input
              type="number"
              value={vlrUnit}
              onChange={(e) => handleVlrUnitChange(e.target.value)}
              min={0}
              step={0.01}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Desconto (%)</Label>
            <Input
              type="number"
              value={desconto}
              onChange={(e) => handleDescontoChange(e.target.value)}
              min={0}
              max={100}
              step={0.01}
              placeholder="0"
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(calcularSubtotal())}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto ({desconto}%):</span>
                <span className="font-medium text-orange-600">- {formatCurrency(calcularDesconto())}</span>
              </div>
            )}
            <div className="flex justify-between text-base border-t pt-2">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-green-600">{formatCurrency(calcularTotal())}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} className="bg-green-600 hover:bg-green-700">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
