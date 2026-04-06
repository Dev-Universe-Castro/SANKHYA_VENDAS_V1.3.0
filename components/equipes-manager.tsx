"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Users, Shield, UserCircle, Edit, Trash2, Check, X, ChevronRight, LayoutGrid, List, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Equipe {
    CODEQUIPE: number
    NOME: string
    DESCRICAO: string
    CODUSUARIO_GESTOR: number
    NOME_GESTOR?: string
    ATIVO: string
    DATA_CRIACAO?: string
    TOTAL_MEMBROS?: number
}

interface Membro {
    CODMEMBRO?: number
    CODUSUARIO: number
    NOME: string
    EMAIL?: string
    ATIVO: string
}

export default function EquipesManager() {
    const [equipes, setEquipes] = useState<Equipe[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [selectedEquipe, setSelectedEquipe] = useState<Equipe | null>(null)

    // Form states
    const [formNome, setFormNome] = useState("")
    const [formDescricao, setFormDescricao] = useState("")
    const [formGestor, setFormGestor] = useState<number | null>(null)
    const [formMembros, setFormMembros] = useState<number[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // Selection helpers
    const [availableUsers, setAvailableUsers] = useState<any[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)

    useEffect(() => {
        loadEquipes()
        loadAvailableUsers()
    }, [])

    const loadEquipes = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/equipes')
            if (!response.ok) throw new Error('Erro ao carregar equipes')
            const data = await response.json()
            setEquipes(data.equipes || [])
        } catch (error) {
            console.error(error)
            toast.error("Não foi possível carregar as equipes")
        } finally {
            setLoading(false)
        }
    }

    const loadAvailableUsers = async () => {
        setLoadingUsers(true)
        try {
            const { OfflineDataService } = await import('@/lib/offline-data-service')
            const users = await OfflineDataService.getUsuarios()

            // Map uppercase fields from DB to lowercase expected by component
            // Support both uppercase (DB schema) and lowercase (API/Prefetch)
            const mappedUsers = (users || []).map((u: any) => ({
                id: u.id || u.CODUSUARIO,
                name: u.name || u.NOME,
                role: u.role || u.FUNCAO || 'Vendedor'
            }))

            setAvailableUsers(mappedUsers)
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingUsers(false)
        }
    }

    const handleOpenCreate = () => {
        setModalMode('create')
        setSelectedEquipe(null)
        setFormNome("")
        setFormDescricao("")
        setFormGestor(null)
        setFormMembros([])
        setIsModalOpen(true)
    }

    const handleOpenEdit = async (equipe: Equipe) => {
        setModalMode('edit')
        setSelectedEquipe(equipe)
        setFormNome(equipe.NOME)
        setFormDescricao(equipe.DESCRICAO || "")
        setFormGestor(equipe.CODUSUARIO_GESTOR)

        setIsModalOpen(true)

        // Load members for this equipe
        try {
            const response = await fetch(`/api/equipes?codEquipe=${equipe.CODEQUIPE}`)
            if (response.ok) {
                const data = await response.json()
                const membrosIds = (data.membros || []).map((m: any) => m.CODUSUARIO)
                setFormMembros(membrosIds)
            }
        } catch (error) {
            console.error("Erro ao carregar membros:", error)
        }
    }

    const handleSave = async () => {
        if (!formNome) return toast.error("O nome da equipe é obrigatório")

        setIsSaving(true)
        try {
            const method = modalMode === 'create' ? 'POST' : 'PUT'
            const payload = {
                codEquipe: selectedEquipe?.CODEQUIPE,
                nome: formNome,
                descricao: formDescricao,
                codUsuarioGestor: formGestor,
                membros: formMembros,
                ativo: 'S'
            }

            const response = await fetch('/api/equipes', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Erro ao salvar equipe')
            }

            toast.success(modalMode === 'create' ? "Equipe criada com sucesso!" : "Equipe atualizada!")
            setIsModalOpen(false)
            loadEquipes()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (equipe: Equipe) => {
        if (!confirm(`Deseja realmente desativar a equipe "${equipe.NOME}"?`)) return

        try {
            const response = await fetch(`/api/equipes?codEquipe=${equipe.CODEQUIPE}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Erro ao desativar equipe')

            toast.success("Equipe desativada")
            loadEquipes()
        } catch (error) {
            toast.error("Erro ao excluir equipe")
        }
    }

    const filteredEquipes = equipes.filter(e =>
        e.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.NOME_GESTOR?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleMembro = (codUsuario: number) => {
        setFormMembros(prev =>
            prev.includes(codUsuario)
                ? prev.filter(id => id !== codUsuario)
                : [...prev, codUsuario]
        )
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header com Ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent p-0">
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nome ou gestor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-[#76BA1B]/20"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 mr-2">
                        <Button
                            variant={viewMode === 'grid' ? 'outline' : 'ghost'}
                            size="icon"
                            className={cn("h-9 w-9 rounded-lg", viewMode === 'grid' && "shadow-sm bg-white")}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'outline' : 'ghost'}
                            size="icon"
                            className={cn("h-9 w-9 rounded-lg", viewMode === 'list' && "shadow-sm bg-white")}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="w-4 h-4 text-slate-600" />
                        </Button>
                    </div>

                    <Button
                        onClick={handleOpenCreate}
                        className="bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl h-11 px-6 shadow-lg shadow-[#76BA1B]/20 font-bold gap-2 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Nova Equipe
                    </Button>
                </div>
            </div>

            {/* Listagem */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="rounded-2xl border-slate-100 bg-white animate-pulse">
                            <div className="h-48 bg-slate-50 rounded-2xl" />
                        </Card>
                    ))}
                </div>
            ) : filteredEquipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                    <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-full mb-4">
                        <Users className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Nenhuma equipe encontrada</h3>
                    <p className="text-slate-500 max-w-xs text-center mt-2">
                        Crie sua primeira equipe comercial para começar a gerenciar acessos e metas.
                    </p>
                    <Button
                        variant="outline"
                        onClick={handleOpenCreate}
                        className="mt-6 rounded-xl border-slate-200"
                    >
                        Criar Agora
                    </Button>
                </div>
            ) : (
                <div className={cn(
                    viewMode === 'grid'
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        : "flex flex-col gap-3"
                )}>
                    {filteredEquipes.map((equipe) => (
                        <Card key={equipe.CODEQUIPE} className={cn(
                            "group rounded-2xl border-slate-100 bg-white hover:border-[#76BA1B]/30 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden",
                            viewMode === 'list' && "flex items-center"
                        )}>
                            <div className={cn(
                                "relative",
                                viewMode === 'list' ? "w-16 h-16 flex items-center justify-center shrink-0" : "p-6"
                            )}>
                                <div className={cn(
                                    "flex items-center justify-between mb-4",
                                    viewMode === 'list' && "mb-0"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#1E5128]">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        {viewMode === 'grid' && (
                                            <div>
                                                <h3 className="font-bold text-slate-800 group-hover:text-[#1E5128] transition-colors">{equipe.NOME}</h3>
                                                <p className="text-xs text-slate-400 font-medium">Equipe #{equipe.CODEQUIPE}</p>
                                            </div>
                                        )}
                                    </div>
                                    {viewMode === 'grid' && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenEdit(equipe)}>
                                                <Edit className="w-4 h-4 text-slate-400" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:text-red-500" onClick={() => handleDelete(equipe)}>
                                                <Trash2 className="w-4 h-4 text-slate-400" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {viewMode === 'grid' && (
                                    <>
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-6 h-10">
                                            {equipe.DESCRICAO || "Sem descrição disponível para esta equipe comercial."}
                                        </p>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-amber-500" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestor</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{equipe.NOME_GESTOR || "Não definido"}</span>
                                            </div>

                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex -space-x-2 overflow-hidden">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200" />
                                                    ))}
                                                    {equipe.TOTAL_MEMBROS && equipe.TOTAL_MEMBROS > 3 && (
                                                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                            +{equipe.TOTAL_MEMBROS - 3}
                                                        </div>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="bg-emerald-50 text-[#1E5128] border-none font-black text-[10px]">
                                                    {equipe.TOTAL_MEMBROS || 0} MEMBROS
                                                </Badge>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {viewMode === 'list' && (
                                <div className="flex-1 flex items-center justify-between p-4 pl-0">
                                    <div className="grid grid-cols-3 flex-1 gap-4">
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-slate-800">{equipe.NOME}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Equipe #{equipe.CODEQUIPE}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UserCircle className="w-4 h-4 text-slate-300" />
                                            <span className="text-sm text-slate-600 font-medium">{equipe.NOME_GESTOR || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-slate-300" />
                                            <span className="text-sm text-slate-600 font-medium">{equipe.TOTAL_MEMBROS || 0} Membros</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleOpenEdit(equipe)}>
                                            <Edit className="w-4 h-4 text-slate-400" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:text-red-500" onClick={() => handleDelete(equipe)}>
                                            <Trash2 className="w-4 h-4 text-slate-400" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                            <ChevronRight className="w-4 h-4 text-slate-300" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-[#F2F2F2] rounded-2xl shadow-xl bg-white">
                    <DialogHeader className="px-8 py-6 border-b border-[#F2F2F2] bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#76BA1B]/10 rounded-xl flex items-center justify-center text-[#1E5128]">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight text-[#1E5128]">
                                    {modalMode === 'create' ? "Nova Equipe" : "Editar Equipe"}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-slate-500 font-medium">
                                    {modalMode === 'create' ? "Cadastre uma nova equipe comercial" : "Altere as configurações da equipe"}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar bg-slate-50/20">
                        {/* Dados Básicos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="nome" className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Nome da Equipe *</Label>
                                <Input
                                    id="nome"
                                    placeholder="Ex: Equipe Norte"
                                    value={formNome}
                                    onChange={e => setFormNome(e.target.value)}
                                    className="h-11 border-slate-200 rounded-xl focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] text-slate-700 font-semibold bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gestor" className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Usuário Gestor</Label>
                                <select
                                    id="gestor"
                                    value={formGestor || ""}
                                    onChange={e => setFormGestor(Number(e.target.value) || null)}
                                    className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#76BA1B]/20 transition-all"
                                >
                                    <option value="">Selecione um gestor</option>
                                    {availableUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descr" className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Descrição</Label>
                            <textarea
                                id="descr"
                                rows={2}
                                placeholder="Propósito da equipe..."
                                value={formDescricao}
                                onChange={e => setFormDescricao(e.target.value)}
                                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] text-slate-700 font-medium resize-none bg-white min-h-[80px]"
                            />
                        </div>

                        <Separator className="bg-slate-100" />

                        {/* Membros */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[#76BA1B]" />
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Membros da Equipe</Label>
                                </div>
                                <Badge variant="secondary" className="bg-[#76BA1B]/10 text-[#1E5128] border-none font-bold text-[10px]">
                                    {formMembros.length} SELECIONADOS
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar p-1">
                                {availableUsers.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => toggleMembro(u.id)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                                            formMembros.includes(u.id)
                                                ? "bg-emerald-50 border-[#76BA1B] shadow-sm"
                                                : "bg-white border-slate-100 hover:border-slate-300 shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
                                                formMembros.includes(u.id) ? "bg-[#76BA1B] text-white" : "bg-slate-100 text-slate-400"
                                            )}>
                                                {u.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-slate-700 truncate">{u.name}</span>
                                                <span className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-tight">{u.role}</span>
                                            </div>
                                        </div>
                                        {formMembros.includes(u.id) && (
                                            <div className="w-5 h-5 bg-[#76BA1B] rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-8 py-5 bg-white border-t border-[#F2F2F2] flex items-center justify-between sm:justify-between w-full">
                        <Button
                            variant="ghost"
                            onClick={() => setIsModalOpen(false)}
                            className="h-11 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-11 px-10 rounded-xl font-bold bg-[#76BA1B] hover:bg-[#1E5128] text-white shadow-md shadow-[#76BA1B]/20 transition-all active:scale-95"
                        >
                            {isSaving ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>SALVANDO...</span>
                                </div>
                            ) : (
                                "Salvar Equipe"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
