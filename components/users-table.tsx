"use client"

import { useState, useEffect } from "react"
import { Search, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Plus, Edit, Ban, Unlock, Shield, Users, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { User } from "@/lib/types"
import UserModal from "./user-modal"
import AccessModal from "./access-modal"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner' // Importando toast para feedback
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

export default function UsersTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [isOnline, setIsOnline] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>("Administrador")
  const [vendedoresMap, setVendedoresMap] = useState<Record<number, string>>({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<User | null>(null)

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  useEffect(() => {
    loadUsers()
    loadVendedoresNomes()

    // Status de conexão
    setIsOnline(window.navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    console.log("📊 Estado dos usuários:", {
      totalUsuarios: users.length,
      usuariosFiltrados: filteredUsers.length,
      primeiroUsuario: users.length > 0 ? users[0] : null
    })
  }, [users, filteredUsers])

  useEffect(() => {
    const applyFilters = async () => {
      if (searchTerm.trim() === "") {
        setFilteredUsers(users)
      } else {
        // Buscar do IndexedDB com filtros
        const { OfflineDataService } = await import('@/lib/offline-data-service')
        const usuariosFiltrados = await OfflineDataService.getUsuarios({
          search: searchTerm
        })

        const usuariosMapeados = usuariosFiltrados.map((u: any) => ({
          id: u.CODUSUARIO || u.id,
          name: u.NOME || u.name || '',
          email: u.EMAIL || u.email || '',
          role: u.FUNCAO || u.role || 'Vendedor',
          status: u.STATUS || u.status || 'ativo',
          avatar: u.AVATAR || u.avatar || '',
          password: '',
          codVendedor: u.CODVEND || u.codVendedor || undefined,
          permissions: u.PERMISSOES || u.permissions || {}
        })) as User[]

        setUsers(usuariosMapeados)
        setFilteredUsers(usuariosMapeados)
      }
      // Resetar para primeira página ao filtrar
      setCurrentPage(1)
    }

    applyFilters()
  }, [searchTerm, users])

  // Função para carregar usuários do IndexedDB + Fallback API
  const loadUsers = async () => {
    try {
      setIsLoading(true)

      // 1. Ler do IndexedDB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      let usuariosMapeados: User[] = []

      try {
        const usuariosLocal = await OfflineDataService.getUsuarios()
        if (usuariosLocal && usuariosLocal.length > 0) {
          usuariosMapeados = usuariosLocal.map((u: any) => ({
            id: u.CODUSUARIO || u.id,
            name: u.NOME || u.name || '',
            email: u.EMAIL || u.email || '',
            role: u.FUNCAO || u.role || 'Vendedor',
            status: u.STATUS || u.status || 'ativo',
            avatar: u.AVATAR || u.avatar || '',
            codVendedor: u.CODVEND || u.codVendedor || undefined,
            permissions: u.PERMISSOES || u.permissions || {}
          })) as User[]
          console.log(`✅ ${usuariosMapeados.length} usuários carregados do IndexedDB`)
        }
      } catch (e) {
        console.log('📦 Erro ao ler IndexedDB, pulando para API', e)
      }

      // 2. Fallback: Se não encontrou no DB (ou vazio pq Admin n puxa) -> API HTTP
      if (usuariosMapeados.length === 0) {
        console.log('📦 Buscando usuários diretamente da API...')
        const response = await fetch('/api/usuarios')
        if (response.ok) {
          const dadosDaApi = await response.json()
          usuariosMapeados = dadosDaApi.map((u: any) => ({
            id: u.id || u.CODUSUARIO,
            name: u.name || u.NOME || '',
            email: u.email || u.EMAIL || '',
            role: u.role || u.FUNCAO || 'Vendedor',
            status: u.status || u.STATUS || 'ativo',
            avatar: u.avatar || u.AVATAR || '',
            codVendedor: u.codVendedor || u.CODVEND || undefined,
            permissions: u.permissions || u.PERMISSOES || {}
          })) as User[]
          console.log(`🌐 ${usuariosMapeados.length} usuários carregados da API`)
        }
      }

      setUsers(usuariosMapeados)
      setFilteredUsers(usuariosMapeados)

    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários. Tente novamente.')
      setUsers([])
      setFilteredUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  // Função para carregar nomes de vendedores/gerentes do IndexedDB
  const loadVendedoresNomes = async () => {
    try {
      console.log('🔍 Carregando vendedores do IndexedDB...')

      // Buscar vendedores do IndexedDB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const vendedoresList = await OfflineDataService.getVendedores()

      const map: Record<number, string> = {}

      vendedoresList.forEach((v: any) => {
        map[parseInt(v.CODVEND)] = v.APELIDO
      })

      setVendedoresMap(map)
      console.log(`✅ ${vendedoresList.length} vendedores carregados do IndexedDB`)
    } catch (error) {
      console.error("❌ Erro ao carregar nomes de vendedores:", error)
      toast.error('Erro ao carregar nomes de vendedores.')
    }
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setModalMode("create")
    setIsModalOpen(true)
  }

  const handleEdit = (user: User) => {
    console.log("✏️ INICIANDO EDIÇÃO - ID:", user.id)
    console.log("✏️ Dados recebidos:", {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar
    })

    setIsModalOpen(false)
    setSelectedUser(null)
    setModalMode("edit")

    setTimeout(() => {
      const userToEdit: User = {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "Vendedor",
        status: user.status || "ativo",
        password: user.password || "",
        avatar: user.avatar || "",
        codVendedor: user.codVendedor || undefined,
        permissions: (user as any).permissions || {}
      }

      console.log("✏️ Definindo usuário para edição:", userToEdit)
      setSelectedUser(userToEdit)

      setTimeout(() => {
        console.log("✏️ ABRINDO MODAL com dados completos")
        setIsModalOpen(true)
      }, 50)
    }, 50)
  }

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja inativar este usuário?")) {
      try {
        const response = await fetch('/api/usuarios/deletar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao inativar usuário')
        }

        // Remover do IndexedDB
        const { OfflineDataService } = await import('@/lib/offline-data-service')
        await OfflineDataService.deleteUsuario(id)

        // Recarregar a lista de usuários
        await loadUsers()
        toast.success('Usuário inativado com sucesso!')
      } catch (error) {
        console.error("Error inactivating user:", error)
        toast.error('Erro ao inativar usuário. Tente novamente.')
      }
    }
  }

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch('/api/usuarios/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao aprovar usuário')
      }

      // Atualizar status no IndexedDB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      await OfflineDataService.updateUsuarioStatus(id, "ativo") // Assumindo que aprovar muda o status para 'ativo'

      // Recarregar a lista de usuários
      await loadUsers()
      toast.success('Usuário aprovado com sucesso!')
    } catch (error) {
      console.error("Error approving user:", error)
      toast.error('Erro ao aprovar usuário. Tente novamente.')
    }
  }

  const handleBlock = async (id: number) => {
    if (confirm("Tem certeza que deseja bloquear este usuário?")) {
      try {
        const response = await fetch('/api/usuarios/bloquear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao bloquear usuário')
        }

        // Atualizar status no IndexedDB
        const { OfflineDataService } = await import('@/lib/offline-data-service')
        await OfflineDataService.updateUsuarioStatus(id, "bloqueado") // Assumindo que bloquear muda o status para 'bloqueado'

        // Recarregar a lista de usuários
        await loadUsers()
        toast.success('Usuário bloqueado com sucesso!')
      } catch (error) {
        console.error("Error blocking user:", error)
        toast.error('Erro ao bloquear usuário. Tente novamente.')
      }
    }
  }

  const handleSave = async (userData: Omit<User, "id"> | User) => {
    try {
      const response = await fetch('/api/usuarios/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, mode: modalMode })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar usuário')
      }

      const savedUserData = await response.json() // Assume que a API retorna os dados salvos, incluindo o ID se for criação

      // Atualizar ou adicionar no IndexedDB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      if (modalMode === "create") {
        await OfflineDataService.addUsuario(savedUserData) // Assumindo que o IndexedDB precisa de um método para adicionar
      } else {
        await OfflineDataService.updateUsuario(savedUserData) // Assumindo que o IndexedDB precisa de um método para atualizar
      }

      // Fechar modal
      setIsModalOpen(false)

      // Recarregar usuários para garantir consistência
      await loadUsers()
      toast.success(modalMode === "create" ? 'Usuário criado com sucesso!' : 'Usuário atualizado com sucesso!')

    } catch (error) {
      console.error("Error saving user:", error)
      toast.error(`Erro ao salvar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const getStatusBadge = (status: User["status"]) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-[#76BA1B] hover:bg-[#1E5128] text-white border-0">Ativo</Badge>
      case "pendente":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">Pendente</Badge>
      case "bloqueado":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white border-0">Bloqueado</Badge>
      default:
        return <Badge variant="outline" className="border-[#F2F2F2]">Indefinido</Badge>
    }
  }

  const isAdmin = currentUserRole === "Administrador"

  useEffect(() => {
    console.log("👤 Papel do usuário atual:", currentUserRole)
    console.log("🔑 É administrador?", isAdmin)
  }, [currentUserRole, isAdmin])

  // Helper function to determine if a user is blocked
  const isUserBlocked = (user: User) => user.status === "bloqueado"

  // Combined action for toggling user status (block/unblock)
  const handleToggleStatus = async (user: User) => {
    if (isUserBlocked(user)) {
      // Unblock user
      await handleApprove(user.id) // Assuming approve unblocks
    } else {
      // Block user
      await handleBlock(user.id)
    }
  }

  // Open access modal for a user
  const handleOpenAccess = (user: User) => {
    setSelectedUserForAccess(user)
    setIsAccessModalOpen(true)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Desktop */}
      <div className="hidden md:flex justify-between items-center px-4 md:px-6 py-4 bg-transparent border-b border-[#F2F2F2]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Usuários</h1>
          <p className="text-[#1E5128]/70 mt-1">
            Gerenciamento de usuários do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/usuarios/equipes">
            <Button className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-[#F2F2F2] rounded-xl shadow-sm h-10">
              <Users className="w-4 h-4 mr-2" />
              Equipes
            </Button>
          </Link>
          <Button onClick={handleCreate} className="bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold rounded-xl shadow-md h-10 transition-all">
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b border-[#F2F2F2] px-4 py-4 bg-transparent">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-[#1E5128]">Usuários</h1>
          <div className="flex gap-2">
            <Link href="/dashboard/usuarios/equipes">
              <Button variant="outline" size="sm" className="rounded-xl border-[#F2F2F2] h-9">
                <Users className="w-4 h-4" />
              </Button>
            </Link>
            <Button onClick={handleCreate} size="sm" className="bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold rounded-xl shadow-md h-9">
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>
        </div>
        <p className="text-xs text-[#1E5128]/70">
          Gerenciamento de usuários do sistema
        </p>
      </div>

      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">
            Modo Offline: Os dados exibidos são do cache local.
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="p-4 md:p-6 border-b border-[#F2F2F2]">
        <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos} className="w-full rounded-2xl border border-[#F2F2F2] shadow-sm bg-white overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#1E5128]" />
                <span className="text-sm font-bold text-[#1E5128]">Filtros de Busca</span>
              </div>
              {filtrosAbertos ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 pt-4 border-t border-[#F2F2F2]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Buscar por nome, email ou perfil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="col-span-1 md:col-span-2 bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10"
              />
              {/* Adicionar mais filtros aqui se necessário */}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Lista de Usuários - Mobile (Cards) */}
      <div className="md:hidden flex-1 overflow-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm font-medium text-muted-foreground">Carregando usuários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            {paginatedUsers.map((user) => {
              const getAvatarColor = (name: string) => {
                const colors = [
                  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
                  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80'
                ]
                const index = name.charCodeAt(0) % colors.length
                return colors[index]
              }

              const getInitials = (name: string) => {
                return name
                  .split(' ')
                  .filter(word => word.length > 0)
                  .slice(0, 2)
                  .map(word => word[0])
                  .join('')
                  .toUpperCase()
              }

              const avatarColor = getAvatarColor(user.name || 'U')
              const initials = getInitials(user.name || 'US')

              return (
                <div
                  key={user.id}
                  onClick={() => isAdmin ? handleEdit(user) : null}
                  className={`bg-white border border-[#F2F2F2] rounded-2xl shadow-sm p-4 transition-all ${isAdmin ? 'hover:shadow-md cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-normal text-sm text-foreground truncate">
                        {user.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant={user.role === "Administrador" ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(user.status)}
                    </div>
                    {user.codVendedor && vendedoresMap[user.codVendedor] && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {user.role === 'Gerente' ? 'Gerente:' : 'Vendedor:'}
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {vendedoresMap[user.codVendedor]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Paginação Mobile */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 pt-4 pb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Exibindo {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length}
                  </span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="h-8 w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / página</SelectItem>
                      <SelectItem value="20">20 / página</SelectItem>
                      <SelectItem value="50">50 / página</SelectItem>
                      <SelectItem value="100">100 / página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                    </PaginationItem>

                    <PaginationItem>
                      <span className="text-sm text-muted-foreground px-3">
                        Página {currentPage} de {totalPages}
                      </span>
                    </PaginationItem>

                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Próximo
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tabela de Usuários - Desktop */}
      <div className="hidden md:block flex-1 overflow-auto p-4 md:p-6 mt-0">
        <div className="rounded-2xl border border-[#F2F2F2] shadow-sm bg-white overflow-hidden">
          <Table className="w-full table-fixed md:table-auto">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-[#F2F2F2] hover:bg-transparent">
                <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11 w-[60px]">ID</TableHead>
                <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11 w-auto">Nome</TableHead>
                <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11 w-auto">Email</TableHead>
                <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11 w-[120px]">Função</TableHead>
                <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11 w-auto">Vendedor/Gerente</TableHead>
                <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11 w-[100px]">Status</TableHead>
                {isAdmin && (
                  <TableHead className="text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-11 w-[320px]">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                      <p className="text-sm font-medium text-muted-foreground">Carregando usuários...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50 transition-colors border-b border-[#F2F2F2]">
                    <TableCell className="font-mono text-xs md:text-sm text-slate-500">{user.id}</TableCell>
                    <TableCell className="text-sm md:text-base text-slate-800 font-normal truncate max-w-[200px]">{user.name}</TableCell>
                    <TableCell className="text-slate-500 truncate max-w-[250px]">{user.email}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border",
                          user.role === "Administrador" && "bg-purple-50 text-purple-700 border-purple-200",
                          user.role === "Gerente" && "bg-blue-50 text-blue-700 border-blue-200",
                          user.role === "Vendedor" && "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.codVendedor && vendedoresMap[user.codVendedor]
                        ? vendedoresMap[user.codVendedor]
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{getStatusBadge(user.status)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3 flex-nowrap py-1">
                          {user.status === "pendente" ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(user.id)}
                                className="bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold rounded-xl shadow-md h-9 px-4 active:scale-95 transition-all"
                              >
                                <Check className="w-4 h-4 mr-1.5" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleBlock(user.id)}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md h-9 px-4 active:scale-95 transition-all"
                              >
                                <X className="w-4 h-4 mr-1.5" />
                                Bloquear
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(user)}
                                className="bg-white hover:bg-slate-50 hover:text-[#76BA1B] text-slate-700 font-bold border-[#F2F2F2] rounded-xl h-9 px-3 active:scale-95 transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAccess(user)}
                                className="bg-white hover:bg-slate-50 hover:text-[#76BA1B] text-[#1E5128] font-bold border-[#F2F2F2] rounded-xl h-9 px-3 active:scale-95 transition-all"
                              >
                                <Shield className="w-3.5 h-3.5 mr-1.5" />
                                Acessos
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(user)}
                                className={cn(
                                  "bg-white hover:bg-slate-50 border-[#F2F2F2] font-bold rounded-xl h-9 px-3 active:scale-95 transition-all",
                                  isUserBlocked(user) ? "text-slate-500 hover:text-slate-800" : "text-red-500 hover:text-red-700 hover:bg-red-50"
                                )}
                              >
                                {isUserBlocked(user) ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 mr-1.5" />
                                    Desbloq.
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3.5 h-3.5 mr-1.5" />
                                    Bloquear
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação Desktop */}
        {!isLoading && filteredUsers.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Exibindo {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length} usuários
              </p>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value))
                setCurrentPage(1)
              }}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={cn(
                      "cursor-pointer",
                      currentPage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>

                {/* Renderizar números de página */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNumber)}
                        isActive={currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={cn(
                      "cursor-pointer",
                      currentPage === totalPages && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {isAdmin && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          user={selectedUser}
          mode={modalMode}
        />
      )}

      {/* Modal de Acessos */}
      {isAdmin && (
        <AccessModal
          isOpen={isAccessModalOpen}
          onClose={() => {
            setIsAccessModalOpen(false)
            setSelectedUserForAccess(null)
          }}
          user={selectedUserForAccess}
        />
      )}
    </div>
  )
}