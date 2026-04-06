"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface RegraImposto {
  ID_REGRA?: number
  NOME: string
  DESCRICAO?: string
  NOTA_MODELO: number
  CODIGO_EMPRESA: number
  FINALIDADE_OPERACAO: number
  CODIGO_NATUREZA: number
  ATIVO?: string
}

export default function ImpostosManager() {
  const [regras, setRegras] = useState<RegraImposto[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<RegraImposto | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log('🔄 [Impostos] Estado loading alterado:', loading)
  }, [loading])

  const [formData, setFormData] = useState<RegraImposto>({
    NOME: '',
    DESCRICAO: '',
    NOTA_MODELO: 0,
    CODIGO_EMPRESA: 0,
    FINALIDADE_OPERACAO: 0,
    CODIGO_NATUREZA: 0
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      // 1. Carregar do IndexedDB primeiro (IMEDIATO)
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const offline = await OfflineDataService.getRegrasImpostos()

      if (offline && offline.length > 0) {
        console.log('✅ Impostos carregados do IndexedDB:', offline.length)
        setRegras([...offline])
      } else {
        console.log('ℹ️ Nenhum dado offline de impostos encontrado, buscando na API...')
      }

      // 2. Buscar da API removido por solicitação do usuário (centralizar sincronização)
      /*
      const response = await fetch('/api/regras-impostos', {
        cache: 'no-store'
      })
      ...
      */
    } catch (error) {
      console.error('Erro ao carregar regras de impostos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const method = editando ? 'PUT' : 'POST'
      const response = await fetch('/api/regras-impostos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando ? { ...formData, ID_REGRA: editando.ID_REGRA } : formData)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(editando ? 'Regra atualizada' : 'Regra criada')
        setShowModal(false)
        if (data.syncData?.regrasImpostos) {
          const { OfflineDataService } = await import('@/lib/offline-data-service')
          await OfflineDataService.updateRegrasImpostos(data.syncData.regrasImpostos)
        }
        carregarDados()
      }
    } catch (error) {
      toast.error('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletar = async (id: number) => {
    if (!confirm('Deseja desativar esta regra?')) return
    setLoading(true)
    try {
      const response = await fetch(`/api/regras-impostos?idRegra=${id}`, { method: 'DELETE' })
      if (response.ok) {
        const data = await response.json()
        toast.success('Regra desativada')
        if (data.syncData?.regrasImpostos) {
          const { OfflineDataService } = await import('@/lib/offline-data-service')
          await OfflineDataService.updateRegrasImpostos(data.syncData.regrasImpostos)
        }
        carregarDados()
      }
    } catch (error) {
      toast.error('Erro ao deletar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-[#F2F2F2] rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50/50 bg-white/50 pb-4">
          <CardTitle className="text-xl font-semibold text-gray-800">Regras de Impostos</CardTitle>
          <Button onClick={() => { setEditando(null); setFormData({ NOME: '', DESCRICAO: '', NOTA_MODELO: 0, CODIGO_EMPRESA: 0, FINALIDADE_OPERACAO: 0, CODIGO_NATUREZA: 0 }); setShowModal(true); }} size="sm" className="bg-[#76BA1B] hover:bg-[#65A017] text-white rounded-full shadow-sm transition-all px-4">
            <Plus className="w-4 h-4 mr-2" /> Nova Regra
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-hide">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Finalidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((regra) => (
                  <TableRow key={regra.ID_REGRA}>
                    <TableCell>{regra.NOME}</TableCell>
                    <TableCell>{regra.FINALIDADE_OPERACAO}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditando(regra); setFormData(regra); setShowModal(true); }}
                          className="cursor-pointer hover:bg-gray-100 transition-colors relative z-10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletar(regra.ID_REGRA!)}
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
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] sm:rounded-2xl border-[#F2F2F2] p-0 overflow-hidden shadow-xl">
          <DialogHeader className="px-6 py-4 border-b border-[#F2F2F2] bg-white">
            <DialogTitle className="text-lg font-semibold text-gray-800">{editando ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4 bg-gray-50/30">
            <div><Label>Nome</Label><Input value={formData.NOME} onChange={e => setFormData({ ...formData, NOME: e.target.value })} /></div>
            <div><Label>Finalidade Operação</Label><Input type="number" value={formData.FINALIDADE_OPERACAO} onChange={e => setFormData({ ...formData, FINALIDADE_OPERACAO: Number(e.target.value) })} /></div>
            <div><Label>Nota Modelo</Label><Input type="number" value={formData.NOTA_MODELO} onChange={e => setFormData({ ...formData, NOTA_MODELO: Number(e.target.value) })} /></div>
            <div><Label>Código Empresa</Label><Input type="number" value={formData.CODIGO_EMPRESA} onChange={e => setFormData({ ...formData, CODIGO_EMPRESA: Number(e.target.value) })} /></div>
            <div><Label>Natureza</Label><Input type="number" value={formData.CODIGO_NATUREZA} onChange={e => setFormData({ ...formData, CODIGO_NATUREZA: Number(e.target.value) })} /></div>
            <div><Label>Descrição</Label><Textarea value={formData.DESCRICAO} onChange={e => setFormData({ ...formData, DESCRICAO: e.target.value })} /></div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-[#F2F2F2] bg-white">
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-full shadow-sm border-[#F2F2F2] hover:bg-gray-50 text-gray-700">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading} className="rounded-full shadow-sm bg-[#76BA1B] hover:bg-[#65A017] text-white px-6">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
