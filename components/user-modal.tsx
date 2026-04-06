"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import type { User } from "@/lib/users-service"
import VendedorSelectorModal from "./vendedor-selector-modal"
import { useToast } from "@/components/ui/use-toast"
import { authService } from "@/lib/auth-service" // Assuming authService is available

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: Omit<User, "id"> | User) => void
  user?: User | null
  mode: "create" | "edit"
}

interface Funil {
  CODFUNIL: string
  NOME: string
  DESCRICAO: string
  COR: string
}

export default function UserModal({ isOpen, onClose, onSave, user, mode }: UserModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Vendedor",
    status: "ativo" as "ativo" | "pendente" | "bloqueado",
    password: "",
    avatar: "",
  })
  const [isInitializing, setIsInitializing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [funis, setFunis] = useState<Funil[]>([])
  const [selectedFunis, setSelectedFunis] = useState<string[]>([])
  const [isLoadingFunis, setIsLoadingFunis] = useState(false)
  const [showVendedorModal, setShowVendedorModal] = useState(false)
  const [vendedorTipo, setVendedorTipo] = useState<'gerente' | 'vendedor'>('gerente')
  const [codVendedor, setCodVendedor] = useState<number | undefined>(undefined)
  const [nomeVendedor, setNomeVendedor] = useState<string>("")
  const [empresas, setEmpresas] = useState<any[]>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("")
  const [isLoadingEmpresas, setIsLoadingEmpresas] = useState(false)

  // State for creating a new vendor directly from the modal
  const [newVendedorName, setNewVendedorName] = useState("")
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isCreating, setIsCreating] = useState(false) // Separate state for the actual creation process

  // Dummy state for setIsFunisModalOpen as it's used in the changes but not defined in original
  const [isFunisModalOpen, setIsFunisModalOpen] = useState(false)

  useEffect(() => {
    console.log("🔍 Modal useEffect disparado:", { isOpen, hasUser: !!user, mode })

    if (!isOpen) {
      // Limpar formulário quando o modal fechar
      setFormData({
        name: "",
        email: "",
        role: "Vendedor",
        status: "ativo",
        password: "",
        avatar: "",
      })
      setSelectedFunis([])
      setIsInitializing(false)
      setNewVendedorName("") // Reset new vendor name
      setIsCreatingNew(false) // Reset create new flag
      setCodVendedor(undefined)
      setNomeVendedor("")
      setSelectedEmpresa("")
      return
    }

    setIsInitializing(true)

    if (mode === "edit" && user) {
      console.log("📋 Modal EDIÇÃO - Carregando dados do usuário ID:", user.id)
      console.log("📋 Dados COMPLETOS recebidos:", {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar
      })

      // Garantir que todos os campos sejam preenchidos, incluindo avatar
      const newFormData = {
        name: user.name || "",
        email: user.email || "",
        role: user.role || "Vendedor",
        status: (user.status as "ativo" | "pendente" | "bloqueado") || "ativo",
        password: "",
        avatar: user.avatar || "",
        idEmpresa: (user as any).ID_EMPRESA || (user as any).idEmpresa || (user as any).id_empresa || "",
        codEmp: user.codEmp || (user as any).CODEMP || (user as any).cod_emp || "",
      }

      console.log("📝 FormData preparado:", newFormData)

      // Usar requestAnimationFrame para garantir que o estado seja atualizado após o render
      requestAnimationFrame(() => {
        setFormData(newFormData)
        setIsInitializing(false)
        console.log("✅ Modal inicializado com dados:", newFormData)
      })

      // Carregar permissões de funis
      loadFunisPermissoes(user.id)

      // Carregar dados do vendedor/gerente se existir
      if (user.codVendedor) {
        console.log("📍 Carregando vendedor vinculado:", user.codVendedor)
        setCodVendedor(user.codVendedor)
        loadVendedorNome(user.codVendedor)
      } else {
        console.log("⚠️ Usuário sem codVendedor vinculado")
        setCodVendedor(undefined)
        setNomeVendedor("")
      }

    } else if (mode === "create") {
      console.log("📝 Modal CRIAÇÃO - Novo usuário")

      requestAnimationFrame(() => {
        setFormData({
          name: "",
          email: "",
          role: "Vendedor",
          status: "ativo",
          password: "",
          avatar: "",
        })
        setSelectedEmpresa("")
        setIsInitializing(false)
      })
    }

    // Carregar lista de funis disponíveis
    loadFunis()

    // Carregar empresas do IndexedDB
    loadEmpresas()

  }, [isOpen, user, mode])

  const loadFunis = async () => {
    setIsLoadingFunis(true)
    try {
      // Corrigido para chamar a rota correta que retorna todos os funis
      const response = await fetch('/api/funis')
      if (response.ok) {
        const data = await response.json()
        setFunis(data)
      } else {
        console.error("Erro ao carregar funis:", response.status, await response.text())
      }
    } catch (error) {
      console.error("Erro ao carregar funis:", error)
    } finally {
      setIsLoadingFunis(false)
    }
  }

  const loadEmpresas = async () => {
    setIsLoadingEmpresas(true)
    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const empresasOffline = await OfflineDataService.getEmpresas()

      if (empresasOffline && empresasOffline.length > 0) {
        setEmpresas(empresasOffline)

        // Se estiver editando, garantir que o valor preencha
        if (mode === 'edit' && user) {
          const empId = user.codEmp || (user as any).CODEMP || (user as any).cod_emp
          if (empId) {
            setSelectedEmpresa(String(empId))
          }
        }
      } else {
        // Fallback or dev mode
        setEmpresas([{
          CODEMP: 1,
          NOMEFANTASIA: 'Empresa Teste Dev',
        }])
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error)
    } finally {
      setIsLoadingEmpresas(false)
    }
  }

  const loadFunisPermissoes = async (userId: number) => {
    try {
      const response = await fetch(`/api/funis/permissoes?codUsuario=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedFunis(data.funisPermitidos || [])
      } else {
        console.error("Erro ao carregar permissões de funis:", response.status, await response.text())
      }
    } catch (error) {
      console.error("Erro ao carregar permissões de funis:", error)
    }
  }

  const loadVendedorNome = async (codVend: number) => {
    try {
      console.log("🔍 Buscando nome do vendedor/gerente com código:", codVend)

      // Buscar do IndexedDB
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const vendedores = await OfflineDataService.getVendedores()

      const vendedor = vendedores.find((v: any) => parseInt(v.CODVEND) === codVend)
      if (vendedor) {
        console.log("✅ Vendedor/Gerente encontrado:", vendedor.APELIDO)
        setNomeVendedor(vendedor.APELIDO)
        return
      }

      console.log("⚠️ Vendedor/Gerente não encontrado com código:", codVend)
      setNomeVendedor("")
    } catch (error) {
      console.error("❌ Erro ao carregar nome do vendedor:", error)
      setNomeVendedor("")
    }
  }

  const handleFunilToggle = (codFunil: string) => {
    setSelectedFunis(prev => {
      if (prev.includes(codFunil)) {
        return prev.filter(f => f !== codFunil)
      } else {
        return [...prev, codFunil]
      }
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // New function for creating a vendor, called from the new create form.
  const handleCreateVendedor = async () => {
    if (!newVendedorName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do vendedor é obrigatório",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      console.log("🔄 Iniciando criação de vendedor:", newVendedorName);

      const response = await fetch('/api/vendedores/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: newVendedorName.trim()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Erro na resposta:", errorData);
        throw new Error(errorData.error || 'Erro ao criar vendedor')
      }

      const data = await response.json()
      console.log("✅ Vendedor criado:", data);

      // Atualizar o codVendedor do usuário atual com o novo vendedor criado
      setCodVendedor(data.codVendedor)
      setNomeVendedor(data.nome)

      toast({
        title: "Sucesso",
        description: `${formData.role} ${data.nome} criado com código ${data.codVendedor}`,
      })

      // Resetar apenas o formulário de criação, mantendo o modal aberto
      setNewVendedorName("")
      setIsCreatingNew(false)
    } catch (error: any) {
      console.error("❌ Erro ao criar vendedor:", error);

      // Extrair mensagem de erro mais legível
      let errorMessage = error.message || "Erro ao criar vendedor";

      // Tratar erros específicos da API
      if (errorMessage.includes("largura acima do limite")) {
        errorMessage = "Nome muito longo. Use no máximo 15 caracteres.";
      }

      toast({
        title: "Erro ao criar",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Obter ID_EMPRESA do usuário logado
      const userStr = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1];

      let idEmpresaLogado = undefined;
      let codEmp = selectedEmpresa; // O `selectedEmpresa` agora armazena CODEMP

      // Pegar do logado
      if (userStr) {
        try {
          // Tentar decodificar o cookie
          let decodedStr = decodeURIComponent(userStr);

          // Se ainda tiver problemas, tentar localStorage como fallback
          let user;
          try {
            user = JSON.parse(decodedStr);
          } catch (parseError) {
            console.warn('⚠️ Erro ao fazer parse do cookie, tentando localStorage...', parseError);

            // Tentar obter do localStorage
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
              user = JSON.parse(storedUser);
              console.log('✅ Dados obtidos do localStorage como fallback');
            } else {
              throw new Error('Não foi possível obter dados do usuário');
            }
          }

          idEmpresaLogado = user.ID_EMPRESA || user.id_empresa;
        } catch (error) {
          console.error('❌ Erro ao obter dados do usuário:', error);
          toast({
            title: "Erro de sessão",
            description: "Por favor, faça login novamente",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }

      const dataToSave: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        avatar: formData.avatar || '',
        codVendedor: codVendedor || null, // Garantir null ao invés de undefined
        codEmp: codEmp ? Number(codEmp) : null,
        idEmpresa: idEmpresaLogado || 1
      }

      // Validar vínculo obrigatório apenas para Gerente e Vendedor (não para Administrador)
      if ((formData.role === 'Gerente' || formData.role === 'Vendedor') && !codVendedor) {
        toast({
          title: "Vínculo Obrigatório",
          description: `É obrigatório vincular a um ${formData.role === 'Gerente' ? 'gerente' : 'vendedor'}`,
          variant: "destructive",
        })
        setIsSaving(false)
        return
      }

      // Incluir senha apenas se fornecida e não vazia
      if (formData.password && formData.password.trim() !== '') {
        dataToSave.password = formData.password
      } else if (mode === "create") {
        // No modo de criação, senha é obrigatória
        alert("Senha é obrigatória para criar um novo usuário")
        setIsSaving(false)
        return
      }

      console.log("📤 Enviando dados do usuário:", {
        ...dataToSave,
        password: dataToSave.password ? '***' : undefined
      })

      if (mode === "edit" && user) {
        await onSave({ ...user, ...dataToSave })

        // Salvar permissões de funis apenas se não for administrador
        if (formData.role !== "Administrador") {
          await handleSaveFunisPermissoes();
        }
      } else {
        await onSave(dataToSave)
      }

      // Aguardar um momento para garantir que o salvamento foi concluído
      await new Promise(resolve => setTimeout(resolve, 800));

      /* Prefetch removido por solicitação do usuário
      console.log("🔄 Atualizando cache de usuários...")
      ...
      */
      onClose()
    } catch (error) {
      console.error("Erro ao salvar:", error)

      // Mensagem de erro mais detalhada
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveFunisPermissoes = async () => {
    if (!user?.id) return

    try {
      // Obter ID da empresa do usuário atual
      const currentUser = authService.getCurrentUser()
      const idEmpresa = (currentUser as any)?.ID_EMPRESA || (currentUser as any)?.id_empresa

      if (!idEmpresa) {
        toast({
          title: "Erro",
          description: "Empresa não identificada",
          variant: "destructive",
        })
        return
      }

      console.log('💾 Salvando permissões de funis:', {
        codUsuario: user.id,
        idEmpresa,
        codigosFunis: selectedFunis
      })

      const response = await fetch('/api/funis/permissoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codUsuario: user.id,
          idEmpresa,
          codigosFunis: selectedFunis
        })
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Permissões de funis atualizadas!",
        })
        setIsFunisModalOpen(false)
      } else {
        const errorData = await response.json()
        console.error('❌ Erro ao salvar permissões:', errorData)
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao atualizar permissões",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar permissões:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissões de funis",
        variant: "destructive",
      })
    }
  }


  if (!isOpen) return null

  const isAdmin = formData.role === "Administrador"

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

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isSaving && !isInitializing ? onClose : undefined} />

      {/* Modal */}
      <div className="relative bg-white sm:rounded-2xl border border-[#F2F2F2] shadow-xl w-full max-w-2xl p-0 max-h-[95vh] h-full md:h-auto flex flex-col overflow-hidden">
        {/* Header - Desktop */}
        <div className="hidden md:flex items-center justify-between px-6 py-5 border-b border-[#F2F2F2] bg-slate-50/50 flex-shrink-0">
          <h2 className="text-xl font-bold text-[#1E5128]">
            {mode === "create" ? "Cadastrar Usuário" : "Editar Usuário"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header - Mobile */}
        <div className="md:hidden flex-shrink-0 bg-slate-50/50 border-b border-[#F2F2F2]">
          <div className="flex items-center justify-between p-3 border-b border-[#F2F2F2]">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-[#1E5128]">
              {mode === "create" ? "Cadastrar Usuário" : "Editar Usuário"}
            </h2>
            <div className="w-6" />
          </div>

          {/* Avatar e Dados Principais - Mobile */}
          <div className="flex flex-col py-4 px-4 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-16 h-16 border-2 border-[#76BA1B] flex-shrink-0">
                <AvatarImage src={formData.avatar || "/placeholder-user.png"} alt={formData.name} />
                <AvatarFallback className="bg-[#76BA1B]/20 text-[#1E5128] text-lg font-bold">
                  {formData.name ? getInitials(formData.name) : "US"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#1E5128] text-base truncate">
                  {formData.name || "Novo Usuário"}
                </h3>
                <p className="text-sm text-slate-500 truncate">
                  {formData.email || "email@exemplo.com"}
                </p>
                {mode === "edit" && user && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: {user.id}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-6 p-6 md:p-8 overflow-y-auto flex-1 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Avatar URL */}
            <div>
              <Label htmlFor="avatar" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                URL da Foto
              </Label>
              <Input
                id="avatar"
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 w-full"
                placeholder="https://exemplo.com/foto.jpg"
              />
            </div>

            {mode === "edit" && (
              <div className="hidden md:block">
                <Label htmlFor="id" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  ID
                </Label>
                <Input id="id" type="text" value={user?.id || ""} disabled className="bg-slate-100 border-[#F2F2F2] rounded-xl h-10 w-full text-slate-500" />
              </div>
            )}

            <div>
              <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Nome *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 w-full"
                placeholder="Digite o nome completo"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 w-full"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Função *
              </Label>
              <Select value={formData.role} onValueChange={(value) => {
                setFormData({ ...formData, role: value })
                // Resetar vendedor ao mudar função
                if (value === 'Administrador') {
                  setCodVendedor(undefined)
                  setNomeVendedor("")
                }
              }}>
                <SelectTrigger className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 w-full">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                  <SelectItem value="Vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="empresa" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Empresa *
              </Label>
              <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa} disabled={isLoadingEmpresas}>
                <SelectTrigger className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 w-full">
                  <SelectValue placeholder={isLoadingEmpresas ? "Carregando..." : "Selecione a empresa"} />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.CODEMP} value={String(emp.CODEMP)}>
                      {emp.CODEMP} - {emp.NOMEFANTASIA || emp.RAZAOSOCIAL}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seção de Vínculo com Vendedor/Gerente */}
            {(formData.role === 'Administrador' || formData.role === 'Gerente' || formData.role === 'Vendedor') && (
              <div className="space-y-4 p-5 border border-[#F2F2F2] rounded-2xl bg-slate-50/50">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Vínculo com {formData.role === 'Administrador' ? 'Vendedor' : (formData.role === 'Gerente' ? 'Gerente' : 'Vendedor')}
                  {formData.role !== 'Administrador' && ' *'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={codVendedor ? `${nomeVendedor} (${codVendedor})` : "Nenhum selecionado"}
                    disabled
                    className="flex-1 bg-white border-[#F2F2F2] rounded-xl h-10 text-slate-500"
                    placeholder="Selecione um vendedor/gerente"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setVendedorTipo(formData.role === 'Gerente' ? 'gerente' : 'vendedor')
                      setShowVendedorModal(true)
                    }}
                    variant="outline"
                    className="h-10 rounded-xl font-bold border-[#F2F2F2] text-slate-700 bg-white"
                  >
                    Selecionar
                  </Button>
                </div>
                {!codVendedor && formData.role !== 'Administrador' && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ É obrigatório vincular a um {formData.role === 'Gerente' ? 'gerente' : 'vendedor'}
                  </p>
                )}
                {!nomeVendedor && !codVendedor && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setIsCreatingNew(true)}
                    className="mt-1 p-0 h-auto text-xs"
                  >
                    + Criar novo {formData.role === 'Administrador' ? 'vendedor' : (formData.role === 'Gerente' ? 'gerente' : 'vendedor')}
                  </Button>
                )}
              </div>
            )}

            {/* Section to create a new vendor directly */}
            {isCreatingNew && (formData.role === 'Administrador' || formData.role === 'Gerente' || formData.role === 'Vendedor') && (
              <div className="p-5 border border-[#F2F2F2] rounded-2xl bg-white shadow-sm mt-3">
                <Label htmlFor="newVendedorName" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Nome do Novo {formData.role === 'Administrador' ? 'Vendedor' : formData.role} *
                </Label>
                <div className="flex flex-wrap md:flex-nowrap gap-2">
                  <Input
                    id="newVendedorName"
                    type="text"
                    value={newVendedorName}
                    onChange={(e) => setNewVendedorName(e.target.value)}
                    placeholder={`Digite o nome do ${formData.role === 'Administrador' ? 'vendedor' : formData.role}`}
                    required
                    className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 w-full md:w-auto md:flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateVendedor}
                    disabled={isCreating}
                    className="h-10 rounded-xl font-bold bg-[#76BA1B] hover:bg-[#1E5128] text-white flex-1 md:flex-none"
                  >
                    {isCreating ? "Criando..." : "Criar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewVendedorName("")
                      setIsCreatingNew(false)
                    }}
                    className="h-10 rounded-xl font-bold border-[#F2F2F2] text-slate-700 bg-white flex-1 md:flex-none"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="status" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Status *
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: "ativo" | "pendente" | "bloqueado") => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "create" && (
              <div>
                <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Senha *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={mode === "create"}
                  className="bg-slate-50 border-[#F2F2F2] rounded-xl focus-visible:ring-[#76BA1B] h-10 w-full"
                  placeholder="Digite a senha"
                />
              </div>
            )}

            {/* Permissões de Funis */}
            {mode === "edit" && (
              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Permissões de Funis
                </Label>

                {isAdmin ? (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ✓ Administradores têm acesso a todos os funis e leads automaticamente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {isLoadingFunis ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : funis.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum funil disponível
                      </p>
                    ) : (
                      funis.map((funil) => (
                        <div key={funil.CODFUNIL} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                          <Checkbox
                            id={`funil-${funil.CODFUNIL}`}
                            checked={selectedFunis.includes(funil.CODFUNIL)}
                            onCheckedChange={() => handleFunilToggle(funil.CODFUNIL)}
                          />
                          <label
                            htmlFor={`funil-${funil.CODFUNIL}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: funil.COR || '#3b82f6' }}
                              />
                              {funil.NOME}
                            </div>
                            {funil.DESCRICAO && (
                              <p className="text-xs text-muted-foreground mt-1">{funil.DESCRICAO}</p>
                            )}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Actions - Fixos no fundo */}
          <div className="flex justify-between gap-3 p-5 border-t border-[#F2F2F2] bg-slate-50/50 sm:rounded-b-2xl mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 font-bold rounded-xl h-11 border-[#F2F2F2] bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
              disabled={isSaving || isInitializing || isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 font-bold rounded-xl h-11 bg-[#76BA1B] hover:bg-[#1E5128] text-white shadow-md transition-all"
              disabled={isSaving || isInitializing || isCreating}
            >
              {isSaving ? "Salvando..." : (mode === "create" ? "Cadastrar Usuário" : "Salvar Alterações")}
            </Button>
          </div>
        </form>
      </div>

      <VendedorSelectorModal
        isOpen={showVendedorModal}
        onClose={() => setShowVendedorModal(false)}
        onSelect={(codVend) => {
          setCodVendedor(codVend)
          loadVendedorNome(codVend)
        }}
        tipo={vendedorTipo}
      />
    </div>
  )
}