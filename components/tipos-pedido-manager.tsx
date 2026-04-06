
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Check, X } from "lucide-react"
import { toast } from "sonner"

interface TipoPedido {
  CODTIPOPEDIDO?: number
  NOME: string
  DESCRICAO?: string
  CODTIPOPER: number
  MODELO_NOTA: number
  TIPMOV: string
  CODTIPVENDA: number
  COR?: string
  ATIVO?: string
}

export default function TiposPedidoManager() {
  const [tiposPedido, setTiposPedido] = useState<TipoPedido[]>([])
  const [tiposOperacao, setTiposOperacao] = useState<any[]>([])
  const [tiposNegociacao, setTiposNegociacao] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<TipoPedido | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log('🔄 [TiposPedido] Estado loading alterado:', loading)
  }, [loading])

  const [formData, setFormData] = useState<TipoPedido>({
    NOME: '',
    DESCRICAO: '',
    CODTIPOPER: 0,
    MODELO_NOTA: 0,
    TIPMOV: 'P',
    CODTIPVENDA: 0,
    COR: '#3b82f6'
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      // Carregar do IndexedDB primeiro
      const { OfflineDataService } = await import('@/lib/offline-data-service')

      const [tiposOffline, tiposOpOffline, tiposNegOffline] = await Promise.all([
        OfflineDataService.getTiposPedido(),
        OfflineDataService.getTiposOperacao(),
        OfflineDataService.getTiposNegociacao()
      ])

      setTiposPedido(tiposOffline)
      setTiposOperacao(tiposOpOffline)
      setTiposNegociacao(tiposNegOffline)

      console.log('✅ Dados carregados do IndexedDB:', {
        tiposPedido: tiposOffline.length,
        tiposOperacao: tiposOpOffline.length,
        tiposNegociacao: tiposNegOffline.length
      })

    } catch (error) {
      console.error('❌ Erro ao carregar dados do IndexedDB:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const abrirModalNovo = () => {
    setFormData({
      NOME: '',
      DESCRICAO: '',
      CODTIPOPER: 0,
      MODELO_NOTA: 0,
      TIPMOV: 'P',
      CODTIPVENDA: 0,
      COR: '#3b82f6'
    })
    setEditando(null)
    setShowModal(true)
  }

  const abrirModalEditar = (tipo: TipoPedido) => {
    console.log('🔍 Abrindo modal para editar tipo:', tipo)
    setFormData({ ...tipo })
    setEditando(tipo)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formData.NOME || formData.NOME.trim() === '') {
      toast.error('Nome é obrigatório')
      return
    }

    if (!formData.CODTIPOPER || formData.CODTIPOPER === 0) {
      toast.error('Tipo de Operação é obrigatório')
      return
    }

    if (!formData.MODELO_NOTA || formData.MODELO_NOTA === 0) {
      toast.error('Modelo da Nota é obrigatório')
      return
    }

    if (!formData.CODTIPVENDA || formData.CODTIPVENDA === 0) {
      toast.error('Condição Comercial é obrigatória')
      return
    }

    setLoading(true)
    try {
      const url = '/api/tipos-pedido'
      const method = editando ? 'PUT' : 'POST'

      const payload = editando
        ? { ...formData, CODTIPOPEDIDO: editando.CODTIPOPEDIDO }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(editando ? 'Tipo atualizado com sucesso' : 'Tipo criado com sucesso')
        setShowModal(false)
        if (data.syncData?.tiposPedido) {
          const { OfflineDataService } = await import('@/lib/offline-data-service')
          await OfflineDataService.updateTiposPedido(data.syncData.tiposPedido)
        }

        carregarDados()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar tipo')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar tipo de pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletar = async (codTipoPedido: number) => {
    console.log('🗑️ Tentando deletar tipo de pedido:', codTipoPedido)

    if (!confirm('Deseja realmente desativar este tipo de pedido?')) {
      console.log('❌ Deleção cancelada pelo usuário')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tipos-pedido?codTipoPedido=${codTipoPedido}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Tipo desativado com sucesso')
        if (data.syncData?.tiposPedido) {
          const { OfflineDataService } = await import('@/lib/offline-data-service')
          await OfflineDataService.updateTiposPedido(data.syncData.tiposPedido)
        }

        carregarDados()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao desativar tipo')
      }
    } catch (error) {
      console.error('Erro ao deletar:', error)
      toast.error('Erro ao desativar tipo de pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-[#F2F2F2] rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50/50 bg-white/50 pb-4">
          <CardTitle className="text-xl font-semibold text-gray-800">Tipos de Pedido</CardTitle>
          <Button onClick={abrirModalNovo} size="sm" className="bg-[#76BA1B] hover:bg-[#65A017] text-white rounded-full shadow-sm transition-all px-4">
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo
          </Button>
        </CardHeader>
        <CardContent>
          {loading && tiposPedido.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : tiposPedido.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum tipo de pedido cadastrado
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {tiposPedido.map((tipo) => (
                  <div key={tipo.CODTIPOPEDIDO} className="p-4 border border-[#F2F2F2] rounded-2xl bg-white shadow-sm space-y-3 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tipo.COR }}
                        />
                        <span className="font-bold text-sm text-gray-900">{tipo.NOME}</span>
                      </div>
                      <Badge variant={tipo.TIPMOV === 'P' ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-5">
                        {tipo.TIPMOV === 'P' ? 'Pedido' : 'Venda'}
                      </Badge>
                    </div>
                    {tipo.DESCRICAO && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{tipo.DESCRICAO}</p>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => abrirModalEditar(tipo)}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                        onClick={() => handleDeletar(tipo.CODTIPOPEDIDO!)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Desativar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo Mov.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiposPedido.map((tipo) => (
                      <TableRow key={tipo.CODTIPOPEDIDO}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tipo.COR }}
                            />
                            {tipo.NOME}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tipo.DESCRICAO || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tipo.TIPMOV === 'P' ? 'default' : 'secondary'}>
                            {tipo.TIPMOV === 'P' ? 'Pedido' : 'Venda'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirModalEditar(tipo)}
                              className="cursor-pointer hover:bg-gray-100 transition-colors relative z-10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletar(tipo.CODTIPOPEDIDO!)}
                              className="cursor-pointer hover:bg-red-50 transition-colors relative z-10"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl sm:rounded-2xl border-[#F2F2F2] p-0 overflow-hidden shadow-xl">
          <DialogHeader className="px-6 py-4 border-b border-[#F2F2F2] bg-white">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editando ? 'Editar Tipo de Pedido' : 'Novo Tipo de Pedido'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4 bg-gray-50/30">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.NOME}
                  onChange={(e) => setFormData({ ...formData, NOME: e.target.value })}
                  placeholder="Ex: Venda Padrão"
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={formData.COR}
                  onChange={(e) => setFormData({ ...formData, COR: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.DESCRICAO}
                onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
                placeholder="Descrição do tipo de pedido..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Operação *</Label>
                <Select
                  value={String(formData.CODTIPOPER)}
                  onValueChange={(value) => setFormData({ ...formData, CODTIPOPER: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposOperacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPOPER} value={String(tipo.CODTIPOPER)}>
                        {tipo.CODTIPOPER} - {tipo.DESCROPER}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo da Nota *</Label>
                <Input
                  type="number"
                  value={formData.MODELO_NOTA || ''}
                  onChange={(e) => setFormData({ ...formData, MODELO_NOTA: Number(e.target.value) })}
                  placeholder="Ex: 55"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Movimento *</Label>
                <Select
                  value={formData.TIPMOV}
                  onValueChange={(value) => setFormData({ ...formData, TIPMOV: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">Pedido</SelectItem>
                    <SelectItem value="V">Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condição Comercial *</Label>
                <Select
                  value={String(formData.CODTIPVENDA)}
                  onValueChange={(value) => setFormData({ ...formData, CODTIPVENDA: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposNegociacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPVENDA} value={String(tipo.CODTIPVENDA)}>
                        {tipo.DESCRTIPVENDA}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-[#F2F2F2] bg-white">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={loading} className="rounded-full shadow-sm border-[#F2F2F2] hover:bg-gray-50 text-gray-700">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="rounded-full shadow-sm bg-[#76BA1B] hover:bg-[#65A017] text-white px-6">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
