"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { 
  Shield, 
  User, 
  Lock, 
  Database, 
  Save, 
  RotateCcw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle
} from "lucide-react"

interface PermissionDef {
  ID: number
  PERMISSION_KEY: string
  CATEGORY: string
  DESCRIPTION: string
  DEFAULT_ADMIN: string
  DEFAULT_GERENTE: string
  DEFAULT_VENDEDOR: string
}

interface UserData {
  CODUSUARIO: number
  NOME: string
  EMAIL: string
  FUNCAO: string
  CODVEND: number | null
  NOME_VENDEDOR: string | null
  TIPVEND: string | null
}

interface UserPermission {
  permissionKey: string
  allowed: boolean
  dataScope?: string
  customVendors?: number[]
}

const CATEGORY_LABELS: Record<string, string> = {
  'PAGE': 'Acesso a Telas',
  'FEATURE': 'Funcionalidades',
  'DATA': 'Escopo de Dados'
}

const CATEGORY_ICONS: Record<string, any> = {
  'PAGE': Lock,
  'FEATURE': Shield,
  'DATA': Database
}

const DATA_SCOPE_OPTIONS = [
  { value: 'OWN', label: 'Apenas próprios dados' },
  { value: 'TEAM', label: 'Dados da equipe' },
  { value: 'ALL', label: 'Todos os dados' }
]

