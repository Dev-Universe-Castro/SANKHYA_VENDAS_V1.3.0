"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Search, Edit, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PoliticaComercial } from "@/lib/politicas-comerciais-service"
import { toast } from "sonner"
import PoliticaComercialModal from "./politica-comercial-modal"
import { OfflineDataService } from "@/lib/offline-data-service";

export default function PoliticasComerciaisView() {
  const [politicas, setPoliticas] = useState<PoliticaComercial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPolitica, setSelectedPolitica] = useState<PoliticaComercial | null>(null)

  useEffect(() => {
    fetchPoliticas()
  }, [])

  const fetchPoliticas = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/politicas')
      if (!response.ok) {
        throw new Error('Falha ao buscar políticas')
      }
      const data = await response.json()
      setPoliticas(data.politicas || [])
    } catch (error) {
      console.warn("⚠️ [OFFLINE] Falha ao carregar políticas da API. Buscando dados locais...", error);
      try {
        const localData = await OfflineDataService.getPoliticasComerciais();
        if (localData && localData.length > 0) {
          setPoliticas(localData);
          toast.info("📱 Visualizando políticas salvas localmente");
        } else {
          toast.error("Erro ao carregar as políticas comerciais.");
        }
      } catch (dbError) {
        console.error("Erro ao carregar dados locais:", dbError);
        toast.error("Erro ao carregar as políticas comerciais.");
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (politica: PoliticaComercial, novoStatus: boolean) => {
    const originalStatus = politica.ATIVO;
    const status = novoStatus ? 'S' : 'N';

    // 1. Atualização Otimista da UI
    setPoliticas(prevPoliticas =>
      prevPoliticas.map(p =>
        p.ID_POLITICA === politica.ID_POLITICA ? { ...p, ATIVO: status } : p
      )
    );

    try {
      // 2. Enviar a alteração para o servidor
      const response = await fetch('/api/politicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...politica, ATIVO: status }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar o status no servidor');
      }

      toast.success(`Status da política "${politica.NOME_POLITICA}" atualizado.`);

      // SYNC LOCAL DB
      console.log('🔄 [Sync] Atualizando status no IndexedDB:', { ...politica, ATIVO: status });
      await OfflineDataService.savePolitica({ ...politica, ATIVO: status });

    } catch (error) {
      // 3. Reverter a UI em caso de erro
      toast.error('Erro ao salvar. A alteração foi desfeita.');
      setPoliticas(prevPoliticas =>
        prevPoliticas.map(p =>
          p.ID_POLITICA === politica.ID_POLITICA ? { ...p, ATIVO: originalStatus } : p
        )
      );
      console.error(error);
    }
  };

  const handleDelete = async (politica: PoliticaComercial) => {
    if (!confirm(`Tem certeza que deseja excluir a política "${politica.NOME_POLITICA}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/politicas?id=${politica.ID_POLITICA}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Falha ao excluir a política')
      }

      toast.success('Política excluída com sucesso!')

      // SYNC LOCAL DB
      console.log('🔄 [Sync] Removendo política do IndexedDB:', politica.ID_POLITICA);
      await OfflineDataService.deletePolitica(politica.ID_POLITICA!);

      setPoliticas(prev => prev.filter(p => p.ID_POLITICA !== politica.ID_POLITICA))
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir política')
    }
  }

  const handleOpenModal = (politica: PoliticaComercial | null) => {
    setSelectedPolitica(politica)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPolitica(null)
  }

  const filteredPoliticas = politicas.filter(p =>
    p.NOME_POLITICA.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.DESCRICAO?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <h3 className="text-xl font-semibold">Nenhuma política comercial encontrada</h3>
      <p className="text-muted-foreground mt-2 mb-4">Comece criando uma nova política para definir suas regras de negócio.</p>
      <Button onClick={() => handleOpenModal(null)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Criar Nova Política
      </Button>
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6 pb-24 md:pb-6 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 sticky top-0 bg-background z-10 py-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white border border-[#F2F2F2] rounded-xl text-sm focus-visible:ring-[#76BA1B]"
          />
        </div>
        <Button className="w-full md:w-auto h-10 font-bold bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md transition-all" onClick={() => handleOpenModal(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          NOVA POLÍTICA
        </Button>
      </div>

      {filteredPoliticas.length === 0 ? renderEmptyState() : (
        <>
          {/* Tabela para Desktop */}
          <div className="hidden md:block border border-[#F2F2F2] rounded-2xl shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-[#F2F2F2] hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-slate-500 uppercase h-11">Nome / Descrição da Política</TableHead>
                  <TableHead className="w-24 text-center text-xs font-bold text-slate-500 uppercase h-11">Status</TableHead>
                  <TableHead className="w-24 text-center text-xs font-bold text-slate-500 uppercase h-11">Prioridade</TableHead>
                  <TableHead className="w-32 text-right text-xs font-bold text-slate-500 uppercase h-11">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPoliticas.map((politica) => (
                  <TableRow key={politica.ID_POLITICA} className="border-b border-[#F2F2F2] hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-3">
                      <div className="font-bold text-sm text-[#1E5128]">{politica.NOME_POLITICA}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{politica.DESCRICAO}</div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {politica.ATIVO === 'S' ? (
                        <div className="flex items-center justify-center gap-1.5 bg-[#76BA1B]/10 text-[#1E5128] px-2 py-1 rounded-md border border-[#76BA1B]/20 w-fit mx-auto">
                          <div className="w-1.5 h-1.5 bg-[#76BA1B] rounded-full"></div>
                          <span className="text-[10px] font-bold uppercase">Ativa</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 bg-red-100 text-red-700 px-2 py-1 rounded-md border border-red-200 w-fit mx-auto">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          <span className="text-[10px] font-bold uppercase">Inat</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-3 font-semibold text-sm text-slate-700">{politica.PRIORIDADE}</TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Switch
                          checked={politica.ATIVO === 'S'}
                          onCheckedChange={(checked) => handleStatusChange(politica, checked)}
                          className="data-[state=checked]:bg-[#76BA1B] mr-2"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#1E5128] hover:bg-slate-100 rounded-lg" onClick={() => handleOpenModal(politica)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => handleDelete(politica)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards para Mobile */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filteredPoliticas.map((politica) => (
              <div key={politica.ID_POLITICA} className="bg-white border border-[#F2F2F2] rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm text-[#1E5128] leading-tight">{politica.NOME_POLITICA}</h3>
                  {politica.ATIVO === 'S' ? (
                    <div className="flex items-center justify-center gap-1.5 bg-[#76BA1B]/10 text-[#1E5128] px-2 py-0.5 rounded-md border border-[#76BA1B]/20 flex-shrink-0 ml-2">
                      <div className="w-1.5 h-1.5 bg-[#76BA1B] rounded-full"></div>
                      <span className="text-[9px] font-bold uppercase">Ativa</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 bg-red-100 text-red-700 px-2 py-0.5 rounded-md border border-red-200 flex-shrink-0 ml-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span className="text-[9px] font-bold uppercase">Inat</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4">{politica.DESCRICAO}</p>
                <div className="flex items-center justify-between pt-3 border-t border-[#F2F2F2]">
                  <div className="text-xs">
                    <span className="text-slate-400 font-medium">Prioridade: </span>
                    <span className="font-bold text-slate-700">{politica.PRIORIDADE}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={politica.ATIVO === 'S'}
                      onCheckedChange={(checked) => handleStatusChange(politica, checked)}
                      className="data-[state=checked]:bg-[#76BA1B] mr-1 scale-90"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#1E5128]" onClick={() => handleOpenModal(politica)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={() => handleDelete(politica)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <PoliticaComercialModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={fetchPoliticas}
        politica={selectedPolitica}
      />
    </div>
  )
}