export default function AccessManagement() {
  const [definitions, setDefinitions] = useState<PermissionDef[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [permissions, setPermissions] = useState<Record<string, UserPermission>>({})
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, UserPermission>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      loadUserPermissions(selectedUserId)
      const user = users.find(u => String(u.CODUSUARIO) === selectedUserId)
      setSelectedUser(user || null)
    } else {
      setSelectedUser(null)
      setPermissions({})
      setOriginalPermissions({})
    }
  }, [selectedUserId, users])

  useEffect(() => {
    const changed = JSON.stringify(permissions) !== JSON.stringify(originalPermissions)
    setHasChanges(changed)
  }, [permissions, originalPermissions])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [defsRes, usersRes] = await Promise.all([
        fetch('/api/configuracoes/acessos?action=definitions'),
        fetch('/api/configuracoes/acessos?action=users')
      ])

      if (!defsRes.ok || !usersRes.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const defsData = await defsRes.json()
      const usersData = await usersRes.json()

      setDefinitions(defsData.definitions || [])
      setUsers(usersData.users || [])
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadUserPermissions = async (userId: string) => {
    try {
      const res = await fetch(`/api/configuracoes/acessos?action=userPermissions&userId=${userId}`)
      if (!res.ok) throw new Error('Erro ao carregar permissões')
      
      const data = await res.json()
      const userRole = data.userRole || 'Vendedor'
      
      const permsMap: Record<string, UserPermission> = {}
      
      definitions.forEach(def => {
        let defaultAllowed = false
        if (userRole === 'Administrador' || userRole === 'ADMIN') {
          defaultAllowed = def.DEFAULT_ADMIN === 'S'
        } else if (userRole === 'Gerente') {
          defaultAllowed = def.DEFAULT_GERENTE === 'S'
        } else {
          defaultAllowed = def.DEFAULT_VENDEDOR === 'S'
        }

        permsMap[def.PERMISSION_KEY] = {
          permissionKey: def.PERMISSION_KEY,
          allowed: defaultAllowed,
          dataScope: def.CATEGORY === 'DATA' ? (
            userRole === 'Administrador' || userRole === 'ADMIN' ? 'ALL' :
            userRole === 'Gerente' ? 'TEAM' : 'OWN'
          ) : undefined
        }
      })

      if (data.permissions) {
        data.permissions.forEach((p: any) => {
          permsMap[p.PERMISSION_KEY] = {
            permissionKey: p.PERMISSION_KEY,
            allowed: p.ALLOWED === 'S',
            dataScope: p.DATA_SCOPE || undefined,
            customVendors: p.CUSTOM_VENDORS ? JSON.parse(p.CUSTOM_VENDORS) : undefined
          }
        })
      }

      setPermissions(permsMap)
      setOriginalPermissions(JSON.parse(JSON.stringify(permsMap)))
    } catch (error: any) {
      toast.error('Erro ao carregar permissões: ' + error.message)
    }
  }

  const handlePermissionChange = (key: string, allowed: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: { ...prev[key], allowed }
    }))
  }

  const handleDataScopeChange = (key: string, scope: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: { ...prev[key], dataScope: scope }
    }))
  }

  const handleSave = async () => {
    if (!selectedUserId) return

    try {
      setSaving(true)
      
      const changedPermissions = Object.values(permissions).filter((perm, index) => {
        const original = originalPermissions[perm.permissionKey]
        return !original || 
          original.allowed !== perm.allowed || 
          original.dataScope !== perm.dataScope
      })

      const res = await fetch('/api/configuracoes/acessos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          permissions: changedPermissions
        })
      })

      if (!res.ok) throw new Error('Erro ao salvar')

      toast.success('Permissões salvas com sucesso!')
      setOriginalPermissions(JSON.parse(JSON.stringify(permissions)))
      setHasChanges(false)
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)))
    setHasChanges(false)
  }

  const handleResetToDefaults = async () => {
    if (!selectedUserId) return

    try {
      setSaving(true)
      const res = await fetch(`/api/configuracoes/acessos?userId=${selectedUserId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Erro ao resetar')

      toast.success('Permissões resetadas para o padrão do papel!')
      await loadUserPermissions(selectedUserId)
    } catch (error: any) {
      toast.error('Erro ao resetar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'Administrador': 'bg-red-500/20 text-red-400 border-red-500/30',
      'ADMIN': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Gerente': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Vendedor': 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    return colors[role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const groupedDefinitions = definitions.reduce((acc, def) => {
    if (!acc[def.CATEGORY]) acc[def.CATEGORY] = []
    acc[def.CATEGORY].push(def)
    return acc
  }, {} as Record<string, PermissionDef[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Selecionar Usuário
          </CardTitle>
          <CardDescription>
            Escolha o usuário para gerenciar suas permissões de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.CODUSUARIO} value={String(user.CODUSUARIO)}>
                  <div className="flex items-center gap-2">
                    <span>{user.NOME}</span>
                    <Badge variant="outline" className={`text-xs ${getRoleBadge(user.FUNCAO)}`}>
                      {user.FUNCAO}
                    </Badge>
                    {user.NOME_VENDEDOR && (
                      <span className="text-xs text-muted-foreground">
                        ({user.NOME_VENDEDOR})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedUser && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Nome</span>
                  <p className="font-medium">{selectedUser.NOME}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Email</span>
                  <p className="font-medium">{selectedUser.EMAIL}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Papel</span>
                  <p>
                    <Badge className={getRoleBadge(selectedUser.FUNCAO)}>
                      {selectedUser.FUNCAO}
                    </Badge>
                  </p>
                </div>
                {selectedUser.NOME_VENDEDOR && (
                  <div>
                    <span className="text-xs text-muted-foreground">Vendedor Vinculado</span>
                    <p className="font-medium">{selectedUser.NOME_VENDEDOR}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Permissões de Acesso
                </div>
                {hasChanges && (
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Alterações não salvas
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure as permissões específicas para este usuário. 
                Alterações sobrescrevem os padrões do papel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="PAGE" className="space-y-4">
                <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
                  {Object.keys(groupedDefinitions).map(category => {
                    const Icon = CATEGORY_ICONS[category] || Shield
                    return (
                      <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                        <Icon className="w-4 h-4" />
                        <span className="hidden md:inline">{CATEGORY_LABELS[category]}</span>
                        <span className="md:hidden">
                          {category === 'PAGE' ? 'Telas' : category === 'FEATURE' ? 'Funções' : 'Dados'}
                        </span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {Object.entries(groupedDefinitions).map(([category, defs]) => (
                  <TabsContent key={category} value={category}>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {defs.map(def => {
                          const perm = permissions[def.PERMISSION_KEY]
                          const isAllowed = perm?.allowed ?? false

                          return (
                            <div 
                              key={def.PERMISSION_KEY} 
                              className={`p-4 rounded-lg border transition-colors ${
                                isAllowed 
                                  ? 'bg-green-500/5 border-green-500/20' 
                                  : 'bg-red-500/5 border-red-500/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {isAllowed ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                    <Label className="font-medium cursor-pointer">
                                      {def.DESCRIPTION}
                                    </Label>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                                    {def.PERMISSION_KEY}
                                  </p>
                                </div>

                                <div className="flex items-center gap-4">
                                  {category === 'DATA' && isAllowed && (
                                    <Select 
                                      value={perm?.dataScope || 'OWN'} 
                                      onValueChange={(v) => handleDataScopeChange(def.PERMISSION_KEY, v)}
                                    >
                                      <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DATA_SCOPE_OPTIONS.map(opt => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  
                                  <Switch
                                    checked={isAllowed}
                                    onCheckedChange={(checked) => 
                                      handlePermissionChange(def.PERMISSION_KEY, checked)
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={handleResetToDefaults}
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar para Padrão
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!hasChanges || saving}
            >
              Cancelar Alterações
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Permissões
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
